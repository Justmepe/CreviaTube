# CreoCash - Affiliate Marketing Platform

## Overview

CreoCash is a comprehensive affiliate marketing platform designed for the global creator economy. It connects three distinct creator types - Trading Educators, Social Influencers, and Business Entrepreneurs - with content promoters ("clippers"). Each creator type has specialized tracking and reward systems tailored to their specific needs:

**Trading Educators**: Track referral signups, deposits, and trading volume with broker integrations
**Social Influencers**: Track follower growth, engagement metrics, and social platform performance  
**Business Entrepreneurs**: Track website clicks, lead generation, and conversion optimization

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state management
- **Build Tool**: Vite for development and production builds

The frontend follows a component-based architecture with role-based dashboard routing (Creator, Clipper, Admin). The UI uses a modern design system built on Radix UI primitives with consistent styling through Tailwind CSS.

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with local strategy using session-based auth
- **Session Storage**: PostgreSQL session store via connect-pg-simple
- **Database Provider**: Neon serverless PostgreSQL

The backend follows a RESTful API design with modular route handling, centralized authentication middleware, and type-safe database operations through Drizzle ORM.

### Database Architecture
- **ORM**: Drizzle with PostgreSQL dialect
- **Schema Management**: Type-safe schema definitions with Zod validation
- **Migration Strategy**: Drizzle Kit for database migrations

The database uses a multi-entity relational design supporting users (creators/clippers/admins), campaigns, clipper-campaign relationships, tracking events, and payouts with proper foreign key constraints.

## Key Components

### Authentication System
- **Strategy**: Session-based authentication with secure password hashing (scrypt)
- **Authorization**: Role-based access control (creator, clipper, admin)
- **Session Management**: PostgreSQL-backed sessions with configurable expiry

### Campaign Management
- **Campaign Creation**: Creators can define budgets, reward rates, and platform requirements
- **Campaign Status**: Draft, active, paused, completed states
- **Budget Tracking**: Real-time budget usage monitoring with platform fee calculations

### Affiliate Tracking
- **Event Tracking**: Click, signup, deposit, trade, view, and conversion events
- **Status Management**: Pending, verified, paid, rejected event statuses
- **Reward Calculation**: Configurable reward rates per event type

### Payout System
- **Payout Management**: Automated payout calculations and status tracking
- **Payment Methods**: Global payment integration with mobile money support
- **Transaction Tracking**: Complete audit trail for all financial transactions

### User Management
- **Multi-Role Support**: Creators, clippers, and administrators with different capabilities
- **User Types**: Trader creators, influencers, entrepreneurs, and enterprise users
- **Profile Management**: Contact information, payment preferences, and activity status

## Data Flow

1. **User Registration/Login**: Users authenticate through the session-based system
2. **Campaign Creation**: Creators define campaigns with budgets and requirements
3. **Affiliate Signup**: Clippers apply to join campaigns and receive approval
4. **Link Generation**: Approved clippers receive unique tracking links
5. **Event Tracking**: User interactions generate trackable events with reward calculations
6. **Payout Processing**: Verified events trigger payout calculations and payment processing

## External Dependencies

### Core Dependencies
- **Database**: Neon PostgreSQL serverless database
- **UI Components**: Radix UI primitives for accessible components
- **Form Handling**: React Hook Form with Zod validation
- **Date Handling**: date-fns for date manipulation
- **Styling**: Tailwind CSS with PostCSS processing

### Development Tools
- **TypeScript**: Full type safety across frontend and backend
- **Vite**: Fast development server with HMR
- **ESBuild**: Production build optimization
- **Drizzle Kit**: Database schema management and migrations

## Deployment Strategy

### Development Environment (Replit)
- **Dev Server**: Vite development server with Express API proxy
- **Database**: Neon PostgreSQL development database
- **Environment**: NODE_ENV=development with hot reload
- **Replit Features**: Cartographer integration and runtime error overlay

### External Hosting Production
- **Build Process**: `npm run build` creates production bundles
- **Frontend**: Vite builds React to `dist/public` (static files)
- **Backend**: ESBuild bundles Express to `dist/index.js` (Node.js)
- **Database**: External PostgreSQL (Neon, Supabase, Railway, etc.)
- **Session Security**: HTTPS-ready with secure cookie settings

### Supported Platforms
- **Railway**: `railway.json` configuration (Recommended)
- **Render**: `render.yaml` configuration with GitHub integration
- **Vercel**: `vercel.json` configuration for serverless deployment
- **Docker**: `Dockerfile` for containerized deployment
- **VPS/Cloud**: PM2 process manager with `ecosystem.config.js`

