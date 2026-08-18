const NOVEL_STYLES = `
.dshNovelView { display: flex; height: 100%; min-height: 0; width: 100%; overflow: hidden; color: var(--dsw-alias-label-primary, inherit); font-size: 13px; line-height: 1.45; background: var(--dsw-alias-bg-base); }
.dshNovelViewRail { display: flex; flex-direction: column; gap: 2px; width: 46px; flex-shrink: 0; overflow: auto; padding: 8px 4px; border-right: 1px solid var(--dsw-alias-border-l2); }
.dshNovelViewRail button { appearance: none; display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; padding: 0; border: 0; border-radius: 8px; background: transparent; color: var(--dsw-alias-label-secondary, inherit); cursor: pointer; transition-property: transform, background-color, color; transition-duration: 120ms; transition-timing-function: cubic-bezier(0.2, 0, 0, 1); }
.dshNovelViewRail button:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary, inherit); }
.dshNovelViewRail button:active { transform: scale(0.96); }
.dshNovelViewRail button[data-active] { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary, inherit); }
.dshNovelViewList { display: flex; flex-direction: column; width: 200px; flex-shrink: 0; min-width: 0; min-height: 0; border-right: 1px solid var(--dsw-alias-border-l2); overflow: hidden; }
.dshNovelSkillTree { width: 240px; }
.dshNovelViewListToolbar { display: flex; align-items: center; gap: 4px; padding: 8px 8px 4px; min-width: 0; overflow: hidden; }
.dshNovelViewSearch { display: flex; flex: 1; min-width: 0; overflow: hidden; box-sizing: border-box; }
.dshNovelViewSearch > span, .dshNovelInput { display: flex !important; width: 100%; min-width: 0; max-width: 100%; box-sizing: border-box; }
.dshNovelControl { display: block; width: 100%; max-width: 100%; box-sizing: border-box; min-width: 0; border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; background: var(--dsw-alias-bg-layer-1, var(--dsw-alias-bg-base)); color: var(--dsw-alias-label-primary, inherit); padding: 5px 8px; font-size: 14px; line-height: 22px; }
.dshNovelControl:focus { outline: none; border-color: var(--dsw-alias-brand-primary); }
textarea.dshNovelControl { min-height: 88px; resize: vertical; }
.dshNovelJsonEditor { flex: 1; min-height: 0; height: 100%; width: 100%; resize: none; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; line-height: 18px; padding: 12px; border: 0; border-radius: 12px; background: var(--dsw-alias-markdown-code-block, var(--dsw-alias-bg-layer-1)); color: var(--dsw-alias-label-primary, inherit); box-sizing: border-box; }
.dshNovelJsonEditor:focus { outline: none; box-shadow: inset 0 0 0 1px var(--dsw-alias-brand-primary); }
.dshNovelTabs { display: flex; gap: 36px; margin-top: 4px; padding-left: 8px; min-height: 0; }
.dshNovelTabs button { appearance: none; position: relative; padding: 0 0 11px; border: 0; background: transparent; font-size: 13px; line-height: 16px; font-weight: 500; color: var(--dsw-alias-label-tertiary); cursor: pointer; }
.dshNovelTabs button::after { content: ""; position: absolute; right: 0; bottom: 1px; left: 0; height: 2px; border-radius: 2px; background: transparent; }
.dshNovelTabs button[data-active] { color: var(--dsw-alias-state-business-primary); }
.dshNovelTabs button[data-active]::after { background: var(--dsw-alias-state-business-primary); }
.dshNovelEntry { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 6px; }
.dshNovelEntryTitle { font-size: 14px; font-weight: 500; line-height: 22px; }
.dshNovelTier { display: flex; flex-direction: column; gap: 8px; padding: 12px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 6px; }
.dshNovelPills { display: flex; flex-wrap: wrap; gap: 6px; }
.dshNovelTitle { margin: 0; font-size: 20px; font-weight: 600; line-height: 28px; }
.dshNovelMeta { margin: 0; color: var(--dsw-alias-label-secondary); font-size: 13px; line-height: 20px; }
.dshNovelProse { margin: 0; white-space: pre-wrap; font-size: 14px; line-height: 24px; }
.dshNovelReadValue { white-space: pre-wrap; font-size: 14px; line-height: 22px; color: var(--dsw-alias-label-primary, inherit); }
.dshNovelViewListBody { flex: 1; min-height: 0; overflow: auto; padding: 4px 6px 12px; }
.dshNovelViewRow { appearance: none; display: flex; align-items: center; gap: 6px; width: 100%; min-height: 32px; text-align: left; border: 0; background: transparent; color: inherit; padding: 0 8px; border-radius: 6px; cursor: pointer; transition-property: transform, background-color, color; transition-duration: 120ms; transition-timing-function: cubic-bezier(0.2, 0, 0, 1); }
.dshNovelViewRow:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dshNovelViewRow:active { transform: scale(0.96); }
.dshNovelViewRow[data-active] { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dshNovelViewRow[data-kind="folder"] { color: var(--dsw-alias-label-secondary); font-weight: 500; }
.dshNovelViewRowIcon { display: inline-flex; width: 16px; height: 16px; flex-shrink: 0; color: currentColor; }
.dshNovelViewChevron { display: inline-flex; align-items: center; justify-content: center; width: 14px; flex-shrink: 0; transition-property: transform; transition-duration: 120ms; color: var(--dsw-alias-label-tertiary, inherit); }
.dshNovelViewChevron[data-open] { transform: rotate(90deg); }
.dshNovelDoc { display: flex; flex-direction: column; gap: 12px; max-width: 680px; width: 100%; }
.dshNovelCrumb { margin: 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.dshNovelMarkdown { font-size: 14px; line-height: 24px; color: var(--dsw-alias-label-primary); }
.dshNovelViewForm { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
.dshNovelViewFormHead { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; padding: 4px 16px 0 12px; border-bottom: 1px solid var(--dsw-alias-border-l2); min-width: 0; }
.dshNovelViewFormHeadTabs { min-width: 0; overflow: hidden; }
.dshNovelViewFormHeadActions { display: flex; flex: none; align-items: center; gap: 8px; margin-left: auto; padding-bottom: 6px; }
.dshNovelViewFormBody { flex: 1; min-height: 0; overflow: auto; padding: 12px; display: flex; flex-direction: column; gap: 12px; }
.dshNovelViewField { display: flex; flex-direction: column; gap: 4px; }
.dshNovelViewField label { font-size: 12px; color: var(--dsw-alias-label-secondary, inherit); }
.dshNovelViewEmpty { margin: auto; padding: 32px 20px; display: flex; flex-direction: column; gap: 12px; max-width: 420px; width: 100%; }
.dshNovelViewMuted { color: var(--dsw-alias-label-secondary, inherit); font-size: 12px; }
.dshNovelViewError { color: var(--dsw-alias-state-error-primary, tomato); font-size: 12px; }
`

export function installNovelStyles(): () => void {
  const style = document.createElement('style')
  style.dataset.plugin = 'dsh-novel'
  style.dataset.pluginCss = 'dsh-novel/content'
  style.textContent = NOVEL_STYLES
  document.head.appendChild(style)
  return () => { style.remove() }
}
