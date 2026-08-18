import type { EntityDomain } from './domains.ts'
import { asOrdinal, outlineKindOf } from './outline-labels.ts'

export function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/** Merge nested `profile` onto the root; existing top-level keys win. */
export function hoistProfile(data: Record<string, unknown>): Record<string, unknown> {
  return { ...asRecord(data.profile), ...data }
}

/** Merge outline `extra` onto the root; existing top-level keys win. */
export function hoistOutlineExtra(data: Record<string, unknown>): Record<string, unknown> {
  return { ...asRecord(data.extra), ...data }
}

/** Shape used by the content tab: hoist profile/extra so template keys resolve. */
export function displayEntityData(data: Record<string, unknown>): Record<string, unknown> {
  return hoistOutlineExtra(hoistProfile(data))
}

export function levelNameOf(data: Record<string, unknown>): string | undefined {
  return asNonEmptyString(data.name)
    ?? asNonEmptyString(data.title)
    ?? asNonEmptyString(asRecord(data.system).name)
}

const FROM_KEYS = ['roleId', 'from', 'fromName', 'source', 'fromRole'] as const
const TO_KEYS = ['targetRoleId', 'to', 'toName', 'target', 'toRole'] as const

export function pickFirstString(data: Record<string, unknown>, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = asNonEmptyString(data[key])
    if (value !== undefined) return value
  }
  return undefined
}

export interface NormalizeLookups {
  worldIdByName: Map<string, string>
  roleIdByRef: Map<string, string>
  outlineIdByName: Map<string, string>
  outlineChapterIdByName: Map<string, string>
}

function omitKeys(data: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const next = { ...data }
  for (const key of keys) delete next[key]
  return next
}

function resolveRef(ref: string, map: Map<string, string>, label: string): string {
  const id = map.get(ref)
  if (id === undefined) throw new Error(`${label} not found: ${ref}`)
  return id
}

/** Canonicalize mutate payloads so the content tab can read template keys. */
export function normalizeEntityPayload(
  domain: EntityDomain,
  raw: Record<string, unknown>,
  lookups: NormalizeLookups,
): Record<string, unknown> {
  let data = hoistProfile(raw)
  if (domain === 'outline') data = hoistOutlineExtra(data)

  if (domain === 'level') {
    const name = levelNameOf(data)
    if (name !== undefined) data = { ...data, name }
  }

  if (domain === 'world') {
    const parentId = asNonEmptyString(data.parentId)
    const parentName = asNonEmptyString(data.parentName)
    if (parentId === undefined && parentName !== undefined) {
      data = { ...data, parentId: resolveRef(parentName, lookups.worldIdByName, 'world parent') }
    }
    data = omitKeys(data, ['parentName'])
  }

  if (domain === 'outline') {
    const parentId = asNonEmptyString(data.parentId)
    const parentName = asNonEmptyString(data.parentName)
    if (parentId === undefined && parentName !== undefined) {
      data = { ...data, parentId: resolveRef(parentName, lookups.outlineIdByName, 'outline parent') }
    }
    const ordinal = asOrdinal(data.ordinal) ?? asOrdinal(data.chapterNo)
    data = {
      ...data,
      kind: outlineKindOf(data),
      ...(ordinal !== undefined ? { ordinal } : {}),
    }
    data = omitKeys(data, ['parentName', 'nodeKind', 'volumeNo', 'chapterNo'])
  }

  if (domain === 'chapter') {
    const relatedId = asNonEmptyString(data.relatedOutlineId)
    const relatedName = asNonEmptyString(data.relatedOutlineName)
    if (relatedId === undefined && relatedName !== undefined) {
      const id = lookups.outlineChapterIdByName.get(relatedName) ?? lookups.outlineIdByName.get(relatedName)
      if (id === undefined) throw new Error(`outline chapter not found: ${relatedName}`)
      data = { ...data, relatedOutlineId: id }
    }
    const ordinal = asOrdinal(data.ordinal) ?? asOrdinal(data.chapterNo)
    if (ordinal !== undefined) data = { ...data, ordinal }
    data = omitKeys(data, ['relatedOutlineName', 'chapterNo', 'volumeNo'])
  }

  if (domain === 'roleRelation') {
    const fromRef = pickFirstString(data, FROM_KEYS)
    const toRef = pickFirstString(data, TO_KEYS)
    if (fromRef === undefined || toRef === undefined) {
      throw new Error('roleRelation requires both ends (roleId/from and targetRoleId/to)')
    }
    data = {
      ...data,
      roleId: resolveRef(fromRef, lookups.roleIdByRef, 'role'),
      targetRoleId: resolveRef(toRef, lookups.roleIdByRef, 'role'),
    }
  }

  return data
}
