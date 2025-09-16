import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"

const prisma = new PrismaClient()

// Sample CSV data for testing
const sampleData = `ID,Series,ReleaseYear,Figure,Probability
S01-001,1,2001,Basic [B],1.11
S01-002,1,2001,Basic [E],1.11
S01-003,1,2001,Basic [@],1.11
S01-004,1,2001,Basic [R],1.11
S01-005,1,2001,Basic [b],1.11
S01-010,1,2001,Jellybean,13.54
S01-011,1,2001,Pattern,11.46
S01-017,1,2001,Artist [Hiroto],4.16
S01-019,1,2001,Secret [Hiroto],0.52`

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    console.log('Starting data seeding...')
    
    // Create system user for data seeding
    let systemUser = await prisma.user.findFirst({
      where: { email: 'system@bearbrickdb.com' }
    })
    
    if (!systemUser) {
      systemUser = await prisma.user.create({
        data: {
          email: 'system@bearbrickdb.com',
          name: 'System',
          role: 'ADMIN'
        }
      })
    }

    // Parse CSV data
    const lines = sampleData.trim().split('\n')
    const headers = lines[0].split(',')
    
    console.log('CSV headers:', headers)
    console.log('Total records to process:', lines.length - 1)
    
    let processed = 0
    
    // Process each line
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',')
      const [id, series, releaseYear, figure, probability] = values
      
      if (!id || !series || !releaseYear || !figure) {
        console.log(`Skipping invalid row ${i}:`, values)
        continue
      }
      
      try {
        // Create or get series
        const seriesRecord = await prisma.series.upsert({
          where: { number: parseInt(series) },
          update: { 
            releaseYear: parseInt(releaseYear),
            name: `Series ${series}`
          },
          create: {
            number: parseInt(series),
            name: `Series ${series}`,
            season: "Summer",
            releaseYear: parseInt(releaseYear),
            description: `Bearbrick Series ${series} released in ${releaseYear}`
          }
        })
        
        // Determine category based on figure name
        let categoryName = 'Basic'
        if (figure.includes('Artist')) categoryName = 'Artist'
        else if (figure.includes('Secret')) categoryName = 'Secret'
        else if (figure.includes('Pattern')) categoryName = 'Pattern'
        else if (figure.includes('Jellybean')) categoryName = 'Jellybean'
        
        const categoryRecord = await prisma.category.upsert({
          where: { name: categoryName },
          update: {},
          create: {
            name: categoryName,
            description: `${categoryName} category bearbricks`
          }
        })
        
        // Parse probability
        const rarityPercentage = probability && probability.trim() !== '' 
          ? parseFloat(probability) 
          : 0.0
        
        // Create bearbrick
        await prisma.bearbrick.upsert({
          where: { id: id },
          update: {
            name: figure,
            description: `${figure} from Series ${series} (${releaseYear})`,
            rarityPercentage: rarityPercentage,
            seriesId: seriesRecord.id,
            categoryId: categoryRecord.id
          },
          create: {
            id: id,
            name: figure,
            description: `${figure} from Series ${series} (${releaseYear})`,
            sizePercentage: 100,
            rarityPercentage: rarityPercentage,
            seriesId: seriesRecord.id,
            categoryId: categoryRecord.id,
            createdById: systemUser.id
          }
        })
        
        processed++
        
      } catch (error) {
        console.error(`Error processing record ${i} (${id}):`, error)
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
    
    res.status(200).json({
      success: true,
      message: 'Database seeded successfully!',
      processed,
      counts: {
        series: counts[0],
        categories: counts[1],
        bearbricks: counts[2]
      }
    })
    
  } catch (error) {
    console.error('Database seeding error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to seed database',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  } finally {
    await prisma.$disconnect()
  }
}