import { useCallback, useEffect, useState } from 'react'
import { viewData, listEntities, parentIdOf, type EntityItem } from '../entity-client.ts'
import { WORLD_KINDS } from '../noveel-shapes.ts'
import { EntitySidebar } from '../ui/EntitySidebar.tsx'
import { DetailTabs, SectionToolbar } from '../ui/controls.tsx'
import { ReadField, TemplateRead } from '../ui/TemplateRead.tsx'
import { TimelinePanel } from '../ui/TimelinePanel.tsx'
import { emptyHint, useLiveReload } from '../ui/live-reload.ts'
import type { SectionPageProps } from './types.ts'

export function WorldSection({ path, template, chapters }: SectionPageProps) {
  const [items, setItems] = useState<EntityItem[]>([])
  const [selectedId, setSelectedId] = useState<string | undefined>()
  const [tab, setTab] = useState<'detail' | 'timeline'>('detail')
  const selected = items.find(item => item.id === selectedId)
  const data = viewData(selected)
  const kindLabel = WORLD_KINDS.find(kind => kind.value === data.kind)?.label ?? String(data.kind ?? '')
  const parentId = selected === undefined ? undefined : parentIdOf(selected, items)
  const parentName = parentId === undefined
    ? (typeof data.parentName === 'string' && data.parentName.length > 0 ? data.parentName : undefined)
    : items.find(item => item.id === parentId)?.name

  const reload = useCallback(async () => {
    const rows = await listEntities(path, 'world')
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
        onSelect={(id) => { setSelectedId(id); setTab('detail') }}
      />
      <section className="dshNovelViewForm">
        {selectedId !== undefined && (
          <SectionToolbar
            tabs={(
              <DetailTabs
                tabs={[{ id: 'detail', label: '详情' }, { id: 'timeline', label: '时间线' }]}
                value={tab}
                onChange={setTab}
              />
            )}
          />
        )}
        {selected === undefined ? (
          <div className="dshNovelViewFormBody"><p className="dshNovelViewMuted">{emptyHint()}</p></div>
        ) : tab === 'detail' ? (
          <div className="dshNovelViewFormBody">
            <h2 className="dshNovelTitle">{String(data.name ?? '未命名')}</h2>
            <p className="dshNovelMeta">{[kindLabel, parentName].filter(Boolean).join(' · ')}</p>
            <ReadField label="类型">{kindLabel}</ReadField>
            {parentName !== undefined && <ReadField label="父节点">{parentName}</ReadField>}
            <TemplateRead template={template} section="world" value={data} />
          </div>
        ) : (
          <TimelinePanel path={path} domain="worldTimeline" ownerKey="worldNodeId" ownerId={selectedId!} chapters={chapters} />
        )}
      </section>
    </>
  )
}
