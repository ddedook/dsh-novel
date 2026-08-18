import type { Context } from '@deepseek-ai/cordis'
import {
  BUNDLED_SKILL_RANK,
  type SkillCandidate,
  type SkillDefinition,
  type SkillLookupOptions,
} from '@deepseek-ai/dsh-skill'
import { isNovelWorkspace, listSkills, type SkillRecord } from './store.ts'
import { listSeedSkillRows } from './seed.ts'

export const NOVEL_CREATE_SKILL_NAME = 'novel-create'

export const MODULE_SKILL_SPECS = [
  { name: 'novel-overview', root: '概述', description: '概述与开书：标题、卖点、种子。' },
  { name: 'novel-world', root: '世界', description: '世界规则、势力与伏笔。' },
  { name: 'novel-role', root: '人物', description: '人物档案、塑造与关系。' },
  { name: 'novel-creature', root: '生物', description: '生物与灵植档案。' },
  { name: 'novel-item', root: '物品', description: '物品档案与归属。' },
  { name: 'novel-level', root: '等级', description: '等级、能力与代价。' },
  { name: 'novel-timeline', root: '时间线', description: '事件轴与状态同步。' },
  { name: 'novel-outline', root: '大纲', description: '大纲结构与剧情骨架。' },
  { name: 'novel-chapter', root: '章节', description: '章节节奏、对话与质检。' },
  { name: 'novel-review', root: '审查', description: '大纲与章节审查。' },
] as const

export type ModuleSkillName = (typeof MODULE_SKILL_SPECS)[number]['name']

const PROVIDER = 'dsh-novel'

export const NOVEL_CREATE_CONTENT = [
  '# 创建小说工作区',
  '',
  '对当前会话工作区目录调用工具 `novel_create`（可选 `title`、`category`）。',
  '该工具会写入 `.dsh-novel`、建 PGlite、播种模板与技能。',
  '若已经是小说工作区，工具返回 `alreadyInitialized: true`：告知用户已忽略，**不要**改书名或题材。',
  '',
  '然后只做开书设定（不要写大纲或章节）：',
  '1. 先 `get_template`，按返回的字段 **顶层 key** 写入（不要包在 `profile` 里）。',
  '2. 加载 `novel-overview`，以及按用户素材选用 `novel-world` / `novel-role` / `novel-level` / `novel-item` / `novel-timeline`。',
  '3. 写入概述 blueprint、世界树（先父后子，子节点用 `parentName`）、人物顶层字段、`roleRelation`、等级 `system`。',
  '4. 按素材写入全书 `timeline` 关键事件：`title` + `content` + `timeLabel` + `timePoint` + `eventType`。伏笔/冲突/悬念必须带 `eventType`（`foreshadow` / `conflict` / `suspense`）和 `isResolved`（开书多为 `false`）。',
  '5. **禁止**加载 `novel-outline` / `novel-chapter`，禁止 mutate `outline` 或 `chapter`。',
  '6. 设定写完即停，告诉用户：大纲用 `/novel-outline`，章节用 `/novel-chapter`。',
].join('\n')

export function moduleSkillInvocation(name: ModuleSkillName): { modelInvocable: true, userInvocable: boolean } {
  const userInvocable = name === 'novel-outline' || name === 'novel-chapter'
  return { modelInvocable: true, userInvocable }
}

/** Filter DB skill rows that belong to one DSH module skill. */
export function rowsForModule(rows: SkillRecord[], name: ModuleSkillName): SkillRecord[] {
  return rows.filter(row => folderMatchesModule(row.folder, name))
}

/** Module skills that currently have at least one row. */
export function moduleSkillsFromRows(rows: SkillRecord[]): ModuleSkillName[] {
  return MODULE_SKILL_SPECS
    .filter(spec => rowsForModule(rows, spec.name).length > 0)
    .map(spec => spec.name)
}

export function composeModuleSkillBody(rows: SkillRecord[], name: ModuleSkillName): string {
  const parts = rowsForModule(rows, name)
  return parts.map(row => `## ${row.title}\n\n${row.body}`).join('\n\n')
}

export function folderMatchesModule(folder: string, name: ModuleSkillName): boolean {
  if (name === 'novel-review') return isReviewFolder(folder)
  const spec = MODULE_SKILL_SPECS.find(item => item.name === name)
  if (spec === undefined) return false
  if (isReviewFolder(folder)) return false
  return folder === spec.root || folder.startsWith(`${spec.root}/`)
}

function isReviewFolder(folder: string): boolean {
  return folder === '审查' || folder.startsWith('审查/') || /\/审查(?:\/|$)/u.test(folder)
}

/** Register /novel-create and cwd-scoped module skills from the novel database. */
export function registerNovelSkills(ctx: Context): void {
  ctx.effect(
    () => ctx.skills.register({
      name: NOVEL_CREATE_SKILL_NAME,
      description: '把当前工作区初始化为小说工作区（已初始化则忽略）。',
      whenToUse: '用户要开新书、初始化小说目录，或输入 /novel-create。',
      source: 'bundled',
      content: NOVEL_CREATE_CONTENT,
      invocation: { modelInvocable: true, userInvocable: true },
    }),
    'dsh-plugin-novel: novel-create skill',
  )

  ctx.effect(
    () => ctx.skills.registerProvider(() => ({
      name: PROVIDER,
      async list(options: SkillLookupOptions) {
        const rows = await loadRows(options.cwd)
        return moduleSkillsFromRows(rows).map(name => candidateOf(name))
      },
      async get(candidate: SkillCandidate, options: SkillLookupOptions) {
        const name = asModuleName(candidate.locator)
        if (name === undefined) return undefined
        const content = composeModuleSkillBody(await loadRows(options.cwd), name)
        if (content.length === 0) return undefined
        return definitionOf(name, content)
      },
    })),
    'dsh-plugin-novel: module skill provider',
  )
}

async function loadRows(cwd: string | undefined): Promise<SkillRecord[]> {
  if (typeof cwd === 'string' && cwd.length > 0 && await isNovelWorkspace(cwd)) {
    return listSkills(cwd)
  }
  return listSeedSkillRows().map(row => ({
    id: `seed:${row.folder}/${row.title}`,
    section: row.section,
    folder: row.folder,
    agent_kind: row.agent_kind,
    title: row.title,
    body: row.body,
    created_at: '',
    updated_at: '',
  }))
}

function asModuleName(locator: unknown): ModuleSkillName | undefined {
  if (typeof locator !== 'string') return undefined
  return MODULE_SKILL_SPECS.some(spec => spec.name === locator)
    ? locator as ModuleSkillName
    : undefined
}

function candidateOf(name: ModuleSkillName): SkillCandidate {
  const spec = MODULE_SKILL_SPECS.find(item => item.name === name)!
  return {
    name: spec.name,
    description: spec.description,
    invocation: moduleSkillInvocation(name),
    source: 'bundled',
    provider: PROVIDER,
    rank: BUNDLED_SKILL_RANK,
    locator: spec.name,
  }
}

function definitionOf(name: ModuleSkillName, content: string): SkillDefinition {
  const spec = MODULE_SKILL_SPECS.find(item => item.name === name)!
  return {
    name: spec.name,
    description: spec.description,
    invocation: moduleSkillInvocation(name),
    source: 'bundled',
    provider: PROVIDER,
    content,
  }
}
