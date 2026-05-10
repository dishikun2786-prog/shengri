import axios, { AxiosRequestConfig } from 'axios';

const apiConfig = {
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api/v1',
  timeout: 30000,
  _dynamicUrl: null as string | null,
};

// AI 生成专用超时配置（10分钟，deepseek-v4-pro 全量报告需 ~6 分钟）
const AI_TIMEOUT = 600000;

export function setDynamicApiUrl(url: string | null) {
  apiConfig._dynamicUrl = url;
}

export function getApiBaseUrl(): string {
  return apiConfig._dynamicUrl || apiConfig.baseURL;
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: apiConfig.timeout,
});

// AI 健康养生生成专用请求方法
export const healthAiApi = {
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    api.post<T>(url, data, { ...config, timeout: AI_TIMEOUT }),
};

api.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined' && error?.response?.status === 401) {
      const current = window.location.pathname + window.location.search;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      const redirect = encodeURIComponent(current || '/');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = `/login?redirect=${redirect}`;
      }
    }
    return Promise.reject(error);
  },
);

export interface ChartRequest {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  gender: number;
  name?: string;
  relation?: string;
  city?: string;
  midnight_rule?: string;
  timezone?: string;
  calendar_type?: 'solar' | 'lunar';
  is_leap_month?: boolean;
}

export interface PillarData {
  gan: string;
  zhi: string;
  gan_wuxing: string;
  zhi_wuxing: string;
  nayin: string;
  hidden_gan: string[];
  chang_sheng: string;
}

export interface ShenshaEntry {
  name: string;
  pillar: string;
  category: string;
}

export interface LiuYueData {
  /** 农历月序号（1=正月，12=腊月） */
  month: number;
  /** 公历月序号（1-12），用于排序展示 */
  solar_month_index?: number;
  gan: string;
  zhi: string;
  ten_god_gan?: string;
  ten_god_zhi?: string;
  nayin: string;
  jieqi_name: string;
  solar_month_start: string;
  solar_month_end: string;
  lunar_month: string;
  lunar_month_number?: number;
  is_leap_month?: boolean;
}

export interface LiuRiData {
  day: number;
  solar_date: string;
  display_solar_date?: string;
  basis_date?: string;
  gan: string;
  zhi: string;
  ten_god_gan?: string;
  ten_god_zhi?: string;
  nayin: string;
  lunar_day_number?: number;
  lunar_day: string;
  lunar_date: string;
}

export interface GanZhiRelation {
  type: string;
  positions: string[];
  elements: string[];
  result: string;
}

export interface ChartResponse {
  id?: number;
  uuid?: string;
  gender?: number;
  year_pillar: PillarData;
  month_pillar: PillarData;
  day_pillar: PillarData;
  hour_pillar: PillarData;
  day_master: string;
  day_master_wuxing: string;
  day_master_strength: number;
  strength_level: string;
  wuxing_counts: Record<string, number>;
  wuxing_score: Record<string, number>;
  ten_gods: Array<{ gan: string; ten_god: string; position: string }>;
  shensha_list: ShenshaEntry[];
  kong_wang: string[];
  chang_sheng: Record<string, string>;
  tai_yuan: string;
  ming_gong: string;
  shen_gong: string;
  tai_xi: string;
  relations: GanZhiRelation[];
  pattern_type: string;
  pattern_name: string;
  pattern_score: number;
  yong_shen: string;
  xi_shen: string;
  ji_shen: string;
  chou_shen: string;
  tiaohuo_need: string;
  dayun_direction: number;
  dayun_start_age: number;
  dayun_list: Array<{
    index: number;
    start_age: number;
    end_age: number;
    gan: string;
    zhi: string;
    ten_god_gan: string;
    ten_god_zhi: string;
    nayin: string;
    chang_sheng: string;
    start_year: number;
    end_year: number;
  }>;
  liunian_list: Array<{
    year: number;
    gan: string;
    zhi: string;
    ten_god_gan: string;
    ten_god_zhi: string;
    nayin: string;
    chang_sheng: string;
    tai_sui: string;
  }>;
  solar_datetime: string;
  lunar_date: string;
  true_solar_time: string;
  time_correction_min: number;
  jieqi_info: string;
  midnight_rule: string;
  lunar_input?: {
    year: number;
    month: number;
    day: number;
    isLeapMonth: boolean;
  };
}

