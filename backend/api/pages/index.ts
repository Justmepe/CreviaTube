import { Router } from "express";

const router = Router();

// Help Center page
router.get("/help-center", async (req, res) => {
  try {
    res.json({
      page: "help-center",
      title: "Help Center",
      content: {
        intro: "Find answers to common questions and learn how to make the most of CreoCash. Our comprehensive help center covers everything from getting started to advanced features.",
        sections: [
          {
            title: "Getting Started",
            description: "Essential guides for new users joining the CreoCash platform",
            articles: [
              { title: "How to Create Your First Campaign", slug: "create-first-campaign", description: "Step-by-step guide to launching your first successful campaign" },
              { title: "Setting Up Your Creator Profile", slug: "setup-creator-profile", description: "Optimize your profile to attract the best clippers and maximize results" },
              { title: "Understanding Goal Completion", slug: "understanding-goals", description: "Learn how our automated goal completion system works and ensures fair payouts" },
              { title: "Payment Methods & Payouts", slug: "payment-methods", description: "Complete guide to payment options, payout schedules, and global money transfers" }
            ]
          },
          {
            title: "For Creators",
            description: "Advanced guides for creators looking to scale their campaigns",
            articles: [
              { title: "Campaign Management Guide", slug: "campaign-management", description: "Master campaign creation, optimization, and performance monitoring" },
              { title: "Analytics & Tracking", slug: "analytics-tracking", description: "Deep dive into analytics tools and performance tracking features" },
              { title: "Budget & Escrow System", slug: "budget-escrow", description: "Understand budget allocation, escrow protection, and automated payouts" },
              { title: "White-Label Enterprise Features", slug: "enterprise-features", description: "Explore enterprise-level features and custom branding options" }
            ]
          },
          {
            title: "For Clippers",
            description: "Resources to help clippers succeed and maximize their earnings",
            articles: [
              { title: "Finding the Right Campaigns", slug: "finding-campaigns", description: "Tips for discovering campaigns that match your audience and content style" },
              { title: "Creating Quality Content", slug: "quality-content", description: "Best practices for creating engaging content that converts" },
              { title: "Tracking Links & Performance", slug: "tracking-performance", description: "Monitor your performance with detailed analytics and optimization tips" },
              { title: "Getting Paid Fast", slug: "getting-paid", description: "Understanding payout triggers, payment schedules, and earning optimization" }
            ]
          },
          {
            title: "Technical Support",
            description: "Technical documentation and troubleshooting resources",
            articles: [
              { title: "API Documentation", slug: "api-docs", description: "Complete API reference for developers and technical integrations" },
              { title: "Integration Setup", slug: "integration-setup", description: "Connect with social media platforms, analytics tools, and payment systems" },
              { title: "Troubleshooting Common Issues", slug: "troubleshooting", description: "Solutions to frequently encountered problems and error messages" },
              { title: "Platform Status & Updates", slug: "platform-status", description: "Real-time platform status, maintenance schedules, and update notifications" }
            ]
          }
        ],
        popularArticles: [
          { title: "How to Create Your First Campaign", views: "15,248", category: "Getting Started" },
          { title: "Understanding Goal Completion", views: "12,891", category: "Getting Started" },
          { title: "Payment Methods & Payouts", views: "11,456", category: "Getting Started" },
          { title: "Campaign Management Guide", views: "9,823", category: "For Creators" },
          { title: "Creating Quality Content", views: "8,745", category: "For Clippers" }
        ]
      }
    });
  } catch (error) {
    console.error("Help Center error:", error);
    res.status(500).json({ message: "Failed to load help center" });
  }
});

// Privacy Policy page
router.get("/privacy-policy", async (req, res) => {
  try {
    res.json({
      page: "privacy-policy",
      title: "Privacy Policy",
      lastUpdated: "January 2025",
      content: {
        intro: "At CreoCash, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, and safeguard your data.",
        sections: [
          {
            title: "Information We Collect",
            content: "We collect information you provide directly, usage data, and technical information to improve our services."
          },
          {
            title: "How We Use Your Information", 
            content: "Your information is used to provide our services, process payments, communicate with you, and improve our platform."
          },
          {
            title: "Data Security",
            content: "We implement industry-standard security measures to protect your personal and financial information."
          },
          {
            title: "Your Rights",
            content: "You have the right to access, update, delete, or export your personal data at any time."
          }
        ]
      }
    });
  } catch (error) {
    console.error("Privacy Policy error:", error);
    res.status(500).json({ message: "Failed to load privacy policy" });
  }
});

