export function parseApiUrl(value: string | undefined): string | null {
  const configured = value?.trim()
  if (!configured) return null
  try {
    const url = new URL(configured)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
      return null
    }
    // Los servicios ya incluyen /api en sus rutas: la configuración es el origen.
    if (url.pathname !== '/') return null
    return url.origin
  } catch {
    return null
  }
}

export function parseBusinessId(value: string | undefined): number | null {
  const configured = value?.trim()
  const id = Number(configured)
  return configured && /^\d+$/.test(configured) && Number.isSafeInteger(id) && id > 0 && id <= 2147483647
    ? id
    : null
}
