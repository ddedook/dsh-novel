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

/** Drop a leading 第N卷/章 or 第N卷 so the UI prefix is not duplicated. */
export function stripVolumeChapterPrefix(name: string): string {
  const re = /^第\s*(?:[0-9]+|[零〇一二三四五六七八九十百千两]+)\s*[章节卷]\s*/u
  let next = name.trim()
  for (let i = 0; i < 3; i++) {
    const stripped = next.replace(re, '').trim()
    if (stripped === next) break
    next = stripped
  }
  return next
}

export function volumeChapterLabel(ordinal: unknown, unit: '卷' | '章', name: string): string {
  const stripped = stripVolumeChapterPrefix(name)
  const title = stripped.length > 0 ? stripped : '未命名'
  const n = asOrdinal(ordinal)
  if (n === undefined) return title
  return `第${n}${unit} ${title}`
}

function shortName(data: Record<string, unknown>, fallback: string): string {
  const raw = typeof data.name === 'string' && data.name.trim().length > 0 ? data.name.trim() : fallback
  const stripped = stripVolumeChapterPrefix(raw)
  if (stripped.length > 0) return stripped
  const fallbackStripped = stripVolumeChapterPrefix(fallback)
  return fallbackStripped.length > 0 ? fallbackStripped : fallback
}

/** Character count with whitespace removed, matching chapter review. */
export function countChapterChars(content: unknown): number {
  if (typeof content !== 'string') return 0
  return content.replace(/\s/gu, '').length
}

/** Drop a first line that repeats the chapter heading (display only). */
export function stripLeadingChapterHeading(content: string, title: string): string {
  const lines = content.split('\n')
  const first = (lines[0] ?? '').trim().replace(/^#+\s*/u, '')
  if (first.length === 0) return content
  const a = stripVolumeChapterPrefix(first)
  const b = stripVolumeChapterPrefix(title)
  if (first !== title && a !== b) return content
  let i = 1
  while (i < lines.length && (lines[i] ?? '').trim() === '') i++
  return lines.slice(i).join('\n')
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
