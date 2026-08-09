function AgendaLegend({ className = '' }) {
  return (
    <div className={`flex items-center gap-4 text-xs text-muted ${className}`}>
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-ink" />
        Con cita
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-muted" />
        Bloqueado
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full border border-border" />
        Libre
      </span>
    </div>
  )
}

export default AgendaLegend
