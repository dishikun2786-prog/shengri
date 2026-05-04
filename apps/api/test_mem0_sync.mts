import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  // Find a user with a chart
  const chart = await p.baziChart.findFirst({
    select: { id: true, userId: true, dayGan: true },
  });
  console.log(JSON.stringify(chart, null, 2));
  await p.$disconnect();
}
main();
