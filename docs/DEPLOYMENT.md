# CreviaTube Deployment Guide

This guide covers deployment options for hosting CreviaTube externally from Replit.

## Prerequisites

1. **PostgreSQL Database** - Neon, Supabase, or any PostgreSQL provider
2. **Environment Variables** - Configure as shown in `.env.example`
3. **Node.js 18+** - Required for the application runtime

## Quick Deploy Options

### Railway (Recommended)
```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login and deploy
railway login
railway link
railway up
```

### Render
1. Connect your GitHub repository to Render
2. Create new Web Service
3. Use build command: `npm run build`
4. Use start command: `npm start`
5. Add environment variables from `.env.example`

### Vercel
```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Deploy
vercel --prod
```

### Docker Deployment
```bash
# Build image
docker build -t CreviaTube .

# Run container
docker run -p 5000:5000 --env-file .env CreviaTube
```

## Environment Setup

### Required Environment Variables
```env
DATABASE_URL=postgresql://...     # PostgreSQL connection string
SESSION_SECRET=random-32-chars    # Secure session secret
NODE_ENV=production              # Production environment
PORT=5000                        # Server port (optional)
```

### Database Setup
1. Create PostgreSQL database on your provider
2. Run schema migration: `npm run db:push`
3. Verify tables created: users, campaigns, clipper_campaigns, tracking_events, payouts

## Configuration Files

- `Dockerfile` - Docker containerization
- `railway.json` - Railway deployment config
- `vercel.json` - Vercel deployment config  
- `render.yaml` - Render deployment config

## Build Process

1. **Frontend Build**: Vite builds React app to `dist/public`
2. **Backend Build**: ESBuild bundles Express server to `dist/index.js`
3. **Production**: Single Node.js process serves both API and static files

## Health Checks

- **Health endpoint**: `GET /api/user` (returns 401 for unauthenticated)
- **Database check**: Ensure PostgreSQL connection is active
- **Session store**: Verify session table exists and is accessible

## Scaling Considerations

- **Database**: Use connection pooling (included with Neon/Supabase)
- **Sessions**: PostgreSQL session store supports horizontal scaling
- **Static files**: Consider CDN for production (Cloudflare, AWS CloudFront)
- **Load balancing**: Application is stateless except for sessions

## Security

- Environment variables for all secrets
- PostgreSQL connection with SSL
- Session cookies with secure settings
- Input validation with Zod schemas
- Password hashing with scrypt

## Monitoring

Monitor these endpoints:
- `/api/user` - Authentication health
- Database connection pool metrics
- Response times for campaign/tracking operations

## Support

For deployment issues:
1. Check environment variables match `.env.example`
2. Verify PostgreSQL connection and schema
3. Review application logs for startup errors
4. Test API endpoints with curl/Postman