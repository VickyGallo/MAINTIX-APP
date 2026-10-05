import type { TextareaHTMLAttributes } from "react";

import { cn } from "./cn";
import { controlClass, Field, fieldAria } from "./field";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
};

export function Textarea({ id, label, hint, error, className, rows = 4, ...props }: TextareaProps) {
  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <textarea
        rows={rows}
        className={cn(controlClass, "py-2.5", className)}
        {...fieldAria(id, { hint, error })}
        {...props}
      />
    </Field>
  );
}
