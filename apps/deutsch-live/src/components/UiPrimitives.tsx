import type {
  ButtonHTMLAttributes,
  FormEvent,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes
} from "react";

type PrimitiveProps = {
  children: ReactNode;
  className?: string;
};

type EmptyStateProps = PrimitiveProps & {
  action?: ReactNode;
  icon?: ReactNode;
  title?: string;
};

type AppButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: "sm" | "md";
  variant?: "primary" | "secondary" | "danger" | "ghost";
};

type FieldProps = {
  fieldClassName?: string;
  label?: string;
};

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & FieldProps;
type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps;
type SelectInputProps = SelectHTMLAttributes<HTMLSelectElement> & FieldProps;

type PanelFormProps = PrimitiveProps & {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Panel({ children, className }: PrimitiveProps) {
  return (
    <div className={joinClasses("app-panel", className)}>
      {children}
    </div>
  );
}

export function PanelForm({ children, className, onSubmit }: PanelFormProps) {
  return (
    <form className={joinClasses("app-panel", className)} onSubmit={onSubmit}>
      {children}
    </form>
  );
}

export function SurfaceItem({ children, className }: PrimitiveProps) {
  return (
    <div className={joinClasses("surface-item", className)}>
      {children}
    </div>
  );
}

export function AppButton({ children, className, size = "md", type = "button", variant = "primary", ...props }: AppButtonProps) {
  return (
    <button className={joinClasses("app-button", `app-button--${variant}`, `app-button--${size}`, className)} type={type} {...props}>
      {children}
    </button>
  );
}

function FieldShell({ children, className, id, label }: PrimitiveProps & { id?: string; label?: string }) {
  return (
    <label className={joinClasses("form-field", className)} htmlFor={id}>
      {label && <span className="form-label">{label}</span>}
      {children}
    </label>
  );
}

export function TextInput({ className, fieldClassName, id, label, ...props }: TextInputProps) {
  return (
    <FieldShell className={fieldClassName} id={id} label={label}>
      <input className={joinClasses("form-control", className)} id={id} {...props} />
    </FieldShell>
  );
}

export function TextArea({ className, fieldClassName, id, label, ...props }: TextAreaProps) {
  return (
    <FieldShell className={fieldClassName} id={id} label={label}>
      <textarea className={joinClasses("form-control form-control--textarea", className)} id={id} {...props} />
    </FieldShell>
  );
}

export function SelectInput({ children, className, fieldClassName, id, label, ...props }: SelectInputProps) {
  return (
    <FieldShell className={fieldClassName} id={id} label={label}>
      <select className={joinClasses("form-control", className)} id={id} {...props}>
        {children}
      </select>
    </FieldShell>
  );
}


export function EmptyState({ action, children, className, icon, title }: EmptyStateProps) {
  return (
    <div className={joinClasses("empty-state", className)}>
      {icon && <span className="empty-state__icon">{icon}</span>}
      {title && <p className="empty-state__title">{title}</p>}
      <p className="empty-state__body">{children}</p>
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={joinClasses("skeleton-block", className)} />;
}

export function SkeletonPanel({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <Panel className={joinClasses("space-y-3", className)}>
      <SkeletonBlock className="h-5 w-2/5" />
      {Array.from({ length: rows }).map((_, index) => (
        <SkeletonBlock className={index === rows - 1 ? "h-4 w-2/3" : "h-4 w-full"} key={index} />
      ))}
    </Panel>
  );
}

export function SkeletonStatGrid({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={joinClasses("section-grid--stats", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <Panel className="space-y-3" key={index}>
          <SkeletonBlock className="h-10 w-10 rounded-xl" />
          <SkeletonBlock className="h-4 w-2/3" />
          <SkeletonBlock className="h-8 w-1/2" />
        </Panel>
      ))}
    </div>
  );
}

export function PageSkeleton({ rows = 6, title = true }: { rows?: number; title?: boolean }) {
  return (
    <section className="section-shell">
      {title && (
        <div className="mb-6 space-y-3">
          <SkeletonBlock className="h-4 w-32 rounded-full" />
          <SkeletonBlock className="h-10 max-w-xl" />
          <SkeletonBlock className="h-5 max-w-2xl" />
        </div>
      )}
      <div className="section-grid section-grid--split">
        <SkeletonPanel rows={rows} />
        <SkeletonPanel rows={Math.max(3, Math.floor(rows / 2))} />
      </div>
    </section>
  );
}