// Terms of Service page
router.get("/terms-of-service", async (req, res) => {
  try {
    res.json({
      page: "terms-of-service",
      title: "Terms of Service",
      lastUpdated: "January 2025",
      content: {
        intro: "These Terms of Service govern your use of the CreoCash platform. By using our services, you agree to these terms.",
        sections: [
          {
            title: "Platform Usage",
            content: "You must use CreoCash in compliance with all applicable laws and our community guidelines."
          },
          {
            title: "Creator Responsibilities",
            content: "Creators must ensure campaign content is accurate, legal, and complies with platform policies."
          },
          {
            title: "Clipper Guidelines",
            content: "Clippers must create authentic, original content and comply with tracking requirements."
          },
          {
            title: "Payment Terms",
            content: "All payments are processed through our secure escrow system with automated goal completion."
          },
          {
            title: "Intellectual Property",
            content: "You retain ownership of your content while granting CreoCash necessary licenses to operate the platform."
          }
        ]
      }
    });
  } catch (error) {
    console.error("Terms of Service error:", error);
    res.status(500).json({ message: "Failed to load terms of service" });
  }
});

// Platform Status page
router.get("/status", async (req, res) => {
  try {
    res.json({
      page: "status",
      title: "Platform Status",
      currentStatus: "operational",
      lastUpdated: new Date().toISOString(),
      services: [
        { name: "API Services", status: "operational", uptime: "99.9%" },
        { name: "Payment Processing", status: "operational", uptime: "99.8%" },
        { name: "Analytics Dashboard", status: "operational", uptime: "99.9%" },
        { name: "Campaign Management", status: "operational", uptime: "99.7%" },
        { name: "Mobile App", status: "operational", uptime: "99.6%" },
        { name: "Third-party Integrations", status: "operational", uptime: "99.5%" }
      ],
      recentIncidents: [
        {
          date: "2025-01-08",
          title: "Scheduled Maintenance",
          status: "resolved",
          description: "Routine database optimization completed successfully"
        }
      ]
    });
  } catch (error) {
    console.error("Status page error:", error);
    res.status(500).json({ message: "Failed to load status information" });
  }
});

// About Us page
router.get("/about-us", async (req, res) => {
  try {
    res.json({
      page: "about-us",
      title: "About CreoCash",
      content: {
        mission: "Empowering the global creator economy through innovative affiliate marketing technology.",
        story: "CreoCash was founded to bridge the gap between content creators and their monetization potential. We believe every creator deserves transparent, automated, and fair compensation for their work.",
        values: [
          { title: "Transparency", description: "Clear tracking, honest reporting, and open communication" },
          { title: "Innovation", description: "Cutting-edge technology that adapts to creator needs" },
          { title: "Global Reach", description: "Supporting creators and businesses worldwide" },
          { title: "Fair Compensation", description: "Ensuring creators are paid what they deserve, when they deserve it" }
        ],
        stats: [
          { label: "Active Creators", value: "50,000+" },
          { label: "Total Payouts", value: "$2M+" },
          { label: "Countries Supported", value: "180+" },
          { label: "Platform Uptime", value: "99.9%" }
        ]
      }
    });
  } catch (error) {
    console.error("About Us error:", error);
    res.status(500).json({ message: "Failed to load about information" });
  }
});

// Contact page
router.get("/contact", async (req, res) => {
  try {
    res.json({
      page: "contact",
      title: "Contact Us",
      content: {
        support: {
          title: "Customer Support",
          email: "support@creocash.com",
          hours: "24/7 Global Support",
          response: "Average response time: 2-4 hours"
        },
        business: {
          title: "Business Inquiries",
          email: "business@creocash.com",
          description: "Partnership opportunities, enterprise solutions, and white-label services"
        },
        press: {
          title: "Press & Media",
          email: "press@creocash.com",
          description: "Media inquiries, press releases, and interview requests"
        },
        technical: {
          title: "Technical Support",
          email: "tech@creocash.com",
          description: "API integration, technical issues, and developer support"
        }
      }
    });
  } catch (error) {
    console.error("Contact page error:", error);
    res.status(500).json({ message: "Failed to load contact information" });
  }
});

