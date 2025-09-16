const { PrismaClient } = require('@prisma/client');

async function updateUserToOwner() {
  const prisma = new PrismaClient();

  try {
    console.log('andyjin@gmail.com을 OWNER로 업데이트 중...');

    // 현재 사용자 상태 확인
    const currentUser = await prisma.user.findUnique({
      where: { email: 'andyjin@gmail.com' },
      select: { id: true, name: true, email: true, role: true }
    });

    if (!currentUser) {
      console.log('❌ andyjin@gmail.com 사용자를 찾을 수 없습니다.');
      return;
    }

    console.log(`현재 사용자 정보: ${currentUser.name} (${currentUser.email}) - ${currentUser.role}`);

    // OWNER로 업데이트
    const updatedUser = await prisma.user.update({
      where: { email: 'andyjin@gmail.com' },
      data: { role: 'OWNER' },
      select: { id: true, name: true, email: true, role: true }
    });

    console.log(`✅ 성공적으로 업데이트됨: ${updatedUser.name} (${updatedUser.email}) - ${updatedUser.role}`);

    // 모든 사용자의 현재 상태 확인
    console.log('\n=== 현재 모든 사용자 목록 ===');
    const allUsers = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true },
      orderBy: { role: 'desc' }
    });

    allUsers.forEach(user => {
      console.log(`${user.name || '이름없음'} (${user.email}) - ${user.role}`);
    });

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);

    if (error.code === 'P2002') {
      console.log('중복 제약 조건 오류');
    } else if (error.code === 'P2025') {
      console.log('업데이트할 레코드를 찾을 수 없음');
    } else if (error.message.includes('Invalid value for argument')) {
      console.log('❌ OWNER enum 값이 데이터베이스에 아직 추가되지 않았습니다.');
      console.log('먼저 "npx prisma db push" 명령을 실행하여 스키마를 동기화해주세요.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

updateUserToOwner();