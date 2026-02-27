"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import styles from "./landing.module.css";

const ease = [0.16, 1, 0.3, 1] as const;

const faqs = [
  {
    question: "Do I need coding experience to use Vellum?",
    answer:
      "No. Vellum\u2019s visual editor uses drag-and-drop blocks. You can build complete websites with text, images, forms, tables, and more \u2014 without writing any code.",
  },
  {
    question: "How does the theme system work?",
    answer:
      "Each site has a theme with 4 base colors and a font preset. Vellum automatically generates 18 design tokens from these choices, including WCAG-compliant contrast ratios for text and buttons.",
  },
  {
    question: "Is there a limit on pages or sites?",
    answer:
      "No artificial limits. You can create unlimited sites and pages. The platform is self-hosted, so it scales with your infrastructure.",
  },
  {
    question: "How are form submissions handled?",
    answer:
      "Form blocks collect submissions stored in your database. You can view, search, and export submissions as CSV from the dashboard. Optional email notifications alert you to new entries.",
  },
  {
    question: "Can I schedule content to publish later?",
    answer:
      "Yes. The editor includes a schedule option where you can pick a future date and time up to one year ahead. Scheduled pages are published automatically. You can cancel or reschedule at any time.",
  },
  {
    question: "What SEO features are included?",
    answer:
      "Meta titles, Open Graph images, noindex controls, auto-generated sitemaps, RSS feeds, structured data (JSON-LD), breadcrumbs, and a real-time SEO audit that checks your content before publishing.",
  },
];

function FAQItem({
  question,
  answer,
  index,
}: {
  question: string;
  answer: string;
  index: number;
}) {
  const [open, setOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={styles.faqItem}
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{
        duration: shouldReduceMotion ? 0.15 : 0.4,
        ease,
        delay: index * 0.05,
      }}
    >
      <button
        className={styles.faqQuestion}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span>{question}</span>
        <ChevronDown
          size={18}
          className={`${styles.faqChevron} ${open ? styles.faqChevronOpen : ""}`}
        />
      </button>
      <div
        className={`${styles.faqAnswer} ${open ? styles.faqAnswerOpen : ""}`}
        role="region"
      >
        <p>{answer}</p>
      </div>
    </motion.div>
  );
}

export function FAQ() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className={styles.faq} id="faq">
      <motion.h2
        className={styles.faqTitle}
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{
          duration: shouldReduceMotion ? 0.15 : 0.5,
          ease,
        }}
      >
        Frequently Asked Questions
      </motion.h2>
      <div className={styles.faqList}>
        {faqs.map((faq, i) => (
          <FAQItem
            key={i}
            question={faq.question}
            answer={faq.answer}
            index={i}
          />
        ))}
      </div>
    </section>
  );
}
