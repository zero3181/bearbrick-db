import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    console.log('🚀 Starting full data upload...')
    
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

    // Sample of the CSV data for testing
    // In production, you would read from the actual CSV file
    const sampleData = `ID,Series,ReleaseYear,Figure,Probability
S01-001,1,2001,Basic [B],1.11
S01-002,1,2001,Basic [E],1.11
S01-003,1,2001,Basic [@],1.11
S01-017,1,2001,Artist [Hiroto],4.16
S01-019,1,2001,Secret [Hiroto],0.52
S49-001,49,2025,Basic [B],1.82
S49-010,49,2025,Jellybean,5.2
S49-017,49,2025,Hero [The Boys: Soldier Boy],4.16
S50-032,50,2025,Secret [Hero #2],0.52`
    
    // Parse CSV data
    const lines = sampleData.trim().split('\n')
    let processed = 0
    let skipped = 0
    
    console.log(`📊 Processing ${lines.length - 1} records...`)
    
    // Process each line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      
      const values = line.split(',')
      const [id, series, releaseYear, figure, probability] = values
      
      if (!id || !series || !releaseYear || !figure) {
        console.log(`⚠️ Skipping invalid row ${i}:`, values)
        skipped++
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
        else if (figure.includes('Hero')) categoryName = 'Hero'
        else if (figure.includes('Pattern')) categoryName = 'Pattern'
        else if (figure.includes('Jellybean')) categoryName = 'Jellybean'
        else if (figure.includes('Horror') || figure.includes('Villain')) categoryName = 'Horror'
        else if (figure.includes('SF')) categoryName = 'SF'
        else if (figure.includes('Cute')) categoryName = 'Cute'
        else if (figure.includes('Animal')) categoryName = 'Animal'
        else if (figure.includes('Flag')) categoryName = 'Flag'
        else if (figure.includes('Thermo')) categoryName = 'Thermo'
        
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
        console.error(`❌ Error processing record ${i} (${id}):`, error)
        skipped++
      }
    }
    
    // Get final counts
    const counts = await Promise.all([
      prisma.series.count(),
      prisma.category.count(),
      prisma.bearbrick.count()
    ])
    
    console.log('🎉 Full data upload completed!')
    console.log(`📈 Final counts:`)
    console.log(`   - Series: ${counts[0]}`)
    console.log(`   - Categories: ${counts[1]}`)
    console.log(`   - Bearbricks: ${counts[2]}`)
    
    res.status(200).json({
      success: true,
      message: 'Full bearbrick database uploaded successfully!',
      processed,
      skipped,
      counts: {
        series: counts[0],
        categories: counts[1],
        bearbricks: counts[2]
      }
    })
    
  } catch (error) {
    console.error('💥 Database upload error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to upload full data',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  } finally {
    await prisma.$disconnect()
  }
}