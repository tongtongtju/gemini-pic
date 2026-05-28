import { useState, useRef } from 'react'
import type { Settings } from '../types'
import { explainImage } from '../api/index'

interface ExplainPanelProps {
  settings: Settings
  onResult: (text: string, inputImage: string) => void
  onLoading: (loading: boolean) => void
  onError: (error: string | null) => void
}

export function ExplainPanel({ settings, onResult, onLoading, onError }: ExplainPanelProps) {
  const [image, setImage] = useState<string | null>(null)
  const [question, setQuestion] = useState('')

  const handleExplain = async () => {
    if (!image) return
    onLoading(true)
    onError(null)
    try {
      const text = await explainImage(settings, image, question || undefined)
      onResult(text, image)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      onLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-white/60 mb-1.5">Upload Image</label>
        <div className="mb-3">
          <ImageUploadExplain value={image} onChange={setImage} />
        </div>
      </div>

      <div>
        <label className="block text-sm text-white/60 mb-1.5">Question (optional)</label>
        <textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="What do you want to know about this image?"
          rows={3}
          className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7c3aed] transition-colors resize-none"
        />
      </div>

      <button
        onClick={handleExplain}
        disabled={!image}
        className="w-full py-2.5 bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] rounded-xl text-sm font-medium hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Analyze Image
      </button>
    </div>
  )
}

function ImageUploadExplain({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => onChange(reader.result as string)
    reader.readAsDataURL(file)
  }

  if (value) {
    return (
      <div className="relative group">
        <img src={value} alt="Upload" className="w-full max-h-48 rounded-xl border border-white/10 object-contain bg-black/20" />
        <button
          onClick={() => onChange(null)}
          className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-lg text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div
      onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]) }}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onClick={() => inputRef.current?.click()}
      className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-all py-6 ${
        dragging ? 'border-[#7c3aed] bg-[#7c3aed]/10' : 'border-white/15 hover:border-white/30 hover:bg-white/5'
      }`}
    >
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      <svg className="w-8 h-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
      </svg>
      <p className="text-sm text-white/40">Drop image or click to upload</p>
    </div>
  )
}
