import { useCallback, useEffect, useState } from 'react'
import type { ConvViewProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import { Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import { CONTENT_SECTIONS, DOMAIN_LABELS, type ContentSection } from '../novel/domains.ts'
import { novelApi } from './novel-api.ts'
import { listEntities, type EntityItem } from './entity-client.ts'
import { SectionIcon } from './section-icons.tsx'
import { OverviewSection } from './sections/OverviewSection.tsx'
import { WorldSection } from './sections/WorldSection.tsx'
import { RoleSection, CreatureSection, ItemSection } from './sections/owned-sections.tsx'
import { LevelSection } from './sections/LevelSection.tsx'
import { TimelineSection } from './sections/TimelineSection.tsx'
import { OutlineSection } from './sections/OutlineSection.tsx'
import { ChapterSection } from './sections/ChapterSection.tsx'
import { SkillSection } from './sections/SkillSection.tsx'
import { useLiveReload } from './ui/live-reload.ts'

const sessionMemory = new Map<string, ContentSection>()

/** Novel workspace occupying the conversation.view tab. Does not switch the active view. */
export function NovelWorkspaceView({ sessionId, useSessions }: ConvViewProps) {
  const workspacePath = useSessions(state => state.byId[sessionId]?.cwd)

  const [section, setSection] = useState<ContentSection>(sessionMemory.get(sessionId) ?? 'overview')
  const [isNovel, setIsNovel] = useState(false)
  const [template, setTemplate] = useState<unknown>()
  const [chapters, setChapters] = useState<EntityItem[]>([])
  const [styles, setStyles] = useState<Array<{ id: string, name: string }>>([])

  useEffect(() => { sessionMemory.set(sessionId, section) }, [section, sessionId])

  const refreshStatus = useCallback(async () => {
    if (workspacePath === undefined) {
      setIsNovel(false)
      return
    }
    const status = await novelApi<{ novel: boolean }>(`/status?path=${encodeURIComponent(workspacePath)}`)
    setIsNovel(status.novel)
    if (!status.novel) return
    const listed = await novelApi<Array<{ id: string, name: string }>>(`/styles?path=${encodeURIComponent(workspacePath)}`).catch(() => [])
    if (listed.length > 0) setStyles(listed)
    setTemplate(await novelApi<unknown>(`/template?path=${encodeURIComponent(workspacePath)}`))
    setChapters(await listEntities(workspacePath, 'chapter'))
  }, [workspacePath])

  useEffect(() => { void refreshStatus() }, [refreshStatus])
  useLiveReload(refreshStatus)

  const pageProps = {
    path: workspacePath ?? '',
    template,
    chapters,
  }

  if (workspacePath === undefined) {
    return (
      <div className="dshNovelView">
        <div className="dshNovelViewEmpty">
          <p>先在左侧打开或新建会话，并绑定工作区目录。</p>
        </div>
      </div>
    )
  }

  if (!isNovel) {
    return (
      <div className="dshNovelView">
        <div className="dshNovelViewEmpty">
          <p>当前目录还不是小说工作区。</p>
          <p className="dshNovelViewMuted">在对话里让 AI 初始化小说工作区。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dshNovelView">
      <nav className="dshNovelViewRail" aria-label="小说分区">
        {CONTENT_SECTIONS.map(key => (
          <Tooltip key={key} label={DOMAIN_LABELS[key]} side="right">
            <button
              type="button"
              className="dshNovelViewRailBtn"
              data-active={section === key || undefined}
              aria-label={DOMAIN_LABELS[key]}
              onClick={() => { setSection(key) }}
            >
              <SectionIcon section={key} />
            </button>
          </Tooltip>
        ))}
      </nav>
      {section === 'overview' && <OverviewSection path={workspacePath} template={template} styles={styles} />}
      {section === 'world' && <WorldSection {...pageProps} />}
      {section === 'role' && <RoleSection {...pageProps} />}
      {section === 'creature' && <CreatureSection {...pageProps} />}
      {section === 'item' && <ItemSection {...pageProps} />}
      {section === 'level' && <LevelSection {...pageProps} />}
      {section === 'timeline' && <TimelineSection {...pageProps} />}
      {section === 'outline' && <OutlineSection {...pageProps} />}
      {section === 'chapter' && <ChapterSection {...pageProps} />}
      {section === 'skill' && <SkillSection path={workspacePath} />}
    </div>
  )
}
