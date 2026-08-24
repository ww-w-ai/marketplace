import type { ContentBlock, SessionMessage } from './session-scanner.js'

const GOAL_CONTROL = /^<codex_internal_context\s+source=["']goal["']>[\s\S]*<\/codex_internal_context>$/

export function isCodexGoalControl(text: string): boolean {
  return GOAL_CONTROL.test(text.trim())
}

function blocks(content: unknown): ContentBlock[] | string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content.flatMap((block: any) => {
    if (typeof block === 'string') return [{ type: 'text', text: block }]
    if (block?.type === 'input_text' || block?.type === 'output_text') return [{ type: 'text', text: block.text ?? '' }]
    return block?.type ? [block as ContentBlock] : []
  })
}

/** Adapt Claude or Codex JSONL rows to the existing SessionMessage contract. */
export function normalizeTranscriptRow(row: any): SessionMessage | null {
  if (row?.type === 'user' || row?.type === 'assistant') return row as SessionMessage
  if (row?.type !== 'response_item' || row?.payload?.type !== 'message') return null
  const role = row.payload.role
  if (role !== 'user' && role !== 'assistant') return null
  const content = blocks(row.payload.content)
  const text = typeof content === 'string'
    ? content
    : content.filter(b => b.type === 'text' && b.text).map(b => b.text).join('\n')
  if (role === 'user' && isCodexGoalControl(text)) return null
  return { type: role, timestamp: row.timestamp, message: { role, content } }
}
