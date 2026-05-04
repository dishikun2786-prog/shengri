import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const chart = await p.baziChart.findUnique({ where: { id: 1 } });
  console.log('wuxingScore:', JSON.stringify(chart?.wuxingScore));
  console.log('wuxingCounts:', JSON.stringify(chart?.wuxingCounts));
  console.log('shenshaList:', JSON.stringify(chart?.shenshaList));
  console.log('tenGodsMap:', JSON.stringify(chart?.tenGodsMap));
  console.log('dayunList sample:', JSON.stringify((chart?.dayunList as any)?.slice?.(0, 1)));
  console.log('jiShen:', JSON.stringify(chart?.jiShen));
  await p.$disconnect();
}
main();
