import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { NovelWorkspaceView } from './NovelWorkspaceView.tsx'
import { installNovelStyles } from './styles.ts'

export const inject = ['slots', 'sessions']

export function apply(ctx: ClientContext): void {
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
