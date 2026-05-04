import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
const p = new PrismaClient();
async function main() {
  // Check existing password hash for user 34
  const user = await p.user.findUnique({
    where: { id: 34 },
    select: { id: true, username: true, passwordHash: true },
  });
  console.log('User:', JSON.stringify({ id: user?.id, username: user?.username, hasPassword: !!user?.passwordHash }, null, 2));

  // Create a test user with known password
  const hash = await bcrypt.hash('test123', 10);
  const testUser = await p.user.upsert({
    where: { id: 999 },
    create: {
      id: 999,
      username: 'mem0test',
      passwordHash: hash,
      nickname: 'Mem0测试',
    },
    update: {
      passwordHash: hash,
    },
  });
  console.log('Test user ready: id=999, username=mem0test, password=test123');
  await p.$disconnect();
}
main();
