import type { ReactNode } from "react";

/** Etiqueta + ayuda + error, con los ids necesarios para lectores de pantalla. */
export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Atributos ARIA para el control dentro de un Field. */
export function fieldAria(id: string, { hint, error }: { hint?: string; error?: string }) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return { id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy };
}

export const controlClass =
  "min-h-11 w-full rounded-ui border border-border-strong bg-surface px-3 text-base text-foreground placeholder:text-muted aria-[invalid=true]:border-danger";
