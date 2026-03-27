"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Zap, Copy, Check, Send } from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import { Badge } from "@/components/ui/Badge/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { useToast } from "@/components/ui/Toast/Toast";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import styles from "./WebhooksSettings.module.css";

interface WebhookRecord {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  lastTriggeredAt: string | null;
  lastStatusCode: number | null;
  createdAt: string;
  secret?: string;
}

const ALL_EVENTS = [
  { value: "page.published", label: "Page published" },
  { value: "page.unpublished", label: "Page unpublished" },
  { value: "form.submitted", label: "Form submitted" },
  { value: "site.updated", label: "Site updated" },
] as const;

interface WebhooksSettingsProps {
  siteId: string;
}

export function WebhooksSettings({ siteId }: WebhooksSettingsProps) {
  const { toast } = useToast();
  const [webhooks, setWebhooks] = useState<WebhookRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newEvents, setNewEvents] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const loadWebhooks = useCallback(async () => {
    setFetchError(false);
    try {
      const res = await fetch(`/api/sites/${siteId}/webhooks`);
      if (!res.ok) throw new Error("Failed to load webhooks");
      const data = await res.json();
      if (Array.isArray(data)) setWebhooks(data);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    loadWebhooks();
  }, [loadWebhooks]);

  async function handleAdd() {
    if (!newUrl.trim()) {
      toast("URL is required", "error");
      return;
    }
    if (newEvents.size === 0) {
      toast("Select at least one event", "error");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/webhooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: newUrl.trim(),
          events: Array.from(newEvents),
        }),
      });
      if (res.ok) {
        const webhook = await res.json();
        setWebhooks((prev) => [webhook, ...prev]);
        setNewUrl("");
        setNewEvents(new Set());
        setShowAddForm(false);
        toast("Webhook created");

        // Show the secret once so user can copy it
        if (webhook.secret) {
          toast(`Secret: ${webhook.secret.slice(0, 12)}... (copy from the list)`);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        toast(data.error || "Failed to create webhook", "error");
      }
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/sites/${siteId}/webhooks?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setWebhooks((prev) => prev.filter((w) => w.id !== id));
        toast("Webhook deleted");
      } else {
        toast("Failed to delete webhook", "error");
      }
    } catch {
      toast("Something went wrong", "error");
    }
  }

  async function handleToggleActive(webhook: WebhookRecord) {
    try {
      const res = await fetch(`/api/sites/${siteId}/webhooks?id=${webhook.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !webhook.active }),
      });
      if (res.ok) {
        setWebhooks((prev) =>
          prev.map((w) =>
            w.id === webhook.id ? { ...w, active: !w.active } : w
          )
        );
        toast(webhook.active ? "Webhook paused" : "Webhook activated");
      } else {
        toast("Failed to update webhook", "error");
      }
    } catch {
      toast("Something went wrong", "error");
    }
  }

  async function handleTest(webhookId: string) {
    setTestingId(webhookId);
    try {
      const res = await fetch(`/api/sites/${siteId}/webhooks?id=${webhookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: true }),
      });
      if (res.ok) {
        toast("Test event sent");
        // Reload to get updated lastTriggeredAt
        loadWebhooks();
      } else {
        toast("Failed to send test event", "error");
      }
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setTestingId(null);
    }
  }

  function handleCopySecret(webhook: WebhookRecord) {
    if (webhook.secret) {
      navigator.clipboard.writeText(webhook.secret).then(() => {
        setCopiedId(webhook.id);
        setTimeout(() => setCopiedId(null), 2000);
        toast("Secret copied to clipboard");
      }).catch(() => {
        toast("Failed to copy", "error");
      });
    }
  }

  function toggleEvent(eventValue: string) {
    setNewEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventValue)) {
        next.delete(eventValue);
      } else {
        next.add(eventValue);
      }
      return next;
    });
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getStatusBadge(statusCode: number | null) {
    if (statusCode === null) return null;
    if (statusCode >= 200 && statusCode < 300) {
      return <Badge variant="success">{statusCode}</Badge>;
    }
    if (statusCode >= 400) {
      return <Badge variant="error">{statusCode}</Badge>;
    }
    return <Badge variant="warning">{statusCode}</Badge>;
  }

  if (loading) {
    return (
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Webhooks</h3>
        <Skeleton height={40} />
        <Skeleton height={60} />
        <Skeleton height={60} />
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h3 className={styles.sectionTitle}>Webhooks</h3>
          <p className={styles.sectionDesc}>
            Receive HTTP notifications when events happen on your site.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Plus size={14} />}
          onClick={() => setShowAddForm(true)}
          disabled={showAddForm}
        >
          Add webhook
        </Button>
      </div>

      {fetchError ? (
        <div className={styles.empty}>
          <span>Failed to load webhooks</span>
          <Button variant="secondary" size="sm" onClick={loadWebhooks}>
            Retry
          </Button>
        </div>
      ) : (
        <>
          {showAddForm && (
            <div className={styles.addForm}>
              <Input
                label="Endpoint URL"
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://example.com/webhook"
                hint="Must use HTTPS"
              />
              <div className={styles.eventsPicker}>
                <label className={styles.eventsLabel}>Events</label>
                <div className={styles.eventsGrid}>
                  {ALL_EVENTS.map((evt) => (
                    <label key={evt.value} className={styles.eventCheckbox}>
                      <input
                        type="checkbox"
                        checked={newEvents.has(evt.value)}
                        onChange={() => toggleEvent(evt.value)}
                      />
                      <span>{evt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className={styles.addFormActions}>
                <Button
                  size="sm"
                  disabled={adding}
                  onClick={handleAdd}
                  leftIcon={<Zap size={14} />}
                >
                  {adding ? "Creating..." : "Create webhook"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewUrl("");
                    setNewEvents(new Set());
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {webhooks.length === 0 && !showAddForm ? (
            <div className={styles.empty}>
              <Zap size={24} />
              <span>No webhooks configured</span>
              <p className={styles.emptyHint}>
                Webhooks send real-time notifications to external services when
                pages are published, forms are submitted, or your site is
                updated.
              </p>
            </div>
          ) : (
            <div className={styles.list}>
              {webhooks.map((webhook) => (
                <div
                  key={webhook.id}
                  className={`${styles.webhookCard} ${!webhook.active ? styles.webhookInactive : ""}`}
                >
                  <div className={styles.webhookHeader}>
                    <div className={styles.webhookUrl}>
                      <code className={styles.urlText}>{webhook.url}</code>
                      <Badge
                        variant={webhook.active ? "success" : "default"}
                        dot
                      >
                        {webhook.active ? "Active" : "Paused"}
                      </Badge>
                    </div>
                    <div className={styles.webhookActions}>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => handleTest(webhook.id)}
                        disabled={testingId === webhook.id}
                        title="Send test event"
                      >
                        <Send size={14} />
                      </button>
                      {webhook.secret && (
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => handleCopySecret(webhook)}
                          title="Copy signing secret"
                        >
                          {copiedId === webhook.id ? (
                            <Check size={14} />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        className={`${styles.actionBtn} ${styles.actionDanger}`}
                        onClick={() => setDeleteTarget(webhook.id)}
                        title="Delete webhook"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className={styles.webhookMeta}>
                    <div className={styles.webhookEvents}>
                      {webhook.events.map((evt) => (
                        <span key={evt} className={styles.eventTag}>
                          {evt}
                        </span>
                      ))}
                    </div>
                    <div className={styles.webhookStatus}>
                      {webhook.lastTriggeredAt && (
                        <span className={styles.lastTriggered}>
                          Last triggered: {formatDate(webhook.lastTriggeredAt)}
                        </span>
                      )}
                      {getStatusBadge(webhook.lastStatusCode)}
                    </div>
                  </div>
                  <div className={styles.webhookFooter}>
                    <button
                      type="button"
                      className={styles.toggleBtn}
                      onClick={() => handleToggleActive(webhook)}
                    >
                      {webhook.active ? "Pause" : "Activate"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete webhook"
        description="Are you sure you want to delete this webhook? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (deleteTarget) {
            handleDelete(deleteTarget);
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}
