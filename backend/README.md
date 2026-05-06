# CreviaTube Backend

## Architecture Overview

The backend follows a modular, scalable architecture with clear separation of concerns:

```
backend/
├── core/                    # Core infrastructure
│   ├── database/           # Database connection & config
│   ├── middleware/         # Express middleware
│   └── app.ts             # Application setup
├── modules/                # Feature modules
│   ├── auth/              # Authentication & authorization
│   ├── campaigns/         # Campaign management
│   ├── users/             # User management
│   ├── admin/             # Admin functionality
│   ├── payments/          # Payment processing
│   ├── metrics/           # Analytics & tracking
│   └── bot-protection/    # Anti-bot measures
├── api/                   # API route definitions
├── services/              # Business logic services
└── index.ts              # Server entry point
```

## Module Structure

Each module follows a consistent pattern:
- `*.service.ts` - Business logic and data access
- `*.controller.ts` - HTTP request handling
- `*.routes.ts` - Route definitions
- `*.middleware.ts` - Module-specific middleware
- `*.types.ts` - Type definitions

## Key Features

- **Modular Architecture**: Each feature is isolated in its own module
- **Type Safety**: Full TypeScript support with shared schemas
- **Database Integration**: Drizzle ORM with PostgreSQL
- **Authentication**: Passport.js with session management
- **Security**: Rate limiting, bot detection, input validation
- **Scalability**: Easy to add new modules and features