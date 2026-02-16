"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import { generateId } from "@/lib/utils";
import type { FormContent, FormField } from "@/types/blocks";
import styles from "./blocks.module.css";

interface FormBlockProps {
  id: string;
  content: FormContent;
}

export function FormBlock({ id, content }: FormBlockProps) {
  const updateBlockContent = useEditorStore((s) => s.updateBlockContent);
  const fields = content.fields || [];

  function updateField(fieldId: string, updates: Partial<FormField>) {
    const newFields = fields.map((f) =>
      f.id === fieldId ? { ...f, ...updates } : f
    );
    updateBlockContent(id, { fields: newFields });
  }

  function addField() {
    const newField: FormField = {
      id: generateId(),
      type: "text",
      label: "New field",
      required: false,
    };
    updateBlockContent(id, { fields: [...fields, newField] });
  }

  function removeField(fieldId: string) {
    updateBlockContent(id, { fields: fields.filter((f) => f.id !== fieldId) });
  }

  return (
    <div className={styles.formEditor}>
      {fields.map((field) => (
        <div key={field.id} className={styles.formFieldEditor}>
          <input
            className={styles.formFieldLabel}
            value={field.label}
            onChange={(e) => updateField(field.id, { label: e.target.value })}
            placeholder="Field label"
            onClick={(e) => e.stopPropagation()}
          />
          <select
            className={styles.formFieldType}
            value={field.type}
            onChange={(e) => updateField(field.id, { type: e.target.value as FormField["type"] })}
            onClick={(e) => e.stopPropagation()}
          >
            <option value="text">Text</option>
            <option value="email">Email</option>
            <option value="textarea">Textarea</option>
          </select>
          <button
            className={`${styles.formFieldRequired} ${field.required ? styles.formFieldRequiredActive : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              updateField(field.id, { required: !field.required });
            }}
            title={field.required ? "Required" : "Optional"}
          >
            {field.required ? "Req" : "Opt"}
          </button>
          <button
            className={styles.formFieldDelete}
            onClick={(e) => {
              e.stopPropagation();
              removeField(field.id);
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button
        className={styles.formAddField}
        onClick={(e) => {
          e.stopPropagation();
          addField();
        }}
      >
        <Plus size={14} />
        Add field
      </button>
      <div className={styles.formSettings}>
        <input
          className={styles.formSettingsInput}
          value={content.submitText || "Submit"}
          onChange={(e) => updateBlockContent(id, { submitText: e.target.value })}
          placeholder="Button text"
          onClick={(e) => e.stopPropagation()}
        />
        <input
          className={styles.formSettingsInput}
          value={content.successMessage || ""}
          onChange={(e) => updateBlockContent(id, { successMessage: e.target.value })}
          placeholder="Success message"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}
