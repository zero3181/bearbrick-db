import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

// Use production database URL
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgres://postgres.vbjbuprrgsvuecsqiorg:gombrick00%40@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true"
    }
  }
})

async function updateProductionDatabase() {
  try {
    console.log('🚀 Starting production database update...')
    
    // Read CSV file
    const csvPath = '/Users/a60157225/Library/CloudStorage/OneDrive-개인/Documents/bearbrick_series_full.csv'
    const csvData = fs.readFileSync(csvPath, 'utf-8')
    
    // Parse CSV data
    const lines = csvData.trim().split('\n')
    const headers = lines[0].split(',')
    
    console.log(`📊 Processing ${lines.length - 1} records...`)
    
    let processed = 0
    let skipped = 0
    
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
            season: "Summer", // Default season
            releaseYear: parseInt(releaseYear),
            description: `Bearbrick Series ${series} released in ${releaseYear}`
          }
        })
        
        // Determine category based on figure name
        let categoryName = 'Basic'
        if (figure.includes('Artist')) categoryName = 'Artist'
        else if (figure.includes('Secret')) categoryName = 'Secret'
        else if (figure.includes('Horror') || figure.includes('Villain')) categoryName = 'Horror'
        else if (figure.includes('SF')) categoryName = 'SF'
        else if (figure.includes('Cute')) categoryName = 'Cute'
        else if (figure.includes('Animal')) categoryName = 'Animal'
        else if (figure.includes('Hero')) categoryName = 'Hero'
        else if (figure.includes('Pattern')) categoryName = 'Pattern'
        else if (figure.includes('Flag')) categoryName = 'Flag'
        else if (figure.includes('Jellybean')) categoryName = 'Jellybean'
        else if (figure.includes('Thermo')) categoryName = 'Thermo'
        
        const categoryRecord = await prisma.category.upsert({
          where: { name: categoryName },
          update: {},
          create: {
            name: categoryName,
            description: `${categoryName} category bearbricks`
          }
        })
        
        // Parse probability (handle empty values)
        const rarityPercentage = probability && probability.trim() !== '' 
          ? parseFloat(probability) 
          : 0.0
        
        // Create bearbrick
        await prisma.bearbrick.upsert({
          where: { id: id },
          update: {
            name: figure,
            description: `${figure} from Series ${series} (${releaseYear})`,
            sizePercentage: 100,
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
            createdById: undefined // System created - will be handled by application
          }
        })
        
        processed++
        
        if (processed % 100 === 0) {
          console.log(`✅ Processed ${processed} records...`)
        }
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
    
    console.log('\n🎉 Production database update completed!')
    console.log(`📈 Final counts:`)
    console.log(`   - Series: ${counts[0]}`)
    console.log(`   - Categories: ${counts[1]}`)
    console.log(`   - Bearbricks: ${counts[2]}`)
    console.log(`\n📊 Processing summary:`)
    console.log(`   - Processed: ${processed}`)
    console.log(`   - Skipped: ${skipped}`)
    
  } catch (error) {
    console.error('💥 Database update error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
updateProductionDatabase()