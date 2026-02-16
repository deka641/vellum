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

  // Create demo site with pages
  const site = await prisma.site.upsert({
    where: { slug: "demo-portfolio" },
    update: {},
    create: {
      name: "Demo Portfolio",
      slug: "demo-portfolio",
      description: "A demo portfolio site showcasing Vellum's capabilities",
      userId: user.id,
    },
  });

  console.log("Created demo site:", site.name);

  // Create home page with blocks
  const homePage = await prisma.page.upsert({
    where: { siteId_slug: { siteId: site.id, slug: "home" } },
    update: {},
    create: {
      title: "Home",
      slug: "home",
      isHomepage: true,
      status: "PUBLISHED",
      publishedAt: new Date(),
      siteId: site.id,
      sortOrder: 0,
    },
  });

  // Clear existing blocks for home page
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
        html: "<p>This is a demo site built with Vellum, the elegant visual page builder. Every element you see was created using the drag-and-drop editor.</p>",
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
      content: { height: 48 },
      settings: {},
    },
    {
      type: "divider",
      content: {},
      settings: { style: "solid", color: "#E7E5E4" },
    },
    {
      type: "heading",
      content: { text: "Built for Creators", level: 2 },
      settings: {},
    },
    {
      type: "text",
      content: {
        html: "<p>Whether you're building a portfolio, a landing page, or a blog, Vellum gives you the tools to bring your vision to life. Our block-based editor makes it easy to create professional layouts without any coding.</p>",
      },
      settings: {},
    },
  ];

  for (let i = 0; i < homeBlocks.length; i++) {
    await prisma.block.create({
      data: {
        type: homeBlocks[i].type,
        content: homeBlocks[i].content,
        settings: homeBlocks[i].settings,
        sortOrder: i,
        pageId: homePage.id,
      },
    });
  }

  // Create about page
  const aboutPage = await prisma.page.upsert({
    where: { siteId_slug: { siteId: site.id, slug: "about" } },
    update: {},
    create: {
      title: "About",
      slug: "about",
      status: "PUBLISHED",
      publishedAt: new Date(),
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
  ];

  for (let i = 0; i < aboutBlocks.length; i++) {
    await prisma.block.create({
      data: {
        type: aboutBlocks[i].type,
        content: aboutBlocks[i].content,
        settings: aboutBlocks[i].settings,
        sortOrder: i,
        pageId: aboutPage.id,
      },
    });
  }

  console.log("Created demo pages with blocks");
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
