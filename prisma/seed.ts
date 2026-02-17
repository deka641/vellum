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
      description: "A complete landing page with hero, features, and CTA",
      category: "landing",
      blocks: [
        {
          type: "heading",
          content: { text: "Welcome to Your Site", level: 1 },
          settings: { align: "center" },
        },
        {
          type: "text",
          content: {
            html: "<p>Build something extraordinary. This is your space to share your story, showcase your work, and connect with your audience.</p>",
          },
          settings: { align: "center" },
        },
        {
          type: "button",
          content: { text: "Get Started", url: "#", variant: "primary" },
          settings: { align: "center" },
        },
        { type: "spacer", content: { height: 64 }, settings: {} },
        {
          type: "heading",
          content: { text: "Features", level: 2 },
          settings: { align: "center" },
        },
        {
          type: "columns",
          content: {
            columns: [
              {
                blocks: [
                  {
                    id: "t1",
                    type: "heading",
                    content: { text: "Fast", level: 3 },
                    settings: {},
                  },
                  {
                    id: "t2",
                    type: "text",
                    content: { html: "<p>Lightning-fast page loads</p>" },
                    settings: {},
                  },
                ],
              },
              {
                blocks: [
                  {
                    id: "t3",
                    type: "heading",
                    content: { text: "Beautiful", level: 3 },
                    settings: {},
                  },
                  {
                    id: "t4",
                    type: "text",
                    content: { html: "<p>Stunning design out of the box</p>" },
                    settings: {},
                  },
                ],
              },
              {
                blocks: [
                  {
                    id: "t5",
                    type: "heading",
                    content: { text: "Simple", level: 3 },
                    settings: {},
                  },
                  {
                    id: "t6",
                    type: "text",
                    content: { html: "<p>Intuitive and easy to use</p>" },
                    settings: {},
                  },
                ],
              },
            ],
          },
          settings: { gap: "24px" },
        },
      ],
    },
    {
      name: "Portfolio",
      description: "Showcase your work with an image-focused layout",
      category: "portfolio",
      blocks: [
        {
          type: "heading",
          content: { text: "My Work", level: 1 },
          settings: { align: "center" },
        },
        {
          type: "text",
          content: {
            html: "<p>A curated collection of my finest projects and creative endeavors.</p>",
          },
          settings: { align: "center" },
        },
        { type: "divider", content: {}, settings: { style: "solid" } },
        {
          type: "heading",
          content: { text: "About Me", level: 2 },
          settings: {},
        },
        {
          type: "text",
          content: {
            html: "<p>I'm a designer and developer passionate about creating beautiful, functional experiences. With years of experience in the industry, I bring a unique perspective to every project.</p>",
          },
          settings: {},
        },
      ],
    },
    {
      name: "Blog Post",
      description: "A clean layout for long-form content",
      category: "blog",
      blocks: [
        {
          type: "heading",
          content: { text: "Article Title", level: 1 },
          settings: {},
        },
        {
          type: "text",
          content: {
            html: "<p><em>Published on January 1, 2025</em></p>",
          },
          settings: {},
        },
        { type: "divider", content: {}, settings: { style: "solid" } },
        {
          type: "text",
          content: {
            html: "<p>Start writing your article here. Use rich text formatting to make your content engaging and easy to read.</p><p>You can add <strong>bold text</strong>, <em>italics</em>, links, and more using the text editor toolbar.</p>",
          },
          settings: {},
        },
        {
          type: "heading",
          content: { text: "Section Heading", level: 2 },
          settings: {},
        },
        {
          type: "text",
          content: {
            html: "<p>Continue your article with additional sections. Break up long content with headings, images, and other blocks to keep readers engaged.</p>",
          },
          settings: {},
        },
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