export const baziApi = {
  createChart: (data: ChartRequest) => api.post<ChartResponse>('/bazi/chart', data),
  getChart: (id: number) => api.get<ChartResponse>(`/bazi/chart/${id}`),
  getCities: () => api.get<{ cities: string[] }>('/bazi/cities'),
  saveChart: (data: ChartRequest) => api.post<ChartResponse>('/bazi/chart/save', data),
  getLiuyue: (year: number, dayMaster?: string) =>
    api.get<LiuYueData[]>('/bazi/liuyue', { params: { year, ...(dayMaster ? { day_master: dayMaster } : {}) } }),
  getLiuri: (
    year: number,
    month: number,
    dayMaster?: string,
    options?: {
      day_boundary_mode?: 'gregorian_midnight' | 'zi_hour';
      use_true_solar_time?: boolean;
      reference_hour?: number;
      reference_minute?: number;
      longitude?: number;
      timezone_offset?: number;
    },
  ) =>
    api.get<LiuRiData[]>('/bazi/liuri', {
      params: { year, month, ...(dayMaster ? { day_master: dayMaster } : {}), ...options },
    }),
  getLiunian: (dayMaster: string, yearZhi: string, startYear: number, count?: number) =>
    api.get<ChartResponse['liunian_list']>('/bazi/liunian', {
      params: { day_master: dayMaster, year_zhi: yearZhi, start_year: startYear, count },
    }),
};

export const reportApi = {
  generate: (data: { chartId: number; reportType: string; isPaid?: boolean }) =>
    api.post('/report/generate', data, { timeout: AI_TIMEOUT }),
  get: (uuid: string) => api.get(`/report/${uuid}`),
};

// Public API client without JWT interceptor (for share page access)
const publicApi = axios.create({
  timeout: 30000,
});
// Dynamic base URL for public API
publicApi.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
  return config;
});

export const shareApi = {
  create: (reportUuid: string) =>
    api.post(`/report/${reportUuid}/share`),
  getSharedReport: (token: string) =>
    publicApi.get(`/share/${token}`),
  deactivate: (reportUuid: string, shareId: number) =>
    api.delete(`/report/${reportUuid}/share/${shareId}`),
  listShares: () =>
    api.get('/user/shares'),
};

export const promotionApi = {
  getDashboard: () => api.get('/promotion/dashboard'),
  getEarnings: (page?: number, size?: number) =>
    api.get('/promotion/earnings', { params: { page, size } }),
  getTeam: () => api.get('/promotion/team'),
  apply: () => api.post('/promotion/apply'),
  getReferralLink: () => api.get('/promotion/referral-link'),
  getLeaderboard: () => api.get('/distribution/leaderboard'),
  withdraw: () => api.post('/distribution/withdraw'),
};

export const orderApi = {
  create: (data: { productId: number; chartId?: number; reportId?: number }) =>
    api.post('/order', data),
  getProducts: (category?: string) =>
    api.get('/order/products', { params: { category } }),
  payWithBalance: (orderNo: string) =>
    api.post(`/order/pay-balance/${orderNo}`),
};

export const xiaoliurenApi = {
  calculate: (data: {
    inputType: 'time' | 'random';
    month?: number; day?: number; hour?: number;
    random1?: number; random2?: number; random3?: number;
    question?: string;
  }) => api.post('/xiaoliuren/calculate', data),
  generateReport: (data: {
    inputType: 'time' | 'random';
    month?: number; day?: number; hour?: number;
    random1?: number; random2?: number; random3?: number;
    question?: string;
    isPaid?: boolean;
    orderId?: number;
    productId?: number;
  }) => api.post('/xiaoliuren/report/generate', data, { timeout: AI_TIMEOUT }),
  getReport: (uuid: string) => api.get(`/xiaoliuren/report/${uuid}`),
  getHistory: (skip?: number, take?: number) =>
    api.get('/xiaoliuren/history', { params: { skip, take } }),
  delete: (id: number) => api.delete(`/xiaoliuren/${id}`),
};

