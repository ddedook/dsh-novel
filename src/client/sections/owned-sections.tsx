import { ListDetailSection } from './ListDetailSection.tsx'
import type { SectionPageProps } from './types.ts'

export function RoleSection(props: SectionPageProps) {
  return (
    <ListDetailSection
      {...props}
      domain="role"
      templateSection="role"
      tabs={['detail', 'relation', 'timeline']}
      timelineDomain="roleTimeline"
      ownerKey="roleId"
    />
  )
}

export function CreatureSection(props: SectionPageProps) {
  return (
    <ListDetailSection
      {...props}
      domain="creature"
      templateSection="creature"
      tabs={['detail', 'timeline']}
      timelineDomain="creatureTimeline"
      ownerKey="creatureId"
    />
  )
}

export function ItemSection(props: SectionPageProps) {
  return (
    <ListDetailSection
      {...props}
      domain="item"
      templateSection="item"
      tabs={['detail', 'timeline']}
      timelineDomain="itemTimeline"
      ownerKey="itemId"
    />
  )
}
