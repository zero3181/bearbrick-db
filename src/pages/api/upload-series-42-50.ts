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
    console.log('🚀 Starting series 42-50 data upload...')
    
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

    // Read CSV file
    const csvFilePath = '/Users/a60157225/Library/CloudStorage/OneDrive-개인/Documents/bearbrick_series_full_42-50.csv'
    const csvData = fs.readFileSync(csvFilePath, 'utf-8')
    
    // Parse CSV data
    const lines = csvData.trim().split('\n')
    let processed = 0
    let skipped = 0
    
    console.log(`📊 Processing ${lines.length - 1} records...`)
    
    // Process each line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      
      const values = line.split(',')
      const [id, series, releaseYear, figure, probabilityStr] = values
      
      if (!id || !series || !releaseYear || !figure) {
        console.log(`⚠️ Skipping invalid row ${i}:`, values)
        skipped++
        continue
      }
      
      try {
        // Create or get series
        let seriesRecord = await prisma.series.findFirst({
          where: { number: parseInt(series) }
        })
        
        if (!seriesRecord) {
          seriesRecord = await prisma.series.create({
            data: {
              number: parseInt(series),
              name: `Series ${series}`,
              season: "Summer",
              releaseYear: parseInt(releaseYear),
              description: `Bearbrick Series ${series} released in ${releaseYear}`
            }
          })
        }
        
        // Determine category based on figure name
        let categoryName = 'Basic'
        if (figure.includes('Artist')) categoryName = 'Artist'
        else if (figure.includes('Secret')) categoryName = 'Secret'
        else if (figure.includes('Hero')) categoryName = 'Hero'
        else if (figure.includes('Pattern')) categoryName = 'Pattern'
        else if (figure.includes('Jellybean')) categoryName = 'Jellybean'
        else if (figure.includes('Horror')) categoryName = 'Horror'
        else if (figure.includes('SF')) categoryName = 'SF'
        else if (figure.includes('Cute')) categoryName = 'Cute'
        else if (figure.includes('Animal')) categoryName = 'Animal'
        else if (figure.includes('Flag')) categoryName = 'Flag'
        
        let categoryRecord = await prisma.category.findFirst({
          where: { name: categoryName }
        })
        
        if (!categoryRecord) {
          categoryRecord = await prisma.category.create({
            data: {
              name: categoryName,
              description: `${categoryName} category bearbricks`,
              rarityWeight: categoryName === 'Secret' ? 0.1 : categoryName === 'Artist' ? 0.3 : 1.0
            }
          })
        }
        
        // Parse probability
        const rarityPercentage = probabilityStr && probabilityStr.trim() !== '' 
          ? parseFloat(probabilityStr) 
          : null
        
        // Create bearbrick
        const existingBearbrick = await prisma.bearbrick.findUnique({
          where: { id: id }
        })
        
        if (!existingBearbrick) {
          await prisma.bearbrick.create({
            data: {
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
        }
        
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
    
    console.log('🎉 Series 42-50 data upload completed!')
    console.log(`📈 Final counts:`)
    console.log(`   - Series: ${counts[0]}`)
    console.log(`   - Categories: ${counts[1]}`)
    console.log(`   - Bearbricks: ${counts[2]}`)
    
    res.status(200).json({
      success: true,
      message: 'Series 42-50 data uploaded successfully!',
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
      error: 'Failed to upload series 42-50 data',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  } finally {
    await prisma.$disconnect()
  }
}