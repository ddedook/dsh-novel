import { describe, expect, it } from 'vitest'
import { inject, name } from '../src/index.ts'

describe('dsh-novel plugin', () => {
  it('registers as a standard Host plugin without a desktop runtime', () => {
    expect(name).toBe('novel')
    expect(inject).toEqual(['webServer', 'tools', 'systemPrompt', 'skills'])
    expect(inject).not.toContain('desktopRuntime')
  })
})
