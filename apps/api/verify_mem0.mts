import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const user = await p.user.findUnique({ where: { id: 34 }, select: { id: true, mem0ProfileSynced: true } });
  console.log('User 34 mem0ProfileSynced:', user?.mem0ProfileSynced);

  // Check the latest report
  const report = await p.analysisReport.findFirst({
    where: { id: 12 },
    select: { id: true, uuid: true, reportType: true, createdAt: true },
  });
  console.log('Report 12:', JSON.stringify(report));
  await p.$disconnect();
}
main();
