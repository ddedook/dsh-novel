import { useEffect } from 'react'

const HINT = '暂无。可在对话中让 AI 补充。'

export function emptyHint(hasFilter?: boolean): string {
  return hasFilter ? '无匹配项' : HINT
}

export function useLiveReload(reload: () => void | Promise<void>, ms = 5000): void {
  useEffect(() => {
    const tick = () => { void reload() }
    const id = window.setInterval(tick, ms)
    const onVis = () => { if (document.visibilityState === 'visible') tick() }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [reload, ms])
}
