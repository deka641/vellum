"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/dashboard/Topbar";
import { Input, Textarea } from "@/components/ui/Input/Input";
import { Button } from "@/components/ui/Button/Button";
import { useToast } from "@/components/ui/Toast/Toast";
import styles from "./new-site.module.css";

export default function NewSitePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          description: formData.get("description"),
        }),
      });

      if (res.ok) {
        const site = await res.json();
        toast("Site created!");
        router.push(`/sites/${site.id}`);
      } else {
        const data = await res.json();
        toast(data.error || "Failed to create site", "error");
      }
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Topbar title="Create a new site" />
      <div className={styles.content}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            name="name"
            label="Site name"
            placeholder="My Portfolio"
            required
            autoFocus
          />
          <Textarea
            name="description"
            label="Description"
            placeholder="A brief description of your site (optional)"
            rows={3}
          />
          <div className={styles.actions}>
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create site"}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
