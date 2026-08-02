function Select({ label, id, className = '', children, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-muted">
          {label}
        </label>
      )}
      <select
        id={id}
        className={`rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-ink outline-none transition-colors focus:border-accent ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  )
}

export default Select
