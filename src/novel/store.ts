import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { PGlite } from '@electric-sql/pglite'
import { ENTITY_DOMAINS, isEntityDomain, type EntityDomain } from './domains.ts'
import { initNovelSchema } from './schema.ts'
import { DEFAULT_FORM_TEMPLATE } from './defaults.ts'
import { loadRecommendedTemplate, seedNovelSkills, seedWritingStyleBuiltins, listWritingStyles, SECTION_TO_FOLDER } from './seed.ts'
import { normalizeTemplatePresetCategory } from './template-fields.ts'
import { asRecord, levelNameOf, normalizeEntityPayload } from './normalize-entity.ts'
import { outlineKindOf } from './outline-labels.ts'

export const NOVEL_DIR = '.dsh-novel'
export const LEGACY_NOVEL_DIR = '.noveel'
export const META_FILE = 'meta.json'

export interface NovelMeta {
  version: 1
  novelId: string
  createdAt: string
}

export interface NovelRecord {
  id: string
  title: string
  description: string | null
  cover: string | null
  category: string
  writing_style_id: string | null
  chapter_count: number
  word_count: number
  blueprint_json: unknown
  outline_draft_md: string | null
  outline_final_md: string | null
  outline_status: string
  created_at: string
  updated_at: string
}

export interface EntityRecord {
  domain: string
  id: string
  name: string | null
  data: unknown
  created_at: string
  updated_at: string
}

export interface SkillRecord {
  id: string
  section: string
  folder: string
  agent_kind: string
  title: string
  body: string
  created_at: string
  updated_at: string
}

function novelRoot(workspacePath: string): string {
  return join(workspacePath, NOVEL_DIR)
}

async function migrateLegacyNovelDir(workspacePath: string): Promise<void> {
  const next = join(workspacePath, NOVEL_DIR)
  const legacy = join(workspacePath, LEGACY_NOVEL_DIR)
  try {
    await access(next)
    return
  } catch {
    // new dir not present
  }
  try {
    await access(legacy)
  } catch {
    return
  }
  await rename(legacy, next)
}

function pgliteDir(workspacePath: string): string {
  return join(novelRoot(workspacePath), 'pglite')
}

function metaPath(workspacePath: string): string {
  return join(novelRoot(workspacePath), META_FILE)
}

/** Return whether a workspace directory has been provisioned as a novel. */
export async function isNovelWorkspace(workspacePath: string): Promise<boolean> {
  await migrateLegacyNovelDir(workspacePath)
  try {
    const raw = await readFile(metaPath(workspacePath), 'utf8')
    const parsed = JSON.parse(raw) as { version?: unknown }
    return parsed.version === 1
  } catch {
    return false
  }
}

const connections = new Map<string, Promise<PGlite>>()

async function openDb(workspacePath: string): Promise<PGlite> {
  await migrateLegacyNovelDir(workspacePath)
  const existing = connections.get(workspacePath)
  if (existing !== undefined) return existing
  const pending = (async () => {
    const db = await PGlite.create(pgliteDir(workspacePath))
    await initNovelSchema(db)
    return db
  })()
  connections.set(workspacePath, pending)
  try {
    return await pending
  } catch (cause) {
    connections.delete(workspacePath)
    throw cause
  }
}

/** Initialize `.dsh-novel` + PGlite + default novel row for one workspace directory. */
export async function provisionNovelWorkspace(
  workspacePath: string,
  input: {
    title?: string | undefined
    category?: string | undefined
    writingStyleId?: string | undefined
  } = {},
): Promise<{ meta: NovelMeta, novel: NovelRecord, alreadyInitialized: boolean }> {
  await migrateLegacyNovelDir(workspacePath)
  if (await isNovelWorkspace(workspacePath)) {
    const novel = await getNovel(workspacePath)
    const meta = JSON.parse(await readFile(metaPath(workspacePath), 'utf8')) as NovelMeta
    return { meta, novel, alreadyInitialized: true }
  }
  const novelId = randomUUID().replace(/-/g, '').slice(0, 8)
  const title = input.title?.trim() || basename(workspacePath)
  const category = normalizeTemplatePresetCategory(input.category)
  const createdAt = new Date().toISOString()
  const meta: NovelMeta = { version: 1, novelId, createdAt }
  await mkdir(pgliteDir(workspacePath), { recursive: true })
  await writeFile(metaPath(workspacePath), `${JSON.stringify(meta, null, 2)}\n`)
  const db = await openDb(workspacePath)
  await seedWritingStyleBuiltins(db)
  const writingStyleId = input.writingStyleId?.trim() || null
  const template = (() => {
    try {
      return loadRecommendedTemplate(category)
    } catch {
      return DEFAULT_FORM_TEMPLATE
    }
  })()
  await db.query(
    `INSERT INTO novels (id, title, category, writing_style_id) VALUES ($1, $2, $3, $4)`,
    [novelId, title, category, writingStyleId],
  )
  await db.query(
    `INSERT INTO form_templates (id, novel_id, config) VALUES ($1, $2, $3::jsonb)`,
    [randomUUID(), novelId, JSON.stringify(template)],
  )
  await seedNovelSkills(db, category)
  return { meta, novel: await getNovel(workspacePath), alreadyInitialized: false }
}

