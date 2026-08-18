import type { ContentSection } from './domains.ts'

export const TEMPLATE_PRESET_MAIN_CATEGORIES = [
  '玄幻',
  '都市',
  '科幻',
  '末世',
  '仙侠',
  '言情',
  '悬疑',
  '历史',
] as const

export type TemplatePresetMainCategory = (typeof TEMPLATE_PRESET_MAIN_CATEGORIES)[number]

const CATEGORY_ALIASES: Record<string, TemplatePresetMainCategory> = {
  玄幻: '玄幻',
  东方玄幻: '玄幻',
  异世大陆: '玄幻',
  高武世界: '玄幻',
  都市: '都市',
  都市异能: '都市',
  科幻: '科幻',
  星际: '科幻',
  末世: '末世',
  末日: '末世',
  仙侠: '仙侠',
  修真: '仙侠',
  言情: '言情',
  悬疑: '悬疑',
  推理: '悬疑',
  历史: '历史',
}

export function normalizeTemplatePresetCategory(raw: string | null | undefined): TemplatePresetMainCategory {
  const t = (raw ?? '').trim()
  if (t.length === 0) return '玄幻'
  const direct = CATEGORY_ALIASES[t]
  if (direct !== undefined) return direct
  for (const main of TEMPLATE_PRESET_MAIN_CATEGORIES) {
    if (t.includes(main)) return main
  }
  return '玄幻'
}

export interface FormField {
  key: string
  label: string
  component?: string
  options?: Array<{ label: string, value: string }>
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function asFields(raw: unknown): FormField[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((row): FormField[] => {
    if (row === null || typeof row !== 'object') return []
    const rec = row as Record<string, unknown>
    if (typeof rec.key !== 'string' || typeof rec.label !== 'string') return []
    const options = flattenOptions(rec.options)
    const field: FormField = { key: rec.key, label: rec.label }
    if (typeof rec.component === 'string') field.component = rec.component
    if (options.length > 0) field.options = options
    return [field]
  })
}

function flattenOptions(raw: unknown): Array<{ label: string, value: string }> {
  if (!Array.isArray(raw)) return []
  const out: Array<{ label: string, value: string }> = []
  for (const entry of raw) {
    if (entry === null || typeof entry !== 'object') continue
    const rec = entry as Record<string, unknown>
    if (typeof rec.value === 'string' && typeof rec.label === 'string') {
      out.push({ label: rec.label, value: rec.value })
      continue
    }
    if (Array.isArray(rec.options)) {
      for (const nested of rec.options) {
        if (nested === null || typeof nested !== 'object') continue
        const item = nested as Record<string, unknown>
        if (typeof item.value === 'string' && typeof item.label === 'string') {
          out.push({ label: item.label, value: item.value })
        }
      }
    }
  }
  return out
}

/** Pick human-editable fields from a Noveel form_templates.config blob. */
export function fieldsOf(template: unknown, section: ContentSection, extra?: 'chapterSegment' | 'timeline'): FormField[] {
  const root = asRecord(template)
  const block = asRecord(root[section])
  switch (section) {
    case 'overview':
      return asFields(block.fields)
    case 'role':
    case 'creature':
    case 'item':
      return extra === 'timeline' ? asFields(asRecord(block.timeline).extraFields) : asFields(block.detailFields)
    case 'world':
      return extra === 'timeline'
        ? asFields(asRecord(block.timeline).extraFields)
        : asFields(block.defaultDetailFields)
    case 'level':
      return asFields(block.levelFields)
    case 'timeline':
      return asFields(block.extraFields)
    case 'outline':
      return extra === 'chapterSegment' ? asFields(block.chapterSegmentFields) : asFields(block.volumeFields)
    default:
      return asFields(block.fields ?? block.detailFields)
  }
}

export function getByPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.').filter(Boolean)
  let cur: unknown = obj
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object' || Array.isArray(cur)) return undefined
    cur = (cur as Record<string, unknown>)[part]
  }
  return cur
}

export function setByPath(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const next = structuredClone(obj)
  const parts = path.split('.').filter(Boolean)
  if (parts.length === 0) return next
  let cur: Record<string, unknown> = next
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!
    const child = cur[part]
    if (child == null || typeof child !== 'object' || Array.isArray(child)) cur[part] = {}
    cur = cur[part] as Record<string, unknown>
  }
  cur[parts[parts.length - 1]!] = value
  return next
}
