-- ShengRi 八字命理SaaS平台 - 数据库初始化脚本
-- 使用 Prisma 管理迁移，此文件作为参考和手动初始化备用

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id                  BIGSERIAL PRIMARY KEY,
    uuid                UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    phone               VARCHAR(20) UNIQUE,
    email               VARCHAR(100) UNIQUE,
    password_hash       VARCHAR(255),
    nickname            VARCHAR(50),
    avatar_url          VARCHAR(500),
    gender              SMALLINT DEFAULT 0,
    birth_date          DATE,
    birth_time          VARCHAR(10),
    birth_city          VARCHAR(100),
    birth_province      VARCHAR(100),
    birth_country       VARCHAR(50) DEFAULT 'CN',
    birth_longitude     DECIMAL(10,6),
    birth_latitude      DECIMAL(10,6),
    timezone            VARCHAR(50),
    language            VARCHAR(10) DEFAULT 'zh-CN',
    identity_type       SMALLINT DEFAULT 0,
    vip_level           SMALLINT DEFAULT 0,
    vip_expire_at       TIMESTAMP,
    total_spent         DECIMAL(12,2) DEFAULT 0,
    referrer_id         BIGINT REFERENCES users(id),
    agent_id            BIGINT,
    wechat_openid       VARCHAR(100) UNIQUE,
    wechat_unionid      VARCHAR(100),
    google_id           VARCHAR(100) UNIQUE,
    apple_id            VARCHAR(100) UNIQUE,
    source_channel      VARCHAR(50),
    last_login_at       TIMESTAMP,
    status              SMALLINT DEFAULT 1,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