/** Load the singleton novel row. */
export async function getNovel(workspacePath: string): Promise<NovelRecord> {
  const db = await openDb(workspacePath)
  const { rows } = await db.query<NovelRecord>(`SELECT * FROM novels LIMIT 1`)
  const row = rows[0]
  if (row === undefined) throw new Error('novel row missing; re-provision this workspace')
  return row
}

/** Patch novel metadata / blueprint. */
export async function updateNovel(
  workspacePath: string,
  patch: Partial<Pick<NovelRecord, 'title' | 'description' | 'cover' | 'category' | 'writing_style_id' | 'blueprint_json' | 'outline_draft_md' | 'outline_final_md' | 'outline_status'>>,
): Promise<NovelRecord> {
  const current = await getNovel(workspacePath)
  const next = { ...current, ...patch, updated_at: new Date().toISOString() }
  const db = await openDb(workspacePath)
  await db.query(
    `UPDATE novels SET
      title = $1, description = $2, cover = $3, category = $4, writing_style_id = $5,
      blueprint_json = $6::jsonb, outline_draft_md = $7, outline_final_md = $8,
      outline_status = $9, updated_at = NOW()
     WHERE id = $10`,
    [
      next.title,
      next.description,
      next.cover,
      next.category,
      next.writing_style_id,
      JSON.stringify(next.blueprint_json ?? {}),
      next.outline_draft_md,
      next.outline_final_md,
      next.outline_status,
      current.id,
    ],
  )
  return getNovel(workspacePath)
}

/** List entities in one domain. */
export async function listEntities(workspacePath: string, domain: EntityDomain): Promise<EntityRecord[]> {
  const db = await openDb(workspacePath)
  const { rows } = await db.query<EntityRecord>(
    `SELECT * FROM novel_entities WHERE domain = $1 ORDER BY name NULLS LAST, updated_at DESC`,
    [domain],
  )
  return rows
}

/** Load one entity. */
export async function getEntity(workspacePath: string, id: string): Promise<EntityRecord | undefined> {
  const db = await openDb(workspacePath)
  const { rows } = await db.query<EntityRecord>(`SELECT * FROM novel_entities WHERE id = $1`, [id])
  return rows[0]
}

async function lookupsFor(workspacePath: string, domain: EntityDomain, entityId: string) {
  const worldIdByName = new Map<string, string>()
  const roleIdByRef = new Map<string, string>()
  const outlineIdByName = new Map<string, string>()
  const outlineChapterIdByName = new Map<string, string>()
  if (domain === 'world') {
    for (const row of await listEntities(workspacePath, 'world')) {
      if (row.id === entityId) continue
      if (typeof row.name === 'string' && row.name.length > 0) worldIdByName.set(row.name, row.id)
    }
  }
  if (domain === 'roleRelation') {
    for (const row of await listEntities(workspacePath, 'role')) {
      roleIdByRef.set(row.id, row.id)
      if (typeof row.name === 'string' && row.name.length > 0) roleIdByRef.set(row.name, row.id)
    }
  }
  if (domain === 'outline' || domain === 'chapter') {
    const rows = await listEntities(workspacePath, 'outline')
    for (const row of rows) {
      if (row.id === entityId) continue
      if (typeof row.name !== 'string' || row.name.length === 0) continue
      outlineIdByName.set(row.name, row.id)
      if (outlineKindOf(asRecord(row.data)) === 'chapter_segment') {
        outlineChapterIdByName.set(row.name, row.id)
      }
    }
    for (const row of rows) {
      if (row.id === entityId) continue
      if (typeof row.name !== 'string' || row.name.length === 0) continue
      if (outlineKindOf(asRecord(row.data)) === 'volume') outlineIdByName.set(row.name, row.id)
    }
  }
  return { worldIdByName, roleIdByRef, outlineIdByName, outlineChapterIdByName }
}

/** Insert or replace an entity. */
export async function upsertEntity(
  workspacePath: string,
  domain: EntityDomain,
  data: Record<string, unknown>,
  id?: string,
): Promise<EntityRecord> {
  if (!isEntityDomain(domain)) throw new Error(`unknown domain ${domain}`)
  const entityId = id ?? (typeof data.id === 'string' && data.id.length > 0 ? data.id : randomUUID())
  const normalized = normalizeEntityPayload(domain, data, await lookupsFor(workspacePath, domain, entityId))
  const name = typeof normalized.name === 'string'
    ? normalized.name
    : typeof normalized.title === 'string'
      ? normalized.title
      : levelNameOf(normalized) ?? null
  const db = await openDb(workspacePath)
  await db.query(
    `INSERT INTO novel_entities (domain, id, name, data)
     VALUES ($1, $2, $3, $4::jsonb)
     ON CONFLICT (id) DO UPDATE SET
       domain = EXCLUDED.domain,
       name = EXCLUDED.name,
       data = EXCLUDED.data,
       updated_at = NOW()`,
    [domain, entityId, name, JSON.stringify({ ...normalized, id: entityId })],
  )
  const row = await getEntity(workspacePath, entityId)
  if (row === undefined) throw new Error('entity upsert failed')
  return row
}

