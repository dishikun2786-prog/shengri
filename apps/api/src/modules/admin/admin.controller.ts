import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Res,
  ParseIntPipe,
  HttpCode,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import * as bcrypt from 'bcryptjs';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ChatService } from '../chat/chat.service';

function serializePrisma(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (obj instanceof Decimal) return obj.toNumber();
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(serializePrisma);
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = serializePrisma(value);
    }
    return result;
  }
  return obj;
}

type ResourceName =
  | 'users'
  | 'orders'
  | 'products'
  | 'rules'
  | 'prompts'
  | 'reports'
  | 'distributors'
  | 'crm_customers'
  | 'masters'
  | 'consultations'
  | 'charts'
  | 'commission_records'
  | 'chat_sessions'
  | 'chat_messages'
  | 'card_keys'
  | 'balance_transactions'
  | 'token_pricings'
  | 'token_usages'
  | 'xiaoliuren_records'
  | 'digital_energy_records'
  | 'bazhai_records'
  | 'bazhai_reports'
  | 'health_records'
  | 'health_reports';

const RESOURCE_MODEL_MAP: Record<ResourceName, string> = {
  users: 'user',
  orders: 'order',
  products: 'product',
  rules: 'rule',
  prompts: 'prompt',
  reports: 'analysisReport',
  distributors: 'distributor',
  crm_customers: 'crmCustomer',
  masters: 'master',
  consultations: 'consultation',
  charts: 'baziChart',
  commission_records: 'commissionRecord',
  chat_sessions: 'chatSession',
  chat_messages: 'chatMessage',
  card_keys: 'cardKey',
  balance_transactions: 'balanceTransaction',
  token_pricings: 'tokenPricing',
  token_usages: 'tokenUsage',
  xiaoliuren_records: 'xiaoliurenRecord',
  digital_energy_records: 'digitalEnergyRecord',
  bazhai_records: 'bazhaiRecord',
  bazhai_reports: 'analysisReport',
  health_records: 'healthRecord',
  health_reports: 'analysisReport',
};

const RESOURCE_SEARCH_FIELDS: Record<string, string[]> = {
  user: ['phone', 'nickname', 'email'],
  order: ['orderNo'],
  product: ['name', 'productCode'],
  rule: ['name', 'ruleId', 'module'],
  prompt: ['name', 'promptId', 'module'],
  analysisReport: ['reportType', 'uuid'],
  distributor: [],
  crmCustomer: ['name', 'phone', 'company'],
  master: ['displayName'],
  consultation: ['consultationNo'],
  baziChart: ['uuid', 'name'],
  commissionRecord: [],
  chatSession: ['uuid', 'title'],
  chatMessage: ['uuid'],
  cardKey: ['code', 'batchNo', 'creatorId'],
  balanceTransaction: ['refId'],
  tokenPricing: ['provider', 'modelName'],
  tokenUsage: ['provider', 'model', 'source'],
  xiaoliurenRecord: ['resultName', 'question'],
  digitalEnergyRecord: ['phone'],
  bazhaiRecord: ['trigram'],
  healthRecord: ['yearGan', 'yearZhi', 'sitian', 'zaiquan'],
};

