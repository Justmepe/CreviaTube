# Frontend Features

## Feature-Based Architecture

Each feature is organized as a self-contained module with its own:

- **Components**: Feature-specific UI components
- **Hooks**: Custom hooks for the feature
- **Services**: API calls and business logic
- **Types**: Feature-specific type definitions
- **Pages**: Top-level page components

## Current Features

### Auth (`/features/auth/`)
- User authentication (login, register, logout)
- Session management
- Protected routes
- User context

### Campaigns (`/features/campaigns/`)
- Campaign creation and management
- Campaign marketplace
- Campaign analytics
- Application workflow

### Admin (`/features/admin/`)
- Admin dashboards
- User management
- System monitoring
- Analytics and reporting

### Dashboard (`/features/dashboard/`)
- Role-based dashboards (Creator, Clipper, Admin)
- Metrics and KPIs
- Quick actions

### Payments (`/features/payments/`)
- Campaign funding
- Payout management
- Payment history
- PesaPal integration

### Profile (`/features/profile/`)
- User profile management
- Settings and preferences
- Account management

## Adding New Features

1. Create a new folder under `/features/`
2. Add the feature-specific components, hooks, and services
3. Export the main components and hooks from an `index.ts` file
4. Add routes to the main router
5. Update this README