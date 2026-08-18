/** Minimal form template so a new workspace is immediately writable. */
export const DEFAULT_FORM_TEMPLATE = {
  version: 1,
  overview: {
    fields: [
      { key: 'genre', label: '小说类型', component: 'text' },
      { key: 'tone', label: '基调', component: 'text' },
      { key: 'coreConflict', label: '核心冲突', component: 'textarea' },
      { key: 'logline', label: '一句话故事', component: 'textarea' },
    ],
  },
  role: { detailFields: [{ key: 'summary', label: '简介', component: 'textarea' }] },
  creature: { detailFields: [{ key: 'summary', label: '简介', component: 'textarea' }] },
  item: { detailFields: [{ key: 'summary', label: '简介', component: 'textarea' }] },
  level: { detailFields: [{ key: 'summary', label: '体系说明', component: 'textarea' }] },
  world: { detailFields: [{ key: 'summary', label: '说明', component: 'textarea' }] },
  timeline: { detailFields: [{ key: 'content', label: '内容', component: 'textarea' }] },
  outline: { detailFields: [{ key: 'summary', label: '说明', component: 'textarea' }] },
}

export const DEFAULT_SKILLS = [
  {
    section: 'overview',
    agentKind: 'write',
    title: '写设定',
    body: '根据用户意图更新概述蓝图，保持与已有世界/人物一致。',
  },
  {
    section: 'chapters',
    agentKind: 'write',
    title: '写章节',
    body: '按大纲写正文，不要改动未点名的设定。写完后用 mutate 工具落库 chapter。',
  },
  {
    section: 'chapters',
    agentKind: 'review',
    title: '审章节',
    body: '检查人物口吻、时间线与已有设定是否冲突。',
  },
]