/** Delete one entity. */
export async function deleteEntity(workspacePath: string, id: string): Promise<boolean> {
  const db = await openDb(workspacePath)
  const { rows } = await db.query<{ id: string }>(`DELETE FROM novel_entities WHERE id = $1 RETURNING id`, [id])
  return rows.length > 0
}

/** Form template JSON for the workspace novel. */
export async function getTemplate(workspacePath: string): Promise<unknown> {
  const db = await openDb(workspacePath)
  const { rows } = await db.query<{ config: unknown }>(`SELECT config FROM form_templates LIMIT 1`)
  return rows[0]?.config ?? DEFAULT_FORM_TEMPLATE
}

/** Replace the form template. */
export async function saveTemplate(workspacePath: string, config: unknown): Promise<unknown> {
  const novel = await getNovel(workspacePath)
  const db = await openDb(workspacePath)
  await db.query(
    `INSERT INTO form_templates (id, novel_id, config) VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (novel_id) DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
    [randomUUID(), novel.id, JSON.stringify(config)],
  )
  return getTemplate(workspacePath)
}

/** List writing skills. */
export async function listSkills(workspacePath: string): Promise<SkillRecord[]> {
  const db = await openDb(workspacePath)
  const { rows } = await db.query<SkillRecord>(
    `SELECT * FROM novel_skills
     WHERE folder <> '题材' AND folder NOT LIKE '题材/%'
     ORDER BY folder, title`,
  )
  return rows
}

/** Create or update a skill. */
export async function upsertSkill(
  workspacePath: string,
  skill: { id?: string | undefined, section: string, folder?: string | undefined, agentKind?: string | undefined, title: string, body: string },
): Promise<SkillRecord> {
  const id = skill.id ?? randomUUID()
  const folder = skill.folder ?? SECTION_TO_FOLDER[skill.section] ?? '其他'
  const db = await openDb(workspacePath)
  await db.query(
    `INSERT INTO novel_skills (id, section, folder, agent_kind, title, body)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO UPDATE SET
       section = EXCLUDED.section,
       folder = EXCLUDED.folder,
       agent_kind = EXCLUDED.agent_kind,
       title = EXCLUDED.title,
       body = EXCLUDED.body,
       updated_at = NOW()`,
    [id, skill.section, folder, skill.agentKind ?? 'write', skill.title, skill.body],
  )
  const { rows } = await db.query<SkillRecord>(`SELECT * FROM novel_skills WHERE id = $1`, [id])
  const row = rows[0]
  if (row === undefined) throw new Error('skill upsert failed')
  return row
}

/** Delete a skill. */
export async function deleteSkill(workspacePath: string, id: string): Promise<boolean> {
  const db = await openDb(workspacePath)
  const { rows } = await db.query<{ id: string }>(`DELETE FROM novel_skills WHERE id = $1 RETURNING id`, [id])
  return rows.length > 0
}

/** Static write contract for tools. Book-specific field keys still come from get_template. */
export function describeSchema(): {
  domains: typeof ENTITY_DOMAINS
  notes: string
  write: Record<string, string>
} {
  return {
    domains: ENTITY_DOMAINS,
    notes: 'One DSH workspace is one novel. overview lives on novels.blueprint_json. Call get_template for this book\'s field keys, then write those keys at the top level (not nested under profile).',
    write: {
      overview: 'update_novel blueprint_json; keys from get_template overview.fields (genre, tone, coreConflict, …).',
      world: 'name, kind, parentId or parentName (resolved to parentId), geography/culture/history/factions at top level.',
      role: 'name plus get_template role.detailFields keys at top level; faction must match an existing world name.',
      roleRelation: 'one directed edge: roleId/targetRoleId or from/to names, relationType, content. UI shows the edge on both people; do not duplicate a reverse row.',
      level: 'system.name and system.levels[] (name, promotionCondition, abilities, subLevels). Entity name = system.name.',
      item: 'name plus get_template item.detailFields keys at top level.',
      creature: 'name plus get_template creature.detailFields keys at top level.',
      timeline: 'title, content, timeLabel, timePoint, eventType; optional isResolved / relatedChapterNo.',
      outline: 'identity: ordinal + name (UI shows 第N卷/章 + name). Volume = no parent; chapter = parentId or parentName. Optional theme/conflict/majorEvents/content at top level (or extra, which is hoisted). Do not put 第N卷/章 into name. No volumeNo/chapterNo.',
      chapter: 'identity: ordinal + name (UI shows 第N章 + name; chapterNo is an alias for ordinal). Optional content (body) and relatedOutlineId or relatedOutlineName.',
    },
  }
}

export { ENTITY_DOMAINS, isEntityDomain }

export async function listWorkspaceWritingStyles(
  workspacePath: string,
): Promise<Array<{ id: string, name: string, slug: string }>> {
  const db = await openDb(workspacePath)
  await seedWritingStyleBuiltins(db)
  return listWritingStyles(db)
}