const RESOURCE_SORTABLE_FIELDS: Record<string, string[]> = {
  user: ['id', 'phone', 'nickname', 'vipLevel', 'totalSpent', 'createdAt', 'lastLoginAt'],
  order: ['id', 'orderNo', 'paidAmount', 'status', 'createdAt', 'paidAt'],
  product: ['id', 'name', 'sortOrder', 'currentPrice', 'originalPrice', 'createdAt'],
  rule: ['id', 'name', 'module', 'priority', 'hitCount', 'isActive', 'createdAt', 'updatedAt'],
  prompt: ['id', 'name', 'module', 'version', 'isActive', 'createdAt', 'updatedAt'],
  analysisReport: ['id', 'reportType', 'createdAt', 'viewCount'],
  distributor: ['id', 'totalEarnings', 'withdrawnAmount', 'totalOrders', 'createdAt', 'approvedAt'],
  crmCustomer: ['id', 'name', 'totalSpent', 'orderCount', 'lastFollowAt', 'nextFollowAt', 'createdAt'],
  master: ['id', 'displayName', 'totalConsultations', 'avgRating', 'totalEarnings', 'createdAt'],
  consultation: ['id', 'status', 'paidAmount', 'createdAt', 'completedAt'],
  baziChart: ['id', 'name', 'createdAt'],
  commissionRecord: ['id', 'amount', 'status', 'createdAt'],
  chatSession: ['id', 'userId', 'reportId', 'messageCount', 'lastMessageAt', 'status', 'createdAt', 'updatedAt'],
  chatMessage: ['id', 'sessionId', 'role', 'createdAt'],
  cardKey: ['id', 'code', 'amount', 'batchNo', 'status', 'usedAt', 'expireAt', 'createdAt'],
  balanceTransaction: ['id', 'userId', 'type', 'amount', 'balanceAfter', 'createdAt'],
  tokenPricing: ['id', 'provider', 'modelName', 'pricePer1kInput', 'pricePer1kOutput', 'sortOrder', 'isActive', 'createdAt'],
  tokenUsage: ['id', 'userId', 'source', 'provider', 'model', 'totalTokens', 'actualCost', 'frozenAmount', 'freeUsed', 'status', 'createdAt', 'settledAt'],
  xiaoliurenRecord: ['id', 'userId', 'inputType', 'resultPosition', 'resultName', 'createdAt'],
  digitalEnergyRecord: ['id', 'userId', 'phone', 'createdAt'],
  bazhaiRecord: ['id', 'userId', 'birthYear', 'gender', 'kuaNumber', 'trigram', 'group', 'createdAt'],
  healthRecord: ['id', 'userId', 'targetDate', 'yearGan', 'yearZhi', 'yearYun', 'sitian', 'zaiquan', 'createdAt'],
};

const GET_ONE_INCLUDES: Record<string, any> = {
  baziChart: {
    user: { select: { id: true, nickname: true, phone: true } },
    reports: {
      select: { id: true, uuid: true, reportType: true, isPaid: true, viewCount: true, createdAt: true },
      orderBy: { createdAt: 'desc' as const },
    },
  },
  xiaoliurenRecord: {
    user: { select: { id: true, nickname: true, phone: true } },
    reports: {
      select: { id: true, uuid: true, reportType: true, isPaid: true, aiTokenUsed: true, viewCount: true, createdAt: true },
      orderBy: { createdAt: 'desc' as const },
    },
  },
  digitalEnergyRecord: {
    user: { select: { id: true, nickname: true, phone: true } },
    reports: {
      select: { id: true, uuid: true, reportType: true, isPaid: true, aiTokenUsed: true, viewCount: true, createdAt: true },
      orderBy: { createdAt: 'desc' as const },
    },
  },
  bazhaiRecord: {
    user: { select: { id: true, nickname: true, phone: true } },
    reports: {
      select: { id: true, uuid: true, reportType: true, isPaid: true, aiTokenUsed: true, viewCount: true, createdAt: true },
      orderBy: { createdAt: 'desc' as const },
    },
  },
  healthRecord: {
    user: { select: { id: true, nickname: true, phone: true } },
    reports: {
      select: { id: true, uuid: true, reportType: true, isPaid: true, aiTokenUsed: true, viewCount: true, createdAt: true },
      orderBy: { createdAt: 'desc' as const },
    },
  },
};

