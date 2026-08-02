function Textarea({ label, id, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-muted">
          {label}
        </label>
      )}
      <textarea
        id={id}
        rows={3}
        className={`resize-none rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-ink placeholder:text-muted/60 outline-none transition-colors focus:border-accent ${className}`}
        {...props}
      />
    </div>
  )
}

export default Textarea
