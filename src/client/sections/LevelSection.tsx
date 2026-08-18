import { useCallback, useEffect, useState } from 'react'
import { Pill } from '@deepseek-ai/dsh-client-ui-primitives'
import { asRecord, viewData, listEntities, type EntityItem } from '../entity-client.ts'
import { emptyLevelSystem } from '../noveel-shapes.ts'
import { EntitySidebar } from '../ui/EntitySidebar.tsx'
import { DetailTabs, SectionToolbar } from '../ui/controls.tsx'
import { ReadField } from '../ui/TemplateRead.tsx'
import { emptyHint, useLiveReload } from '../ui/live-reload.ts'
import type { SectionPageProps } from './types.ts'

function parseSystem(data: Record<string, unknown>) {
  const system = asRecord(data.system)
  const levels = Array.isArray(system.levels) ? system.levels : emptyLevelSystem().levels
  return {
    name: String(system.name ?? ''),
    description: String(system.description ?? ''),
    levels: levels.map((row) => {
      const rec = asRecord(row)
      const subs = Array.isArray(rec.subLevels) ? rec.subLevels : []
      return {
        name: String(rec.name ?? ''),
        promotionCondition: String(rec.promotionCondition ?? ''),
        abilities: String(rec.abilities ?? ''),
        subLevels: subs.map(sub => String(asRecord(sub).name ?? '')).filter(Boolean),
      }
    }),
  }
}

export function LevelSection({ path }: SectionPageProps) {
  const [items, setItems] = useState<EntityItem[]>([])
  const [selectedId, setSelectedId] = useState<string | undefined>()
  const [tab, setTab] = useState<'detail' | 'tiers'>('detail')
  const selected = items.find(item => item.id === selectedId)
  const data = viewData(selected)
  const system = parseSystem(data)

  const reload = useCallback(async () => {
    const rows = await listEntities(path, 'level')
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
        label={(item) => {
          const rec = asRecord(item.data)
          const system = asRecord(rec.system)
          const named = item.name ?? (typeof system.name === 'string' ? system.name : undefined)
          return named ?? item.id
        }}
        onSelect={(id) => { setSelectedId(id); setTab('detail') }}
      />
      <section className="dshNovelViewForm">
        {selectedId !== undefined && (
          <SectionToolbar
            tabs={(
              <DetailTabs
                tabs={[{ id: 'detail', label: '详情' }, { id: 'tiers', label: '档位' }]}
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
            <h2 className="dshNovelTitle">{String(data.name || system.name || '未命名')}</h2>
            {system.description !== '' && <p className="dshNovelProse">{system.description}</p>}
            <ReadField label="体系">{system.name}</ReadField>
          </div>
        ) : (
          <div className="dshNovelViewFormBody">
            {system.levels.length === 0 && <p className="dshNovelViewMuted">{emptyHint()}</p>}
            {system.levels.map((level, index) => (
              <article key={index} className="dshNovelTier">
                <div className="dshNovelEntryTitle">{level.name}</div>
                <div className="dshNovelPills">
                  {level.subLevels.map(sub => <Pill key={sub}>{sub}</Pill>)}
                </div>
                <ReadField label="突破条件">{level.promotionCondition}</ReadField>
                <ReadField label="能力">{level.abilities}</ReadField>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