const RELATION_FIELDS: Record<string, string[]> = {
  user: ['referrer', 'referrals', 'tags', 'charts', 'orders', 'reports'],
  order: ['user', 'product'],
  product: ['orders'],
  rule: [],
  prompt: [],
  analysisReport: ['user', 'chart'],
  distributor: ['parent', 'children', 'commissions'],
  crmCustomer: ['followUps'],
  master: ['consultations'],
  consultation: ['master'],
  baziChart: ['user', 'reports'],
  commissionRecord: ['distributor'],
  chatSession: ['user', 'report', 'messages'],
  chatMessage: ['session'],
  cardKey: ['usedBy', 'creator'],
  balanceTransaction: ['user'],
  tokenPricing: [],
  tokenUsage: ['user', 'balanceTransaction'],
};

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(
    private prisma: PrismaService,
    private chatService: ChatService,
  ) {}

  @Get(':resource')
  @Roles('admin', 'agent')
  async getList(
    @Param('resource') resource: string,
    @Query('sort') sort: string,
    @Query('range') range: string,
    @Query('filter') filter: string,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() currentUser?: any,
  ) {
    const modelName = RESOURCE_MODEL_MAP[resource as ResourceName];
    if (!modelName) throw new NotFoundException(`Resource ${resource} not found`);

    // Agent role: silently return empty list for non-agent resources (avoid 403 spam in UI)
    if (currentUser?.role === 'agent') {
      if (resource !== 'card_keys' && resource !== 'balance_transactions') {
        res.header('Content-Range', `${resource} 0-0/0`);
        res.header('Access-Control-Expose-Headers', 'Content-Range');
        return [];
      }
    }

    const model = (this.prisma as any)[modelName];

    let sortParsed: [string, string] = ['id', 'DESC'];
    try { sortParsed = JSON.parse(sort || '["id","DESC"]'); } catch {}

    let rangeParsed: [number, number] = [0, 24];
    try { rangeParsed = JSON.parse(range || '[0,24]'); } catch {}

    let filterParsed: Record<string, any> = {};
    try { filterParsed = JSON.parse(filter || '{}'); } catch {}

    if (modelName === 'chatMessage' && !this.isChatMessageListAllowed(filterParsed)) {
      throw new BadRequestException('chat_messages 列表必须提供 sessionId 或 id 过滤条件');
    }

    // Agent: force filter by creatorId (card_keys) or userId (balance_transactions)
    if (currentUser?.role === 'agent') {
      if (resource === 'card_keys') {
        filterParsed.creatorId = currentUser.id;
      } else if (resource === 'balance_transactions') {
        filterParsed.userId = currentUser.id;
      }
    }

    const where = this.buildWhere(modelName, filterParsed);
    const sortableFields = RESOURCE_SORTABLE_FIELDS[modelName] || ['id'];
    const sortField = sortableFields.includes(sortParsed[0]) ? sortParsed[0] : 'id';
    const sortDir = ['asc', 'desc'].includes(sortParsed[1].toLowerCase()) ? sortParsed[1].toLowerCase() : 'desc';
    const orderBy = { [sortField]: sortDir };
    const skip = rangeParsed[0];
    const take = rangeParsed[1] - rangeParsed[0] + 1;

    const [data, total] = await Promise.all([
      model.findMany({ where, orderBy, skip, take }),
      model.count({ where }),
    ]);

    res.header('Content-Range', `${resource} ${rangeParsed[0]}-${rangeParsed[1]}/${total}`);
    res.header('Access-Control-Expose-Headers', 'Content-Range');
    return serializePrisma(data);
  }

  @Get(':resource/:id')
  @Roles('admin', 'agent')
  async getOne(
    @Param('resource') resource: string,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser?: any,
  ) {
    const modelName = RESOURCE_MODEL_MAP[resource as ResourceName];
    if (!modelName) throw new NotFoundException(`Resource ${resource} not found`);

    if (currentUser?.role === 'agent') {
      if (resource !== 'card_keys' && resource !== 'balance_transactions') {
        throw new NotFoundException(`${resource}#${id} not found`);
      }
    }

    const include = GET_ONE_INCLUDES[modelName];
    const record = await (this.prisma as any)[modelName].findUnique({
      where: { id },
      ...(include ? { include } : {}),
    });
    if (!record) throw new NotFoundException(`${resource}#${id} not found`);

    // Agent: verify ownership
    if (currentUser?.role === 'agent') {
      if (resource === 'card_keys' && record.creatorId !== currentUser.id) {
        throw new NotFoundException(`${resource}#${id} not found`);
      }
      if (resource === 'balance_transactions' && record.userId !== currentUser.id) {
        throw new NotFoundException(`${resource}#${id} not found`);
      }
    }

    return record;
  }

  @Post(':resource')
  async create(
    @Param('resource') resource: string,
    @Body() body: any,
  ) {
    const modelName = RESOURCE_MODEL_MAP[resource as ResourceName];
    if (!modelName) throw new NotFoundException(`Resource ${resource} not found`);

    if (resource === 'chat_sessions' || resource === 'chat_messages') {
      throw new BadRequestException('该资源不允许通过管理端创建');
    }
    if (resource === 'card_keys') {
      throw new BadRequestException('卡密请通过批量生成接口创建');
    }
    if (resource === 'balance_transactions') {
      throw new BadRequestException('余额流水不允许手动创建');
    }

    const data = this.sanitizeForPrisma(this.stripRelations(modelName, body));
    delete data.id;

    if (resource === 'users' && data.password) {
      data.passwordHash = await bcrypt.hash(data.password, 10);
      delete data.password;
    }

    return (this.prisma as any)[modelName].create({ data });
  }

  @Put(':resource/:id')
  async update(
    @Param('resource') resource: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    const modelName = RESOURCE_MODEL_MAP[resource as ResourceName];
    if (!modelName) throw new NotFoundException(`Resource ${resource} not found`);

    if (resource === 'card_keys') {
      throw new BadRequestException('卡密不允许编辑');
    }
    if (resource === 'balance_transactions') {
      throw new BadRequestException('余额流水不允许编辑');
    }

    const data = this.sanitizeForPrisma(this.stripRelations(modelName, body));
    delete data.id;
    delete data.createdAt;
    delete data.updatedAt;

    if (resource === 'users' && data.password) {
      data.passwordHash = await bcrypt.hash(data.password, 10);
      delete data.password;
    }

    return (this.prisma as any)[modelName].update({ where: { id }, data });
  }

  @Delete(':resource/:id')
  @HttpCode(200)
  async delete(
    @Param('resource') resource: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const modelName = RESOURCE_MODEL_MAP[resource as ResourceName];
    if (!modelName) throw new NotFoundException(`Resource ${resource} not found`);

    if (resource === 'chat_sessions') {
      return this.chatService.deleteSessionForAdmin(id);
    }
    if (resource === 'balance_transactions') {
      throw new BadRequestException('余额流水不允许删除');
    }

    return (this.prisma as any)[modelName].delete({ where: { id } });
  }

  private isChatMessageListAllowed(filters: Record<string, any>): boolean {
    if (filters.sessionId != null && filters.sessionId !== '') return true;
    if (Array.isArray(filters.id) && filters.id.length > 0) return true;
    if (filters.id != null && filters.id !== '') return true;
    return false;
  }

  private stripRelations(modelName: string, obj: Record<string, any>): Record<string, any> {
    const relations = new Set(RELATION_FIELDS[modelName] || []);
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (relations.has(key)) continue;
      result[key] = value;
    }
    return result;
  }

  /** Clean data before Prisma create/update — convert empty strings to undefined, etc. */
  private sanitizeForPrisma(data: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      // Skip react-admin internal fields
      if (key.startsWith('__')) continue;
      // Convert empty strings to undefined (let Prisma use defaults)
      if (value === '' || value === null) continue;
      // Convert "true"/"false" strings from form data to booleans
      if (value === 'true') { result[key] = true; continue; }
      if (value === 'false') { result[key] = false; continue; }
      result[key] = value;
    }
    return result;
  }

  private buildWhere(modelName: string, filters: Record<string, any>) {
    const where: any = {};
    const searchFields = RESOURCE_SEARCH_FIELDS[modelName] || [];

    for (const [key, value] of Object.entries(filters)) {
      if (key === 'q' && searchFields.length > 0) {
        where.OR = searchFields.map((f) => ({
          [f]: { contains: value, mode: 'insensitive' },
        }));
      } else if (key === 'id' && Array.isArray(value)) {
        where.id = { in: value.map(Number) };
      } else if (value === 'true' || value === 'false') {
        where[key] = value === 'true';
      } else if (typeof value === 'number') {
        where[key] = value;
      } else if (typeof value === 'boolean') {
        where[key] = value;
      } else if (typeof value === 'string' && /^\d+$/.test(value)) {
        where[key] = parseInt(value, 10);
      } else if (typeof value === 'string') {
        where[key] = { contains: value, mode: 'insensitive' };
      } else {
        where[key] = value;
      }
    }

    return where;
  }
}
