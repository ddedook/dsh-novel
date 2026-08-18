/** DSH Novel capability plugin: workspace PGlite, tools, skills, and HTTP API. */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type {} from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-system-prompt'
import type {} from '@deepseek-ai/dsh-skill'
import { handleNovelApi, NOVEL_API_PREFIX } from './novel/http.ts'
import { registerNovelHost } from './novel/tools.ts'

export const name = 'novel'

export const inject = ['webServer', 'tools', 'systemPrompt', 'skills']

export function apply(ctx: Context): void {
  const rendererOrigin = `http://${ctx.webServer.host}:${String(ctx.webServer.port)}`
  ctx.effect(
    () => ctx.webServer.register({
      kind: 'prefix',
      path: NOVEL_API_PREFIX,
      handler: (req, res) => { void handleNovelApi(req, res, rendererOrigin) },
    }),
    'dsh-novel: JSON API',
  )
  registerNovelHost(ctx)
}
