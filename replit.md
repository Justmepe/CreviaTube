# ClipperRewards - Affiliate Marketing Platform

## Overview

ClipperRewards is a full-stack affiliate marketing platform that connects content creators with affiliate marketers ("clippers"). The platform enables creators to launch campaigns and manage affiliate relationships while providing clippers with tools to promote products and track their earnings.

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
- **Payment Methods**: M-Pesa integration support for African markets
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

### Development Environment
- **Dev Server**: Vite development server with Express API proxy
- **Database**: Local PostgreSQL or Neon development database
- **Environment**: NODE_ENV=development with hot reload

### Production Build
- **Frontend**: Vite build to static assets in dist/public
- **Backend**: ESBuild bundle to dist/index.js with external packages
- **Database**: Production PostgreSQL with connection pooling
- **Session Security**: Secure session configuration with trust proxy

### Environment Configuration
- **Database URL**: Required PostgreSQL connection string
- **Session Secret**: Required secure session secret for production
- **Build Process**: Automated build pipeline with type checking

The application is designed for deployment on platforms like Replit, with specific configurations for Replit's environment including cartographer integration and runtime error overlay for development.