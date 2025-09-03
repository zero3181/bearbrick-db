import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST() {
  try {
    console.log('Starting database setup...');
    
    // Run prisma db push
    const { stdout, stderr } = await execAsync('npx prisma db push --accept-data-loss', {
      env: { ...process.env }
    });
    
    console.log('Prisma output:', stdout);
    if (stderr) console.log('Prisma stderr:', stderr);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database schema applied successfully',
      output: stdout
    });
  } catch (error) {
    console.error('Database setup error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}