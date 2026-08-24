import { createReadStream } from 'fs'
import { createInterface } from 'readline'
import type { SessionMessage } from './session-scanner.js'
import { isCodexGoalControl, normalizeTranscriptRow } from './transcript-normalizer.js'

export type CommitLogTurn = {
  ts: string
  sessionId: string
  line: number
  userText: string
  isReactive: boolean
  precedingAssistant?: string
  options?: string[]
  decision?: string
}

export type RawMessage = { msg: SessionMessage; line: number }

export const MAX_USER = 3000
export const MAX_ASSISTANT = 800

export function messageText(m?: SessionMessage): string {
  if (!m?.message) return ''
  const c = m.message.content
  if (typeof c === 'string') return c
  if (Array.isArray(c)) {
    return c.filter(b => b.type === 'text' && b.text).map(b => b.text as string).join('\n')
  }
  return ''
}

export function findAskUserQuestion(m?: SessionMessage): { options: string[] } | null {
  if (!m?.message || !Array.isArray(m.message.content)) return null
  for (const b of m.message.content) {
    if (b.type === 'tool_use' && b.name === 'AskUserQuestion' && b.input) {
      const qs = (b.input as any).questions
      if (Array.isArray(qs)) {
        const options: string[] = []
        for (const q of qs) for (const o of (q?.options ?? [])) if (o?.label) options.push(o.label)
        return { options }
      }
    }
  }
  return null
}

export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max)} […${text.length - max} more]`
}

export function parseDecision(userText: string): string | undefined {
  if (!userText.startsWith('Your questions have been answered:')) return undefined
  const choices = [...userText.matchAll(/="([^"]+)"/g)].map(m => m[1])
  return choices.length ? choices.join(' / ') : undefined
}

const SYNTHETIC_RE =
  /^(<command-(name|message|args)>|<local-command-(stdout|stderr|caveat)>|<bash-(input|stdout|stderr)>|<user-prompt-submit-hook>|Caveat: The messages below were generated|Base directory for this skill:)/

export function isSynthetic(text: string): boolean {
  return SYNTHETIC_RE.test(text.trim()) || isCodexGoalControl(text)
}

export function stripSystemTags(text: string): string {
  return text
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '')
    .replace(/<user-prompt-submit-hook>[\s\S]*?<\/user-prompt-submit-hook>/g, '')
    .replace(/<local-command-caveat>[\s\S]*?<\/local-command-caveat>/g, '')
    .trim()
}

export function inWindow(ts: string, from?: number, to?: number): boolean {
  if (!ts) return false
  const t = Date.parse(ts)
  if (Number.isNaN(t)) return false
  if (from !== undefined && t <= from) return false
  if (to !== undefined && t > to) return false
  return true
}

export function buildTurns(
  raw: RawMessage[],
  sessionId: string,
  from?: number,
  to?: number,
): CommitLogTurn[] {
  const turns: CommitLogTurn[] = []
  for (let i = 0; i < raw.length; i++) {
    const { msg, line } = raw[i]!
    if (msg.type !== 'user') continue
    const ts = msg.timestamp ?? ''
    if (!inWindow(ts, from, to)) continue
    const rawText = messageText(msg).trim()
    if (!rawText || isSynthetic(rawText)) continue
    const userText = stripSystemTags(rawText)
    if (!userText) continue

    let precedingAssistant: string | undefined
    let options: string[] | undefined
    for (let j = i - 1; j >= 0; j--) {
      const pm = raw[j]!.msg
      if (pm.type === 'assistant') {
        const aq = findAskUserQuestion(pm)
        if (aq) options = aq.options
        const at = messageText(pm).trim()
        if (at) precedingAssistant = truncate(at, MAX_ASSISTANT)
        break
      }
      if (pm.type === 'user') break
    }

    const decision = parseDecision(userText)
    const isReactive = Boolean(options) || Boolean(decision) || userText.length < 60

    turns.push({
      ts,
      sessionId,
      line,
      userText: truncate(userText, MAX_USER),
      isReactive,
      ...(isReactive && precedingAssistant ? { precedingAssistant } : {}),
      ...(options ? { options } : {}),
      ...(decision ? { decision } : {}),
    })
  }
  return turns
}

export async function readRawMessages(filePath: string): Promise<RawMessage[]> {
  const raw: RawMessage[] = []
  const stream = createReadStream(filePath, { encoding: 'utf-8' })
  const rl = createInterface({ input: stream, crlfDelay: Infinity })
  let line = 0
  try {
    for await (const l of rl) {
      line++
      const t = l.trim()
      if (!t) continue
      try {
        const msg = normalizeTranscriptRow(JSON.parse(t))
        if (msg) raw.push({ msg, line })
      } catch {
        // skip malformed lines
      }
    }
  } finally {
    rl.close()
    stream.destroy()
  }
  return raw
}
