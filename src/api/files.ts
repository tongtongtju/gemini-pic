/* eslint-disable @typescript-eslint/no-explicit-any */

const DIR_HANDLE_KEY = 'gemini-studio-save-dir'
const TAURI_DIR_KEY = 'gemini-studio-tauri-dir'

// ── Tauri detection ──
function isTauri(): boolean {
  return !!(window as any).__TAURI_INTERNALS__
}

// ── Timestamp for filenames ──
function ts(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`
}

// ── Helpers ──
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',', 2)
  const mime = header.match(/:(.*?);/)?.[1] || 'image/png'
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const [, data] = dataUrl.split(',', 2)
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function triggerDownload(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.click()
}

// ══════════════════════════════════════════
//  Tauri implementation
// ══════════════════════════════════════════

async function tauriPickDir(): Promise<string | null> {
  try {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const selected = await open({ directory: true, title: 'Select save folder' })
    if (selected && typeof selected === 'string') {
      localStorage.setItem(TAURI_DIR_KEY, selected)
      // Extract folder name for display
      const parts = selected.replace(/\\/g, '/').split('/')
      return parts[parts.length - 1] || selected
    }
    // open() can return string[] for multiple=false but directory=true
    if (Array.isArray(selected) && selected.length > 0) {
      const path = selected[0]
      localStorage.setItem(TAURI_DIR_KEY, path)
      const parts = path.replace(/\\/g, '/').split('/')
      return parts[parts.length - 1] || path
    }
    return null
  } catch {
    return null
  }
}

function getTauriDirPath(): string | null {
  return localStorage.getItem(TAURI_DIR_KEY)
}

async function tauriSaveFile(subfolder: string, filename: string, dataUrl: string): Promise<string | null> {
  const dirPath = getTauriDirPath()
  if (!dirPath) return null
  try {
    const { mkdir, exists, writeFile } = await import('@tauri-apps/plugin-fs')
    const fullPath = `${dirPath}/${subfolder}`
    if (!await exists(fullPath)) {
      await mkdir(fullPath, { recursive: true })
    }
    const bytes = dataUrlToUint8Array(dataUrl)
    await writeFile(`${fullPath}/${filename}`, bytes)
    return filename
  } catch (err) {
    console.error('[Tauri FS] Save failed:', err)
    return null
  }
}

async function tauriSaveImage(dataUrl: string, filename?: string): Promise<string | null> {
  const name = filename || `gemini-${ts()}.png`
  const saved = await tauriSaveFile('images', name, dataUrl)
  if (saved) return saved
  // Fallback: open native save dialog
  try {
    const { save } = await import('@tauri-apps/plugin-dialog')
    const path = await save({ defaultPath: name, filters: [{ name: 'Images', extensions: ['png'] }] })
    if (path) {
      const { writeFile } = await import('@tauri-apps/plugin-fs')
      await writeFile(path, dataUrlToUint8Array(dataUrl))
      return name
    }
  } catch { /* ignore */ }
  return null
}

async function tauriSaveLog(content: string, filename: string): Promise<string | null> {
  const encoder = new TextEncoder()
  const dirPath = getTauriDirPath()
  if (!dirPath) return null
  try {
    const { mkdir, exists, writeFile } = await import('@tauri-apps/plugin-fs')
    const fullPath = `${dirPath}/logs`
    if (!await exists(fullPath)) {
      await mkdir(fullPath, { recursive: true })
    }
    await writeFile(`${fullPath}/${filename}`, encoder.encode(content))
    return filename
  } catch {
    return null
  }
}

// ══════════════════════════════════════════
//  Browser implementation (File System Access API)
// ══════════════════════════════════════════

let dirHandle: any = null

async function browserPickDir(): Promise<string | null> {
  try {
    const w = window as any
    if (!w.showDirectoryPicker) return null
    dirHandle = await w.showDirectoryPicker({ mode: 'readwrite' })
    const perms = await (dirHandle as any).queryPermission?.({ mode: 'readwrite' })
    if (perms && perms !== 'granted') {
      await (dirHandle as any).requestPermission?.({ mode: 'readwrite' })
    }
    localStorage.setItem(DIR_HANDLE_KEY, 'selected')
    return dirHandle?.name ?? null
  } catch {
    return null
  }
}

function browserGetDirName(): string | null {
  if (dirHandle) return dirHandle.name
  if (localStorage.getItem(DIR_HANDLE_KEY)) return '(previously selected — click to re-select)'
  return null
}

function browserForgetDir() {
  dirHandle = null
  localStorage.removeItem(DIR_HANDLE_KEY)
}

async function browserSaveImage(dataUrl: string, filename?: string): Promise<string | null> {
  const name = filename || `gemini-${ts()}.png`
  if (dirHandle) {
    try {
      const imgDir = await dirHandle.getDirectoryHandle('images', { create: true })
      const fileHandle = await imgDir.getFileHandle(name, { create: true })
      const writable = await fileHandle.createWritable()
      const blob = dataUrlToBlob(dataUrl)
      await writable.write(blob)
      await writable.close()
      return name
    } catch {
      // Fall through to download
    }
  }
  triggerDownload(dataUrl, name)
  return name
}

async function browserSaveLog(content: string, filename: string): Promise<string | null> {
  if (!dirHandle) return null
  try {
    const logDir = await dirHandle.getDirectoryHandle('logs', { create: true })
    const fileHandle = await logDir.getFileHandle(filename, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(content)
    await writable.close()
    return filename
  } catch {
    return null
  }
}

// ══════════════════════════════════════════
//  Unified public API
// ══════════════════════════════════════════

export function isDirectoryAccessSupported(): boolean {
  return isTauri() || 'showDirectoryPicker' in window
}

export async function pickSaveDirectory(): Promise<string | null> {
  if (isTauri()) return tauriPickDir()
  return browserPickDir()
}

export async function getDirectoryName(): Promise<string | null> {
  if (isTauri()) {
    const path = getTauriDirPath()
    if (!path) return null
    const parts = path.replace(/\\/g, '/').split('/')
    return parts[parts.length - 1] || path
  }
  return browserGetDirName()
}

export function forgetDirectory() {
  if (isTauri()) {
    localStorage.removeItem(TAURI_DIR_KEY)
  } else {
    browserForgetDir()
  }
}

export async function saveImageToLocal(dataUrl: string, filename?: string): Promise<string | null> {
  if (isTauri()) return tauriSaveImage(dataUrl, filename)
  return browserSaveImage(dataUrl, filename)
}

export interface LogEntry {
  timestamp: string
  mode: string
  prompt: string
  model: string
  request: {
    prompt: string
    hasInputImages: boolean
    inputImageCount: number
    aspectRatio?: string
    imageSize?: string
  }
  response: {
    text: string
    imageCount: number
    imageFiles: string[]
    usage?: Record<string, unknown>
  }
}

export async function saveLog(entry: LogEntry): Promise<string | null> {
  const content = JSON.stringify(entry, null, 2)
  const filename = `${ts()}.json`
  if (isTauri()) return tauriSaveLog(content, filename)
  return browserSaveLog(content, filename)
}
