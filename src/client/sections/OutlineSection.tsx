import { useCallback, useEffect, useState } from 'react'
import { dataOf, viewData, listEntities, type EntityItem } from '../entity-client.ts'
import { EntitySidebar } from '../ui/EntitySidebar.tsx'
import { TemplateRead } from '../ui/TemplateRead.tsx'
import { emptyHint, useLiveReload } from '../ui/live-reload.ts'
import { outlineKindOf, outlineNodeLabel, sortByOrdinalName } from '../../novel/outline-labels.ts'
import type { SectionPageProps } from './types.ts'

function labelData(item: EntityItem): Record<string, unknown> {
  const data = dataOf(item)
  return { ...data, name: item.name ?? data.name }
}

export function OutlineSection({ path, template }: SectionPageProps) {
  const [items, setItems] = useState<EntityItem[]>([])
  const [selectedId, setSelectedId] = useState<string | undefined>()
  const selected = items.find(item => item.id === selectedId)
  const data = viewData(selected)
  const isChapter = outlineKindOf(data) === 'chapter_segment'
  const parent = items.find(item => item.id === data.parentId)
  const parentLabel = parent === undefined ? undefined : outlineNodeLabel(labelData(parent), parent.name ?? parent.id)

  const reload = useCallback(async () => {
    const rows = sortByOrdinalName(await listEntities(path, 'outline'), item => dataOf(item).ordinal)
    setItems(rows)
    setSelectedId(current => (current !== undefined && rows.some(row => row.id === current) ? current : rows[0]?.id))
  }, [path])
  useEffect(() => { void reload() }, [reload])
  useLiveReload(reload)

  return (
    <>
      <EntitySidebar
        items={items}
        selectedId={selectedId}
        tree
        label={(item) => outlineNodeLabel(labelData(item), item.name ?? item.id)}
        onSelect={setSelectedId}
      />
      <section className="dshNovelViewForm">
        {selected === undefined ? (
          <div className="dshNovelViewFormBody"><p className="dshNovelViewMuted">{emptyHint()}</p></div>
        ) : (
          <div className="dshNovelViewFormBody">
            <h2 className="dshNovelTitle">{outlineNodeLabel(data, String(data.name ?? '未命名'))}</h2>
            {parentLabel !== undefined && <p className="dshNovelMeta">{parentLabel}</p>}
            <TemplateRead
              template={template}
              section="outline"
              extra={isChapter ? 'chapterSegment' : undefined}
              value={data}
              omitKeys={['name']}
            />
          </div>
        )}
      </section>
    </>
  )
}
