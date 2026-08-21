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
      return NextResponse.json({ error: 'Sign-in required.' }, { status: 401 })
    }

    // Confirm admin role
    if (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Admin role required.' }, { status: 403 })
    }

    const { action, bearbrickId, reason } = await request.json()
    const submissionId = params.id

    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Please specify a valid action.' }, { status: 400 })
    }

    // Find the submitted image
    const submission = await prisma.userSubmittedImage.findUnique({
      where: { id: submissionId },
      include: { submittedBy: true }
    })

    if (!submission) {
      return NextResponse.json({ error: 'Submitted image not found.' }, { status: 404 })
    }

    if (submission.status !== 'PENDING') {
      return NextResponse.json({ error: 'This submission has already been processed.' }, { status: 400 })
    }

    if (action === 'APPROVE') {
      if (!bearbrickId) {
        return NextResponse.json({ error: 'A bearbrick ID is required.' }, { status: 400 })
      }

      // Confirm the bearbrick exists
      const bearbrick = await prisma.bearbrick.findUnique({
        where: { id: bearbrickId }
      })

      if (!bearbrick) {
        return NextResponse.json({ error: 'Bearbrick not found.' }, { status: 404 })
      }

      // Approve within a transaction
      await prisma.$transaction(async (tx) => {
        // 1. Update the UserSubmittedImage status
        await tx.userSubmittedImage.update({
          where: { id: submissionId },
          data: {
            status: 'APPROVED',
            reviewedAt: new Date(),
            reviewedById: session.user.id
          }
        })

        // 2. Add the image as a BearbrickImage
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
        message: 'Image approved and added to the bearbrick.'
      })

    } else if (action === 'REJECT') {
      // Reject
      await prisma.userSubmittedImage.update({
        where: { id: submissionId },
        data: {
          status: 'REJECTED',
          reviewedAt: new Date(),
          reviewedById: session.user.id,
          description: reason ? `${submission.description || ''}\n\nRejection reason: ${reason}` : submission.description
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Image rejected.'
      })
    }

  } catch (error) {
    console.error('Submission review error:', error)
    return NextResponse.json(
      { error: 'An error occurred while reviewing the submission.' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
