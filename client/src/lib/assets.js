const API_ORIGIN = import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')

export function resolveAssetUrl(pathOrUrl) {
  if (!pathOrUrl) return null
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl
  return `${API_ORIGIN}${pathOrUrl}`
}
