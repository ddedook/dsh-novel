import { useCallback, useEffect, useState } from 'react'
import { viewData, listEntities, type EntityItem } from '../entity-client.ts'
import { EntitySidebar } from '../ui/EntitySidebar.tsx'
import { DetailTabs, SectionToolbar } from '../ui/controls.tsx'
import { TemplateRead } from '../ui/TemplateRead.tsx'
import { TimelinePanel } from '../ui/TimelinePanel.tsx'
import { RelationPanel } from '../ui/RelationPanel.tsx'
import { emptyHint, useLiveReload } from '../ui/live-reload.ts'
import type { ContentSection } from '../../novel/domains.ts'

export function ListDetailSection({
  path,
  domain,
  template,
  templateSection,
  chapters,
  tree,
  tabs,
  timelineDomain,
  ownerKey,
}: {
  path: string
  domain: string
  template: unknown
  templateSection: ContentSection
  chapters: EntityItem[]
  tree?: boolean | undefined
  tabs: Array<'detail' | 'timeline' | 'relation'>
  timelineDomain?: string | undefined
  ownerKey?: string | undefined
}) {
  const [items, setItems] = useState<EntityItem[]>([])
  const [selectedId, setSelectedId] = useState<string | undefined>()
  const [tab, setTab] = useState<'detail' | 'timeline' | 'relation'>('detail')
  const selected = items.find(item => item.id === selectedId)
  const data = viewData(selected)

  const reload = useCallback(async () => {
    const rows = await listEntities(path, domain)
    setItems(rows)
    setSelectedId(current => {
      if (current !== undefined && rows.some(row => row.id === current)) return current
      return rows[0]?.id
    })
  }, [domain, path])

  useEffect(() => { void reload() }, [reload])
  useLiveReload(reload)

  return (
    <>
      <EntitySidebar
        items={items}
        selectedId={selectedId}
        tree={tree}
        onSelect={(id) => { setSelectedId(id); setTab('detail') }}
      />
      <section className="dshNovelViewForm">
        {tabs.length > 1 && selectedId !== undefined && (
          <SectionToolbar
            tabs={(
              <DetailTabs
                tabs={tabs.map(id => ({ id, label: id === 'detail' ? '详情' : id === 'timeline' ? '时间线' : '关系' }))}
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
            <TemplateRead template={template} section={templateSection} value={data} />
          </div>
        ) : tab === 'timeline' && timelineDomain && ownerKey ? (
          <TimelinePanel
            path={path}
            domain={timelineDomain}
            ownerKey={ownerKey}
            ownerId={selectedId!}
            chapters={chapters}
          />
        ) : tab === 'relation' ? (
          <RelationPanel path={path} ownerId={selectedId!} roles={items} />
        ) : null}
      </section>
    </>
  )
}
