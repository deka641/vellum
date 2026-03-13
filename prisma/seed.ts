import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Re-seeding database (keeping users)...\n");

  // ──────────────────────────────────────────────
  // 1. Ensure demo user exists (upsert — never deletes)
  // ──────────────────────────────────────────────
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
  console.log("Demo user ready:", user.email);

  // ──────────────────────────────────────────────
  // 2. Delete all content (safe cascade order)
  //    Users & Templates are preserved.
  // ──────────────────────────────────────────────
  await prisma.formSubmission.deleteMany({});
  await prisma.pageRevision.deleteMany({});
  await prisma.block.deleteMany({});
  await prisma.page.deleteMany({});
  await prisma.site.deleteMany({});
  console.log("Cleared all sites, pages, blocks, revisions, and submissions");

  // ──────────────────────────────────────────────
  // 3. Upsert system templates
  // ──────────────────────────────────────────────
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
          { blocks: [{ id: "lp7", type: "heading", content: { text: "Visual Editor", level: 3 }, settings: { align: "center" } }, { id: "lp8", type: "text", content: { html: "<p>Drag-and-drop blocks to build pages visually. Choose from 15 block types including text, images, columns, forms, accordions, and more. No coding required.</p>" }, settings: { align: "center" } }] },
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
        { type: "spacer", content: { height: 48 }, settings: {} },
        { type: "heading", content: { text: "About Me", level: 2 }, settings: {} },
        { type: "text", content: { html: "<p>I'm a multidisciplinary designer with 8 years of experience spanning brand identity, product design, and front-end development. I believe the best digital products emerge from close collaboration between design and engineering.</p>" }, settings: {} },
        { type: "quote", content: { text: "Design is not just what it looks like. Design is how it works.", attribution: "Steve Jobs", style: "bordered" }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "heading", content: { text: "Let's Work Together", level: 2 }, settings: { align: "center" } },
        { type: "text", content: { html: "<p>Have a project in mind? I'd love to hear about it.</p>" }, settings: { align: "center" } },
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
        { type: "text", content: { html: "<p>We help businesses build exceptional digital products — from initial strategy through launch and beyond.</p>" }, settings: { align: "center" } },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "columns", content: { columns: [
          { blocks: [
            { id: "sv1", type: "heading", content: { text: "Web Design", level: 3 }, settings: { align: "center" } },
            { id: "sv2", type: "text", content: { html: "<p>Conversion-focused websites that reflect your brand and drive results.</p><p><strong>Starting at $5,000</strong></p>" }, settings: { align: "center" } },
          ] },
          { blocks: [
            { id: "sv3", type: "heading", content: { text: "Development", level: 3 }, settings: { align: "center" } },
            { id: "sv4", type: "text", content: { html: "<p>Custom web applications built with modern frameworks and a focus on performance.</p><p><strong>Starting at $8,000</strong></p>" }, settings: { align: "center" } },
          ] },
          { blocks: [
            { id: "sv5", type: "heading", content: { text: "Consulting", level: 3 }, settings: { align: "center" } },
            { id: "sv6", type: "text", content: { html: "<p>Strategic guidance for technology decisions, architecture reviews, and design system audits.</p><p><strong>$200/hour</strong></p>" }, settings: { align: "center" } },
          ] },
        ] }, settings: { gap: "32px" } },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "heading", content: { text: "Frequently Asked Questions", level: 2 }, settings: { align: "center" } },
        { type: "accordion", content: { items: [
          { id: "svf1", title: "How long does a typical project take?", content: "<p>Most website projects take 4-8 weeks from kickoff to launch. Web applications typically take 8-16 weeks depending on complexity.</p>" },
          { id: "svf2", title: "Do you work with existing designs?", content: "<p>Absolutely. We're happy to implement designs from your team or another agency.</p>" },
          { id: "svf3", title: "What about ongoing maintenance?", content: "<p>We offer monthly retainer packages for ongoing updates, security patches, and feature additions starting at $1,500/month.</p>" },
        ], style: "bordered", iconPosition: "right" }, settings: {} },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "heading", content: { text: "Ready to Get Started?", level: 2 }, settings: { align: "center" } },
        { type: "button", content: { text: "Contact Us", url: "#", variant: "primary" }, settings: { align: "center" } },
      ],
    },
    {
      name: "FAQ",
      description: "Comprehensive FAQ page with categorized questions and support CTA",
      category: "support",
      blocks: [
        { type: "heading", content: { text: "Frequently Asked Questions", level: 1 }, settings: { align: "center" } },
        { type: "text", content: { html: "<p>Everything you need to know about our platform.</p>" }, settings: { align: "center" } },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "heading", content: { text: "Getting Started", level: 2 }, settings: {} },
        { type: "accordion", content: { items: [
          { id: "faq1", title: "How do I create my first website?", content: "<p>After signing up, click \"New Site\" from your dashboard. Give it a name, and you'll be taken to your site's page manager.</p>" },
          { id: "faq2", title: "Do I need coding experience?", content: "<p>Not at all. The visual editor uses a drag-and-drop block system.</p>" },
          { id: "faq3", title: "Can I import content from another platform?", content: "<p>Yes. You can import site backups in JSON format from the Sites page.</p>" },
        ], style: "bordered", iconPosition: "right" }, settings: {} },
        { type: "spacer", content: { height: 24 }, settings: {} },
        { type: "heading", content: { text: "Features & Customization", level: 2 }, settings: {} },
        { type: "accordion", content: { items: [
          { id: "faq4", title: "How do I customize the look and feel?", content: "<p>Each site has a theme system where you can set primary colors, background colors, and font presets.</p>" },
          { id: "faq5", title: "Can I add forms to my pages?", content: "<p>Absolutely. The Form block lets you create contact forms, registration forms, surveys, and more.</p>" },
          { id: "faq6", title: "Is there SEO support?", content: "<p>Every page has SEO controls: custom meta titles, Open Graph images for social sharing, noindex toggles, and auto-generated descriptions.</p>" },
        ], style: "bordered", iconPosition: "right" }, settings: {} },
        { type: "spacer", content: { height: 48 }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "heading", content: { text: "Still Have Questions?", level: 2 }, settings: { align: "center" } },
        { type: "button", content: { text: "Contact Support", url: "#", variant: "outline" }, settings: { align: "center" } },
      ],
    },
    {
      name: "Team / About Us",
      description: "Company story, team members, values, and culture",
      category: "about",
      blocks: [
        { type: "heading", content: { text: "About Our Company", level: 1 }, settings: { align: "center" } },
        { type: "text", content: { html: "<p>We're a team of designers, engineers, and strategists building tools that make the web more accessible.</p>" }, settings: { align: "center" } },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "heading", content: { text: "Our Values", level: 2 }, settings: { align: "center" } },
        { type: "columns", content: { columns: [
          { blocks: [
            { id: "ab1", type: "heading", content: { text: "Simplicity First", level: 3 }, settings: { align: "center" } },
            { id: "ab2", type: "text", content: { html: "<p>Every feature must earn its complexity.</p>" }, settings: { align: "center" } },
          ] },
          { blocks: [
            { id: "ab3", type: "heading", content: { text: "Craft Over Speed", level: 3 }, settings: { align: "center" } },
            { id: "ab4", type: "text", content: { html: "<p>We ship when it's ready, not when the calendar says so.</p>" }, settings: { align: "center" } },
          ] },
          { blocks: [
            { id: "ab5", type: "heading", content: { text: "Transparent Always", level: 3 }, settings: { align: "center" } },
            { id: "ab6", type: "text", content: { html: "<p>Open roadmap, honest pricing, clear communication.</p>" }, settings: { align: "center" } },
          ] },
        ] }, settings: { gap: "32px" } },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "quote", content: { text: "Great products come from great teams. We hire for curiosity, empathy, and craft.", attribution: "Sarah Chen, CEO", style: "filled" }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "heading", content: { text: "Want to Join Us?", level: 2 }, settings: { align: "center" } },
        { type: "button", content: { text: "View Open Positions", url: "#", variant: "primary" }, settings: { align: "center" } },
      ],
    },
    {
      name: "Event",
      description: "Event page with schedule, speakers, registration form, and venue details",
      category: "event",
      blocks: [
        { type: "heading", content: { text: "Design & Dev Summit 2026", level: 1 }, settings: { align: "center" } },
        { type: "text", content: { html: "<p><strong>March 15-16, 2026</strong> &bull; The Moscone Center, San Francisco</p><p>Join 800+ designers, developers, and product leaders for two days of talks, workshops, and networking.</p>" }, settings: { align: "center" } },
        { type: "button", content: { text: "Get Your Ticket", url: "#", variant: "primary" }, settings: { align: "center" } },
        { type: "spacer", content: { height: 48 }, settings: {} },
        { type: "columns", content: { columns: [
          { blocks: [{ id: "ev1", type: "heading", content: { text: "20+", level: 2 }, settings: { align: "center" } }, { id: "ev2", type: "text", content: { html: "<p>Expert speakers</p>" }, settings: { align: "center" } }] },
          { blocks: [{ id: "ev3", type: "heading", content: { text: "800+", level: 2 }, settings: { align: "center" } }, { id: "ev4", type: "text", content: { html: "<p>Attendees worldwide</p>" }, settings: { align: "center" } }] },
          { blocks: [{ id: "ev5", type: "heading", content: { text: "2 Days", level: 2 }, settings: { align: "center" } }, { id: "ev6", type: "text", content: { html: "<p>Talks & workshops</p>" }, settings: { align: "center" } }] },
        ] }, settings: { gap: "24px" } },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "heading", content: { text: "Register", level: 2 }, settings: {} },
        { type: "form", content: { fields: [
          { id: "name", type: "text", label: "Full Name", required: true, placeholder: "Your name" },
          { id: "email", type: "email", label: "Email", required: true, placeholder: "your@email.com" },
          { id: "ticket", type: "select", label: "Ticket Type", required: true, placeholder: "Select ticket", options: ["Standard ($299)", "VIP ($499)", "Student ($149)"] },
        ], submitText: "Register Now", successMessage: "You're registered! Check your email for confirmation." }, settings: {} },
      ],
    },
    {
      name: "Pricing",
      description: "Three pricing tiers with feature comparison and FAQ",
      category: "business",
      blocks: [
        { type: "heading", content: { text: "Simple, Transparent Pricing", level: 1 }, settings: { align: "center" } },
        { type: "text", content: { html: "<p>No hidden fees, no surprises. Choose the plan that fits your needs.</p>" }, settings: { align: "center" } },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "columns", content: { columns: [
          { blocks: [
            { id: "pr1", type: "heading", content: { text: "Starter", level: 3 }, settings: { align: "center" } },
            { id: "pr2", type: "text", content: { html: "<p><strong style='font-size:2rem'>$9</strong>/month</p><ul><li>1 website</li><li>10 pages</li><li>Basic templates</li><li>Community support</li></ul>" }, settings: { align: "center" } },
            { id: "pr3", type: "button", content: { text: "Start Free Trial", url: "#", variant: "outline" }, settings: { align: "center" } },
          ] },
          { blocks: [
            { id: "pr4", type: "heading", content: { text: "Professional", level: 3 }, settings: { align: "center" } },
            { id: "pr5", type: "text", content: { html: "<p><strong style='font-size:2rem'>$29</strong>/month</p><ul><li>5 websites</li><li>Unlimited pages</li><li>Custom domain + SSL</li><li>Priority support</li></ul>" }, settings: { align: "center" } },
            { id: "pr6", type: "button", content: { text: "Start Free Trial", url: "#", variant: "primary" }, settings: { align: "center" } },
          ] },
          { blocks: [
            { id: "pr7", type: "heading", content: { text: "Enterprise", level: 3 }, settings: { align: "center" } },
            { id: "pr8", type: "text", content: { html: "<p><strong style='font-size:2rem'>$99</strong>/month</p><ul><li>Unlimited websites</li><li>White-label branding</li><li>API access</li><li>Dedicated manager</li></ul>" }, settings: { align: "center" } },
            { id: "pr9", type: "button", content: { text: "Contact Sales", url: "#", variant: "outline" }, settings: { align: "center" } },
          ] },
        ] }, settings: { gap: "24px" } },
        { type: "spacer", content: { height: 48 }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "accordion", content: { items: [
          { id: "pf1", title: "Can I switch plans at any time?", content: "<p>Yes. Upgrades take effect immediately with prorated billing.</p>" },
          { id: "pf2", title: "Is there a money-back guarantee?", content: "<p>Absolutely. 30-day full refund, no questions asked.</p>" },
          { id: "pf3", title: "Do you offer annual billing?", content: "<p>Yes! Annual billing saves you 20% compared to monthly.</p>" },
        ], style: "bordered", iconPosition: "right" }, settings: {} },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "button", content: { text: "Start Your Free Trial", url: "#", variant: "primary" }, settings: { align: "center" } },
      ],
    },
    {
      name: "Contact",
      description: "Contact page with form, office info, and social links",
      category: "general",
      blocks: [
        { type: "heading", content: { text: "Get in Touch", level: 1 }, settings: { align: "center" } },
        { type: "text", content: { html: "<p>Have a question, feedback, or project in mind? We'd love to hear from you.</p>" }, settings: { align: "center" } },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "form", content: { fields: [
          { id: "name", type: "text", label: "Your Name", required: true, placeholder: "Full name" },
          { id: "email", type: "email", label: "Email Address", required: true, placeholder: "you@example.com" },
          { id: "subject", type: "select", label: "What can we help with?", required: true, placeholder: "Select a topic", options: ["General Inquiry", "Project Consultation", "Technical Support", "Partnership Opportunity"] },
          { id: "message", type: "textarea", label: "Your Message", required: true, placeholder: "Tell us more..." },
        ], submitText: "Send Message", successMessage: "Thank you! We'll get back to you within one business day." }, settings: {} },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
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
        { type: "text", content: { html: "<p>Insights on design, development, and product strategy.</p>" }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "heading", content: { text: "Featured", level: 2 }, settings: {} },
        { type: "heading", content: { text: "How We Reduced Our API Response Time by 60%", level: 3 }, settings: {} },
        { type: "text", content: { html: "<p>Performance isn't just a technical metric — it directly impacts user experience, conversion rates, and search rankings.</p><p><em>February 2026 &bull; 8 min read</em></p>" }, settings: {} },
        { type: "button", content: { text: "Read Article", url: "#", variant: "outline" }, settings: {} },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "heading", content: { text: "Recent Posts", level: 2 }, settings: {} },
        { type: "columns", content: { columns: [
          { blocks: [
            { id: "bi1", type: "heading", content: { text: "Designing for Accessibility", level: 3 }, settings: {} },
            { id: "bi2", type: "text", content: { html: "<p>Accessibility isn't a feature — it's a fundamental aspect of good design.</p><p><em>February 2026 &bull; 6 min</em></p>" }, settings: {} },
          ] },
          { blocks: [
            { id: "bi3", type: "heading", content: { text: "The Case for Boring Technology", level: 3 }, settings: {} },
            { id: "bi4", type: "text", content: { html: "<p>Why we chose proven technologies for our stack — and how it saved us months.</p><p><em>January 2026 &bull; 5 min</em></p>" }, settings: {} },
          ] },
        ] }, settings: { gap: "32px" } },
      ],
    },
    {
      name: "Documentation",
      description: "Documentation page with table of contents, code examples, and navigation",
      category: "support",
      blocks: [
        { type: "heading", content: { text: "Getting Started Guide", level: 1 }, settings: {} },
        { type: "text", content: { html: "<p>Everything you need to set up your first site, build pages, and publish to the web.</p>" }, settings: {} },
        { type: "toc", content: {}, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "heading", content: { text: "Creating Your First Site", level: 2 }, settings: {} },
        { type: "text", content: { html: "<p>After logging in, you'll land on the dashboard. Click <strong>\"New Site\"</strong>, enter a name, and you'll be taken to your page manager.</p>" }, settings: {} },
        { type: "heading", content: { text: "Building Pages with Blocks", level: 2 }, settings: {} },
        { type: "text", content: { html: "<p>Pages are built using <strong>blocks</strong> — modular content elements. The editor provides 15 block types across content, media, layout, and interactive categories.</p>" }, settings: {} },
        { type: "heading", content: { text: "Keyboard Shortcuts", level: 2 }, settings: {} },
        { type: "text", content: { html: "<ul><li><strong>Ctrl/Cmd + S</strong> — Save</li><li><strong>Ctrl/Cmd + Z</strong> — Undo</li><li><strong>Ctrl/Cmd + Shift + Z</strong> — Redo</li><li><strong>Ctrl/Cmd + D</strong> — Duplicate block</li><li><strong>Alt + Arrow</strong> — Move block</li><li><strong>?</strong> — Show shortcuts</li></ul>" }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "button", content: { text: "Contact Support", url: "#", variant: "outline" }, settings: { align: "center" } },
      ],
    },
    {
      name: "Product Launch",
      description: "Product showcase with feature highlights, social proof, pricing tiers, and call-to-action",
      category: "landing",
      blocks: [
        { type: "heading", content: { text: "Ship faster with Launchpad", level: 1 }, settings: { align: "center" } },
        { type: "text", content: { html: "<p>The modern deployment platform for teams who move fast. Push to production in seconds, roll back in one click, and sleep well at night.</p>" }, settings: { align: "center" } },
        { type: "spacer", content: { height: 16 }, settings: {} },
        { type: "button", content: { text: "Start Free Trial", url: "#", variant: "primary" }, settings: { align: "center" } },
        { type: "spacer", content: { height: 48 }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "heading", content: { text: "Why Teams Switch to Launchpad", level: 2 }, settings: { align: "center" } },
        { type: "columns", content: { columns: [
          { blocks: [
            { id: "pl1", type: "heading", content: { text: "Zero-Downtime Deploys", level: 3 }, settings: { align: "center" } },
            { id: "pl2", type: "text", content: { html: "<p>Blue-green deployments out of the box. Your users never see a loading screen during updates.</p>" }, settings: { align: "center" } },
          ] },
          { blocks: [
            { id: "pl3", type: "heading", content: { text: "Built-in Observability", level: 3 }, settings: { align: "center" } },
            { id: "pl4", type: "text", content: { html: "<p>Real-time logs, metrics, and traces in one dashboard. Diagnose issues in minutes, not hours.</p>" }, settings: { align: "center" } },
          ] },
          { blocks: [
            { id: "pl5", type: "heading", content: { text: "Enterprise Security", level: 3 }, settings: { align: "center" } },
            { id: "pl6", type: "text", content: { html: "<p>SOC 2 Type II certified. SSO, audit logs, role-based access, and 99.99% uptime SLA included.</p>" }, settings: { align: "center" } },
          ] },
        ] }, settings: { gap: "32px" } },
        { type: "spacer", content: { height: 48 }, settings: {} },
        { type: "heading", content: { text: "Trusted by 2,000+ Engineering Teams", level: 2 }, settings: { align: "center" } },
        { type: "columns", content: { columns: [
          { blocks: [
            { id: "pl7", type: "quote", content: { text: "We cut our deployment time from 45 minutes to 90 seconds. Launchpad paid for itself in the first week.", attribution: "Sarah Chen, CTO at Streamline", style: "bordered" }, settings: {} },
          ] },
          { blocks: [
            { id: "pl8", type: "quote", content: { text: "The rollback feature alone has saved us from three potential incidents this quarter.", attribution: "Marcus Rivera, Lead SRE at DataPulse", style: "bordered" }, settings: {} },
          ] },
        ] }, settings: { gap: "32px" } },
        { type: "spacer", content: { height: 48 }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "heading", content: { text: "Simple, Transparent Pricing", level: 2 }, settings: { align: "center" } },
        { type: "columns", content: { columns: [
          { blocks: [
            { id: "pl9", type: "heading", content: { text: "Starter — Free", level: 3 }, settings: { align: "center" } },
            { id: "pl10", type: "text", content: { html: "<ul><li>3 projects</li><li>1 team member</li><li>100 deploys/month</li><li>Community support</li></ul>" }, settings: {} },
          ] },
          { blocks: [
            { id: "pl11", type: "heading", content: { text: "Pro — $29/mo", level: 3 }, settings: { align: "center" } },
            { id: "pl12", type: "text", content: { html: "<ul><li>Unlimited projects</li><li>10 team members</li><li>Unlimited deploys</li><li>Priority support</li></ul>" }, settings: {} },
          ] },
          { blocks: [
            { id: "pl13", type: "heading", content: { text: "Enterprise — Custom", level: 3 }, settings: { align: "center" } },
            { id: "pl14", type: "text", content: { html: "<ul><li>Everything in Pro</li><li>SSO & audit logs</li><li>Dedicated SRE</li><li>99.99% SLA</li></ul>" }, settings: {} },
          ] },
        ] }, settings: { gap: "32px" } },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "button", content: { text: "Get Started Free", url: "#", variant: "primary" }, settings: { align: "center" } },
      ],
    },
    {
      name: "Changelog",
      description: "Release notes and product updates with versioned entries and categorized changes",
      category: "blog",
      blocks: [
        { type: "heading", content: { text: "Changelog", level: 1 }, settings: {} },
        { type: "text", content: { html: "<p>All the latest updates, improvements, and fixes. We ship new features every two weeks.</p>" }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "heading", content: { text: "v2.4.0 — February 2026", level: 2 }, settings: {} },
        { type: "text", content: { html: "<p><strong>New</strong></p><ul><li>Dark mode support across all pages</li><li>Bulk page publish/unpublish from dashboard</li><li>RSS feed generation for published sites</li></ul><p><strong>Improved</strong></p><ul><li>Page load time reduced by 40% with optimized queries</li><li>Editor autosave now shows intermediate status</li></ul><p><strong>Fixed</strong></p><ul><li>Form submissions no longer lost on network timeout</li><li>Image lightbox closing animation on mobile</li></ul>" }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "heading", content: { text: "v2.3.0 — January 2026", level: 2 }, settings: {} },
        { type: "text", content: { html: "<p><strong>New</strong></p><ul><li>Table block with headers, rows, and striping</li><li>Custom code injection for analytics scripts</li><li>Page revision history with one-click restore</li></ul><p><strong>Improved</strong></p><ul><li>Template preview now shows all block types</li><li>Search across page content, not just titles</li></ul><p><strong>Fixed</strong></p><ul><li>Slug collision on concurrent page creation</li><li>Schedule button showing wrong variant</li></ul>" }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "heading", content: { text: "v2.2.0 — December 2025", level: 2 }, settings: {} },
        { type: "text", content: { html: "<p><strong>New</strong></p><ul><li>Accordion block with bordered and minimal styles</li><li>Social links block supporting 16 platforms</li><li>SEO audit panel with real-time scoring</li></ul><p><strong>Improved</strong></p><ul><li>Block drag-and-drop reordering is now smoother</li><li>Form validation shows inline errors</li></ul>" }, settings: {} },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "text", content: { html: "<p><em>For older releases, see our <a href=\"#\">full release archive</a>.</em></p>" }, settings: { align: "center" } },
      ],
    },
    {
      name: "Gallery",
      description: "Image gallery with grid layout, captions, and lightbox support",
      category: "portfolio",
      blocks: [
        { type: "heading", content: { text: "Gallery", level: 1 }, settings: { align: "center" } },
        { type: "text", content: { html: "<p>A curated collection of our recent work. Click any image to view it in full size.</p>" }, settings: { align: "center" } },
        { type: "spacer", content: { height: 24 }, settings: {} },
        { type: "heading", content: { text: "Brand Identity", level: 2 }, settings: {} },
        { type: "columns", content: { columns: [
          { blocks: [
            { id: "gl1", type: "image", content: { src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='800' height='600' fill='%23E8E4E0'/%3E%3Ctext x='400' y='290' text-anchor='middle' fill='%23A09890' font-family='sans-serif' font-size='24'%3ELogo Design%3C/text%3E%3Ctext x='400' y='320' text-anchor='middle' fill='%23B8B0A8' font-family='sans-serif' font-size='14'%3EMeridian Health%3C/text%3E%3C/svg%3E", alt: "Brand identity project — logo design", caption: "Logo Design — Meridian Health", width: 800, height: 600 }, settings: { rounded: true } },
          ] },
          { blocks: [
            { id: "gl2", type: "image", content: { src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='800' height='600' fill='%23DED8D2'/%3E%3Ctext x='400' y='290' text-anchor='middle' fill='%23968E86' font-family='sans-serif' font-size='24'%3EColor System%3C/text%3E%3Ctext x='400' y='320' text-anchor='middle' fill='%23AEA69E' font-family='sans-serif' font-size='14'%3EMeridian Health%3C/text%3E%3C/svg%3E", alt: "Brand identity project — color palette", caption: "Color System — Meridian Health", width: 800, height: 600 }, settings: { rounded: true } },
          ] },
          { blocks: [
            { id: "gl3", type: "image", content: { src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='800' height='600' fill='%23D4CCC4'/%3E%3Ctext x='400' y='290' text-anchor='middle' fill='%238C847C' font-family='sans-serif' font-size='24'%3EStationery%3C/text%3E%3Ctext x='400' y='320' text-anchor='middle' fill='%23A49C94' font-family='sans-serif' font-size='14'%3EMeridian Health%3C/text%3E%3C/svg%3E", alt: "Brand identity project — stationery", caption: "Stationery — Meridian Health", width: 800, height: 600 }, settings: { rounded: true } },
          ] },
        ] }, settings: { gap: "16px" } },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "heading", content: { text: "Web Design", level: 2 }, settings: {} },
        { type: "columns", content: { columns: [
          { blocks: [
            { id: "gl4", type: "image", content: { src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='800' height='600' fill='%23E0E4E8'/%3E%3Ctext x='400' y='290' text-anchor='middle' fill='%23909498' font-family='sans-serif' font-size='24'%3EHomepage%3C/text%3E%3Ctext x='400' y='320' text-anchor='middle' fill='%23A8ACB0' font-family='sans-serif' font-size='14'%3ENovaTech%3C/text%3E%3C/svg%3E", alt: "Web design project — homepage mockup", caption: "Homepage — NovaTech", width: 800, height: 600 }, settings: { rounded: true } },
          ] },
          { blocks: [
            { id: "gl5", type: "image", content: { src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='800' height='600' fill='%23D2D8DE'/%3E%3Ctext x='400' y='290' text-anchor='middle' fill='%23868C92' font-family='sans-serif' font-size='24'%3EProduct Page%3C/text%3E%3Ctext x='400' y='320' text-anchor='middle' fill='%239EA4AA' font-family='sans-serif' font-size='14'%3ENovaTech%3C/text%3E%3C/svg%3E", alt: "Web design project — product page", caption: "Product Page — NovaTech", width: 800, height: 600 }, settings: { rounded: true } },
          ] },
        ] }, settings: { gap: "16px" } },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "heading", content: { text: "Photography", level: 2 }, settings: {} },
        { type: "columns", content: { columns: [
          { blocks: [
            { id: "gl6", type: "image", content: { src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='800' height='600' fill='%23E4E8E0'/%3E%3Ctext x='400' y='290' text-anchor='middle' fill='%23949890' font-family='sans-serif' font-size='24'%3EUrban Light%3C/text%3E%3Ctext x='400' y='320' text-anchor='middle' fill='%23ACB0A8' font-family='sans-serif' font-size='14'%3ESeattle%3C/text%3E%3C/svg%3E", alt: "Architecture photography — glass building", caption: "Urban Light — Seattle", width: 800, height: 600 }, settings: { rounded: true } },
          ] },
          { blocks: [
            { id: "gl7", type: "image", content: { src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='800' height='600' fill='%23D8DED2'/%3E%3Ctext x='400' y='290' text-anchor='middle' fill='%238A9084' font-family='sans-serif' font-size='24'%3EMorning Peak%3C/text%3E%3Ctext x='400' y='320' text-anchor='middle' fill='%23A2A89C' font-family='sans-serif' font-size='14'%3ECascades%3C/text%3E%3C/svg%3E", alt: "Landscape photography — mountain vista", caption: "Morning Peak — Cascades", width: 800, height: 600 }, settings: { rounded: true } },
          ] },
          { blocks: [
            { id: "gl8", type: "image", content: { src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='800' height='600' fill='%23E8E0E4'/%3E%3Ctext x='400' y='290' text-anchor='middle' fill='%23989094' font-family='sans-serif' font-size='24'%3EStudio Portrait%3C/text%3E%3Ctext x='400' y='320' text-anchor='middle' fill='%23B0A8AC' font-family='sans-serif' font-size='14'%3EEmma K.%3C/text%3E%3C/svg%3E", alt: "Portrait photography — studio session", caption: "Studio Portrait — Emma K.", width: 800, height: 600 }, settings: { rounded: true } },
          ] },
        ] }, settings: { gap: "16px" } },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "text", content: { html: "<p>Interested in working together? <a href=\"#\">Get in touch</a> to discuss your project.</p>" }, settings: { align: "center" } },
      ],
    },
    {
      name: "Restaurant",
      description: "Restaurant page with menu, opening hours, reservation form, and location",
      category: "business",
      blocks: [
        { type: "heading", content: { text: "The Olive Branch", level: 1 }, settings: { align: "center" } },
        { type: "text", content: { html: "<p>Mediterranean cuisine crafted from locally sourced ingredients. Family-owned since 2008.</p>" }, settings: { align: "center" } },
        { type: "button", content: { text: "Reserve a Table", url: "#reservation", variant: "primary" }, settings: { align: "center" } },
        { type: "spacer", content: { height: 48 }, settings: {} },
        { type: "heading", content: { text: "Our Menu", level: 2 }, settings: { align: "center" } },
        { type: "heading", content: { text: "Starters", level: 3 }, settings: {} },
        { type: "table", content: { headers: ["Dish", "Description", "Price"], rows: [
          ["Bruschetta", "Grilled sourdough, heirloom tomatoes, basil, aged balsamic", "$12"],
          ["Calamari Fritti", "Lightly fried squid, lemon aioli, fresh herbs", "$14"],
          ["Burrata", "Creamy burrata, roasted peppers, olive tapenade", "$16"],
          ["Soup of the Day", "Ask your server for today's seasonal selection", "$10"],
        ], caption: "", striped: true }, settings: {} },
        { type: "heading", content: { text: "Mains", level: 3 }, settings: {} },
        { type: "table", content: { headers: ["Dish", "Description", "Price"], rows: [
          ["Grilled Sea Bass", "Pan-seared with capers, cherry tomatoes, and olive oil", "$28"],
          ["Lamb Tagine", "Slow-braised lamb, apricots, almonds, couscous", "$26"],
          ["Wild Mushroom Risotto", "Arborio rice, porcini, truffle oil, parmesan", "$22"],
          ["Ribeye Steak", "12oz grass-fed, roasted garlic butter, seasonal vegetables", "$34"],
        ], caption: "", striped: true }, settings: {} },
        { type: "heading", content: { text: "Desserts", level: 3 }, settings: {} },
        { type: "table", content: { headers: ["Dish", "Description", "Price"], rows: [
          ["Tiramisu", "Classic espresso-soaked ladyfingers, mascarpone", "$12"],
          ["Panna Cotta", "Vanilla bean, seasonal berry compote", "$10"],
          ["Gelato Selection", "Three scoops of house-made gelato", "$9"],
        ], caption: "", striped: true }, settings: {} },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "heading", content: { text: "Opening Hours", level: 2 }, settings: { align: "center" } },
        { type: "columns", content: { columns: [
          { blocks: [
            { id: "rs1", type: "heading", content: { text: "Lunch", level: 3 }, settings: { align: "center" } },
            { id: "rs2", type: "text", content: { html: "<p>Tuesday \u2013 Sunday<br><strong>11:30 AM \u2013 2:30 PM</strong></p><p>Closed Mondays</p>" }, settings: { align: "center" } },
          ] },
          { blocks: [
            { id: "rs3", type: "heading", content: { text: "Dinner", level: 3 }, settings: { align: "center" } },
            { id: "rs4", type: "text", content: { html: "<p>Tuesday \u2013 Thursday<br><strong>5:30 PM \u2013 9:30 PM</strong></p><p>Friday \u2013 Saturday<br><strong>5:30 PM \u2013 10:30 PM</strong></p>" }, settings: { align: "center" } },
          ] },
          { blocks: [
            { id: "rs5", type: "heading", content: { text: "Sunday Brunch", level: 3 }, settings: { align: "center" } },
            { id: "rs6", type: "text", content: { html: "<p>Every Sunday<br><strong>10:00 AM \u2013 3:00 PM</strong></p><p>Reservations recommended</p>" }, settings: { align: "center" } },
          ] },
        ] }, settings: { gap: "32px" } },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "quote", content: { text: "The best meal I've had in years. The lamb tagine alone is worth the visit.", attribution: "City Dining Magazine", style: "bordered" }, settings: {} },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "heading", content: { text: "Reserve a Table", level: 2 }, settings: {} },
        { type: "form", content: { fields: [
          { id: "name", type: "text", label: "Name", required: true, placeholder: "Your name" },
          { id: "email", type: "email", label: "Email", required: true, placeholder: "your@email.com" },
          { id: "date", type: "text", label: "Preferred Date", required: true, placeholder: "e.g. Friday, March 20" },
          { id: "guests", type: "select", label: "Party Size", required: true, placeholder: "Select", options: ["1-2 guests", "3-4 guests", "5-6 guests", "7+ guests (please call)"] },
          { id: "notes", type: "textarea", label: "Special Requests", required: false, placeholder: "Dietary requirements, celebrations, seating preferences..." },
        ], submitText: "Request Reservation", successMessage: "Thank you! We'll confirm your reservation within 2 hours." }, settings: {} },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "text", content: { html: "<p><strong>The Olive Branch</strong><br>456 Harbor Street, Seaside District<br>Phone: (555) 234-5678</p>" }, settings: { align: "center" } },
        { type: "social", content: { links: [{ platform: "instagram", url: "https://instagram.com" }, { platform: "facebook", url: "https://facebook.com" }] }, settings: { align: "center" } },
      ],
    },
    {
      name: "Resume",
      description: "Professional resume with about section, skills table, experience, and contact form",
      category: "portfolio",
      blocks: [
        { type: "heading", content: { text: "Morgan Blake", level: 1 }, settings: { align: "center" } },
        { type: "text", content: { html: "<p><strong>Full-Stack Developer</strong> &bull; San Francisco, CA</p><p>I build fast, accessible web applications with modern tooling. 6 years of experience across startups and scale-ups, with a focus on React, TypeScript, and Node.js.</p>" }, settings: { align: "center" } },
        { type: "social", content: { links: [
          { platform: "github", url: "https://github.com" },
          { platform: "linkedin", url: "https://linkedin.com" },
          { platform: "twitter", url: "https://twitter.com" },
          { platform: "email", url: "mailto:hello@example.com" },
        ] }, settings: { align: "center" } },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "heading", content: { text: "Skills", level: 2 }, settings: {} },
        { type: "table", content: { headers: ["Category", "Technologies", "Level"], rows: [
          ["Frontend", "React, Next.js, TypeScript, Tailwind CSS, Framer Motion", "Expert"],
          ["Backend", "Node.js, Express, PostgreSQL, Prisma, Redis", "Expert"],
          ["DevOps", "Docker, AWS, CI/CD, Terraform, GitHub Actions", "Advanced"],
          ["Testing", "Playwright, Jest, React Testing Library, Cypress", "Advanced"],
          ["Design", "Figma, CSS Modules, Design Systems, Accessibility (WCAG)", "Intermediate"],
        ], caption: "", striped: true }, settings: {} },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "heading", content: { text: "Experience", level: 2 }, settings: {} },
        { type: "columns", content: { columns: [
          { blocks: [
            { id: "re1", type: "heading", content: { text: "Senior Developer", level: 3 }, settings: {} },
            { id: "re2", type: "text", content: { html: "<p><strong>Streamline Inc.</strong> &bull; 2023 \u2013 Present</p><p>Lead developer on the core product team. Rebuilt the frontend with Next.js App Router, reducing page load times by 55%. Designed and implemented a real-time collaboration system using WebSockets. Mentored 3 junior developers.</p>" }, settings: {} },
          ] },
          { blocks: [
            { id: "re3", type: "heading", content: { text: "Full-Stack Developer", level: 3 }, settings: {} },
            { id: "re4", type: "text", content: { html: "<p><strong>DataPulse</strong> &bull; 2021 \u2013 2023</p><p>Built customer-facing dashboards processing 2M+ events daily. Implemented a query optimization layer that reduced database costs by 40%. Led the migration from REST to GraphQL for the analytics API.</p>" }, settings: {} },
          ] },
        ] }, settings: { gap: "32px" } },
        { type: "columns", content: { columns: [
          { blocks: [
            { id: "re5", type: "heading", content: { text: "Frontend Developer", level: 3 }, settings: {} },
            { id: "re6", type: "text", content: { html: "<p><strong>PixelCraft Agency</strong> &bull; 2019 \u2013 2021</p><p>Developed responsive websites and web apps for 20+ clients across e-commerce, SaaS, and media. Introduced component-driven development and design system practices to the team.</p>" }, settings: {} },
          ] },
          { blocks: [
            { id: "re7", type: "heading", content: { text: "Education", level: 3 }, settings: {} },
            { id: "re8", type: "text", content: { html: "<p><strong>B.S. Computer Science</strong><br>UC Berkeley &bull; 2015 \u2013 2019</p><p>Dean's List. Capstone project: accessible web framework for visually impaired users (awarded Best in Class).</p>" }, settings: {} },
          ] },
        ] }, settings: { gap: "32px" } },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "heading", content: { text: "Selected Projects", level: 2 }, settings: {} },
        { type: "accordion", content: { items: [
          { id: "rp1", title: "Open-Source Design System", content: "<p>A comprehensive React component library with 40+ components, full accessibility support, and CSS Module theming. 1,200+ GitHub stars.</p>" },
          { id: "rp2", title: "Real-Time Analytics Dashboard", content: "<p>Built a WebSocket-powered dashboard visualizing 500K+ events per hour. Used D3.js for custom charts and Redis Streams for event processing.</p>" },
          { id: "rp3", title: "E-Commerce Platform Migration", content: "<p>Led the migration of a $5M ARR e-commerce platform from a monolith to a Next.js frontend with headless CMS. Improved Core Web Vitals scores from 45 to 92.</p>" },
        ], style: "bordered", iconPosition: "right" }, settings: {} },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "heading", content: { text: "Get in Touch", level: 2 }, settings: { align: "center" } },
        { type: "text", content: { html: "<p>Interested in working together? I'm open to full-time roles and select freelance projects.</p>" }, settings: { align: "center" } },
        { type: "form", content: { fields: [
          { id: "name", type: "text", label: "Your Name", required: true, placeholder: "Full name" },
          { id: "email", type: "email", label: "Email", required: true, placeholder: "you@example.com" },
          { id: "message", type: "textarea", label: "Message", required: true, placeholder: "Tell me about the opportunity..." },
        ], submitText: "Send Message", successMessage: "Thanks! I'll get back to you within 24 hours." }, settings: {} },
      ],
    },
    {
      name: "Restaurant & Bar",
      description: "Full restaurant page with hero, menu columns, hours table, reservation form, and location details",
      category: "business",
      blocks: [
        { type: "heading", content: { text: "Ember & Oak Kitchen", level: 1 }, settings: { align: "center" } },
        { type: "text", content: { html: "<p>Wood-fired cooking meets seasonal ingredients. Our chefs work directly with local farms to bring you dishes that celebrate the Pacific Northwest, one plate at a time.</p>" }, settings: { align: "center" } },
        { type: "button", content: { text: "Make a Reservation", url: "#reserve", variant: "primary" }, settings: { align: "center" } },
        { type: "spacer", content: { height: 48 }, settings: {} },
        { type: "heading", content: { text: "The Menu", level: 2 }, settings: { align: "center" } },
        { type: "columns", content: { columns: [
          { blocks: [
            { id: "rb1", type: "heading", content: { text: "Small Plates", level: 3 }, settings: {} },
            { id: "rb2", type: "text", content: { html: "<p><strong>Charred Broccolini</strong> — chili crisp, toasted sesame, lime &bull; $14<br><strong>Tuna Crudo</strong> — yuzu, avocado, shallot, crispy rice &bull; $18<br><strong>Burrata Board</strong> — grilled stone fruit, honey, pistachios, sourdough &bull; $16<br><strong>Duck Confit Croquettes</strong> — fig mostarda, fris\u00e9e salad &bull; $15</p>" }, settings: {} },
          ] },
          { blocks: [
            { id: "rb3", type: "heading", content: { text: "Mains", level: 3 }, settings: {} },
            { id: "rb4", type: "text", content: { html: "<p><strong>Wood-Fired Salmon</strong> — miso glaze, baby bok choy, jasmine rice &bull; $32<br><strong>Dry-Aged Ribeye</strong> — bone marrow butter, roasted fingerlings, gremolata &bull; $48<br><strong>Handmade Pappardelle</strong> — braised short rib rag\u00f9, pecorino, fresh herbs &bull; $28<br><strong>Roasted Half Chicken</strong> — lemon, herbs, grilled vegetables, jus &bull; $26</p>" }, settings: {} },
          ] },
          { blocks: [
            { id: "rb5", type: "heading", content: { text: "Desserts & Drinks", level: 3 }, settings: {} },
            { id: "rb6", type: "text", content: { html: "<p><strong>Burnt Basque Cheesecake</strong> — seasonal compote &bull; $14<br><strong>Dark Chocolate Fondant</strong> — salted caramel, vanilla gelato &bull; $15<br><strong>Affogato</strong> — house espresso, fior di latte &bull; $10</p><p><em>Full cocktail and wine list available at the bar.</em></p>" }, settings: {} },
          ] },
        ] }, settings: { gap: "32px" } },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "heading", content: { text: "Hours & Location", level: 2 }, settings: { align: "center" } },
        { type: "table", content: { headers: ["Day", "Lunch", "Dinner", "Bar"], rows: [
          ["Monday", "Closed", "Closed", "Closed"],
          ["Tuesday \u2013 Thursday", "11:30 AM \u2013 2:30 PM", "5:00 PM \u2013 9:30 PM", "4:00 PM \u2013 11:00 PM"],
          ["Friday \u2013 Saturday", "11:30 AM \u2013 2:30 PM", "5:00 PM \u2013 10:30 PM", "4:00 PM \u2013 12:00 AM"],
          ["Sunday", "10:00 AM \u2013 3:00 PM (Brunch)", "5:00 PM \u2013 9:00 PM", "12:00 PM \u2013 10:00 PM"],
        ], caption: "Kitchen closes 30 minutes before listed times", striped: true }, settings: {} },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "quote", content: { text: "One of the most exciting openings this year. The wood-fired salmon alone is worth a detour.", attribution: "Portland Food & Drink Magazine", style: "bordered" }, settings: {} },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "heading", content: { text: "Reserve Your Table", level: 2 }, settings: {} },
        { type: "form", content: { fields: [
          { id: "name", type: "text", label: "Name", required: true, placeholder: "Your full name" },
          { id: "email", type: "email", label: "Email", required: true, placeholder: "your@email.com" },
          { id: "phone", type: "tel", label: "Phone", required: true, placeholder: "(555) 000-0000" },
          { id: "date", type: "text", label: "Date & Time", required: true, placeholder: "e.g. Saturday, March 22 at 7:00 PM" },
          { id: "party", type: "select", label: "Party Size", required: true, placeholder: "Select", options: ["1\u20132 guests", "3\u20134 guests", "5\u20136 guests", "7\u20138 guests", "9+ (private dining)"] },
          { id: "requests", type: "textarea", label: "Special Requests", required: false, placeholder: "Allergies, celebrations, seating preferences..." },
        ], submitText: "Request Reservation", successMessage: "Thank you! We\u2019ll confirm your reservation by email within 2 hours." }, settings: {} },
        { type: "spacer", content: { height: 24 }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "text", content: { html: "<p><strong>Ember & Oak Kitchen</strong><br>742 Burnside Avenue, Pearl District, Portland OR 97209<br>Phone: (503) 555-0142 &bull; <a href=\"mailto:hello@emberandoak.com\">hello@emberandoak.com</a></p>" }, settings: { align: "center" } },
        { type: "social", content: { links: [{ platform: "instagram", url: "https://instagram.com" }, { platform: "facebook", url: "https://facebook.com" }, { platform: "tiktok", url: "https://tiktok.com" }] }, settings: { align: "center" } },
      ],
    },
    {
      name: "Agency / Studio",
      description: "Creative agency page with hero, services, portfolio, testimonials, team section, and contact form",
      category: "business",
      blocks: [
        { type: "heading", content: { text: "We Build Brands That Move People", level: 1 }, settings: { align: "center" } },
        { type: "text", content: { html: "<p>Nightfall Studio is a multidisciplinary creative agency specializing in brand strategy, digital design, and full-stack development. We partner with ambitious companies to create work that resonates.</p>" }, settings: { align: "center" } },
        { type: "button", content: { text: "See Our Work", url: "#portfolio", variant: "primary" }, settings: { align: "center" } },
        { type: "spacer", content: { height: 48 }, settings: {} },
        { type: "heading", content: { text: "What We Do", level: 2 }, settings: { align: "center" } },
        { type: "columns", content: { columns: [
          { blocks: [
            { id: "ag1", type: "heading", content: { text: "Brand Strategy", level: 3 }, settings: { align: "center" } },
            { id: "ag2", type: "text", content: { html: "<p>We help you articulate who you are and why it matters. From positioning and messaging to visual identity systems, we build brands that stand out in crowded markets.</p>" }, settings: { align: "center" } },
          ] },
          { blocks: [
            { id: "ag3", type: "heading", content: { text: "Digital Design", level: 3 }, settings: { align: "center" } },
            { id: "ag4", type: "text", content: { html: "<p>Websites, applications, and digital products designed for clarity and conversion. Every pixel is intentional, every interaction is considered.</p>" }, settings: { align: "center" } },
          ] },
          { blocks: [
            { id: "ag5", type: "heading", content: { text: "Development", level: 3 }, settings: { align: "center" } },
            { id: "ag6", type: "text", content: { html: "<p>Custom web applications built with React, Next.js, and Node.js. We write clean, maintainable code that scales with your business.</p>" }, settings: { align: "center" } },
          ] },
        ] }, settings: { gap: "32px" } },
        { type: "spacer", content: { height: 48 }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "heading", content: { text: "Selected Work", level: 2 }, settings: { align: "center" } },
        { type: "text", content: { html: "<p>A selection of recent projects across brand identity, web design, and product development.</p>" }, settings: { align: "center" } },
        { type: "columns", content: { columns: [
          { blocks: [
            { id: "ag7", type: "image", content: { src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='800' height='600' fill='%23E2E0EC'/%3E%3Ctext x='400' y='290' text-anchor='middle' fill='%23807EA0' font-family='sans-serif' font-size='24'%3EFinova Rebrand%3C/text%3E%3Ctext x='400' y='320' text-anchor='middle' fill='%23A09EB8' font-family='sans-serif' font-size='14'%3EBrand Identity%3C/text%3E%3C/svg%3E", alt: "Finova brand identity redesign project", caption: "Finova \u2014 Brand Identity Redesign", width: 800, height: 600 }, settings: { rounded: true } },
          ] },
          { blocks: [
            { id: "ag8", type: "image", content: { src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='800' height='600' fill='%23DCE8E4'/%3E%3Ctext x='400' y='290' text-anchor='middle' fill='%23708880' font-family='sans-serif' font-size='24'%3EVerdeGrow App%3C/text%3E%3Ctext x='400' y='320' text-anchor='middle' fill='%2390A8A0' font-family='sans-serif' font-size='14'%3EProduct Design%3C/text%3E%3C/svg%3E", alt: "VerdeGrow mobile app product design", caption: "VerdeGrow \u2014 Product Design & Development", width: 800, height: 600 }, settings: { rounded: true } },
          ] },
        ] }, settings: { gap: "24px" } },
        { type: "columns", content: { columns: [
          { blocks: [
            { id: "ag9", type: "image", content: { src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='800' height='600' fill='%23E8E2DC'/%3E%3Ctext x='400' y='290' text-anchor='middle' fill='%23A09080' font-family='sans-serif' font-size='24'%3ERiviera Hotels%3C/text%3E%3Ctext x='400' y='320' text-anchor='middle' fill='%23B8A898' font-family='sans-serif' font-size='14'%3EWebsite Redesign%3C/text%3E%3C/svg%3E", alt: "Riviera Hotels website redesign", caption: "Riviera Hotels \u2014 Website Redesign", width: 800, height: 600 }, settings: { rounded: true } },
          ] },
          { blocks: [
            { id: "ag10", type: "image", content: { src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='800' height='600' fill='%23E0DCE8'/%3E%3Ctext x='400' y='290' text-anchor='middle' fill='%238880A0' font-family='sans-serif' font-size='24'%3EPulseMetrics%3C/text%3E%3Ctext x='400' y='320' text-anchor='middle' fill='%23A098B8' font-family='sans-serif' font-size='14'%3EDashboard UI%3C/text%3E%3C/svg%3E", alt: "PulseMetrics analytics dashboard design", caption: "PulseMetrics \u2014 Analytics Dashboard", width: 800, height: 600 }, settings: { rounded: true } },
          ] },
        ] }, settings: { gap: "24px" } },
        { type: "spacer", content: { height: 48 }, settings: {} },
        { type: "heading", content: { text: "What Clients Say", level: 2 }, settings: { align: "center" } },
        { type: "accordion", content: { items: [
          { id: "agt1", title: "Finova \u2014 Series B Fintech Startup", content: "<p>\"Nightfall completely transformed our brand. Within three months of launching the new identity, our inbound leads increased by 65%. They understood our market and our audience from day one.\" \u2014 <strong>Rachel Torres, CMO</strong></p>" },
          { id: "agt2", title: "VerdeGrow \u2014 Sustainable Agriculture Platform", content: "<p>\"Working with Nightfall felt like having an in-house design team. They delivered a product that our users genuinely love, and the codebase they handed off is the cleanest we've ever inherited.\" \u2014 <strong>James Whitfield, CTO</strong></p>" },
          { id: "agt3", title: "Riviera Hotels \u2014 Boutique Hotel Group", content: "<p>\"Our new website increased direct bookings by 40% in the first quarter. Nightfall didn't just make it beautiful \u2014 they made it convert.\" \u2014 <strong>Maria Santos, Director of Marketing</strong></p>" },
        ], style: "bordered", iconPosition: "right" }, settings: {} },
        { type: "spacer", content: { height: 48 }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "heading", content: { text: "The Team", level: 2 }, settings: { align: "center" } },
        { type: "columns", content: { columns: [
          { blocks: [
            { id: "agt4", type: "heading", content: { text: "Elena Vasquez", level: 3 }, settings: { align: "center" } },
            { id: "agt5", type: "text", content: { html: "<p><strong>Creative Director</strong><br>15 years in brand strategy and design. Previously at Pentagram and Collins. Leads all creative direction and client relationships.</p>" }, settings: { align: "center" } },
          ] },
          { blocks: [
            { id: "agt6", type: "heading", content: { text: "David Okonkwo", level: 3 }, settings: { align: "center" } },
            { id: "agt7", type: "text", content: { html: "<p><strong>Technical Director</strong><br>Full-stack engineer with a design eye. Built products at Stripe and Vercel. Leads architecture, development, and technical strategy.</p>" }, settings: { align: "center" } },
          ] },
          { blocks: [
            { id: "agt8", type: "heading", content: { text: "Mia Chen", level: 3 }, settings: { align: "center" } },
            { id: "agt9", type: "text", content: { html: "<p><strong>Design Lead</strong><br>Specialist in UI/UX and design systems. 8 years of experience across SaaS, e-commerce, and fintech. Obsessed with accessibility.</p>" }, settings: { align: "center" } },
          ] },
        ] }, settings: { gap: "32px" } },
        { type: "spacer", content: { height: 48 }, settings: {} },
        { type: "heading", content: { text: "Start a Project", level: 2 }, settings: { align: "center" } },
        { type: "text", content: { html: "<p>Tell us about your project and we\u2019ll get back to you within one business day.</p>" }, settings: { align: "center" } },
        { type: "form", content: { fields: [
          { id: "name", type: "text", label: "Your Name", required: true, placeholder: "Full name" },
          { id: "email", type: "email", label: "Work Email", required: true, placeholder: "you@company.com" },
          { id: "company", type: "text", label: "Company", required: false, placeholder: "Your company name" },
          { id: "service", type: "select", label: "What do you need?", required: true, placeholder: "Select a service", options: ["Brand Strategy & Identity", "Website Design & Development", "Product Design", "Full-Service (Brand + Web + Product)"] },
          { id: "budget", type: "select", label: "Budget Range", required: true, placeholder: "Select range", options: ["$10K \u2013 $25K", "$25K \u2013 $50K", "$50K \u2013 $100K", "$100K+"] },
          { id: "details", type: "textarea", label: "Project Details", required: true, placeholder: "Tell us about your goals, timeline, and any relevant context..." },
        ], submitText: "Send Brief", successMessage: "Thank you! We\u2019ll review your brief and respond within one business day." }, settings: {} },
        { type: "social", content: { links: [{ platform: "instagram", url: "https://instagram.com" }, { platform: "dribbble", url: "https://dribbble.com" }, { platform: "twitter", url: "https://twitter.com" }, { platform: "linkedin", url: "https://linkedin.com" }] }, settings: { align: "center" } },
      ],
    },
    {
      name: "SaaS Landing",
      description: "Software product landing page with hero, features, pricing, FAQ, testimonials, and CTA",
      category: "landing",
      blocks: [
        { type: "heading", content: { text: "Turn Customer Feedback into Product Decisions", level: 1 }, settings: { align: "center" } },
        { type: "text", content: { html: "<p>Loopback is the feedback management platform that helps product teams collect, organize, and prioritize user insights \u2014 so you build what actually matters.</p>" }, settings: { align: "center" } },
        { type: "columns", content: { columns: [
          { blocks: [
            { id: "sa1", type: "button", content: { text: "Start Free Trial", url: "#", variant: "primary" }, settings: { align: "center" } },
          ] },
          { blocks: [
            { id: "sa2", type: "button", content: { text: "Watch Demo", url: "#", variant: "outline" }, settings: { align: "center" } },
          ] },
        ] }, settings: { gap: "16px" } },
        { type: "text", content: { html: "<p><em>Free 14-day trial &bull; No credit card required &bull; Cancel anytime</em></p>" }, settings: { align: "center" } },
        { type: "spacer", content: { height: 48 }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "heading", content: { text: "Everything You Need to Close the Feedback Loop", level: 2 }, settings: { align: "center" } },
        { type: "columns", content: { columns: [
          { blocks: [
            { id: "sa3", type: "heading", content: { text: "Centralized Inbox", level: 3 }, settings: { align: "center" } },
            { id: "sa4", type: "text", content: { html: "<p>Aggregate feedback from support tickets, surveys, social media, and in-app widgets into a single searchable feed. No more spreadsheets.</p>" }, settings: { align: "center" } },
          ] },
          { blocks: [
            { id: "sa5", type: "heading", content: { text: "Smart Categorization", level: 3 }, settings: { align: "center" } },
            { id: "sa6", type: "text", content: { html: "<p>AI-powered tagging groups similar requests automatically. Spot trends in minutes, not weeks, and quantify demand for every feature request.</p>" }, settings: { align: "center" } },
          ] },
          { blocks: [
            { id: "sa7", type: "heading", content: { text: "Impact Scoring", level: 3 }, settings: { align: "center" } },
            { id: "sa8", type: "text", content: { html: "<p>Prioritize by revenue impact, user segment, and request frequency. Make data-driven roadmap decisions your whole team can get behind.</p>" }, settings: { align: "center" } },
          ] },
        ] }, settings: { gap: "32px" } },
        { type: "spacer", content: { height: 48 }, settings: {} },
        { type: "heading", content: { text: "Trusted by 1,200+ Product Teams", level: 2 }, settings: { align: "center" } },
        { type: "columns", content: { columns: [
          { blocks: [
            { id: "sa9", type: "quote", content: { text: "Loopback cut our feature prioritization meetings from 2 hours to 20 minutes. We finally have a shared source of truth for what customers want.", attribution: "Priya Sharma, VP Product at ScaleGrid", style: "bordered" }, settings: {} },
          ] },
          { blocks: [
            { id: "sa10", type: "quote", content: { text: "Within the first month, we discovered that our most-requested feature wasn\u2019t even on the roadmap. Loopback paid for itself immediately.", attribution: "Tom Eriksen, Head of Product at Relay", style: "bordered" }, settings: {} },
          ] },
        ] }, settings: { gap: "24px" } },
        { type: "spacer", content: { height: 48 }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "heading", content: { text: "Simple, Predictable Pricing", level: 2 }, settings: { align: "center" } },
        { type: "text", content: { html: "<p>All plans include unlimited feedback collection. No per-seat surprises.</p>" }, settings: { align: "center" } },
        { type: "table", content: { headers: ["Feature", "Starter \u2014 $0/mo", "Growth \u2014 $49/mo", "Scale \u2014 $149/mo"], rows: [
          ["Team members", "Up to 3", "Up to 15", "Unlimited"],
          ["Feedback sources", "2 integrations", "All integrations", "All + custom API"],
          ["AI categorization", "\u2014", "Included", "Included + custom models"],
          ["Roadmap board", "1 public board", "Unlimited boards", "Unlimited + private boards"],
          ["Analytics & reports", "Basic", "Advanced", "Advanced + exports"],
          ["Support", "Community", "Email (24h)", "Priority + Slack channel"],
        ], caption: "", striped: true }, settings: {} },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "button", content: { text: "Start Your Free Trial", url: "#", variant: "primary" }, settings: { align: "center" } },
        { type: "spacer", content: { height: 48 }, settings: {} },
        { type: "heading", content: { text: "Frequently Asked Questions", level: 2 }, settings: { align: "center" } },
        { type: "accordion", content: { items: [
          { id: "saf1", title: "How does the 14-day free trial work?", content: "<p>You get full access to the Growth plan for 14 days. No credit card required. At the end of the trial, you can choose a plan or downgrade to the free Starter tier.</p>" },
          { id: "saf2", title: "Can I import feedback from existing tools?", content: "<p>Yes. We support one-click imports from Intercom, Zendesk, Jira, Productboard, and CSV. Most teams are fully migrated in under an hour.</p>" },
          { id: "saf3", title: "Is my data secure?", content: "<p>Absolutely. Loopback is SOC 2 Type II certified, encrypts all data at rest and in transit, and supports SSO with SAML 2.0. We never sell or share your data.</p>" },
          { id: "saf4", title: "What happens if I exceed my plan limits?", content: "<p>We\u2019ll notify you and give you a 7-day grace period. You can upgrade at any time, and billing is prorated to the day.</p>" },
        ], style: "bordered", iconPosition: "right" }, settings: {} },
        { type: "spacer", content: { height: 48 }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "heading", content: { text: "Ready to Build What Customers Actually Want?", level: 2 }, settings: { align: "center" } },
        { type: "text", content: { html: "<p>Join 1,200+ product teams using Loopback to make better product decisions, faster.</p>" }, settings: { align: "center" } },
        { type: "button", content: { text: "Get Started Free", url: "#", variant: "primary" }, settings: { align: "center" } },
      ],
    },
    {
      name: "Personal / CV",
      description: "Personal portfolio with hero, skills columns, work samples, contact section, and social links",
      category: "portfolio",
      blocks: [
        { type: "heading", content: { text: "Priya Kapoor \u2014 Product Designer", level: 1 }, settings: { align: "center" } },
        { type: "text", content: { html: "<p>I design digital products that simplify complexity. With 7 years of experience across fintech, healthcare, and B2B SaaS, I specialize in turning ambiguous problems into clear, usable interfaces.</p>" }, settings: { align: "center" } },
        { type: "social", content: { links: [
          { platform: "linkedin", url: "https://linkedin.com" },
          { platform: "dribbble", url: "https://dribbble.com" },
          { platform: "twitter", url: "https://twitter.com" },
          { platform: "email", url: "mailto:hello@priyakapoor.design" },
        ] }, settings: { align: "center" } },
        { type: "spacer", content: { height: 48 }, settings: {} },
        { type: "heading", content: { text: "Skills & Experience", level: 2 }, settings: {} },
        { type: "columns", content: { columns: [
          { blocks: [
            { id: "cv1", type: "heading", content: { text: "Design", level: 3 }, settings: {} },
            { id: "cv2", type: "text", content: { html: "<p><strong>UI/UX Design</strong> \u2014 Figma, Sketch, Adobe XD<br><strong>Design Systems</strong> \u2014 Component libraries, tokens, documentation<br><strong>Prototyping</strong> \u2014 Framer, Principle, InVision<br><strong>User Research</strong> \u2014 Interviews, usability testing, surveys</p>" }, settings: {} },
          ] },
          { blocks: [
            { id: "cv3", type: "heading", content: { text: "Technical", level: 3 }, settings: {} },
            { id: "cv4", type: "text", content: { html: "<p><strong>Frontend</strong> \u2014 HTML, CSS, JavaScript, React basics<br><strong>Accessibility</strong> \u2014 WCAG 2.1 AA, screen reader testing<br><strong>Analytics</strong> \u2014 Mixpanel, Amplitude, Hotjar<br><strong>Collaboration</strong> \u2014 Jira, Linear, Notion, Confluence</p>" }, settings: {} },
          ] },
          { blocks: [
            { id: "cv5", type: "heading", content: { text: "Career Timeline", level: 3 }, settings: {} },
            { id: "cv6", type: "text", content: { html: "<p><strong>Senior Product Designer</strong><br>Clearpath Finance \u2022 2023 \u2013 Present</p><p><strong>Product Designer</strong><br>MedBridge Health \u2022 2021 \u2013 2023</p><p><strong>UI/UX Designer</strong><br>Forge Digital \u2022 2019 \u2013 2021</p>" }, settings: {} },
          ] },
        ] }, settings: { gap: "32px" } },
        { type: "spacer", content: { height: 48 }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "heading", content: { text: "Selected Work", level: 2 }, settings: {} },
        { type: "columns", content: { columns: [
          { blocks: [
            { id: "cv7", type: "image", content: { src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='800' height='600' fill='%23E0E6EC'/%3E%3Ctext x='400' y='290' text-anchor='middle' fill='%23708098' font-family='sans-serif' font-size='24'%3EClearpath Dashboard%3C/text%3E%3Ctext x='400' y='320' text-anchor='middle' fill='%2390A0B8' font-family='sans-serif' font-size='14'%3EFinancial Analytics%3C/text%3E%3C/svg%3E", alt: "Clearpath Finance analytics dashboard redesign", caption: "Clearpath Finance \u2014 Analytics Dashboard Redesign", width: 800, height: 600 }, settings: { rounded: true } },
          ] },
          { blocks: [
            { id: "cv8", type: "image", content: { src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='800' height='600' fill='%23E6ECE0'/%3E%3Ctext x='400' y='290' text-anchor='middle' fill='%23809870' font-family='sans-serif' font-size='24'%3EMedBridge App%3C/text%3E%3Ctext x='400' y='320' text-anchor='middle' fill='%23A0B890' font-family='sans-serif' font-size='14'%3EPatient Portal%3C/text%3E%3C/svg%3E", alt: "MedBridge Health patient portal mobile app", caption: "MedBridge Health \u2014 Patient Portal App", width: 800, height: 600 }, settings: { rounded: true } },
          ] },
        ] }, settings: { gap: "24px" } },
        { type: "columns", content: { columns: [
          { blocks: [
            { id: "cv9", type: "heading", content: { text: "Clearpath Finance", level: 3 }, settings: {} },
            { id: "cv10", type: "text", content: { html: "<p>Redesigned the core analytics dashboard for a B2B fintech platform serving 2,000+ financial advisors. Reduced time-to-insight by 40% through simplified navigation and contextual data visualization. Led end-to-end from research through developer handoff.</p>" }, settings: {} },
          ] },
          { blocks: [
            { id: "cv11", type: "heading", content: { text: "MedBridge Health", level: 3 }, settings: {} },
            { id: "cv12", type: "text", content: { html: "<p>Designed the patient-facing mobile app for a telehealth platform. Focused on accessibility for elderly users, achieving WCAG AA compliance. App reached 50K downloads in the first quarter with a 4.8-star rating.</p>" }, settings: {} },
          ] },
        ] }, settings: { gap: "32px" } },
        { type: "spacer", content: { height: 48 }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "heading", content: { text: "Let\u2019s Work Together", level: 2 }, settings: { align: "center" } },
        { type: "text", content: { html: "<p>I\u2019m currently open to full-time product design roles and select freelance engagements. Based in Toronto, open to remote worldwide.</p>" }, settings: { align: "center" } },
        { type: "form", content: { fields: [
          { id: "name", type: "text", label: "Your Name", required: true, placeholder: "Full name" },
          { id: "email", type: "email", label: "Email", required: true, placeholder: "you@company.com" },
          { id: "type", type: "select", label: "Inquiry Type", required: true, placeholder: "Select", options: ["Full-time role", "Freelance project", "Speaking opportunity", "Just saying hello"] },
          { id: "message", type: "textarea", label: "Message", required: true, placeholder: "Tell me about the opportunity..." },
        ], submitText: "Send Message", successMessage: "Thanks for reaching out! I\u2019ll get back to you within 48 hours." }, settings: {} },
      ],
    },
    {
      name: "Conference",
      description: "Conference page with hero, event details, speaker lineup, program schedule, venue info, and registration form",
      category: "event",
      blocks: [
        { type: "heading", content: { text: "Horizon 2026 \u2014 The Future of Product Engineering", level: 1 }, settings: { align: "center" } },
        { type: "text", content: { html: "<p><strong>September 18\u201319, 2026</strong> &bull; The Barbican Centre, London</p><p>Two days of deep-dive talks, hands-on workshops, and honest conversations about building software products that last. 600 attendees. 24 speakers. Zero filler.</p>" }, settings: { align: "center" } },
        { type: "button", content: { text: "Get Your Ticket", url: "#register", variant: "primary" }, settings: { align: "center" } },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "columns", content: { columns: [
          { blocks: [
            { id: "co1", type: "heading", content: { text: "24", level: 2 }, settings: { align: "center" } },
            { id: "co2", type: "text", content: { html: "<p>Speakers from companies like Stripe, Linear, Vercel, and Figma</p>" }, settings: { align: "center" } },
          ] },
          { blocks: [
            { id: "co3", type: "heading", content: { text: "600", level: 2 }, settings: { align: "center" } },
            { id: "co4", type: "text", content: { html: "<p>Product engineers, designers, and leaders from 30+ countries</p>" }, settings: { align: "center" } },
          ] },
          { blocks: [
            { id: "co5", type: "heading", content: { text: "8", level: 2 }, settings: { align: "center" } },
            { id: "co6", type: "text", content: { html: "<p>Hands-on workshops covering systems design, accessibility, and performance</p>" }, settings: { align: "center" } },
          ] },
        ] }, settings: { gap: "24px" } },
        { type: "spacer", content: { height: 48 }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "heading", content: { text: "Program", level: 2 }, settings: { align: "center" } },
        { type: "accordion", content: { items: [
          { id: "cop1", title: "Day 1 \u2014 September 18: Foundations", content: "<p><strong>9:00 AM</strong> \u2014 Doors Open & Registration<br><strong>10:00 AM</strong> \u2014 Opening Keynote: \"Why Most Product Roadmaps Fail\" \u2014 Anya Petrova, CPO at Linear<br><strong>11:00 AM</strong> \u2014 \"Designing for the Edge: Building Resilient UIs\" \u2014 James Park, Staff Engineer at Vercel<br><strong>12:00 PM</strong> \u2014 Lunch + Networking<br><strong>1:30 PM</strong> \u2014 Workshop Track A: \"Performance Budgets in Practice\" / Track B: \"Design Systems at Scale\"<br><strong>3:30 PM</strong> \u2014 \"Accessibility Is Not a Feature\" \u2014 Dr. Sarah Lim, A11y Lead at Figma<br><strong>4:30 PM</strong> \u2014 Lightning Talks (5 speakers, 8 minutes each)<br><strong>6:00 PM</strong> \u2014 Welcome Reception & Drinks</p>" },
          { id: "cop2", title: "Day 2 \u2014 September 19: Scaling", content: "<p><strong>9:30 AM</strong> \u2014 \"From Monolith to Modules: A Migration Story\" \u2014 Carlos Mendez, Platform Lead at Stripe<br><strong>10:30 AM</strong> \u2014 Panel: \"The Product Engineer Role: Hype or Here to Stay?\"<br><strong>11:30 AM</strong> \u2014 Workshop Track A: \"Building with AI Responsibly\" / Track B: \"Testing Strategies That Actually Work\"<br><strong>12:30 PM</strong> \u2014 Lunch + Open Spaces<br><strong>2:00 PM</strong> \u2014 \"Observability-Driven Development\" \u2014 Nina Okoro, SRE Director at Datadog<br><strong>3:00 PM</strong> \u2014 \"What I Learned Shipping to 10M Users\" \u2014 Raj Patel, Co-Founder of Notion<br><strong>4:00 PM</strong> \u2014 Closing Keynote: \"Craft, Care, and the Long Game\" \u2014 Lara Hogan<br><strong>5:00 PM</strong> \u2014 Closing & Farewell</p>" },
        ], style: "bordered", iconPosition: "right" }, settings: {} },
        { type: "spacer", content: { height: 48 }, settings: {} },
        { type: "heading", content: { text: "Featured Speakers", level: 2 }, settings: { align: "center" } },
        { type: "columns", content: { columns: [
          { blocks: [
            { id: "co7", type: "heading", content: { text: "Anya Petrova", level: 3 }, settings: { align: "center" } },
            { id: "co8", type: "text", content: { html: "<p><strong>CPO, Linear</strong><br>Former PM at Spotify and Airbnb. Anya leads product strategy at Linear and speaks globally about roadmap culture and product-led growth.</p>" }, settings: { align: "center" } },
          ] },
          { blocks: [
            { id: "co9", type: "heading", content: { text: "Dr. Sarah Lim", level: 3 }, settings: { align: "center" } },
            { id: "co10", type: "text", content: { html: "<p><strong>Accessibility Lead, Figma</strong><br>PhD in Human-Computer Interaction. Sarah has shaped accessibility standards at two of the world\u2019s most-used design tools.</p>" }, settings: { align: "center" } },
          ] },
          { blocks: [
            { id: "co11", type: "heading", content: { text: "Carlos Mendez", level: 3 }, settings: { align: "center" } },
            { id: "co12", type: "text", content: { html: "<p><strong>Platform Lead, Stripe</strong><br>10 years at Stripe, leading the migration from a monolithic Ruby app to a modular service architecture serving billions of API calls.</p>" }, settings: { align: "center" } },
          ] },
        ] }, settings: { gap: "32px" } },
        { type: "spacer", content: { height: 48 }, settings: {} },
        { type: "divider", content: {}, settings: { style: "solid" } },
        { type: "heading", content: { text: "Venue & Travel", level: 2 }, settings: {} },
        { type: "text", content: { html: "<p><strong>The Barbican Centre</strong><br>Silk Street, London EC2Y 8DS, United Kingdom</p><p>Located in the heart of the City of London, the Barbican is one of Europe\u2019s premier arts and conference venues. It\u2019s a 5-minute walk from Barbican and Moorgate tube stations, with excellent connections to all major London rail terminals.</p><p><strong>Hotels:</strong> We\u2019ve arranged discounted rates at the Crowne Plaza London (5 min walk) and the South Place Hotel (8 min walk). Use code <strong>HORIZON26</strong> when booking.</p>" }, settings: {} },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "heading", content: { text: "Tickets", level: 2 }, settings: {} },
        { type: "table", content: { headers: ["Ticket Type", "Price", "What\u2019s Included"], rows: [
          ["Early Bird", "\u00a3299", "Full conference access, lunch & refreshments, welcome reception, recordings"],
          ["Standard", "\u00a3449", "Full conference access, lunch & refreshments, welcome reception, recordings"],
          ["Workshop Pass", "\u00a3599", "Everything in Standard + access to all 4 hands-on workshops (limited to 30 per session)"],
          ["Student", "\u00a3149", "Full conference access, lunch & refreshments (valid student ID required)"],
        ], caption: "All prices exclude VAT. Group discounts available for 5+ tickets.", striped: true }, settings: {} },
        { type: "spacer", content: { height: 32 }, settings: {} },
        { type: "heading", content: { text: "Register", level: 2 }, settings: {} },
        { type: "form", content: { fields: [
          { id: "name", type: "text", label: "Full Name", required: true, placeholder: "Your name" },
          { id: "email", type: "email", label: "Email", required: true, placeholder: "you@company.com" },
          { id: "company", type: "text", label: "Company", required: false, placeholder: "Company name" },
          { id: "role", type: "text", label: "Job Title", required: false, placeholder: "e.g. Senior Engineer" },
          { id: "ticket", type: "select", label: "Ticket Type", required: true, placeholder: "Select ticket", options: ["Early Bird (\u00a3299)", "Standard (\u00a3449)", "Workshop Pass (\u00a3599)", "Student (\u00a3149)"] },
          { id: "dietary", type: "select", label: "Dietary Requirements", required: false, placeholder: "Select if applicable", options: ["None", "Vegetarian", "Vegan", "Gluten-free", "Halal", "Kosher", "Other (specify in notes)"] },
          { id: "notes", type: "textarea", label: "Notes", required: false, placeholder: "Accessibility needs, workshop preferences, or anything else..." },
        ], submitText: "Complete Registration", successMessage: "You\u2019re registered for Horizon 2026! Check your email for your confirmation and ticket details." }, settings: {} },
        { type: "spacer", content: { height: 24 }, settings: {} },
        { type: "social", content: { links: [{ platform: "twitter", url: "https://twitter.com" }, { platform: "linkedin", url: "https://linkedin.com" }, { platform: "youtube", url: "https://youtube.com" }] }, settings: { align: "center" } },
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
  console.log("Upserted", templates.length, "system templates");

  // ──────────────────────────────────────────────
  // 4. Create demo site: "Atlas Creative"
  // ──────────────────────────────────────────────
  const site = await prisma.site.create({
    data: {
      name: "Atlas Creative",
      slug: "atlas-studio",
      description: "A design & development studio crafting exceptional digital experiences",
      userId: user.id,
      theme: {
        colors: {
          primary: "#4F46E5",
          background: "#FAFAF9",
          surface: "#FFFFFF",
          text: "#1C1917",
        },
        fontPreset: "modern",
      },
      footer: {
        style: "columns",
        brandName: "Atlas Creative",
        description: "Design & development studio crafting exceptional digital experiences.",
        columns: [
          {
            title: "Pages",
            links: [
              { label: "Home", url: "/s/atlas-studio" },
              { label: "About", url: "/s/atlas-studio/about" },
              { label: "Services", url: "/s/atlas-studio/services" },
              { label: "Journal", url: "/s/atlas-studio/journal" },
              { label: "Contact", url: "/s/atlas-studio/contact" },
              { label: "Gallery", url: "/s/atlas-studio/gallery" },
            ],
          },
          {
            title: "Connect",
            links: [
              { label: "Twitter", url: "https://twitter.com" },
              { label: "GitHub", url: "https://github.com" },
              { label: "LinkedIn", url: "https://linkedin.com" },
              { label: "Dribbble", url: "https://dribbble.com" },
            ],
          },
        ],
        social: [
          { platform: "twitter", url: "https://twitter.com" },
          { platform: "github", url: "https://github.com" },
          { platform: "linkedin", url: "https://linkedin.com" },
        ],
        showBranding: true,
      },
    },
  });
  console.log("Created site:", site.name, `(/s/${site.slug})`);

  // ──────────────────────────────────────────────
  // 5. PAGE 1 — Homepage (showcase of ALL 15 block types)
  // ──────────────────────────────────────────────
  const homePage = await prisma.page.create({
    data: {
      title: "Home",
      slug: "home",
      isHomepage: true,
      status: "PUBLISHED",
      publishedAt: new Date(),
      showInNav: true,
      siteId: site.id,
      sortOrder: 0,
      metaTitle: "Atlas Creative — Design & Development Studio",
    },
  });

  const homeBlocks = [
    // ── HERO ──
    {
      type: "heading",
      content: { text: "We Craft Digital Experiences That Matter", level: 1 },
      settings: { align: "center", marginBottom: "8px" },
    },
    {
      type: "text",
      content: {
        html: '<p>Atlas Creative is a design and development studio that partners with ambitious companies to build products people love. From <strong>brand identity</strong> to <em>full-stack applications</em>, we bring ideas to life with precision and care. <a href="/s/atlas-studio/about">Learn more about us</a>.</p><ul><li>Strategy &amp; Research</li><li>Design &amp; Branding</li><li>Full-Stack Engineering</li></ul>',
      },
      settings: { align: "center" },
    },
    {
      type: "columns",
      content: {
        columns: [
          {
            blocks: [
              { id: "hero-btn1", type: "button", content: { text: "Explore Our Work", url: "/s/atlas-studio/services", variant: "primary" }, settings: { align: "center", size: "lg" } },
            ],
          },
          {
            blocks: [
              { id: "hero-btn2", type: "button", content: { text: "Get in Touch", url: "/s/atlas-studio/contact", variant: "outline" }, settings: { align: "center", size: "lg" } },
            ],
          },
        ],
      },
      settings: { gap: "24px" },
    },
    {
      type: "spacer",
      content: { height: 48 },
      settings: {},
    },

    // ── TABLE OF CONTENTS ──
    {
      type: "toc",
      content: { maxDepth: 3, style: "boxed", ordered: false },
      settings: { marginBottom: "16px" },
    },

    // ── WHAT WE DO ──
    {
      type: "divider",
      content: {},
      settings: { style: "solid" },
    },
    {
      type: "heading",
      content: { text: "What We Do", level: 2 },
      settings: { align: "center", marginTop: "32px" },
    },
    {
      type: "text",
      content: {
        html: "<p>We combine strategic thinking with world-class execution across three disciplines. Every engagement starts with understanding your goals and ends with measurable results.</p>",
      },
      settings: { align: "center", marginBottom: "24px" },
    },
    {
      type: "columns",
      content: {
        columns: [
          {
            blocks: [
              { id: "svc1", type: "heading", content: { text: "Strategy & Research", level: 3 }, settings: { align: "center" } },
              { id: "svc2", type: "text", content: { html: "<p>User research, competitive analysis, and product strategy that align your business goals with real user needs. We uncover the insights that drive smart design decisions.</p>" }, settings: { align: "center" } },
            ],
          },
          {
            blocks: [
              { id: "svc3", type: "heading", content: { text: "Design & Branding", level: 3 }, settings: { align: "center" } },
              { id: "svc4", type: "text", content: { html: "<p>Visual identity, UI/UX design, and design systems that scale. We create cohesive brand experiences across every touchpoint — from your website to your product.</p>" }, settings: { align: "center" } },
            ],
          },
          {
            blocks: [
              { id: "svc5", type: "heading", content: { text: "Engineering", level: 3 }, settings: { align: "center" } },
              { id: "svc6", type: "text", content: { html: "<p>Full-stack development with React, Next.js, and Node.js. We build performant, accessible, and maintainable applications that stand the test of time.</p>" }, settings: { align: "center" } },
            ],
          },
        ],
      },
      settings: { gap: "32px" },
    },

    // ── STATS ──
    {
      type: "spacer",
      content: { height: 32 },
      settings: {},
    },
    {
      type: "heading",
      content: { text: "By the Numbers", level: 2 },
      settings: { align: "center" },
    },
    {
      type: "columns",
      content: {
        columns: [
          {
            blocks: [
              { id: "st1", type: "heading", content: { text: "120+", level: 2 }, settings: { align: "center" } },
              { id: "st2", type: "text", content: { html: "<p>Projects delivered for clients across 14 countries, from startups to Fortune 500 companies</p>" }, settings: { align: "center" } },
            ],
          },
          {
            blocks: [
              { id: "st3", type: "heading", content: { text: "98%", level: 2 }, settings: { align: "center" } },
              { id: "st4", type: "text", content: { html: "<p>Client satisfaction rate, with most engagements leading to ongoing partnerships and referrals</p>" }, settings: { align: "center" } },
            ],
          },
          {
            blocks: [
              { id: "st5", type: "heading", content: { text: "15", level: 2 }, settings: { align: "center" } },
              { id: "st6", type: "text", content: { html: "<p>Designers, engineers, and strategists — a senior team with an average of 10 years of experience</p>" }, settings: { align: "center" } },
            ],
          },
        ],
      },
      settings: { gap: "24px" },
    },

    // ── TESTIMONIALS (3 quote styles) ──
    {
      type: "divider",
      content: {},
      settings: { style: "dashed" },
    },
    {
      type: "heading",
      content: { text: "What Our Clients Say", level: 2 },
      settings: { align: "center" },
    },
    {
      type: "quote",
      content: {
        text: "Atlas Creative transformed our digital presence. They took the time to understand our business, challenged our assumptions, and delivered a product that exceeded every expectation. The attention to detail is remarkable.",
        attribution: "Elena Vasquez, CEO of Meridian Health",
        style: "filled",
      },
      settings: {},
    },
    {
      type: "quote",
      content: {
        text: "Working with Atlas is like having a world-class product team on speed dial. They don't just execute — they think strategically about what will actually move the needle for your business.",
        attribution: "Marcus Chen, Founder of CloudSync",
        style: "bordered",
      },
      settings: {},
    },
    {
      type: "quote",
      content: {
        text: "The quality of engineering was outstanding. Clean code, excellent test coverage, and documentation that made the handoff seamless. Our internal team was up to speed within days.",
        attribution: "Priya Nair, VP Engineering at Novabank",
        style: "default",
      },
      settings: {},
    },

    // ── OUR PROCESS (Accordion) ──
    {
      type: "spacer",
      content: { height: 32 },
      settings: {},
    },
    {
      type: "heading",
      content: { text: "Our Process", level: 2 },
      settings: { align: "center" },
    },
    {
      type: "text",
      content: {
        html: "<p>Every project follows a proven four-phase process. This structure keeps things on track while leaving room for creative exploration.</p>",
      },
      settings: { align: "center", marginBottom: "16px" },
    },
    {
      type: "accordion",
      content: {
        items: [
          {
            id: "proc1",
            title: "1. Discovery & Strategy",
            content: "<p>We begin with deep research: stakeholder interviews, user analysis, competitive auditing, and technical assessment. This phase produces a clear project brief, success metrics, and a realistic timeline.</p>",
          },
          {
            id: "proc2",
            title: "2. Design & Prototype",
            content: "<p>Armed with insights, we move into design. Wireframes establish structure, visual designs bring personality, and interactive prototypes let you experience the product before a single line of code is written.</p>",
          },
          {
            id: "proc3",
            title: "3. Build & Iterate",
            content: "<p>Development happens in focused sprints. We ship working features early and often, testing with real users along the way. Our engineering practices prioritize clean code, automated testing, and thorough documentation.</p>",
          },
          {
            id: "proc4",
            title: "4. Launch & Evolve",
            content: "<p>Launch is just the beginning. We handle deployment, performance monitoring, and post-launch optimization. Every project includes 30 days of dedicated support.</p>",
          },
        ],
        style: "bordered",
        iconPosition: "right",
      },
      settings: {},
    },

    // ── FEATURED PROJECT (Image) ──
    {
      type: "spacer",
      content: { height: 32 },
      settings: {},
    },
    {
      type: "heading",
      content: { text: "Featured Project", level: 2 },
      settings: { align: "center" },
    },
    {
      type: "image",
      content: {
        src: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=600&fit=crop&q=80",
        alt: "Modern analytics dashboard showing clean data visualization with charts and metrics on a laptop screen",
        caption: "CloudSync — Redesigned analytics dashboard delivering 35% faster task completion",
        link: "/s/atlas-studio/services",
      },
      settings: { align: "center", rounded: true, shadow: true },
    },

    // ── TECH (Code Snippet) ──
    {
      type: "spacer",
      content: { height: 24 },
      settings: {},
    },
    {
      type: "heading",
      content: { text: "Tech We Use", level: 2 },
      settings: {},
    },
    {
      type: "code",
      content: {
        code: `// Modern React with Server Components
import { db } from "@/lib/db";
import { BlockRenderer } from "@/components/BlockRenderer";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const project = await db.project.findUniqueOrThrow({
    where: { slug },
    include: { blocks: { orderBy: { sortOrder: "asc" } } },
  });

  return (
    <article>
      <h1>{project.title}</h1>
      <BlockRenderer blocks={project.blocks} />
    </article>
  );
}`,
        language: "html",
        displayMode: "snippet",
        snippetLanguage: "typescript",
      },
      settings: {},
    },

    // ── PROJECT HIGHLIGHTS (Table) ──
    {
      type: "spacer",
      content: { height: 24 },
      settings: {},
    },
    {
      type: "heading",
      content: { text: "Project Highlights", level: 2 },
      settings: { align: "center" },
    },
    {
      type: "table",
      content: {
        headers: ["Project", "Industry", "Timeline", "Key Result"],
        rows: [
          ["Meridian Health App", "Healthcare", "12 weeks", "+40% user engagement"],
          ["CloudSync Dashboard", "SaaS / B2B", "10 weeks", "-35% task completion time"],
          ["Novabank Rebrand", "Finance", "8 weeks", "+40% brand recognition"],
          ["Terraform Academy", "Education", "14 weeks", "50K learners in month one"],
          ["PulseMetrics", "Analytics", "16 weeks", "3x data processing speed"],
        ],
        striped: true,
        caption: "Selected projects from 2024-2025",
      },
      settings: {},
    },

    // ── VIDEO EMBED ──
    {
      type: "spacer",
      content: { height: 32 },
      settings: {},
    },
    {
      type: "heading",
      content: { text: "Watch Our Showreel", level: 2 },
      settings: { align: "center" },
    },
    {
      type: "video",
      content: {
        url: "https://www.youtube.com/watch?v=67LPFnBb6GA",
        provider: "youtube",
      },
      settings: { aspectRatio: "16/9" },
    },

    // ── CONTACT FORM ──
    {
      type: "spacer",
      content: { height: 32 },
      settings: {},
    },
    {
      type: "heading",
      content: { text: "Get in Touch", level: 2 },
      settings: { align: "center" },
    },
    {
      type: "form",
      content: {
        fields: [
          { id: "name", type: "text", label: "Your Name", required: true, placeholder: "Full name" },
          { id: "email", type: "email", label: "Email Address", required: true, placeholder: "you@example.com" },
          { id: "budget", type: "select", label: "Project Budget", required: false, placeholder: "Select a range", options: ["Under $10K", "$10K – $25K", "$25K – $50K", "$50K – $100K", "$100K+"] },
          { id: "message", type: "textarea", label: "Tell Us About Your Project", required: true, placeholder: "What are you building? What problem are you solving?" },
        ],
        submitText: "Send Message",
        successMessage: "Thank you! We've received your message and will get back to you within one business day.",
      },
      settings: {},
    },

    // ── SOCIAL (icons + pills) ──
    {
      type: "spacer",
      content: { height: 24 },
      settings: {},
    },
    {
      type: "heading",
      content: { text: "Follow Us", level: 3 },
      settings: { align: "center" },
    },
    {
      type: "social",
      content: {
        links: [
          { platform: "twitter", url: "https://twitter.com" },
          { platform: "github", url: "https://github.com" },
          { platform: "linkedin", url: "https://linkedin.com" },
          { platform: "dribbble", url: "https://dribbble.com" },
        ],
        style: "icons",
      },
      settings: { align: "center" },
    },
    {
      type: "spacer",
      content: { height: 16 },
      settings: {},
    },
    {
      type: "social",
      content: {
        links: [
          { platform: "twitter", url: "https://twitter.com" },
          { platform: "github", url: "https://github.com" },
          { platform: "linkedin", url: "https://linkedin.com" },
          { platform: "dribbble", url: "https://dribbble.com" },
        ],
        style: "pills",
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
  console.log("Created homepage with", homeBlocks.length, "blocks (all 15 block types)");

  // ──────────────────────────────────────────────
  // 6. PAGE 2 — About
  // ──────────────────────────────────────────────
  const aboutPage = await prisma.page.create({
    data: {
      title: "About",
      slug: "about",
      status: "PUBLISHED",
      publishedAt: new Date(),
      showInNav: true,
      siteId: site.id,
      sortOrder: 1,
      metaTitle: "About — Atlas Creative",
    },
  });

  const aboutBlocks = [
    {
      type: "heading",
      content: { text: "We Build Things That Last", level: 1 },
      settings: { align: "center" },
    },
    {
      type: "text",
      content: {
        html: "<p>Atlas Creative was founded in 2020 with a simple conviction: the best digital products come from teams that care as much about craft as they do about outcomes.</p>",
      },
      settings: { align: "center" },
    },
    {
      type: "spacer",
      content: { height: 48 },
      settings: {},
    },
    {
      type: "columns",
      content: {
        columns: [
          {
            blocks: [
              { id: "ab-h1", type: "heading", content: { text: "Our Story", level: 2 }, settings: {} },
              { id: "ab-t1", type: "text", content: { html: "<p>It started with a frustration. Our founders, Elena and Marcus, were building products at different companies and kept hitting the same wall: great ideas compromised by rushed execution, beautiful designs undermined by poor engineering.</p><p>They believed a small, senior team could do better work than agencies ten times their size. Atlas Creative launched with three people, a handful of clients, and a commitment to proving that thesis.</p>" }, settings: {} },
            ],
          },
          {
            blocks: [
              { id: "ab-h2", type: "heading", content: { text: "Our Vision", level: 2 }, settings: {} },
              { id: "ab-t2", type: "text", content: { html: "<p>Five years later, we've partnered with over 120 companies across 14 countries. Our work has been recognized by Awwwards, CSS Design Awards, and featured in design publications worldwide.</p><p>More importantly, our client retention rate sits at 89% — because we build relationships, not just products.</p>" }, settings: {} },
            ],
          },
        ],
      },
      settings: { gap: "32px" },
    },
    {
      type: "quote",
      content: {
        text: "We don't just hire talented people — we hire people who genuinely care about the work. That's the difference between a team and a group of contractors.",
        attribution: "Elena Vasquez, CEO",
        style: "filled",
      },
      settings: {},
    },
    {
      type: "spacer",
      content: { height: 32 },
      settings: {},
    },
    {
      type: "heading",
      content: { text: "Our Values", level: 2 },
      settings: { align: "center" },
    },
    {
      type: "columns",
      content: {
        columns: [
          {
            blocks: [
              { id: "val1", type: "heading", content: { text: "Simplicity Is Hard", level: 3 }, settings: { align: "center" } },
              { id: "val2", type: "text", content: { html: "<p>Anyone can add complexity. The real skill is removing it. We obsess over making things feel effortless — even when the underlying problem is deeply complex.</p>" }, settings: { align: "center" } },
            ],
          },
          {
            blocks: [
              { id: "val3", type: "heading", content: { text: "Details Compound", level: 3 }, settings: { align: "center" } },
              { id: "val4", type: "text", content: { html: "<p>A pixel here, a millisecond there — small choices accumulate into the difference between good and exceptional. We sweat the small stuff because it's never actually small.</p>" }, settings: { align: "center" } },
            ],
          },
          {
            blocks: [
              { id: "val5", type: "heading", content: { text: "Honesty Wins", level: 3 }, settings: { align: "center" } },
              { id: "val6", type: "text", content: { html: "<p>We'll tell you if your idea needs rethinking. We'll flag risks early. We'll admit when we're wrong. Radical honesty builds trust, and trust builds great products.</p>" }, settings: { align: "center" } },
            ],
          },
        ],
      },
      settings: { gap: "32px" },
    },
    {
      type: "spacer",
      content: { height: 48 },
      settings: {},
    },
    {
      type: "heading",
      content: { text: "The Team", level: 2 },
      settings: { align: "center" },
    },
    {
      type: "columns",
      content: {
        columns: [
          {
            blocks: [
              { id: "tm1", type: "heading", content: { text: "Elena Vasquez", level: 3 }, settings: { align: "center" } },
              { id: "tm2", type: "text", content: { html: "<p><strong>CEO & Co-Founder</strong></p><p>Former design lead at Stripe. 12 years in product design. Believes the best tools are invisible.</p>" }, settings: { align: "center" } },
            ],
          },
          {
            blocks: [
              { id: "tm3", type: "heading", content: { text: "Marcus Chen", level: 3 }, settings: { align: "center" } },
              { id: "tm4", type: "text", content: { html: "<p><strong>CTO & Co-Founder</strong></p><p>Full-stack engineer and open-source contributor. Author of two technical books on web performance.</p>" }, settings: { align: "center" } },
            ],
          },
          {
            blocks: [
              { id: "tm5", type: "heading", content: { text: "Priya Nair", level: 3 }, settings: { align: "center" } },
              { id: "tm6", type: "text", content: { html: "<p><strong>Head of Design</strong></p><p>Brand strategist with a background in typography and motion design. Previously built design systems at Figma.</p>" }, settings: { align: "center" } },
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
      type: "button",
      content: { text: "View Open Positions", url: "/s/atlas-studio/contact", variant: "primary" },
      settings: { align: "center" },
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
  console.log("Created About page with", aboutBlocks.length, "blocks");

  // ──────────────────────────────────────────────
  // 7. PAGE 3 — Services
  // ──────────────────────────────────────────────
  const servicesPage = await prisma.page.create({
    data: {
      title: "Services",
      slug: "services",
      status: "PUBLISHED",
      publishedAt: new Date(),
      showInNav: true,
      siteId: site.id,
      sortOrder: 2,
      metaTitle: "Services — Atlas Creative",
    },
  });

  const servicesBlocks = [
    {
      type: "heading",
      content: { text: "What We Can Build Together", level: 1 },
      settings: { align: "center" },
    },
    {
      type: "text",
      content: {
        html: "<p>We offer end-to-end product design and development services. Every engagement is tailored to your specific goals, timeline, and budget.</p>",
      },
      settings: { align: "center" },
    },
    {
      type: "spacer",
      content: { height: 48 },
      settings: {},
    },
    {
      type: "columns",
      content: {
        columns: [
          {
            blocks: [
              { id: "sv1", type: "heading", content: { text: "Brand & Identity", level: 3 }, settings: { align: "center" } },
              { id: "sv2", type: "text", content: { html: "<p>Logo design, visual identity, brand guidelines, and design systems that give your company a cohesive, memorable presence.</p><p><strong>Starting at $8,000</strong></p>" }, settings: { align: "center" } },
            ],
          },
          {
            blocks: [
              { id: "sv3", type: "heading", content: { text: "Web Design & Dev", level: 3 }, settings: { align: "center" } },
              { id: "sv4", type: "text", content: { html: "<p>Marketing sites, landing pages, and content platforms. Responsive, fast, accessible, and built to convert.</p><p><strong>Starting at $12,000</strong></p>" }, settings: { align: "center" } },
            ],
          },
          {
            blocks: [
              { id: "sv5", type: "heading", content: { text: "Product Design", level: 3 }, settings: { align: "center" } },
              { id: "sv6", type: "text", content: { html: "<p>End-to-end UX/UI for SaaS products, mobile apps, and internal tools. User research, wireframing, and prototyping.</p><p><strong>Starting at $15,000</strong></p>" }, settings: { align: "center" } },
            ],
          },
        ],
      },
      settings: { gap: "32px" },
    },
    {
      type: "spacer",
      content: { height: 24 },
      settings: {},
    },
    {
      type: "columns",
      content: {
        columns: [
          {
            blocks: [
              { id: "sv7", type: "heading", content: { text: "Full-Stack Development", level: 3 }, settings: { align: "center" } },
              { id: "sv8", type: "text", content: { html: "<p>Custom web applications, APIs, and integrations. React, Next.js, Node.js, PostgreSQL, and cloud infrastructure.</p><p><strong>Starting at $20,000</strong></p>" }, settings: { align: "center" } },
            ],
          },
          {
            blocks: [
              { id: "sv9", type: "heading", content: { text: "Consulting & Audits", level: 3 }, settings: { align: "center" } },
              { id: "sv10", type: "text", content: { html: "<p>Design system audits, accessibility reviews, performance optimization, and technical architecture consulting.</p><p><strong>$250/hour</strong></p>" }, settings: { align: "center" } },
            ],
          },
          {
            blocks: [
              { id: "sv11", type: "heading", content: { text: "Retainer Partnership", level: 3 }, settings: { align: "center" } },
              { id: "sv12", type: "text", content: { html: "<p>Ongoing design and development support. A dedicated team that knows your product inside out.</p><p><strong>From $5,000/month</strong></p>" }, settings: { align: "center" } },
            ],
          },
        ],
      },
      settings: { gap: "32px" },
    },
    {
      type: "spacer",
      content: { height: 24 },
      settings: {},
    },
    {
      type: "divider",
      content: {},
      settings: { style: "dotted" },
    },
    {
      type: "heading",
      content: { text: "Feature Comparison", level: 2 },
      settings: { align: "center", marginTop: "32px" },
    },
    {
      type: "table",
      content: {
        headers: ["Feature", "Starter", "Professional", "Enterprise"],
        rows: [
          ["Custom Design", "1 page", "Up to 10 pages", "Unlimited"],
          ["Responsive Development", "Yes", "Yes", "Yes"],
          ["CMS Integration", "Basic", "Advanced", "Custom"],
          ["SEO Optimization", "On-page", "Full audit", "Ongoing"],
          ["Support", "30 days", "90 days", "Dedicated team"],
          ["Performance Monitoring", "—", "Monthly reports", "Real-time"],
        ],
        striped: true,
        caption: "Service tier comparison — all plans include free consultations",
      },
      settings: {},
    },
    {
      type: "spacer",
      content: { height: 48 },
      settings: {},
    },
    {
      type: "heading",
      content: { text: "Frequently Asked Questions", level: 2 },
      settings: { align: "center" },
    },
    {
      type: "accordion",
      content: {
        items: [
          {
            id: "faq1",
            title: "How long does a typical project take?",
            content: "<p>Brand identity projects take 4-6 weeks. Website design and development typically runs 6-10 weeks. Product design and full-stack applications range from 10-20 weeks depending on scope.</p>",
          },
          {
            id: "faq2",
            title: "What's your design process like?",
            content: "<p>We follow a four-phase approach: Discovery (research and strategy), Design (wireframes, visuals, prototypes), Build (development and testing), and Launch (deployment and optimization).</p>",
          },
          {
            id: "faq3",
            title: "Do you work with startups?",
            content: "<p>Absolutely — startups make up about 40% of our client base. We understand the unique constraints of early-stage companies and can work within limited budgets and tight timelines.</p>",
          },
          {
            id: "faq4",
            title: "Can you work with our existing team?",
            content: "<p>Yes. We frequently embed with in-house teams for specific projects or phases. We integrate smoothly with existing workflows and tools.</p>",
          },
          {
            id: "faq5",
            title: "What happens after launch?",
            content: "<p>Every project includes 30 days of post-launch support at no extra cost. After that, most clients transition to a monthly retainer for ongoing improvements.</p>",
          },
        ],
        style: "minimal",
        iconPosition: "right",
      },
      settings: {},
    },
    {
      type: "spacer",
      content: { height: 32 },
      settings: {},
    },
    {
      type: "button",
      content: { text: "Start a Project", url: "/s/atlas-studio/contact", variant: "outline" },
      settings: { align: "center", size: "sm" },
    },
    {
      type: "text",
      content: {
        html: "<p>Every great project starts with a conversation. No obligation, no sales pitch.</p>",
      },
      settings: { align: "center" },
    },
  ];

  await prisma.block.createMany({
    data: servicesBlocks.map((block, i) => ({
      type: block.type,
      content: block.content,
      settings: block.settings,
      sortOrder: i,
      pageId: servicesPage.id,
    })),
  });
  console.log("Created Services page with", servicesBlocks.length, "blocks");

  // ──────────────────────────────────────────────
  // 8. PAGE 4 — Journal (Blog Post)
  // ──────────────────────────────────────────────
  const journalPage = await prisma.page.create({
    data: {
      title: "Why We Bet on Boring Technology",
      slug: "journal",
      description: "Our philosophy on choosing proven tools over shiny new ones, and why it matters for our clients.",
      status: "PUBLISHED",
      publishedAt: new Date(),
      showInNav: true,
      siteId: site.id,
      sortOrder: 3,
      metaTitle: "Why We Bet on Boring Technology — Atlas Creative",
    },
  });

  const journalBlocks = [
    {
      type: "heading",
      content: { text: "Why We Bet on Boring Technology", level: 1 },
      settings: {},
    },
    {
      type: "text",
      content: { html: "<p><em>Published February 2026 &bull; 7 min read</em></p>" },
      settings: {},
    },
    {
      type: "divider",
      content: {},
      settings: { style: "solid" },
    },
    {
      type: "toc",
      content: { maxDepth: 2, style: "minimal", ordered: true },
      settings: {},
    },
    {
      type: "text",
      content: {
        html: "<p>In an industry obsessed with the next big framework, we've built our entire practice on a contrarian bet: <strong>boring technology wins.</strong> Not always in blog posts or Twitter threads, but where it actually matters — in production, at scale, over years.</p><p>This isn't a Luddite manifesto. We love new tools. But after building 120+ projects, we've learned the hard way that novelty is a cost, not a feature.</p>",
      },
      settings: {},
    },
    {
      type: "heading",
      content: { text: "The Innovation Token Budget", level: 2 },
      settings: {},
    },
    {
      type: "text",
      content: {
        html: '<p>Dan McKinley coined the idea of "innovation tokens" — every team gets a limited number to spend on new, unproven technology. Spend them wisely on things that differentiate your product.</p><p>Our rule of thumb: <strong>use boring tools for commodity problems, save innovation for your unique value proposition.</strong></p>',
      },
      settings: {},
    },
    {
      type: "quote",
      content: {
        text: "The purpose of a system is what it does. If your system delivers value to users reliably, nobody cares whether you used the latest framework to build it.",
        attribution: "Adapted from Stafford Beer's POSIWID principle",
        style: "bordered",
      },
      settings: {},
    },
    {
      type: "heading",
      content: { text: "Our Stack (and Why)", level: 2 },
      settings: {},
    },
    {
      type: "text",
      content: {
        html: "<p>Here's what we use for most client projects, and the reasoning behind each choice:</p>",
      },
      settings: {},
    },
    {
      type: "columns",
      content: {
        columns: [
          {
            blocks: [
              { id: "j1", type: "heading", content: { text: "Frontend", level: 3 }, settings: {} },
              { id: "j2", type: "text", content: { html: "<p><strong>React + Next.js.</strong> Massive ecosystem, excellent TypeScript support, battle-tested performance patterns. Server Components eliminated most of our bundle size concerns.</p>" }, settings: {} },
            ],
          },
          {
            blocks: [
              { id: "j3", type: "heading", content: { text: "Backend", level: 3 }, settings: {} },
              { id: "j4", type: "text", content: { html: "<p><strong>Node.js + PostgreSQL + Prisma.</strong> This combination handles everything from simple CRUD to complex analytics queries. PostgreSQL's reliability record is decades long.</p>" }, settings: {} },
            ],
          },
        ],
      },
      settings: { gap: "32px" },
    },
    {
      type: "heading",
      content: { text: "The Cost of Novelty", level: 2 },
      settings: {},
    },
    {
      type: "text",
      content: {
        html: "<p>We've seen the cost of chasing trends firsthand:</p><ul><li><strong>The \"cutting-edge\" CSS framework</strong> that was abandoned 6 months after we shipped. We spent 3 weeks migrating.</li><li><strong>The serverless database</strong> with cold start times that made our API unusable at 8 AM Monday mornings.</li><li><strong>The state management library</strong> that turned into debugging nightmares with optimistic updates.</li></ul><p>Each of these cost real money, real client frustration, and real credibility.</p>",
      },
      settings: {},
    },
    {
      type: "heading",
      content: { text: "Our Decision Framework", level: 3 },
      settings: {},
    },
    {
      type: "code",
      content: {
        code: `// Technology Decision Framework
interface TechEvaluation {
  name: string;
  criteria: {
    productionYears: number;      // > 2 years in production at scale?
    communitySize: "small" | "medium" | "large";
    rampUpDays: number;           // Days for mid-level dev to be productive
    failureModesDocumented: boolean;
    solvesRealProblem: boolean;   // Not a hypothetical future problem
  };
}

function shouldAdopt(tech: TechEvaluation): boolean {
  const { criteria } = tech;
  return (
    criteria.productionYears > 2 &&
    criteria.communitySize === "large" &&
    criteria.rampUpDays <= 7 &&
    criteria.failureModesDocumented &&
    criteria.solvesRealProblem
  );
}`,
        language: "html",
        displayMode: "snippet",
        snippetLanguage: "typescript",
      },
      settings: {},
    },
    {
      type: "heading",
      content: { text: "When We Do Innovate", level: 2 },
      settings: {},
    },
    {
      type: "text",
      content: {
        html: "<p>Boring doesn't mean static. We adopt new tools carefully:</p><ol><li><strong>React Server Components:</strong> Adopted after 18 months of maturity. The performance improvements were undeniable.</li><li><strong>Edge deployment:</strong> Moved once tooling stabilized. Latency improvements for international clients were significant.</li><li><strong>AI-assisted code review:</strong> As assistants, not replacements. They catch bugs and help with documentation.</li></ol>",
      },
      settings: {},
    },
    {
      type: "heading",
      content: { text: "The Takeaway", level: 2 },
      settings: {},
    },
    {
      type: "text",
      content: {
        html: "<p>Our clients don't hire us because of our tech stack. They hire us because we deliver reliable, well-crafted products on time and on budget. Boring technology is what makes that possible.</p><p>The next time someone pitches you a tool because it's \"the future,\" ask them: <strong>is it boring enough to bet your business on?</strong></p>",
      },
      settings: {},
    },
    {
      type: "spacer",
      content: { height: 32 },
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
        html: '<p><em>This is part of our ongoing series on how we work at Atlas Creative. Want to work with a team that values substance over hype? <a href="/s/atlas-studio/contact">Get in touch</a>.</em></p>',
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
        style: "icons",
      },
      settings: { align: "center" },
    },
  ];

  await prisma.block.createMany({
    data: journalBlocks.map((block, i) => ({
      type: block.type,
      content: block.content,
      settings: block.settings,
      sortOrder: i,
      pageId: journalPage.id,
    })),
  });
  console.log("Created Journal page with", journalBlocks.length, "blocks");

  // ──────────────────────────────────────────────
  // 9. PAGE 5 — Contact
  // ──────────────────────────────────────────────
  const contactPage = await prisma.page.create({
    data: {
      title: "Contact",
      slug: "contact",
      status: "PUBLISHED",
      publishedAt: new Date(),
      showInNav: true,
      siteId: site.id,
      sortOrder: 4,
      metaTitle: "Contact — Atlas Creative",
    },
  });

  const contactBlocks = [
    {
      type: "heading",
      content: { text: "Let's Build Something Great", level: 1 },
      settings: { align: "center" },
    },
    {
      type: "text",
      content: {
        html: "<p>Whether you have a detailed brief or just a spark of an idea, we'd love to hear from you. Every project starts with a conversation — no commitment required.</p>",
      },
      settings: { align: "center" },
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
              { id: "ct1", type: "heading", content: { text: "Contact Information", level: 2 }, settings: {} },
              { id: "ct2", type: "text", content: { html: "<p><strong>Email</strong><br>hello@atlascreative.studio</p><p><strong>Phone</strong><br>+1 (415) 555-0132<br>Mon-Fri, 9 AM – 6 PM PST</p><p><strong>Office</strong><br>580 Howard Street, Suite 400<br>San Francisco, CA 94105</p>" }, settings: {} },
            ],
          },
          {
            blocks: [
              { id: "ct3", type: "heading", content: { text: "Send Us a Message", level: 2 }, settings: {} },
              { id: "ct4", type: "text", content: { html: "<p>Fill out the form below and we'll get back to you within one business day.</p>" }, settings: {} },
            ],
          },
        ],
      },
      settings: { gap: "48px" },
    },
    {
      type: "spacer",
      content: { height: 16 },
      settings: {},
    },
    {
      type: "form",
      content: {
        fields: [
          { id: "name", type: "text", label: "Full Name", required: true, placeholder: "Your full name" },
          { id: "email", type: "email", label: "Email Address", required: true, placeholder: "you@company.com" },
          { id: "phone", type: "tel", label: "Phone Number", required: false, placeholder: "+1 (555) 000-0000" },
          { id: "inquiry", type: "select", label: "Inquiry Type", required: true, placeholder: "Select a topic", options: ["Brand & Identity", "Web Design & Development", "Product Design", "Full-Stack Development", "Consulting", "Partnership", "Other"] },
          { id: "budget", type: "radio", label: "Budget Range", required: false, options: ["Under $10K", "$10K – $25K", "$25K – $50K", "$50K – $100K", "$100K+"] },
          { id: "newsletter", type: "checkbox", label: "Subscribe to our newsletter for design and tech insights", required: false },
          { id: "message", type: "textarea", label: "Your Message", required: true, placeholder: "Tell us about your project, timeline, and goals. The more context, the better our initial conversation will be." },
        ],
        submitText: "Send Message",
        successMessage: "Thank you for reaching out! We've received your message and will get back to you within one business day.",
      },
      settings: {},
    },
    {
      type: "spacer",
      content: { height: 32 },
      settings: {},
    },
    {
      type: "social",
      content: {
        links: [
          { platform: "twitter", url: "https://twitter.com" },
          { platform: "dribbble", url: "https://dribbble.com" },
          { platform: "github", url: "https://github.com" },
          { platform: "linkedin", url: "https://linkedin.com" },
          { platform: "youtube", url: "https://youtube.com" },
        ],
        style: "pills",
      },
      settings: { align: "center" },
    },
    {
      type: "divider",
      content: {},
      settings: { style: "solid" },
    },
    {
      type: "text",
      content: {
        html: '<p>Prefer a direct conversation? <a href="mailto:hello@atlascreative.studio">Email us directly</a> or call during business hours.</p>',
      },
      settings: { align: "center" },
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
  console.log("Created Contact page with", contactBlocks.length, "blocks");

  // ──────────────────────────────────────────────
  // 10. PAGE 6 — Gallery
  // ──────────────────────────────────────────────
  const galleryPage = await prisma.page.create({
    data: {
      title: "Gallery",
      slug: "gallery",
      status: "PUBLISHED",
      publishedAt: new Date(),
      showInNav: true,
      siteId: site.id,
      sortOrder: 5,
      metaTitle: "Gallery — Atlas Creative",
    },
  });

  const galleryBlocks = [
    {
      type: "heading",
      content: { text: "Our Work in Action", level: 1 },
      settings: { align: "center" },
    },
    {
      type: "text",
      content: {
        html: "<p>A curated selection of projects, interfaces, and brand work from our studio. Each piece represents a collaboration with clients who share our passion for quality.</p>",
      },
      settings: { align: "center" },
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
              { id: "gal1", type: "image", content: { src: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop&q=80", alt: "Analytics dashboard with clean data visualization", caption: "CloudSync Dashboard Redesign" }, settings: { rounded: true } },
            ],
          },
          {
            blocks: [
              { id: "gal2", type: "image", content: { src: "https://images.unsplash.com/photo-1559028012-481c04fa702d?w=600&h=400&fit=crop&q=80", alt: "Mobile app interface with modern design patterns", caption: "Meridian Health Mobile App" }, settings: { rounded: true } },
            ],
          },
          {
            blocks: [
              { id: "gal3", type: "image", content: { src: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop&q=80", alt: "Brand identity system with logo variations", caption: "Novabank Brand Identity" }, settings: { rounded: true } },
            ],
          },
        ],
      },
      settings: { gap: "24px" },
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
              { id: "gal4", type: "image", content: { src: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=500&fit=crop&q=80", alt: "Developer workspace with code on multiple monitors", caption: "Engineering workspace — where the code comes to life" }, settings: { shadow: true, rounded: true } },
            ],
          },
          {
            blocks: [
              { id: "gal5", type: "image", content: { src: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=500&fit=crop&q=80", alt: "Design team collaboration session with wireframes", caption: "Design sprint — collaborative prototyping session" }, settings: { shadow: true, rounded: true } },
            ],
          },
        ],
      },
      settings: { gap: "24px" },
    },
    {
      type: "spacer",
      content: { height: 32 },
      settings: {},
    },
    {
      type: "text",
      content: {
        html: '<p>Interested in seeing more or discussing a project? <a href="/s/atlas-studio/contact">Get in touch</a> — we\'d love to hear from you.</p>',
      },
      settings: { align: "center" },
    },
  ];

  await prisma.block.createMany({
    data: galleryBlocks.map((block, i) => ({
      type: block.type,
      content: block.content,
      settings: block.settings,
      sortOrder: i,
      pageId: galleryPage.id,
    })),
  });
  console.log("Created Gallery page with", galleryBlocks.length, "blocks");

  // ──────────────────────────────────────────────
  // 11. PAGE 7 — Case Studies (DRAFT)
  // ──────────────────────────────────────────────
  const draftPage = await prisma.page.create({
    data: {
      title: "Case Studies",
      slug: "case-studies",
      status: "DRAFT",
      showInNav: false,
      siteId: site.id,
      sortOrder: 6,
    },
  });

  const draftBlocks = [
    {
      type: "heading",
      content: { text: "Case Studies", level: 1 },
      settings: { align: "center" },
    },
    {
      type: "text",
      content: {
        html: "<p>Deep dives into our most impactful projects — the challenges, our approach, and the results. This page is currently being written and will be published soon.</p>",
      },
      settings: { align: "center" },
    },
    {
      type: "spacer",
      content: { height: 32 },
      settings: {},
    },
    {
      type: "heading",
      content: { text: "Meridian Health — Product Redesign", level: 2 },
      settings: {},
    },
    {
      type: "text",
      content: {
        html: "<p><strong>Challenge:</strong> Meridian Health's wellness app had strong user acquisition but poor retention. Users signed up but stopped engaging after the first week.</p><p><strong>Our Approach:</strong> We conducted 30 user interviews, identified three core friction points in the onboarding flow, and redesigned the first-week experience from scratch.</p><p><strong>Results:</strong> 7-day retention increased from 23% to 61%. Monthly active users grew by 40% within three months.</p>",
      },
      settings: {},
    },
    {
      type: "divider",
      content: {},
      settings: { style: "dashed" },
    },
    {
      type: "heading",
      content: { text: "CloudSync — SaaS Dashboard", level: 2 },
      settings: {},
    },
    {
      type: "text",
      content: {
        html: "<p><strong>Challenge:</strong> CloudSync's analytics dashboard had become a \"Frankenstein\" of features bolted on over four years. Users complained about information overload.</p><p><strong>Our Approach:</strong> We identified the 5 most-used features and rebuilt the core experience around them, progressively disclosing advanced features.</p><p><strong>Results:</strong> Average task completion time dropped by 35%. Support tickets decreased by 60%. NPS improved from 32 to 67.</p>",
      },
      settings: {},
    },
  ];

  await prisma.block.createMany({
    data: draftBlocks.map((block, i) => ({
      type: block.type,
      content: block.content,
      settings: block.settings,
      sortOrder: i,
      pageId: draftPage.id,
    })),
  });
  console.log("Created Case Studies page (DRAFT) with", draftBlocks.length, "blocks");

  // ──────────────────────────────────────────────
  // 12. Tags
  // ──────────────────────────────────────────────
  const [tagDesign, tagDev, tagStrategy, tagCaseStudy, tagProcess] = await Promise.all([
    prisma.tag.create({ data: { name: "Design", slug: "design", siteId: site.id } }),
    prisma.tag.create({ data: { name: "Development", slug: "development", siteId: site.id } }),
    prisma.tag.create({ data: { name: "Strategy", slug: "strategy", siteId: site.id } }),
    prisma.tag.create({ data: { name: "Case Study", slug: "case-study", siteId: site.id } }),
    prisma.tag.create({ data: { name: "Process", slug: "process", siteId: site.id } }),
  ]);

  await prisma.pageTag.createMany({
    data: [
      { pageId: homePage.id, tagId: tagDesign.id },
      { pageId: homePage.id, tagId: tagDev.id },
      { pageId: aboutPage.id, tagId: tagStrategy.id },
      { pageId: aboutPage.id, tagId: tagProcess.id },
      { pageId: servicesPage.id, tagId: tagDesign.id },
      { pageId: servicesPage.id, tagId: tagDev.id },
      { pageId: servicesPage.id, tagId: tagStrategy.id },
      { pageId: journalPage.id, tagId: tagDev.id },
      { pageId: journalPage.id, tagId: tagProcess.id },
      { pageId: galleryPage.id, tagId: tagDesign.id },
      { pageId: galleryPage.id, tagId: tagCaseStudy.id },
      { pageId: draftPage.id, tagId: tagCaseStudy.id },
    ],
  });
  console.log("Created 5 tags with page assignments");

  // ──────────────────────────────────────────────
  // Summary
  // ──────────────────────────────────────────────
  const totalBlocks = homeBlocks.length + aboutBlocks.length + servicesBlocks.length + journalBlocks.length + contactBlocks.length + galleryBlocks.length + draftBlocks.length;
  console.log("\n────────────────────────────────────");
  console.log("Seed complete!");
  console.log("────────────────────────────────────");
  console.log(`Site:   ${site.name} (/s/${site.slug})`);
  console.log(`Pages:  7 (6 published + 1 draft)`);
  console.log(`Blocks: ${totalBlocks} total`);
  console.log(`Tags:   5`);
  console.log(`Demo:   demo@vellum.app / password123`);
  console.log("────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
