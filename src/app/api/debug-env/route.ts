import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    
    return NextResponse.json({
      hasDatabaseUrl: !!databaseUrl,
      urlStartsWith: databaseUrl ? databaseUrl.substring(0, 20) + '...' : 'N/A',
      allEnvKeys: Object.keys(process.env).filter(key => 
        key.includes('DATABASE') || 
        key.includes('POSTGRES') || 
        key.includes('SUPABASE')
      ),
    });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}