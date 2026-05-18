export type AppMode = 'create' | 'explain'

export type AspectRatio = 'auto' | '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9'

export type ImageSize = '1K' | '2K' | '4K'

export interface Settings {
  apiKey: string
  baseUrl: string
  imageModel: string
  visionModel: string
}

export interface GenerateOptions {
  aspectRatio?: AspectRatio
  imageSize?: ImageSize
}

export interface GenerateResult {
  text: string
  images: string[]
}

/** Stored in IndexedDB — only lightweight data, no raw base64 */
export interface HistoryItem {
  id: string
  mode: AppMode
  prompt: string
  inputImageCount: number        // number of input images (not the data)
  resultImageFiles: string[]     // filenames saved in the folder
  resultImages: string[]         // base64 thumbnails (small, for display only)
  resultText: string
  timestamp: number
}

export const DEFAULT_SETTINGS: Settings = {
  apiKey: '',
  baseUrl: 'https://openrouter.ai/api/v1',
  imageModel: 'google/gemini-2.5-flash-image',
  visionModel: 'google/gemini-2.5-flash',
}

export const ASPECT_RATIOS: AspectRatio[] = ['auto', '1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9']

export const IMAGE_SIZES: ImageSize[] = ['1K', '2K', '4K']
