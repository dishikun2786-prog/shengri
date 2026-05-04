import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';

interface RuleCondition {
  field: string;
  operator: string;
  value: any;
}

interface RuleConditionGroup {
  operator: 'AND' | 'OR';
  rules: RuleCondition[];
}

interface RuleAction {
  type: string;
  field?: string;
  value?: any;
  template?: string;
  formula?: string;
}

interface RuleConfig {
  rule_id: string;
  name: string;
  module: string;
  priority: number;
  conditions: RuleConditionGroup;
  actions: RuleAction[];
  ab_group: string;
}

export interface RuleResult {
  ruleId: string;
  ruleName: string;
  module: string;
  matched: boolean;
  tags: string[];
  scores: Record<string, number>;
  texts: string[];
}

export interface AnalysisResult {
  modules: Record<string, RuleResult[]>;
  tags: string[];
  scores: Record<string, number>;
  summary: Record<string, any>;
}

@Injectable()
export class RuleEngineService {
  private readonly logger = new Logger(RuleEngineService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async analyze(chartData: any, modules: string[] = []): Promise<AnalysisResult> {
    const rules = await this.loadRules(modules);

    const result: AnalysisResult = {
      modules: {},
      tags: [],
      scores: {},
      summary: {},
    };

    for (const rule of rules) {
      try {
        const ruleResult = this.executeRule(rule, chartData);
        if (ruleResult.matched) {
          const mod = rule.module;
          if (!result.modules[mod]) result.modules[mod] = [];
          result.modules[mod].push(ruleResult);
          result.tags.push(...ruleResult.tags);
          Object.assign(result.scores, ruleResult.scores);

          await this.prisma.rule.update({
            where: { ruleId: rule.rule_id },
            data: { hitCount: { increment: 1 } },
          }).catch(() => {});
        }
      } catch (e) {
        this.logger.warn(`Rule ${rule.rule_id} execution failed: ${e.message}`);
      }
    }

    result.tags = [...new Set(result.tags)];
    result.summary = this.buildSummary(result);
    return result;
  }

  private async loadRules(modules: string[]): Promise<RuleConfig[]> {
    const cacheKey = `rules:${modules.sort().join(',')}`;
    const cached = await this.redis.getJson<RuleConfig[]>(cacheKey);
    if (cached) return cached;

    const where: any = { isActive: true };
    if (modules.length > 0) {
      where.module = { in: modules };
    }

    const dbRules = await this.prisma.rule.findMany({
      where,
      orderBy: { priority: 'desc' },
    });

    const rules: RuleConfig[] = dbRules.map((r) => ({
      rule_id: r.ruleId,
      name: r.name,
      module: r.module,
      priority: r.priority,
      conditions: r.conditions as any,
      actions: r.actions as any,
      ab_group: r.abGroup,
    }));

    await this.redis.setJson(cacheKey, rules, 300);
    return rules;
  }

  private executeRule(rule: RuleConfig, chartData: any): RuleResult {
    const result: RuleResult = {
      ruleId: rule.rule_id,
      ruleName: rule.name,
      module: rule.module,
      matched: false,
      tags: [],
      scores: {},
      texts: [],
    };

    const condGroup = rule.conditions;
    const matched = this.evaluateConditionGroup(condGroup, chartData);
    result.matched = matched;

    if (matched && Array.isArray(rule.actions)) {
      for (const action of rule.actions) {
        this.executeAction(action, result, chartData);
      }
    }

    return result;
  }

  private evaluateConditionGroup(group: RuleConditionGroup, data: any): boolean {
    if (!group || !group.rules) return false;
    const results = group.rules.map((cond) => this.evaluateCondition(cond, data));
    return group.operator === 'OR'
      ? results.some(Boolean)
      : results.every(Boolean);
  }

  private evaluateCondition(cond: RuleCondition, data: any): boolean {
    const fieldValue = this.getNestedValue(data, cond.field);

    switch (cond.operator) {
      case 'eq': return fieldValue === cond.value;
      case 'neq': return fieldValue !== cond.value;
      case 'gt': return Number(fieldValue) > Number(cond.value);
      case 'gte': return Number(fieldValue) >= Number(cond.value);
      case 'lt': return Number(fieldValue) < Number(cond.value);
      case 'lte': return Number(fieldValue) <= Number(cond.value);
      case 'in': return Array.isArray(cond.value) && cond.value.includes(fieldValue);
      case 'not_in': return Array.isArray(cond.value) && !cond.value.includes(fieldValue);
      case 'contains': return String(fieldValue).includes(String(cond.value));
      case 'exists': return fieldValue !== undefined && fieldValue !== null;
      case 'exists_in':
        return Array.isArray(cond.value) && cond.value.some((pos: string) => {
          const v = this.getNestedValue(data, pos);
          return v !== undefined && v !== null;
        });
      case 'between':
        if (Array.isArray(cond.value) && cond.value.length === 2) {
          const n = Number(fieldValue);
          return n >= cond.value[0] && n <= cond.value[1];
        }
        return false;
      default:
        return false;
    }
  }

  private executeAction(action: RuleAction, result: RuleResult, _data: any) {
    switch (action.type) {
      case 'set_tag':
        if (action.value) result.tags.push(action.value);
        break;
      case 'set_score':
        if (action.field) result.scores[action.field] = action.value;
        break;
      case 'add_score':
        if (action.field) {
          result.scores[action.field] = (result.scores[action.field] || 0) + (action.value || 0);
        }
        break;
      case 'generate_text':
        if (action.template) result.texts.push(action.template);
        break;
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((o, k) => o?.[k], obj);
  }

  private buildSummary(result: AnalysisResult): Record<string, any> {
    return {
      totalMatched: Object.values(result.modules).flat().filter((r) => r.matched).length,
      modulesSummary: Object.entries(result.modules).map(([mod, results]) => ({
        module: mod,
        matchedCount: results.filter((r) => r.matched).length,
        topTags: results.flatMap((r) => r.tags).slice(0, 5),
      })),
    };
  }

  async getRulesByModule(module: string) {
    return this.prisma.rule.findMany({
      where: { module, isActive: true },
      orderBy: { priority: 'desc' },
    });
  }

  async createRule(data: any) {
    return this.prisma.rule.create({ data });
  }

  async updateRule(ruleId: string, data: any) {
    await this.redis.del(`rules:*`);
    return this.prisma.rule.update({ where: { ruleId }, data });
  }
}
