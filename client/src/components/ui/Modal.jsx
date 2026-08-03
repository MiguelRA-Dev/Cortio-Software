import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

const TRANSITION_MS = 200

function Modal({ open, onClose, title, children }) {
  const [shouldRender, setShouldRender] = useState(open)
  const [visible, setVisible] = useState(false)

  // Freeze the last real content while closing — callers typically null out the state
  // driving `children` the instant onClose fires, which would otherwise make the modal
  // body collapse to empty mid-fade instead of animating out with its last contents.
  const contentRef = useRef({ title, children })
  if (open) {
    contentRef.current = { title, children }
  }

  // Keep the modal mounted a beat after `open` goes false so the exit transition can
  // play — `if (!open) return null` alone would unmount it instantly with no animation.
  useEffect(() => {
    if (open) {
      setShouldRender(true)
      // A single rAF can still land in the same paint as the "hidden" state React just
      // committed, so the browser never actually paints it before jumping to visible —
      // nesting a second rAF forces it onto the following frame, after that paint.
      let raf2
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setVisible(true))
      })
      return () => {
        cancelAnimationFrame(raf1)
        if (raf2) cancelAnimationFrame(raf2)
      }
    }
    setVisible(false)
    const timeout = setTimeout(() => setShouldRender(false), TRANSITION_MS)
    return () => clearTimeout(timeout)
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!shouldRender) return null

  const content = contentRef.current

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ease-out ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      <div
        className={`relative w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl transition-all duration-200 ease-out ${
          visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-95 opacity-0'
        }`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">{content.title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-muted hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-4">{content.children}</div>
      </div>
    </div>
  )
}

export default Modal
