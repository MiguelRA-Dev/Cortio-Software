import { useId } from 'react'

// Same isotype as public/logo.svg and public/favicon.svg, but inlined so the near-white
// quarter can track the theme (fill="currentColor" + text-ink) instead of staying a fixed
// color that disappears against a white background in light mode.
function Logo({ className = 'h-7 w-7' }) {
  const gradientId = useId()

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#b5abfc" />
          <stop offset="100%" stopColor="#5d5294" />
        </linearGradient>
      </defs>
      <path d="M56.16,16.17 A44,44 0 0 1 103.83,63.84 L77.93,61.57 A18,18 0 0 0 58.43,42.07 Z" fill={`url(#${gradientId})`} />
      <path
        d="M56.16,16.17 A44,44 0 0 1 103.83,63.84 L77.93,61.57 A18,18 0 0 0 58.43,42.07 Z"
        fill="currentColor"
        opacity="0.92"
        transform="rotate(180 60 60)"
        className="text-ink"
      />
    </svg>
  )
}

export default Logo
