import { getEnv } from '../config/env'

export const resolveImageSrc = (src: string): string | null => {
  if (!src) {
    return null
  }
  if (src.startsWith('storage:')) {
    const envResult = getEnv()
    if (!envResult.ok) {
      return null
    }
    const baseUrl = envResult.env.supabaseUrl.replace(/\/$/, '')
    const path = src.replace(/^storage:/, '').replace(/^\/+/, '')
    return `${baseUrl}/storage/v1/object/public/${path}`
  }
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src
  }
  return null
}
