const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateContributors() {
  try {
    console.log('기존 CONTRIBUTOR 사용자들을 USER로 마이그레이션 중...');

    // 모든 CONTRIBUTOR를 USER로 변경
    const result = await prisma.user.updateMany({
      where: { role: 'CONTRIBUTOR' },
      data: { role: 'USER' }
    });

    console.log(`✅ ${result.count}명의 CONTRIBUTOR가 USER로 변경되었습니다.`);

    // 모든 사용자 조회해서 확인
    const allUsers = await prisma.user.findMany({
      select: {
        email: true,
        name: true,
        role: true
      }
    });

    console.log('\n현재 사용자 목록:');
    allUsers.forEach(user => {
      console.log(`- ${user.email} (${user.name || '이름없음'}) - ${user.role}`);
    });

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

migrateContributors();