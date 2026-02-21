"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Type, AlignLeft, Image as ImageIcon, MousePointer, Columns2, Settings2, Plus } from "lucide-react";
import styles from "./landing.module.css";

const ease = [0.16, 1, 0.3, 1] as const;

function EditorMockup() {
  return (
    <motion.div
      className={styles.mockup}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.4, ease }}
    >
      {/* Browser chrome */}
      <div className={styles.mockupChrome}>
        <div className={styles.mockupDots}>
          <span /><span /><span />
        </div>
        <div className={styles.mockupUrl}>
          <span>vellum.app/s/my-site</span>
        </div>
      </div>

      {/* Editor body */}
      <div className={styles.mockupBody}>
        {/* Sidebar */}
        <div className={styles.mockupSidebar}>
          <div className={styles.mockupSidebarTitle}>
            <Plus size={12} />
            <span>Add Block</span>
          </div>
          {[
            { icon: <Type size={14} />, label: "Heading" },
            { icon: <AlignLeft size={14} />, label: "Text" },
            { icon: <ImageIcon size={14} />, label: "Image" },
            { icon: <MousePointer size={14} />, label: "Button" },
            { icon: <Columns2 size={14} />, label: "Columns" },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              className={styles.mockupBlockBtn}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.8 + i * 0.08, ease }}
            >
              {item.icon}
              <span>{item.label}</span>
            </motion.div>
          ))}
        </div>

        {/* Canvas */}
        <div className={styles.mockupCanvas}>
          <motion.div
            className={styles.mockupBlock}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6, ease }}
          >
            <div className={styles.mockupHeading}>Welcome to My Site</div>
          </motion.div>
          <motion.div
            className={styles.mockupBlock}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.75, ease }}
          >
            <div className={styles.mockupTextLine} />
            <div className={styles.mockupTextLine} style={{ width: "85%" }} />
            <div className={styles.mockupTextLine} style={{ width: "65%" }} />
          </motion.div>
          <motion.div
            className={`${styles.mockupBlock} ${styles.mockupBlockActive}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.9, ease }}
          >
            <div className={styles.mockupImagePlaceholder}>
              <ImageIcon size={20} />
            </div>
          </motion.div>
          <motion.div
            className={styles.mockupBlock}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 1.05, ease }}
          >
            <div className={styles.mockupBtn}>Get Started</div>
          </motion.div>
        </div>

        {/* Settings panel hint */}
        <div className={styles.mockupSettings}>
          <div className={styles.mockupSidebarTitle}>
            <Settings2 size={12} />
            <span>Settings</span>
          </div>
          <div className={styles.mockupSettingsRow}>
            <span>Width</span>
            <div className={styles.mockupSettingsInput} />
          </div>
          <div className={styles.mockupSettingsRow}>
            <span>Rounded</span>
            <div className={styles.mockupToggle}><div className={styles.mockupToggleDot} /></div>
          </div>
          <div className={styles.mockupSettingsRow}>
            <span>Shadow</span>
            <div className={styles.mockupToggle}><div className={styles.mockupToggleDot} /></div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function Hero() {
  return (
    <section className={styles.hero}>
      <motion.div
        className={styles.heroContent}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
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
          <Link href="/register" className={styles.heroCtaPrimary}>
            Get started free
            <ArrowRight size={18} />
          </Link>
          <Link href="/login" className={styles.heroCtaGhost}>
            Sign in
          </Link>
        </div>
      </motion.div>
      <EditorMockup />
    </section>
  );
}
