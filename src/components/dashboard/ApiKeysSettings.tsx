"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Key, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { useToast } from "@/components/ui/Toast/Toast";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import styles from "./ApiKeysSettings.module.css";

interface ApiKeyRecord {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

interface ApiKeysSettingsProps {
  siteId: string;
}

export function ApiKeysSettings({ siteId }: ApiKeysSettingsProps) {
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const loadKeys = useCallback(async () => {
    setFetchError(false);
    try {
      const res = await fetch(`/api/sites/${siteId}/api-keys`);
      if (!res.ok) throw new Error("Failed to load API keys");
      const data = await res.json();
      if (Array.isArray(data)) setApiKeys(data);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  async function handleAdd() {
    if (!newName.trim()) {
      toast("Name is required", "error");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setApiKeys((prev) => [
          { id: data.id, name: data.name, prefix: data.prefix, createdAt: data.createdAt, lastUsedAt: null },
          ...prev,
        ]);
        setNewName("");
        setShowAddForm(false);
        // Show the full key in the revealed dialog
        setRevealedKey(data.key);
      } else {
        const data = await res.json().catch(() => ({}));
        toast(data.error || "Failed to create API key", "error");
      }
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/sites/${siteId}/api-keys?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setApiKeys((prev) => prev.filter((k) => k.id !== id));
        toast("API key deleted");
      } else {
        toast("Failed to delete API key", "error");
      }
    } catch {
      toast("Something went wrong", "error");
    }
  }

  function handleCopyKey() {
    if (revealedKey) {
      navigator.clipboard.writeText(revealedKey).then(() => {
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
        toast("API key copied to clipboard");
      }).catch(() => {
        toast("Failed to copy", "error");
      });
    }
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>API Keys</h3>
        <Skeleton height={40} />
        <Skeleton height={60} />
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h3 className={styles.sectionTitle}>API Keys</h3>
          <p className={styles.sectionDesc}>
            Read-only API keys for headless CMS access to your published content.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Plus size={14} />}
          onClick={() => setShowAddForm(true)}
          disabled={showAddForm}
        >
          Create key
        </Button>
      </div>

      {fetchError ? (
        <div className={styles.empty}>
          <span>Failed to load API keys</span>
          <Button variant="secondary" size="sm" onClick={loadKeys}>
            Retry
          </Button>
        </div>
      ) : (
        <>
          {showAddForm && (
            <div className={styles.addForm}>
              <Input
                label="Key name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Production frontend"
                hint="A descriptive name to identify this key"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
              />
              <div className={styles.addFormActions}>
                <Button
                  size="sm"
                  disabled={adding}
                  onClick={handleAdd}
                  leftIcon={<Key size={14} />}
                >
                  {adding ? "Creating..." : "Create API key"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewName("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {apiKeys.length === 0 && !showAddForm ? (
            <div className={styles.empty}>
              <Key size={24} />
              <span>No API keys created</span>
              <p className={styles.emptyHint}>
                Create an API key to access your published pages as JSON via the
                headless CMS API. Keys are read-only and scoped to this site.
              </p>
            </div>
          ) : (
            <div className={styles.list}>
              {apiKeys.map((apiKey) => (
                <div key={apiKey.id} className={styles.keyCard}>
                  <div className={styles.keyHeader}>
                    <div className={styles.keyInfo}>
                      <span className={styles.keyName}>{apiKey.name}</span>
                      <code className={styles.keyPrefix}>{apiKey.prefix}...</code>
                    </div>
                    <div className={styles.keyActions}>
                      <button
                        type="button"
                        className={`${styles.actionBtn} ${styles.actionDanger}`}
                        onClick={() => setDeleteTarget(apiKey.id)}
                        title="Delete API key"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className={styles.keyMeta}>
                    <span>Created: {formatDate(apiKey.createdAt)}</span>
                    <span>Last used: {formatDate(apiKey.lastUsedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className={styles.endpointHint}>
            <p className={styles.endpointLabel}>API Endpoint</p>
            <p className={styles.endpointUrl}>
              GET /api/public/sites/{siteId}/pages
            </p>
            <p className={styles.endpointUrl} style={{ marginTop: 4, color: "var(--color-text-tertiary)" }}>
              Authorization: Bearer {"<your-api-key>"}
            </p>
          </div>
        </>
      )}

      {/* Revealed key dialog — shown once after creation */}
      {revealedKey && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="API key created"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0, 0, 0, 0.5)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setRevealedKey(null);
              setCopiedKey(false);
            }
          }}
        >
          <div
            style={{
              background: "var(--color-surface)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-6)",
              maxWidth: 480,
              width: "calc(100% - var(--space-8))",
              boxShadow: "var(--shadow-lg, 0 10px 15px -3px rgba(0,0,0,0.1))",
            }}
          >
            <h3 style={{ fontSize: "var(--text-base)", fontWeight: "var(--weight-semibold)", margin: "0 0 var(--space-2) 0" }}>
              API Key Created
            </h3>
            <div className={styles.revealedKeyBox}>
              <div className={styles.revealedKeyWarning}>
                Copy this key now. It will not be shown again.
              </div>
              <div className={styles.revealedKeyValue}>
                {revealedKey}
              </div>
              <div className={styles.revealedKeyActions}>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={copiedKey ? <Check size={14} /> : <Copy size={14} />}
                  onClick={handleCopyKey}
                >
                  {copiedKey ? "Copied" : "Copy key"}
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setRevealedKey(null);
                    setCopiedKey(false);
                  }}
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete API key"
        description="Are you sure you want to delete this API key? Any applications using this key will lose access immediately."
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
