import type { Settings, GenerateOptions, GenerateResult } from '../types'

// ── API type detection ──

type ApiType = 'seedream' | 'gemini' | 'minimax' | 'gpt-image' | 'joyai'

function getApiType(model: string): ApiType {
  if (model.startsWith('doubao-seedream')) return 'seedream'
  if (model.startsWith('Gemini') || model.startsWith('gemini')) return 'gemini'
  if (model === 'image-01') return 'minimax'
  if (model.startsWith('gpt-image')) return 'gpt-image'
  if (model.startsWith('JoyAI')) return 'joyai'
  return 'seedream'
}

function getEndpoint(apiType: ApiType, hasImages: boolean, baseUrl: string): string {
  const base = baseUrl.replace(/\/$/, '')
  switch (apiType) {
    case 'seedream': return `${base}/imageEdit/generations`
    case 'gemini': return `${base}/images/gemini_flash/generations`
    case 'minimax': return `${base}/images/minimax_image01/generations`
    case 'gpt-image': return hasImages ? `${base}/images/edits` : `${base}/images/generations`
    case 'joyai': return hasImages ? `${base}/images/edits` : `${base}/images/generations`
  }
}

// ── Helpers ──

function extractMimeType(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;]+);/)
  return match ? match[1] : 'image/png'
}

function isDataUrl(str: string): boolean {
  return str.startsWith('data:')
}

// Extract base64 data from data URL
function extractBase64(dataUrl: string): string {
  const idx = dataUrl.indexOf(',')
  return idx >= 0 ? dataUrl.substring(idx + 1) : dataUrl
}

// Size mapping tables
const GPT_IMAGE_SIZES: Record<string, string> = {
  '1:1': '1024x1024',
  '2:3': '1024x1536',
  '3:2': '1536x1024',
}

const JOYAI_SIZES: Record<string, string> = {
  '1:1': '1024x1024',
  '16:9': '1360x768',
  '9:16': '768x1360',
  '3:2': '1248x832',
  '2:3': '832x1248',
  '4:3': '1168x880',
  '3:4': '880x1168',
}

// ── Request builders ──

function buildSeedreamRequest(model: string, prompt: string, images: string[], options?: GenerateOptions): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model,
    prompt,
    sequential_image_generation: 'disabled',
    response_format: 'b64_json',
    watermark: true,
  }
  if (images.length > 0) {
    body.image = images.length === 1 ? images[0] : images
  }
  if (options?.imageSize) body.size = options.imageSize
  return body
}

function buildGeminiRequest(model: string, prompt: string, images: string[]): Record<string, unknown> {
  let parts: Array<Record<string, unknown>>

  if (images.length > 0) {
    const imageParts = images.map(img => ({
      file_data: {
        mime_type: isDataUrl(img) ? extractMimeType(img) : 'image/png',
        file_uri: img,
      },
    }))
    parts = [...imageParts, { text: prompt }]
  } else {
    parts = [{ text: prompt }]
  }

  const body: Record<string, unknown> = {
    model,
    contents: { role: 'user', parts },
    generation_config: { response_modalities: ['TEXT', 'IMAGE'] },
    safety_settings: {
      method: 'PROBABILITY',
      category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE',
    },
    stream: false,
  }
  return body
}

function buildMinimaxRequest(model: string, prompt: string, images: string[], options?: GenerateOptions): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model,
    prompt,
    response_format: 'base64',
    n: 1,
  }
  if (images.length > 0) {
    body.subject_reference = images.map(img => ({
      type: 'character',
      image_file: img,
    }))
  }
  if (options?.aspectRatio && options.aspectRatio !== 'auto') {
    body.aspect_ratio = options.aspectRatio
  }
  return body
}

function buildGptImageRequest(model: string, prompt: string, images: string[], options?: GenerateOptions): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model,
    prompt,
    n: 1,
    quality: 'medium',
    output_format: 'PNG',
    response_format: 'b64_json',
  }

  if (images.length > 0) {
    body.image = images
    if (options?.aspectRatio && options.aspectRatio !== 'auto') {
      body.size = GPT_IMAGE_SIZES[options.aspectRatio] || '1024x1024'
    }
  } else {
    body.size = (options?.aspectRatio && options.aspectRatio !== 'auto')
      ? (GPT_IMAGE_SIZES[options.aspectRatio] || '1024x1024')
      : '1024x1024'
  }
  return body
}

