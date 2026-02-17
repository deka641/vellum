"use client";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import { generateId } from "@/lib/utils";
import type { FormContent, FormField } from "@/types/blocks";
import styles from "./blocks.module.css";

interface FormBlockProps {
  id: string;
  content: FormContent;
}

const FIELD_TYPES: { value: FormField["type"]; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "textarea", label: "Textarea" },
  { value: "select", label: "Select" },
  { value: "radio", label: "Radio" },
  { value: "checkbox", label: "Checkbox" },
  { value: "tel", label: "Phone" },
  { value: "number", label: "Number" },
];

function SortableFormField({ field, children }: { field: FormField; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
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

  function updateFieldOption(fieldId: string, optionIndex: number, value: string) {
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;
    const options = [...(field.options || [])];
    options[optionIndex] = value;
    updateField(fieldId, { options });
  }

  function addFieldOption(fieldId: string) {
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;
    updateField(fieldId, { options: [...(field.options || []), "Option"] });
  }

  function removeFieldOption(fieldId: string, optionIndex: number) {
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;
    updateField(fieldId, { options: (field.options || []).filter((_, i) => i !== optionIndex) });
  }

  const hasOptions = (type: string) => type === "select" || type === "radio";

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = fields.findIndex((f) => f.id === active.id);
    const newIndex = fields.findIndex((f) => f.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = [...fields];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    updateBlockContent(id, { fields: reordered });
  }

  return (
    <div className={styles.formEditor}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={fields.map((f) => f.id)}
          strategy={verticalListSortingStrategy}
        >
          {fields.map((field) => (
            <SortableFormField key={field.id} field={field}>
              <div className={styles.formFieldEditor}>
                <button className={styles.formFieldDragHandle} aria-label="Drag to reorder">
                  <GripVertical size={12} />
                </button>
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
                  onChange={(e) => {
                    const newType = e.target.value as FormField["type"];
                    const updates: Partial<FormField> = { type: newType };
                    if (hasOptions(newType) && !field.options?.length) {
                      updates.options = ["Option 1", "Option 2"];
                    }
                    updateField(field.id, updates);
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {FIELD_TYPES.map((ft) => (
                    <option key={ft.value} value={ft.value}>{ft.label}</option>
                  ))}
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
              {hasOptions(field.type) && (
                <div className={styles.formOptionsEditor}>
                  {(field.options || []).map((opt, i) => (
                    <div key={i} className={styles.formOptionRow}>
                      <input
                        className={styles.formOptionInput}
                        value={opt}
                        onChange={(e) => updateFieldOption(field.id, i, e.target.value)}
                        placeholder={`Option ${i + 1}`}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        className={styles.formFieldDelete}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFieldOption(field.id, i);
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  <button
                    className={styles.formAddOption}
                    onClick={(e) => {
                      e.stopPropagation();
                      addFieldOption(field.id);
                    }}
                  >
                    <Plus size={12} />
                    Add option
                  </button>
                </div>
              )}
            </SortableFormField>
          ))}
        </SortableContext>
      </DndContext>
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
