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
      return NextResponse.json({ error: 'Sign-in required.' }, { status: 401 })
    }

    // Only OWNER can manage users
    if (session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'OWNER role required.' }, { status: 403 })
    }

    const { role, active } = await request.json()
    const userId = params.id

    // Can't change your own role
    if (userId === session.user.id) {
      return NextResponse.json({ error: "You can't change your own role." }, { status: 400 })
    }

    // Confirm the user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    // Block changing an OWNER to another role
    if (user.role === 'OWNER' && role && role !== 'OWNER') {
      return NextResponse.json({ error: "The OWNER role can't be changed." }, { status: 400 })
    }

    // Only OWNER can grant ADMIN
    if (role === 'ADMIN' && session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Only OWNER can grant the ADMIN role.' }, { status: 403 })
    }

    const updateData: any = {}

    if (role && Object.values(UserRole).includes(role)) {
      updateData.role = role
    }

    if (typeof active === 'boolean') {
      updateData.active = active
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No changes to apply.' }, { status: 400 })
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
      message: 'User info updated.'
    })

  } catch (error) {
    console.error('User update error:', error)
    return NextResponse.json(
      { error: 'An error occurred while updating the user.' },
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
      return NextResponse.json({ error: 'Sign-in required.' }, { status: 401 })
    }

    // Only OWNER can delete users
    if (session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'OWNER role required.' }, { status: 403 })
    }

    const userId = params.id

    // Can't delete yourself
    if (userId === session.user.id) {
      return NextResponse.json({ error: "You can't delete your own account." }, { status: 400 })
    }

    // Confirm the user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    // OWNER can't be deleted
    if (user.role === 'OWNER') {
      return NextResponse.json({ error: "An OWNER account can't be deleted." }, { status: 400 })
    }

    // Delete the user (related data cascades per Prisma's schema settings)
    await prisma.user.delete({
      where: { id: userId }
    })

    return NextResponse.json({
      success: true,
      message: 'User deleted.'
    })

  } catch (error) {
    console.error('User deletion error:', error)
    return NextResponse.json(
      { error: 'An error occurred while deleting the user.' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
