import { useState, useRef } from 'react'
import type { AspectRatio, ImageSize, Settings } from '../types'
import { ASPECT_RATIOS, IMAGE_SIZES } from '../types'
import { createImage } from '../api/openrouter'

interface CreatePanelProps {
  settings: Settings
  onResult: (images: string[], text: string, prompt: string, inputImages: string[], options?: { aspectRatio?: string; imageSize?: string }) => void
  onLoading: (loading: boolean) => void
  onError: (error: string | null) => void
}

export function CreatePanel({ settings, onResult, onLoading, onError }: CreatePanelProps) {
  const [prompt, setPrompt] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('auto')
  const [imageSize, setImageSize] = useState<ImageSize>('1K')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (files: FileList | File[]) => {
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = () => {
        setImages(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    const files: File[] = []
    for (const item of items) {
      if (item.type.startsWith('image/')) files.push(item.getAsFile()!)
    }
    if (files.length) handleFiles(files)
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleCreate = async () => {
    if (!prompt.trim() && images.length === 0) return
    onLoading(true)
    onError(null)
    try {
      const options = aspectRatio !== 'auto' ? { aspectRatio, imageSize } : { imageSize }
      const result = await createImage(settings, prompt, images, options)
      onResult(result.images, result.text, prompt, images, { aspectRatio, imageSize })
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      onLoading(false)
    }
  }

  const canSubmit = prompt.trim().length > 0 || images.length > 0

  return (
    <div className="space-y-4" onPaste={handlePaste}>
      {/* Multi-image upload area */}
      <div>
        <label className="block text-sm text-white/60 mb-1.5">
          Reference Images <span className="text-white/30">(optional, click or drag)</span>
        </label>

        {images.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-2">
            {images.map((img, i) => (
              <div key={i} className="relative group w-16 h-16 rounded-lg border border-white/10 overflow-hidden flex-shrink-0">
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 hover:border-white/30 hover:bg-white/5 cursor-pointer transition-all py-3 px-4"
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => { if (e.target.files?.length) handleFiles(e.target.files) }}
          />
          <svg className="w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span className="text-sm text-white/40">Add images (or paste)</span>
        </div>
      </div>

      {/* Prompt input */}
      <div>
        <label className="block text-sm text-white/60 mb-1.5">Prompt</label>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder={images.length > 0 ? 'Describe how to edit / transform these images...' : 'Describe the image you want to generate...'}
          rows={4}
          className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7c3aed] transition-colors resize-none"
        />
      </div>

      {/* Options row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-white/40 mb-1">Aspect Ratio</label>
          <select
            value={aspectRatio}
            onChange={e => setAspectRatio(e.target.value as AspectRatio)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#7c3aed] appearance-none cursor-pointer"
          >
            {ASPECT_RATIOS.map(r => (
              <option key={r} value={r} className="bg-[#1a1a2e]">
                {r === 'auto' ? 'Auto (model decides)' : r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-white/40 mb-1">Resolution</label>
          <select
            value={imageSize}
            onChange={e => setImageSize(e.target.value as ImageSize)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#7c3aed] appearance-none cursor-pointer"
          >
            {IMAGE_SIZES.map(s => <option key={s} value={s} className="bg-[#1a1a2e]">{s}</option>)}
          </select>
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={handleCreate}
        disabled={!canSubmit}
        className="w-full py-2.5 bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] rounded-xl text-sm font-medium hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {images.length > 0 ? 'Edit Image' : 'Generate Image'}
      </button>
    </div>
  )
}
