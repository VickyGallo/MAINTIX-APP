import type { InputHTMLAttributes } from "react";

import { cn } from "./cn";
import { controlClass, Field, fieldAria } from "./field";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
};

export function Input({ id, label, hint, error, className, ...props }: InputProps) {
  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <input
        className={cn(controlClass, className)}
        {...fieldAria(id, { hint, error })}
        {...props}
      />
    </Field>
  );
}
