# 🛠️ CreviaTube Developer Guide

## 📖 Table of Contents

1. [Getting Started](#getting-started)
2. [Architecture Overview](#architecture-overview)
3. [Setup & Installation](#setup--installation)
4. [API Reference](#api-reference)
5. [Database Schema](#database-schema)
6. [Development Workflow](#development-workflow)
7. [Testing](#testing)
8. [Deployment](#deployment)
9. [Contributing](#contributing)

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: Version 18 or higher
- **PostgreSQL**: Version 14 or higher
- **Redis**: Version 6 or higher
- **Git**: For version control

### Quick Start

1. **Clone the Repository**
   ```bash
   git clone https://github.com/creviatube/creviatube.git
   cd creviatube
   ```

2. **Install Dependencies**
   ```bash
   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Set Up Environment**
   ```bash
   # Copy environment files
   cp .env.example .env
   cp .env.example .env.local
   ```

4. **Configure Database**
   ```bash
   # Create database
   createdb creviatube_dev

   # Run migrations
   npm run db:migrate
   ```

5. **Start Development Servers**
   ```bash
   # Start backend (from backend directory)
   npm run dev

   # Start frontend (from frontend directory)
   npm run dev
   ```

---

## 🏗️ Architecture Overview

### System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (React)       │◄──►│   (Express)     │◄──►│  (PostgreSQL)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PWA/Service   │    │   WebSocket     │    │     Redis       │
│    Worker       │    │    Server       │    │    (Cache)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack

#### Frontend
- **React**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool
- **Tailwind CSS**: Styling
- **PWA**: Progressive Web App features

#### Backend
- **Node.js**: Runtime environment
- **Express**: Web framework
- **TypeScript**: Type safety
- **Drizzle ORM**: Database ORM
- **Redis**: Caching and sessions

#### Database
- **PostgreSQL**: Primary database
- **Redis**: Caching and real-time features

#### Infrastructure
- **Docker**: Containerization
- **Nginx**: Reverse proxy
- **PM2**: Process management

---

## ⚙️ Setup & Installation

### Environment Configuration

Create a `.env` file in the backend directory:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/creviatube
REDIS_URL=redis://localhost:6379

# Server Configuration
PORT=5000
NODE_ENV=development

# Authentication
SESSION_SECRET=your-session-secret
JWT_SECRET=your-jwt-secret

# External Services
PESAPAL_CLIENT_ID=your-pesapal-client-id
PESAPAL_CLIENT_SECRET=your-pesapal-client-secret
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-email-password

# File Storage
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=creviatube-uploads
```

### Database Setup

1. **Install PostgreSQL**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install postgresql postgresql-contrib

   # macOS
   brew install postgresql
   ```

2. **Create Database**
   ```bash
   createdb creviatube_dev
   createdb creviatube_test
   ```

3. **Run Migrations**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

### Redis Setup

1. **Install Redis**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install redis-server

   # macOS
   brew install redis
   ```

2. **Start Redis**
   ```bash
   redis-server
   ```

### Development Tools

#### Recommended VS Code Extensions
- TypeScript and JavaScript Language Features
- ESLint
- Prettier
- PostgreSQL
- Docker
- GitLens

#### Development Scripts
```bash
# Backend scripts
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed database with test data

# Frontend scripts
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run tests
npm run lint         # Run ESLint
```

---

## 🔌 API Reference

### Authentication

All API endpoints require authentication unless specified otherwise.

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Response
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username",
    "role": "creator"
  }
}
```

### User Endpoints

#### Get Current User
```http
GET /api/user
Authorization: Bearer <token>
```

#### Update User Profile
```http
PATCH /api/user
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "bio": "Content creator"
}
```

### Campaign Endpoints

#### Get Campaigns
```http
GET /api/campaigns?page=1&limit=20&status=active
Authorization: Bearer <token>
```

#### Create Campaign
```http
POST /api/campaigns
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "My Campaign",
  "description": "Campaign description",
  "budget": 1000,
  "targetAudience": "traders"
}
```

### Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "ValidationError",
  "message": "Invalid input data",
  "statusCode": 400,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 🗄️ Database Schema

### Core Tables

#### Users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'clipper',
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Campaigns
```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status campaign_status DEFAULT 'draft',
  budget DECIMAL(10,2),
  spent DECIMAL(10,2) DEFAULT 0,
  creator_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Broker Links
```sql
CREATE TABLE personalized_broker_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  broker_name VARCHAR(100) NOT NULL,
  link_url TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Indexes

```sql
-- Performance indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_campaigns_creator_id ON campaigns(creator_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_broker_links_user_id ON personalized_broker_links(user_id);
```

---

## 🔄 Development Workflow

### Git Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/new-feature
   ```

2. **Make Changes**
   - Write code
   - Add tests
   - Update documentation

3. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

4. **Push and Create PR**
   ```bash
   git push origin feature/new-feature
   # Create Pull Request on GitHub
   ```

### Code Standards

#### TypeScript
- Use strict mode
- Prefer interfaces over types
- Use proper type annotations
- Avoid `any` type

#### Naming Conventions
- **Files**: kebab-case (e.g., `user-service.ts`)
- **Classes**: PascalCase (e.g., `UserService`)
- **Functions**: camelCase (e.g., `getUserById`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRY_ATTEMPTS`)

#### Code Organization
```
backend/
├── src/
│   ├── controllers/     # Route handlers
│   ├── services/        # Business logic
│   ├── models/          # Data models
│   ├── middleware/      # Express middleware
│   ├── utils/           # Utility functions
│   └── types/           # TypeScript types
├── tests/               # Test files
└── docs/                # Documentation
```

---

## 🧪 Testing

### Test Structure

```
tests/
├── unit/                # Unit tests
├── integration/         # Integration tests
├── e2e/                 # End-to-end tests
└── fixtures/            # Test data
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Writing Tests

#### Unit Test Example
```typescript
import { describe, it, expect } from 'vitest';
import { UserService } from '../services/user-service';

describe('UserService', () => {
  it('should create a new user', async () => {
    const userData = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'password123'
    };

    const user = await UserService.createUser(userData);
    
    expect(user.email).toBe(userData.email);
    expect(user.username).toBe(userData.username);
  });
});
```

#### Integration Test Example
```typescript
import request from 'supertest';
import { app } from '../app';

describe('User API', () => {
  it('should register a new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123'
      });

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe('test@example.com');
  });
});
```

---

## 🚀 Deployment

### Production Environment

#### Environment Variables
```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://user:pass@host:5432/creviatube
REDIS_URL=redis://host:6379
SESSION_SECRET=your-production-secret
```

#### Docker Deployment

1. **Build Image**
   ```bash
   docker build -t creviatube:latest .
   ```

2. **Run Container**
   ```bash
   docker run -d \
     --name creviatube \
     -p 5000:5000 \
     -e DATABASE_URL=postgresql://user:pass@host:5432/creviatube \
     creviatube:latest
   ```

#### Docker Compose
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/creviatube
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:14
    environment:
      - POSTGRES_DB=creviatube
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:6
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### CI/CD Pipeline

#### GitHub Actions
```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to production
        run: |
          # Deployment steps
```

---

## 🤝 Contributing

### Contributing Guidelines

1. **Fork the Repository**
2. **Create Feature Branch**
3. **Make Changes**
4. **Add Tests**
5. **Update Documentation**
6. **Submit Pull Request**

### Code Review Process

1. **Automated Checks**
   - Linting
   - Type checking
   - Tests passing
   - Code coverage

2. **Manual Review**
   - Code quality
   - Security considerations
   - Performance impact
   - Documentation updates

### Issue Reporting

When reporting issues, include:
- **Description**: Clear description of the problem
- **Steps to Reproduce**: Detailed steps to reproduce
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Environment**: OS, browser, version info
- **Screenshots**: If applicable

---

## 📚 Additional Resources

### Documentation
- [API Documentation](https://docs.creviatube.com/api)
- [User Guide](https://docs.creviatube.com/user-guide)
- [Architecture Docs](https://docs.creviatube.com/architecture)

### Community
- [GitHub Issues](https://github.com/creviatube/creviatube/issues)
- [Discord Server](https://discord.gg/creviatube)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/creviatube)

### Support
- **Email**: dev@creviatube.com
- **Slack**: [CreviaTube Dev Team](https://creviatube.slack.com)

---

**Last Updated**: December 2024
**Version**: 1.0.0

For the latest updates, visit our [Developer Portal](https://dev.creviatube.com).
