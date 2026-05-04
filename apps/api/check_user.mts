import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const users = await p.user.findMany({
    take: 5,
    select: { id: true, username: true, nickname: true, mem0ProfileSynced: true },
  });
  console.log(JSON.stringify(users, null, 2));
  const charts = await p.baziChart.findMany({
    take: 5,
    select: { id: true, userId: true, dayGan: true },
  });
  console.log(JSON.stringify(charts, null, 2));
  await p.$disconnect();
}
main();
