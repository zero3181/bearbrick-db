import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    console.log('🔧 데이터베이스 업데이트 시작...')

    // 1. 현재 andyjin@gmail.com 사용자 확인
    const currentUser = await prisma.user.findUnique({
      where: { email: 'andyjin@gmail.com' },
      select: { id: true, name: true, email: true, role: true }
    })

    if (!currentUser) {
      console.log('❌ andyjin@gmail.com 사용자를 찾을 수 없습니다.')
      return res.status(404).json({
        error: 'andyjin@gmail.com 사용자를 찾을 수 없습니다.',
        success: false
      })
    }

    console.log(`현재 사용자: ${currentUser.name} (${currentUser.email}) - ${currentUser.role}`)

    // 2. Raw query로 OWNER enum 값 추가 시도
    console.log('OWNER enum 값 추가 중...')
    try {
      await prisma.$executeRaw`ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'OWNER';`
      console.log('✅ OWNER enum 값 추가 완료')
    } catch (enumError: any) {
      console.log('OWNER enum 추가 시도:', enumError.message)
      // enum 값이 이미 존재하거나 추가할 수 없는 경우 계속 진행
    }

    // 3. andyjin@gmail.com을 OWNER로 업데이트
    console.log('사용자 역할 OWNER로 업데이트 중...')
    try {
      const updatedUser = await prisma.$executeRaw`
        UPDATE users SET role = 'OWNER' WHERE email = 'andyjin@gmail.com';
      `

      console.log('✅ 사용자 역할 업데이트 완료')

      // 업데이트된 사용자 정보 조회
      const finalUser = await prisma.user.findUnique({
        where: { email: 'andyjin@gmail.com' },
        select: { id: true, name: true, email: true, role: true }
      })

      console.log(`업데이트된 사용자: ${finalUser?.name} (${finalUser?.email}) - ${finalUser?.role}`)

      // 4. 모든 사용자 목록 조회
      const allUsers = await prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true },
        orderBy: [{ role: 'desc' }, { name: 'asc' }]
      })

      console.log('=== 전체 사용자 목록 ===')
      allUsers.forEach(user => {
        const roleIcon = user.role === 'OWNER' ? '🏆' : user.role === 'ADMIN' ? '👑' : '👤'
        console.log(`${roleIcon} ${user.name || '이름없음'} (${user.email}) - ${user.role}`)
      })

      return res.status(200).json({
        success: true,
        message: 'andyjin@gmail.com이 성공적으로 OWNER로 업데이트되었습니다.',
        previousRole: currentUser.role,
        newRole: finalUser?.role,
        allUsers: allUsers.map(user => ({
          name: user.name,
          email: user.email,
          role: user.role
        }))
      })

    } catch (updateError: any) {
      console.error('사용자 업데이트 오류:', updateError.message)

      if (updateError.message.includes('invalid input value for enum')) {
        // enum에 OWNER가 없는 경우, 먼저 schema push 시도
        console.log('OWNER enum이 없습니다. Prisma schema push를 시도합니다...')

        return res.status(400).json({
          error: 'OWNER enum 값이 데이터베이스에 존재하지 않습니다. 먼저 데이터베이스 스키마를 동기화해주세요.',
          suggestion: 'npx prisma db push 명령을 실행하거나 수동으로 데이터베이스를 업데이트해주세요.',
          success: false
        })
      }

      throw updateError
    }

  } catch (error: any) {
    console.error('전체 처리 오류:', error)

    return res.status(500).json({
      success: false,
      error: '사용자 역할 업데이트 중 오류가 발생했습니다.',
      details: error.message
    })
  } finally {
    await prisma.$disconnect()
  }
}