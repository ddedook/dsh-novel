import type { IncomingMessage, ServerResponse } from 'node:http'
import { NOVEL_API_PREFIX } from './contract.ts'
import { ENTITY_DOMAINS, isEntityDomain } from './domains.ts'
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
import { listBuiltinWritingStylePresets } from './seed.ts'

function finish(res: ServerResponse, status: number, body?: unknown): void {
  res.statusCode = status
  if (body === undefined) {
    res.end()
    return
  }
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array))
  }
  if (chunks.length === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
}

function pathOf(req: IncomingMessage): { pathname: string, search: URLSearchParams } {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1')
  return { pathname: url.pathname, search: url.searchParams }
}

function requirePath(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error('path is required')
  return value
}

/** Same-origin JSON API for the novel client and tools. */
export async function handleNovelApi(
  req: IncomingMessage,
  res: ServerResponse,
  expectedOrigin: string,
): Promise<void> {
  if (req.headers.origin !== undefined && req.headers.origin !== expectedOrigin) {
    finish(res, 403)
    return
  }
  try {
    const { pathname, search } = pathOf(req)
    const method = req.method ?? 'GET'
    const rel = pathname.slice(NOVEL_API_PREFIX.length) || '/'

    if (method === 'GET' && rel === '/status') {
      const workspacePath = requirePath(search.get('path'))
      finish(res, 200, { novel: await isNovelWorkspace(workspacePath) })
      return
    }
    if (method === 'POST' && rel === '/provision') {
      const body = await readJson(req) as Record<string, unknown>
      const workspacePath = requirePath(body.path)
      const result = await provisionNovelWorkspace(workspacePath, {
        title: typeof body.title === 'string' ? body.title : undefined,
        category: typeof body.category === 'string' ? body.category : undefined,
        writingStyleId: typeof body.writingStyleId === 'string' ? body.writingStyleId : undefined,
      })
      finish(res, 200, result)
      return
    }
    if (method === 'GET' && rel === '/schema') {
      finish(res, 200, describeSchema())
      return
    }
    if (method === 'GET' && rel === '/novel') {
      const workspacePath = requirePath(search.get('path'))
      finish(res, 200, await getNovel(workspacePath))
      return
    }
    if (method === 'PATCH' && rel === '/novel') {
      const body = await readJson(req) as Record<string, unknown>
      const workspacePath = requirePath(body.path)
      const patch = {
        ...(typeof body.title === 'string' ? { title: body.title } : {}),
        ...(typeof body.description === 'string' ? { description: body.description } : {}),
        ...(typeof body.cover === 'string' ? { cover: body.cover } : {}),
        ...(typeof body.category === 'string' ? { category: body.category } : {}),
        ...(body.writing_style_id === null || typeof body.writing_style_id === 'string'
          ? { writing_style_id: body.writing_style_id as string | null }
          : {}),
        ...(body.blueprint_json !== undefined ? { blueprint_json: body.blueprint_json } : {}),
        ...(typeof body.outline_draft_md === 'string' ? { outline_draft_md: body.outline_draft_md } : {}),
        ...(typeof body.outline_final_md === 'string' ? { outline_final_md: body.outline_final_md } : {}),
        ...(typeof body.outline_status === 'string' ? { outline_status: body.outline_status } : {}),
      }
      finish(res, 200, await updateNovel(workspacePath, patch))
      return
    }
    if (method === 'GET' && rel === '/entities') {
      const workspacePath = requirePath(search.get('path'))
      const domain = search.get('domain') ?? ''
      const id = search.get('id')
      if (id !== null) {
        finish(res, 200, await getEntity(workspacePath, id) ?? null)
        return
      }
      if (!isEntityDomain(domain)) {
        finish(res, 400, { error: `unknown domain; expected one of ${ENTITY_DOMAINS.join(', ')}` })
        return
      }
      finish(res, 200, await listEntities(workspacePath, domain))
      return
    }
    if ((method === 'POST' || method === 'PATCH') && rel === '/entities') {
      const body = await readJson(req) as Record<string, unknown>
      const workspacePath = requirePath(body.path)
      const domain = String(body.domain ?? '')
      if (!isEntityDomain(domain)) throw new Error('unknown domain')
      const data = (body.data ?? {}) as Record<string, unknown>
      const id = typeof body.id === 'string' ? body.id : undefined
      finish(res, 200, await upsertEntity(workspacePath, domain, data, id))
      return
    }
    if (method === 'DELETE' && rel === '/entities') {
      const body = await readJson(req) as Record<string, unknown>
      finish(res, 200, { deleted: await deleteEntity(requirePath(body.path), String(body.id ?? '')) })
      return
    }
    if (method === 'GET' && rel === '/template') {
      finish(res, 200, await getTemplate(requirePath(search.get('path'))))
      return
    }
    if (method === 'PUT' && rel === '/template') {
      const body = await readJson(req) as Record<string, unknown>
      finish(res, 200, await saveTemplate(requirePath(body.path), body.config))
      return
    }
    if (method === 'GET' && rel === '/style-presets') {
      finish(res, 200, listBuiltinWritingStylePresets())
      return
    }
    if (method === 'GET' && rel === '/styles') {
      finish(res, 200, await listWorkspaceWritingStyles(requirePath(search.get('path'))))
      return
    }
    if (method === 'GET' && rel === '/skills') {
      finish(res, 200, await listSkills(requirePath(search.get('path'))))
      return
    }
    if ((method === 'POST' || method === 'PATCH') && rel === '/skills') {
      const body = await readJson(req) as Record<string, unknown>
      finish(res, 200, await upsertSkill(requirePath(body.path), {
        id: typeof body.id === 'string' ? body.id : undefined,
        section: String(body.section ?? 'overview'),
        folder: typeof body.folder === 'string' ? body.folder : undefined,
        agentKind: typeof body.agentKind === 'string' ? body.agentKind : undefined,
        title: String(body.title ?? ''),
        body: String(body.body ?? ''),
      }))
      return
    }
    if (method === 'DELETE' && rel === '/skills') {
      const body = await readJson(req) as Record<string, unknown>
      finish(res, 200, { deleted: await deleteSkill(requirePath(body.path), String(body.id ?? '')) })
      return
    }
    finish(res, 404, { error: 'not found' })
  } catch (cause) {
    finish(res, 400, { error: cause instanceof Error ? cause.message : String(cause) })
  }
}

export { NOVEL_API_PREFIX }
