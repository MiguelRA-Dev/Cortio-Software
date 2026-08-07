import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const SCRIPT_ID = 'usercentrics-ppg'
const SCRIPT_SRC = 'https://policygenerator.usercentrics.eu/api/privacy-policy'
const PRIVACY_POLICY_ID = 'eb3ceb6f-0887-4ab0-99a8-fdc475be0692'

function PrivacyPage() {
  const containerRef = useRef(null)

  useEffect(() => {
    if (document.getElementById(SCRIPT_ID)) return
    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = SCRIPT_SRC
    script.setAttribute('privacy-policy-id', PRIVACY_POLICY_ID)
    script.setAttribute('data-language', 'en')
    document.body.appendChild(script)
  }, [])

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-6">
          <span className="text-xl font-semibold tracking-tight text-ink">Cortio Software</span>
          <Link to="/register" className="flex items-center gap-1.5 text-sm text-muted hover:text-ink">
            <ArrowLeft size={14} /> Volver
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Política de privacidad</h1>

        <div ref={containerRef} className="uc-privacy-policy mt-8 text-sm leading-relaxed text-ink" />
      </main>
    </div>
  )
}

export default PrivacyPage
