import { displayEntityData } from '../novel/normalize-entity.ts'
import { novelApi } from './novel-api.ts'

export interface EntityItem {
  id: string
  name?: string | null
  data?: unknown
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

export async function listEntities(path: string, domain: string): Promise<EntityItem[]> {
  return novelApi<EntityItem[]>(`/entities?path=${encodeURIComponent(path)}&domain=${encodeURIComponent(domain)}`)
}

export async function upsertEntity(
  path: string,
  domain: string,
  data: Record<string, unknown>,
  id?: string,
): Promise<EntityItem> {
  return novelApi<EntityItem>('/entities', {
    method: 'POST',
    body: JSON.stringify({ path, domain, id, data }),
  })
}

export async function deleteEntity(path: string, id: string): Promise<void> {
  await novelApi('/entities', { method: 'DELETE', body: JSON.stringify({ path, id }) })
}

export function dataOf(item: EntityItem): Record<string, unknown> {
  return asRecord(item.data)
}

export function viewData(item: EntityItem | undefined): Record<string, unknown> {
  if (item === undefined) return {}
  return { name: item.name ?? '', ...displayEntityData(dataOf(item)) }
}

export function parentIdOf(item: EntityItem, items: EntityItem[]): string | undefined {
  const data = asRecord(item.data)
  if (typeof data.parentId === 'string' && data.parentId.length > 0) return data.parentId
  if (typeof data.parentName === 'string' && data.parentName.length > 0) {
    return items.find(row => row.name === data.parentName)?.id
  }
  return undefined
}

export function filterOwned(items: EntityItem[], ownerKey: string, ownerId: string): EntityItem[] {
  return items.filter(item => String(dataOf(item)[ownerKey] ?? '') === ownerId)
}

export async function cascadeDelete(
  path: string,
  ownerId: string,
  related: Array<{ domain: string, ownerKey: string }>,
): Promise<void> {
  for (const spec of related) {
    const all = await listEntities(path, spec.domain)
    const rows = spec.domain === 'roleRelation'
      ? all.filter(item => {
        const data = dataOf(item)
        return String(data.roleId ?? '') === ownerId || String(data.targetRoleId ?? '') === ownerId
      })
      : filterOwned(all, spec.ownerKey, ownerId)
    for (const row of rows) await deleteEntity(path, row.id)
  }
  await deleteEntity(path, ownerId)
}
