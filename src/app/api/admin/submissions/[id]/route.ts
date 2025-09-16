import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

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

    // 관리자 권한 확인
    if (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER') {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const { action, bearbrickId, reason } = await request.json()
    const submissionId = params.id

    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: '올바른 액션을 지정해주세요.' }, { status: 400 })
    }

    // 제출된 이미지 찾기
    const submission = await prisma.userSubmittedImage.findUnique({
      where: { id: submissionId },
      include: { submittedBy: true }
    })

    if (!submission) {
      return NextResponse.json({ error: '제출된 이미지를 찾을 수 없습니다.' }, { status: 404 })
    }

    if (submission.status !== 'PENDING') {
      return NextResponse.json({ error: '이미 처리된 제출입니다.' }, { status: 400 })
    }

    if (action === 'APPROVE') {
      if (!bearbrickId) {
        return NextResponse.json({ error: '베어브릭 ID가 필요합니다.' }, { status: 400 })
      }

      // 베어브릭 존재 확인
      const bearbrick = await prisma.bearbrick.findUnique({
        where: { id: bearbrickId }
      })

      if (!bearbrick) {
        return NextResponse.json({ error: '베어브릭을 찾을 수 없습니다.' }, { status: 404 })
      }

      // 트랜잭션으로 승인 처리
      await prisma.$transaction(async (tx) => {
        // 1. UserSubmittedImage 상태 업데이트
        await tx.userSubmittedImage.update({
          where: { id: submissionId },
          data: {
            status: 'APPROVED',
            reviewedAt: new Date(),
            reviewedById: session.user.id
          }
        })

        // 2. BearbrickImage로 이미지 추가
        await tx.bearbrickImage.create({
          data: {
            url: submission.imageUrl,
            altText: submission.title || submission.description || null,
            isPrimary: false,
            bearbrickId: bearbrickId,
            uploadedById: session.user.id
          }
        })
      })

      return NextResponse.json({
        success: true,
        message: '이미지가 승인되고 베어브릭에 추가되었습니다.'
      })

    } else if (action === 'REJECT') {
      // 거부 처리
      await prisma.userSubmittedImage.update({
        where: { id: submissionId },
        data: {
          status: 'REJECTED',
          reviewedAt: new Date(),
          reviewedById: session.user.id,
          description: reason ? `${submission.description || ''}\n\n거부 사유: ${reason}` : submission.description
        }
      })

      return NextResponse.json({
        success: true,
        message: '이미지가 거부되었습니다.'
      })
    }

  } catch (error) {
    console.error('Submission review error:', error)
    return NextResponse.json(
      { error: '제출 검토 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}