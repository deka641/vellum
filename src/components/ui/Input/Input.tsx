import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import styles from "./Input.module.css";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || props.name;
    const errorId = inputId ? `${inputId}-error` : undefined;
    const hintId = inputId ? `${inputId}-hint` : undefined;
    const describedBy = error ? errorId : hint ? hintId : undefined;
    return (
      <div className={cn(styles.wrapper, error && styles.error, className)}>
        {label && <label htmlFor={inputId} className={styles.label}>{label}</label>}
        <input ref={ref} id={inputId} className={styles.input} aria-invalid={!!error || undefined} aria-describedby={describedBy} {...props} />
        {error && <span id={errorId} className={styles.errorMessage}>{error}</span>}
        {hint && !error && <span id={hintId} className={styles.hint}>{hint}</span>}
      </div>
    );
  }
);
Input.displayName = "Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || props.name;
    const errorId = inputId ? `${inputId}-error` : undefined;
    const hintId = inputId ? `${inputId}-hint` : undefined;
    const describedBy = error ? errorId : hint ? hintId : undefined;
    return (
      <div className={cn(styles.wrapper, error && styles.error, className)}>
        {label && <label htmlFor={inputId} className={styles.label}>{label}</label>}
        <textarea ref={ref} id={inputId} className={cn(styles.input, styles.textarea)} aria-invalid={!!error || undefined} aria-describedby={describedBy} {...props} />
        {error && <span id={errorId} className={styles.errorMessage}>{error}</span>}
        {hint && !error && <span id={hintId} className={styles.hint}>{hint}</span>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";
