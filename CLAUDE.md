# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Start development server:**
```bash
npm run dev
```
Development server runs on http://localhost:3000 with Turbopack enabled for faster builds.

**Build for production:**
```bash
npm run build
```
Production build uses Turbopack.

**Start production server:**
```bash
npm start
```

**Lint code:**
```bash
npm run lint
```
Uses ESLint with Next.js configuration.

**Database commands:**
```bash
npx prisma generate    # Generate Prisma client
npx prisma db push     # Push schema changes to database
npx prisma studio      # Open Prisma Studio GUI
```

## Architecture Overview

This is a Next.js 15 application using the App Router with the following stack:

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS v4
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with Prisma adapter
- **UI Components**: Headless UI with Heroicons and Lucide React
- **TypeScript**: Enabled with strict mode

**Project Structure:**
- `src/app/`: Next.js App Router pages and layouts
- `src/components/`: Reusable React components
- `prisma/`: Database schema and migrations
- `public/`: Static assets

**Database Configuration:**
- Prisma client is generated to `src/generated/prisma`
- Uses PostgreSQL as the database provider
- Database URL configured via `DATABASE_URL` environment variable

**Styling:**
- Uses Tailwind CSS v4 with custom CSS variables
- Dark mode support via `prefers-color-scheme`
- Custom fonts: Geist Sans and Geist Mono from Google Fonts
- Path alias `@/*` maps to `./src/*`

**Key Dependencies:**
- Authentication: NextAuth.js with bcryptjs for password hashing
- Database: Prisma with PostgreSQL
- UI: Headless UI, Heroicons, Lucide React
- Development: TypeScript, ESLint, Turbopack