// Careers page
router.get("/careers", async (req, res) => {
  try {
    res.json({
      page: "careers",
      title: "Careers at CreoCash",
      content: {
        intro: "Join our mission to revolutionize the creator economy. We're building the future of affiliate marketing.",
        benefits: [
          {
            title: "Work-Life Balance",
            description: "Flexible schedules, unlimited PTO, and remote-first culture that values your wellbeing."
          },
          {
            title: "Growth & Learning",
            description: "Annual learning budget, mentorship programs, and opportunities to work with cutting-edge technology."
          },
          {
            title: "Competitive Package",
            description: "Market-leading salaries, equity participation, comprehensive health benefits, and performance bonuses."
          }
        ],
        culture: [
          "Remote-first global team",
          "Innovation-driven environment", 
          "Competitive compensation with equity",
          "Flexible work arrangements",
          "Professional development opportunities"
        ],
        openPositions: [
          {
            title: "Senior Frontend Developer",
            department: "Engineering",
            location: "Remote",
            type: "Full-time",
            description: "Lead our frontend development using React, TypeScript, and modern web technologies. Help build intuitive user experiences for creators and clippers worldwide.",
            skills: ["React", "TypeScript", "Next.js", "Tailwind CSS", "GraphQL"]
          },
          {
            title: "Product Marketing Manager",
            department: "Marketing",
            location: "Remote", 
            type: "Full-time",
            description: "Drive product positioning, go-to-market strategies, and user acquisition for our affiliate marketing platform.",
            skills: ["Product Marketing", "Growth Hacking", "Analytics", "Content Strategy", "B2B SaaS"]
          },
          {
            title: "Creator Success Manager",
            department: "Customer Success",
            location: "Remote",
            type: "Full-time",
            description: "Help creators maximize their earnings and build successful campaigns on our platform. Be the voice of our creator community.",
            skills: ["Customer Success", "Creator Economy", "Data Analysis", "Communication", "Project Management"]
          },
          {
            title: "DevOps Engineer",
            department: "Engineering",
            location: "Remote",
            type: "Full-time",
            description: "Build and maintain our cloud infrastructure, CI/CD pipelines, and ensure 99.9% uptime for our global platform.",
            skills: ["AWS", "Docker", "Kubernetes", "CI/CD", "Monitoring", "Security"]
          }
        ],
        hiringProcess: [
          {
            title: "Application Review",
            description: "We review your application and portfolio within 2-3 business days."
          },
          {
            title: "Initial Interview",
            description: "30-minute call with our hiring team to discuss your background and interests."
          },
          {
            title: "Technical Assessment",
            description: "Role-specific technical challenge or case study (1-2 hours)."
          },
          {
            title: "Final Interview",
            description: "Meet with team members and leadership to ensure cultural fit and alignment."
          }
        ]
      }
    });
  } catch (error) {
    console.error("Careers page error:", error);
    res.status(500).json({ message: "Failed to load careers information" });
  }
});

// Community Guidelines page
router.get("/community-guidelines", async (req, res) => {
  try {
    res.json({
      page: "community-guidelines",
      title: "Community Guidelines",
      content: {
        intro: "Our community guidelines ensure CreoCash remains a safe, respectful, and productive environment for all users.",
        values: [
          {
            title: "Authenticity First",
            description: "We believe in genuine creativity and original content that drives real engagement and results."
          },
          {
            title: "Mutual Respect",
            description: "Every member of our community deserves to be treated with dignity and respect, regardless of background."
          },
          {
            title: "Transparency",
            description: "Honest communication and clear expectations foster trust and long-term partnerships."
          },
          {
            title: "Continuous Learning",
            description: "We encourage sharing knowledge, asking questions, and helping others grow in the creator economy."
          }
        ],
        sections: [
          {
            title: "Content Standards",
            rules: [
              {
                title: "Original Content Only",
                description: "All content must be authentic and created by real users. AI-generated content is detected and prohibited."
              },
              {
                title: "Accurate Information",
                description: "Provide truthful information in campaigns and content. Misleading or false claims are strictly prohibited."
              },
              {
                title: "Quality Standards",
                description: "Maintain high-quality content that provides value to audiences and represents brands professionally."
              }
            ]
          },
          {
            title: "Community Behavior",
            rules: [
              {
                title: "Respectful Communication",
                description: "Treat all community members with respect. Harassment, discrimination, or abusive behavior will not be tolerated."
              },
              {
                title: "Collaborative Spirit",
                description: "Support fellow creators and clippers. Share knowledge and celebrate each other's successes."
              },
              {
                title: "Professional Conduct",
                description: "Maintain professionalism in all interactions, especially when representing brands or campaigns."
              }
            ]
          },
          {
            title: "Platform Integrity",
            rules: [
              {
                title: "No Spam or Manipulation",
                description: "Avoid spam, artificial engagement, or attempts to manipulate platform metrics or algorithms."
              },
              {
                title: "Legal Compliance",
                description: "All activities must comply with applicable laws and regulations in your jurisdiction."
              },
              {
                title: "Privacy Protection",
                description: "Respect the privacy of others and handle personal information responsibly and securely."
              }
            ]
          }
        ],
        prohibited: [
          "Spam, bot activity, or artificial engagement",
          "Harassment, hate speech, or discriminatory content",
          "Fraudulent claims or misleading information",
          "Copyright infringement or unauthorized content use",
          "Adult content, violence, or illegal activities",
          "Sharing personal information without consent",
          "Attempting to circumvent platform security measures"
        ],
        enforcement: {
          intro: "We take violations seriously and enforce these guidelines consistently to maintain a safe environment for all users.",
          actions: [
            {
              violation: "Minor Violations (first offense)",
              consequence: "Warning and educational resources provided to help understand community standards."
            },
            {
              violation: "Moderate Violations",
              consequence: "Temporary restrictions on account features or content removal with appeal process available."
            },
            {
              violation: "Serious Violations",
              consequence: "Account suspension for 7-30 days depending on severity, with required acknowledgment of guidelines."
            },
            {
              violation: "Severe or Repeated Violations",
              consequence: "Permanent account termination with no reinstatement option for protecting community safety."
            }
          ]
        }
      }
    });
  } catch (error) {
    console.error("Community Guidelines error:", error);
    res.status(500).json({ message: "Failed to load community guidelines" });
  }
});

