import { useCallback, useEffect, useState } from 'react'
import { dataOf, viewData, listEntities, type EntityItem } from '../entity-client.ts'
import { EntitySidebar } from '../ui/EntitySidebar.tsx'
import { emptyHint, useLiveReload } from '../ui/live-reload.ts'
import { chapterNodeLabel, outlineNodeLabel, sortByOrdinalName } from '../../novel/outline-labels.ts'
import type { SectionPageProps } from './types.ts'

function labelData(item: EntityItem): Record<string, unknown> {
  const data = dataOf(item)
  return { ...data, name: item.name ?? data.name }
}

export function ChapterSection({ path }: SectionPageProps) {
  const [items, setItems] = useState<EntityItem[]>([])
  const [outlines, setOutlines] = useState<EntityItem[]>([])
  const [selectedId, setSelectedId] = useState<string | undefined>()
  const selected = items.find(item => item.id === selectedId)
  const data = viewData(selected)
  const related = outlines.find(item => item.id === data.relatedOutlineId)
  const outlineName = related === undefined
    ? undefined
    : outlineNodeLabel(labelData(related), related.name ?? related.id)

  const reload = useCallback(async () => {
    const [rows, outlineRows] = await Promise.all([listEntities(path, 'chapter'), listEntities(path, 'outline')])
    const sorted = sortByOrdinalName(rows, item => dataOf(item).ordinal ?? dataOf(item).chapterNo)
    setItems(sorted)
    setOutlines(outlineRows)
    setSelectedId(current => (current !== undefined && sorted.some(row => row.id === current) ? current : sorted[0]?.id))
  }, [path])
  useEffect(() => { void reload() }, [reload])
  useLiveReload(reload)

  return (
    <>
      <EntitySidebar
        items={items}
        selectedId={selectedId}
        label={(item) => chapterNodeLabel(labelData(item), item.name ?? item.id)}
        onSelect={setSelectedId}
      />
      <section className="dshNovelViewForm">
        {selected === undefined ? (
          <div className="dshNovelViewFormBody"><p className="dshNovelViewMuted">{emptyHint()}</p></div>
        ) : (
          <div className="dshNovelViewFormBody">
            <h2 className="dshNovelTitle">{chapterNodeLabel(data, String(data.name ?? data.title ?? '未命名'))}</h2>
            {outlineName !== undefined && <p className="dshNovelMeta">{outlineName}</p>}
            <div className="dshNovelProse">{String(data.content ?? '') || '—'}</div>
          </div>
        )}
      </section>
    </>
  )
}
