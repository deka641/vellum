import Link from "next/link";
import { Globe, FileText, Palette, Send, CheckCircle2, Circle } from "lucide-react";
import styles from "./GettingStarted.module.css";

interface GettingStartedProps {
  siteCount: number;
  pageCount: number;
  publishedCount: number;
  firstSiteId?: string;
}

export function GettingStarted({ siteCount, pageCount, publishedCount, firstSiteId }: GettingStartedProps) {
  const steps = [
    {
      label: "Create your first site",
      description: "Set up a new website to get started",
      icon: <Globe size={18} />,
      done: siteCount > 0,
      href: "/sites/new",
    },
    {
      label: "Add a page",
      description: "Create a page and start building",
      icon: <FileText size={18} />,
      done: pageCount > 0,
      href: firstSiteId ? `/sites/${firstSiteId}` : "/sites",
    },
    {
      label: "Customize your theme",
      description: "Make your site match your brand",
      icon: <Palette size={18} />,
      done: siteCount > 0 && pageCount > 0,
      href: firstSiteId ? `/sites/${firstSiteId}/settings` : "/sites",
    },
    {
      label: "Publish your first page",
      description: "Go live and share with the world",
      icon: <Send size={18} />,
      done: publishedCount > 0,
      href: firstSiteId ? `/sites/${firstSiteId}` : "/sites",
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;
  const progress = (completedCount / steps.length) * 100;

  if (allDone) {
    return (
      <div className={styles.card}>
        <div className={styles.doneHeader}>
          <CheckCircle2 size={24} className={styles.doneIcon} />
          <div>
            <h3 className={styles.doneTitle}>You&apos;re all set!</h3>
            <p className={styles.doneText}>You&apos;ve completed all the getting started steps. Happy building!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>Getting started</h3>
        <span className={styles.progress}>{completedCount} of {steps.length}</span>
      </div>
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${progress}%` }} />
      </div>
      <div className={styles.steps}>
        {steps.map((step) => (
          <Link key={step.label} href={step.href} className={`${styles.step} ${step.done ? styles.stepDone : ""}`}>
            <div className={styles.stepCheck}>
              {step.done ? (
                <CheckCircle2 size={20} className={styles.checkDone} />
              ) : (
                <Circle size={20} className={styles.checkPending} />
              )}
            </div>
            <div className={styles.stepIcon}>{step.icon}</div>
            <div className={styles.stepContent}>
              <span className={styles.stepLabel}>{step.label}</span>
              <span className={styles.stepDesc}>{step.description}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
