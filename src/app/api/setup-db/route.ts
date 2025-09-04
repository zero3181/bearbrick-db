import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Use the correct environment variable from Vercel/Supabase
const databaseUrl = 
  process.env.DATABASE_URL || 
  process.env.POSTGRES_URL || 
  process.env.POSTGRES_PRISMA_URL ||
  // Fallback to direct connection string for testing
  "postgres://postgres.vbjbuprrgsvuecsqiorg:gombrick00%40@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  }
});

export async function POST() {
  try {
    console.log('Starting database setup...');
    console.log('Database URL exists:', !!databaseUrl);
    console.log('Database URL starts with:', databaseUrl?.substring(0, 20));
    
    if (!databaseUrl) {
      throw new Error('No database URL found in environment variables');
    }
    
    // Test database connection first
    await prisma.$connect();
    console.log('Database connected successfully');
    
    // Create tables by running raw SQL commands
    // This is more reliable than prisma db push in serverless environment
    
    // Create enums first
    await prisma.$executeRaw`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN
          CREATE TYPE "UserRole" AS ENUM ('USER', 'CONTRIBUTOR', 'ADMIN');
        END IF;
      END $$;
    `;
    
    await prisma.$executeRaw`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EditRequestType') THEN
          CREATE TYPE "EditRequestType" AS ENUM ('INFO_UPDATE', 'CATEGORY_CHANGE', 'SERIES_CORRECTION', 'OTHER');
        END IF;
      END $$;
    `;
    
    await prisma.$executeRaw`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RequestStatus') THEN
          CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
        END IF;
      END $$;
    `;
    
    // Create NextAuth tables first
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" TEXT NOT NULL,
        "name" TEXT,
        "email" TEXT NOT NULL,
        "emailVerified" TIMESTAMP(3),
        "image" TEXT,
        "role" "UserRole" NOT NULL DEFAULT 'USER',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "users_pkey" PRIMARY KEY ("id")
      );
    `;
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Account" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "provider" TEXT NOT NULL,
        "providerAccountId" TEXT NOT NULL,
        "refresh_token" TEXT,
        "access_token" TEXT,
        "expires_at" INTEGER,
        "token_type" TEXT,
        "scope" TEXT,
        "id_token" TEXT,
        "session_state" TEXT,
        CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
      );
    `;
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Session" (
        "id" TEXT NOT NULL,
        "sessionToken" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "expires" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
      );
    `;
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "VerificationToken" (
        "identifier" TEXT NOT NULL,
        "token" TEXT NOT NULL,
        "expires" TIMESTAMP(3) NOT NULL
      );
    `;
    
    // Create unique constraints and indexes for NextAuth
    await prisma.$executeRaw`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Account_provider_providerAccountId_key') THEN
          ALTER TABLE "Account" ADD CONSTRAINT "Account_provider_providerAccountId_key" UNIQUE ("provider", "providerAccountId");
        END IF;
      END $$;
    `;
    
    await prisma.$executeRaw`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Session_sessionToken_key') THEN
          ALTER TABLE "Session" ADD CONSTRAINT "Session_sessionToken_key" UNIQUE ("sessionToken");
        END IF;
      END $$;
    `;
    
    await prisma.$executeRaw`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_email_key') THEN
          ALTER TABLE "users" ADD CONSTRAINT "users_email_key" UNIQUE ("email");
        END IF;
      END $$;
    `;
    
    await prisma.$executeRaw`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VerificationToken_token_key') THEN
          ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_token_key" UNIQUE ("token");
        END IF;
      END $$;
    `;
    
    await prisma.$executeRaw`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VerificationToken_identifier_token_key') THEN
          ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_identifier_token_key" UNIQUE ("identifier", "token");
        END IF;
      END $$;
    `;
    
    // Add foreign key constraints
    await prisma.$executeRaw`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Account_userId_fkey') THEN
          ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `;
    
    await prisma.$executeRaw`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Session_userId_fkey') THEN
          ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `;
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "series" (
        "id" TEXT NOT NULL,
        "number" INTEGER NOT NULL,
        "name" TEXT NOT NULL,
        "season" TEXT NOT NULL,
        "releaseYear" INTEGER NOT NULL,
        "theme" TEXT,
        "description" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "series_pkey" PRIMARY KEY ("id")
      );
    `;
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "categories" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "rarityWeight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
      );
    `;
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "collaborations" (
        "id" TEXT NOT NULL,
        "brandName" TEXT NOT NULL,
        "artistName" TEXT,
        "type" TEXT NOT NULL,
        "description" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "collaborations_pkey" PRIMARY KEY ("id")
      );
    `;
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "bearbricks" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "sizePercentage" INTEGER NOT NULL,
        "releaseDate" TIMESTAMP(3),
        "rarityPercentage" DOUBLE PRECISION,
        "estimatedQuantity" INTEGER,
        "materialType" TEXT DEFAULT 'ABS Plastic',
        "description" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "seriesId" TEXT NOT NULL,
        "categoryId" TEXT NOT NULL,
        "collaborationId" TEXT,
        "createdById" TEXT NOT NULL,
        CONSTRAINT "bearbricks_pkey" PRIMARY KEY ("id")
      );
    `;
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "bearbrick_images" (
        "id" TEXT NOT NULL,
        "url" TEXT NOT NULL,
        "altText" TEXT,
        "isPrimary" BOOLEAN NOT NULL DEFAULT false,
        "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "bearbrickId" TEXT NOT NULL,
        "uploadedById" TEXT NOT NULL,
        CONSTRAINT "bearbrick_images_pkey" PRIMARY KEY ("id")
      );
    `;
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "edit_requests" (
        "id" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "description" TEXT,
        "oldData" JSONB,
        "newData" JSONB NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "reviewedAt" TIMESTAMP(3),
        "bearbrickId" TEXT NOT NULL,
        "requestedById" TEXT NOT NULL,
        "reviewedById" TEXT,
        CONSTRAINT "edit_requests_pkey" PRIMARY KEY ("id")
      );
    `;
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "image_requests" (
        "id" TEXT NOT NULL,
        "newImageUrl" TEXT NOT NULL,
        "reason" TEXT,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "reviewedAt" TIMESTAMP(3),
        "bearbrickId" TEXT NOT NULL,
        "requestedById" TEXT NOT NULL,
        "reviewedById" TEXT,
        CONSTRAINT "image_requests_pkey" PRIMARY KEY ("id")
      );
    `;
    
    // Add foreign key constraints for bearbrick related tables
    await prisma.$executeRaw`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bearbricks_seriesId_fkey') THEN
          ALTER TABLE "bearbricks" ADD CONSTRAINT "bearbricks_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
      END $$;
    `;
    
    await prisma.$executeRaw`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bearbricks_categoryId_fkey') THEN
          ALTER TABLE "bearbricks" ADD CONSTRAINT "bearbricks_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
      END $$;
    `;
    
    await prisma.$executeRaw`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bearbricks_collaborationId_fkey') THEN
          ALTER TABLE "bearbricks" ADD CONSTRAINT "bearbricks_collaborationId_fkey" FOREIGN KEY ("collaborationId") REFERENCES "collaborations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$;
    `;
    
    await prisma.$executeRaw`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bearbricks_createdById_fkey') THEN
          ALTER TABLE "bearbricks" ADD CONSTRAINT "bearbricks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
      END $$;
    `;
    
    await prisma.$executeRaw`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bearbrick_images_bearbrickId_fkey') THEN
          ALTER TABLE "bearbrick_images" ADD CONSTRAINT "bearbrick_images_bearbrickId_fkey" FOREIGN KEY ("bearbrickId") REFERENCES "bearbricks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `;
    
    await prisma.$executeRaw`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bearbrick_images_uploadedById_fkey') THEN
          ALTER TABLE "bearbrick_images" ADD CONSTRAINT "bearbrick_images_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
      END $$;
    `;
    
    await prisma.$executeRaw`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'edit_requests_bearbrickId_fkey') THEN
          ALTER TABLE "edit_requests" ADD CONSTRAINT "edit_requests_bearbrickId_fkey" FOREIGN KEY ("bearbrickId") REFERENCES "bearbricks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `;
    
    await prisma.$executeRaw`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'edit_requests_requestedById_fkey') THEN
          ALTER TABLE "edit_requests" ADD CONSTRAINT "edit_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
      END $$;
    `;
    
    await prisma.$executeRaw`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'image_requests_bearbrickId_fkey') THEN
          ALTER TABLE "image_requests" ADD CONSTRAINT "image_requests_bearbrickId_fkey" FOREIGN KEY ("bearbrickId") REFERENCES "bearbricks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `;
    
    await prisma.$executeRaw`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'image_requests_requestedById_fkey') THEN
          ALTER TABLE "image_requests" ADD CONSTRAINT "image_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
      END $$;
    `;
    
    console.log('All tables created successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database schema applied successfully! Check Supabase → Database → Tables',
      details: 'Created all tables for Bearbrick database'
    });
  } catch (error) {
    console.error('Database setup error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Failed to create database tables'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}