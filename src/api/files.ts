/* eslint-disable @typescript-eslint/no-explicit-any */

const DIR_HANDLE_KEY = 'gemini-studio-dir-handle'

let dirHandle: any = null

export async function pickSaveDirectory(): Promise<string | null> {
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

export function isDirectoryAccessSupported(): boolean {
  return 'showDirectoryPicker' in window
}

export function forgetDirectory() {
  dirHandle = null
  localStorage.removeItem(DIR_HANDLE_KEY)
}

export async function getDirectoryName(): Promise<string | null> {
  if (!dirHandle) {
    if (localStorage.getItem(DIR_HANDLE_KEY)) {
      return '(previously selected — click to re-select)'
    }
    return null
  }
  return dirHandle.name
}

/** Format timestamp for filenames: 2026-05-18_14-30-22 */
function ts(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`
}

/** Ensure a subdirectory exists and return its handle */
async function ensureDir(name: string): Promise<any> {
  if (!dirHandle) return null
  return await dirHandle.getDirectoryHandle(name, { create: true })
}

/** Save a generated image to the images/ subfolder. Returns the filename or null. */
export async function saveImageToLocal(
  base64DataUrl: string,
  filename?: string
): Promise<string | null> {
  const name = filename || `gemini-${ts()}.png`

  if (dirHandle) {
    try {
      const imgDir = await ensureDir('images')
      const fileHandle = await imgDir.getFileHandle(name, { create: true })
      const writable = await fileHandle.createWritable()
      const blob = dataUrlToBlob(base64DataUrl)
      await writable.write(blob)
      await writable.close()
      return name
    } catch {
      // Fall through to download
    }
  }

  triggerDownload(base64DataUrl, name)
  return name
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

/** Save a request/response log to the logs/ subfolder */
export async function saveLog(entry: LogEntry): Promise<string | null> {
  if (!dirHandle) return null
  try {
    const logDir = await ensureDir('logs')
    const filename = `${ts()}.json`
    const fileHandle = await logDir.getFileHandle(filename, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(JSON.stringify(entry, null, 2))
    await writable.close()
    return filename
  } catch {
    return null
  }
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',', 2)
  const mime = header.match(/:(.*?);/)?.[1] || 'image/png'
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

function triggerDownload(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.click()
}
