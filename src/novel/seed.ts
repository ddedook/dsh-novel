import { createHash, randomUUID } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PGlite } from '@electric-sql/pglite'
import { normalizeTemplatePresetCategory } from './template-fields.ts'

function packageRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url))
  if (basename(here) === 'novel') return join(here, '..', '..')
  return join(here, '..')
}

export function seedTemplatesDir(): string {
  return join(packageRoot(), 'seed', 'templates')
}

export function seedSkillsDir(): string {
  return join(packageRoot(), 'seed', 'skills')
}

export function loadRecommendedTemplate(category?: string | null): unknown {
  const main = normalizeTemplatePresetCategory(category)
  const primary = join(seedTemplatesDir(), `${main}.json`)
  const fallback = join(seedTemplatesDir(), '玄幻.json')
  const path = existsSync(primary) ? primary : fallback
  if (!existsSync(path)) throw new Error(`未找到推荐模板：seed/templates/${main}.json`)
  return JSON.parse(readFileSync(path, 'utf8')) as unknown
}

export function listBuiltinWritingStylePresets(): Array<{ id: string, slug: string, name: string }> {
  const root = join(seedSkillsDir(), 'writing-style')
  if (!existsSync(root)) return []
  const out: Array<{ id: string, slug: string, name: string }> = []
  for (const ent of readdirSync(root, { withFileTypes: true })) {
    if (!ent.isDirectory() || ent.name.startsWith('_')) continue
    const stylePath = join(root, ent.name, 'STYLE.md')
    if (!existsSync(stylePath)) continue
    const metaPath = join(root, ent.name, 'meta.json')
    let name = ent.name
    if (existsSync(metaPath)) {
      try {
        const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as { name?: string }
        if (typeof meta.name === 'string' && meta.name.trim().length > 0) name = meta.name.trim()
      } catch {
        // keep slug
      }
    }
    const id = createHash('sha256').update(`builtin-ws:${ent.name}`).digest('hex').slice(0, 8)
    out.push({ id, slug: ent.name, name })
  }
  return out
}

export async function seedWritingStyleBuiltins(db: PGlite): Promise<void> {
  const root = join(seedSkillsDir(), 'writing-style')
  if (!existsSync(root)) return
  for (const preset of listBuiltinWritingStylePresets()) {
    const content = readFileSync(join(root, preset.slug, 'STYLE.md'), 'utf8')
    const metaPath = join(root, preset.slug, 'meta.json')
    let summary = ''
    if (existsSync(metaPath)) {
      try {
        const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as { summary?: string }
        summary = meta.summary?.trim() ?? ''
      } catch {
        summary = ''
      }
    }
    await db.query(
      `INSERT INTO writing_styles (id, slug, name, summary, content, origin)
       VALUES ($1, $2, $3, $4, $5, 'builtin')
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         summary = EXCLUDED.summary,
         content = EXCLUDED.content,
         updated_at = NOW()`,
      [preset.id, preset.slug, preset.name, summary, content],
    )
  }
}

const DIR_TO_SECTION: Record<string, string> = {
  overview: 'overview',
  role: 'role',
  creature: 'creature',
  level: 'level',
  world: 'world',
  timeline: 'timeline',
  outline: 'outline',
  chapter: 'chapters',
  item: 'item',
}

export const SECTION_TO_FOLDER: Record<string, string> = {
  overview: '概述',
  role: '人物',
  creature: '生物',
  item: '物品',
  level: '等级',
  world: '世界',
  timeline: '时间线',
  outline: '大纲',
  chapter: '章节',
  chapters: '章节',
}

export interface SeedSkillRow {
  section: string
  folder: string
  agent_kind: string
  title: string
  body: string
}

function readMdDir(dir: string, section: string, agentKind: string, folder: string): SeedSkillRow[] {
  if (!existsSync(dir)) return []
  const out: SeedSkillRow[] = []
  for (const file of readdirSync(dir).filter(name => name.endsWith('.md'))) {
    const body = readFileSync(join(dir, file), 'utf8')
    if (body.trim().length === 0) continue
    out.push({ section, folder, agent_kind: agentKind, title: basename(file, '.md'), body })
  }
  return out
}

/** Disk skill markdown used both to seed a workspace and to advertise module skills before init. */
export function listSeedSkillRows(): SeedSkillRow[] {
  const ref = seedSkillsDir()
  const rows: SeedSkillRow[] = []
  for (const [dir, section] of Object.entries(DIR_TO_SECTION)) {
    rows.push(...readMdDir(join(ref, dir), section, 'write', SECTION_TO_FOLDER[dir] ?? dir))
  }
  rows.push(...readMdDir(join(ref, 'review', 'outline'), 'outline', 'review', '审查/大纲'))
  rows.push(...readMdDir(join(ref, 'review', 'chapter'), 'chapters', 'review', '审查/章节'))
  return rows
}

/** Seed generic skill markdown (genre-specific files under seed/skills/genres are not loaded). */
export async function seedNovelSkills(db: PGlite, _category: string): Promise<void> {
  for (const row of listSeedSkillRows()) {
    await db.query(
      `INSERT INTO novel_skills (id, section, folder, agent_kind, title, body)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [randomUUID(), row.section, row.folder, row.agent_kind, row.title, row.body],
    )
  }
}

export async function listWritingStyles(db: PGlite): Promise<Array<{ id: string, name: string, slug: string }>> {
  const { rows } = await db.query<{ id: string, name: string, slug: string }>(
    `SELECT id, name, slug FROM writing_styles ORDER BY origin, name`,
  )
  return rows
}
