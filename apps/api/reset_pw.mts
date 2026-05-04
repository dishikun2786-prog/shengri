import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
const p = new PrismaClient();
async function main() {
  const hash = await bcrypt.hash('test123', 10);
  await p.user.update({ where: { id: 34 }, data: { passwordHash: hash } });
  console.log('Password reset for user 34 to test123');
  await p.$disconnect();
}
main();
