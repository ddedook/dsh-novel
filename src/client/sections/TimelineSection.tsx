import { useCallback, useEffect, useState } from 'react'
import { viewData, listEntities, type EntityItem } from '../entity-client.ts'
import { EntitySidebar } from '../ui/EntitySidebar.tsx'
import { ReadField, TemplateRead } from '../ui/TemplateRead.tsx'
import { emptyHint, useLiveReload } from '../ui/live-reload.ts'
import { timelineEventTypeLabel, timelineResolvedLabel } from '../../novel/timeline-labels.ts'
import type { SectionPageProps } from './types.ts'

export function TimelineSection({ path, template, chapters }: SectionPageProps) {
  const [items, setItems] = useState<EntityItem[]>([])
  const [selectedId, setSelectedId] = useState<string | undefined>()
  const selected = items.find(item => item.id === selectedId)
  const data = viewData(selected)
  const chapter = chapters.find(item => item.id === data.relatedChapterId)
  const typeLabel = timelineEventTypeLabel(data.eventType)
  const resolvedLabel = timelineResolvedLabel(data.eventType, data.isResolved)

  const reload = useCallback(async () => {
    const rows = await listEntities(path, 'timeline')
    setItems(rows)
    setSelectedId(current => (current !== undefined && rows.some(row => row.id === current) ? current : rows[0]?.id))
  }, [path])
  useEffect(() => { void reload() }, [reload])
  useLiveReload(reload)

  return (
    <>
      <EntitySidebar items={items} selectedId={selectedId} onSelect={setSelectedId} />
      <section className="dshNovelViewForm">
        {selected === undefined ? (
          <div className="dshNovelViewFormBody"><p className="dshNovelViewMuted">{emptyHint()}</p></div>
        ) : (
          <div className="dshNovelViewFormBody">
            <h2 className="dshNovelTitle">{String(data.title ?? data.name ?? '未命名')}</h2>
            <p className="dshNovelMeta">
              {[data.timeLabel, typeLabel, resolvedLabel, chapter?.name].filter(Boolean).map(String).join(' · ')}
            </p>
            {typeLabel !== undefined && <ReadField label="类型">{typeLabel}</ReadField>}
            {resolvedLabel !== undefined && (
              <ReadField label="状态">
                {resolvedLabel === '已解决' && data.resolveChapterNo !== undefined && data.resolveChapterNo !== ''
                  ? `${resolvedLabel} · 回收章 ${String(data.resolveChapterNo)}`
                  : resolvedLabel}
              </ReadField>
            )}
            <TemplateRead template={template} section="timeline" extra="timeline" value={data} />
          </div>
        )}
      </section>
    </>
  )
}
