function Switch({ checked, onChange, label }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full border-0 transition-colors ${
          checked ? 'bg-ink' : 'bg-surface-2'
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.4)] transition-transform ${
            checked ? 'bg-bg translate-x-4' : 'bg-muted translate-x-0'
          }`}
        />
      </button>
      {label && <span className="text-sm text-ink">{label}</span>}
    </label>
  )
}

export default Switch
