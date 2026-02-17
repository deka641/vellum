"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Blocks, FileText, Palette, Quote } from "lucide-react";
import styles from "./landing.module.css";

const ease = [0.16, 1, 0.3, 1] as const;

const stats = [
  { icon: <Blocks size={20} />, value: "12", label: "Block Types" },
  { icon: <FileText size={20} />, value: "Unlimited", label: "Pages & Sites" },
  { icon: <Palette size={20} />, value: "6", label: "Theme Presets" },
];

const testimonials = [
  {
    quote: "Vellum made it incredibly easy to build a professional website for my portfolio. The drag-and-drop editor is intuitive and the results look stunning.",
    name: "Sarah Chen",
    role: "Freelance Designer",
  },
  {
    quote: "I was able to set up a complete business site with forms, navigation, and custom themes in under an hour. No coding required whatsoever.",
    name: "Marcus Rivera",
    role: "Small Business Owner",
  },
  {
    quote: "The block-based approach gives me the flexibility I need while keeping everything consistent. Publishing changes is instant and the sites load fast.",
    name: "Emma Larsson",
    role: "Content Creator",
  },
];

export function SocialProof() {
  const shouldReduceMotion = useReducedMotion();

  const fadeUp = shouldReduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.15 } }
    : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, ease } };

  return (
    <section className={styles.socialProof}>
      <div className={styles.socialProofStats}>
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            className={styles.socialProofStat}
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: i * 0.1 }}
          >
            <div className={styles.socialProofStatIcon}>{stat.icon}</div>
            <div className={styles.socialProofStatValue}>{stat.value}</div>
            <div className={styles.socialProofStatLabel}>{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className={styles.testimonials}>
        <motion.h2
          className={styles.testimonialsTitle}
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.2 }}
        >
          Loved by creators
        </motion.h2>
        <div className={styles.testimonialsGrid}>
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              className={styles.testimonialCard}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: 0.3 + i * 0.1 }}
            >
              <Quote size={20} className={styles.testimonialQuoteIcon} />
              <p className={styles.testimonialText}>{t.quote}</p>
              <div className={styles.testimonialAuthor}>
                <div className={styles.testimonialAvatar}>
                  {t.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <div className={styles.testimonialName}>{t.name}</div>
                  <div className={styles.testimonialRole}>{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
