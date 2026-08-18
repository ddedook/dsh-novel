import {
  IconChevronRightOutline14,
  IconFolderClose16,
  IconFolderOpenOutline16,
  IconListPenOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { useEffect, useMemo, useState } from 'react'
import { asRecord, parentIdOf, type EntityItem } from '../entity-client.ts'
import { SearchField } from './controls.tsx'

export function EntitySidebar({
  items,
  selectedId,
  onSelect,
  tree,
  label,
  className,
  files,
}: {
  items: EntityItem[]
  selectedId?: string | undefined
  onSelect: (id: string) => void
  tree?: boolean | undefined
  label?: ((item: EntityItem) => string) | undefined
  className?: string | undefined
  files?: boolean | undefined
}) {
  const [filter, setFilter] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const nameOf = label ?? ((item: EntityItem) => item.name ?? item.id)
  const q = filter.trim()

  const visibleItems = useMemo(() => {
    if (q.length === 0) return items
    const match = new Set<string>()
    for (const item of items) {
      if (nameOf(item).includes(q)) match.add(item.id)
    }
    for (const item of items) {
      if (!match.has(item.id)) continue
      let current = parentIdOf(item, items)
      while (current !== undefined) {
        match.add(current)
        const ancestor = items.find(row => row.id === current)
        current = ancestor === undefined ? undefined : parentIdOf(ancestor, items)
      }
    }
    return items.filter(item => match.has(item.id))
  }, [items, nameOf, q])

  useEffect(() => {
    if (q.length === 0) return
    setExpanded(current => {
      const next = new Set(current)
      for (const item of visibleItems) {
        let ancestor = parentIdOf(item, items)
        while (ancestor !== undefined) {
          next.add(ancestor)
          const row = items.find(entry => entry.id === ancestor)
          ancestor = row === undefined ? undefined : parentIdOf(row, items)
        }
      }
      return next
    })
  }, [items, q, visibleItems])

  const rows = useMemo(() => {
    if (!tree) return visibleItems.map(item => ({ ...item, depth: 0, hasChildren: false }))
    return buildTree(visibleItems, items)
  }, [tree, visibleItems, items])

  const shown = rows.filter((row) => {
    if (!tree) return true
    const parent = parentIdOf(row, items)
    if (parent === undefined) return true
    let current: string | undefined = parent
    while (current !== undefined) {
      if (!expanded.has(current)) return false
      const ancestor = items.find(item => item.id === current)
      current = ancestor === undefined ? undefined : parentIdOf(ancestor, items)
    }
    return true
  })

  const toggle = (id: string) => {
    setExpanded(current => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <aside className={`dshNovelViewList${className === undefined ? '' : ` ${className}`}`}>
      <div className="dshNovelViewListToolbar">
        <SearchField value={filter} onChange={event => { setFilter(event.target.value) }} />
      </div>
      <div className="dshNovelViewListBody">
        {shown.length === 0 && (
          <p className="dshNovelViewMuted">{q ? '无匹配项' : '暂无。可在对话中让 AI 补充。'}</p>
        )}
        {shown.map(row => {
          const folder = isFolder(row)
          const open = expanded.has(row.id)
          return (
            <button
              key={row.id}
              type="button"
              className="dshNovelViewRow"
              data-kind={folder ? 'folder' : 'file'}
              data-active={(!folder && row.id === selectedId) ? true : undefined}
              style={{ paddingLeft: 8 + row.depth * 12 }}
              onClick={() => {
                if (folder) toggle(row.id)
                else onSelect(row.id)
              }}
            >
              {tree && row.hasChildren ? (
                <span
                  className="dshNovelViewChevron"
                  data-open={open || undefined}
                  onClick={event => {
                    event.stopPropagation()
                    toggle(row.id)
                  }}
                >
                  <IconChevronRightOutline14 />
                </span>
              ) : <span className="dshNovelViewChevron" />}
              {files ? (
                <span className="dshNovelViewRowIcon">
                  {folder
                    ? (open ? <IconFolderOpenOutline16 /> : <IconFolderClose16 />)
                    : <IconListPenOutline16 />}
                </span>
              ) : null}
              {nameOf(row)}
            </button>
          )
        })}
      </div>
    </aside>
  )
}

function isFolder(item: EntityItem): boolean {
  return asRecord(item.data).kind === 'folder'
}

function buildTree(items: EntityItem[], all: EntityItem[]): Array<EntityItem & { depth: number, hasChildren: boolean }> {
  const byParent = new Map<string | undefined, EntityItem[]>()
  for (const item of items) {
    const parent = parentIdOf(item, all)
    const list = byParent.get(parent) ?? []
    list.push(item)
    byParent.set(parent, list)
  }
  const out: Array<EntityItem & { depth: number, hasChildren: boolean }> = []
  const walk = (parent: string | undefined, depth: number) => {
    for (const child of byParent.get(parent) ?? []) {
      out.push({ ...child, depth, hasChildren: (byParent.get(child.id) ?? []).length > 0 })
      walk(child.id, depth + 1)
    }
  }
  walk(undefined, 0)
  const seen = new Set(out.map(row => row.id))
  for (const item of items) {
    if (!seen.has(item.id)) out.push({ ...item, depth: 0, hasChildren: false })
  }
  return out
}
