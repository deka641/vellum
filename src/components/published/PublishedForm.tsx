"use client";

import { useState, type FormEvent } from "react";
import styles from "./published.module.css";

interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

interface PublishedFormProps {
  blockId: string;
  pageId: string;
  fields: FormField[];
  submitText: string;
  successMessage: string;
}

export function PublishedForm({ blockId, pageId, fields, submitText, successMessage }: PublishedFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const data: Record<string, string> = {};
    for (const field of fields) {
      if (field.type === "checkbox") {
        data[field.label] = formData.get(field.id) ? "Yes" : "No";
      } else {
        data[field.label] = formData.get(field.id)?.toString() || "";
      }
    }

    try {
      const res = await fetch(`/api/forms/${blockId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, pageId }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const body = await res.json();
        setError(body.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className={styles.formBlock}>
        <p className={styles.formSuccess}>{successMessage || "Thank you! Your submission has been received."}</p>
      </div>
    );
  }

  return (
    <form className={styles.formBlock} onSubmit={handleSubmit}>
      {fields.map((field) => (
        <div key={field.id} className={styles.formField}>
          <label className={styles.formLabel} htmlFor={field.id}>
            {field.label}
            {field.required && <span className={styles.formRequired}>*</span>}
          </label>
          {renderField(field)}
        </div>
      ))}
      {error && <p style={{ color: "var(--color-error)", fontSize: "var(--text-sm)" }}>{error}</p>}
      <button type="submit" className={styles.formSubmit} disabled={submitting}>
        {submitting ? "Submitting..." : submitText || "Submit"}
      </button>
    </form>
  );
}

function renderField(field: FormField) {
  switch (field.type) {
    case "textarea":
      return (
        <textarea
          id={field.id}
          name={field.id}
          className={styles.formTextarea}
          placeholder={field.placeholder}
          rows={4}
          required={field.required}
        />
      );
    case "select":
      return (
        <select
          id={field.id}
          name={field.id}
          className={styles.formSelect}
          required={field.required}
        >
          <option value="">{field.placeholder || "Select..."}</option>
          {(field.options || []).map((opt, i) => (
            <option key={i} value={opt}>{opt}</option>
          ))}
        </select>
      );
    case "radio":
      return (
        <div className={styles.formRadioGroup}>
          {(field.options || []).map((opt, i) => (
            <label key={i} className={styles.formRadioLabel}>
              <input
                type="radio"
                name={field.id}
                value={opt}
                required={field.required}
              />
              {opt}
            </label>
          ))}
        </div>
      );
    case "checkbox":
      return (
        <div className={styles.formCheckboxField}>
          <label className={styles.formCheckboxLabel}>
            <input
              type="checkbox"
              id={field.id}
              name={field.id}
              value="yes"
            />
            {field.placeholder || "Yes"}
          </label>
        </div>
      );
    default:
      return (
        <input
          id={field.id}
          name={field.id}
          type={field.type}
          className={styles.formInput}
          placeholder={field.placeholder}
          required={field.required}
        />
      );
  }
}