export const digitalEnergyApi = {
  calculate: (data: { phone: string; question?: string }) => api.post('/digital-energy/calculate', data),
  generateReport: (data: { phone: string; question?: string; isPaid?: boolean; orderId?: number; productId?: number; orderNo?: string }) =>
    api.post('/digital-energy/report/generate', data, { timeout: AI_TIMEOUT }),
  getReport: (uuid: string) => api.get(`/digital-energy/report/${uuid}`),
  getHistory: (skip?: number, take?: number) => api.get('/digital-energy/history', { params: { skip, take } }),
  delete: (id: number) => api.delete(`/digital-energy/${id}`),
};

export const bazhaiApi = {
  calculate: (data: { birthYear: number; gender: number; question?: string }) => api.post('/bazhai/calculate', data),
  generateReport: (data: { birthYear: number; gender: number; question?: string; isPaid?: boolean; orderId?: number; productId?: number; orderNo?: string }) => api.post('/bazhai/report/generate', data, { timeout: AI_TIMEOUT }),
  getReport: (uuid: string) => api.get(`/bazhai/report/${uuid}`),
  getHistory: (skip?: number, take?: number) => api.get('/bazhai/history', { params: { skip, take } }),
  delete: (id: number) => api.delete(`/bazhai/${id}`),
};

export const healthAnalysisApi = {
  calculate: (data: { targetDate?: string; birthDate?: string; birthCalendarType?: string; gender?: number; question?: string; symptoms?: { symptom: string; duration?: string; severity?: string }[]; height?: number; weight?: number }) =>
    api.post('/health-report/calculate', data),
  generateReport: (data: { targetDate?: string; birthDate?: string; birthCalendarType?: string; gender?: number; question?: string; symptoms?: { symptom: string; duration?: string; severity?: string }[]; isPaid?: boolean; orderId?: number; productId?: number; orderNo?: string; height?: number; weight?: number }) =>
    api.post('/health-report/report/generate', data, { timeout: AI_TIMEOUT }),
  getReport: (uuid: string) => api.get(`/health-report/report/${uuid}`),
  getHistory: (skip?: number, take?: number) => api.get('/health-report/history', { params: { skip, take } }),
  delete: (id: number) => api.delete(`/health-report/${id}`),
};

export const cardKeyApi = {
  redeem: (code: string) => api.post('/card-key/redeem', { code }),
  getBalance: () => api.get<{ balance: number }>('/card-key/balance'),
};

export interface WuYunDetail {
  日期: string;
  当日主运: string;
  当日客气: string;
  司天: string;
  在泉: string;
  运之太过不及: string;
  主气: Array<{ 节气: string; 名称: string; 月份: string; 类型: string }>;
  客气: Array<{ 节气: string; 名称: string; 月份: string; 类型: string }>;
  客气名称: string;
  年干?: string;
  年支?: string;
  天干化运?: string;
  地支化气_司天?: string;
  地支化气_在泉?: string;
  当年五运?: Array<{
    运次: string;
    五行: string;
    音律: string;
    节气: string;
    主运: string;
    太过不及: string;
    影响脏腑: string;
  }>;
  当年六气?: Array<{
    节气序号: number;
    节气: string;
    客气名称: string;
    节气范围: string;
    对应脏腑: string;
    对应腑: string;
    当令: string;
  }>;
  养生重点: {
    主运养生: string;
    主运饮食: string;
    主运经络: string;
    主运情志: string;
    主运时辰: string;
    客气养生: string;
    客气调理: string;
    客气易患: string;
    客气预防: string;
    重点脏腑: string[];
    调养建议: string;
  };
  月份五运: Array<{
    农历月: number;
    公历月: number;
    主运: string;
    客运: string;
    客气: string;
    节气: string;
    当令脏腑: string;
  }>;
}

