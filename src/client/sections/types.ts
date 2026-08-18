import type { EntityItem } from '../entity-client.ts'

export interface SectionPageProps {
  path: string
  template: unknown
  chapters: EntityItem[]
}

export interface OverviewPageProps {
  path: string
  template: unknown
  styles: Array<{ id: string, name: string }>
}
