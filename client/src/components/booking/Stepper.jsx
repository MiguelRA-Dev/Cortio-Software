import { Check } from 'lucide-react'

function Stepper({ steps, current, onStepClick }) {
  return (
    <div className="flex items-center">
      {steps.map((label, i) => {
        const stepNumber = i + 1
        const isDone = stepNumber < current
        const isCurrent = stepNumber === current
        const isClickable = stepNumber <= current && stepNumber !== current

        return (
          <div key={label} className="flex flex-1 items-center last:flex-none">
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onStepClick?.(stepNumber)}
              className={`flex flex-col items-center gap-1.5 ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                  isDone || isCurrent ? 'bg-ink text-bg' : 'border border-border text-muted'
                } ${isClickable ? 'hover:opacity-75' : ''}`}
              >
                {isDone ? <Check size={13} /> : stepNumber}
              </div>
              <span className={`hidden text-xs sm:block ${isCurrent ? 'text-ink font-medium' : 'text-muted'}`}>
                {label}
              </span>
            </button>
            {stepNumber !== steps.length && (
              <div className={`mx-2 h-px flex-1 ${isDone ? 'bg-ink' : 'bg-border'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default Stepper