export interface OrganStatus {
  器官: string;
  五行: string;
  状态: string;
  能量值: number;
  对应经络: string;
  易患问题: string;
  养护建议: string;
}

export interface OrganAnalysisResult {
  器官状态: OrganStatus[];
  五行失衡: {
    总能量: number;
    各五行状态: Record<string, {
      计数: number;
      占比: number;
      期望值: number;
      偏差: number;
      失衡度: number;
      状态: string;
    }>;
    最强: string;
    最弱: string;
    整体评估: string;
  };
  身体器官图: {
    五行器官: Record<string, {
      器官名: string;
      位置: { x: number; y: number; label: string; side: string };
      状态: string;
      能量: number;
      经络: string;
      养护: string;
      颜色: { fill: string; stroke: string; glow: string };
    }>;
    positions: Record<string, { x: number; y: number; label: string; side: string }>;
    svg_viewbox: string;
  };
}

export interface HealthWarning {
  类型: string;
  器官: string;
  五行: string;
  严重程度: string;
  描述: string;
  建议: string;
}

export interface HealthSuggestion {
  饮食调理: {
    items: Array<{ 器官: string; 建议: string; 禁忌: string }>;
    总体原则: string;
  };
  起居调养: {
    items: Array<{ 器官: string; 建议: string }>;
    季节提示: Record<string, string>;
    总体原则: string;
  };
  情志调摄: {
    items: Array<{ 器官: string; 情志: string; 建议: string }>;
    总体原则: string;
  };
  运动建议: {
    items: Array<{ 器官: string; 运动方式: string; 建议: string }>;
    总体原则: string;
  };
  节气养生: Record<string, string>;
  重点关注: {
    虚弱器官: string[];
    过旺器官: string[];
    调理原则: string;
  };
}

// AI 生成的五运六气结果接口
export interface WuYunliuqiAiResult {
  content: string;
  structuredContent?: {
    title?: string;
    overview?: string;
    yunqiAnalysis?: {
      yearYun?: string;
      yearYunType?: string;
      sitian?: string;
      zaiquan?: string;
      mainYun?: string;
      keQi?: string;
    };
    healthSuggestions?: {
      diet?: string[];
      lifestyle?: string[];
      emotions?: string[];
      exercises?: string[];
      seasonal?: string[];
    };
    organCare?: Array<{
      organ?: string;
      wuxing?: string;
      suggestions?: string[];
    }>;
    constitution?: {
      type?: string;
      description?: string;
      strengths?: string[];
      weaknesses?: string[];
      lifetimeCare?: string;
    };
    warnings?: Array<{
      type?: string;
      severity?: string;
      description?: string;
      prevention?: string;
    }>;
    liunianGuidance?: {
      year?: number;
      ganzhi?: string;
      analysis?: string;
      healthFocus?: string;
    };
    liuyueGuidance?: {
      month?: number;
      ganzhi?: string;
      analysis?: string;
      healthFocus?: string;
    };
    liuriGuidance?: {
      day?: number;
      ganzhi?: string;
      analysis?: string;
      healthFocus?: string;
    };
    summary?: string;
    tags?: string[];
  };
  summary: string;
  tokenUsed: number;
  model: string;
  provider: string;
}

