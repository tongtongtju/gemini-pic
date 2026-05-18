import { useState, useEffect, useCallback } from 'react'
import type { AppMode, HistoryItem } from './types'
import { useSettings } from './hooks/useSettings'
import { loadAllHistory, saveHistoryItem, deleteHistoryItem, clearAllHistory } from './api/db'
import { saveImageToLocal, saveLog } from './api/files'
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

  useEffect(() => {
    loadAllHistory().then(setHistory).catch(console.error)
  }, [])

  useEffect(() => {
    if (!isConfigured) setShowSettings(true)
  }, [isConfigured])

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

  const handleCreateResult = useCallback(async (
    images: string[], text: string, prompt: string,
    inputImages: string[], options?: { aspectRatio?: string; imageSize?: string }
  ) => {
    handleImageResult(images, text)

    // Save images to folder
    const savedFiles: string[] = []
    for (let i = 0; i < images.length; i++) {
      const saved = await saveImageToLocal(images[i])
      if (saved) savedFiles.push(saved)
    }

    // Save request/response log
    await saveLog({
      timestamp: new Date().toISOString(),
      mode: 'create',
      prompt,
      model: settings.imageModel,
      request: {
        prompt,
        hasInputImages: inputImages.length > 0,
        inputImageCount: inputImages.length,
        aspectRatio: options?.aspectRatio,
        imageSize: options?.imageSize,
      },
      response: {
        text,
        imageCount: images.length,
        imageFiles: savedFiles,
      },
    })

    // Save to IndexedDB (only small thumbnails, not full base64)
    addToHistory({
      mode: 'create',
      prompt,
      inputImageCount: inputImages.length,
      resultImageFiles: savedFiles,
      resultImages: images,
      resultText: text,
    })
  }, [handleImageResult, addToHistory, settings.imageModel])

  const handleExplainResult = useCallback(async (text: string, _inputImage: string) => {
    handleTextResult(text)

    // Save log
    await saveLog({
      timestamp: new Date().toISOString(),
      mode: 'explain',
      prompt: 'Explain image',
      model: settings.visionModel,
      request: {
        prompt: 'Explain image',
        hasInputImages: true,
        inputImageCount: 1,
      },
      response: {
        text,
        imageCount: 0,
        imageFiles: [],
      },
    })

    addToHistory({
      mode: 'explain',
      prompt: 'Explain image',
      inputImageCount: 1,
      resultImageFiles: [],
      resultImages: [],
      resultText: text,
    })
  }, [handleTextResult, addToHistory, settings.visionModel])

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
