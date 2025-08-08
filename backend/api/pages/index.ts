import { Router } from "express";

const router = Router();

// Help Center page
router.get("/help-center", async (req, res) => {
  try {
    res.json({
      page: "help-center",
      title: "Help Center",
      content: {
        sections: [
          {
            title: "Getting Started",
            articles: [
              { title: "How to Create Your First Campaign", slug: "create-first-campaign" },
              { title: "Setting Up Your Creator Profile", slug: "setup-creator-profile" },
              { title: "Understanding Goal Completion", slug: "understanding-goals" },
              { title: "Payment Methods & Payouts", slug: "payment-methods" }
            ]
          },
          {
            title: "For Creators",
            articles: [
              { title: "Campaign Management Guide", slug: "campaign-management" },
              { title: "Analytics & Tracking", slug: "analytics-tracking" },
              { title: "Budget & Escrow System", slug: "budget-escrow" },
              { title: "White-Label Enterprise Features", slug: "enterprise-features" }
            ]
          },
          {
            title: "For Clippers",
            articles: [
              { title: "Finding the Right Campaigns", slug: "finding-campaigns" },
              { title: "Creating Quality Content", slug: "quality-content" },
              { title: "Tracking Links & Performance", slug: "tracking-performance" },
              { title: "Getting Paid Fast", slug: "getting-paid" }
            ]
          },
          {
            title: "Technical Support",
            articles: [
              { title: "API Documentation", slug: "api-docs" },
              { title: "Integration Setup", slug: "integration-setup" },
              { title: "Troubleshooting Common Issues", slug: "troubleshooting" },
              { title: "Platform Status & Updates", slug: "platform-status" }
            ]
          }
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
            type: "Full-time"
          },
          {
            title: "Product Marketing Manager",
            department: "Marketing",
            location: "Remote", 
            type: "Full-time"
          },
          {
            title: "Creator Success Manager",
            department: "Customer Success",
            location: "Remote",
            type: "Full-time"
          },
          {
            title: "DevOps Engineer",
            department: "Engineering",
            location: "Remote",
            type: "Full-time"
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
        guidelines: [
          {
            title: "Authentic Content Only",
            description: "All content must be original and created by real users. AI-generated content is detected and prohibited."
          },
          {
            title: "Respectful Communication", 
            description: "Treat all community members with respect. Harassment, discrimination, or abusive behavior will not be tolerated."
          },
          {
            title: "Accurate Information",
            description: "Provide truthful information in campaigns and content. Misleading or false claims are strictly prohibited."
          },
          {
            title: "Legal Compliance",
            description: "All activities must comply with applicable laws and regulations in your jurisdiction."
          },
          {
            title: "No Spam or Manipulation",
            description: "Avoid spam, artificial engagement, or attempts to manipulate platform metrics."
          },
          {
            title: "Privacy Respect",
            description: "Respect the privacy of others and handle personal information responsibly."
          }
        ],
        enforcement: "Violations may result in warnings, content removal, account suspension, or permanent bans depending on severity."
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
        upcoming: [
          {
            title: "Creator Economy Summit 2025",
            date: "March 15-17, 2025",
            location: "Virtual Event",
            description: "Join industry leaders discussing the future of creator monetization",
            type: "conference"
          },
          {
            title: "Monthly Creator Meetup",
            date: "February 20, 2025", 
            location: "Discord Community",
            description: "Monthly networking and knowledge sharing session",
            type: "meetup"
          },
          {
            title: "Platform Update Webinar",
            date: "February 10, 2025",
            location: "Zoom",
            description: "Learn about new features and platform improvements",
            type: "webinar"
          }
        ],
        past: [
          {
            title: "CreoCash Launch Event",
            date: "January 5, 2025",
            description: "Official platform launch celebration",
            highlights: ["500+ attendees", "Platform demo", "Creator success stories"]
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