/**
 * Seed script to import blind school rules into PostgreSQL.
 * Run: npx ts-node src/common/mangpai/seed-mangpai-rules.ts
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const RULES_DIR = path.resolve(__dirname, '../../../../rules/mangpai');

const MODULE_FILES: Record<string, string> = {
  mangpai_work: 'mangpai-work-rules.json',
  mangpai_power: 'mangpai-power-rules.json',
  mangpai_body_guest: 'mangpai-body-guest-rules.json',
  mangpai_tengods_direct: 'mangpai-tengods-direct-rules.json',
  mangpai_shensha: 'mangpai-shensha-rules.json',
  mangpai_marriage: 'mangpai-marriage-rules.json',
  mangpai_career: 'mangpai-career-rules.json',
  mangpai_health: 'mangpai-health-rules.json',
};

async function seed() {
  console.log('开始导入盲派规则...\n');

  let totalCreated = 0;
  let totalUpdated = 0;

  for (const [module, filename] of Object.entries(MODULE_FILES)) {
    const filePath = path.join(RULES_DIR, filename);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠ 文件不存在: ${filePath}`);
      continue;
    }

    const rules = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`📋 ${module}: 加载 ${rules.length} 条规则`);

    for (const rule of rules) {
      const existing = await prisma.rule.findUnique({ where: { ruleId: rule.rule_id } });
      if (existing) {
        await prisma.rule.update({
          where: { ruleId: rule.rule_id },
          data: {
            module: rule.module,
            name: rule.name,
            version: rule.version || '1.0.0',
            priority: rule.priority || 100,
            conditions: rule.conditions,
            actions: rule.actions,
            isActive: true,
          },
        });
        totalUpdated++;
      } else {
        await prisma.rule.create({
          data: {
            ruleId: rule.rule_id,
            module: rule.module,
            name: rule.name,
            description: null,
            version: rule.version || '1.0.0',
            priority: rule.priority || 100,
            conditions: rule.conditions,
            actions: rule.actions,
            isActive: true,
          },
        });
        totalCreated++;
      }
    }
  }

  console.log(`\n✅ 完成: 新增 ${totalCreated} 条, 更新 ${totalUpdated} 条`);
  console.log(`总计 ${totalCreated + totalUpdated} 条盲派规则已导入数据库`);
}

seed()
  .catch((e) => {
    console.error('❌ 导入失败:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