// Events page
router.get("/events", async (req, res) => {
  try {
    res.json({
      page: "events",
      title: "CreoCash Events",
      content: {
        upcomingEvents: [
          {
            title: "Creator Economy Summit 2025",
            date: "March 15-17, 2025",
            time: "9:00 AM - 5:00 PM PST",
            location: "Virtual Event Platform",
            description: "Join industry leaders, successful creators, and platform innovators discussing the future of creator monetization, affiliate marketing trends, and emerging opportunities.",
            type: "conference",
            attendees: "2,500+",
            topics: ["Creator Monetization", "Affiliate Marketing", "Platform Innovation", "Global Expansion"],
            registrationOpen: true
          },
          {
            title: "Monthly Creator Meetup",
            date: "February 20, 2025", 
            time: "6:00 PM - 8:00 PM EST",
            location: "Discord Community Hub",
            description: "Monthly networking and knowledge sharing session with Q&A, success story presentations, and collaborative workshops.",
            type: "meetup",
            attendees: "150+",
            topics: ["Networking", "Best Practices", "Success Stories", "Platform Updates"],
            registrationOpen: true
          },
          {
            title: "Platform Update Webinar",
            date: "February 10, 2025",
            time: "2:00 PM - 3:00 PM PST",
            location: "Zoom Webinar",
            description: "Learn about new features, platform improvements, enhanced analytics tools, and upcoming integrations.",
            type: "webinar",
            attendees: "500+",
            topics: ["New Features", "Analytics", "Integrations", "Roadmap"],
            registrationOpen: true
          },
          {
            title: "Clipper Success Workshop",
            date: "March 1, 2025",
            time: "11:00 AM - 1:00 PM EST",
            location: "Interactive Workshop",
            description: "Hands-on workshop for clippers to optimize content creation, improve engagement rates, and maximize earnings.",
            type: "workshop",
            attendees: "75",
            topics: ["Content Creation", "Engagement", "Earnings Optimization", "Tools & Tips"],
            registrationOpen: true
          }
        ],
        pastEvents: [
          {
            title: "CreoCash Launch Event",
            date: "January 5, 2025",
            description: "Official platform launch celebration with live demos, creator testimonials, and vision presentations.",
            type: "launch",
            attendees: "500+",
            recording: true,
            materials: true
          },
          {
            title: "Creator Onboarding Masterclass",
            date: "December 20, 2024",
            description: "Comprehensive training session for new creators joining the platform.",
            type: "masterclass",
            attendees: "300+",
            recording: true,
            materials: true
          }
        ],
        categories: [
          {
            name: "Webinars",
            description: "Educational sessions covering platform features, industry trends, and best practices."
          },
          {
            name: "Workshops",
            description: "Interactive hands-on sessions focused on skill development and practical application."
          },
          {
            name: "Community Events",
            description: "Networking opportunities, meetups, and collaborative sessions for our global community."
          }
        ]
      }
    });
  } catch (error) {
    console.error("Events page error:", error);
    res.status(500).json({ message: "Failed to load events information" });
  }
});

// Community links (Discord and WhatsApp)
router.get("/discord", async (req, res) => {
  try {
    res.json({
      page: "discord-redirect",
      title: "Join Our Discord Community",
      redirectUrl: "https://discord.gg/creocash",
      message: "Redirecting you to our Discord community..."
    });
  } catch (error) {
    console.error("Discord redirect error:", error);
    res.status(500).json({ message: "Failed to redirect to Discord" });
  }
});

router.get("/whatsapp", async (req, res) => {
  try {
    res.json({
      page: "whatsapp-redirect", 
      title: "Join Our WhatsApp Community",
      redirectUrl: "https://chat.whatsapp.com/creocash",
      message: "Redirecting you to our WhatsApp community..."
    });
  } catch (error) {
    console.error("WhatsApp redirect error:", error);
    res.status(500).json({ message: "Failed to redirect to WhatsApp" });
  }
});

export { router as pagesAPI };