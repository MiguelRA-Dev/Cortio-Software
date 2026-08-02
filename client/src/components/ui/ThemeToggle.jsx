import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Cambiar tema"
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:text-ink hover:bg-surface-2 ${className}`}
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}

export default ThemeToggle
