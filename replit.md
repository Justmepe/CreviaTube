# CreoCash - Affiliate Marketing Platform

## Overview

CreoCash is a comprehensive affiliate marketing platform designed for the global creator economy. It connects Trading Educators, Social Influencers, and Business Entrepreneurs with content promoters ("clippers"). Each creator type has specialized tracking and reward systems tailored to their specific needs, enabling them to track referrals, engagement, and conversions with integrated broker, social media, and analytics platforms. The platform aims to be a leading solution for monetizing creative content and fostering a vibrant creator ecosystem.

## User Preferences

Preferred communication style: Simple, everyday language.
Project Structure: Scalable, well-organized modular architecture with separate client and backend folders.

## System Architecture

### Project Structure (UPDATED 2025-01-05)
```
CreoCash/
├── client/                # React frontend application
│   ├── src/
│   │   ├── features/     # Feature-based modules (auth, campaigns, admin, etc.)
│   │   ├── components/   # Shared UI components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utilities and configurations
│   │   ├── pages/        # Page components
│   │   └── types/        # TypeScript type definitions
│   └── README.md
├── backend/               # Node.js backend application
│   ├── core/             # Core infrastructure (database, middleware)
│   ├── modules/          # Feature modules (auth, campaigns, users, admin, etc.)
│   ├── services/         # Business logic services
│   └── index.ts          # Server entry point
├── shared/               # Shared schemas and types
└── README.md
```

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Architecture**: Feature-based modular structure for scalability with enhanced campaign management components
- **Styling**: Tailwind CSS with shadcn/ui component library, using Radix UI primitives
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state management
- **Build Tool**: Vite
- **Visualizations**: Recharts for interactive analytics dashboards and data visualization
Each feature (auth, campaigns, admin, etc.) is self-contained with its own components, hooks, and services.

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Architecture**: Modular structure with separate modules for each feature domain including advanced analytics and goal completion services
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with local strategy (session-based auth)
- **Database Provider**: Neon serverless PostgreSQL
- **Analytics Services**: Comprehensive campaign performance tracking, budget analytics, and goal completion processing
- **Goal Completion Engine**: Automated clipper completion detection and payout processing
Each module follows the pattern: service.ts (business logic) → controller.ts (HTTP handling) → routes.ts (API endpoints).

### Database Architecture
- **ORM**: Drizzle with PostgreSQL dialect.
- **Schema Management**: Type-safe schema definitions with Zod validation.
- **Migration Strategy**: Drizzle Kit for database migrations.
The database uses a multi-entity relational design supporting users (creators/clippers/admins), campaigns, tracking events, and payouts.

### Key Features
- **Authentication System**: Session-based authentication with secure password hashing and role-based access control.
- **Enhanced Campaign Management**: Comprehensive campaign creation wizard with multi-step flows for different creator types (trader, entrepreneur, enterprise, influencer).
- **Enterprise White-Label Platform**: Complete white-label access for enterprise users with custom branding, domain, color schemes, custom pricing (no standard 20% fees), and full platform control. Enterprise Portal active with TechStartup Inc account (15% commission rate).
- **Cold Outreach Add-On Service**: Optional premium B2B lead generation service for entrepreneurs and enterprise users with conditional premium commission rates (25-30% vs standard 20%) that only apply when using cold outreach campaigns. Includes multi-channel support (email, LinkedIn, phone, DMs), professional compliance features, and lead quality verification.
- **Advanced Budget Tracking**: Real-time budget allocation, escrow monitoring, automatic payout calculations with 20/80 platform/clipper split, and detailed spending analytics.
- **Goal-Based Completion System**: Individual clipper participation tracked separately with automatic completion detection when primary goals (views, clicks, signups, deposits, trades, conversions) are reached and immediate payout processing.
- **Comprehensive Analytics**: Real-time campaign performance tracking, goal progress monitoring, conversion analytics with comprehensive metrics dashboard and interactive visualizations.
- **Affiliate Tracking**: Tracks various events (click, signup, deposit, trade, view, conversion) with configurable reward rates and status management.
- **Automated Payout System**: Escrow-based payment system with automatic reward calculations, goal-based triggers, and global payment integrations including mobile money.
- **User Management**: Supports multiple roles (Creator, Clipper, Admin, Enterprise) with distinct capabilities and profile management.
- **Bot Protection**: Advanced anti-bot system with behavioral analysis, device fingerprinting, and real-time rate limiting.
- **AI Content Detection**: Multi-layer analysis for detecting AI-generated content to enforce authentic user-generated content.

### Data Flow
User authentication, campaign creation, affiliate signup, unique tracking link generation, event tracking with reward calculations, and payout processing form the core data flow.

### Deployment Strategy
The application is deployment-agnostic, supporting Replit for development and external hosting providers like Railway, Render, Vercel, Docker, and standard VPS/Cloud setups for production. It includes automated build processes and environment configuration.

## External Dependencies

### Core Dependencies
- **Database**: Neon PostgreSQL serverless database.
- **UI Components**: Radix UI primitives, shadcn/ui.
- **Form Handling**: React Hook Form with Zod validation.
- **Date Handling**: `date-fns`.
- **Styling**: Tailwind CSS with PostCSS.
- **Payment Processing**: PesaPal (for African payments like M-Pesa), PayPal, Wise, Rapyd for global payouts.
- **Social Media APIs**: Instagram Graph, TikTok Display, YouTube Data, Twitter/X.
- **Trading APIs**: MetaTrader 4/5, Interactive Brokers, OANDA, Alpaca, and specific global/Kenyan broker integrations.
- **Analytics APIs**: Google Analytics 4, Facebook Pixel, HubSpot CRM.

### Development Tools
- **TypeScript**: For type safety.
- **Vite**: Fast development server.
- **ESBuild**: Production build optimization.
- **Drizzle Kit**: Database schema management.