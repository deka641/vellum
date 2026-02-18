import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create demo user
  const passwordHash = await hash("password123", 12);
  const user = await prisma.user.upsert({
    where: { email: "demo@vellum.app" },
    update: {},
    create: {
      name: "Demo User",
      email: "demo@vellum.app",
      passwordHash,
    },
  });

  console.log("Created demo user:", user.email);

  // Create system templates
  const templates = [
    {
      name: "Blank",
      description: "Start from scratch with an empty page",
      category: "general",
      blocks: [],
    },
    {
      name: "Landing Page",
      description: "A complete landing page with hero, social proof, features, testimonial, and CTA",
      category: "landing",
      blocks: [
        { type: "heading", content: { text: "Ship Products Faster with Modern Tooling", level: 1 }, settings: { align: "center" } },
        { type: "text", content: { html: "<p>The all-in-one platform that helps product teams design, build, and launch websites in days instead of weeks. Trusted by 2,000+ companies worldwide.</p>" }, settings: { align: "center" } },
        { type: "button", content: { text: "Start Free Trial", url: "#", variant: "primary" }, settings: { align: "center" } },
        { type: "spacer", content: { height: 48 }, settings: {} },
        { type: "columns", content: { columns: [
          { blocks: [{ id: "lp1", type: "heading", content: { text: "2,000+", level: 2 }, settings: { align: "center" } }, { id: "lp2", type: "text", content: { html: "<p>Companies using our platform to build their web presence</p>" }, settings: { align: "center" } }] },
          { blocks: [{ id: "lp3", type: "heading", content: { text: "10M+", level: 2 }, settings: { align: "center" } }, { id: "lp4", type: "text", content: { html: "<p>Pages published and served to visitors every month</p>" }, settings: { align: "center" } }] },
          { blocks: [{ id: "lp5", type: "heading", content: { text: "99.9%", level: 2 }, settings: { align: "center" } }, { id: "lp6", type: "text", content: { html: "<p>Uptime guarantee with global CDN distribution</p>" }, settings: { align: "center" } }] },
        ] }, settings: { gap: "24px" } },
        { type: "spacer", content: { height: 48 }, settings: {} },
        { type: "heading", content: { text: "Everything You Need to Build Great Websites", level: 2 }, settings: { align: "center" } },
        { type: "columns", content: { columns: [
          { blocks: [{ id: "lp7", type: "heading", content: { text: "Visual Editor", level: 3 }, settings: { align: "center" } }, { id: "lp8", type: "text", content: { html: "<p>Drag-and-drop blocks to build pages visually. Choose from 14 block types including text, images, columns, forms, accordions, and more. No coding required.</p>" }, settings: { align: "center" } }] },
          { blocks: [{ id: "lp9", type: "heading", content: { text: "Built-in SEO", level: 3 }, settings: { align: "center" } }, { id: "lp10", type: "text", content: { html: "<p>Meta titles, Open Graph images, noindex controls, auto-generated sitemaps, and structured data. Everything you need to rank well in search results.</p>" }, settings: { align: "center" } }] },
          { blocks: [{ id: "lp11", type: "heading", content: { text: "One-Click Publish", level: 3 }, settings: { align: "center" } }, { id: "lp12", type: "text", content: { html: "<p>Preview your changes, then publish instantly or schedule for later. Version history lets you roll back any time. Your content, your control.</p>" }, settings: { align: "center" } }] },
        ] }, settings: { gap: "32px" } },
        { type: "spacer", content: { height: 48 }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "quote", content: { text: "We switched from our custom CMS to this platform and cut our page creation time by 80%. The visual editor is intuitive enough that our marketing team builds pages without developer help.", attribution: "Jamie Torres, Head of Marketing at Acme Corp", style: "bordered" }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "heading", content: { text: "Ready to Get Started?", level: 2 }, settings: { align: "center" } },
        { type: "text", content: { html: "<p>Join thousands of teams building better websites. Free 14-day trial, no credit card required.</p>" }, settings: { align: "center" } },
        { type: "button", content: { text: "Start Building for Free", url: "#", variant: "primary" }, settings: { align: "center" } },
      ],
    },
    {
      name: "Portfolio",
      description: "Showcase creative work with project descriptions, about section, and contact CTA",
      category: "portfolio",
      blocks: [
        { type: "heading", content: { text: "Alex Rivera — Designer & Developer", level: 1 }, settings: { align: "center" } },
        { type: "text", content: { html: "<p>I create digital experiences that are simple, beautiful, and built to last. Currently available for freelance projects and collaborations.</p>" }, settings: { align: "center" } },
        { type: "button", content: { text: "View My Work", url: "#projects", variant: "outline" }, settings: { align: "center" } },
        { type: "spacer", content: { height: 48 }, settings: {} },
        { type: "heading", content: { text: "Selected Projects", level: 2 }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "columns", content: { columns: [
          { blocks: [
            { id: "po1", type: "heading", content: { text: "Meridian Health App", level: 3 }, settings: {} },
            { id: "po2", type: "text", content: { html: "<p>A wellness tracking application with personalized insights, habit streaks, and social accountability features. Designed the complete UI system and interactive prototype.</p><p><strong>Role:</strong> Lead Designer<br><strong>Year:</strong> 2025<br><strong>Impact:</strong> 50K+ downloads in first month</p>" }, settings: {} },
          ] },
          { blocks: [
            { id: "po3", type: "heading", content: { text: "Novabank Rebrand", level: 3 }, settings: {} },
            { id: "po4", type: "text", content: { html: "<p>Complete brand identity overhaul for a digital-first bank. Developed a design system spanning web, mobile, print, and environmental signage across 12 branch locations.</p><p><strong>Role:</strong> Brand Designer<br><strong>Year:</strong> 2024<br><strong>Impact:</strong> 40% increase in brand recognition</p>" }, settings: {} },
          ] },
        ] }, settings: { gap: "32px" } },
        { type: "spacer", content: { height: 24 }, settings: {} },
        { type: "columns", content: { columns: [
          { blocks: [
            { id: "po5", type: "heading", content: { text: "CloudSync Dashboard", level: 3 }, settings: {} },
            { id: "po6", type: "text", content: { html: "<p>Enterprise SaaS analytics dashboard with real-time data visualization, custom report builder, and role-based access. Reduced average task completion time by 35%.</p><p><strong>Role:</strong> UX/UI Designer<br><strong>Year:</strong> 2024</p>" }, settings: {} },
          ] },
          { blocks: [
            { id: "po7", type: "heading", content: { text: "Harvest & Co E-Commerce", level: 3 }, settings: {} },
            { id: "po8", type: "text", content: { html: "<p>End-to-end e-commerce redesign for an organic food brand. Streamlined checkout flow, product discovery, and subscription management for recurring orders.</p><p><strong>Role:</strong> Full-Stack Design<br><strong>Year:</strong> 2023</p>" }, settings: {} },
          ] },
        ] }, settings: { gap: "32px" } },
        { type: "spacer", content: { height: 48 }, settings: {} },
        { type: "heading", content: { text: "About Me", level: 2 }, settings: {} },
        { type: "text", content: { html: "<p>I'm a multidisciplinary designer with 8 years of experience spanning brand identity, product design, and front-end development. I believe the best digital products emerge from close collaboration between design and engineering.</p><p>When I'm not designing, you'll find me hiking, photographing architecture, or contributing to open-source design tools.</p>" }, settings: {} },
        { type: "quote", content: { text: "Design is not just what it looks like. Design is how it works.", attribution: "Steve Jobs", style: "bordered" }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "heading", content: { text: "Let's Work Together", level: 2 }, settings: { align: "center" } },
        { type: "text", content: { html: "<p>Have a project in mind? I'd love to hear about it. Reach out and let's create something great.</p>" }, settings: { align: "center" } },
        { type: "button", content: { text: "Get in Touch", url: "#", variant: "primary" }, settings: { align: "center" } },
        { type: "social", content: { links: [{ platform: "twitter", url: "https://twitter.com" }, { platform: "github", url: "https://github.com" }, { platform: "linkedin", url: "https://linkedin.com" }] }, settings: { align: "center" } },
      ],
    },
    {
      name: "Blog Post",
      description: "A full-featured article layout with headings, quotes, code, and navigation",
      category: "blog",
      blocks: [
        { type: "heading", content: { text: "How We Reduced Our API Response Time by 60%", level: 1 }, settings: {} },
        { type: "text", content: { html: "<p><em>Published February 2026 &bull; 8 min read</em></p>" }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "toc", content: {}, settings: {} },
        { type: "text", content: { html: "<p>Performance isn't just a technical metric — it directly impacts user experience, conversion rates, and search rankings. When our median API response time crept above 400ms, we knew it was time to act. Here's how we brought it down to under 150ms.</p>" }, settings: {} },
        { type: "heading", content: { text: "Identifying the Bottlenecks", level: 2 }, settings: {} },
        { type: "text", content: { html: "<p>Before optimizing anything, we needed data. We instrumented our API layer with detailed timing breakdowns:</p><ul><li><strong>Database queries</strong> accounted for 65% of total response time</li><li><strong>JSON serialization</strong> consumed 15% on large payloads</li><li><strong>Auth middleware</strong> added 40ms per request due to redundant token validation</li><li><strong>N+1 queries</strong> in three critical endpoints were the single biggest offender</li></ul><p>The lesson: measure first, optimize second. Intuition about performance is often wrong.</p>" }, settings: {} },
        { type: "heading", content: { text: "The Fix: Three Key Changes", level: 2 }, settings: {} },
        { type: "text", content: { html: "<p>Armed with data, we focused on the three changes that would deliver the most impact:</p><p><strong>1. Query optimization.</strong> We replaced N+1 patterns with eager loading and batch queries. For our page listing endpoint alone, this reduced database calls from 47 to 3.</p><p><strong>2. Response caching.</strong> We added a lightweight cache layer for read-heavy endpoints. Cache invalidation is scoped per-resource, so writes immediately reflect while reads stay fast.</p><p><strong>3. Auth token caching.</strong> Instead of validating JWT signatures on every request, we cache validated tokens for their remaining TTL. This eliminated 40ms of overhead per request.</p>" }, settings: {} },
        { type: "code", content: { code: "<div style=\"padding: 1.5rem; background: #1e1e2e; color: #cdd6f4; border-radius: 8px; font-family: monospace; font-size: 0.9rem; line-height: 1.6;\">\n// Before: N+1 query pattern\nconst pages = await db.page.findMany({ where: { siteId } });\nfor (const page of pages) {\n  page.blocks = await db.block.findMany({ where: { pageId: page.id } });\n}\n\n// After: Single query with eager loading\nconst pages = await db.page.findMany({\n  where: { siteId },\n  include: { blocks: { orderBy: { sortOrder: 'asc' } } },\n});\n</div>", language: "html" }, settings: {} },
        { type: "quote", content: { text: "The fastest code is code that doesn't run. Before adding complexity, ask whether you can remove a step entirely.", attribution: "Engineering Principle", style: "bordered" }, settings: {} },
        { type: "heading", content: { text: "Results", level: 2 }, settings: {} },
        { type: "text", content: { html: "<p>After deploying these changes, our metrics improved dramatically:</p><ul><li>Median response time: <strong>400ms → 150ms</strong> (62% reduction)</li><li>P95 response time: <strong>1200ms → 350ms</strong> (71% reduction)</li><li>Database query count per request: <strong>12 → 3</strong> on average</li></ul><p>More importantly, user-facing metrics improved too. Time-to-interactive dropped by 300ms and our Lighthouse performance score went from 72 to 94.</p>" }, settings: {} },
        { type: "heading", content: { text: "Key Takeaways", level: 2 }, settings: {} },
        { type: "text", content: { html: "<p>If you're facing similar performance challenges, here's our advice:</p><ol><li><strong>Measure before you optimize.</strong> Add observability first.</li><li><strong>Focus on the biggest wins.</strong> The Pareto principle applies — 20% of changes drive 80% of improvement.</li><li><strong>Test in production-like conditions.</strong> Staging environments with small datasets won't reveal N+1 queries.</li><li><strong>Set performance budgets.</strong> Define acceptable thresholds and alert when they're breached.</li></ol>" }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "social", content: { links: [{ platform: "twitter", url: "https://twitter.com" }, { platform: "linkedin", url: "https://linkedin.com" }] }, settings: { align: "center" } },
      ],
    },
    {
      name: "Services",
      description: "Service offerings with descriptions, process overview, FAQ, and contact form",
      category: "business",
      blocks: [
        { type: "heading", content: { text: "Our Services", level: 1 }, settings: { align: "center" } },
        { type: "text", content: { html: "<p>We help businesses build exceptional digital products — from initial strategy through launch and beyond. Every engagement is tailored to your specific goals and constraints.</p>" }, settings: { align: "center" } },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "columns", content: { columns: [
          { blocks: [
            { id: "sv1", type: "heading", content: { text: "Web Design", level: 3 }, settings: { align: "center" } },
            { id: "sv2", type: "text", content: { html: "<p>Conversion-focused websites that reflect your brand and drive results. We handle research, wireframing, visual design, and interactive prototyping.</p><p><strong>Starting at $5,000</strong></p>" }, settings: { align: "center" } },
          ] },
          { blocks: [
            { id: "sv3", type: "heading", content: { text: "Development", level: 3 }, settings: { align: "center" } },
            { id: "sv4", type: "text", content: { html: "<p>Custom web applications built with modern frameworks. We specialize in React, Next.js, and Node.js with a focus on performance, security, and maintainability.</p><p><strong>Starting at $8,000</strong></p>" }, settings: { align: "center" } },
          ] },
          { blocks: [
            { id: "sv5", type: "heading", content: { text: "Consulting", level: 3 }, settings: { align: "center" } },
            { id: "sv6", type: "text", content: { html: "<p>Strategic guidance for technology decisions, architecture reviews, and design system audits. Ideal for teams that need expert input without long-term commitment.</p><p><strong>$200/hour</strong></p>" }, settings: { align: "center" } },
          ] },
        ] }, settings: { gap: "32px" } },
        { type: "spacer", content: { height: 48 }, settings: {} },
        { type: "heading", content: { text: "Our Process", level: 2 }, settings: { align: "center" } },
        { type: "columns", content: { columns: [
          { blocks: [
            { id: "sv7", type: "heading", content: { text: "1. Discovery", level: 3 }, settings: { align: "center" } },
            { id: "sv8", type: "text", content: { html: "<p>We start by understanding your business, users, and goals. This phase includes stakeholder interviews, competitive analysis, and requirements gathering.</p>" }, settings: { align: "center" } },
          ] },
          { blocks: [
            { id: "sv9", type: "heading", content: { text: "2. Design & Build", level: 3 }, settings: { align: "center" } },
            { id: "sv10", type: "text", content: { html: "<p>We design and develop iteratively, sharing progress weekly. You'll see working prototypes early and provide feedback throughout the process.</p>" }, settings: { align: "center" } },
          ] },
          { blocks: [
            { id: "sv11", type: "heading", content: { text: "3. Launch & Support", level: 3 }, settings: { align: "center" } },
            { id: "sv12", type: "text", content: { html: "<p>We handle deployment, monitoring, and post-launch optimization. Every project includes 30 days of support after launch.</p>" }, settings: { align: "center" } },
          ] },
        ] }, settings: { gap: "32px" } },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "heading", content: { text: "Frequently Asked Questions", level: 2 }, settings: { align: "center" } },
        { type: "accordion", content: { items: [
          { id: "svf1", title: "How long does a typical project take?", content: "<p>Most website projects take 4-8 weeks from kickoff to launch. Web applications typically take 8-16 weeks depending on complexity. We'll provide a detailed timeline during the discovery phase.</p>" },
          { id: "svf2", title: "Do you work with existing designs?", content: "<p>Absolutely. We're happy to implement designs from your team or another agency. We can also extend existing design systems or provide design feedback.</p>" },
          { id: "svf3", title: "What about ongoing maintenance?", content: "<p>We offer monthly retainer packages for ongoing updates, security patches, and feature additions. Retainers start at $1,500/month and can be adjusted as your needs change.</p>" },
          { id: "svf4", title: "Do you offer fixed-price or hourly billing?", content: "<p>We prefer fixed-price engagements because they align incentives — you know exactly what you'll pay, and we're motivated to work efficiently. For ongoing or exploratory work, we bill hourly.</p>" },
        ], style: "bordered", iconPosition: "right" }, settings: {} },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "heading", content: { text: "Ready to Get Started?", level: 2 }, settings: { align: "center" } },
        { type: "text", content: { html: "<p>Tell us about your project and we'll get back to you within one business day with a free consultation.</p>" }, settings: { align: "center" } },
        { type: "button", content: { text: "Contact Us", url: "#", variant: "primary" }, settings: { align: "center" } },
      ],
    },
    {
      name: "FAQ",
      description: "Comprehensive FAQ page with categorized questions and support CTA",
      category: "support",
      blocks: [
        { type: "heading", content: { text: "Frequently Asked Questions", level: 1 }, settings: { align: "center" } },
        { type: "text", content: { html: "<p>Everything you need to know about our platform. Can't find an answer? Our support team is just a message away.</p>" }, settings: { align: "center" } },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "heading", content: { text: "Getting Started", level: 2 }, settings: {} },
        { type: "accordion", content: { items: [
          { id: "faq1", title: "How do I create my first website?", content: "<p>After signing up, click \"New Site\" from your dashboard. Give it a name, and you'll be taken to your site's page manager. Click \"New Page\" to start building with the visual editor. Choose a template or start from scratch — either way, you'll have a live page in minutes.</p>" },
          { id: "faq2", title: "Do I need coding experience?", content: "<p>Not at all. The visual editor uses a drag-and-drop block system. You can build complete pages using pre-built blocks for text, images, buttons, forms, columns, and more. If you do know HTML, the code block lets you add custom elements too.</p>" },
          { id: "faq3", title: "Can I import content from another platform?", content: "<p>Yes. You can import site backups in JSON format from the Sites page. If you're migrating from another CMS, you can export your content there and restructure it to match our import format, or contact support for migration assistance.</p>" },
        ], style: "bordered", iconPosition: "right" }, settings: {} },
        { type: "spacer", content: { height: 24 }, settings: {} },
        { type: "heading", content: { text: "Features & Customization", level: 2 }, settings: {} },
        { type: "accordion", content: { items: [
          { id: "faq4", title: "Can I use my own domain name?", content: "<p>Yes! You can connect a custom domain to your site. Go to Site Settings, enter your domain, and update your DNS records to point to our servers. We automatically provision and renew SSL certificates for all custom domains.</p>" },
          { id: "faq5", title: "How do I customize the look and feel?", content: "<p>Each site has a theme system where you can set primary colors, background colors, and font presets. These cascade to all published pages. Individual blocks can also be styled with custom colors, padding, margins, and alignment.</p>" },
          { id: "faq6", title: "Can I add forms to my pages?", content: "<p>Absolutely. The Form block lets you create contact forms, registration forms, surveys, and more. Submissions are stored in your dashboard where you can view, filter, and export them as CSV.</p>" },
          { id: "faq7", title: "Is there SEO support?", content: "<p>Every page has SEO controls: custom meta titles, Open Graph images for social sharing, noindex toggles, and auto-generated descriptions. We also generate sitemaps and structured data (Schema.org) automatically.</p>" },
        ], style: "bordered", iconPosition: "right" }, settings: {} },
        { type: "spacer", content: { height: 24 }, settings: {} },
        { type: "heading", content: { text: "Billing & Plans", level: 2 }, settings: {} },
        { type: "accordion", content: { items: [
          { id: "faq8", title: "Is there a free plan?", content: "<p>We offer a generous free tier that includes all core features including the visual editor, templates, form submissions, and media library. Premium features like custom domains, priority support, and advanced analytics are available on paid plans.</p>" },
          { id: "faq9", title: "Can I switch plans at any time?", content: "<p>Yes. Upgrades take effect immediately with prorated billing. Downgrades take effect at the start of your next billing cycle. There are no long-term contracts — you can cancel anytime.</p>" },
          { id: "faq10", title: "What's your refund policy?", content: "<p>We offer a full refund within 30 days of any payment, no questions asked. If you're not happy with the service, email support and we'll process your refund within 2 business days.</p>" },
        ], style: "bordered", iconPosition: "right" }, settings: {} },
        { type: "spacer", content: { height: 48 }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "heading", content: { text: "Still Have Questions?", level: 2 }, settings: { align: "center" } },
        { type: "text", content: { html: "<p>Our support team typically responds within a few hours during business days. We're here to help.</p>" }, settings: { align: "center" } },
        { type: "button", content: { text: "Contact Support", url: "#", variant: "outline" }, settings: { align: "center" } },
      ],
    },
    {
      name: "Team / About Us",
      description: "Company story, team members, values, and culture",
      category: "about",
      blocks: [
        { type: "heading", content: { text: "About Our Company", level: 1 }, settings: { align: "center" } },
        { type: "text", content: { html: "<p>We're a team of 25 designers, engineers, and strategists building tools that make the web more accessible. Founded in 2020, we've helped over 2,000 businesses create their online presence.</p>" }, settings: { align: "center" } },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "heading", content: { text: "Our Story", level: 2 }, settings: {} },
        { type: "text", content: { html: "<p>It started with a frustration. In 2019, our founders were building websites for small businesses and kept running into the same problem: existing tools were either too complex for non-technical users or too limited for professional results.</p><p>So they set out to build something different — a visual page builder that's genuinely easy to use without sacrificing the quality and flexibility that professionals demand. Two years of development later, the platform launched to its first 100 users.</p><p>Today, we serve thousands of creators, agencies, and businesses worldwide. Our mission hasn't changed: make it possible for anyone to build a beautiful, professional website.</p>" }, settings: {} },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "heading", content: { text: "Our Values", level: 2 }, settings: { align: "center" } },
        { type: "columns", content: { columns: [
          { blocks: [
            { id: "ab1", type: "heading", content: { text: "Simplicity First", level: 3 }, settings: { align: "center" } },
            { id: "ab2", type: "text", content: { html: "<p>Every feature must earn its complexity. If we can't explain it in one sentence, we redesign it until we can.</p>" }, settings: { align: "center" } },
          ] },
          { blocks: [
            { id: "ab3", type: "heading", content: { text: "Craft Over Speed", level: 3 }, settings: { align: "center" } },
            { id: "ab4", type: "text", content: { html: "<p>We ship when it's ready, not when the calendar says so. Quality compounds — cutting corners never pays off long-term.</p>" }, settings: { align: "center" } },
          ] },
          { blocks: [
            { id: "ab5", type: "heading", content: { text: "Transparent Always", level: 3 }, settings: { align: "center" } },
            { id: "ab6", type: "text", content: { html: "<p>Open roadmap, honest pricing, clear communication. We share what we know, including our mistakes and what we learned.</p>" }, settings: { align: "center" } },
          ] },
        ] }, settings: { gap: "32px" } },
        { type: "spacer", content: { height: 48 }, settings: {} },
        { type: "heading", content: { text: "Meet the Team", level: 2 }, settings: { align: "center" } },
        { type: "columns", content: { columns: [
          { blocks: [
            { id: "tm1", type: "heading", content: { text: "Sarah Chen", level: 3 }, settings: { align: "center" } },
            { id: "tm2", type: "text", content: { html: "<p><strong>CEO & Co-Founder</strong></p><p>Former design lead at a Fortune 500 tech company. 12 years in product design. Believes the best tools are invisible — they get out of your way and let you create.</p>" }, settings: { align: "center" } },
          ] },
          { blocks: [
            { id: "tm3", type: "heading", content: { text: "Marcus Johnson", level: 3 }, settings: { align: "center" } },
            { id: "tm4", type: "text", content: { html: "<p><strong>CTO & Co-Founder</strong></p><p>Full-stack engineer and open-source advocate. Built distributed systems at scale before founding the company. Conference speaker and author of two technical books.</p>" }, settings: { align: "center" } },
          ] },
        ] }, settings: { gap: "32px" } },
        { type: "spacer", content: { height: 16 }, settings: {} },
        { type: "columns", content: { columns: [
          { blocks: [
            { id: "tm5", type: "heading", content: { text: "Priya Patel", level: 3 }, settings: { align: "center" } },
            { id: "tm6", type: "text", content: { html: "<p><strong>Head of Product</strong></p><p>Product strategist with a background in user research and data science. Previously built products used by millions at a leading SaaS company.</p>" }, settings: { align: "center" } },
          ] },
          { blocks: [
            { id: "tm7", type: "heading", content: { text: "David Kim", level: 3 }, settings: { align: "center" } },
            { id: "tm8", type: "text", content: { html: "<p><strong>Head of Engineering</strong></p><p>Systems architect specializing in performance and reliability. Obsessed with sub-100ms response times and zero-downtime deployments.</p>" }, settings: { align: "center" } },
          ] },
        ] }, settings: { gap: "32px" } },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "quote", content: { text: "Great products come from great teams. We hire for curiosity, empathy, and craft — and we give people the autonomy to do their best work.", attribution: "Sarah Chen, CEO", style: "filled" }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "heading", content: { text: "Want to Join Us?", level: 2 }, settings: { align: "center" } },
        { type: "text", content: { html: "<p>We're always looking for talented people who care deeply about building great products. Check out our open positions or send us a note.</p>" }, settings: { align: "center" } },
        { type: "button", content: { text: "View Open Positions", url: "#", variant: "primary" }, settings: { align: "center" } },
      ],
    },
    {
      name: "Event",
      description: "Event page with schedule, speakers, registration form, and venue details",
      category: "event",
      blocks: [
        { type: "heading", content: { text: "Design & Dev Summit 2026", level: 1 }, settings: { align: "center" } },
        { type: "text", content: { html: "<p><strong>March 15-16, 2026</strong> &bull; The Moscone Center, San Francisco</p><p>Join 800+ designers, developers, and product leaders for two days of talks, workshops, and networking. Early bird pricing ends February 28.</p>" }, settings: { align: "center" } },
        { type: "button", content: { text: "Get Your Ticket", url: "#", variant: "primary" }, settings: { align: "center" } },
        { type: "spacer", content: { height: 48 }, settings: {} },
        { type: "columns", content: { columns: [
          { blocks: [{ id: "ev1", type: "heading", content: { text: "20+", level: 2 }, settings: { align: "center" } }, { id: "ev2", type: "text", content: { html: "<p>Expert speakers from leading tech companies</p>" }, settings: { align: "center" } }] },
          { blocks: [{ id: "ev3", type: "heading", content: { text: "800+", level: 2 }, settings: { align: "center" } }, { id: "ev4", type: "text", content: { html: "<p>Attendees from 30+ countries worldwide</p>" }, settings: { align: "center" } }] },
          { blocks: [{ id: "ev5", type: "heading", content: { text: "2 Days", level: 2 }, settings: { align: "center" } }, { id: "ev6", type: "text", content: { html: "<p>Packed with talks, workshops, and networking</p>" }, settings: { align: "center" } }] },
        ] }, settings: { gap: "24px" } },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "heading", content: { text: "Schedule", level: 2 }, settings: {} },
        { type: "columns", content: { columns: [
          { blocks: [
            { id: "ev7", type: "heading", content: { text: "Day 1 — Talks", level: 3 }, settings: {} },
            { id: "ev8", type: "text", content: { html: "<p><strong>9:00 AM</strong> — Opening Keynote: The Future of Digital Craft<br><strong>10:30 AM</strong> — Building Design Systems at Scale<br><strong>11:30 AM</strong> — Performance as a Feature, Not an Afterthought<br><strong>1:00 PM</strong> — Lunch & Networking<br><strong>2:00 PM</strong> — AI-Assisted Design: Promise vs. Reality<br><strong>3:30 PM</strong> — Accessibility Beyond Compliance<br><strong>5:00 PM</strong> — Lightning Talks (5 speakers x 10 min)<br><strong>6:30 PM</strong> — Welcome Reception & Drinks</p>" }, settings: {} },
          ] },
          { blocks: [
            { id: "ev9", type: "heading", content: { text: "Day 2 — Workshops", level: 3 }, settings: {} },
            { id: "ev10", type: "text", content: { html: "<p><strong>9:00 AM</strong> — Hands-on: Building with Modern CSS<br><strong>10:30 AM</strong> — Workshop: Rapid Prototyping Techniques<br><strong>12:00 PM</strong> — Panel: From Side Project to SaaS Product<br><strong>1:00 PM</strong> — Lunch<br><strong>2:00 PM</strong> — Workshop: User Research on a Budget<br><strong>3:30 PM</strong> — Portfolio Reviews with Industry Experts<br><strong>4:30 PM</strong> — Closing Keynote: What's Next for the Web<br><strong>5:30 PM</strong> — Farewell & Networking</p>" }, settings: {} },
          ] },
        ] }, settings: { gap: "32px" } },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "heading", content: { text: "Ticket Options", level: 2 }, settings: { align: "center" } },
        { type: "columns", content: { columns: [
          { blocks: [
            { id: "ev11", type: "heading", content: { text: "Standard", level: 3 }, settings: { align: "center" } },
            { id: "ev12", type: "text", content: { html: "<p><strong>$299</strong> (early bird: $249)</p><p>Access to all talks, workshops, lunch both days, and the welcome reception.</p>" }, settings: { align: "center" } },
          ] },
          { blocks: [
            { id: "ev13", type: "heading", content: { text: "VIP", level: 3 }, settings: { align: "center" } },
            { id: "ev14", type: "text", content: { html: "<p><strong>$499</strong> (early bird: $399)</p><p>Everything in Standard plus front-row seating, speaker dinner, and 1-on-1 portfolio review.</p>" }, settings: { align: "center" } },
          ] },
          { blocks: [
            { id: "ev15", type: "heading", content: { text: "Student", level: 3 }, settings: { align: "center" } },
            { id: "ev16", type: "text", content: { html: "<p><strong>$149</strong></p><p>Full access to all sessions. Valid student ID required at check-in.</p>" }, settings: { align: "center" } },
          ] },
        ] }, settings: { gap: "24px" } },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "heading", content: { text: "Register", level: 2 }, settings: {} },
        { type: "form", content: { fields: [
          { id: "name", type: "text", label: "Full Name", required: true, placeholder: "Your name" },
          { id: "email", type: "email", label: "Email", required: true, placeholder: "your@email.com" },
          { id: "company", type: "text", label: "Company", required: false, placeholder: "Your company (optional)" },
          { id: "ticket", type: "select", label: "Ticket Type", required: true, placeholder: "Select ticket", options: ["Standard ($299)", "VIP ($499)", "Student ($149)"] },
        ], submitText: "Register Now", successMessage: "You're registered! Check your email for confirmation and event details." }, settings: {} },
      ],
    },
    {
      name: "Pricing",
      description: "Three pricing tiers with feature comparison and FAQ",
      category: "business",
      blocks: [
        { type: "heading", content: { text: "Simple, Transparent Pricing", level: 1 }, settings: { align: "center" } },
        { type: "text", content: { html: "<p>No hidden fees, no surprises. Choose the plan that fits your needs and scale up as you grow. Every plan includes a 14-day free trial.</p>" }, settings: { align: "center" } },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "columns", content: { columns: [
          { blocks: [
            { id: "pr1", type: "heading", content: { text: "Starter", level: 3 }, settings: { align: "center" } },
            { id: "pr2", type: "text", content: { html: "<p><strong style='font-size:2rem'>$9</strong>/month</p><p>Perfect for personal projects and portfolios</p><ul><li>1 website</li><li>10 pages</li><li>Basic templates</li><li>Form submissions (100/mo)</li><li>1 GB media storage</li><li>Community support</li></ul>" }, settings: { align: "center" } },
            { id: "pr3", type: "button", content: { text: "Start Free Trial", url: "#", variant: "outline" }, settings: { align: "center" } },
          ] },
          { blocks: [
            { id: "pr4", type: "heading", content: { text: "Professional", level: 3 }, settings: { align: "center" } },
            { id: "pr5", type: "text", content: { html: "<p><strong style='font-size:2rem'>$29</strong>/month</p><p>For growing businesses and agencies</p><ul><li>5 websites</li><li>Unlimited pages</li><li>All templates + custom</li><li>Custom domain + SSL</li><li>Form submissions (5,000/mo)</li><li>10 GB media storage</li><li>Advanced SEO tools</li><li>Priority email support</li></ul>" }, settings: { align: "center" } },
            { id: "pr6", type: "button", content: { text: "Start Free Trial", url: "#", variant: "primary" }, settings: { align: "center" } },
          ] },
          { blocks: [
            { id: "pr7", type: "heading", content: { text: "Enterprise", level: 3 }, settings: { align: "center" } },
            { id: "pr8", type: "text", content: { html: "<p><strong style='font-size:2rem'>$99</strong>/month</p><p>For large teams and organizations</p><ul><li>Unlimited websites</li><li>Unlimited pages</li><li>White-label branding</li><li>Unlimited form submissions</li><li>100 GB media storage</li><li>API access</li><li>Dedicated account manager</li><li>Phone + chat support</li></ul>" }, settings: { align: "center" } },
            { id: "pr9", type: "button", content: { text: "Contact Sales", url: "#", variant: "outline" }, settings: { align: "center" } },
          ] },
        ] }, settings: { gap: "24px" } },
        { type: "spacer", content: { height: 48 }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "heading", content: { text: "Common Questions About Pricing", level: 2 }, settings: { align: "center" } },
        { type: "accordion", content: { items: [
          { id: "pf1", title: "Can I switch plans at any time?", content: "<p>Yes. Upgrades take effect immediately with prorated billing for the remainder of your cycle. Downgrades apply at the start of your next billing period. No penalties or lock-in contracts.</p>" },
          { id: "pf2", title: "What payment methods do you accept?", content: "<p>We accept all major credit cards (Visa, Mastercard, American Express) and PayPal. Enterprise customers can also pay via bank transfer or purchase order.</p>" },
          { id: "pf3", title: "Is there a money-back guarantee?", content: "<p>Absolutely. If you're not satisfied within the first 30 days of any paid plan, we'll refund your payment in full — no questions asked. We want you to be confident in your choice.</p>" },
          { id: "pf4", title: "Do you offer discounts for annual billing?", content: "<p>Yes! Annual billing saves you 20% compared to monthly. That's $86/year on Starter, $278/year on Professional, and $238/year on Enterprise.</p>" },
          { id: "pf5", title: "What happens when I hit my storage limit?", content: "<p>We'll notify you when you reach 80% of your storage quota. You can upgrade your plan at any time, or remove unused media files to free up space. We never delete your content without permission.</p>" },
        ], style: "bordered", iconPosition: "right" }, settings: {} },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "heading", content: { text: "Ready to Get Started?", level: 2 }, settings: { align: "center" } },
        { type: "text", content: { html: "<p>Start building for free today. No credit card required for the 14-day trial.</p>" }, settings: { align: "center" } },
        { type: "button", content: { text: "Start Your Free Trial", url: "#", variant: "primary" }, settings: { align: "center" } },
      ],
    },
    {
      name: "Contact",
      description: "Contact page with form, office info, and social links",
      category: "general",
      blocks: [
        { type: "heading", content: { text: "Get in Touch", level: 1 }, settings: { align: "center" } },
        { type: "text", content: { html: "<p>Have a question, feedback, or project in mind? We'd love to hear from you. Fill out the form below or reach out through any of our channels.</p>" }, settings: { align: "center" } },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "columns", content: { columns: [
          { blocks: [
            { id: "ct1", type: "heading", content: { text: "Send Us a Message", level: 2 }, settings: {} },
            { id: "ct2", type: "text", content: { html: "<p>We typically respond within one business day. For urgent matters, please call us directly.</p>" }, settings: {} },
          ] },
          { blocks: [
            { id: "ct3", type: "heading", content: { text: "Other Ways to Reach Us", level: 2 }, settings: {} },
            { id: "ct4", type: "text", content: { html: "<p><strong>Email</strong><br>hello@yourcompany.com</p><p><strong>Phone</strong><br>+1 (555) 123-4567<br>Mon-Fri, 9 AM - 6 PM EST</p><p><strong>Office</strong><br>123 Main Street, Suite 400<br>San Francisco, CA 94105</p>" }, settings: {} },
          ] },
        ] }, settings: { gap: "48px" } },
        { type: "spacer", content: { height: 16 }, settings: {} },
        { type: "form", content: { fields: [
          { id: "name", type: "text", label: "Your Name", required: true, placeholder: "Full name" },
          { id: "email", type: "email", label: "Email Address", required: true, placeholder: "you@example.com" },
          { id: "subject", type: "select", label: "What can we help with?", required: true, placeholder: "Select a topic", options: ["General Inquiry", "Project Consultation", "Technical Support", "Partnership Opportunity", "Press & Media"] },
          { id: "message", type: "textarea", label: "Your Message", required: true, placeholder: "Tell us more about your question or project..." },
        ], submitText: "Send Message", successMessage: "Thank you! We've received your message and will get back to you within one business day." }, settings: {} },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "heading", content: { text: "Follow Us", level: 2 }, settings: { align: "center" } },
        { type: "social", content: { links: [
          { platform: "twitter", url: "https://twitter.com" },
          { platform: "linkedin", url: "https://linkedin.com" },
          { platform: "github", url: "https://github.com" },
        ] }, settings: { align: "center" } },
      ],
    },
    {
      name: "Blog Index",
      description: "Blog listing page with featured post and article grid",
      category: "blog",
      blocks: [
        { type: "heading", content: { text: "Blog", level: 1 }, settings: {} },
        { type: "text", content: { html: "<p>Insights on design, development, product strategy, and building for the modern web. Updated weekly.</p>" }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "heading", content: { text: "Featured", level: 2 }, settings: {} },
        { type: "heading", content: { text: "How We Reduced Our API Response Time by 60%", level: 3 }, settings: {} },
        { type: "text", content: { html: "<p>Performance isn't just a technical metric — it directly impacts user experience, conversion rates, and search rankings. When our median API response time crept above 400ms, we knew it was time to act. Here's the full story of how we diagnosed and fixed the issue.</p><p><em>February 2026 &bull; 8 min read</em></p>" }, settings: {} },
        { type: "button", content: { text: "Read Article", url: "#", variant: "outline" }, settings: {} },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "heading", content: { text: "Recent Posts", level: 2 }, settings: {} },
        { type: "columns", content: { columns: [
          { blocks: [
            { id: "bi1", type: "heading", content: { text: "Designing for Accessibility: A Practical Guide", level: 3 }, settings: {} },
            { id: "bi2", type: "text", content: { html: "<p>Accessibility isn't a feature — it's a fundamental aspect of good design. Here are 10 practical steps you can take today to make your websites more inclusive.</p><p><em>February 2026 &bull; 6 min read</em></p>" }, settings: {} },
          ] },
          { blocks: [
            { id: "bi3", type: "heading", content: { text: "The Case for Boring Technology", level: 3 }, settings: {} },
            { id: "bi4", type: "text", content: { html: "<p>Why we chose proven, \"boring\" technologies for our stack — and how it saved us months of debugging and migration headaches down the road.</p><p><em>January 2026 &bull; 5 min read</em></p>" }, settings: {} },
          ] },
        ] }, settings: { gap: "32px" } },
        { type: "spacer", content: { height: 16 }, settings: {} },
        { type: "columns", content: { columns: [
          { blocks: [
            { id: "bi5", type: "heading", content: { text: "Building a Design System from Scratch", level: 3 }, settings: {} },
            { id: "bi6", type: "text", content: { html: "<p>Lessons learned from creating a component library that serves both our product team and our customers' published websites.</p><p><em>January 2026 &bull; 10 min read</em></p>" }, settings: {} },
          ] },
          { blocks: [
            { id: "bi7", type: "heading", content: { text: "Why We Switched to Server Components", level: 3 }, settings: {} },
            { id: "bi8", type: "text", content: { html: "<p>A technical deep-dive into our migration to React Server Components and the measurable impact on bundle size and initial load time.</p><p><em>December 2025 &bull; 12 min read</em></p>" }, settings: {} },
          ] },
        ] }, settings: { gap: "32px" } },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "heading", content: { text: "Subscribe to Our Newsletter", level: 2 }, settings: { align: "center" } },
        { type: "text", content: { html: "<p>Get our best articles delivered to your inbox every week. No spam, unsubscribe anytime.</p>" }, settings: { align: "center" } },
        { type: "form", content: { fields: [
          { id: "email", type: "email", label: "Email", required: true, placeholder: "your@email.com" },
        ], submitText: "Subscribe", successMessage: "You're subscribed! Check your email to confirm." }, settings: {} },
      ],
    },
    {
      name: "Documentation",
      description: "Documentation page with table of contents, code examples, and navigation",
      category: "support",
      blocks: [
        { type: "heading", content: { text: "Getting Started Guide", level: 1 }, settings: {} },
        { type: "text", content: { html: "<p>Everything you need to know to set up your first site, build pages, and publish to the web. This guide covers the core concepts in about 10 minutes.</p>" }, settings: {} },
        { type: "toc", content: {}, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "heading", content: { text: "Creating Your First Site", level: 2 }, settings: {} },
        { type: "text", content: { html: "<p>After logging in, you'll land on the dashboard. Here's how to create your first site:</p><ol><li>Click the <strong>\"New Site\"</strong> button on the Sites page</li><li>Enter a name for your site (e.g., \"My Portfolio\")</li><li>Your site URL is auto-generated from the name — you can customize it later</li><li>Click <strong>\"Create\"</strong> and you'll be taken to your site's page manager</li></ol><p>Every site can have multiple pages, its own theme, navigation, and footer. Think of a site as a complete website project.</p>" }, settings: {} },
        { type: "heading", content: { text: "Building Pages with Blocks", level: 2 }, settings: {} },
        { type: "text", content: { html: "<p>Pages are built using <strong>blocks</strong> — modular content elements that you can add, rearrange, and customize. The editor provides 14 block types:</p><ul><li><strong>Content:</strong> Heading, Text, Quote, Code</li><li><strong>Media:</strong> Image, Video</li><li><strong>Layout:</strong> Columns, Spacer, Divider</li><li><strong>Interactive:</strong> Button, Form, Accordion, Table of Contents, Social Links</li></ul><p>To add a block, click the <strong>\"+\"</strong> button in the sidebar's Blocks tab, or between existing blocks on the canvas.</p>" }, settings: {} },
        { type: "heading", content: { text: "Customizing Block Appearance", level: 2 }, settings: {} },
        { type: "text", content: { html: "<p>Every block has two types of configuration:</p><p><strong>Content settings</strong> control what the block displays — text, images, URLs, form fields, etc.</p><p><strong>Style settings</strong> control how it looks — colors, alignment, padding, margins, font sizes, and visibility. Select any block and use the Settings panel in the sidebar to adjust these.</p>" }, settings: {} },
        { type: "code", content: { code: "<div style=\"padding: 1.5rem; background: #f8f9fa; border-radius: 8px; font-family: system-ui; font-size: 0.9rem; line-height: 1.6;\">\n<strong>Tip:</strong> Use the \"hidden\" toggle in block settings to hide blocks on the published site without deleting them. This is useful for draft content or seasonal promotions.\n</div>", language: "html" }, settings: {} },
        { type: "heading", content: { text: "Publishing Your Pages", level: 2 }, settings: {} },
        { type: "text", content: { html: "<p>When you're ready to share your work:</p><ol><li>Click <strong>\"Publish\"</strong> in the editor toolbar (or use <strong>Ctrl/Cmd + S</strong> to save first)</li><li>Your page is immediately live at its public URL</li><li>To schedule a page for later, click the dropdown arrow next to Publish and choose <strong>\"Schedule for later\"</strong></li><li>To take a page offline, click <strong>\"Unpublish\"</strong> from the toolbar menu</li></ol><p>Published pages use Incremental Static Regeneration (ISR), so they're served fast from the cache and automatically refreshed.</p>" }, settings: {} },
        { type: "heading", content: { text: "Keyboard Shortcuts", level: 2 }, settings: {} },
        { type: "text", content: { html: "<p>Speed up your workflow with these keyboard shortcuts:</p><ul><li><strong>Ctrl/Cmd + S</strong> — Save changes</li><li><strong>Ctrl/Cmd + Z</strong> — Undo last change</li><li><strong>Ctrl/Cmd + Shift + Z</strong> — Redo</li><li><strong>Ctrl/Cmd + D</strong> — Duplicate selected block</li><li><strong>Alt + Arrow Up/Down</strong> — Move selected block up or down</li><li><strong>Delete / Backspace</strong> — Remove selected block</li><li><strong>Escape</strong> — Deselect current block</li><li><strong>?</strong> — Show all keyboard shortcuts</li></ul>" }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "heading", content: { text: "Next Steps", level: 2 }, settings: {} },
        { type: "text", content: { html: "<p>Now that you know the basics, here are some things to explore:</p><ul><li><strong>Templates:</strong> Create pages from pre-built templates to save time</li><li><strong>Media Library:</strong> Upload and manage images, videos, and documents</li><li><strong>Site Settings:</strong> Customize your theme colors, fonts, and footer</li><li><strong>Navigation:</strong> Control which pages appear in your site's navigation bar</li><li><strong>SEO:</strong> Set meta titles, Open Graph images, and noindex flags per page</li><li><strong>Forms:</strong> Add contact forms and view submissions in your dashboard</li></ul>" }, settings: {} },
        { type: "heading", content: { text: "Need Help?", level: 2 }, settings: { align: "center" } },
        { type: "text", content: { html: "<p>If you run into any issues or have questions, our support team is here for you.</p>" }, settings: { align: "center" } },
        { type: "button", content: { text: "Contact Support", url: "#", variant: "outline" }, settings: { align: "center" } },
      ],
    },
  ];

  for (const template of templates) {
    await prisma.template.upsert({
      where: { id: `system-${template.name.toLowerCase().replace(/\s+/g, "-")}` },
      update: {
        blocks: template.blocks,
      },
      create: {
        id: `system-${template.name.toLowerCase().replace(/\s+/g, "-")}`,
        name: template.name,
        description: template.description,
        category: template.category,
        blocks: template.blocks,
        isSystem: true,
      },
    });
  }
  console.log("Created system templates");

  // Create demo site with theme and footer
  const site = await prisma.site.upsert({
    where: { slug: "demo-portfolio" },
    update: {},
    create: {
      name: "Demo Portfolio",
      slug: "demo-portfolio",
      description: "A demo portfolio site showcasing Vellum's capabilities",
      userId: user.id,
      theme: {
        colors: {
          primary: "#6366F1",
          background: "#FAF9F7",
          surface: "#FFFFFF",
          text: "#1C1917",
        },
        fontPreset: "modern",
      },
      footer: {
        text: "Built with Vellum",
        links: [
          { label: "Home", url: "/s/demo-portfolio" },
          { label: "Contact", url: "/s/demo-portfolio/contact" },
        ],
        showBranding: true,
      },
    },
  });

  console.log("Created demo site:", site.name);

  // --- Home Page (enhanced) ---
  const homePage = await prisma.page.upsert({
    where: { siteId_slug: { siteId: site.id, slug: "home" } },
    update: {},
    create: {
      title: "Home",
      slug: "home",
      isHomepage: true,
      status: "PUBLISHED",
      publishedAt: new Date(),
      showInNav: true,
      siteId: site.id,
      sortOrder: 0,
    },
  });

  await prisma.block.deleteMany({ where: { pageId: homePage.id } });

  const homeBlocks = [
    {
      type: "heading",
      content: { text: "Welcome to Vellum", level: 1 },
      settings: { align: "center" },
    },
    {
      type: "text",
      content: {
        html: "<p>The elegant visual page builder for creators, designers, and developers. Build beautiful websites without writing code.</p>",
      },
      settings: { align: "center" },
    },
    {
      type: "button",
      content: { text: "Explore the Editor", url: "#", variant: "primary" },
      settings: { align: "center" },
    },
    {
      type: "spacer",
      content: { height: 64 },
      settings: {},
    },
    {
      type: "heading",
      content: { text: "Everything You Need", level: 2 },
      settings: { align: "center" },
    },
    {
      type: "columns",
      content: {
        columns: [
          {
            blocks: [
              {
                id: "f1",
                type: "heading",
                content: { text: "Visual Editor", level: 3 },
                settings: { align: "center" },
              },
              {
                id: "f2",
                type: "text",
                content: {
                  html: "<p>Drag-and-drop blocks to build your pages visually. No coding required.</p>",
                },
                settings: { align: "center" },
              },
            ],
          },
          {
            blocks: [
              {
                id: "f3",
                type: "heading",
                content: { text: "Responsive Design", level: 3 },
                settings: { align: "center" },
              },
              {
                id: "f4",
                type: "text",
                content: {
                  html: "<p>Every page looks great on desktop, tablet, and mobile devices.</p>",
                },
                settings: { align: "center" },
              },
            ],
          },
          {
            blocks: [
              {
                id: "f5",
                type: "heading",
                content: { text: "One-Click Publish", level: 3 },
                settings: { align: "center" },
              },
              {
                id: "f6",
                type: "text",
                content: {
                  html: "<p>Publish your pages instantly and share them with the world.</p>",
                },
                settings: { align: "center" },
              },
            ],
          },
        ],
      },
      settings: { gap: "32px" },
    },
    {
      type: "divider",
      content: {},
      settings: { style: "solid", color: "#E7E5E4" },
    },
    {
      type: "quote",
      content: {
        text: "Vellum transformed how I build websites. The editor is intuitive and the results are beautiful.",
        attribution: "A Happy Creator",
      },
      settings: {},
    },
    {
      type: "social",
      content: {
        links: [
          { platform: "twitter", url: "https://twitter.com" },
          { platform: "github", url: "https://github.com" },
          { platform: "linkedin", url: "https://linkedin.com" },
        ],
      },
      settings: { align: "center" },
    },
  ];

  await prisma.block.createMany({
    data: homeBlocks.map((block, i) => ({
      type: block.type,
      content: block.content,
      settings: block.settings,
      sortOrder: i,
      pageId: homePage.id,
    })),
  });

  // --- About Page ---
  const aboutPage = await prisma.page.upsert({
    where: { siteId_slug: { siteId: site.id, slug: "about" } },
    update: {},
    create: {
      title: "About",
      slug: "about",
      status: "PUBLISHED",
      publishedAt: new Date(),
      showInNav: true,
      siteId: site.id,
      sortOrder: 1,
    },
  });

  await prisma.block.deleteMany({ where: { pageId: aboutPage.id } });

  const aboutBlocks = [
    {
      type: "heading",
      content: { text: "About This Project", level: 1 },
      settings: {},
    },
    {
      type: "text",
      content: {
        html: "<p>Vellum is a portfolio-grade CMS named after fine parchment, embodying elegance and craftsmanship in every detail.</p><p>It features a visual page builder with drag-and-drop blocks, a media library, template system, and one-click publishing.</p>",
      },
      settings: {},
    },
    {
      type: "spacer",
      content: { height: 32 },
      settings: {},
    },
    {
      type: "columns",
      content: {
        columns: [
          {
            blocks: [
              {
                id: "a1",
                type: "heading",
                content: { text: "Our Mission", level: 3 },
                settings: {},
              },
              {
                id: "a2",
                type: "text",
                content: {
                  html: "<p>To empower creators with tools that are both powerful and delightful to use. We believe great design should be accessible to everyone.</p>",
                },
                settings: {},
              },
            ],
          },
          {
            blocks: [
              {
                id: "a3",
                type: "heading",
                content: { text: "Our Values", level: 3 },
                settings: {},
              },
              {
                id: "a4",
                type: "text",
                content: {
                  html: "<p><strong>Simplicity</strong> over complexity. <strong>Elegance</strong> over excess. <strong>Craft</strong> over shortcuts. Every feature is thoughtfully designed.</p>",
                },
                settings: {},
              },
            ],
          },
        ],
      },
      settings: { gap: "32px" },
    },
  ];

  await prisma.block.createMany({
    data: aboutBlocks.map((block, i) => ({
      type: block.type,
      content: block.content,
      settings: block.settings,
      sortOrder: i,
      pageId: aboutPage.id,
    })),
  });

  // --- Contact Page (with form) ---
  const contactPage = await prisma.page.upsert({
    where: { siteId_slug: { siteId: site.id, slug: "contact" } },
    update: {},
    create: {
      title: "Contact",
      slug: "contact",
      status: "PUBLISHED",
      publishedAt: new Date(),
      showInNav: true,
      siteId: site.id,
      sortOrder: 2,
    },
  });

  await prisma.block.deleteMany({ where: { pageId: contactPage.id } });

  const contactBlocks = [
    {
      type: "heading",
      content: { text: "Get in Touch", level: 1 },
      settings: {},
    },
    {
      type: "text",
      content: {
        html: "<p>We'd love to hear from you. Fill out the form below and we'll get back to you shortly.</p>",
      },
      settings: {},
    },
    {
      type: "divider",
      content: {},
      settings: { style: "solid" },
    },
    {
      type: "form",
      content: {
        fields: [
          { id: "name", type: "text", label: "Name", required: true, placeholder: "Your name" },
          { id: "email", type: "email", label: "Email", required: true, placeholder: "your@email.com" },
          {
            id: "subject",
            type: "select",
            label: "Subject",
            required: true,
            placeholder: "Select a topic",
            options: ["General Inquiry", "Support", "Partnership", "Feedback"],
          },
          { id: "message", type: "textarea", label: "Message", required: true, placeholder: "Tell us more..." },
        ],
        submitText: "Send Message",
        successMessage: "Thank you! We'll be in touch soon.",
      },
      settings: {},
    },
  ];

  await prisma.block.createMany({
    data: contactBlocks.map((block, i) => ({
      type: block.type,
      content: block.content,
      settings: block.settings,
      sortOrder: i,
      pageId: contactPage.id,
    })),
  });

  // --- Portfolio Page (columns layout) ---
  const portfolioPage = await prisma.page.upsert({
    where: { siteId_slug: { siteId: site.id, slug: "portfolio" } },
    update: {},
    create: {
      title: "Portfolio",
      slug: "portfolio",
      status: "PUBLISHED",
      publishedAt: new Date(),
      showInNav: true,
      siteId: site.id,
      sortOrder: 3,
    },
  });

  await prisma.block.deleteMany({ where: { pageId: portfolioPage.id } });

  const portfolioBlocks = [
    {
      type: "heading",
      content: { text: "Our Work", level: 1 },
      settings: { align: "center" },
    },
    {
      type: "text",
      content: {
        html: "<p>A curated collection of projects showcasing our design and development expertise.</p>",
      },
      settings: { align: "center" },
    },
    {
      type: "divider",
      content: {},
      settings: { style: "solid" },
    },
    {
      type: "columns",
      content: {
        columns: [
          {
            blocks: [
              {
                id: "p1",
                type: "heading",
                content: { text: "Brand Identity", level: 3 },
                settings: {},
              },
              {
                id: "p2",
                type: "text",
                content: {
                  html: "<p>Complete brand redesign for a tech startup, including logo, typography, and color system. The new identity increased brand recognition by 40%.</p>",
                },
                settings: {},
              },
            ],
          },
          {
            blocks: [
              {
                id: "p3",
                type: "heading",
                content: { text: "E-Commerce Platform", level: 3 },
                settings: {},
              },
              {
                id: "p4",
                type: "text",
                content: {
                  html: "<p>Custom online store with seamless checkout flow and inventory management. Built for scale with 99.9% uptime and sub-second load times.</p>",
                },
                settings: {},
              },
            ],
          },
        ],
      },
      settings: { gap: "32px" },
    },
    {
      type: "spacer",
      content: { height: 32 },
      settings: {},
    },
    {
      type: "columns",
      content: {
        columns: [
          {
            blocks: [
              {
                id: "p5",
                type: "heading",
                content: { text: "Mobile App", level: 3 },
                settings: {},
              },
              {
                id: "p6",
                type: "text",
                content: {
                  html: "<p>Cross-platform fitness tracking app with social features, real-time sync, and offline support. Over 50,000 active users.</p>",
                },
                settings: {},
              },
            ],
          },
          {
            blocks: [
              {
                id: "p7",
                type: "heading",
                content: { text: "Dashboard Design", level: 3 },
                settings: {},
              },
              {
                id: "p8",
                type: "text",
                content: {
                  html: "<p>Analytics dashboard for a SaaS platform with real-time data visualization, custom reports, and role-based access control.</p>",
                },
                settings: {},
              },
            ],
          },
        ],
      },
      settings: { gap: "32px" },
    },
    {
      type: "divider",
      content: {},
      settings: { style: "solid" },
    },
    {
      type: "quote",
      content: {
        text: "Their attention to detail and commitment to quality made all the difference. Highly recommended for any creative project.",
        attribution: "Client Testimonial",
      },
      settings: {},
    },
  ];

  await prisma.block.createMany({
    data: portfolioBlocks.map((block, i) => ({
      type: block.type,
      content: block.content,
      settings: block.settings,
      sortOrder: i,
      pageId: portfolioPage.id,
    })),
  });

  // --- Blog Post Page (rich content) ---
  const blogPage = await prisma.page.upsert({
    where: { siteId_slug: { siteId: site.id, slug: "building-better-websites" } },
    update: {},
    create: {
      title: "Building Better Websites",
      slug: "building-better-websites",
      description: "An introduction to block-based editing and why it matters for modern web development.",
      status: "PUBLISHED",
      publishedAt: new Date(),
      showInNav: true,
      siteId: site.id,
      sortOrder: 4,
    },
  });

  await prisma.block.deleteMany({ where: { pageId: blogPage.id } });

  const blogBlocks = [
    {
      type: "heading",
      content: { text: "Building Better Websites with Block-Based Editing", level: 1 },
      settings: {},
    },
    {
      type: "text",
      content: { html: "<p><em>Published February 2026</em></p>" },
      settings: {},
    },
    {
      type: "divider",
      content: {},
      settings: { style: "solid" },
    },
    {
      type: "text",
      content: {
        html: "<p>Block-based editors have revolutionized how we create web content. Instead of wrestling with raw HTML or complex WYSIWYG editors, blocks give you <strong>composable, predictable building elements</strong> that always render consistently.</p><p>Here's what makes them special:</p><ul><li>Each block has a single responsibility</li><li>Blocks can be rearranged with drag and drop</li><li>Settings are scoped to individual blocks</li><li>Content stays structured and semantic</li></ul>",
      },
      settings: {},
    },
    {
      type: "heading",
      content: { text: "The Power of Composition", level: 2 },
      settings: {},
    },
    {
      type: "text",
      content: {
        html: "<p>The real magic happens when you combine blocks together. A simple landing page might use headings, text, buttons, and columns. A blog post adds quotes, code snippets, and images. The same building blocks, arranged differently, create entirely different experiences.</p>",
      },
      settings: {},
    },
    {
      type: "quote",
      content: {
        text: "The best tools are the ones that get out of your way and let you focus on creating.",
        attribution: "Design Philosophy",
      },
      settings: {},
    },
    {
      type: "heading",
      content: { text: "Embedding Content", level: 2 },
      settings: {},
    },
    {
      type: "text",
      content: {
        html: "<p>Modern websites need to embed external content seamlessly. Vellum supports video embeds from YouTube and Vimeo, custom HTML via code blocks, and rich social media links &mdash; all with proper sanitization and security.</p>",
      },
      settings: {},
    },
    {
      type: "code",
      content: {
        code: '<div style="padding: 2rem; background: #f8f9fa; border-radius: 8px; text-align: center;">\n  <h3>Custom HTML Embed</h3>\n  <p>Code blocks let you embed any safe HTML content directly into your pages.</p>\n</div>',
        language: "html",
      },
      settings: {},
    },
    {
      type: "heading",
      content: { text: "What's Next?", level: 2 },
      settings: {},
    },
    {
      type: "text",
      content: {
        html: "<p>Block-based editing is still evolving. Future improvements will include collaborative editing, version history, and even more block types. The foundation is solid &mdash; building on it is the exciting part.</p><p>Ready to try it yourself? <strong>Jump into the editor</strong> and start building.</p>",
      },
      settings: {},
    },
    {
      type: "social",
      content: {
        links: [
          { platform: "twitter", url: "https://twitter.com" },
          { platform: "linkedin", url: "https://linkedin.com" },
        ],
      },
      settings: { align: "center" },
    },
  ];

  await prisma.block.createMany({
    data: blogBlocks.map((block, i) => ({
      type: block.type,
      content: block.content,
      settings: block.settings,
      sortOrder: i,
      pageId: blogPage.id,
    })),
  });

  console.log("Created demo pages with blocks (5 pages)");
  console.log("\nSeed complete!");
  console.log("Demo credentials: demo@vellum.app / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
