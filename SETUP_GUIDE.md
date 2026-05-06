# 🚀 CreviaTube Local Development Setup Guide

## 📋 Prerequisites

### 1. Node.js Installation
- **Download**: Visit [nodejs.org](https://nodejs.org/)
- **Version**: Install Node.js 18.x or higher (LTS recommended)
- **Verify Installation**: 
  ```bash
  node --version
  npm --version
  ```

### 2. Database Setup
- **PostgreSQL**: Install PostgreSQL 15 or higher
- **Database**: Create a database named `CreviaTube_Db`
- **User**: Create user `CreviaTube_User` with password `Gikonyo@2025!`

## 🛠️ Installation Steps

### Step 1: Install Dependencies
```bash
# Install all packages
npm install

# Install additional development dependencies if needed
npm install --save-dev @types/node @types/express
```

### Step 2: Environment Configuration
1. **Copy `.env` file** (if not exists, create one):
```bash
# Database Configuration
DATABASE_URL=postgresql://CreviaTube_User:Gikonyo%402025%21@127.0.0.1:5432/CreviaTube_Db

# Authentication
SESSION_SECRET=your-32-character-random-session-secret-here

# Payment Configuration
PESAPAL_CONSUMER_KEY=your-pesapal-consumer-key
PESAPAL_CONSUMER_SECRET=your-pesapal-consumer-secret
PESAPAL_BASE_URL=https://pay.pesapal.com/v3

# M-Pesa Configuration
MPESA_CONSUMER_KEY=your-mpesa-consumer-key
MPESA_CONSUMER_SECRET=your-mpesa-consumer-secret
MPESA_SHORTCODE=your-business-shortcode
MPESA_PASSKEY=your-passkey
MPESA_INITIATOR_NAME=your-initiator-name
MPESA_SECURITY_CREDENTIAL=your-security-credential
MPESA_BASE_URL=https://sandbox.safaricom.co.ke

# PayPal Configuration
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
PAYPAL_BASE_URL=https://api.sandbox.paypal.com

# Wise API
WISE_API_TOKEN=your-wise-api-token
WISE_PROFILE_ID=your-wise-profile-id
WISE_BASE_URL=https://api.sandbox.transferwise.tech

# Rapyd API
RAPYD_ACCESS_KEY=your-rapyd-access-key
RAPYD_SECRET_KEY=your-rapyd-secret-key
RAPYD_BASE_URL=https://sandboxapi.rapyd.net

# Application URLs
FRONTEND_URL=http://localhost:5000
BACKEND_URL=http://localhost:5000

# Environment
NODE_ENV=development

# Social Media API Keys
INSTAGRAM_APP_ID=your-instagram-app-id
INSTAGRAM_APP_SECRET=your-instagram-app-secret
YOUTUBE_API_KEY=your-youtube-api-key
TWITTER_API_KEY=your-twitter-api-key
TWITTER_API_SECRET=your-twitter-api-secret
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
```

### Step 3: Database Setup
```bash
# Push database schema
npm run db:push

# Or manually run Drizzle migrations
npx drizzle-kit push
```

### Step 4: Start Development Server
```bash
# Start both frontend and backend
npm run dev

# Or start only backend
npx tsx backend/index.ts

# Or start only frontend
npm run build
npx vite preview
```

## 🐳 Alternative: Docker Setup

If you prefer using Docker:

### 1. Install Docker Desktop
- Download from [docker.com](https://docker.com/)

### 2. Run with Docker Compose
```bash
# Build and start all services
docker-compose up --build

# Run in background
docker-compose up -d

# Stop services
docker-compose down
```

## 🔧 Troubleshooting

### Node.js Not Found
```bash
# Restart PowerShell/Command Prompt
# Or add Node.js to PATH manually:
# C:\Program Files\nodejs\

# Verify installation
node --version
npm --version
```

### Database Connection Issues
```bash
# Check PostgreSQL service
# Windows: services.msc -> PostgreSQL
# Or restart service:
net stop postgresql
net start postgresql

# Test connection
psql -h localhost -U CreviaTube_User -d CreviaTube_Db
```

### Port Already in Use
```bash
# Check what's using port 5000
netstat -ano | findstr :5000

# Kill process
taskkill /PID <process_id> /F
```

### Missing Dependencies
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📱 Testing the Application

### 1. Backend API Testing
```bash
# Test server health
curl http://localhost:5000/api/health

# Test authentication
curl http://localhost:5000/api/user
```

### 2. Frontend Testing
- Open browser: `http://localhost:5000`
- Test different user types:
  - Trader Creator
  - Social Influencer
  - Business Entrepreneur
  - Enterprise Client
  - Clipper

### 3. API Endpoints Testing
Use tools like Postman or curl to test:
- `/api/users/profile`
- `/api/campaigns`
- `/api/trader-creators/dashboard`
- `/api/influencers/dashboard`
- `/api/entrepreneurs/dashboard`
- `/api/analytics/overview`

## 🚀 Production Deployment

### 1. Build for Production
```bash
npm run build
```

### 2. Start Production Server
```bash
npm start
```

### 3. Environment Variables
Make sure to update all environment variables for production:
- Use production database URLs
- Set proper API keys
- Configure SSL certificates
- Set up proper CORS origins

## 📊 Monitoring & Logs

### 1. Application Logs
```bash
# View logs
tail -f logs/app.log

# Or check console output
npm run dev
```

### 2. Database Logs
```bash
# PostgreSQL logs
tail -f /var/log/postgresql/postgresql-*.log
```

### 3. Performance Monitoring
- Monitor API response times
- Check database query performance
- Monitor memory usage
- Track error rates

## 🔒 Security Checklist

- [ ] Environment variables properly configured
- [ ] Database credentials secured
- [ ] API keys not exposed in code
- [ ] CORS properly configured
- [ ] Rate limiting implemented
- [ ] Input validation in place
- [ ] Authentication middleware working
- [ ] HTTPS enabled for production

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review application logs
3. Verify all prerequisites are installed
4. Ensure database is running and accessible
5. Check firewall settings

---

**Happy Coding! 🎉**