function buildJoyAIRequest(model: string, prompt: string, images: string[], options?: GenerateOptions): Record<string, unknown> {
  const hasImages = images.length > 0
  const actualModel = hasImages ? 'JoyAI-Image-Edit' : model

  const body: Record<string, unknown> = {
    model: actualModel,
    prompt,
    n: 1,
  }

  if (hasImages) {
    body.image = images
    body.response_format = 'b64_json'
  } else {
    body.response_type = 'b64_json'
  }

  if (options?.aspectRatio && options.aspectRatio !== 'auto') {
    body.size = JOYAI_SIZES[options.aspectRatio] || '1024x1024'
  }
  return body
}

// ── Response parsers ──

function parseSeedreamResponse(data: Record<string, unknown>): GenerateResult {
  const textParts: string[] = []
  const images: string[] = []

  const dataList = data['Data'] || data['data']
  if (Array.isArray(dataList)) {
    for (const item of dataList) {
      const url = item['url']
      if (url) images.push(url)
      const b64 = item['b64_json']
      if (b64) images.push(`data:image/jpeg;base64,${b64}`)
    }
  }

  return { text: textParts.join('\n'), images }
}

function parseGeminiResponse(data: Record<string, unknown>): GenerateResult {
  const textParts: string[] = []
  const images: string[] = []

  const candidates = data['candidates'] as Array<Record<string, unknown>> | undefined
  const parts = candidates?.[0]?.['content'] as { parts?: Array<Record<string, unknown>> } | undefined
  const partList = parts?.parts

  if (Array.isArray(partList)) {
    for (const part of partList) {
      if (typeof part['text'] === 'string') textParts.push(part['text'] as string)
      const inlineData = (part['inlineData'] || part['inline_data']) as {
        mimeType?: string; mime_type?: string; data?: string
      } | undefined
      if (inlineData?.data) {
        const mime = inlineData.mimeType || inlineData.mime_type || 'image/png'
        images.push(`data:${mime};base64,${inlineData.data}`)
      }
    }
  }

  return { text: textParts.join('\n'), images }
}

function parseMinimaxResponse(data: Record<string, unknown>): GenerateResult {
  const images: string[] = []

  // Check for error
  const baseResp = data['base_resp'] as { status_code?: number; status_msg?: string } | undefined
  if (baseResp && baseResp.status_code !== 0) {
    throw new Error(`MiniMax Error (${baseResp.status_code}): ${baseResp.status_msg}`)
  }

  const dataObj = data['data'] as {
    image_urls?: string[]
    image_base64?: string[]
  } | undefined

  if (dataObj?.image_urls) {
    for (const url of dataObj.image_urls) images.push(url)
  }
  if (dataObj?.image_base64) {
    for (const b64 of dataObj.image_base64) {
      if (b64) images.push(`data:image/png;base64,${b64}`)
    }
  }
  // When response_format is 'base64', data might be at top level as array
  if (images.length === 0 && Array.isArray(data['data'])) {
    for (const item of data['data'] as Array<Record<string, string>>) {
      if (item['b64_json']) images.push(`data:image/png;base64,${item['b64_json']}`)
      if (item['url']) images.push(item['url'])
    }
  }

  return { text: '', images }
}

function parseGptImageResponse(data: Record<string, unknown>): GenerateResult {
  const images: string[] = []

  // data array format
  const dataList = data['data']
  if (Array.isArray(dataList)) {
    for (const item of dataList) {
      if (item['b64_json']) {
        images.push(`data:image/png;base64,${item['b64_json']}`)
      } else if (item['url']) {
        images.push(item['url'])
      }
    }
  }

  // Top-level b64_json fallback
  if (images.length === 0 && data['b64_json']) {
    images.push(`data:image/png;base64,${data['b64_json']}`)
  }

  return { text: '', images }
}

function parseJoyAIResponse(data: Record<string, unknown>): GenerateResult {
  const images: string[] = []
  const textParts: string[] = []

  const dataList = data['data']
  if (Array.isArray(dataList)) {
    for (const item of dataList) {
      if (item['url']) images.push(item['url'])
      if (item['b64_json']) images.push(`data:image/png;base64,${item['b64_json']}`)
      if (item['revised_prompt']) textParts.push(item['revised_prompt'])
    }
  }

  return { text: textParts.join('\n'), images }
}

