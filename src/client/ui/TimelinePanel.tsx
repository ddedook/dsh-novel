import { useCallback, useEffect, useState } from 'react'
import { dataOf, filterOwned, listEntities, type EntityItem } from '../entity-client.ts'
import { emptyHint, useLiveReload } from './live-reload.ts'

export function TimelinePanel({
  path,
  domain,
  ownerKey,
  ownerId,
  chapters,
}: {
  path: string
  domain: string
  ownerKey: string
  ownerId: string
  chapters: EntityItem[]
}) {
  const [rows, setRows] = useState<EntityItem[]>([])
  const reload = useCallback(async () => {
    setRows(filterOwned(await listEntities(path, domain), ownerKey, ownerId))
  }, [path, domain, ownerId, ownerKey])
  useEffect(() => { void reload() }, [reload])
  useLiveReload(reload)

  return (
    <div className="dshNovelViewFormBody">
      {rows.length === 0 && <p className="dshNovelViewMuted">{emptyHint()}</p>}
      {rows.map(row => {
        const data = dataOf(row)
        const chapter = chapters.find(item => item.id === data.relatedChapterId)
        return (
          <article key={row.id} className="dshNovelEntry">
            <div>
              <div className="dshNovelEntryTitle">{String(data.title ?? row.name ?? '未命名')}</div>
              <div className="dshNovelViewMuted">
                {[data.timeLabel, chapter?.name].filter(Boolean).map(String).join(' · ')}
              </div>
              {data.content !== undefined && data.content !== '' && (
                <p className="dshNovelProse">{String(data.content)}</p>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}
