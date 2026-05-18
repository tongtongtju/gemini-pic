interface ResultDisplayProps {
  images: string[]
  text: string | null
  loading: boolean
  error: string | null
}

export function ResultDisplay({ images, text, loading, error }: ResultDisplayProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-[#7c3aed] border-t-transparent animate-spin" />
        <p className="text-sm text-white/40">Processing...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
          <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        <p className="text-sm text-red-400 text-center max-w-xs">{error}</p>
      </div>
    )
  }

  if (!images.length && !text) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
          </svg>
        </div>
        <p className="text-white/30 text-sm">Results will appear here</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {text && (
        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
          <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">{text}</p>
        </div>
      )}

      {images.map((img, i) => (
        <div key={i} className="relative group">
          <img
            src={img}
            alt={`Generated ${i + 1}`}
            className="w-full rounded-xl border border-white/10"
          />
          <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <a
              href={img}
              download={`gemini-studio-${Date.now()}.png`}
              className="p-2 bg-black/70 backdrop-blur-sm rounded-lg text-white/80 hover:text-white transition-colors"
              onClick={e => e.stopPropagation()}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}
