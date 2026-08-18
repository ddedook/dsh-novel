import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { describeSchema, getNovel, getTemplate, isNovelWorkspace, listEntities, listSkills, listWorkspaceWritingStyles, provisionNovelWorkspace, upsertEntity } from '../src/novel/store.ts'
import { asRecord } from '../src/novel/normalize-entity.ts'

describe('novel workspace store', () => {
  it('provisions an independent pglite database and entity tables', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-novel-'))
    try {
      expect(await isNovelWorkspace(dir)).toBe(false)
      const { novel, alreadyInitialized } = await provisionNovelWorkspace(dir, { title: '试作', category: '玄幻' })
      expect(alreadyInitialized).toBe(false)
      expect(novel.title).toBe('试作')
      expect(novel.category).toBe('玄幻')
      const template = await getTemplate(dir)
      const overview = (template as { overview?: { fields?: unknown[] } }).overview
      expect((overview?.fields?.length ?? 0)).toBeGreaterThan(3)
      const skills = await listSkills(dir)
      expect(skills.length).toBeGreaterThan(3)
      expect(skills.some(skill => skill.folder === '概述')).toBe(true)
      expect(skills.some(skill => skill.folder === '题材' || skill.folder.startsWith('题材/'))).toBe(false)
      const styles = await listWorkspaceWritingStyles(dir)
      expect(styles.length).toBeGreaterThan(0)
      expect(await isNovelWorkspace(dir)).toBe(true)
      expect(existsSync(join(dir, '.dsh-novel', 'meta.json'))).toBe(true)
      expect(existsSync(join(dir, '.noveel'))).toBe(false)
      expect((await getNovel(dir)).id).toBe(novel.id)
      await upsertEntity(dir, 'role', { name: '林远' })
      const roles = await listEntities(dir, 'role')
      expect(roles).toHaveLength(1)
      expect(roles[0]?.name).toBe('林远')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('renames a legacy .noveel directory to .dsh-novel', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-novel-legacy-'))
    try {
      const legacy = join(dir, '.noveel')
      await mkdir(legacy)
      await writeFile(join(legacy, 'meta.json'), `${JSON.stringify({ version: 1, novelId: 'legacy01', createdAt: '2026-01-01T00:00:00.000Z' }, null, 2)}\n`)
      expect(await isNovelWorkspace(dir)).toBe(true)
      expect(existsSync(join(dir, '.dsh-novel', 'meta.json'))).toBe(true)
      expect(existsSync(join(dir, '.noveel'))).toBe(false)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('normalizes profile, world parentName, level name, and relation ends', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-novel-norm-'))
    try {
      await provisionNovelWorkspace(dir, { title: '试作', category: '玄幻' })
      expect(describeSchema().write.world).toContain('parentName')

      const galaxy = await upsertEntity(dir, 'world', {
        name: '银河系太阳系',
        kind: 'galaxy',
        profile: { geography: '太阳系为核心' },
      })
      expect(asRecord(galaxy.data).geography).toBe('太阳系为核心')

      const planet = await upsertEntity(dir, 'world', {
        name: '蓝星',
        kind: 'planet',
        parentName: '银河系太阳系',
        profile: { culture: '联邦制' },
      })
      const planetData = asRecord(planet.data)
      expect(planetData.parentId).toBe(galaxy.id)
      expect(planetData.parentName).toBeUndefined()
      expect(planetData.culture).toBe('联邦制')

      await expect(upsertEntity(dir, 'world', {
        name: '错挂',
        kind: 'planet',
        parentName: '不存在的父节点',
      })).rejects.toThrow(/world parent not found/)

      const level = await upsertEntity(dir, 'level', {
        system: { name: '修真境界', levels: [{ name: '炼气', abilities: '御气' }] },
      })
      expect(level.name).toBe('修真境界')

      const hero = await upsertEntity(dir, 'role', { name: '秦川', occupation: '富二代' })
      const father = await upsertEntity(dir, 'role', { name: '秦父', occupation: '议员' })
      const rel = await upsertEntity(dir, 'roleRelation', {
        from: '秦川',
        to: '秦父',
        relationType: '亲属',
        content: '父子',
      })
      const relData = asRecord(rel.data)
      expect(relData.roleId).toBe(hero.id)
      expect(relData.targetRoleId).toBe(father.id)
      expect(await listEntities(dir, 'roleRelation')).toHaveLength(1)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('normalizes outline volume/chapter identity and chapterNo on body chapters', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-novel-outline-'))
    try {
      await provisionNovelWorkspace(dir, { title: '试作', category: '玄幻' })
      expect(describeSchema().write.outline).toContain('ordinal')
      expect(describeSchema().write.chapter).toContain('ordinal')

      const volume = await upsertEntity(dir, 'outline', { ordinal: 1, name: '骑士' })
      const volumeData = asRecord(volume.data)
      expect(volume.name).toBe('骑士')
      expect(volumeData.kind).toBe('volume')
      expect(volumeData.ordinal).toBe(1)
      expect(volumeData.parentName).toBeUndefined()

      const segment = await upsertEntity(dir, 'outline', {
        ordinal: '2',
        name: '灭门夜',
        parentName: '骑士',
      })
      const segmentData = asRecord(segment.data)
      expect(segmentData.kind).toBe('chapter_segment')
      expect(segmentData.ordinal).toBe(2)
      expect(segmentData.parentId).toBe(volume.id)
      expect(segmentData.parentName).toBeUndefined()

      const chapter = await upsertEntity(dir, 'chapter', {
        chapterNo: 1,
        name: '灭门夜',
        relatedOutlineName: '灭门夜',
        content: '正文',
      })
      const chapterData = asRecord(chapter.data)
      expect(chapter.name).toBe('灭门夜')
      expect(chapterData.ordinal).toBe(1)
      expect(chapterData.chapterNo).toBeUndefined()
      expect(chapterData.relatedOutlineId).toBe(segment.id)
      expect(chapterData.relatedOutlineName).toBeUndefined()

      const prefixed = await upsertEntity(dir, 'chapter', {
        ordinal: 2,
        name: '第1章 灭门夜',
      })
      expect(prefixed.name).toBe('灭门夜')
      expect(asRecord(prefixed.data).name).toBe('灭门夜')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