export const healthApi = {
  // 检查五运六气缓存状态
  getWuYunCacheStatus: (
    targetDate: string,
    liunianGan?: string,
    liunianZhi?: string,
    liuyueGan?: string,
    liuyueZhi?: string,
    liuriGan?: string,
    liuriZhi?: string,
    birthYearPillar?: string,
  ) =>
    api.get<{ cached: boolean; cacheKey: string }>('/health/wuyun/cache/status', {
      params: {
        target_date: targetDate,
        ...(liunianGan ? { liunian_gan: liunianGan } : {}),
        ...(liunianZhi ? { liunian_zhi: liunianZhi } : {}),
        ...(liuyueGan ? { liuyue_gan: liuyueGan } : {}),
        ...(liuyueZhi ? { liuyue_zhi: liuyueZhi } : {}),
        ...(liuriGan ? { liuri_gan: liuriGan } : {}),
        ...(liuriZhi ? { liuri_zhi: liuriZhi } : {}),
        ...(birthYearPillar ? { birth_year_pillar: birthYearPillar } : {}),
        ...(liuriZhi ? { liuri_zhi: liuriZhi } : {}),
      },
    }),
  getWuYun: (date: string) =>
    api.get<WuYunDetail>('/health/wuyun/daily', {
      params: { target_date: date },
    }),
  getLiuNianWuYun: (
    targetDate: string,
    liunianGan?: string,
    liunianZhi?: string
  ) =>
    api.get('/health/wuyun/liunian', {
      params: {
        target_date: targetDate,
        ...(liunianGan ? { liunian_gan: liunianGan } : {}),
        ...(liunianZhi ? { liunian_zhi: liunianZhi } : {}),
      },
    }),
  getOrganAnalysis: (baziJson: string, wuxingCountsJson: string) =>
    api.get<OrganAnalysisResult>('/health/organs', {
      params: { bazi_json: baziJson, wuxing_counts_json: wuxingCountsJson },
    }),
  getHealthWarnings: (baziJson: string, wuxingCountsJson: string, wuyunJson?: string) =>
    api.get<{ 预警: HealthWarning[]; 总数: number }>('/health/warnings', {
      params: {
        bazi_json: baziJson,
        wuxing_counts_json: wuxingCountsJson,
        ...(wuyunJson ? { wuyun_json: wuyunJson } : {}),
      },
    }),
  getHealthSuggestions: (
    baziJson: string,
    wuxingCountsJson: string,
    targetYear?: number,
    targetMonth?: number,
    wuyunJson?: string,
  ) =>
    api.get<HealthSuggestion>('/health/suggestions', {
      params: {
        bazi_json: baziJson,
        wuxing_counts_json: wuxingCountsJson,
        ...(targetYear ? { target_year: targetYear } : {}),
        ...(targetMonth ? { target_month: targetMonth } : {}),
        ...(wuyunJson ? { wuyun_json: wuyunJson } : {}),
      },
    }),
  // AI 生成五运六气（使用更长超时）
  generateWuYunWithAi: (
    targetDate: string,
    baziJson?: string,
    liunianGan?: string,
    liunianZhi?: string,
    liuyueGan?: string,
    liuyueZhi?: string,
    liuriGan?: string,
    liuriZhi?: string,
    isPaid?: boolean
  ) =>
    healthAiApi.post<WuYunliuqiAiResult>('/health/wuyun/ai', {
      target_date: targetDate,
      ...(baziJson ? { bazi_json: baziJson } : {}),
      ...(liunianGan ? { liunian_gan: liunianGan } : {}),
      ...(liunianZhi ? { liunian_zhi: liunianZhi } : {}),
      ...(liuyueGan ? { liuyue_gan: liuyueGan } : {}),
      ...(liuyueZhi ? { liuyue_zhi: liuyueZhi } : {}),
      ...(liuriGan ? { liuri_gan: liuriGan } : {}),
      ...(liuriZhi ? { liuri_zhi: liuriZhi } : {}),
      ...(isPaid !== undefined ? { is_paid: isPaid } : {}),
    }),
  // AI 生成流年五运六气
  generateLiuNianWuYunWithAi: (
    targetDate: string,
    liunianGan: string,
    liunianZhi: string,
    year: number,
    baziJson?: string,
    isPaid?: boolean
  ) =>
    healthAiApi.post<WuYunliuqiAiResult>('/health/wuyun/ai/liunian', {
      target_date: targetDate,
      liunian_gan: liunianGan,
      liunian_zhi: liunianZhi,
      year,
      ...(baziJson ? { bazi_json: baziJson } : {}),
      ...(isPaid !== undefined ? { is_paid: isPaid } : {}),
    }),
  // AI 生成流月五运六气
  generateLiuYueWuYunWithAi: (
    targetDate: string,
    liuyueGan: string,
    liuyueZhi: string,
    month: number,
    baziJson?: string,
    isPaid?: boolean
  ) =>
    healthAiApi.post<WuYunliuqiAiResult>('/health/wuyun/ai/liuyue', {
      target_date: targetDate,
      liuyue_gan: liuyueGan,
      liuyue_zhi: liuyueZhi,
      month,
      ...(baziJson ? { bazi_json: baziJson } : {}),
      ...(isPaid !== undefined ? { is_paid: isPaid } : {}),
    }),
  // AI 生成流日五运六气
  generateLiuRiWuYunWithAi: (
    targetDate: string,
    liuriGan: string,
    liuriZhi: string,
    day: number,
    baziJson?: string,
    isPaid?: boolean
  ) =>
    healthAiApi.post<WuYunliuqiAiResult>('/health/wuyun/ai/liuri', {
      target_date: targetDate,
      liuri_gan: liuriGan,
      liuri_zhi: liuriZhi,
      day,
      ...(baziJson ? { bazi_json: baziJson } : {}),
      ...(isPaid !== undefined ? { is_paid: isPaid } : {}),
    }),
  // AI 综合生成流年流月流日
  generateComprehensiveWuYunWithAi: (
    targetDate: string,
    liunian: { gan: string; zhi: string; year: number },
    liuyue: { gan: string; zhi: string; month: number },
    liuri: { gan: string; zhi: string; day: number },
    baziJson?: string,
    isPaid?: boolean,
    userId?: string
  ) =>
    healthAiApi.post<WuYunliuqiAiResult>('/health/wuyun/ai/comprehensive', {
      target_date: targetDate,
      liunian,
      liuyue,
      liuri,
      ...(baziJson ? { bazi_json: baziJson } : {}),
      ...(isPaid !== undefined ? { is_paid: isPaid } : {}),
      ...(userId ? { user_id: userId } : {}),
    }),
};

