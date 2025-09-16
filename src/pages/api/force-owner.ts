import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    console.log('🔧 강제 OWNER 업데이트 시작...')

    // 1. andyjin@gmail.com 사용자 확인
    const targetUser = await prisma.user.findUnique({
      where: { email: 'andyjin@gmail.com' },
      select: { id: true, name: true, email: true, role: true }
    })

    if (!targetUser) {
      return res.status(404).json({
        error: 'andyjin@gmail.com 사용자를 찾을 수 없습니다.',
        success: false
      })
    }

    console.log(`현재 사용자: ${targetUser.name} (${targetUser.email}) - ${targetUser.role}`)

    // 2. Raw SQL을 사용하여 데이터베이스 직접 업데이트
    try {
      // PostgreSQL에서 enum에 OWNER 값 추가
      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'OWNER' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')) THEN
            ALTER TYPE "UserRole" ADD VALUE 'OWNER';
          END IF;
        END $$;
      `)
      console.log('✅ OWNER enum 값 추가 시도 완료')

      // 사용자 역할 업데이트
      await prisma.$executeRawUnsafe(`
        UPDATE users SET role = 'OWNER' WHERE email = 'andyjin@gmail.com';
      `)
      console.log('✅ 사용자 역할 업데이트 완료')

      // 업데이트된 사용자 정보 확인
      const updatedUser = await prisma.user.findUnique({
        where: { email: 'andyjin@gmail.com' },
        select: { id: true, name: true, email: true, role: true }
      })

      // 모든 사용자 목록 확인
      const allUsers = await prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true },
        orderBy: [{ role: 'desc' }, { name: 'asc' }]
      })

      console.log('=== 업데이트 완료 ===')
      console.log(`업데이트된 사용자: ${updatedUser?.name} (${updatedUser?.email}) - ${updatedUser?.role}`)

      return res.status(200).json({
        success: true,
        message: `${targetUser.name}님이 성공적으로 OWNER로 업데이트되었습니다.`,
        previousRole: targetUser.role,
        newRole: updatedUser?.role,
        user: {
          name: updatedUser?.name,
          email: updatedUser?.email,
          role: updatedUser?.role
        },
        allUsers: allUsers.map(user => ({
          name: user.name,
          email: user.email,
          role: user.role
        }))
      })

    } catch (dbError: any) {
      console.error('데이터베이스 업데이트 오류:', dbError.message)

      // CONTRIBUTOR 사용자들이 있다면 먼저 정리
      if (dbError.message.includes('CONTRIBUTOR')) {
        console.log('CONTRIBUTOR 사용자들을 먼저 정리합니다...')

        try {
          await prisma.$executeRawUnsafe(`
            UPDATE users SET role = 'USER' WHERE role = 'CONTRIBUTOR';
          `)
          console.log('✅ CONTRIBUTOR 사용자들을 USER로 변경했습니다.')

          // 다시 OWNER 업데이트 시도
          await prisma.$executeRawUnsafe(`
            UPDATE users SET role = 'OWNER' WHERE email = 'andyjin@gmail.com';
          `)

          const finalUser = await prisma.user.findUnique({
            where: { email: 'andyjin@gmail.com' },
            select: { id: true, name: true, email: true, role: true }
          })

          return res.status(200).json({
            success: true,
            message: 'CONTRIBUTOR 정리 후 성공적으로 OWNER로 업데이트했습니다.',
            previousRole: targetUser.role,
            newRole: finalUser?.role,
            user: finalUser
          })

        } catch (cleanupError: any) {
          return res.status(500).json({
            success: false,
            error: 'CONTRIBUTOR 정리 중 오류가 발생했습니다.',
            details: cleanupError.message
          })
        }
      }

      return res.status(500).json({
        success: false,
        error: '데이터베이스 업데이트 중 오류가 발생했습니다.',
        details: dbError.message,
        suggestion: 'PostgreSQL 데이터베이스에 직접 접근하여 enum을 수정해야 할 수 있습니다.'
      })
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