### Environment Configuration
```env
DATABASE_URL=postgresql://...        # Required: PostgreSQL connection
SESSION_SECRET=32-char-random       # Required: Secure session secret
NODE_ENV=production                 # Required: Production environment
PORT=5000                          # Optional: Server port
HOST=0.0.0.0                       # Optional: Bind host
```

### Migration Process
1. **Export Data**: Use `pg_dump` from current database
2. **Environment Setup**: Configure `.env` with external database
3. **Deploy**: Use `./deploy.sh` helper script or platform-specific configs
4. **Database Migration**: Run `npm run db:push` to create schema
5. **Import Data**: Restore with `psql` if migrating existing data

The application is deployment-agnostic with automatic detection of Replit vs external hosting environments.

## Recent Changes

### Backend Implementation Complete (July 30, 2025)
- ✅ **Database Schema**: Full PostgreSQL schema with users, campaigns, tracking, payouts tables
- ✅ **Authentication System**: Secure session-based auth with password hashing and Passport.js
- ✅ **API Routes**: Complete RESTful API with campaign management, tracking events, analytics
- ✅ **Storage Layer**: Comprehensive CRUD operations with Drizzle ORM
- ✅ **Testing Verified**: User registration, campaign creation, clipper joining, event tracking, analytics, payouts all working
- ✅ **Global Positioning**: Updated from Kenya-focused to globally scalable creator economy platform
- ✅ **Enterprise Dashboard**: Distinct dashboard for enterprise brands vs small business entrepreneurs
- ✅ **CreoHub Design**: Complementary teal color scheme matching CreoHub's orange design family

### External Hosting Ready (July 30, 2025)
- ✅ **Deployment Configs**: Railway, Render, Vercel, Docker configurations
- ✅ **Environment Detection**: Automatic Replit vs external hosting detection
- ✅ **Production Security**: HTTPS-ready session cookies and environment validation
- ✅ **Deploy Script**: `./deploy.sh` helper with platform selection
- ✅ **Documentation**: Complete `DEPLOYMENT.md` with migration guide
- ✅ **Multi-Platform**: Docker, PM2, serverless deployment options

### Automatic Metrics Integration Complete (July 30, 2025)
- ✅ **Social Media APIs**: Instagram Graph, TikTok Display, YouTube Data, Twitter/X integrations
- ✅ **Trading APIs**: MetaTrader 4/5, Interactive Brokers, OANDA, Alpaca platform support
- ✅ **Analytics APIs**: Google Analytics 4, Facebook Pixel, HubSpot CRM integrations
- ✅ **Auto-Sync Service**: Environment-aware automatic metrics synchronization
- ✅ **Metrics Dashboard**: Real-time performance tracking across all creator types
- ✅ **Database Schema**: Extended with social_metrics, trading_metrics, website_metrics tables
- ✅ **API Routes**: Complete metrics API with sync endpoints and user integration updates
- ✅ **Error Handling**: Robust error handling for API failures and rate limiting
- ✅ **Testing Verified**: Full metrics system tested and working in production

### Complete Platform Implementation (July 30, 2025)
- ✅ **Navigation System**: Fixed routing with proper sidebar navigation and page transitions
- ✅ **Campaign Management**: Full campaign creation, editing, and status controls for creators
- ✅ **Clipper Marketplace**: Browse campaigns, apply with filters, and track application status
- ✅ **Payout System**: Request payouts with multiple payment methods (bank, PayPal, mobile money, crypto)
- ✅ **Dashboard Layout**: Consistent UI/UX with role-based navigation and responsive design
- ✅ **Form Validation**: Comprehensive form handling with Zod schemas and error states
- ✅ **Real-time Updates**: Live campaign stats, clipper counts, and earnings tracking
- ✅ **Multi-role Support**: Creator, clipper, and admin interfaces with appropriate permissions

### Budget Escrow System Implementation (July 30, 2025)
- ✅ **PesaPal Integration**: African payment processing with M-Pesa, Airtel Money, card, and bank transfer support
- ✅ **Budget Locking**: Creators must fund campaigns upfront, budget locked in escrow (cannot be withdrawn)
- ✅ **Automatic Payments**: 80% of budget held for clippers, automatic payment processing on verified events
- ✅ **Platform Fees**: 20% platform fee deducted automatically during campaign funding
- ✅ **Comprehensive Tracking**: View-based payments, social media integration, engagement tracking
- ✅ **Campaign End Management**: Creators can end campaigns, triggering final payment processing
- ✅ **Social Media Integration**: Connect Instagram, TikTok, YouTube, Twitter, Facebook for automatic tracking
- ✅ **Payment Methods**: Support for M-Pesa, Airtel Money, bank transfers, and international PayPal
- ✅ **Environment Configuration**: Complete .env.example with all required secrets and API keys