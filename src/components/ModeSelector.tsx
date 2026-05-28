import type { AppMode, Provider } from '../types'

interface ModeSelectorProps {
  mode: AppMode
  onChange: (mode: AppMode) => void
  provider: Provider
}

const modes: { key: AppMode; label: string; icon: string }[] = [
  { key: 'create', label: 'Create', icon: '✦' },
  { key: 'explain', label: 'Explain', icon: '◉' },
]

export function ModeSelector({ mode, onChange, provider }: ModeSelectorProps) {
  const availableModes = provider === 'joybuilder'
    ? modes.filter(m => m.key !== 'explain')
    : modes

  return (
    <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/10">
      {availableModes.map(m => (
        <button
          key={m.key}
          onClick={() => onChange(m.key)}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === m.key
              ? 'bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] text-white shadow-lg'
              : 'text-white/50 hover:text-white/80 hover:bg-white/5'
          }`}
        >
          <span className="text-base">{m.icon}</span>
          <span>{m.label}</span>
        </button>
      ))}
    </div>
  )
}
