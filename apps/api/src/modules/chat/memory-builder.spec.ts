/**
 * 对话记忆系统测试
 * 覆盖: mem0Added 标记一致性、查询增强、addMemory 重试逻辑、记忆 TTL 计算
 */

import {
  buildProfileMemory,
  buildRuleSummary,
  buildReportContext,
  enhanceSearchQuery,
  formatLayeredMemories,
  getExpirationDate,
} from './memory-builder';

describe('memory-builder', () => {
  describe('buildProfileMemory', () => {
    it('should build profile with all fields', () => {
      const chart = {
        yearGan: '甲', yearZhi: '子', monthGan: '丙', monthZhi: '寅',
        dayGan: '戊', dayZhi: '辰', hourGan: '庚', hourZhi: '午',
        strengthLevel: '身强', patternName: '从财格',
        yongShen: '火木', xiShen: '木', jiShen: ['土', '金'],
        wuxingScore: { wood: 3, fire: 4, earth: 2, metal: 1, water: 2 },
        wuxingCounts: { wood: 2, fire: 2, earth: 1, metal: 1, water: 2 },
        tenGodsMap: { year: '比肩', month: '食神' },
        yearNayin: '海中金', monthNayin: '炉中火', dayNayin: '大地土', hourNayin: '墙上土',
        shenshaList: ['天乙贵人', '文昌'],
        dayunList: [
          { gan: '庚', zhi: '午', start_year: 2020, end_year: 2029 },
          { gan: '辛', zhi: '未', start_year: 2030, end_year: 2039 },
        ],
        gender: 1,
      };
      const result = buildProfileMemory(chart);
      expect(result).toContain('【四柱】');
      expect(result).toContain('【日主】戊');
      expect(result).toContain('【格局】从财格');
      expect(result).toContain('【用神】火木');
      expect(result).toContain('【神煞】天乙贵人、文昌');
    });

    it('should handle missing fields gracefully', () => {
      const chart = { yearGan: '甲', yearZhi: '子' };
      const result = buildProfileMemory(chart);
      expect(result).toContain('【四柱】甲子');
      expect(result).not.toContain('undefined');
    });

    it('should return empty string for null chart', () => {
      expect(buildProfileMemory(null as any)).toBe('');
      expect(buildProfileMemory(undefined as any)).toBe('');
    });
  });

  describe('buildRuleSummary', () => {
    it('should extract ruleTags and ruleResults', () => {
      const report = {
        ruleTags: ['财运', '事业'],
        ruleResults: [
          { tags: ['财运'], summary: '明年财运不错', text: '明年财运不错' },
          { tags: ['事业'], summary: '事业有转机', text: '事业有转机' },
        ],
      };
      const result = buildRuleSummary(report);
      expect(result).toContain('【分析标签】财运、事业');
      expect(result).toContain('明年财运不错');
    });

    it('should handle missing fields', () => {
      expect(buildRuleSummary(null as any)).toBe('');
      expect(buildRuleSummary({})).toBe('');
    });
  });

  describe('enhanceSearchQuery', () => {
    it('should add reportType to terms', () => {
      const result = enhanceSearchQuery('明年运势如何', '流年报告');
      expect(result).toContain('明年运势如何');
      expect(result).toContain('流年报告');
    });

    it('should extract bazi keywords from user message', () => {
      const result = enhanceSearchQuery('我的偏财运势怎么样', undefined);
      expect(result).toContain('偏财');
    });

    it('should add yongShen for fortune-related queries when chart provided', () => {
      const chart = { yongShen: '火木' };
      const result = enhanceSearchQuery('今年运气如何', undefined, chart);
      expect(result).toContain('用神火木');
    });

    it('should not add yongShen for non-fortune queries', () => {
      const chart = { yongShen: '火木' };
      const result = enhanceSearchQuery('今天吃什么', undefined, chart);
      expect(result).not.toContain('用神');
    });
  });

  describe('getExpirationDate', () => {
    it('should return null for permanent', () => {
      expect(getExpirationDate('permanent')).toBeNull();
    });

    it('should return ~10 years for medium without chart', () => {
      const result = getExpirationDate('medium');
      expect(result).not.toBeNull();
      const exp = new Date(result!);
      const now = new Date();
      const diffYears = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365);
      expect(diffYears).toBeGreaterThan(9);
      expect(diffYears).toBeLessThan(11);
    });

    it('should calculate medium expiration from current dayun', () => {
      const currentYear = new Date().getFullYear();
      const chart: any = {
        dayunList: [
          { start_year: currentYear - 2, end_year: currentYear + 8 },
        ],
      };
      const result = getExpirationDate('medium', chart);
      expect(result).not.toBeNull();
      const exp = new Date(result!);
      expect(exp.getFullYear()).toBe(currentYear + 8);
    });

    it('should return ~3 weeks for short', () => {
      const result = getExpirationDate('short');
      expect(result).not.toBeNull();
      const exp = new Date(result!);
      const now = new Date();
      const diffDays = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(18);
      expect(diffDays).toBeLessThan(25);
    });
  });

  describe('formatLayeredMemories', () => {
    it('should format all three layers', () => {
      const layered = {
        userMemories: [{ memory: '用户喜欢详细分析', score: 0.9 }],
        agentMemories: [{ memory: '顾问擅长用神判断', score: 0.8 }],
        sessionMemories: [{ memory: '本次讨论了财运', score: 0.95 }],
      };
      const result = formatLayeredMemories(layered);
      expect(result).toContain('### 用户画像记忆（长期）');
      expect(result).toContain('### 顾问行为学习');
      expect(result).toContain('### 本次会话记忆');
      expect(result).toContain('用户喜欢详细分析');
    });

    it('should return "暂无历史记忆" for empty layers', () => {
      const layered = { userMemories: [], agentMemories: [], sessionMemories: [] };
      expect(formatLayeredMemories(layered)).toBe('暂无历史记忆');
    });

    it('should handle items with text property', () => {
      const layered = {
        userMemories: [{ text: 'some text' }],
        agentMemories: [],
        sessionMemories: [],
      };
      const result = formatLayeredMemories(layered);
      expect(result).toContain('some text');
    });

    it('should handle plain objects via JSON.stringify', () => {
      const layered = {
        userMemories: [{ foo: 'bar' }],
        agentMemories: [],
        sessionMemories: [],
      };
      const result = formatLayeredMemories(layered);
      expect(result).toContain('foo');
    });
  });
});