export interface CaptchaResponse {
  captchaId: string;
  image: string;
}

export const authApi = {
  getCaptcha: () => api.get<CaptchaResponse>('/auth/captcha'),
  register: (data: {
    username: string;
    password: string;
    captchaId: string;
    captcha: string;
    nickname?: string;
    referrerId?: number;
  }) => api.post('/auth/register', data),
  login: (data: { account: string; password: string }) =>
    api.post('/auth/login', data),
  // SMS auth
  checkPhone: (phone: string) =>
    api.post<{ exists: boolean }>('/auth/sms/check', { phone }),
  sendSmsCode: (phone: string) =>
    api.post('/auth/sms/send', { phone }),
  smsLogin: (phone: string, code: string, username?: string, password?: string, nickname?: string) =>
    api.post('/auth/sms/login', { phone, code, username, password, nickname }),
  bindPhone: (phone: string, code: string) =>
    api.post('/auth/bind-phone', { phone, code }),
};

export const userApi = {
  getProfile: () => api.get('/user/profile'),
  getReports: (page?: number) => api.get('/user/reports', { params: { page } }),
  getCharts: () => api.get('/user/charts'),
  deleteChart: (chartId: number) => api.delete(`/user/charts/${chartId}`),
  deleteReport: (reportId: number) => api.delete(`/user/reports/${reportId}`),
  updateProfile: (data: { nickname?: string; bio?: string; avatarUrl?: string }) =>
    api.patch('/user/profile', data),
  changePassword: (oldPassword: string, newPassword: string) =>
    api.patch('/user/password', { oldPassword, newPassword }),
};

