require('dotenv').config();
const { Client } = require('pg');

async function updateDatabaseAndUser() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ 데이터베이스 연결 성공');

    // 1. 현재 사용자 확인
    console.log('1. andyjin@gmail.com 사용자 확인...');
    const userCheck = await client.query(
      'SELECT id, name, email, role FROM users WHERE email = $1',
      ['andyjin@gmail.com']
    );

    if (userCheck.rows.length === 0) {
      console.log('❌ andyjin@gmail.com 사용자를 찾을 수 없습니다.');
      return;
    }

    const currentUser = userCheck.rows[0];
    console.log(`현재 사용자: ${currentUser.name} (${currentUser.email}) - ${currentUser.role}`);

    // 2. OWNER enum 값 추가
    console.log('\\n2. UserRole enum에 OWNER 추가...');
    try {
      await client.query(`ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'OWNER'`);
      console.log('✅ OWNER 값이 enum에 추가되었습니다.');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ OWNER 값이 이미 존재합니다.');
      } else {
        console.log('⚠️ OWNER 추가 시도:', error.message);
      }
    }

    // 3. andyjin@gmail.com을 OWNER로 업데이트
    console.log('\\n3. andyjin@gmail.com을 OWNER로 업데이트...');
    try {
      const updateResult = await client.query(
        `UPDATE users SET role = 'OWNER' WHERE email = 'andyjin@gmail.com' RETURNING id, name, email, role`,
        []
      );

      if (updateResult.rows.length > 0) {
        const updatedUser = updateResult.rows[0];
        console.log(`✅ 성공적으로 업데이트: ${updatedUser.name} (${updatedUser.email}) - ${updatedUser.role}`);
      } else {
        console.log('⚠️ 업데이트된 사용자가 없습니다.');
      }
    } catch (error) {
      console.log('❌ 사용자 업데이트 오류:', error.message);
    }

    // 4. 모든 사용자 상태 확인
    console.log('\\n4. 모든 사용자 현재 상태:');
    const allUsers = await client.query(
      'SELECT id, name, email, role FROM users ORDER BY role DESC, name ASC'
    );

    allUsers.rows.forEach(user => {
      const roleIcon = user.role === 'OWNER' ? '🏆' : user.role === 'ADMIN' ? '👑' : '👤';
      console.log(`${roleIcon} ${user.name || '이름없음'} (${user.email}) - ${user.role}`);
    });

    // 5. CONTRIBUTOR 사용자들을 USER로 변경 (혹시 남아있다면)
    console.log('\\n5. 남은 CONTRIBUTOR 사용자들을 USER로 변경...');
    try {
      const contributorUpdate = await client.query(
        `UPDATE users SET role = 'USER' WHERE role = 'CONTRIBUTOR' RETURNING email, name`
      );

      if (contributorUpdate.rows.length > 0) {
        console.log(`✅ ${contributorUpdate.rows.length}명의 CONTRIBUTOR가 USER로 변경되었습니다:`);
        contributorUpdate.rows.forEach(user => {
          console.log(`  - ${user.name || '이름없음'} (${user.email})`);
        });
      } else {
        console.log('✅ 변경할 CONTRIBUTOR 사용자가 없습니다.');
      }
    } catch (error) {
      console.log('⚠️ CONTRIBUTOR 변경 시도:', error.message);
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
  } finally {
    await client.end();
  }
}

updateDatabaseAndUser();