// ── Core fetch function ──

async function callJoybuilder(
  settings: Settings,
  url: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  console.group('[Joybuilder API Request]')
  console.log('URL:', url)
  console.log('Model:', body['model'])
  console.log('Has images:', !!(body['image'] || body['subject_reference']))
  console.groupEnd()

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${settings.joybuilderApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[Joybuilder API Error]', res.status, err)
    throw new Error(`Joybuilder API Error (${res.status}): ${err}`)
  }

  const data = await res.json()

  console.group('[Joybuilder API Response]')
  console.log('Response keys:', Object.keys(data))
  console.log('Images found:', countImages(data))
  console.groupEnd()

  return data
}

function countImages(data: Record<string, unknown>): number {
  const d = data['Data'] || data['data']
  if (Array.isArray(d)) return d.length
  const candidates = data['candidates'] as Array<Record<string, unknown>> | undefined
  if (candidates) {
    const content = candidates[0]?.['content'] as { parts?: Array<Record<string, unknown>> } | undefined
    if (content?.parts) {
      return content.parts.filter(p => p['inlineData'] || p['inline_data']).length
    }
  }
  return 0
}

// ── Build + parse dispatcher ──

function buildRequest(apiType: ApiType, model: string, prompt: string, images: string[], options?: GenerateOptions): Record<string, unknown> {
  switch (apiType) {
    case 'seedream': return buildSeedreamRequest(model, prompt, images, options)
    case 'gemini': return buildGeminiRequest(model, prompt, images)
    case 'minimax': return buildMinimaxRequest(model, prompt, images, options)
    case 'gpt-image': return buildGptImageRequest(model, prompt, images, options)
    case 'joyai': return buildJoyAIRequest(model, prompt, images, options)
  }
}

function parseResponse(apiType: ApiType, data: Record<string, unknown>): GenerateResult {
  switch (apiType) {
    case 'seedream': return parseSeedreamResponse(data)
    case 'gemini': return parseGeminiResponse(data)
    case 'minimax': return parseMinimaxResponse(data)
    case 'gpt-image': return parseGptImageResponse(data)
    case 'joyai': return parseJoyAIResponse(data)
  }
}

// ── URL → data URL conversion ──

async function urlToDataUrl(url: string): Promise<string> {
  if (!url.startsWith('http://') && !url.startsWith('https://')) return url
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (err) {
    console.warn('[Joybuilder] Failed to fetch image URL, keeping as-is:', url, err)
    return url
  }
}

async function convertUrlsToDataUrls(images: string[]): Promise<string[]> {
  const needsFetch = images.some(img => img.startsWith('http://') || img.startsWith('https://'))
  if (!needsFetch) return images
  return Promise.all(images.map(urlToDataUrl))
}

// ── Exported API ──

export async function createImage(
  settings: Settings,
  prompt: string,
  inputImages: string[] = [],
  options?: GenerateOptions,
): Promise<GenerateResult> {
  const model = settings.joybuilderModel
  const apiType = getApiType(model)
  const hasImages = inputImages.length > 0
  const url = getEndpoint(apiType, hasImages, settings.joybuilderBaseUrl)
  const body = buildRequest(apiType, model, prompt, inputImages, options)

  const data = await callJoybuilder(settings, url, body)
  let result = parseResponse(apiType, data)

  // Retry once if no images returned
  if (result.images.length === 0) {
    console.warn('[Joybuilder] No images in response, retrying...')
    const retryData = await callJoybuilder(settings, url, body)
    const retryResult = parseResponse(apiType, retryData)
    if (retryResult.images.length > 0) result = retryResult
  }

  // Convert all HTTP URL images to data URLs (avoids expired links, CORS issues, page navigation)
  result.images = await convertUrlsToDataUrls(result.images)

  return result
}

// Joybuilder doesn't support image explanation (no vision endpoint, Gemini doesn't accept base64)
export async function explainImage(
  _settings: Settings,
  _imageBase64: string,
  _question?: string,
): Promise<string> {
  throw new Error('Joybuilder 暂不支持图片解释功能')
}
