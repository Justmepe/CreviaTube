# CreviaTube Frontend

## Architecture Overview

The frontend is built with React and follows a feature-based architecture:

```
frontend/src/
├── features/              # Feature-based modules
│   ├── auth/             # Authentication features
│   ├── campaigns/        # Campaign management
│   ├── admin/            # Admin dashboards
│   ├── dashboard/        # User dashboards
│   ├── payments/         # Payment flows
│   └── profile/          # User profile management
├── components/           # Shared UI components
│   ├── ui/              # Base UI components (shadcn)
│   └── layouts/         # Layout components
├── hooks/               # Shared custom hooks
├── lib/                 # Utilities and configurations
├── pages/               # Page components
├── types/               # Type definitions
└── App.tsx             # Main application
```

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **TanStack Query** - Server state management
- **Wouter** - Routing
- **React Hook Form** - Form handling
- **Zod** - Schema validation

## Key Features

- **Feature-Based Organization**: Code organized by business features
- **Component Reusability**: Shared components and hooks
- **Type Safety**: Full TypeScript integration
- **Responsive Design**: Mobile-first approach
- **Dark Mode**: Theme support
- **Real-time Updates**: Live data synchronization