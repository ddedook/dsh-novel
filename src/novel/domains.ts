/** Entity domains aligned with Noveel registry names. */
export const ENTITY_DOMAINS = [
  'role',
  'roleRelation',
  'roleTimeline',
  'creature',
  'creatureTimeline',
  'item',
  'itemTimeline',
  'level',
  'world',
  'worldTimeline',
  'timeline',
  'outline',
  'chapter',
] as const

export type EntityDomain = (typeof ENTITY_DOMAINS)[number]

export const DOMAIN_LABELS: Record<EntityDomain | 'overview' | 'skill' | 'info', string> = {
  info: '基本信息',
  overview: '概述',
  world: '世界',
  role: '人物',
  creature: '生物',
  item: '物品',
  level: '等级',
  timeline: '时间线',
  outline: '大纲',
  chapter: '章节',
  skill: '技能',
  roleRelation: '人物关系',
  roleTimeline: '人物时间线',
  creatureTimeline: '生物时间线',
  itemTimeline: '物品时间线',
  worldTimeline: '世界时间线',
}

/** Conversation「内容」Tab 内的竖向分区；基本信息并入概述。模板为内置，不展示。 */
export const CONTENT_SECTIONS = [
  'overview',
  'world',
  'role',
  'creature',
  'item',
  'level',
  'timeline',
  'outline',
  'chapter',
  'skill',
] as const

export type ContentSection = (typeof CONTENT_SECTIONS)[number]

export const TREE_SECTIONS = new Set<ContentSection>(['world', 'outline'])

export const LIST_SECTIONS = new Set<ContentSection>([
  'world', 'role', 'creature', 'item', 'level', 'timeline', 'outline', 'chapter', 'skill',
])

export const PANEL_TABS = CONTENT_SECTIONS

export type PanelTab = ContentSection

export function isEntityDomain(value: string): value is EntityDomain {
  return (ENTITY_DOMAINS as readonly string[]).includes(value)
}
