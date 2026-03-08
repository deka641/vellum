"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import Link from "next/link";
import styles from "./ContentCalendar.module.css";

interface ScheduledPage {
  id: string;
  title: string;
  scheduledPublishAt: string;
}

interface ContentCalendarProps {
  pages: ScheduledPage[];
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ContentCalendar({ pages }: ContentCalendarProps) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const pagesByDate = useMemo(() => {
    const map = new Map<string, ScheduledPage[]>();
    for (const page of pages) {
      const d = new Date(page.scheduledPublishAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const list = map.get(key) || [];
      list.push(page);
      map.set(key, list);
    }
    return map;
  }, [pages]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  if (pages.length === 0) {
    return (
      <div className={styles.empty}>
        <Clock size={24} />
        <p>No scheduled pages</p>
      </div>
    );
  }

  return (
    <div className={styles.calendar}>
      <div className={styles.header}>
        <button className={styles.navBtn} onClick={prevMonth} aria-label="Previous month">
          <ChevronLeft size={16} />
        </button>
        <span className={styles.monthLabel}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button className={styles.navBtn} onClick={nextMonth} aria-label="Next month">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className={styles.grid}>
        {DAY_NAMES.map((d) => (
          <div key={d} className={styles.dayHeader}>{d}</div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className={styles.dayCell} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const key = `${viewYear}-${viewMonth}-${day}`;
          const scheduled = pagesByDate.get(key);
          const isToday = key === todayKey;
          return (
            <div
              key={day}
              className={`${styles.dayCell} ${isToday ? styles.dayCellToday : ""} ${scheduled ? styles.dayCellScheduled : ""}`}
            >
              <span className={styles.dayNumber}>{day}</span>
              {scheduled && scheduled.map((p) => (
                <Link
                  key={p.id}
                  href={`/editor/${p.id}`}
                  className={styles.scheduledItem}
                  title={`${p.title} — ${new Date(p.scheduledPublishAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                >
                  {p.title}
                </Link>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
