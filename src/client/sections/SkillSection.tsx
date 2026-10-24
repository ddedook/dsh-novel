import { useCallback, useEffect, useMemo, useState } from 'react'
import { MarkdownText, type MarkdownLabels } from '@deepseek-ai/dsh-client-ui-primitives'

const MARKDOWN_LABELS: MarkdownLabels = {
  code: { copyLabel: '复制', copiedLabel: '已复制' },
  footnotes: '脚注',
}
import { novelApi } from '../novel-api.ts'
import { EntitySidebar } from '../ui/EntitySidebar.tsx'
import { emptyHint, useLiveReload } from '../ui/live-reload.ts'
import type { EntityItem } from '../entity-client.ts'

interface SkillItem {
  id: string
  section: string
  folder?: string
  agent_kind?: string
  title: string
  body: string
}

export function SkillSection({ path }: { path: string }) {
  const [skills, setSkills] = useState<SkillItem[]>([])
  const [selectedId, setSelectedId] = useState<string | undefined>()
  const selected = skills.find(item => item.id === selectedId)

  const reload = useCallback(async () => {
    const rows = await novelApi<SkillItem[]>(`/skills?path=${encodeURIComponent(path)}`)
    setSkills(rows)
    setSelectedId(current => (current !== undefined && rows.some(row => row.id === current) ? current : undefined))
  }, [path])
  useEffect(() => { void reload() }, [reload])
  useLiveReload(reload)

  const items = useMemo(() => skillTreeItems(skills), [skills])

  return (
    <>
      <EntitySidebar
        className="dshNovelSkillTree"
        files
        tree
        items={items}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
      <section className="dshNovelViewForm">
        {selected === undefined ? (
          <div className="dshNovelViewFormBody">
            <div className="dshNovelViewEmpty">
              <p className="dshNovelViewMuted">{skills.length === 0 ? emptyHint() : '选择一份技能阅读。'}</p>
            </div>
          </div>
        ) : (
          <div className="dshNovelViewFormBody">
            <article className="dshNovelDoc">
              <p className="dshNovelCrumb">{crumbOf(selected)}</p>
              <div className="dshNovelMarkdown">
                <MarkdownText text={selected.body} labels={MARKDOWN_LABELS} />
              </div>
            </article>
          </div>
        )}
      </section>
    </>
  )
}

function crumbOf(skill: SkillItem): string {
  const folder = (skill.folder ?? '').trim()
  return folder.length === 0 ? skill.title : `${folder.replaceAll('/', ' / ')} / ${skill.title}`
}

function skillTreeItems(skills: SkillItem[]): EntityItem[] {
  const folders = new Set<string>()
  for (const skill of skills) {
    const parts = (skill.folder ?? '').split('/').filter(Boolean)
    let acc = ''
    for (const part of parts) {
      acc = acc.length === 0 ? part : `${acc}/${part}`
      folders.add(acc)
    }
  }
  const nodes: EntityItem[] = []
  for (const folder of [...folders].sort()) {
    const parts = folder.split('/')
    const parent = parts.slice(0, -1).join('/')
    nodes.push({
      id: `dir:${folder}`,
      name: parts[parts.length - 1] ?? folder,
      data: { kind: 'folder', parentId: parent.length > 0 ? `dir:${parent}` : '' },
    })
  }
  for (const skill of skills) {
    const folder = (skill.folder ?? '').trim()
    nodes.push({
      id: skill.id,
      name: skill.title,
      data: { kind: 'file', parentId: folder.length > 0 ? `dir:${folder}` : '' },
    })
  }
  return nodes
}
