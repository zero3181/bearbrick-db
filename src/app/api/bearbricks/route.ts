import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit
    
    // Filter parameters
    const series = searchParams.get('series')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const collaboration = searchParams.get('collaboration')
    const minRarity = searchParams.get('minRarity')
    const maxRarity = searchParams.get('maxRarity')
    
    // Build where clause
    const where: any = {}
    
    if (series) {
      where.series = { number: parseInt(series) }
    }
    
    if (category) {
      where.category = { name: category }
    }
    
    if (collaboration) {
      where.collaboration = { brandName: collaboration }
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    if (minRarity || maxRarity) {
      where.rarityPercentage = {}
      if (minRarity) where.rarityPercentage.gte = parseFloat(minRarity)
      if (maxRarity) where.rarityPercentage.lte = parseFloat(maxRarity)
    }
    
    // Get bearbricks with relations
    const [bearbricks, total] = await Promise.all([
      prisma.bearbrick.findMany({
        where,
        skip,
        take: limit,
        include: {
          series: true,
          category: true,
          collaboration: true
        },
        orderBy: [
          { series: { number: 'desc' } },
          { rarityPercentage: 'asc' }
        ]
      }),
      prisma.bearbrick.count({ where })
    ])
    
    const response = {
      data: bearbricks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Error fetching bearbricks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bearbricks' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}