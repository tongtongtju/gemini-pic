/**
 * Local file save using File System Access API (Chrome/Edge).
 * Lets user pick a folder once, then images auto-save as PNG files.
 * Fallback: triggers regular download to ~/Downloads.
 */

const DIR_HANDLE_KEY = 'gemini-studio-dir-handle'

let dirHandle: FileSystemDirectoryHandle | null = null

export async function pickSaveDirectory(): Promise<string | null> {
  try {
    dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' })
    // Store permission
    const perms = await dirHandle.queryPermission({ mode: 'readwrite' })
    if (perms !== 'granted') {
      await dirHandle.requestPermission({ mode: 'readwrite' })
    }
    localStorage.setItem(DIR_HANDLE_KEY, 'selected')
    return dirHandle.name
  } catch {
    // User cancelled or browser not supported
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

/**
 * Save a base64 image to the local folder.
 * Returns the filename if saved, null if fallback download triggered.
 */
export async function saveImageToLocal(
  base64DataUrl: string,
  filename?: string
): Promise<string | null> {
  const name = filename || `gemini-${Date.now()}.png`

  // Try File System Access API
  if (dirHandle) {
    try {
      const fileHandle = await dirHandle.getFileHandle(name, { create: true })
      const writable = await fileHandle.createWritable()
      const blob = dataUrlToBlob(base64DataUrl)
      await writable.write(blob)
      await writable.close()
      return name
    } catch {
      // Permission lost or dir removed, fallback
      dirHandle = null
    }
  }

  // Fallback: trigger browser download
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
