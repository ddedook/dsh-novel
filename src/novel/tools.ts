import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-system-prompt'
import { ENTITY_DOMAINS, isEntityDomain } from './domains.ts'
import { registerNovelSkills } from './host-skills.ts'
import {
  deleteEntity,
  deleteSkill,
  describeSchema,
  getEntity,
  getNovel,
  getTemplate,
  isNovelWorkspace,
  listEntities,
  listSkills,
  listWorkspaceWritingStyles,
  provisionNovelWorkspace,
  saveTemplate,
  updateNovel,
  upsertEntity,
  upsertSkill,
} from './store.ts'

import type { JsonValue } from '@deepseek-ai/dsh-util-values'

function jsonText(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

function asJson(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue
}

function workspaceFrom(
  args: { workspace_path?: string },
  exec: { agent?: { session?: { header?: { cwd?: string } } } },
): string {
  const path = args.workspace_path ?? exec.agent?.session?.header?.cwd
  if (typeof path !== 'string' || path.length === 0) {
    throw new Error('workspace_path is required (or the session must have a cwd)')
  }
  return path
}

function jsonOutput() {
  return {
    schema: { type: 'json' as const },
    render: (_args: unknown, value: JsonValue) => [{ type: 'text' as const, text: jsonText(value) }],
  }
}

/** Register novel CRUD tools, DSH skills, and a system-prompt context dump. */
export function registerNovelHost(ctx: Context): void {
  registerNovelSkills(ctx)

  ctx.tools.register(defineTool({
    name: 'novel_status',
    description: 'Check whether the current workspace is a novel workspace (.dsh-novel).',
    parameters: {
      workspace_path: { type: 'string', description: 'Workspace directory; defaults to session cwd' },
    },
    output: jsonOutput(),
    async execute(args, exec) {
      const path = workspaceFrom(args, exec)
      return asJson({ path, novel: await isNovelWorkspace(path) })
    },
  }))

  ctx.tools.register(defineTool({
    name: 'novel_create',
    description: 'Initialize the current directory as a novel workspace. If it already is one, returns alreadyInitialized and does not change title or category.',
    parameters: {
      workspace_path: { type: 'string', description: 'Workspace directory; defaults to session cwd' },
      title: { type: 'string', description: 'Novel title' },
      category: { type: 'string', description: 'Genre such as 玄幻' },
    },
    output: jsonOutput(),
    async execute(args, exec) {
      const path = workspaceFrom(args, exec)
      const result = await provisionNovelWorkspace(path, {
        title: args.title,
        category: args.category,
      })
      if (!result.alreadyInitialized) {
        const registry = ctx.get('workspaceRegistry') as
          | { create?: (workspacePath: string, title?: string) => Promise<unknown> }
          | undefined
        try {
          await registry?.create?.(path, result.novel.title)
        } catch {
          // Official UI may already own this path.
        }
      }
      return asJson(result)
    },
  }))

  ctx.tools.register(defineTool({
    name: 'get_novel',
    description: 'Read the current novel metadata and blueprint (overview).',
    parameters: {
      workspace_path: { type: 'string' },
    },
    output: jsonOutput(),
    async execute(args, exec) {
      return asJson(await getNovel(workspaceFrom(args, exec)))
    },
  }))

  ctx.tools.register(defineTool({
    name: 'update_novel',
    description: 'Update novel title, category, description, or blueprint_json overview.',
    parameters: {
      workspace_path: { type: 'string' },
      title: { type: 'string' },
      category: { type: 'string' },
      description: { type: 'string' },
      blueprint_json: { type: 'string', description: 'JSON object string for the overview blueprint' },
    },
    output: jsonOutput(),
    async execute(args, exec) {
      const path = workspaceFrom(args, exec)
      const patch: Record<string, unknown> = {}
      if (args.title !== undefined) patch.title = args.title
      if (args.category !== undefined) patch.category = args.category
      if (args.description !== undefined) patch.description = args.description
      if (args.blueprint_json !== undefined) patch.blueprint_json = JSON.parse(args.blueprint_json)
      return asJson(await updateNovel(path, patch as Parameters<typeof updateNovel>[1]))
    },
  }))

  ctx.tools.register(defineTool({
    name: 'describe_schema',
    description: 'Describe novel entity domains available in this workspace.',
    parameters: {},
    output: jsonOutput(),
    async execute() {
      return asJson(describeSchema())
    },
  }))

  ctx.tools.register(defineTool({
    name: 'query_entities',
    description: `List entities in a domain (${ENTITY_DOMAINS.join(', ')}).`,
    parameters: {
      workspace_path: { type: 'string' },
      domain: { type: 'string', required: true },
    },
    output: jsonOutput(),
    async execute(args, exec) {
      const domain = args.domain
      if (!isEntityDomain(domain)) throw new Error(`unknown domain ${domain}`)
      return asJson({ items: await listEntities(workspaceFrom(args, exec), domain) })
    },
  }))

  ctx.tools.register(defineTool({
    name: 'get_entities',
    description: 'Load one entity by id.',
    parameters: {
      workspace_path: { type: 'string' },
      id: { type: 'string', required: true },
    },
    output: jsonOutput(),
    async execute(args, exec) {
      return asJson(await getEntity(workspaceFrom(args, exec), args.id) ?? { missing: true })
    },
  }))

  ctx.tools.register(defineTool({
    name: 'mutate_entities',
    description: 'Create or update an entity. Pass domain and a JSON object string as data.',
    parameters: {
      workspace_path: { type: 'string' },
      domain: { type: 'string', required: true },
      data: { type: 'string', required: true, description: 'JSON object, typically including name' },
      id: { type: 'string' },
    },
    output: jsonOutput(),
    async execute(args, exec) {
      if (!isEntityDomain(args.domain)) throw new Error(`unknown domain ${args.domain}`)
      const data = JSON.parse(args.data) as Record<string, unknown>
      return asJson(await upsertEntity(workspaceFrom(args, exec), args.domain, data, args.id))
    },
  }))

  ctx.tools.register(defineTool({
    name: 'delete_entity',
    description: 'Delete one entity by id.',
    parameters: {
      workspace_path: { type: 'string' },
      id: { type: 'string', required: true },
    },
    output: jsonOutput(),
    async execute(args, exec) {
      return asJson({ deleted: await deleteEntity(workspaceFrom(args, exec), args.id) })
    },
  }))

  ctx.tools.register(defineTool({
    name: 'skill_list',
    description: 'List writing/review skills for the current novel (per-file rows in the database).',
    parameters: {
      workspace_path: { type: 'string' },
    },
    output: jsonOutput(),
    async execute(args, exec) {
      return asJson({ items: await listSkills(workspaceFrom(args, exec)) })
    },
  }))

  ctx.tools.register(defineTool({
    name: 'upsert_skill',
    description: 'Create or update one skill row in this novel. Changes the book skill table; do not overwrite the whole catalog without asking.',
    parameters: {
      workspace_path: { type: 'string' },
      id: { type: 'string' },
      section: { type: 'string', required: true },
      folder: { type: 'string', description: 'Chinese folder path such as 概述' },
      agentKind: { type: 'string' },
      title: { type: 'string', required: true },
      body: { type: 'string', required: true },
    },
    output: jsonOutput(),
    async execute(args, exec) {
      return asJson(await upsertSkill(workspaceFrom(args, exec), {
        id: args.id,
        section: args.section,
        folder: args.folder,
        agentKind: args.agentKind,
        title: args.title,
        body: args.body,
      }))
    },
  }))

  ctx.tools.register(defineTool({
    name: 'delete_skill',
    description: 'Delete one skill row by id. Destructive; confirm with the user first.',
    parameters: {
      workspace_path: { type: 'string' },
      id: { type: 'string', required: true },
    },
    output: jsonOutput(),
    async execute(args, exec) {
      return asJson({ deleted: await deleteSkill(workspaceFrom(args, exec), args.id) })
    },
  }))

  ctx.tools.register(defineTool({
    name: 'get_template',
    description: 'Read the form template JSON used to render field labels for this novel.',
    parameters: {
      workspace_path: { type: 'string' },
    },
    output: jsonOutput(),
    async execute(args, exec) {
      return asJson(await getTemplate(workspaceFrom(args, exec)))
    },
  }))

  ctx.tools.register(defineTool({
    name: 'save_template',
    description: 'Replace the entire form template JSON for this novel. Destructive; do not overwrite the whole template without asking.',
    parameters: {
      workspace_path: { type: 'string' },
      config: { type: 'string', required: true, description: 'JSON object string for form_templates.config' },
    },
    output: jsonOutput(),
    async execute(args, exec) {
      return asJson(await saveTemplate(workspaceFrom(args, exec), JSON.parse(args.config)))
    },
  }))

  ctx.tools.register(defineTool({
    name: 'list_writing_styles',
    description: 'List writing styles available in this novel workspace.',
    parameters: {
      workspace_path: { type: 'string' },
    },
    output: jsonOutput(),
    async execute(args, exec) {
      return asJson({ items: await listWorkspaceWritingStyles(workspaceFrom(args, exec)) })
    },
  }))

  ctx.effect(
    () => ctx.systemPrompt.section({
      name: 'novel-authoring',
      order: 80,
      text: [
        'You are helping write a novel bound to the current DSH workspace.',
        'One workspace directory is one novel, stored in `.dsh-novel/pglite`.',
        'To create a novel workspace and write setting (overview/world/roles/levels), use /novel-create. Do not write outline or chapters in that command.',
        'To write the outline, the user must invoke /novel-outline. To write chapters, /novel-chapter.',
        'Before writing a section, load the matching skill novel-overview, novel-world, novel-role, novel-creature, novel-item, novel-level, novel-timeline, novel-outline, novel-chapter, or novel-review; or call skill_list for a single file.',
        'Call get_template and write template keys at the top level of mutate_entities data (not nested under profile). World children use parentName; relations use from/to names or roleId/targetRoleId.',
        'Use get_novel, query_entities, mutate_entities, and update_novel to read and write canon.',
        'Prefer existing names; do not invent duplicate characters.',
      ].join('\n'),
    }),
    'dsh-plugin-novel: system prompt section',
  )

  ctx.effect(
    () => ctx.systemPrompt.context({
      name: 'novel-snapshot',
      order: 80,
      text: () => 'Novel data is in the workspace `.dsh-novel` database. Call get_novel and query_entities before writing.',
    }),
    'dsh-plugin-novel: system prompt context',
  )
}
