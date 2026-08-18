const EVENT_TYPE_LABELS: Record<string, string> = {
  plot: '主线',
  conflict: '冲突',
  suspense: '悬念',
  foreshadow: '伏笔',
  turning: '转折',
  resolution: '收束',
  other: '其他',
}

const TRACKED_EVENT_TYPES = new Set(['conflict', 'suspense', 'foreshadow'])

function asEventType(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const key = value.trim()
  return key.length > 0 ? key : undefined
}

function asResolved(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
}

export function timelineEventTypeLabel(eventType: unknown): string | undefined {
  const key = asEventType(eventType)
  if (key === undefined) return undefined
  return EVENT_TYPE_LABELS[key] ?? key
}

export function timelineResolvedLabel(eventType: unknown, isResolved: unknown): string | undefined {
  const key = asEventType(eventType)
  if (key === undefined || !TRACKED_EVENT_TYPES.has(key)) return undefined
  const resolved = asResolved(isResolved)
  if (resolved === true) return '已解决'
  return '未解决'
}
