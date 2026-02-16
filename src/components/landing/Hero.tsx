"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import styles from "./landing.module.css";

export function Hero() {
  return (
    <section className={styles.hero}>
      <motion.div
        className={styles.heroContent}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className={styles.heroTitle}>
          Craft beautiful websites,
          <br />
          <span className={styles.heroAccent}>effortlessly</span>
        </h1>
        <p className={styles.heroSubtitle}>
          Vellum is an intuitive visual page builder that empowers you to create
          stunning websites without writing a single line of code.
        </p>
        <div className={styles.heroCta}>
          <Link href="/register">
            <Button size="lg" rightIcon={<ArrowRight size={18} />}>
              Get started free
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="ghost" size="lg">
              Sign in
            </Button>
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
