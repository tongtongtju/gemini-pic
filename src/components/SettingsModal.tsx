import { useState, useEffect } from 'react'
import type { Settings, Provider } from '../types'
import { pickSaveDirectory, getDirectoryName, forgetDirectory, isDirectoryAccessSupported } from '../api/files'

const MODEL_STORAGE_KEY = 'gemini-studio-custom-models'

const PRESET_IMAGE_MODELS = [
  { id: 'google/gemini-2.5-flash-image', label: 'Gemini 2.5 Flash (Image)', tag: 'Flash' },
  { id: 'google/gemini-3-pro-image-preview', label: 'Gemini 3 Pro (Image)', tag: 'Pro' },
  { id: 'google/gemini-3.1-flash-image-preview', label: 'Gemini 3.1 Flash (Image)', tag: 'Latest' },
]

const PRESET_VISION_MODELS = [
  { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', tag: 'Flash' },
  { id: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', tag: 'Pro' },
]

function loadCustomModels(): string[] {
  try { return JSON.parse(localStorage.getItem(MODEL_STORAGE_KEY) || '[]') } catch { return [] }
}

function saveCustomModels(models: string[]) {
  localStorage.setItem(MODEL_STORAGE_KEY, JSON.stringify(models))
}

interface SettingsModalProps {
  settings: Settings
  onSave: (updates: Partial<Settings>) => void
  onClose: () => void
  show: boolean
}

export function SettingsModal({ settings, onSave, onClose, show }: SettingsModalProps) {
  const [form, setForm] = useState(settings)
  const [customModels, setCustomModels] = useState(loadCustomModels)
  const [newModelId, setNewModelId] = useState('')
  const [saveDirName, setSaveDirName] = useState<string | null>(null)

  useEffect(() => {
    if (show) getDirectoryName().then(setSaveDirName)
  }, [show])

  useEffect(() => {
    setForm(settings)
  }, [settings, show])

  if (!show) return null

  const handleSave = () => {
    onSave(form)
    onClose()
  }

  const setProvider = (p: Provider) => {
    setForm(f => ({ ...f, provider: p }))
  }

  const addCustomModel = () => {
    const id = newModelId.trim()
    if (!id || customModels.includes(id)) return
    const updated = [...customModels, id]
    setCustomModels(updated)
    saveCustomModels(updated)
    setNewModelId('')
  }

  const removeCustomModel = (id: string) => {
    const updated = customModels.filter(m => m !== id)
    setCustomModels(updated)
    saveCustomModels(updated)
  }

  const allImageModels = [
    ...PRESET_IMAGE_MODELS.map(m => ({ ...m, preset: true })),
    ...customModels.map(id => ({ id, label: id, tag: 'Custom', preset: false })),
  ]

  const allVisionModels = [
    ...PRESET_VISION_MODELS.map(m => ({ ...m, preset: true })),
    ...customModels.map(id => ({ id, label: id, tag: 'Custom', preset: false })),
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#1a1a2e]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-6">Settings</h2>

        {/* Provider Switcher */}
        <div className="mb-5">
          <label className="block text-sm text-white/60 mb-2">API Provider</label>
          <div className="flex gap-1 p-1 bg-white/5 rounded-lg border border-white/10">
            <button
              onClick={() => setProvider('openrouter')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                form.provider === 'openrouter'
                  ? 'bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] text-white'
                  : 'text-white/50 hover:text-white/70'
              }`}
            >
              OpenRouter
            </button>
            <button
              onClick={() => setProvider('joybuilder')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                form.provider === 'joybuilder'
                  ? 'bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] text-white'
                  : 'text-white/50 hover:text-white/70'
              }`}
            >
              Joybuilder
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {form.provider === 'openrouter' ? (
            <>
              {/* OpenRouter API Key */}
              <div>
                <label className="block text-sm text-white/60 mb-1.5">API Key</label>
                <input
                  type="password"
                  value={form.apiKey}
                  onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))}
                  placeholder="sk-or-v1-..."
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7c3aed] transition-colors"
                />
              </div>

              {/* Base URL */}
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Base URL</label>
                <input
                  type="text"
                  value={form.baseUrl}
                  onChange={e => setForm(f => ({ ...f, baseUrl: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7c3aed] transition-colors"
                />
              </div>

              {/* Image Generation Model */}
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Image Generation Model</label>
                <select
                  value={form.imageModel}
                  onChange={e => setForm(f => ({ ...f, imageModel: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#7c3aed] appearance-none cursor-pointer"
                >
                  {allImageModels.map(m => (
                    <option key={m.id} value={m.id} className="bg-[#1a1a2e]">
                      {m.label} [{m.tag}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Vision Model */}
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Vision Model (Explain)</label>
                <select
                  value={form.visionModel}
                  onChange={e => setForm(f => ({ ...f, visionModel: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#7c3aed] appearance-none cursor-pointer"
                >
                  {allVisionModels.map(m => (
                    <option key={m.id} value={m.id} className="bg-[#1a1a2e]">
                      {m.label} [{m.tag}]
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              {/* Joybuilder API Key */}
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Joybuilder API Key</label>
                <input
                  type="password"
                  value={form.joybuilderApiKey}
                  onChange={e => setForm(f => ({ ...f, joybuilderApiKey: e.target.value }))}
                  placeholder="pk-********-..."
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7c3aed] transition-colors"
                />
              </div>

              {/* Joybuilder Base URL */}
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Base URL</label>
                <input
                  type="text"
                  value={form.joybuilderBaseUrl}
                  onChange={e => setForm(f => ({ ...f, joybuilderBaseUrl: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7c3aed] transition-colors"
                />
              </div>
            </>
          )}

          {/* Save Folder */}
          <div>
            <label className="block text-sm text-white/60 mb-1.5">Auto-Save Folder</label>
            {isDirectoryAccessSupported() ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white/60 truncate">
                  {saveDirName ?? 'Not set — images will be downloaded individually'}
                </div>
                <button
                  onClick={async () => {
                    const name = await pickSaveDirectory()
                    if (name) setSaveDirName(name)
                  }}
                  className="px-3 py-2.5 bg-white/10 border border-white/10 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/15 transition-colors whitespace-nowrap"
                >
                  Choose
                </button>
                {saveDirName && (
                  <button
                    onClick={() => { forgetDirectory(); setSaveDirName(null) }}
                    className="px-3 py-2.5 bg-white/10 border border-white/10 rounded-lg text-xs text-white/30 hover:text-red-400 hover:bg-white/15 transition-colors whitespace-nowrap"
                  >
                    Clear
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-white/30 px-1">
                Folder selection is not supported in this browser. Use Chrome or Edge for this feature.
              </p>
            )}
          </div>

          {/* Add Custom Model (only for OpenRouter) */}
          {form.provider === 'openrouter' && (
            <div className="pt-2 border-t border-white/10">
              <label className="block text-xs text-white/40 mb-2 uppercase tracking-wider">Custom Models</label>

              {customModels.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {customModels.map(id => (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 rounded-md text-xs text-white/60 group"
                    >
                      <span className="max-w-[160px] truncate">{id}</span>
                      <button
                        onClick={() => removeCustomModel(id)}
                        className="text-white/30 hover:text-red-400 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newModelId}
                  onChange={e => setNewModelId(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustomModel()}
                  placeholder="e.g. google/gemini-2.5-flash-image"
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#7c3aed] transition-colors"
                />
                <button
                  onClick={addCustomModel}
                  disabled={!newModelId.trim()}
                  className="px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/15 transition-colors disabled:opacity-30"
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
