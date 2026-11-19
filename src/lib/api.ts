export async function api<T = unknown>(url: string, options?: RequestInit): Promise<T> {
  // Bearer token survives cross-origin preview iframes where cookies are blocked
  let token: string | null = null
  try {
    token = typeof window !== 'undefined' ? localStorage.getItem('panel_token') : null
  } catch { /* storage unavailable */ }

  const authHeaders: Record<string, string> = {}
  if (token) authHeaders['Authorization'] = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(url, {
      ...options,
      headers: options?.body instanceof FormData
        ? { ...authHeaders, ...(options?.headers || {}) }
        : { 'Content-Type': 'application/json', ...authHeaders, ...(options?.headers || {}) },
    })
  } catch {
    // network-level failure: the panel server is unreachable (down or restarting)
    throw new Error('ارتباط با سرور پنل برقرار نشد — سرور احتمالاً خاموش است. دستور «bash scripts/start.sh» را اجرا کن و بعد صفحه را رفرش کن.')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'خطای غیرمنتظره در ارتباط با سرور')
  }
  return data as T
}

/** Authenticated file download (works even when cookies are blocked in preview iframes). */
export async function downloadFile(url: string, fallbackName: string): Promise<void> {
  let token: string | null = null
  try {
    token = typeof window !== 'undefined' ? localStorage.getItem('panel_token') : null
  } catch { /* ignore */ }
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(url, { headers })
  } catch {
    throw new Error('ارتباط با سرور پنل برقرار نشد — سرور احتمالاً خاموش است. دستور «bash scripts/start.sh» را اجرا کن.')
  }
  if (!res.ok) {
    let msg = 'دانلود ناموفق بود'
    try {
      const j = (await res.json()) as { error?: string }
      if (j.error) msg = j.error
    } catch { /* ignore */ }
    throw new Error(msg)
  }
  const blob = await res.blob()
  const cd = res.headers.get('content-disposition') || ''
  const m = cd.match(/filename="?([^";]+)"?/)
  const name = m ? m[1] : fallbackName
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 5000)
}
