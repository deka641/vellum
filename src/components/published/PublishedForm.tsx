"use client";

import { useState, useRef, type FormEvent } from "react";
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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function PublishedForm({ blockId, pageId, fields, submitText, successMessage }: PublishedFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);

  function validateFields(formData: FormData): Record<string, string> {
    const errors: Record<string, string> = {};
    for (const field of fields) {
      const value = formData.get(field.id)?.toString()?.trim() || "";

      if (field.required && !value && field.type !== "checkbox") {
        errors[field.id] = "This field is required";
        continue;
      }

      if (field.type === "email" && value && !EMAIL_REGEX.test(value)) {
        errors[field.id] = "Please enter a valid email address";
      }
    }
    return errors;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const formData = new FormData(e.currentTarget);

    const errors = validateFields(formData);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSubmitting(false);
      // Scroll to first error
      const firstErrorId = Object.keys(errors)[0];
      const el = document.getElementById(firstErrorId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setFieldErrors({});

    const data: Record<string, string> = {};
    for (const field of fields) {
      if (field.type === "checkbox") {
        data[field.label] = formData.get(field.id) ? "Yes" : "No";
      } else {
        data[field.label] = formData.get(field.id)?.toString() || "";
      }
    }

    const honeypotValue = formData.get("website_url")?.toString() || "";

    try {
      const res = await fetch(`/api/forms/${blockId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, pageId, _hp: honeypotValue }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else if (res.status === 429) {
        const retryAfter = res.headers.get("Retry-After");
        setError(`Too many submissions. Please wait ${retryAfter ? `${retryAfter} seconds` : "a moment"} before trying again.`);
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Something went wrong. Please try again.");
      }
    } catch (err) {
      if (err instanceof TypeError) {
        setError("Could not reach the server. Please check your connection and try again.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function clearFieldError(fieldId: string) {
    if (fieldErrors[fieldId]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  }

  if (submitted) {
    return (
      <div className={styles.formBlock}>
        <p className={styles.formSuccess}>{successMessage || "Thank you! Your submission has been received."}</p>
        <button
          type="button"
          className={styles.formResetBtn}
          onClick={() => {
            setSubmitted(false);
            setError("");
            setFieldErrors({});
            formRef.current?.reset();
          }}
        >
          Submit another response
        </button>
      </div>
    );
  }

  function renderField(field: FormField) {
    const hasError = Boolean(fieldErrors[field.id]);
    const errorClass = hasError ? ` ${styles.formInputError}` : "";
    const errorId = `${field.id}-error`;

    switch (field.type) {
      case "textarea":
        return (
          <>
            <textarea
              id={field.id}
              name={field.id}
              className={`${styles.formTextarea}${errorClass}`}
              placeholder={field.placeholder}
              rows={4}
              required={field.required}
              aria-required={field.required || undefined}
              aria-invalid={hasError || undefined}
              aria-describedby={hasError ? errorId : undefined}
              onChange={() => clearFieldError(field.id)}
            />
            {hasError && <span id={errorId} className={styles.formError} role="alert">{fieldErrors[field.id]}</span>}
          </>
        );
      case "select":
        return (
          <>
            <select
              id={field.id}
              name={field.id}
              className={`${styles.formSelect}${errorClass}`}
              required={field.required}
              aria-required={field.required || undefined}
              aria-invalid={hasError || undefined}
              aria-describedby={hasError ? errorId : undefined}
              onChange={() => clearFieldError(field.id)}
            >
              <option value="">{field.placeholder || "Select..."}</option>
              {(field.options || []).map((opt, i) => (
                <option key={i} value={opt}>{opt}</option>
              ))}
            </select>
            {hasError && <span id={errorId} className={styles.formError} role="alert">{fieldErrors[field.id]}</span>}
          </>
        );
      case "radio":
        return (
          <>
            <fieldset className={styles.formRadioGroup} role="radiogroup" aria-required={field.required}>
              <legend className={styles.srOnly}>{field.label}</legend>
              {(field.options || []).map((opt, i) => (
                <label key={i} className={styles.formRadioLabel}>
                  <input
                    type="radio"
                    name={field.id}
                    value={opt}
                    required={field.required}
                    onChange={() => clearFieldError(field.id)}
                  />
                  {opt}
                </label>
              ))}
            </fieldset>
            {hasError && <span id={errorId} className={styles.formError} role="alert">{fieldErrors[field.id]}</span>}
          </>
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
          <>
            <input
              id={field.id}
              name={field.id}
              type={field.type}
              className={`${styles.formInput}${errorClass}`}
              placeholder={field.placeholder}
              required={field.required}
              aria-required={field.required || undefined}
              aria-invalid={hasError || undefined}
              aria-describedby={hasError ? errorId : undefined}
              onChange={() => clearFieldError(field.id)}
            />
            {hasError && <span id={errorId} className={styles.formError} role="alert">{fieldErrors[field.id]}</span>}
          </>
        );
    }
  }

  return (
    <form className={styles.formBlock} onSubmit={handleSubmit} ref={formRef} noValidate>
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor={`${blockId}_hp`}>Do not fill this field</label>
        <input type="text" id={`${blockId}_hp`} name="website_url" tabIndex={-1} autoComplete="off" />
      </div>
      {fields.map((field) => (
        <div key={field.id} className={styles.formField}>
          <label className={styles.formLabel} htmlFor={field.id} id={field.id + "-label"}>
            {field.label}
            {field.required && <span className={styles.formRequired}>*</span>}
          </label>
          {renderField(field)}
        </div>
      ))}
      {error && <p role="alert" style={{ color: "var(--color-error)", fontSize: "var(--text-sm)" }}>{error}</p>}
      <button type="submit" className={styles.formSubmit} disabled={submitting}>
        {submitting ? "Submitting..." : submitText || "Submit"}
      </button>
    </form>
  );
}
