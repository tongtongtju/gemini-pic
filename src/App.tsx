import { useState, useEffect, useCallback } from 'react'
import type { AppMode, HistoryItem } from './types'
import { useSettings } from './hooks/useSettings'
import { loadAllHistory, saveHistoryItem, deleteHistoryItem, clearAllHistory } from './api/db'
import { pickSaveDirectory, saveImageToLocal, getDirectoryName, isDirectoryAccessSupported } from './api/files'
import { Header } from './components/Header'
import { SettingsModal } from './components/SettingsModal'
import { ModeSelector } from './components/ModeSelector'
import { CreatePanel } from './components/CreatePanel'
import { ExplainPanel } from './components/ExplainPanel'
import { ResultDisplay } from './components/ResultDisplay'
import { ImageHistory } from './components/ImageHistory'

export default function App() {
  const { settings, setSettings, isConfigured } = useSettings()
  const [showSettings, setShowSettings] = useState(false)
  const [mode, setMode] = useState<AppMode>('create')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultImages, setResultImages] = useState<string[]>([])
  const [resultText, setResultText] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [saveDir, setSaveDir] = useState<string | null>(null)

  useEffect(() => {
    loadAllHistory().then(setHistory).catch(console.error)
    getDirectoryName().then(setSaveDir)
  }, [])

  useEffect(() => {
    if (!isConfigured) setShowSettings(true)
  }, [isConfigured])

  const handlePickDir = useCallback(async () => {
    const name = await pickSaveDirectory()
    if (name) {
      setSaveDir(name)
      console.log('[Save] Directory selected:', name)
    }
  }, [])

  const addToHistory = useCallback(async (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    const entry: HistoryItem = { ...item, id: crypto.randomUUID(), timestamp: Date.now() }
    setHistory(prev => [entry, ...prev])
    try { await saveHistoryItem(entry) } catch (err) { console.error('Save history failed:', err) }
  }, [])

  const handleDeleteHistory = useCallback(async (id: string) => {
    setHistory(prev => prev.filter(h => h.id !== id))
    try { await deleteHistoryItem(id) } catch (err) { console.error('Delete history failed:', err) }
  }, [])

  const handleClearHistory = useCallback(async () => {
    setHistory([])
    try { await clearAllHistory() } catch (err) { console.error('Clear history failed:', err) }
  }, [])

  const handleImageResult = useCallback((images: string[], text: string) => {
    setResultImages(images)
    setResultText(text)
    setError(null)
  }, [])

  const handleTextResult = useCallback((text: string) => {
    setResultImages([])
    setResultText(text)
    setError(null)
  }, [])

  const handleHistorySelect = useCallback((item: HistoryItem) => {
    setResultImages(item.resultImages)
    setResultText(item.resultText ?? null)
    setError(null)
  }, [])

  const handleCreateResult = useCallback(async (images: string[], text: string, prompt: string, inputImages: string[]) => {
    handleImageResult(images, text)
    addToHistory({ mode: 'create', prompt, inputImages, resultImages: images, resultText: text })
    // Auto-save images to local folder
    for (let i = 0; i < images.length; i++) {
      const saved = await saveImageToLocal(images[i], `gemini-${Date.now()}-${i}.png`)
      if (saved) console.log('[Save] Image saved:', saved)
    }
  }, [handleImageResult, addToHistory])

  const handleExplainResult = useCallback((text: string, inputImage: string) => {
    handleTextResult(text)
    addToHistory({ mode: 'explain', prompt: 'Explain image', inputImages: [inputImage], resultImages: [], resultText: text })
  }, [handleTextResult, addToHistory])

  const panelProps = { settings, onLoading: setLoading, onError: setError }

  return (
    <div className="min-h-screen flex flex-col">
      <Header onOpenSettings={() => setShowSettings(true)} />
      <SettingsModal
        show={showSettings}
        settings={settings}
        onSave={setSettings}
        onClose={() => setShowSettings(false)}
      />

      <main className="flex-1 flex flex-col lg:flex-row gap-4 p-4 lg:p-6 max-w-7xl mx-auto w-full">
        {/* Left Panel */}
        <div className="lg:w-[420px] flex-shrink-0 space-y-4">
          <ModeSelector mode={mode} onChange={setMode} />

          {/* Save directory bar */}
          {isDirectoryAccessSupported() && (
            <button
              onClick={handlePickDir}
              className="w-full flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm hover:bg-white/10 transition-colors"
            >
              <svg className="w-4 h-4 text-white/40 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
              </svg>
              <span className="text-white/50 truncate">
                {saveDir ? `Save to: ${saveDir}` : 'Click to set save folder'}
              </span>
            </button>
          )}

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
            {mode === 'create' && <CreatePanel {...panelProps} onResult={handleCreateResult} />}
            {mode === 'explain' && <ExplainPanel {...panelProps} onResult={handleExplainResult} />}
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 min-w-0">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 h-full">
            <ResultDisplay images={resultImages} text={resultText} loading={loading} error={error} />
            <ImageHistory history={history} onSelect={handleHistorySelect} onDelete={handleDeleteHistory} onClear={handleClearHistory} />
          </div>
        </div>
      </main>
    </div>
  )
}
