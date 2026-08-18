export const WORLD_KINDS = [
  { value: 'universe', label: '宇宙' },
  { value: 'multiverse', label: '多元宇宙' },
  { value: 'galaxy', label: '星系' },
  { value: 'realm', label: '界域' },
  { value: 'domain', label: '域' },
  { value: 'plane', label: '位面' },
  { value: 'planet', label: '星球' },
  { value: 'continent', label: '大陆' },
  { value: 'mainland', label: '大陆' },
  { value: 'region', label: '地区' },
  { value: 'mountain', label: '山脉' },
  { value: 'secret_realm', label: '秘境/禁地' },
  { value: 'country', label: '国家' },
  { value: 'empire', label: '帝国' },
  { value: 'kingdom', label: '王国' },
  { value: 'city', label: '城市' },
  { value: 'town', label: '城镇' },
  { value: 'settlement', label: '聚落' },
  { value: 'faction', label: '势力' },
  { value: 'sect', label: '宗门/门派' },
  { value: 'clan', label: '家族/氏族' },
  { value: 'guild', label: '公会' },
  { value: 'army', label: '军队' },
  { value: 'corporation', label: '公司/集团' },
  { value: 'alliance', label: '联盟' },
  { value: 'cult', label: '教派' },
  { value: 'academy', label: '学院' },
  { value: 'custom', label: '其他' },
] as const

export function emptyLevelSystem() {
  return {
    name: '自定义体系',
    category: '自定义',
    description: '',
    levels: [
      {
        name: '第一阶',
        subLevels: [{ name: '初期' }, { name: '中期' }, { name: '后期' }],
        promotionCondition: '达到上一阶大圆满，并满足作品内设定的突破条件。',
        abilities: '待补充该等级典型能力与表现。',
      },
    ],
  }
}
