import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api-helpers";
import { slugify, generateId } from "@/lib/utils";
import { parseBody, createSiteSchema } from "@/lib/validations";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { Prisma } from "@prisma/client";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sites = await db.site.findMany({
      where: { userId: session.user.id },
      include: {
        _count: { select: { pages: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(sites);
  } catch (error) {
    return apiError("GET /api/sites", error);
  }
}

function makeStarterBlocks(pageKey: string, siteName: string) {
  switch (pageKey) {
    case "homepage": {
      const col1Id = generateId();
      const col2Id = generateId();
      const col3Id = generateId();
      const stat1Id = generateId();
      const stat2Id = generateId();
      const stat3Id = generateId();
      return [
        { id: generateId(), type: "heading", content: { text: `Welcome to ${siteName}`, level: 1 }, settings: { align: "center" } },
        { id: generateId(), type: "text", content: { html: "<p>We help businesses and creators build a powerful online presence. Our platform combines beautiful design with intuitive tools so you can focus on what matters most — your content and your audience.</p>" }, settings: { align: "center" } },
        { id: generateId(), type: "button", content: { text: "Get Started", url: "/contact", variant: "primary" }, settings: { align: "center" } },
        { id: generateId(), type: "spacer", content: { height: 48 }, settings: {} },
        { id: generateId(), type: "heading", content: { text: "What We Do", level: 2 }, settings: { align: "center" } },
        { id: generateId(), type: "text", content: { html: "<p>From strategy to execution, we provide everything you need to succeed online.</p>" }, settings: { align: "center" } },
        {
          id: generateId(), type: "columns", content: {
            columns: [
              {
                blocks: [
                  { id: col1Id, type: "heading", content: { text: "Design", level: 3 }, settings: { align: "center" } },
                  { id: generateId(), type: "text", content: { html: "<p>Stunning, responsive designs that capture your brand identity and engage visitors from the first click. Every detail is crafted with purpose.</p>" }, settings: {} },
                ],
              },
              {
                blocks: [
                  { id: col2Id, type: "heading", content: { text: "Development", level: 3 }, settings: { align: "center" } },
                  { id: generateId(), type: "text", content: { html: "<p>Fast, reliable, and built to scale. Our solutions use modern technology to deliver seamless experiences across every device and platform.</p>" }, settings: {} },
                ],
              },
              {
                blocks: [
                  { id: col3Id, type: "heading", content: { text: "Growth", level: 3 }, settings: { align: "center" } },
                  { id: generateId(), type: "text", content: { html: "<p>Data-driven strategies that attract the right audience and convert visitors into loyal customers. We measure what matters and optimize relentlessly.</p>" }, settings: {} },
                ],
              },
            ],
          }, settings: { gap: "32" }
        },
        { id: generateId(), type: "spacer", content: { height: 48 }, settings: {} },
        {
          id: generateId(), type: "columns", content: {
            columns: [
              {
                blocks: [
                  { id: stat1Id, type: "heading", content: { text: "500+", level: 2 }, settings: { align: "center" } },
                  { id: generateId(), type: "text", content: { html: "<p>Projects delivered on time and on budget for clients around the world.</p>" }, settings: { align: "center" } },
                ],
              },
              {
                blocks: [
                  { id: stat2Id, type: "heading", content: { text: "98%", level: 2 }, settings: { align: "center" } },
                  { id: generateId(), type: "text", content: { html: "<p>Client satisfaction rate, because your success is how we measure ours.</p>" }, settings: { align: "center" } },
                ],
              },
              {
                blocks: [
                  { id: stat3Id, type: "heading", content: { text: "24/7", level: 2 }, settings: { align: "center" } },
                  { id: generateId(), type: "text", content: { html: "<p>Dedicated support whenever you need it, so you never feel stuck or alone.</p>" }, settings: { align: "center" } },
                ],
              },
            ],
          }, settings: { gap: "32" }
        },
        { id: generateId(), type: "quote", content: { text: "Working with this team transformed our online presence. The results exceeded every expectation we had.", attribution: "Sarah Mitchell, CEO of Brightwave", style: "bordered" }, settings: {} },
        { id: generateId(), type: "divider", content: {}, settings: {} },
        { id: generateId(), type: "heading", content: { text: "Ready to Get Started?", level: 2 }, settings: { align: "center" } },
        { id: generateId(), type: "text", content: { html: "<p>Let's build something great together. Reach out today and discover how we can help you achieve your goals.</p>" }, settings: { align: "center" } },
        { id: generateId(), type: "button", content: { text: "Contact Us", url: "/contact", variant: "primary" }, settings: { align: "center" } },
      ];
    }
    case "about": {
      const val1Id = generateId();
      const val2Id = generateId();
      const val3Id = generateId();
      return [
        { id: generateId(), type: "heading", content: { text: `About ${siteName}`, level: 1 }, settings: {} },
        { id: generateId(), type: "text", content: { html: "<p>We started with a simple belief: everyone deserves access to tools that make building an online presence effortless and enjoyable. What began as a small project has grown into a platform trusted by creators, entrepreneurs, and businesses worldwide.</p><p>Our team is passionate about design, technology, and empowering people to share their ideas with the world. We combine deep technical expertise with a genuine care for the people who use our products every day.</p>" }, settings: {} },
        { id: generateId(), type: "spacer", content: { height: 32 }, settings: {} },
        { id: generateId(), type: "heading", content: { text: "Our Values", level: 2 }, settings: {} },
        {
          id: generateId(), type: "columns", content: {
            columns: [
              {
                blocks: [
                  { id: val1Id, type: "heading", content: { text: "Simplicity", level: 3 }, settings: {} },
                  { id: generateId(), type: "text", content: { html: "<p>We believe the best tools get out of your way. Every feature we build is designed to be intuitive, so you spend less time learning and more time creating.</p>" }, settings: {} },
                ],
              },
              {
                blocks: [
                  { id: val2Id, type: "heading", content: { text: "Quality", level: 3 }, settings: {} },
                  { id: generateId(), type: "text", content: { html: "<p>We never cut corners. From pixel-perfect designs to rock-solid infrastructure, we hold ourselves to the highest standards in everything we ship.</p>" }, settings: {} },
                ],
              },
              {
                blocks: [
                  { id: val3Id, type: "heading", content: { text: "Transparency", level: 3 }, settings: {} },
                  { id: generateId(), type: "text", content: { html: "<p>Honest communication builds trust. We share our roadmap openly, price fairly, and always tell you exactly what to expect — no surprises.</p>" }, settings: {} },
                ],
              },
            ],
          }, settings: { gap: "32" }
        },
        { id: generateId(), type: "quote", content: { text: "The team behind this product genuinely cares about their users. You can feel it in every interaction and every update they release.", attribution: "James Rivera, Longtime Customer", style: "bordered" }, settings: {} },
        { id: generateId(), type: "divider", content: {}, settings: {} },
        { id: generateId(), type: "heading", content: { text: "Let's Work Together", level: 2 }, settings: { align: "center" } },
        { id: generateId(), type: "text", content: { html: "<p>Whether you have a question, a project idea, or just want to say hello — we would love to hear from you.</p>" }, settings: { align: "center" } },
        { id: generateId(), type: "button", content: { text: "Get in Touch", url: "/contact", variant: "primary" }, settings: { align: "center" } },
      ];
    }
    case "contact":
      return [
        { id: generateId(), type: "heading", content: { text: "Get in Touch", level: 1 }, settings: {} },
        { id: generateId(), type: "text", content: { html: "<p>Have a question, a project in mind, or just want to learn more about what we do? We would love to hear from you. Fill out the form below and a member of our team will respond within one business day.</p>" }, settings: {} },
        { id: generateId(), type: "spacer", content: { height: 16 }, settings: {} },
        {
          id: generateId(), type: "form", content: {
            fields: [
              { id: "name", type: "text", label: "Full Name", required: true, placeholder: "Your full name" },
              { id: "email", type: "email", label: "Email Address", required: true, placeholder: "you@example.com" },
              { id: "subject", type: "select", label: "Subject", required: false, placeholder: "Select a topic", options: ["General Inquiry", "Project Collaboration", "Support Request", "Partnership Opportunity", "Other"] },
              { id: "message", type: "textarea", label: "Message", required: true, placeholder: "Tell us about your project or question..." },
            ],
            submitText: "Send Message",
            successMessage: "Thank you for reaching out! We will get back to you within one business day.",
          }, settings: {}
        },
        { id: generateId(), type: "spacer", content: { height: 32 }, settings: {} },
        { id: generateId(), type: "divider", content: {}, settings: {} },
        {
          id: generateId(), type: "social", content: {
            links: [
              { platform: "twitter", url: "https://twitter.com" },
              { platform: "linkedin", url: "https://linkedin.com" },
              { platform: "github", url: "https://github.com" },
              { platform: "email", url: "mailto:hello@example.com" },
            ],
          }, settings: { align: "center" }
        },
      ];
    case "blog": {
      const article1Id = generateId();
      const article2Id = generateId();
      return [
        { id: generateId(), type: "heading", content: { text: "Blog", level: 1 }, settings: {} },
        { id: generateId(), type: "text", content: { html: "<p>Insights, tutorials, and updates from our team. We write about design, technology, and the lessons we learn along the way.</p>" }, settings: {} },
        { id: generateId(), type: "divider", content: {}, settings: {} },
        { id: generateId(), type: "heading", content: { text: "Featured", level: 2 }, settings: {} },
        { id: generateId(), type: "heading", content: { text: "Building a Design System That Scales", level: 3 }, settings: {} },
        { id: generateId(), type: "text", content: { html: "<p>A design system is more than a collection of components — it is a shared language that unites your team. In this article, we explore how to build one that grows with your product, from foundational tokens to complex patterns. Learn the principles that keep large-scale systems maintainable and consistent.</p>" }, settings: {} },
        { id: generateId(), type: "button", content: { text: "Read Article", url: "#", variant: "secondary" }, settings: {} },
        { id: generateId(), type: "spacer", content: { height: 32 }, settings: {} },
        { id: generateId(), type: "heading", content: { text: "Recent Posts", level: 2 }, settings: {} },
        {
          id: generateId(), type: "columns", content: {
            columns: [
              {
                blocks: [
                  { id: article1Id, type: "heading", content: { text: "The Art of Minimalist Web Design", level: 3 }, settings: {} },
                  { id: generateId(), type: "text", content: { html: "<p>Less is more — but only when every remaining element earns its place. We break down the principles of minimalist design and show how restraint leads to more impactful user experiences.</p>" }, settings: {} },
                ],
              },
              {
                blocks: [
                  { id: article2Id, type: "heading", content: { text: "Performance Optimization Checklist", level: 3 }, settings: {} },
                  { id: generateId(), type: "text", content: { html: "<p>Page speed directly impacts conversion rates and search rankings. Here is our comprehensive checklist for auditing and improving your website's performance, from image compression to code splitting.</p>" }, settings: {} },
                ],
              },
            ],
          }, settings: { gap: "32" }
        },
      ];
    }
    case "services": {
      const svc1Id = generateId();
      const svc2Id = generateId();
      const svc3Id = generateId();
      return [
        { id: generateId(), type: "heading", content: { text: "Our Services", level: 1 }, settings: { align: "center" } },
        { id: generateId(), type: "text", content: { html: "<p>We offer a full suite of digital services designed to help your business stand out, perform better, and grow faster. Every engagement is tailored to your unique needs and goals.</p>" }, settings: { align: "center" } },
        { id: generateId(), type: "spacer", content: { height: 32 }, settings: {} },
        {
          id: generateId(), type: "columns", content: {
            columns: [
              {
                blocks: [
                  { id: svc1Id, type: "heading", content: { text: "Web Design & Development", level: 3 }, settings: { align: "center" } },
                  { id: generateId(), type: "text", content: { html: "<p>Custom websites built from the ground up with modern frameworks. We focus on responsive design, accessibility, and performance to ensure your site looks great and works flawlessly on every device.</p>" }, settings: {} },
                ],
              },
              {
                blocks: [
                  { id: svc2Id, type: "heading", content: { text: "Brand Strategy & Identity", level: 3 }, settings: { align: "center" } },
                  { id: generateId(), type: "text", content: { html: "<p>Your brand is more than a logo. We develop comprehensive brand strategies that define your voice, visual identity, and positioning — giving you a cohesive presence that resonates with your audience.</p>" }, settings: {} },
                ],
              },
              {
                blocks: [
                  { id: svc3Id, type: "heading", content: { text: "SEO & Content Marketing", level: 3 }, settings: { align: "center" } },
                  { id: generateId(), type: "text", content: { html: "<p>Get found by the right people at the right time. Our data-driven SEO and content strategies increase your organic visibility, drive qualified traffic, and establish your authority in the market.</p>" }, settings: {} },
                ],
              },
            ],
          }, settings: { gap: "32" }
        },
        { id: generateId(), type: "divider", content: {}, settings: {} },
        { id: generateId(), type: "heading", content: { text: "Frequently Asked Questions", level: 2 }, settings: {} },
        {
          id: generateId(), type: "accordion", content: {
            items: [
              { id: generateId(), title: "How long does a typical project take?", content: "Most projects are completed within 4 to 8 weeks, depending on scope and complexity. During our initial consultation, we will provide a detailed timeline tailored to your specific requirements." },
              { id: generateId(), title: "Do you offer ongoing support after launch?", content: "Absolutely. We offer flexible maintenance and support plans to keep your site running smoothly, including security updates, content changes, performance monitoring, and priority bug fixes." },
              { id: generateId(), title: "What is your pricing structure?", content: "We offer both project-based and retainer pricing. Every project begins with a free consultation where we scope your needs and provide a transparent, detailed quote with no hidden fees." },
            ],
          }, settings: {}
        },
        { id: generateId(), type: "spacer", content: { height: 32 }, settings: {} },
        { id: generateId(), type: "heading", content: { text: "Ready to Start Your Project?", level: 2 }, settings: { align: "center" } },
        { id: generateId(), type: "text", content: { html: "<p>Tell us about your vision and we will show you how we can bring it to life.</p>" }, settings: { align: "center" } },
        { id: generateId(), type: "button", content: { text: "Request a Consultation", url: "/contact", variant: "primary" }, settings: { align: "center" } },
      ];
    }
    case "faq":
      return [
        { id: generateId(), type: "heading", content: { text: "Frequently Asked Questions", level: 1 }, settings: { align: "center" } },
        { id: generateId(), type: "text", content: { html: "<p>Find answers to the most common questions about our platform, features, and services. If you do not see your question here, feel free to reach out to our team.</p>" }, settings: { align: "center" } },
        { id: generateId(), type: "spacer", content: { height: 32 }, settings: {} },
        { id: generateId(), type: "heading", content: { text: "Getting Started", level: 2 }, settings: {} },
        {
          id: generateId(), type: "accordion", content: {
            items: [
              { id: generateId(), title: "How do I create an account?", content: "Click the Sign Up button on our homepage and follow the prompts. You will need a valid email address to get started. The entire process takes less than two minutes, and you can begin building your site immediately." },
              { id: generateId(), title: "Is there a free trial available?", content: "Yes, we offer a full-featured free trial so you can explore everything the platform has to offer before committing. No credit card is required to start, and you can upgrade at any time." },
              { id: generateId(), title: "Can I import content from another platform?", content: "Absolutely. We support importing content from most major platforms through our JSON import tool. Simply export your content from your current provider and upload it to your new site. Our support team can assist with migrations if needed." },
            ],
          }, settings: {}
        },
        { id: generateId(), type: "spacer", content: { height: 16 }, settings: {} },
        { id: generateId(), type: "heading", content: { text: "Features & Capabilities", level: 2 }, settings: {} },
        {
          id: generateId(), type: "accordion", content: {
            items: [
              { id: generateId(), title: "Can I use a custom domain?", content: "Yes, you can connect your own custom domain to any site you create. We provide step-by-step instructions for configuring your DNS settings, and our support team is available to help if you run into any issues." },
              { id: generateId(), title: "Is the platform mobile-friendly?", content: "Every site built on our platform is fully responsive out of the box. Your pages will look great on desktops, tablets, and smartphones without any extra configuration. The editor also works on tablet devices." },
              { id: generateId(), title: "Do you support SEO optimization?", content: "Yes, we include built-in SEO tools such as customizable meta titles, descriptions, Open Graph images, and a real-time SEO audit panel. We also generate sitemaps and structured data automatically to help search engines discover and index your content." },
            ],
          }, settings: {}
        },
        { id: generateId(), type: "divider", content: {}, settings: {} },
        { id: generateId(), type: "heading", content: { text: "Still Have Questions?", level: 2 }, settings: { align: "center" } },
        { id: generateId(), type: "text", content: { html: "<p>Our team is here to help. Reach out and we will get back to you as soon as possible.</p>" }, settings: { align: "center" } },
        { id: generateId(), type: "button", content: { text: "Contact Support", url: "/contact", variant: "primary" }, settings: { align: "center" } },
      ];
    case "pricing": {
      const tier1Id = generateId();
      const tier2Id = generateId();
      const tier3Id = generateId();
      return [
        { id: generateId(), type: "heading", content: { text: "Simple, Transparent Pricing", level: 1 }, settings: { align: "center" } },
        { id: generateId(), type: "text", content: { html: "<p>No hidden fees, no long-term contracts. Choose the plan that fits your needs and scale up as you grow. Every plan includes our core features and dedicated support.</p>" }, settings: { align: "center" } },
        { id: generateId(), type: "spacer", content: { height: 32 }, settings: {} },
        {
          id: generateId(), type: "columns", content: {
            columns: [
              {
                blocks: [
                  { id: tier1Id, type: "heading", content: { text: "Starter", level: 3 }, settings: { align: "center" } },
                  { id: generateId(), type: "text", content: { html: "<p><strong>$9/month</strong></p><p>Perfect for personal projects and small sites.</p><ul><li>Up to 5 pages</li><li>Custom domain</li><li>Responsive design</li><li>Basic analytics</li><li>Email support</li></ul>" }, settings: {} },
                  { id: generateId(), type: "button", content: { text: "Get Started", url: "/contact", variant: "secondary" }, settings: { align: "center" } },
                ],
              },
              {
                blocks: [
                  { id: tier2Id, type: "heading", content: { text: "Professional", level: 3 }, settings: { align: "center" } },
                  { id: generateId(), type: "text", content: { html: "<p><strong>$29/month</strong></p><p>Ideal for growing businesses and teams.</p><ul><li>Unlimited pages</li><li>Custom domain</li><li>Advanced SEO tools</li><li>Form submissions</li><li>Priority support</li><li>Custom code injection</li></ul>" }, settings: {} },
                  { id: generateId(), type: "button", content: { text: "Start Free Trial", url: "/contact", variant: "primary" }, settings: { align: "center" } },
                ],
              },
              {
                blocks: [
                  { id: tier3Id, type: "heading", content: { text: "Enterprise", level: 3 }, settings: { align: "center" } },
                  { id: generateId(), type: "text", content: { html: "<p><strong>Custom</strong></p><p>For organizations with advanced requirements.</p><ul><li>Everything in Professional</li><li>Dedicated account manager</li><li>Custom integrations</li><li>SLA guarantee</li><li>Onboarding assistance</li><li>Volume discounts</li></ul>" }, settings: {} },
                  { id: generateId(), type: "button", content: { text: "Contact Sales", url: "/contact", variant: "secondary" }, settings: { align: "center" } },
                ],
              },
            ],
          }, settings: { gap: "32" }
        },
        { id: generateId(), type: "divider", content: {}, settings: {} },
        { id: generateId(), type: "heading", content: { text: "Common Questions", level: 2 }, settings: {} },
        {
          id: generateId(), type: "accordion", content: {
            items: [
              { id: generateId(), title: "Can I switch plans at any time?", content: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we will prorate the difference so you only pay for what you use." },
              { id: generateId(), title: "Is there a money-back guarantee?", content: "We offer a 30-day money-back guarantee on all plans. If you are not completely satisfied, contact our support team within the first 30 days for a full refund — no questions asked." },
              { id: generateId(), title: "What payment methods do you accept?", content: "We accept all major credit cards, including Visa, Mastercard, and American Express. Annual plans are also available at a discounted rate. For Enterprise plans, we can arrange invoicing and purchase orders." },
            ],
          }, settings: {}
        },
        { id: generateId(), type: "spacer", content: { height: 32 }, settings: {} },
        { id: generateId(), type: "heading", content: { text: "Not Sure Which Plan Is Right?", level: 2 }, settings: { align: "center" } },
        { id: generateId(), type: "text", content: { html: "<p>Our team can help you find the perfect fit. Start a conversation and we will guide you through the options.</p>" }, settings: { align: "center" } },
        { id: generateId(), type: "button", content: { text: "Talk to Us", url: "/contact", variant: "primary" }, settings: { align: "center" } },
      ];
    }
    default:
      return [];
  }
}

const STARTER_PAGE_CONFIG: Record<string, { title: string; slug: string; isHomepage: boolean; showInNav: boolean; sortOrder: number }> = {
  homepage: { title: "Home", slug: "home", isHomepage: true, showInNav: true, sortOrder: 0 },
  about: { title: "About", slug: "about", isHomepage: false, showInNav: true, sortOrder: 1 },
  contact: { title: "Contact", slug: "contact", isHomepage: false, showInNav: true, sortOrder: 2 },
  blog: { title: "Blog", slug: "blog", isHomepage: false, showInNav: true, sortOrder: 3 },
  services: { title: "Services", slug: "services", isHomepage: false, showInNav: true, sortOrder: 4 },
  faq: { title: "FAQ", slug: "faq", isHomepage: false, showInNav: true, sortOrder: 5 },
  pricing: { title: "Pricing", slug: "pricing", isHomepage: false, showInNav: true, sortOrder: 6 },
};

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`sites-post:${session.user.id}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const parsed = parseBody(createSiteSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { name, description, theme, starterPages } = parsed.data;

    const userId = session.user.id;

    const MAX_SLUG_RETRIES = 3;
    let site;
    for (let attempt = 0; attempt < MAX_SLUG_RETRIES; attempt++) {
      try {
        site = await db.$transaction(async (tx) => {
          let slug = slugify(name);
          const existing = await tx.site.findUnique({ where: { slug } });
          if (existing || attempt > 0) {
            slug = `${slug}-${Date.now().toString(36)}`;
          }

          const s = await tx.site.create({
            data: {
              name,
              slug,
              description: description || null,
              userId,
              ...(theme ? { theme: theme as unknown as Prisma.InputJsonValue } : {}),
            },
          });

          // Determine which pages to create
          const pagesToCreate = starterPages && starterPages.length > 0
            ? starterPages
            : ["homepage"]; // Always at least homepage

          // Ensure homepage is included
          const hasHomepage = pagesToCreate.includes("homepage");

          for (const pageKey of pagesToCreate) {
            const config = STARTER_PAGE_CONFIG[pageKey];
            if (!config) continue;

            const blocks = makeStarterBlocks(pageKey, name);

            const page = await tx.page.create({
              data: {
                title: config.title,
                slug: config.slug,
                isHomepage: config.isHomepage,
                showInNav: config.showInNav,
                sortOrder: config.sortOrder,
                siteId: s.id,
              },
            });

            if (blocks.length > 0) {
              await tx.block.createMany({
                data: blocks.map((b, i) => ({
                  id: b.id,
                  type: b.type,
                  content: b.content as unknown as Prisma.InputJsonValue,
                  settings: b.settings as unknown as Prisma.InputJsonValue,
                  pageId: page.id,
                  sortOrder: i,
                })),
              });
            }
          }

          // If no homepage was in the selection, create a minimal one
          if (!hasHomepage) {
            await tx.page.create({
              data: {
                title: "Home",
                slug: "home",
                isHomepage: true,
                siteId: s.id,
                sortOrder: -1,
              },
            });
          }

          return s;
        });
        break; // Success — exit retry loop
      } catch (error) {
        const isUniqueViolation = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
        if (isUniqueViolation && attempt < MAX_SLUG_RETRIES - 1) {
          continue; // Retry with different slug
        }
        throw error; // Rethrow if not a unique constraint error or out of retries
      }
    }

    revalidateTag("dashboard", { expire: 0 });
    return NextResponse.json(site, { status: 201 });
  } catch (error) {
    return apiError("POST /api/sites", error);
  }
}
