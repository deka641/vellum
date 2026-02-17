"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import styles from "./landing.module.css";

const ease = [0.16, 1, 0.3, 1] as const;

export function CallToAction() {
  const prefersReduced = useReducedMotion();

  return (
    <section className={styles.cta}>
      <div className={styles.ctaInner}>
        <motion.h2
          className={styles.ctaTitle}
          initial={prefersReduced ? {} : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, ease }}
        >
          Ready to build something beautiful?
        </motion.h2>
        <motion.p
          className={styles.ctaSubtitle}
          initial={prefersReduced ? {} : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, ease, delay: 0.1 }}
        >
          Start creating your website in minutes. No credit card required.
        </motion.p>
        <motion.div
          initial={prefersReduced ? {} : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, ease, delay: 0.2 }}
        >
          <Link href="/register" className={styles.ctaButton}>
            Get started free
            <ArrowRight size={18} />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
