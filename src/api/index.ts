import type { Settings, GenerateOptions, GenerateResult } from '../types'
import * as openrouter from './openrouter'
import * as joybuilder from './joybuilder'

export async function createImage(
  settings: Settings,
  prompt: string,
  inputImages: string[] = [],
  options?: GenerateOptions,
): Promise<GenerateResult> {
  if (settings.provider === 'joybuilder') {
    return joybuilder.createImage(settings, prompt, inputImages, options)
  }
  return openrouter.createImage(settings, prompt, inputImages, options)
}

export async function explainImage(
  settings: Settings,
  imageBase64: string,
  question?: string,
): Promise<string> {
  if (settings.provider === 'joybuilder') {
    return joybuilder.explainImage(settings, imageBase64, question)
  }
  return openrouter.explainImage(settings, imageBase64, question)
}
