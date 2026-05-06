-- Migration: Create tables for replacing mock data with real database data
-- Date: 2025-01-15
-- Description: This migration creates tables to store platform configuration, static pages, and analytics data

-- Geographic data table for analytics
CREATE TABLE IF NOT EXISTS geographic_data (
    id TEXT PRIMARY KEY,
    country TEXT NOT NULL,
    region TEXT,
    city TEXT,
    users INTEGER NOT NULL DEFAULT 0,
    campaigns INTEGER NOT NULL DEFAULT 0,
    revenue INTEGER NOT NULL DEFAULT 0,
    impressions INTEGER NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    conversions INTEGER NOT NULL DEFAULT 0,
    period TEXT NOT NULL,
    date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Industry benchmarks table
CREATE TABLE IF NOT EXISTS industry_benchmarks (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    metric TEXT NOT NULL,
    value REAL NOT NULL,
    unit TEXT,
    source TEXT,
    period TEXT NOT NULL,
    date TIMESTAMP NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Platform features table
CREATE TABLE IF NOT EXISTS platform_features (
    id TEXT PRIMARY KEY,
    icon TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Supported platforms table
CREATE TABLE IF NOT EXISTS supported_platforms (
    id TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    label TEXT NOT NULL,
    category TEXT NOT NULL,
    icon TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Supported countries table
CREATE TABLE IF NOT EXISTS supported_countries (
    id TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    label TEXT NOT NULL,
    region TEXT,
    currency TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Supported languages table
CREATE TABLE IF NOT EXISTS supported_languages (
    id TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    label TEXT NOT NULL,
    native_name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Static pages content table
CREATE TABLE IF NOT EXISTS static_pages (
    id TEXT PRIMARY KEY,
    page TEXT NOT NULL,
    title TEXT NOT NULL,
    content JSONB NOT NULL,
    last_updated TIMESTAMP DEFAULT NOW() NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Platform events table
CREATE TABLE IF NOT EXISTS platform_events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    date TIMESTAMP NOT NULL,
    time TEXT,
    location TEXT,
    type TEXT NOT NULL,
    attendees TEXT,
    topics JSONB,
    registration_open BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Contact information table
CREATE TABLE IF NOT EXISTS contact_info (
    id TEXT PRIMARY KEY,
    department TEXT NOT NULL,
    title TEXT NOT NULL,
    email TEXT NOT NULL,
    description TEXT,
    hours TEXT,
    response TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Career positions table
CREATE TABLE IF NOT EXISTS career_positions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    department TEXT NOT NULL,
    location TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    skills JSONB,
    is_active BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Community guidelines table
CREATE TABLE IF NOT EXISTS community_guidelines (
    id TEXT PRIMARY KEY,
    section TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    rules JSONB,
    is_active BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_geographic_data_period_date ON geographic_data(period, date);
CREATE INDEX IF NOT EXISTS idx_industry_benchmarks_category_period ON industry_benchmarks(category, period);
CREATE INDEX IF NOT EXISTS idx_platform_features_category_active ON platform_features(category, is_active);
CREATE INDEX IF NOT EXISTS idx_supported_platforms_category_active ON supported_platforms(category, is_active);
CREATE INDEX IF NOT EXISTS idx_supported_countries_region_active ON supported_countries(region, is_active);
CREATE INDEX IF NOT EXISTS idx_supported_languages_active ON supported_languages(is_active);
CREATE INDEX IF NOT EXISTS idx_static_pages_page_active ON static_pages(page, is_active);
CREATE INDEX IF NOT EXISTS idx_platform_events_date_active ON platform_events(date, is_active);
CREATE INDEX IF NOT EXISTS idx_contact_info_department_active ON contact_info(department, is_active);
CREATE INDEX IF NOT EXISTS idx_career_positions_department_active ON career_positions(department, is_active);
CREATE INDEX IF NOT EXISTS idx_community_guidelines_section_active ON community_guidelines(section, is_active);

-- Insert some initial data for testing
INSERT INTO platform_features (id, icon, title, description, category, "order") VALUES
('feature-1', 'TrendingUp', 'Global Creator Network', 'Connect with 10,000+ creators worldwide across trading, social media, and business sectors', 'core', 1),
('feature-2', 'DollarSign', 'Automated Escrow System', 'Secure payments with automatic goal completion and instant payouts via M-Pesa, PayPal & more', 'core', 2),
('feature-3', 'Shield', 'AI-Powered Content Protection', 'Advanced bot detection and AI content filtering ensures authentic user-generated content only', 'core', 3),
('feature-4', 'Globe', 'Multi-Platform Integration', 'Track performance across Instagram, TikTok, YouTube, Twitter, and 25+ trading brokers', 'core', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO supported_platforms (id, value, label, category, "order") VALUES
('platform-1', 'instagram', 'Instagram', 'social', 1),
('platform-2', 'tiktok', 'TikTok', 'social', 2),
('platform-3', 'youtube', 'YouTube', 'social', 3),
('platform-4', 'twitter', 'Twitter/X', 'social', 4),
('platform-5', 'facebook', 'Facebook', 'social', 5),
('platform-6', 'linkedin', 'LinkedIn', 'professional', 6),
('platform-7', 'telegram', 'Telegram', 'messaging', 7),
('platform-8', 'discord', 'Discord', 'messaging', 8),
('platform-9', 'website', 'Website/Blog', 'web', 9),
('platform-10', 'email', 'Email Marketing', 'web', 10)
ON CONFLICT (id) DO NOTHING;

INSERT INTO supported_countries (id, value, label, region, currency, "order") VALUES
('country-1', 'US', 'United States', 'North America', 'USD', 1),
('country-2', 'CA', 'Canada', 'North America', 'CAD', 2),
('country-3', 'GB', 'United Kingdom', 'Europe', 'GBP', 3),
('country-4', 'AU', 'Australia', 'Oceania', 'AUD', 4),
('country-5', 'DE', 'Germany', 'Europe', 'EUR', 5),
('country-6', 'FR', 'France', 'Europe', 'EUR', 6),
('country-7', 'JP', 'Japan', 'Asia', 'JPY', 7),
('country-8', 'KR', 'South Korea', 'Asia', 'KRW', 8),
('country-9', 'CN', 'China', 'Asia', 'CNY', 9),
('country-10', 'IN', 'India', 'Asia', 'INR', 10),
('country-11', 'BR', 'Brazil', 'South America', 'BRL', 11),
('country-12', 'MX', 'Mexico', 'North America', 'MXN', 12),
('country-13', 'AR', 'Argentina', 'South America', 'ARS', 13),
('country-14', 'CL', 'Chile', 'South America', 'CLP', 14),
('country-15', 'ZA', 'South Africa', 'Africa', 'ZAR', 15),
('country-16', 'KE', 'Kenya', 'Africa', 'KES', 16),
('country-17', 'NG', 'Nigeria', 'Africa', 'NGN', 17),
('country-18', 'EG', 'Egypt', 'Africa', 'EGP', 18),
('country-19', 'AE', 'UAE', 'Middle East', 'AED', 19),
('country-20', 'SG', 'Singapore', 'Asia', 'SGD', 20)
ON CONFLICT (id) DO NOTHING;

INSERT INTO supported_languages (id, value, label, native_name, "order") VALUES
('lang-1', 'en', 'English', 'English', 1),
('lang-2', 'es', 'Spanish', 'Español', 2),
('lang-3', 'fr', 'French', 'Français', 3),
('lang-4', 'de', 'German', 'Deutsch', 4),
('lang-5', 'it', 'Italian', 'Italiano', 5),
('lang-6', 'pt', 'Portuguese', 'Português', 6),
('lang-7', 'ru', 'Russian', 'Русский', 7),
('lang-8', 'zh', 'Chinese', '中文', 8),
('lang-9', 'ja', 'Japanese', '日本語', 9),
('lang-10', 'ko', 'Korean', '한국어', 10),
('lang-11', 'ar', 'Arabic', 'العربية', 11),
('lang-12', 'hi', 'Hindi', 'हिन्दी', 12),
('lang-13', 'sw', 'Swahili', 'Kiswahili', 13),
('lang-14', 'af', 'Afrikaans', 'Afrikaans', 14)
ON CONFLICT (id) DO NOTHING;

-- Insert sample contact information
INSERT INTO contact_info (id, department, title, email, description, hours, response, "order") VALUES
('contact-1', 'support', 'Customer Support', 'support@creviatube.com', 'Get help with your account and platform usage', '24/7 Global Support', 'Average response time: 2-4 hours', 1),
('contact-2', 'business', 'Business Inquiries', 'business@creviatube.com', 'Partnership opportunities, enterprise solutions, and white-label services', 'Business Hours', 'Response within 24 hours', 2),
('contact-3', 'press', 'Press & Media', 'press@creviatube.com', 'Media inquiries, press releases, and interview requests', 'Business Hours', 'Response within 48 hours', 3),
('contact-4', 'technical', 'Technical Support', 'tech@creviatube.com', 'API integration, technical issues, and developer support', '24/7 Technical Support', 'Response within 4-8 hours', 4)
ON CONFLICT (id) DO NOTHING;

-- Insert sample career positions
INSERT INTO career_positions (id, title, department, location, type, description, skills, "order") VALUES
('career-1', 'Senior Frontend Developer', 'Engineering', 'Remote', 'Full-time', 'Lead our frontend development using React, TypeScript, and modern web technologies. Help build intuitive user experiences for creators and clippers worldwide.', '["React", "TypeScript", "Next.js", "Tailwind CSS", "GraphQL"]', 1),
('career-2', 'Product Marketing Manager', 'Marketing', 'Remote', 'Full-time', 'Drive product positioning, go-to-market strategies, and user acquisition for our affiliate marketing platform.', '["Product Marketing", "Growth Hacking", "Analytics", "Content Strategy", "B2B SaaS"]', 2),
('career-3', 'Creator Success Manager', 'Customer Success', 'Remote', 'Full-time', 'Help creators maximize their earnings and build successful campaigns on our platform. Be the voice of our creator community.', '["Customer Success", "Creator Economy", "Data Analysis", "Communication", "Project Management"]', 3),
('career-4', 'DevOps Engineer', 'Engineering', 'Remote', 'Full-time', 'Build and maintain our cloud infrastructure, CI/CD pipelines, and ensure 99.9% uptime for our global platform.', '["AWS", "Docker", "Kubernetes", "CI/CD", "Monitoring", "Security"]', 4)
ON CONFLICT (id) DO NOTHING;

-- Insert sample community guidelines
INSERT INTO community_guidelines (id, section, title, description, rules, "order") VALUES
('guideline-1', 'content_standards', 'Content Standards', 'Guidelines for creating authentic and valuable content', '[
  {"title": "Original Content Only", "description": "All content must be authentic and created by real users. AI-generated content is detected and prohibited."},
  {"title": "Accurate Information", "description": "Provide truthful information in campaigns and content. Misleading or false claims are strictly prohibited."},
  {"title": "Quality Standards", "description": "Maintain high-quality content that provides value to audiences and represents brands professionally."}
]', 1),
('guideline-2', 'community_behavior', 'Community Behavior', 'Guidelines for respectful and professional interactions', '[
  {"title": "Respectful Communication", "description": "Treat all community members with respect. Harassment, discrimination, or abusive behavior will not be tolerated."},
  {"title": "Collaborative Spirit", "description": "Support fellow creators and clippers. Share knowledge and celebrate each other''s successes."},
  {"title": "Professional Conduct", "description": "Maintain professionalism in all interactions, especially when representing brands or campaigns."}
]', 2),
('guideline-3', 'platform_integrity', 'Platform Integrity', 'Guidelines for maintaining platform security and compliance', '[
  {"title": "No Spam or Manipulation", "description": "Avoid spam, artificial engagement, or attempts to manipulate platform metrics or algorithms."},
  {"title": "Legal Compliance", "description": "All activities must comply with applicable laws and regulations in your jurisdiction."},
  {"title": "Privacy Protection", "description": "Respect the privacy of others and handle personal information responsibly and securely."}
]', 3)
ON CONFLICT (id) DO NOTHING;

-- Insert sample industry benchmarks
INSERT INTO industry_benchmarks (id, category, metric, value, unit, source, period, date) VALUES
('benchmark-1', 'conversion_rates', 'campaignToActive', 85, 'percentage', 'industry_average', 'monthly', NOW()),
('benchmark-2', 'conversion_rates', 'applicationToApproval', 65, 'percentage', 'industry_average', 'monthly', NOW()),
('benchmark-3', 'conversion_rates', 'approvalToCompletion', 78, 'percentage', 'industry_average', 'monthly', NOW()),
('benchmark-4', 'engagement_rates', 'averageViews', 2500, 'number', 'industry_average', 'monthly', NOW()),
('benchmark-5', 'engagement_rates', 'averageClicks', 180, 'number', 'industry_average', 'monthly', NOW()),
('benchmark-6', 'engagement_rates', 'averageSignups', 45, 'number', 'industry_average', 'monthly', NOW()),
('benchmark-7', 'revenue_metrics', 'averageCampaignBudget', 500, 'currency', 'industry_average', 'monthly', NOW()),
('benchmark-8', 'revenue_metrics', 'averagePayoutPerClipper', 75, 'currency', 'industry_average', 'monthly', NOW()),
('benchmark-9', 'revenue_metrics', 'platformFeeRate', 20, 'percentage', 'industry_average', 'monthly', NOW()),
('benchmark-10', 'user_retention', 'creatorRetention', 72, 'percentage', 'industry_average', 'monthly', NOW()),
('benchmark-11', 'user_retention', 'clipperRetention', 68, 'percentage', 'industry_average', 'monthly', NOW()),
('benchmark-12', 'user_retention', 'enterpriseRetention', 85, 'percentage', 'industry_average', 'monthly', NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert sample geographic data
INSERT INTO geographic_data (id, country, region, users, campaigns, revenue, period, date) VALUES
('geo-1', 'Kenya', 'Africa', 150, 45, 25000, 'monthly', NOW()),
('geo-2', 'Nigeria', 'Africa', 89, 23, 18000, 'monthly', NOW()),
('geo-3', 'South Africa', 'Africa', 67, 18, 12000, 'monthly', NOW()),
('geo-4', 'Ghana', 'Africa', 43, 12, 8000, 'monthly', NOW()),
('geo-5', 'Uganda', 'Africa', 38, 10, 6000, 'monthly', NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert sample platform events
INSERT INTO platform_events (id, title, description, date, time, location, type, attendees, topics, registration_open) VALUES
('event-1', 'Creator Economy Summit 2025', 'Join industry leaders, successful creators, and platform innovators discussing the future of creator monetization, affiliate marketing trends, and emerging opportunities.', '2025-03-15', '9:00 AM - 5:00 PM PST', 'Virtual Event Platform', 'conference', '2,500+', '["Creator Monetization", "Affiliate Marketing", "Platform Innovation", "Global Expansion"]', true),
('event-2', 'Monthly Creator Meetup', 'Monthly networking and knowledge sharing session with Q&A, success story presentations, and collaborative workshops.', '2025-02-20', '6:00 PM - 8:00 PM EST', 'Discord Community Hub', 'meetup', '150+', '["Networking", "Best Practices", "Success Stories", "Platform Updates"]', true),
('event-3', 'Platform Update Webinar', 'Learn about new features, platform improvements, enhanced analytics tools, and upcoming integrations.', '2025-02-10', '2:00 PM - 3:00 PM PST', 'Zoom Webinar', 'webinar', '500+', '["New Features", "Analytics", "Integrations", "Roadmap"]', true),
('event-4', 'Clipper Success Workshop', 'Hands-on workshop for clippers to optimize content creation, improve engagement rates, and maximize earnings.', '2025-03-01', '11:00 AM - 1:00 PM EST', 'Interactive Workshop', 'workshop', '75', '["Content Creation", "Engagement", "Earnings Optimization", "Tools & Tips"]', true)
ON CONFLICT (id) DO NOTHING;

-- Insert sample static pages
INSERT INTO static_pages (id, page, title, content, last_updated) VALUES
('page-help', 'help-center', 'Help Center', '{
  "intro": "Find answers to common questions and learn how to make the most of CreviaTube. Our comprehensive help center covers everything from getting started to advanced features.",
  "sections": [
    {
      "title": "Getting Started",
      "description": "Essential guides for new users joining the CreviaTube platform",
      "articles": [
        {"title": "How to Create Your First Campaign", "slug": "create-first-campaign", "description": "Step-by-step guide to launching your first successful campaign"},
        {"title": "Setting Up Your Creator Profile", "slug": "setup-creator-profile", "description": "Optimize your profile to attract the best clippers and maximize results"},
        {"title": "Understanding Goal Completion", "slug": "understanding-goals", "description": "Learn how our automated goal completion system works and ensures fair payouts"},
        {"title": "Payment Methods & Payouts", "slug": "payment-methods", "description": "Complete guide to payment options, payout schedules, and global money transfers"}
      ]
    }
  ],
  "popularArticles": [
    {"title": "How to Create Your First Campaign", "views": "15,248", "category": "Getting Started"},
    {"title": "Understanding Goal Completion", "views": "12,891", "category": "Getting Started"},
    {"title": "Payment Methods & Payouts", "views": "11,456", "category": "Getting Started"}
  ]
}', NOW()),
('page-privacy', 'privacy-policy', 'Privacy Policy', '{
  "intro": "At CreviaTube, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, and safeguard your data.",
  "sections": [
    {"title": "Information We Collect", "content": "We collect information you provide directly, usage data, and technical information to improve our services."},
    {"title": "How We Use Your Information", "content": "Your information is used to provide our services, process payments, communicate with you, and improve our platform."},
    {"title": "Data Security", "content": "We implement industry-standard security measures to protect your personal and financial information."},
    {"title": "Your Rights", "content": "You have the right to access, update, delete, or export your personal data at any time."}
  ]
}', NOW()),
('page-terms', 'terms-of-service', 'Terms of Service', '{
  "intro": "These Terms of Service govern your use of the CreviaTube platform. By using our services, you agree to these terms.",
  "sections": [
    {"title": "Platform Usage", "content": "You must use CreviaTube in compliance with all applicable laws and our community guidelines."},
    {"title": "Creator Responsibilities", "content": "Creators must ensure campaign content is accurate, legal, and complies with platform policies."},
    {"title": "Clipper Guidelines", "content": "Clippers must create authentic, original content and comply with tracking requirements."},
    {"title": "Payment Terms", "content": "All payments are processed through our secure escrow system with automated goal completion."},
    {"title": "Intellectual Property", "content": "You retain ownership of your content while granting CreviaTube necessary licenses to operate the platform."}
  ]
}', NOW()),
('page-status', 'status', 'Platform Status', '{
  "currentStatus": "operational",
  "services": [
    {"name": "API Services", "status": "operational", "uptime": "99.9%"},
    {"name": "Payment Processing", "status": "operational", "uptime": "99.8%"},
    {"name": "Analytics Dashboard", "status": "operational", "uptime": "99.9%"},
    {"name": "Campaign Management", "status": "operational", "uptime": "99.7%"},
    {"name": "Mobile App", "status": "operational", "uptime": "99.6%"},
    {"name": "Third-party Integrations", "status": "operational", "uptime": "99.5%"}
  ],
  "recentIncidents": [
    {
      "date": "2025-01-08",
      "title": "Scheduled Maintenance",
      "status": "resolved",
      "description": "Routine database optimization completed successfully"
    }
  ]
}', NOW()),
('page-about', 'about-us', 'About CreviaTube', '{
  "mission": "Empowering the global creator economy through innovative affiliate marketing technology.",
  "story": "CreviaTube was founded to bridge the gap between content creators and their monetization potential. We believe every creator deserves transparent, automated, and fair compensation for their work.",
  "values": [
    {"title": "Transparency", "description": "Clear tracking, honest reporting, and open communication"},
    {"title": "Innovation", "description": "Cutting-edge technology that adapts to creator needs"},
    {"title": "Global Reach", "description": "Supporting creators and businesses worldwide"},
    {"title": "Fair Compensation", "description": "Ensuring creators are paid what they deserve, when they deserve it"}
  ],
  "stats": [
    {"label": "Active Creators", "value": "50,000+"},
    {"label": "Total Payouts", "value": "$2M+"},
    {"label": "Countries Supported", "value": "180+"},
    {"label": "Platform Uptime", "value": "99.9%"}
  ]
}', NOW())
ON CONFLICT (id) DO NOTHING;

COMMIT;
