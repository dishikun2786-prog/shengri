import { describe, it, expect } from 'vitest';
import {
  VIP_LEVELS,
  IDENTITY_TYPES,
  USER_STATUS,
  GENDER_CHOICES,
  ORDER_STATUS,
  REPORT_TYPES,
  RULE_MODULES,
  PRODUCT_CATEGORIES,
  AB_GROUPS,
  AI_PROVIDERS,
  DISTRIBUTOR_LEVELS,
  DISTRIBUTOR_STATUS,
  CONSULTATION_STATUS,
  CONSULTATION_TYPES,
  CUSTOMER_LEVELS,
  CUSTOMER_STAGES,
  CUSTOMER_TYPES,
  MASTER_STATUS,
  USER_ROLES,
} from '../constants';

describe('Constants', () => {
  it('VIP_LEVELS has 4 levels (0-3)', () => {
    expect(VIP_LEVELS).toHaveLength(4);
    expect(VIP_LEVELS.map((l) => l.id)).toEqual([0, 1, 2, 3]);
    expect(VIP_LEVELS[0].name).toBe('免费');
    expect(VIP_LEVELS[3].name).toBe('企业VIP');
  });

  it('IDENTITY_TYPES has 4 types', () => {
    expect(IDENTITY_TYPES).toHaveLength(4);
    expect(IDENTITY_TYPES[0].name).toBe('普通用户');
  });

  it('USER_STATUS has disabled and active', () => {
    expect(USER_STATUS).toHaveLength(2);
    expect(USER_STATUS[0]).toEqual({ id: 0, name: '禁用' });
    expect(USER_STATUS[1]).toEqual({ id: 1, name: '正常' });
  });

  it('GENDER_CHOICES has 3 options', () => {
    expect(GENDER_CHOICES).toHaveLength(3);
    expect(GENDER_CHOICES.map((g) => g.id)).toEqual([0, 1, 2]);
  });

  it('ORDER_STATUS has 6 statuses (0-5)', () => {
    expect(ORDER_STATUS).toHaveLength(6);
    expect(ORDER_STATUS[0].name).toBe('待付款');
    expect(ORDER_STATUS[2].name).toBe('已完成');
    expect(ORDER_STATUS[5].name).toBe('已取消');
  });

  it('REPORT_TYPES has 8 types', () => {
    expect(REPORT_TYPES).toHaveLength(8);
    const ids = REPORT_TYPES.map((r) => r.id);
    expect(ids).toContain('free');
    expect(ids).toContain('wealth');
    expect(ids).toContain('marriage');
    expect(ids).toContain('hehun');
  });

  it('RULE_MODULES has 10 modules', () => {
    expect(RULE_MODULES).toHaveLength(10);
    const ids = RULE_MODULES.map((r) => r.id);
    expect(ids).toContain('ten_gods');
    expect(ids).toContain('pattern');
    expect(ids).toContain('yongshen');
  });

  it('PRODUCT_CATEGORIES has 5 categories', () => {
    expect(PRODUCT_CATEGORIES).toHaveLength(5);
    expect(PRODUCT_CATEGORIES.map((c) => c.id)).toEqual(['free', 'lead', 'standard', 'premium', 'enterprise']);
  });

  it('AB_GROUPS has ALL, A, B', () => {
    expect(AB_GROUPS).toHaveLength(3);
    expect(AB_GROUPS.map((g) => g.id)).toEqual(['ALL', 'A', 'B']);
  });

  it('AI_PROVIDERS has 3 providers', () => {
    expect(AI_PROVIDERS).toHaveLength(3);
    const ids = AI_PROVIDERS.map((p) => p.id);
    expect(ids).toContain('minimax');
    expect(ids).toContain('openai');
    expect(ids).toContain('deepseek');
  });

  it('DISTRIBUTOR_LEVELS has 3 levels', () => {
    expect(DISTRIBUTOR_LEVELS).toHaveLength(3);
    expect(DISTRIBUTOR_LEVELS[0]).toEqual({ id: 1, name: '普通' });
    expect(DISTRIBUTOR_LEVELS[2]).toEqual({ id: 3, name: '钻石' });
  });

  it('DISTRIBUTOR_STATUS has 3 statuses', () => {
    expect(DISTRIBUTOR_STATUS).toHaveLength(3);
    expect(DISTRIBUTOR_STATUS.map((s) => s.name)).toEqual(['待审核', '正常', '冻结']);
  });

  it('CONSULTATION_STATUS has 4 statuses', () => {
    expect(CONSULTATION_STATUS).toHaveLength(4);
    expect(CONSULTATION_STATUS[0].name).toBe('待接单');
    expect(CONSULTATION_STATUS[2].name).toBe('已完成');
  });

  it('CONSULTATION_TYPES has text/voice/video', () => {
    expect(CONSULTATION_TYPES).toHaveLength(3);
    expect(CONSULTATION_TYPES.map((t) => t.id)).toEqual(['text', 'voice', 'video']);
  });

  it('CUSTOMER_LEVELS has A/B/C/D', () => {
    expect(CUSTOMER_LEVELS).toHaveLength(4);
    expect(CUSTOMER_LEVELS[0].id).toBe('A');
    expect(CUSTOMER_LEVELS[3].id).toBe('D');
  });

  it('CUSTOMER_STAGES has 6 stages', () => {
    expect(CUSTOMER_STAGES).toHaveLength(6);
    expect(CUSTOMER_STAGES[0].id).toBe('new');
    expect(CUSTOMER_STAGES[4].id).toBe('converted');
    expect(CUSTOMER_STAGES[5].id).toBe('lost');
  });

  it('CUSTOMER_TYPES has personal/business/agent', () => {
    expect(CUSTOMER_TYPES).toHaveLength(3);
    expect(CUSTOMER_TYPES.map((t) => t.id)).toEqual(['personal', 'business', 'agent']);
  });

  it('MASTER_STATUS has 3 statuses', () => {
    expect(MASTER_STATUS).toHaveLength(3);
    expect(MASTER_STATUS.map((s) => s.name)).toEqual(['待审核', '已上架', '已下架']);
  });

  it('USER_ROLES has user and admin', () => {
    expect(USER_ROLES).toHaveLength(2);
    expect(USER_ROLES).toEqual([
      { id: 'user', name: '普通用户' },
      { id: 'admin', name: '管理员' },
    ]);
  });

  it('all constant arrays have unique ids', () => {
    const arrays = [
      VIP_LEVELS, IDENTITY_TYPES, USER_STATUS, GENDER_CHOICES,
      ORDER_STATUS, REPORT_TYPES, RULE_MODULES, PRODUCT_CATEGORIES,
      AB_GROUPS, AI_PROVIDERS, DISTRIBUTOR_LEVELS, DISTRIBUTOR_STATUS,
      CONSULTATION_STATUS, CONSULTATION_TYPES, CUSTOMER_LEVELS,
      CUSTOMER_STAGES, CUSTOMER_TYPES, MASTER_STATUS, USER_ROLES,
    ];

    for (const arr of arrays) {
      const ids = arr.map((item) => item.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('all constant arrays have non-empty names', () => {
    const arrays = [
      VIP_LEVELS, IDENTITY_TYPES, USER_STATUS, GENDER_CHOICES,
      ORDER_STATUS, REPORT_TYPES, RULE_MODULES, PRODUCT_CATEGORIES,
      AB_GROUPS, AI_PROVIDERS, DISTRIBUTOR_LEVELS, DISTRIBUTOR_STATUS,
      CONSULTATION_STATUS, CONSULTATION_TYPES, CUSTOMER_LEVELS,
      CUSTOMER_STAGES, CUSTOMER_TYPES, MASTER_STATUS, USER_ROLES,
    ];

    for (const arr of arrays) {
      for (const item of arr) {
        expect(item.name).toBeTruthy();
        expect(typeof item.name).toBe('string');
      }
    }
  });
});