export const configApi = {
  getSiteConfig: () => api.get('/config/site'),
  getPaymentMethods: () =>
    api.get<Array<{ key: string; label: string; sortOrder: number }>>('/config/payment-methods'),
};

export const paymentApi = {
  createWechatPay: (orderNo: string, type: string = 'native') =>
    api.post(`/payment/wechat/${orderNo}`, null, { params: { type } }),
  createAlipayPay: (orderNo: string, type: string = 'page') =>
    api.post(`/payment/alipay/${orderNo}`, null, { params: { type } }),
  queryStatus: (orderNo: string) =>
    api.get<{ orderNo: string; status: number; isPaid: boolean; paymentMethod: string | null }>(`/payment/status/${orderNo}`),
};

export const chatApi = {
  createSession: (reportId: number) => api.post('/chat/session', { reportId }),
  createSessionByReport: (reportUuid: string) =>
    api.post(`/chat/session/by-report/${reportUuid}`),
  getMessages: (
    sessionId: number,
    params?: { page?: number; size?: number; afterCreatedAt?: string; afterId?: number },
  ) => api.get(`/chat/session/${sessionId}/messages`, { params }),
  getSessions: () => api.get('/chat/sessions'),
  deleteSession: (sessionId: number) => api.delete(`/chat/session/${sessionId}`),
};

export interface MomentUser {
  id: number;
  nickname: string | null;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
}

export interface MomentImage {
  id: number;
  url: string;
  width?: number | null;
  height?: number | null;
}

export interface MomentComment {
  id: number;
  uuid: string;
  momentId: number;
  userId: number;
  content: string;
  replyToId: number | null;
  createdAt: string;
  user: MomentUser;
  replyTo?: {
    id: number;
    user: { id: number; nickname: string | null; username: string | null };
  } | null;
}

export interface Moment {
  id: number;
  uuid: string;
  content: string;
  createdAt: string;
  user: MomentUser;
  images: MomentImage[];
  isLiked: boolean;
  likesCount: number;
  commentsCount: number;
}

export const momentsApi = {
  getMoments: (params?: { page?: number; size?: number }) =>
    api.get<{ moments: Moment[]; total: number; page: number; size: number; totalPages: number }>('/moments', { params }),
  getMyMoments: (params?: { page?: number; size?: number }) =>
    api.get<{ moments: Moment[]; total: number; page: number; size: number; totalPages: number }>('/moments/my', { params }),
  getMoment: (momentId: number) =>
    api.get<Moment>(`/moments/${momentId}`),
  createMoment: (data: { content: string; images?: string[] }) =>
    api.post<Moment>('/moments', data),
  deleteMoment: (momentId: number) =>
    api.delete(`/moments/${momentId}`),
  likeMoment: (momentId: number) =>
    api.post<{ success: boolean; liked: boolean }>(`/moments/${momentId}/like`),
  unlikeMoment: (momentId: number) =>
    api.delete<{ success: boolean; liked: boolean }>(`/moments/${momentId}/like`),
  getComments: (momentId: number, params?: { page?: number; size?: number }) =>
    api.get<{ comments: MomentComment[]; total: number; page: number; size: number; totalPages: number }>(`/moments/${momentId}/comments`, { params }),
  addComment: (momentId: number, data: { content: string; replyToId?: number }) =>
    api.post<MomentComment>(`/moments/${momentId}/comments`, data),
  deleteComment: (commentId: number) =>
    api.delete(`/moments/comments/${commentId}`),
  getLikes: (momentId: number, params?: { page?: number; size?: number }) =>
    api.get(`/moments/${momentId}/likes`, { params }),
};

// ==================== 配对系统 ====================

