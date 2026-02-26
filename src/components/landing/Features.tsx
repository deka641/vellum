"use client";

import { motion } from "framer-motion";
import { Layers, Palette, Zap, Globe, Image, Layout } from "lucide-react";
import styles from "./landing.module.css";

const features = [
  {
    icon: <Layout size={24} />,
    title: "Visual Page Builder",
    description:
      "Drag and drop from 15 block types to build pages visually. Columns, forms, accordions, tables, code snippets, and more \u2014 no coding required.",
  },
  {
    icon: <Layers size={24} />,
    title: "Block-Based Editing",
    description:
      "Every piece of content is a block you can move, duplicate, and style independently. Undo and redo with full history, and reorder with keyboard shortcuts.",
  },
  {
    icon: <Palette size={24} />,
    title: "Theme & Branding",
    description:
      "Customize colors, fonts, and layouts site-wide with a theme system that generates WCAG-compliant contrast ratios automatically.",
  },
  {
    icon: <Zap size={24} />,
    title: "Instant Preview",
    description:
      "See your changes in real-time as you edit. Preview on desktop, tablet, and mobile viewports before publishing. Autosave protects every change.",
  },
  {
    icon: <Image size={24} />,
    title: "Media Library",
    description:
      "Upload images, videos, and documents with automatic optimization. Drag files directly into the editor for instant image blocks.",
  },
  {
    icon: <Globe size={24} />,
    title: "SEO & Publishing",
    description:
      "Publish instantly or schedule for later. Built-in SEO audit, Open Graph images, sitemaps, RSS feeds, and structured data for every page.",
  },
];

export function Features() {
  return (
    <section className={styles.features} id="features">
      <motion.div
        className={styles.featuresHeader}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <h2 className={styles.featuresTitle}>Everything you need</h2>
        <p className={styles.featuresSubtitle}>
          A complete toolkit for building professional websites
        </p>
      </motion.div>
      <div className={styles.featuresGrid}>
        {features.map((feature, i) => (
          <motion.div
            key={feature.title}
            className={styles.featureCard}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
          >
            <div className={styles.featureIcon}>{feature.icon}</div>
            <h3 className={styles.featureTitle}>{feature.title}</h3>
            <p className={styles.featureDescription}>{feature.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
