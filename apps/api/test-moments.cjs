const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:123456@localhost:5432/shengri?schema=public',
    },
  },
});

async function main() {
  // Hash password for 'test123456'
  const passwordHash = crypto.createHash('sha256').update('test123456').digest('hex');

  const user = await prisma.user.upsert({
    where: { username: 'moments_test' },
    update: {},
    create: {
      username: 'moments_test',
      passwordHash: passwordHash,
      nickname: '朋友圈测试',
      bio: '这是我的个人简介',
      balance: 100,
      vipLevel: 2,
    },
  });

  console.log('Test user created:', user.id, user.username, user.nickname);

  // Create a test moment
  const moment = await prisma.moment.create({
    data: {
      userId: user.id,
      content: '这是一条测试朋友圈动态！☯ 欢迎大家来互动~',
      images: {
        create: [],
      },
      likesCount: 0,
      commentsCount: 0,
    },
  });

  console.log('Test moment created:', moment.id, moment.uuid);

  // Create another moment with image URLs (simulated)
  const moment2 = await prisma.moment.create({
    data: {
      userId: user.id,
      content: '分享一张美图',
      images: {
        create: [
          { url: '/uploads/moments/sample1.jpg', sortOrder: 0 },
        ],
      },
      likesCount: 1,
      commentsCount: 1,
    },
  });

  // Add a like
  await prisma.momentLike.create({
    data: {
      momentId: moment2.id,
      userId: user.id,
    },
  });

  // Add a comment
  await prisma.momentComment.create({
    data: {
      momentId: moment2.id,
      userId: user.id,
      content: '这条动态看起来不错！',
    },
  });

  console.log('Test moment 2 created:', moment2.id);

  // Verify
  const moments = await prisma.moment.findMany({
    where: { status: 1, isPublic: true },
    include: {
      user: { select: { id: true, nickname: true, username: true, avatarUrl: true, bio: true } },
      images: true,
      _count: { select: { likes: true, comments: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log('\nMoments in database:');
  moments.forEach(m => {
    console.log(`- [${m.id}] ${m.user.nickname}: ${m.content.substring(0, 30)}... | likes: ${m._count.likes} | comments: ${m._count.comments}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
