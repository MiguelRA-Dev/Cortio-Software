const VARIANTS = {
  primary:
    'bg-accent text-accent-ink hover:bg-accent-hover focus-visible:outline-ink',
  secondary:
    'bg-transparent text-ink border border-border hover:bg-surface-2 focus-visible:outline-ink',
  ghost:
    'bg-transparent text-muted hover:text-ink hover:bg-surface-2 focus-visible:outline-ink',
}

function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
