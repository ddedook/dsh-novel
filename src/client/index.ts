import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { NovelWorkspaceView } from './NovelWorkspaceView.tsx'
import { installNovelStyles } from './styles.ts'

export const inject = ['slots', 'sessions']

export function apply(ctx: Context): void {
  ctx.effect(
    () => installNovelStyles(),
    'dsh-novel: content tab styles',
  )
  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view',
    id: 'novel',
    order: 20,
    label: () => '内容',
  }, NovelWorkspaceView))
}
