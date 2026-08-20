import { useState, type ReactNode } from "react";

export function Field({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  full = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  placeholder?: string;
  type?: string;
  full?: boolean;
}) {
  return (
    <label className={`field${full ? " full" : ""}`}>
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  children,
  full = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`field${full ? " full" : ""}`}>
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
    </label>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="field full">
      <span>{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}

export function Modal({
  eyebrow,
  title,
  subtitle,
  error,
  saving,
  saveLabel,
  onSave,
  onClose,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  error?: string | null;
  saving?: boolean;
  saveLabel: string;
  onSave: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-head">
          <div>
            <span>{eyebrow}</span>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button onClick={onClose}>×</button>
        </div>
        <div className="form-grid">{children}</div>
        {error && <p className="login-error">{error}</p>}
        <div className="modal-actions">
          <button className="secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary" onClick={onSave} disabled={saving}>
            {saving ? "Salvando…" : saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ViewHeader({
  title,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="view-head">
      <h2>{title}</h2>
      <div className="view-head-actions">
        {children}
        {actionLabel && onAction && (
          <button className="primary" onClick={onAction}>
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/** Encapsula o vai-e-vem de salvar de um formulário: validação, erro e "Salvando…". */
export function useSaveHandler(validate: () => string | null, save: () => Promise<unknown>) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(null);
    save()
      .catch((err) => setError(err instanceof Error ? err.message : "Não foi possível salvar."))
      .finally(() => setSaving(false));
  };

  return { error, saving, submit };
}
