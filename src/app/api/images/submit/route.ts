import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Sign-in required.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { imageUrl, title, description } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'An image URL is required.' },
        { status: 400 }
      );
    }

    const submittedImage = await prisma.userSubmittedImage.create({
      data: {
        imageUrl,
        title: title || null,
        description: description || null,
        submittedById: session.user.id,
      },
      include: {
        submittedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      image: submittedImage,
    });
  } catch (error) {
    console.error('Image submission error:', error);
    return NextResponse.json(
      { error: 'Failed to submit the image.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Sign-in required.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const where: any = {};

    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      where.status = status;
    }

    const [images, total] = await Promise.all([
      prisma.userSubmittedImage.findMany({
        where,
        include: {
          submittedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          reviewedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: offset,
        take: limit,
      }),
      prisma.userSubmittedImage.count({ where }),
    ]);

    return NextResponse.json({
      images,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Image list fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to load the image list.' },
      { status: 500 }
    );
  }
}