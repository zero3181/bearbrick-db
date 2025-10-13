const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkData() {
  try {
    const count = await prisma.bearbrick.count()
    console.log(`Total bearbricks: ${count}`)

    const samples = await prisma.bearbrick.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        series: {
          select: {
            name: true
          }
        }
      }
    })
    console.log('\nSample data:')
    samples.forEach(b => console.log(`- ${b.id}: ${b.name} (${b.series.name})`))
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkData()
