import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

// Define category mappings based on CSV data
const CATEGORY_MAPPING = {
  'Basic': 'Basic',
  'Jellybean': 'Jellybean',
  'Pattern': 'Pattern', 
  'Flag': 'Flag',
  'Horror': 'Horror',
  'SF': 'Science Fiction',
  'Cute': 'Cute',
  'Animal': 'Animal',
  'Hero': 'Hero',
  'Artist': 'Artist',
  'Secret': 'Secret',
  'Villain': 'Villain'
}

// Define rarity based on probability ranges
function getRarity(probability: number): number {
  if (probability >= 10) return 5   // Common (10%+)
  if (probability >= 5) return 4    // Uncommon (5-9.99%)
  if (probability >= 2) return 3    // Rare (2-4.99%)  
  if (probability >= 1) return 2    // Very Rare (1-1.99%)
  return 1                          // Ultra Rare (<1%)
}

// Get season based on series number
function getSeason(seriesNumber: number): string {
  return seriesNumber % 2 === 1 ? 'Summer' : 'Winter'
}

// Extract brand/artist from figure name
function extractCollaboration(figure: string): string | null {
  const artistMatch = figure.match(/Artist \[(.*?)\]/)
  if (artistMatch) {
    return artistMatch[1]
  }
  return null
}

// Get category from figure name
function getCategory(figure: string): string {
  if (figure.startsWith('Basic')) return 'Basic'
  if (figure.includes('Jellybean')) return 'Jellybean'
  if (figure.includes('Pattern')) return 'Pattern'
  if (figure.includes('Flag')) return 'Flag' 
  if (figure.includes('Horror')) return 'Horror'
  if (figure.includes('SF')) return 'SF'
  if (figure.includes('Cute')) return 'Cute'
  if (figure.includes('Animal')) return 'Animal'
  if (figure.includes('Hero')) return 'Hero'
  if (figure.includes('Villain')) return 'Villain'
  if (figure.includes('Artist')) return 'Artist'
  if (figure.includes('Secret')) return 'Secret'
  return 'Special'
}

async function main() {
  console.log('🌱 Starting database seed...')

  try {
    // Read CSV file
    const csvPath = '/Users/a60157225/Library/CloudStorage/OneDrive-개인/Documents/bearbrick_series_full.csv'
    const csvContent = readFileSync(csvPath, 'utf-8')
    const lines = csvContent.split('\n').slice(1) // Skip header
    
    console.log(`📊 Found ${lines.length} bearbrick entries`)

    // Parse CSV data
    const bearbrickData = lines
      .filter(line => line.trim())
      .map(line => {
        const [id, series, releaseYear, figure, probability] = line.split(',')
        return {
          id: id.trim(),
          series: parseInt(series),
          releaseYear: parseInt(releaseYear),
          figure: figure.trim(),
          probability: parseFloat(probability || '0')
        }
      })

    // Create unique series
    const uniqueSeries = Array.from(new Set(bearbrickData.map(item => item.series)))
      .map(seriesNum => ({
        number: seriesNum,
        name: `Series ${seriesNum}`,
        season: getSeason(seriesNum),
        releaseYear: bearbrickData.find(item => item.series === seriesNum)?.releaseYear || 2001,
        theme: `Series ${seriesNum} Collection`
      }))

    console.log(`📦 Creating ${uniqueSeries.length} series...`)
    
    for (const series of uniqueSeries) {
      const existing = await prisma.series.findFirst({
        where: { number: series.number }
      })
      
      if (!existing) {
        await prisma.series.create({
          data: series
        })
      }
    }

    // Create categories
    const categories = Object.values(CATEGORY_MAPPING).map(name => ({
      name,
      description: `${name} category bearbricks`,
      rarityWeight: name === 'Secret' ? 0.1 : name === 'Artist' ? 0.3 : name === 'Basic' ? 2.0 : 1.0
    }))

    console.log(`🏷️ Creating ${categories.length} categories...`)
    
    for (const category of categories) {
      const existing = await prisma.category.findFirst({
        where: { name: category.name }
      })
      
      if (!existing) {
        await prisma.category.create({
          data: category
        })
      }
    }

    // Create collaborations from artist entries
    const collaborations = bearbrickData
      .map(item => extractCollaboration(item.figure))
      .filter((collab): collab is string => collab !== null)
      .filter((collab, index, array) => array.indexOf(collab) === index) // unique
      .map(brandName => ({
        brandName,
        type: 'Artist',
        description: `Collaboration with ${brandName}`
      }))

    console.log(`🤝 Creating ${collaborations.length} collaborations...`)
    
    for (const collaboration of collaborations) {
      const existing = await prisma.collaboration.findFirst({
        where: { brandName: collaboration.brandName }
      })
      
      if (!existing) {
        await prisma.collaboration.create({
          data: collaboration
        })
      }
    }

    // Get a default user for createdBy (use first user or create one)
    let defaultUser = await prisma.user.findFirst()
    if (!defaultUser) {
      defaultUser = await prisma.user.create({
        data: {
          email: 'system@bearbrickdb.com',
          name: 'System User',
          role: 'ADMIN'
        }
      })
    }

    // Create bearbricks
    console.log(`🧸 Creating ${bearbrickData.length} bearbricks...`)
    
    let created = 0
    let skipped = 0

    for (const item of bearbrickData) {
      try {
        const categoryName = CATEGORY_MAPPING[getCategory(item.figure) as keyof typeof CATEGORY_MAPPING] || 'Special'
        const category = await prisma.category.findUnique({ where: { name: categoryName } })
        const series = await prisma.series.findUnique({ where: { number: item.series } })
        
        if (!category || !series) {
          console.log(`⚠️ Skipping ${item.id}: Missing category or series`)
          skipped++
          continue
        }

        const collaborationName = extractCollaboration(item.figure)
        const collaboration = collaborationName 
          ? await prisma.collaboration.findFirst({ where: { brandName: collaborationName } })
          : null

        await prisma.bearbrick.upsert({
          where: { id: item.id },
          update: {
            name: item.figure,
            sizePercentage: 100, // Default to 100% size
            rarityPercentage: item.probability,
            estimatedQuantity: Math.floor((100 / item.probability) * 1000), // Estimate based on probability
            description: `${item.figure} from Series ${item.series} (${item.releaseYear})`
          },
          create: {
            id: item.id,
            name: item.figure,
            sizePercentage: 100,
            releaseDate: new Date(`${item.releaseYear}-01-01`),
            rarityPercentage: item.probability,
            estimatedQuantity: Math.floor((100 / item.probability) * 1000),
            description: `${item.figure} from Series ${item.series} (${item.releaseYear})`,
            seriesId: series.id,
            categoryId: category.id,
            collaborationId: collaboration?.id,
            createdById: defaultUser.id
          }
        })
        created++
        
        if (created % 50 === 0) {
          console.log(`✅ Created ${created} bearbricks...`)
        }
      } catch (error) {
        console.error(`❌ Error creating ${item.id}:`, error)
        skipped++
      }
    }

    console.log(`🎉 Seed completed!`)
    console.log(`📊 Statistics:`)
    console.log(`   - Series: ${uniqueSeries.length}`)
    console.log(`   - Categories: ${categories.length}`)
    console.log(`   - Collaborations: ${collaborations.length}`)
    console.log(`   - Bearbricks created: ${created}`)
    console.log(`   - Bearbricks skipped: ${skipped}`)

  } catch (error) {
    console.error('❌ Seed failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })