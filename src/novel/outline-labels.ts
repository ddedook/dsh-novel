export function asOrdinal(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value.trim())
    if (Number.isFinite(n)) return n
  }
  return undefined
}

export function canonicalizeOutlineKind(raw: unknown): 'volume' | 'chapter_segment' | undefined {
  if (typeof raw !== 'string') return undefined
  const key = raw.trim()
  if (key === 'chapter_segment' || key === 'chapter' || key === '章') return 'chapter_segment'
  if (key === 'volume' || key === '卷') return 'volume'
  return undefined
}

export function outlineKindOf(data: Record<string, unknown>): 'volume' | 'chapter_segment' {
  const explicit = canonicalizeOutlineKind(data.kind ?? data.nodeKind)
  if (explicit !== undefined) return explicit
  const parent = typeof data.parentId === 'string' && data.parentId.length > 0
    || typeof data.parentName === 'string' && data.parentName.length > 0
  return parent ? 'chapter_segment' : 'volume'
}

export function volumeChapterLabel(ordinal: unknown, unit: '卷' | '章', name: string): string {
  const title = name.trim().length > 0 ? name.trim() : '未命名'
  const n = asOrdinal(ordinal)
  if (n === undefined) return title
  return `第${n}${unit} ${title}`
}

function shortName(data: Record<string, unknown>, fallback: string): string {
  return typeof data.name === 'string' && data.name.trim().length > 0 ? data.name.trim() : fallback
}

export function outlineNodeLabel(data: Record<string, unknown>, fallback: string): string {
  const unit = outlineKindOf(data) === 'chapter_segment' ? '章' : '卷'
  return volumeChapterLabel(data.ordinal, unit, shortName(data, fallback))
}

export function chapterNodeLabel(data: Record<string, unknown>, fallback: string): string {
  return volumeChapterLabel(data.ordinal ?? data.chapterNo, '章', shortName(data, fallback))
}

export function compareOrdinal(a: unknown, b: unknown): number {
  const oa = asOrdinal(a)
  const ob = asOrdinal(b)
  if (oa === undefined && ob === undefined) return 0
  if (oa === undefined) return 1
  if (ob === undefined) return -1
  return oa - ob
}

export function sortByOrdinalName<T extends { name?: string | null }>(
  items: T[],
  ordinalOf: (item: T) => unknown,
): T[] {
  return [...items].sort((a, b) => {
    const cmp = compareOrdinal(ordinalOf(a), ordinalOf(b))
    if (cmp !== 0) return cmp
    return (a.name ?? '').localeCompare(b.name ?? '', 'zh')
  })
}
