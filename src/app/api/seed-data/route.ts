import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'

const prisma = new PrismaClient()

// This endpoint will fetch from external source or accept uploaded data
// For now, we'll use the full CSV data embedded

export async function POST(request: Request) {
  try {
    console.log('Starting data seeding...')
    
    // Parse CSV data
    const lines = csvData.trim().split('\n')
    const headers = lines[0].split(',')
    
    console.log('CSV headers:', headers)
    console.log('Total records to process:', lines.length - 1)
    
    // Process each line
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',')
      const [id, series, releaseYear, figure, probability] = values
      
      if (!id || !series || !releaseYear || !figure || !probability) {
        console.log(`Skipping invalid row ${i}:`, values)
        continue
      }
      
      try {
        // Create or get series
        const seriesRecord = await prisma.series.upsert({
          where: { name: `Series ${series}` },
          update: {},
          create: {
            name: `Series ${series}`,
            releaseYear: parseInt(releaseYear)
          }
        })
        
        // Create or get category based on figure name
        let categoryName = 'Basic'
        if (figure.includes('Artist')) categoryName = 'Artist'
        else if (figure.includes('Secret')) categoryName = 'Secret'
        else if (figure.includes('Horror')) categoryName = 'Horror'
        else if (figure.includes('SF')) categoryName = 'SF'
        else if (figure.includes('Cute')) categoryName = 'Cute'
        else if (figure.includes('Animal')) categoryName = 'Animal'
        else if (figure.includes('Pattern')) categoryName = 'Pattern'
        else if (figure.includes('Flag')) categoryName = 'Flag'
        else if (figure.includes('Jellybean')) categoryName = 'Jellybean'
        
        const categoryRecord = await prisma.category.upsert({
          where: { name: categoryName },
          update: {},
          create: {
            name: categoryName,
            description: `${categoryName} category bearbricks`
          }
        })
        
        // Create bearbrick
        await prisma.bearbrick.upsert({
          where: { id: id },
          update: {
            name: figure,
            rarityPercentage: parseFloat(probability),
            seriesId: seriesRecord.id,
            categoryId: categoryRecord.id
          },
          create: {
            id: id,
            name: figure,
            description: `${figure} from Series ${series} (${releaseYear})`,
            sizePercentage: 100,
            rarityPercentage: parseFloat(probability),
            seriesId: seriesRecord.id,
            categoryId: categoryRecord.id,
            createdById: null // System created
          }
        })
        
        if (i % 100 === 0) {
          console.log(`Processed ${i} records...`)
        }
      } catch (error) {
        console.error(`Error processing record ${i}:`, error)
      }
    }
    
    // Get final counts
    const counts = await Promise.all([
      prisma.series.count(),
      prisma.category.count(),
      prisma.bearbrick.count()
    ])
    
    console.log('Data seeding completed!')
    console.log(`Series: ${counts[0]}, Categories: ${counts[1]}, Bearbricks: ${counts[2]}`)
    
    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully!',
      counts: {
        series: counts[0],
        categories: counts[1],
        bearbricks: counts[2]
      }
    })
    
  } catch (error) {
    console.error('Database seeding error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to seed database',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}