export interface PairingRequestData {
  uuid: string;
  pairingType: string;
  status: number;
  message?: string;
  initiator: MomentUser;
  receiver: MomentUser;
  initiatorChart?: { id: number; name?: string; dayGan: string; gender: number } | null;
  receiverChart?: { id: number; name?: string; dayGan: string; gender: number } | null;
  initiatorConfigured: boolean;
  receiverConfigured: boolean;
  report?: {
    uuid: string;
    aiContent?: string;
    aiSummary?: string;
    ruleScores?: Record<string, number>;
    ruleTags?: string[];
    ruleResults?: any;
    createdAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export const pairingApi = {
  sendRequest: (data: { receiverId: number; pairingType: string; message?: string; chartId?: number }) =>
    api.post<{ uuid: string; status: number }>('/pairing/request', data),
  getIncomingRequests: (params?: { page?: number; size?: number }) =>
    api.get('/pairing/requests/incoming', { params }),
  getOutgoingRequests: (params?: { page?: number; size?: number }) =>
    api.get('/pairing/requests/outgoing', { params }),
  getRequest: (uuid: string) =>
    api.get<PairingRequestData>(`/pairing/request/${uuid}`),
  acceptRequest: (uuid: string, chartId?: number) =>
    api.put<{ uuid: string; status: number }>(`/pairing/request/${uuid}/accept`, { chartId }),
  rejectRequest: (uuid: string) =>
    api.put<{ uuid: string; status: number }>(`/pairing/request/${uuid}/reject`),
  cancelRequest: (uuid: string) =>
    api.delete(`/pairing/request/${uuid}`),
  configurePairing: (uuid: string, chartId: number) =>
    api.post<{ uuid: string; status: number; initiatorConfigured: boolean; receiverConfigured: boolean }>(`/pairing/request/${uuid}/configure`, { chartId }),
  getReport: (uuid: string) =>
    api.get<PairingRequestData>(`/pairing/report/${uuid}`),
  getPairingReports: (params?: { page?: number; size?: number }) =>
    api.get('/pairing/reports', { params }),
  getPricing: () =>
    api.get<Record<string, { price: number; freeCount: number; enabled: boolean }>>('/pairing/pricing'),
  getFreeTrialStatus: (uuid: string) =>
    api.get<{ hasFree: boolean; remaining: number; total: number }>(`/pairing/request/${uuid}/free-trial`),
  payWithBalance: (uuid: string) =>
    api.post<{ success: boolean; message: string }>(`/pairing/request/${uuid}/pay`, { method: 'balance' }),
  checkPayStatus: (uuid: string) =>
    api.get<{ paid: boolean; status: number; orderId?: number }>(`/pairing/request/${uuid}/pay/status`),
  generateReport: (uuid: string) =>
    api.post(`/pairing/request/${uuid}/generate`),
  // Self-service pairing
  initiateSelfPairing: (data: { chartIdA: number; chartIdB: number; pairingType: string }) =>
    api.post<{ uuid: string; status: number }>('/pairing/self/initiate', data),
  getSelfPairingRequests: (params?: { page?: number; size?: number }) =>
    api.get('/pairing/self/requests', { params }),
  payAndGenerateSelfPairing: (uuid: string, method: string = 'balance') =>
    api.post(`/pairing/self/${uuid}/pay-and-generate`, { method }, { timeout: AI_TIMEOUT }),
};

export interface NotificationItem {
  id: number;
  uuid: string;
  type: string;
  title: string;
  body?: string;
  refType?: string;
  refId?: string;
  isRead: boolean;
  createdAt: string;
}

export const notificationApi = {
  getNotifications: (params?: { page?: number; size?: number }) =>
    api.get<{ notifications: NotificationItem[]; total: number; unreadCount: number; page: number; size: number; totalPages: number }>('/notification/list', { params }),
  getUnreadCount: () =>
    api.get<{ unreadCount: number }>('/notification/unread-count'),
  markRead: (uuid: string) =>
    api.put(`/notification/${uuid}/read`),
  markAllRead: () =>
    api.put('/notification/read-all'),
};

export const uploadApi = {
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ url: string; filename: string; size: number }>('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadImages: (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return api.post<{ urls: Array<{ url: string; filename: string; size: number }> }>('/upload/images', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ url: string; filename: string; size: number }>('/upload/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default api;
