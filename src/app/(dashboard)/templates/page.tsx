"use client";

import { useEffect, useState } from "react";
import { LayoutTemplate } from "lucide-react";
import { Topbar } from "@/components/dashboard/Topbar";
import { Card } from "@/components/ui/Card/Card";
import { Badge } from "@/components/ui/Badge/Badge";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import styles from "./templates.module.css";

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string;
  isSystem: boolean;
  blocks: unknown[];
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/templates")
      .then((res) => res.json())
      .then(setTemplates)
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Topbar
        title="Templates"
        description="Pre-built page templates to get you started"
      />
      <div className={styles.content}>
        {loading ? (
          <div className={styles.grid}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} height={200} />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className={styles.empty}>
            <LayoutTemplate size={48} strokeWidth={1} />
            <h3>No templates yet</h3>
            <p>Templates will appear here once created or seeded</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {templates.map((template) => (
              <Card key={template.id} hover padding="md">
                <div className={styles.templatePreview}>
                  <LayoutTemplate size={24} />
                </div>
                <div className={styles.templateInfo}>
                  <h3 className={styles.templateName}>{template.name}</h3>
                  {template.description && (
                    <p className={styles.templateDesc}>{template.description}</p>
                  )}
                  <div className={styles.templateMeta}>
                    <Badge>{template.category}</Badge>
                    {template.isSystem && <Badge variant="accent">System</Badge>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
