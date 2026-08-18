import { useCallback, useEffect, useState } from 'react'
import { dataOf, listEntities, type EntityItem } from '../entity-client.ts'
import { emptyHint, useLiveReload } from './live-reload.ts'

export function RelationPanel({
  path,
  ownerId,
  roles,
}: {
  path: string
  ownerId: string
  roles: EntityItem[]
}) {
  const [rows, setRows] = useState<EntityItem[]>([])
  const reload = useCallback(async () => {
    const all = await listEntities(path, 'roleRelation')
    setRows(all.filter((item) => {
      const data = dataOf(item)
      return String(data.roleId ?? '') === ownerId || String(data.targetRoleId ?? '') === ownerId
    }))
  }, [path, ownerId])
  useEffect(() => { void reload() }, [reload])
  useLiveReload(reload)

  return (
    <div className="dshNovelViewFormBody">
      {rows.length === 0 && <p className="dshNovelViewMuted">{emptyHint()}</p>}
      {rows.map(row => {
        const data = dataOf(row)
        const otherId = String(data.roleId ?? '') === ownerId ? data.targetRoleId : data.roleId
        const other = roles.find(role => role.id === otherId)
          ?? roles.find(role => role.name === otherId)
        return (
          <article key={row.id} className="dshNovelEntry">
            <div>
              <div className="dshNovelEntryTitle">{other?.name ?? String(otherId ?? '')} · {String(data.relationType ?? '')}</div>
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
