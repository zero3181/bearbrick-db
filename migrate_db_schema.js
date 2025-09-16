require('dotenv').config();
const { Client } = require('pg');

async function migrateSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ 데이터베이스 연결 성공');

    // 1. 현재 사용자들 확인
    console.log('1. 현재 사용자들 조회...');
    const usersResult = await client.query('SELECT email, name, role FROM users');
    console.log('현재 사용자들:');
    usersResult.rows.forEach(user => {
      console.log(`- ${user.email} (${user.name || '이름없음'}) - ${user.role}`);
    });

    // 2. CONTRIBUTOR를 USER로 변경
    console.log('\n2. CONTRIBUTOR 사용자들을 USER로 변경...');
    const updateResult = await client.query("UPDATE users SET role = 'USER' WHERE role = 'CONTRIBUTOR'");
    console.log(`✅ ${updateResult.rowCount}명의 CONTRIBUTOR가 USER로 변경되었습니다.`);

    // 3. OWNER enum 값 추가
    console.log('\n3. UserRole enum에 OWNER 추가...');
    try {
      await client.query("ALTER TYPE \"UserRole\" ADD VALUE IF NOT EXISTS 'OWNER'");
      console.log('✅ OWNER 값이 enum에 추가되었습니다.');
    } catch (error) {
      console.log('⚠️ OWNER 추가 시도:', error.message);
    }

    // 4. CONTRIBUTOR enum 값 제거 (이건 직접적으로 불가능하므로 스키마 재생성 필요)
    console.log('\n4. 참고: CONTRIBUTOR enum 값 제거는 스키마 재생성이 필요합니다.');

    // 5. andyjin@gmail.com을 OWNER로 설정
    console.log('\n5. andyjin@gmail.com을 OWNER로 설정...');
    try {
      const ownerResult = await client.query("UPDATE users SET role = 'OWNER' WHERE email = 'andyjin@gmail.com'");
      if (ownerResult.rowCount > 0) {
        console.log('✅ andyjin@gmail.com이 OWNER로 설정되었습니다.');
      } else {
        console.log('⚠️ andyjin@gmail.com 사용자를 찾을 수 없습니다.');
      }
    } catch (error) {
      console.log('⚠️ OWNER 설정 시도:', error.message);
    }

    // 6. 최종 사용자 상태 확인
    console.log('\n6. 최종 사용자 상태:');
    const finalResult = await client.query('SELECT email, name, role FROM users');
    finalResult.rows.forEach(user => {
      console.log(`- ${user.email} (${user.name || '이름없음'}) - ${user.role}`);
    });

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
  } finally {
    await client.end();
  }
}

migrateSchema();