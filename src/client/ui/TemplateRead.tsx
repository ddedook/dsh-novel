import { fieldsOf, getByPath } from '../../novel/template-fields.ts'
import type { ContentSection } from '../../novel/domains.ts'

export function ReadField({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div className="dshNovelViewField">
      <label>{label}</label>
      <div className="dshNovelReadValue">{children === '' || children === undefined || children === null ? '—' : children}</div>
    </div>
  )
}

export function displayText(value: unknown): string {
  if (value === undefined || value === null || value === '') return ''
  if (Array.isArray(value)) return value.map(item => String(item)).filter(Boolean).join('、')
  if (typeof value === 'boolean') return value ? '是' : '否'
  return String(value)
}

export function TemplateRead({
  template,
  section,
  extra,
  value,
  omitKeys,
}: {
  template: unknown
  section: ContentSection
  extra?: 'chapterSegment' | 'timeline' | undefined
  value: Record<string, unknown>
  omitKeys?: string[] | undefined
}) {
  const skip = new Set(omitKeys ?? [])
  const fields = fieldsOf(template, section, extra).filter(field => !skip.has(field.key))
  return (
    <>
      {fields.map(field => (
        <ReadField key={field.key} label={field.label}>
          {displayText(getByPath(value, field.key))}
        </ReadField>
      ))}
    </>
  )
}
