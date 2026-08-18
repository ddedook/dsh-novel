import { NOVEL_API_PREFIX } from '../novel/contract.ts'

export async function novelApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${NOVEL_API_PREFIX}${path}`, {
    cache: 'no-store',
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  })
  const text = await response.text()
  const body = text.length === 0 ? undefined : JSON.parse(text) as T
  if (!response.ok) {
    const err = body as { error?: string } | undefined
    throw new Error(err?.error ?? `HTTP ${String(response.status)}`)
  }
  return body as T
}
