import { useCallback, useEffect, useState } from 'react'
import { Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import { dataOf, viewData, listEntities, type EntityItem } from '../entity-client.ts'
import { EntitySidebar } from '../ui/EntitySidebar.tsx'
import { emptyHint, useLiveReload } from '../ui/live-reload.ts'
import { chapterNodeLabel, countChapterChars, outlineKindOf, outlineNodeLabel, sortByOrdinalName, stripLeadingChapterHeading } from '../../novel/outline-labels.ts'
import type { SectionPageProps } from './types.ts'

function labelData(item: EntityItem): Record<string, unknown> {
  const data = dataOf(item)
  return { ...data, name: item.name ?? data.name }
}

function CopyIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M10.5 5.5V3.7A1.2 1.2 0 0 0 9.3 2.5H3.7A1.2 1.2 0 0 0 2.5 3.7v5.6A1.2 1.2 0 0 0 3.7 10.5H5.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

export function ChapterSection({ path }: SectionPageProps) {
  const [items, setItems] = useState<EntityItem[]>([])
  const [outlines, setOutlines] = useState<EntityItem[]>([])
  const [selectedId, setSelectedId] = useState<string | undefined>()
  const selected = items.find(item => item.id === selectedId)
  const data = viewData(selected)
  const content = typeof data.content === 'string' ? data.content : ''
  const title = chapterNodeLabel(data, String(data.name ?? data.title ?? '未命名'))
  const displayed = stripLeadingChapterHeading(content, title)
  const wordCount = countChapterChars(content)
  const related = outlines.find(item => item.id === data.relatedOutlineId)
  const relatedVolume = related === undefined
    ? undefined
    : outlineKindOf(labelData(related)) === 'chapter_segment'
      ? outlines.find(item => item.id === dataOf(related).parentId) ?? related
      : related
  const volumeLabel = relatedVolume === undefined
    ? undefined
    : outlineNodeLabel(labelData(relatedVolume), relatedVolume.name ?? relatedVolume.id)
  const meta = volumeLabel !== undefined && volumeLabel !== title ? volumeLabel : undefined

  const reload = useCallback(async () => {
    const [rows, outlineRows] = await Promise.all([listEntities(path, 'chapter'), listEntities(path, 'outline')])
    const sorted = sortByOrdinalName(rows, item => dataOf(item).ordinal ?? dataOf(item).chapterNo)
    setItems(sorted)
    setOutlines(outlineRows)
    setSelectedId(current => (current !== undefined && sorted.some(row => row.id === current) ? current : sorted[0]?.id))
  }, [path])
  useEffect(() => { void reload() }, [reload])
  useLiveReload(reload)

  const copyContent = useCallback(() => {
    if (content.length === 0) return
    void navigator.clipboard.writeText(content)
  }, [content])

  return (
    <>
      <EntitySidebar
        items={items}
        selectedId={selectedId}
        label={(item) => chapterNodeLabel(labelData(item), item.name ?? item.id)}
        onSelect={setSelectedId}
      />
      <section className="dshNovelViewForm">
        {selected === undefined ? (
          <div className="dshNovelViewFormBody"><p className="dshNovelViewMuted">{emptyHint()}</p></div>
        ) : (
          <div className="dshNovelViewFormBody">
            <div className="dshNovelTitleRow">
              <h2 className="dshNovelTitle">{title}</h2>
              <div className="dshNovelViewFormHeadActions">
                <span className="dshNovelWordCount">{wordCount} 字</span>
                <Tooltip label="复制正文" side="bottom">
                  <button
                    type="button"
                    className="dshNovelIconBtn"
                    aria-label="复制正文"
                    disabled={content.length === 0}
                    onClick={copyContent}
                  >
                    <CopyIcon />
                  </button>
                </Tooltip>
              </div>
            </div>
            {meta !== undefined && <p className="dshNovelMeta">{meta}</p>}
            <div className="dshNovelProse">{displayed || '—'}</div>
          </div>
        )}
      </section>
    </>
  )
}
