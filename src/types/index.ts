export type AppMode = 'create' | 'explain'

export type AspectRatio = 'auto' | '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9'

export type ImageSize = '1K' | '2K' | '4K'

export type Provider = 'openrouter' | 'joybuilder'

export interface Settings {
  provider: Provider
  // OpenRouter 配置
  apiKey: string
  baseUrl: string
  imageModel: string
  visionModel: string
  // Joybuilder 配置
  joybuilderApiKey: string
  joybuilderBaseUrl: string
  joybuilderModel: string
}

export interface JoybuilderModelOption {
  id: string
  label: string
  tag: string
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
  provider: 'openrouter',
  apiKey: '',
  baseUrl: 'https://openrouter.ai/api/v1',
  imageModel: 'google/gemini-2.5-flash-image',
  visionModel: 'google/gemini-2.5-flash',
  joybuilderApiKey: '',
  joybuilderBaseUrl: 'http://ai-api.jdcloud.com/v1',
  joybuilderModel: 'Gemini 3-Pro-Image-Preview',
}

export const ASPECT_RATIOS: AspectRatio[] = ['auto', '1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9']

export const IMAGE_SIZES: ImageSize[] = ['1K', '2K', '4K']

export const JOYBUILDER_MODELS: JoybuilderModelOption[] = [
  // Gemini 系列
  { id: 'Gemini 3-Pro-Image-Preview', label: 'Gemini 3 Pro', tag: 'Gemini' },
  { id: 'Gemini-2.5-flash-image-preview', label: 'Gemini 2.5 Flash', tag: 'Gemini' },
  { id: 'Gemini-2.5-flash-image', label: 'Gemini 2.5 Flash (Stable)', tag: 'Gemini' },
  // 豆包 Seedream 系列
  { id: 'doubao-seedream-4-0-250828', label: 'Doubao Seedream 4.0', tag: 'Seedream' },
  // GPT Image 系列
  { id: 'gpt-image-1', label: 'GPT Image 1', tag: 'GPT Image' },
  { id: 'gpt-image-2', label: 'GPT Image 2', tag: 'GPT Image' },
  // MiniMax 系列
  { id: 'image-01', label: 'MiniMax Image-01', tag: 'MiniMax' },
  // JoyAI 系列
  { id: 'JoyAI-Image', label: 'JoyAI Image', tag: 'JoyAI' },
]
