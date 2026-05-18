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

export async function saveImageToLocal(
  base64DataUrl: string,
  filename?: string
): Promise<string | null> {
  const name = filename || `gemini-${Date.now()}.png`

  if (dirHandle) {
    try {
      const fileHandle = await dirHandle.getFileHandle(name, { create: true })
      const writable = await fileHandle.createWritable()
      const blob = dataUrlToBlob(base64DataUrl)
      await writable.write(blob)
      await writable.close()
      return name
    } catch {
      dirHandle = null
    }
  }

  triggerDownload(base64DataUrl, name)
  return null
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