-- 命盘表
CREATE TABLE IF NOT EXISTS bazi_charts (
    id                  BIGSERIAL PRIMARY KEY,
    uuid                UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    user_id             BIGINT REFERENCES users(id),
    name                VARCHAR(50),
    relation            VARCHAR(20),
    gender              SMALLINT NOT NULL,
    solar_date          DATE NOT NULL,
    solar_time          VARCHAR(10),
    birth_city          VARCHAR(100),
    birth_country       VARCHAR(50) DEFAULT 'CN',
    longitude           DECIMAL(10,6),
    latitude            DECIMAL(10,6),
    true_solar_time     TIMESTAMP,
    time_correction_min DECIMAL(6,2),
    year_gan            VARCHAR(2) NOT NULL,
    year_zhi            VARCHAR(2) NOT NULL,
    month_gan           VARCHAR(2) NOT NULL,
    month_zhi           VARCHAR(2) NOT NULL,
    day_gan             VARCHAR(2) NOT NULL,
    day_zhi             VARCHAR(2) NOT NULL,
    hour_gan            VARCHAR(2),
    hour_zhi            VARCHAR(2),
    year_hidden         JSONB,
    month_hidden        JSONB,
    day_hidden          JSONB,
    hour_hidden         JSONB,
    ten_gods_map        JSONB,
    year_nayin          VARCHAR(10),
    month_nayin         VARCHAR(10),
    day_nayin           VARCHAR(10),
    hour_nayin          VARCHAR(10),
    wuxing_counts       JSONB,
    wuxing_score        JSONB,
    day_master_strength DECIMAL(5,2),
    strength_level      VARCHAR(10),
    pattern_type        VARCHAR(20),
    pattern_name        VARCHAR(50),
    pattern_score       DECIMAL(5,2),
    yong_shen           VARCHAR(2),
    xi_shen             VARCHAR(2),
    ji_shen             JSONB,
    tiaohuo_need        JSONB,
    shensha_list        JSONB,
    dayun_direction     SMALLINT,
    dayun_start_age     DECIMAL(4,1),
    dayun_list          JSONB,
    algorithm_version   VARCHAR(20),
    engine_version      VARCHAR(20),
    midnight_rule       VARCHAR(10),
    is_primary          BOOLEAN DEFAULT false,
    status              SMALLINT DEFAULT 1,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

-- 规则表
CREATE TABLE IF NOT EXISTS rules (
    id                  BIGSERIAL PRIMARY KEY,
    rule_id             VARCHAR(50) NOT NULL UNIQUE,
    module              VARCHAR(30) NOT NULL,
    name                VARCHAR(100) NOT NULL,
    description         TEXT,
    version             VARCHAR(20) NOT NULL,
    priority            INT DEFAULT 100,
    conditions          JSONB NOT NULL,
    actions             JSONB NOT NULL,
    ab_group            VARCHAR(5) DEFAULT 'ALL',
    is_active           BOOLEAN DEFAULT true,
    hit_count           BIGINT DEFAULT 0,
    accuracy_rate       DECIMAL(5,4),
    author              VARCHAR(50),
    review_status       SMALLINT DEFAULT 0,
    reviewer_id         BIGINT,
    metadata            JSONB,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

-- Prompt表
CREATE TABLE IF NOT EXISTS prompts (
    id                  BIGSERIAL PRIMARY KEY,
    prompt_id           VARCHAR(50) NOT NULL,
    module              VARCHAR(30) NOT NULL,
    name                VARCHAR(100) NOT NULL,
    version             VARCHAR(20) NOT NULL,
    content             TEXT NOT NULL,
    system_prompt       TEXT,
    variables           JSONB,
    model_provider      VARCHAR(20) DEFAULT 'minimax',
    model_name          VARCHAR(50) DEFAULT 'MiniMax-M2.5',
    temperature         DECIMAL(3,2) DEFAULT 0.7,
    max_tokens          INT DEFAULT 4000,
    ab_group            VARCHAR(5) DEFAULT 'ALL',
    conversion_rate     DECIMAL(5,4),
    avg_satisfaction    DECIMAL(3,2),
    avg_token_cost      INT,
    is_active           BOOLEAN DEFAULT true,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW(),
    UNIQUE(prompt_id, version)
);

-- 产品表
CREATE TABLE IF NOT EXISTS products (
    id                  BIGSERIAL PRIMARY KEY,
    product_code        VARCHAR(30) NOT NULL UNIQUE,
    name                VARCHAR(100) NOT NULL,
    subtitle            VARCHAR(200),
    description         TEXT,
    category            VARCHAR(20) NOT NULL,
    report_type         VARCHAR(30),
    original_price      DECIMAL(10,2) NOT NULL,
    current_price       DECIMAL(10,2) NOT NULL,
    agent_price         DECIMAL(10,2),
    config              JSONB,
    commission_rate_l1  DECIMAL(4,2) DEFAULT 0,
    commission_rate_l2  DECIMAL(4,2) DEFAULT 0,
    sort_order          INT DEFAULT 0,
    is_active           BOOLEAN DEFAULT true,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

-- 订单表
CREATE TABLE IF NOT EXISTS orders (
    id                  BIGSERIAL PRIMARY KEY,
    order_no            VARCHAR(32) NOT NULL UNIQUE,
    user_id             BIGINT NOT NULL REFERENCES users(id),
    product_id          BIGINT NOT NULL REFERENCES products(id),
    chart_id            BIGINT REFERENCES bazi_charts(id),
    report_id           BIGINT,
    original_amount     DECIMAL(10,2) NOT NULL,
    discount_amount     DECIMAL(10,2) DEFAULT 0,
    paid_amount         DECIMAL(10,2) NOT NULL,
    coupon_id           BIGINT,
    coupon_discount     DECIMAL(10,2) DEFAULT 0,
    payment_method      VARCHAR(20),
    payment_no          VARCHAR(64),
    paid_at             TIMESTAMP,
    referrer_id         BIGINT,
    commission_l1       DECIMAL(10,2) DEFAULT 0,
    commission_l2       DECIMAL(10,2) DEFAULT 0,
    status              SMALLINT DEFAULT 0,
    refund_amount       DECIMAL(10,2),
    refund_reason       VARCHAR(200),
    refund_at           TIMESTAMP,
    source_channel      VARCHAR(50),
    source_url          VARCHAR(500),
    client_type         VARCHAR(20),
    ip_address          VARCHAR(45),
    user_agent          VARCHAR(500),
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

-- 分析报告表
CREATE TABLE IF NOT EXISTS analysis_reports (
    id                  BIGSERIAL PRIMARY KEY,
    uuid                UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    user_id             BIGINT NOT NULL REFERENCES users(id),
    chart_id            BIGINT NOT NULL REFERENCES bazi_charts(id),
    report_type         VARCHAR(30) NOT NULL,
    product_id          BIGINT,
    order_id            BIGINT,
    rule_results        JSONB,
    rule_scores         JSONB,
    rule_tags           JSONB,
    ai_provider         VARCHAR(20),
    prompt_version      VARCHAR(20),
    ai_content          TEXT,
    ai_summary          VARCHAR(500),
    ai_token_used       INT,
    ai_cost             DECIMAL(8,4),
    upsell_hook         TEXT,
    upsell_product_id   BIGINT,
    quality_score       DECIMAL(5,2),
    user_rating         SMALLINT,
    user_feedback       TEXT,
    view_count          INT DEFAULT 0,
    share_count         INT DEFAULT 0,
    is_paid             BOOLEAN DEFAULT false,
    status              SMALLINT DEFAULT 1,
    created_at          TIMESTAMP DEFAULT NOW()
);

-- 分销商表
CREATE TABLE IF NOT EXISTS distributors (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES users(id) UNIQUE,
    level               SMALLINT DEFAULT 1,
    parent_id           BIGINT REFERENCES distributors(id),
    total_earnings      DECIMAL(12,2) DEFAULT 0,
    withdrawn_amount    DECIMAL(12,2) DEFAULT 0,
    pending_amount      DECIMAL(12,2) DEFAULT 0,
    total_orders        INT DEFAULT 0,
    total_team_size     INT DEFAULT 0,
    commission_rate     DECIMAL(4,2),
    status              SMALLINT DEFAULT 1,
    approved_at         TIMESTAMP,
    created_at          TIMESTAMP DEFAULT NOW()
);

-- CRM客户表
CREATE TABLE IF NOT EXISTS crm_customers (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT REFERENCES users(id),
    name                VARCHAR(50),
    phone               VARCHAR(20),
    wechat_id           VARCHAR(50),
    company             VARCHAR(100),
    position            VARCHAR(50),
    customer_level      VARCHAR(10),
    customer_type       VARCHAR(20),
    customer_stage      VARCHAR(20),
    total_spent         DECIMAL(12,2) DEFAULT 0,
    order_count         INT DEFAULT 0,
    last_order_at       TIMESTAMP,
    avg_order_amount    DECIMAL(10,2),
    ltv_predicted       DECIMAL(12,2),
    bazi_tags           JSONB,
    assigned_to         BIGINT,
    last_follow_at      TIMESTAMP,
    next_follow_at      TIMESTAMP,
    follow_count        INT DEFAULT 0,
    source              VARCHAR(50),
    source_detail       VARCHAR(200),
    notes               TEXT,
    status              SMALLINT DEFAULT 1,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

-- 自动成交记录表
CREATE TABLE IF NOT EXISTS auto_conversion_logs (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES users(id),
    trigger_type        VARCHAR(30) NOT NULL,
    trigger_detail      JSONB,
    content_type        VARCHAR(20),
    content             TEXT,
    product_id          BIGINT,
    ai_generated        BOOLEAN DEFAULT false,
    prompt_version      VARCHAR(20),
    delivered           BOOLEAN DEFAULT false,
    opened              BOOLEAN DEFAULT false,
    clicked             BOOLEAN DEFAULT false,
    converted           BOOLEAN DEFAULT false,
    converted_order_id  BIGINT,
    scheduled_at        TIMESTAMP,
    delivered_at        TIMESTAMP,
    opened_at           TIMESTAMP,
    clicked_at          TIMESTAMP,
    converted_at        TIMESTAMP,
    created_at          TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_referrer ON users(referrer_id);
CREATE INDEX IF NOT EXISTS idx_bazi_user ON bazi_charts(user_id);
CREATE INDEX IF NOT EXISTS idx_bazi_day_gan ON bazi_charts(day_gan);
CREATE INDEX IF NOT EXISTS idx_rules_module ON rules(module, is_active);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_no ON orders(order_no);
CREATE INDEX IF NOT EXISTS idx_reports_user ON analysis_reports(user_id, report_type);
CREATE INDEX IF NOT EXISTS idx_crm_level ON crm_customers(customer_level, customer_stage);
CREATE INDEX IF NOT EXISTS idx_conversion_user ON auto_conversion_logs(user_id, trigger_type);
