import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { Input, IconSearchOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'

export function Field({ label, htmlFor, children }: { label: string, htmlFor?: string, children: React.ReactNode }) {
  return (
    <div className="dshNovelViewField">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  )
}

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <Input className={className === undefined ? 'dshNovelInput' : `dshNovelInput ${className}`} {...rest} />
}

export function SearchField({ className: _className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="dshNovelViewSearch">
      <Input icon={<IconSearchOutline16 />} placeholder="搜索…" {...rest} />
    </div>
  )
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props
  return <textarea className={`dshNovelControl ${className ?? ''}`} {...rest} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="dshNovelControl" {...props} />
}

export function DetailTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: Array<{ id: T, label: string }>
  value: T
  onChange: (id: T) => void
}) {
  return (
    <div className="dshNovelTabs" role="tablist">
      {tabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={value === tab.id}
          data-active={value === tab.id || undefined}
          onClick={() => { onChange(tab.id) }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function SectionToolbar({ tabs, actions }: { tabs?: ReactNode | undefined, actions?: ReactNode | undefined }) {
  return (
    <div className="dshNovelViewFormHead">
      <div className="dshNovelViewFormHeadTabs">{tabs}</div>
      <div className="dshNovelViewFormHeadActions">{actions}</div>
    </div>
  )
}
