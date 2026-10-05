import type { SelectHTMLAttributes } from "react";

import { cn } from "./cn";
import { controlClass, Field, fieldAria } from "./field";

export type SelectOption = { value: string; label: string };

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  id: string;
  label: string;
  options: SelectOption[];
  placeholder?: string;
  hint?: string;
  error?: string;
};

export function Select({
  id,
  label,
  options,
  placeholder,
  hint,
  error,
  className,
  ...props
}: SelectProps) {
  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <select
        className={cn(controlClass, className)}
        {...fieldAria(id, { hint, error })}
        {...props}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
