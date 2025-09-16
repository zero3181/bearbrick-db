import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient, UserRole } from '@prisma/client'

const prisma = new PrismaClient()

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // OWNER 권한만 사용자 관리 가능
    if (session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'OWNER 권한이 필요합니다.' }, { status: 403 })
    }

    const { role, active } = await request.json()
    const userId = params.id

    // 자기 자신의 역할은 변경할 수 없음
    if (userId === session.user.id) {
      return NextResponse.json({ error: '자기 자신의 역할은 변경할 수 없습니다.' }, { status: 400 })
    }

    // 사용자 존재 확인
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 })
    }

    // OWNER를 다른 역할로 변경하려는 경우 차단
    if (user.role === 'OWNER' && role && role !== 'OWNER') {
      return NextResponse.json({ error: 'OWNER 역할은 변경할 수 없습니다.' }, { status: 400 })
    }

    // ADMIN 역할 설정은 OWNER만 가능
    if (role === 'ADMIN' && session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'ADMIN 역할 설정은 OWNER만 가능합니다.' }, { status: 403 })
    }

    const updateData: any = {}

    if (role && Object.values(UserRole).includes(role)) {
      updateData.role = role
    }

    if (typeof active === 'boolean') {
      updateData.active = active
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: '변경할 데이터가 없습니다.' }, { status: 400 })
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        _count: {
          select: {
            submittedImages: true,
            uploadedImages: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: '사용자 정보가 업데이트되었습니다.'
    })

  } catch (error) {
    console.error('User update error:', error)
    return NextResponse.json(
      { error: '사용자 정보 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // OWNER 권한만 사용자 삭제 가능
    if (session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'OWNER 권한이 필요합니다.' }, { status: 403 })
    }

    const userId = params.id

    // 자기 자신은 삭제할 수 없음
    if (userId === session.user.id) {
      return NextResponse.json({ error: '자기 자신은 삭제할 수 없습니다.' }, { status: 400 })
    }

    // 사용자 존재 확인
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 })
    }

    // OWNER는 삭제할 수 없음
    if (user.role === 'OWNER') {
      return NextResponse.json({ error: 'OWNER 계정은 삭제할 수 없습니다.' }, { status: 400 })
    }

    // 사용자 삭제 (관련 데이터도 함께 삭제됨 - Prisma cascade 설정에 따라)
    await prisma.user.delete({
      where: { id: userId }
    })

    return NextResponse.json({
      success: true,
      message: '사용자가 삭제되었습니다.'
    })

  } catch (error) {
    console.error('User deletion error:', error)
    return NextResponse.json(
      { error: '사용자 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}