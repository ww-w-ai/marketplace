import { expect, test } from 'bun:test'
import { isCodexGoalControl, normalizeTranscriptRow } from './transcript-normalizer.js'

const goal = '<codex_internal_context source="goal">hidden control</codex_internal_context>'

test('filters only complete Codex goal-control user envelopes', () => {
  expect(isCodexGoalControl(goal)).toBe(true)
  expect(isCodexGoalControl(`please discuss ${goal}`)).toBe(false)
  expect(normalizeTranscriptRow({ type: 'response_item', timestamp: 't', payload: { type: 'message', role: 'user', content: [{ type: 'input_text', text: goal }] } })).toBeNull()
})

test('normalizes Codex user and assistant message blocks', () => {
  const user = normalizeTranscriptRow({ type: 'response_item', timestamp: 't', payload: { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'hello' }] } })
  const assistant = normalizeTranscriptRow({ type: 'response_item', timestamp: 't2', payload: { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'hi' }] } })
  expect(user).toEqual({ type: 'user', timestamp: 't', message: { role: 'user', content: [{ type: 'text', text: 'hello' }] } })
  expect(assistant?.type).toBe('assistant')
})
