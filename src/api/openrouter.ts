import type { Settings, GenerateOptions, GenerateResult } from '../types'

async function callOpenRouter(
  settings: Settings,
  body: Record<string, unknown>
): Promise<unknown> {
  const url = `${settings.baseUrl.replace(/\/$/, '')}/chat/completions`
  const payload = { ...body, stream: false }

  console.group('[OpenRouter API Request]')
  console.log('URL:', url)
  console.log('Model:', payload.model)
  console.log('Modalities:', payload.modalities)
  console.log('Has input images:', Array.isArray(payload.messages?.[0]?.content))
  console.groupEnd()

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${settings.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[OpenRouter API Error]', res.status, err)
    throw new Error(`API Error (${res.status}): ${err}`)
  }

  const data = await res.json()

  console.group('[OpenRouter API Response]')
  console.log('Images count:', (data.choices?.[0]?.message?.images)?.length ?? 0)
  console.log('Usage:', data.usage)
  console.groupEnd()

  return data
}

function extractResult(data: unknown): GenerateResult {
  const message = (data as { choices?: { message?: Record<string, unknown> }[] })
    .choices?.[0]?.message

  if (!message) return { text: 'No response from API', images: [] }

  let text = ''
  if (typeof message.content === 'string') {
    text = message.content
  } else if (Array.isArray(message.content)) {
    text = message.content
      .filter((part: Record<string, unknown>) => part.type === 'text')
      .map((part: Record<string, unknown>) => (part as { text: string }).text)
      .join('\n')
  }

  const images: string[] = []
  const rawImages = message.images as Array<Record<string, unknown>> | undefined
  if (Array.isArray(rawImages)) {
    for (const img of rawImages) {
      const imageUrl = (img?.image_url as { url?: string })?.url
        ?? (img?.imageUrl as { url?: string })?.url
      if (imageUrl) images.push(imageUrl)
    }
  }

  if (Array.isArray(message.content)) {
    for (const part of message.content as Array<Record<string, unknown>>) {
      if (part.type === 'image_url') {
        const url = (part.image_url as { url?: string })?.url
          ?? (part.imageUrl as { url?: string })?.url
        if (url) images.push(url)
      }
    }
  }

  return { text, images }
}

/**
 * Unified image creation — works for both text-only and text+images input.
 * - No images → text-to-image generation
 * - With images → image editing / image-guided generation
 */
export async function createImage(
  settings: Settings,
  prompt: string,
  inputImages: string[] = [],
  options?: GenerateOptions
): Promise<GenerateResult> {
  // Build message content: text + optional images
  const content: Array<Record<string, unknown>> = [
    { type: 'text', text: prompt },
  ]
  for (const img of inputImages) {
    content.push({ type: 'image_url', image_url: { url: img } })
  }

  const body: Record<string, unknown> = {
    model: settings.imageModel,
    messages: [{ role: 'user', content: inputImages.length > 0 ? content : prompt }],
    modalities: ['image', 'text'],
  }

  if (options?.aspectRatio || options?.imageSize) {
    const imageConfig: Record<string, string> = {}
    if (options.aspectRatio) imageConfig.aspect_ratio = options.aspectRatio
    if (options.imageSize) imageConfig.image_size = options.imageSize
    body.image_config = imageConfig
  }

  const data = await callOpenRouter(settings, body)
  const result = extractResult(data)

  // Retry once if no images returned (sporadic Google-side issue)
  if (result.images.length === 0 && result.text) {
    console.warn('[OpenRouter] No images in response, retrying...')
    const retryData = await callOpenRouter(settings, body)
    const retryResult = extractResult(retryData)
    if (retryResult.images.length > 0) return retryResult
  }

  return result
}

export async function explainImage(
  settings: Settings,
  imageBase64: string,
  question?: string
): Promise<string> {
  const prompt = question || '请详细描述这张图片的内容，包括其中的物体、场景、色彩和氛围。'

  const body = {
    model: settings.visionModel,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: imageBase64 } },
      ],
    }],
  }

  const data = await callOpenRouter(settings, body)
  const message = (data as { choices?: { message?: { content?: string } }[] })
    .choices?.[0]?.message

  return message?.content ?? '无法解析图片内容'
}
