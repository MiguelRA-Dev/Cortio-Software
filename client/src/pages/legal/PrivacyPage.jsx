import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import PRIVACY_POLICY_HTML from './privacyPolicyContent'

function PrivacyPage() {
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

        <div className="uc-privacy-policy mt-8 text-sm leading-relaxed text-ink" dangerouslySetInnerHTML={{ __html: PRIVACY_POLICY_HTML }} />
      </main>
    </div>
  )
}

export default PrivacyPage
