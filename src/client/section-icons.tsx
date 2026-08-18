import type { ReactNode } from 'react'
import {
  IconArchiveOutline20,
  IconChecklistOutline14,
  IconGlobeOutline14,
  IconGoalOutline16,
  IconListPenOutline16,
  IconQueueOutline14,
  IconSkillOutline16,
  IconUserOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { ContentSection } from '../novel/domains.ts'

function CreatureIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 2.2c1.4 0 2.5 1.2 2.5 2.6 0 .5-.1 1-.4 1.4 1.3.5 2.2 1.8 2.2 3.3 0 2-1.9 3.6-4.3 3.6S3.7 11.5 3.7 9.5c0-1.5.9-2.8 2.2-3.3-.3-.4-.4-.9-.4-1.4C5.5 3.4 6.6 2.2 8 2.2Z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  )
}

function BookIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 3.2c-1.1-.8-2.6-1.1-4.4-.8v9.2c1.7-.3 3.2 0 4.4.8 1.1-.8 2.6-1.1 4.4-.8V2.4c-1.8-.3-3.3 0-4.4.8Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M8 3.2v9.2" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

export function SectionIcon({ section }: { section: ContentSection }): ReactNode {
  switch (section) {
    case 'overview': return <BookIcon />
    case 'world': return <IconGlobeOutline14 />
    case 'role': return <IconUserOutline16 />
    case 'creature': return <CreatureIcon />
    case 'item': return <IconArchiveOutline20 size={16} />
    case 'level': return <IconGoalOutline16 />
    case 'timeline': return <IconQueueOutline14 />
    case 'outline': return <IconChecklistOutline14 />
    case 'chapter': return <IconListPenOutline16 />
    case 'skill': return <IconSkillOutline16 />
  }
}
