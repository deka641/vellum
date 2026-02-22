"use client";

import { motion } from "framer-motion";
import { Layers, Palette, Zap, Globe, Image, Layout } from "lucide-react";
import styles from "./landing.module.css";

const features = [
  {
    icon: <Layout size={24} />,
    title: "Visual Page Builder",
    description:
      "Drag and drop blocks to build pages. No coding required.",
  },
  {
    icon: <Layers size={24} />,
    title: "Block-Based Editing",
    description:
      "Headings, text, images, buttons, columns, videos and more.",
  },
  {
    icon: <Palette size={24} />,
    title: "Elegant Design",
    description:
      "Beautiful, minimal aesthetic that makes your content shine.",
  },
  {
    icon: <Zap size={24} />,
    title: "Instant Preview",
    description:
      "See your changes in real-time as you build your pages.",
  },
  {
    icon: <Image size={24} />,
    title: "Media Library",
    description:
      "Upload, organize, and insert images with a built-in media manager.",
  },
  {
    icon: <Globe size={24} />,
    title: "One-Click Publish",
    description:
      "Publish your pages instantly. Share your site with the world.",
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
