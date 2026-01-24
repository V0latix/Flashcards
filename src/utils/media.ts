export const resolveImageSrc = (src: string): string => {
  if (!src) {
    return src
  }
  if (src.startsWith('storage:')) {
    const baseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
    const path = src.replace(/^storage:/, '').replace(/^\/+/, '')
    if (!baseUrl) {
      return src
    }
    return `${baseUrl}/storage/v1/object/public/${path}`
  }
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src
  }
  if (src.startsWith('/')) {
    return `${import.meta.env.BASE_URL}${src.slice(1)}`
  }
  return src
}
