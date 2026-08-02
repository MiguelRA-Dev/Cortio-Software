function Card({ className = '', children, ...props }) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface p-6 shadow-xl shadow-black/20 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export default Card
