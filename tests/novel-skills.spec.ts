import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isSkillName } from '@deepseek-ai/dsh-skill'
import {
  MODULE_SKILL_SPECS,
  NOVEL_CREATE_CONTENT,
  NOVEL_CREATE_SKILL_NAME,
  composeModuleSkillBody,
  folderMatchesModule,
  moduleSkillInvocation,
  moduleSkillsFromRows,
} from '../src/novel/host-skills.ts'
import { listSeedSkillRows } from '../src/novel/seed.ts'
import { timelineEventTypeLabel, timelineResolvedLabel } from '../src/novel/timeline-labels.ts'
import { chapterNodeLabel, countChapterChars, outlineNodeLabel, stripLeadingChapterHeading, stripVolumeChapterPrefix } from '../src/novel/outline-labels.ts'
import { listSkills, provisionNovelWorkspace, type SkillRecord } from '../src/novel/store.ts'

describe('novel DSH skills', () => {
  it('uses kebab-case names for slash and module skills', () => {
    expect(isSkillName(NOVEL_CREATE_SKILL_NAME)).toBe(true)
    for (const spec of MODULE_SKILL_SPECS) {
      expect(isSkillName(spec.name)).toBe(true)
    }
  })

  it('keeps review folders off outline/chapter modules', () => {
    expect(folderMatchesModule('大纲', 'novel-outline')).toBe(true)
    expect(folderMatchesModule('审查/大纲', 'novel-outline')).toBe(false)
    expect(folderMatchesModule('审查/大纲', 'novel-review')).toBe(true)
    expect(folderMatchesModule('章节', 'novel-chapter')).toBe(true)
    expect(folderMatchesModule('审查/章节', 'novel-chapter')).toBe(false)
    expect(moduleSkillsFromRows([])).toEqual([])
  })

  it('makes outline and chapter slash-invocable and keeps create off outline writes', () => {
    expect(moduleSkillInvocation('novel-outline').userInvocable).toBe(true)
    expect(moduleSkillInvocation('novel-chapter').userInvocable).toBe(true)
    expect(moduleSkillInvocation('novel-overview').userInvocable).toBe(false)
    expect(NOVEL_CREATE_CONTENT).toContain('/novel-outline')
    expect(NOVEL_CREATE_CONTENT).toContain('/novel-chapter')
    expect(NOVEL_CREATE_CONTENT).toMatch(/禁止/)
    expect(NOVEL_CREATE_CONTENT).not.toMatch(/再进大纲|黄金三章/)
    expect(NOVEL_CREATE_CONTENT).toContain('isResolved')
  })

  it('lists module skills from seed before a workspace is initialized', () => {
    const rows = listSeedSkillRows().map(row => ({
      id: '',
      section: row.section,
      folder: row.folder,
      agent_kind: row.agent_kind,
      title: row.title,
      body: row.body,
      created_at: '',
      updated_at: '',
    }))
    expect(rows.length).toBeGreaterThan(3)
    const names = moduleSkillsFromRows(rows)
    expect(names).toContain('novel-overview')
    expect(names).toContain('novel-world')
    expect(names).toContain('novel-timeline')
    expect(composeModuleSkillBody(rows, 'novel-overview').length).toBeGreaterThan(20)
  })

  it('aggregates provisioned database rows into module skills', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-novel-skills-'))
    try {
      const first = await provisionNovelWorkspace(dir, { title: '试作', category: '玄幻' })
      expect(first.alreadyInitialized).toBe(false)
      const second = await provisionNovelWorkspace(dir, { title: '另一本', category: '都市' })
      expect(second.alreadyInitialized).toBe(true)
      expect(second.novel.id).toBe(first.novel.id)
      expect(second.novel.title).toBe('试作')

      const rows = await listSkills(dir)
      const names = moduleSkillsFromRows(rows)
      expect(names).toContain('novel-overview')
      expect(names).toContain('novel-review')
      const overview = composeModuleSkillBody(rows, 'novel-overview')
      expect(overview.length).toBeGreaterThan(20)
      expect(overview.startsWith('## ')).toBe(true)

      const empty: SkillRecord[] = []
      expect(moduleSkillsFromRows(empty)).toEqual([])
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('labels foreshadow conflict and suspense with resolution state', () => {
    expect(timelineEventTypeLabel('foreshadow')).toBe('伏笔')
    expect(timelineEventTypeLabel('conflict')).toBe('冲突')
    expect(timelineResolvedLabel('foreshadow', false)).toBe('未解决')
    expect(timelineResolvedLabel('suspense', true)).toBe('已解决')
    expect(timelineResolvedLabel('plot', false)).toBeUndefined()
  })

  it('formats outline and chapter identity as 第N卷/章 plus name', () => {
    expect(outlineNodeLabel({ ordinal: 1, name: '骑士', kind: 'volume' }, 'x')).toBe('第1卷 骑士')
    expect(outlineNodeLabel({ ordinal: 2, name: '灭门夜', kind: 'chapter_segment' }, 'x')).toBe('第2章 灭门夜')
    expect(chapterNodeLabel({ ordinal: 1, name: '灭门夜' }, 'x')).toBe('第1章 灭门夜')
    expect(outlineNodeLabel({ name: '骑士' }, 'x')).toBe('骑士')
  })

  it('strips 第N卷/章 prefixes from titles and counts chapter chars without whitespace', () => {
    expect(stripVolumeChapterPrefix('第一章 灭门夜')).toBe('灭门夜')
    expect(stripVolumeChapterPrefix('第1卷 骑士')).toBe('骑士')
    expect(outlineNodeLabel({ ordinal: 1, name: '第一卷 骑士', kind: 'volume' }, 'x')).toBe('第1卷 骑士')
    expect(chapterNodeLabel({ ordinal: 1, name: '第1章 灭门夜' }, 'x')).toBe('第1章 灭门夜')
    expect(countChapterChars('一 二\n三')).toBe(3)
    expect(countChapterChars('')).toBe(0)
    expect(stripLeadingChapterHeading('第1章 灭门夜\n\n正文', '第1章 灭门夜')).toBe('正文')
    expect(stripLeadingChapterHeading('# 第一章 灭门夜\n开场', '第1章 灭门夜')).toBe('开场')
  })
})
