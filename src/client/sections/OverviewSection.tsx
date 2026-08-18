import { useCallback, useEffect, useState } from 'react'
import { novelApi } from '../novel-api.ts'
import { asRecord } from '../entity-client.ts'
import { TemplateRead } from '../ui/TemplateRead.tsx'
import { useLiveReload } from '../ui/live-reload.ts'
import type { OverviewPageProps } from './types.ts'

export function OverviewSection({ path, template, styles }: OverviewPageProps) {
  const [row, setRow] = useState<Record<string, unknown>>({})
  const reload = useCallback(async () => {
    setRow(await novelApi<Record<string, unknown>>(`/novel?path=${encodeURIComponent(path)}`))
  }, [path])
  useEffect(() => { void reload() }, [reload])
  useLiveReload(reload)

  const blueprint = asRecord(row.blueprint_json)
  const styleName = styles.find(style => style.id === row.writing_style_id)?.name ?? String(row.writing_style_id ?? '')

  return (
    <section className="dshNovelViewForm">
      <div className="dshNovelViewFormBody">
        <h1 className="dshNovelTitle">{String(row.title ?? '未命名')}</h1>
        <p className="dshNovelMeta">
          {[row.category, styleName].filter(item => item !== undefined && item !== '').join(' · ') || '—'}
        </p>
        {row.description !== undefined && row.description !== '' && (
          <p className="dshNovelProse">{String(row.description)}</p>
        )}
        <TemplateRead template={template} section="overview" value={blueprint} />
      </div>
    </section>
  )
}
