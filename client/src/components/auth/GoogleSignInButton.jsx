import { useEffect, useRef } from 'react'
import { useTheme } from '../../context/ThemeContext'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

let scriptPromise = null
function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = resolve
      script.onerror = reject
      document.head.appendChild(script)
    })
  }
  return scriptPromise
}

// GIS logs a noisy warning if initialize() runs more than once, so it's called exactly
// once for the page's lifetime (module scope, shared across every mount on every page —
// not per-component-instance, or a stale instance's ref would keep "winning"). The
// callback it's given forwards to whichever GoogleSignInButton is mounted *right now*.
let googleInitialized = false
const activeHandler = { current: null }

// Renders Google's own "Sign in with Google" button into a container div — GIS owns
// that DOM subtree entirely, so this stays an imperative useEffect rather than JSX.
function GoogleSignInButton({ onCredential }) {
  const { theme } = useTheme()
  const containerRef = useRef(null)

  useEffect(() => {
    activeHandler.current = onCredential
    return () => {
      if (activeHandler.current === onCredential) activeHandler.current = null
    }
  })

  useEffect(() => {
    if (!CLIENT_ID || !containerRef.current) return
    let cancelled = false

    loadGoogleScript().then(() => {
      if (cancelled || !containerRef.current) return
      if (!googleInitialized) {
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => activeHandler.current?.(response.credential),
        })
        googleInitialized = true
      }
      containerRef.current.innerHTML = ''
      window.google.accounts.id.renderButton(containerRef.current, {
        theme: theme === 'dark' ? 'filled_black' : 'outline',
        size: 'large',
        width: 300,
        text: 'continue_with',
        locale: 'es',
      })
    })

    return () => {
      cancelled = true
    }
  }, [theme])

  if (!CLIENT_ID) return null

  return <div ref={containerRef} className="flex justify-center" />
}

export default GoogleSignInButton
