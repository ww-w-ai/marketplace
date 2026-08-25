/**
 * Session Scanner — discovers and reads Claude Code session JSONL files.
 * Independent implementation (no Claude Code source dependency).
 */

import { readdir, stat } from 'fs/promises'
import { createReadStream } from 'fs'
import { createInterface } from 'readline'
import { homedir } from 'os'
import { join } from 'path'
import { normalizeTranscriptRow } from './transcript-normalizer.js'

// ============================================================================
// Types
// ============================================================================

export type SessionMessage = {
  type: 'user' | 'assistant' | 'system'
  message?: {
    role?: string
    content: string | ContentBlock[]
  }
  timestamp?: string
}

export type ContentBlock = {
  type: string
  text?: string
  name?: string
  input?: Record<string, unknown>
  tool_use_id?: string
  is_error?: boolean
}

export type SessionFile = {
  sessionId: string
  path: string
  mtime: number
  size: number
  projectHash: string  // directory name under ~/.claude/projects/
}

export type ParsedSession = {
  sessionId: string
  projectPath: string
  startTime: string
  endTime: string
  durationMinutes: number
  messages: SessionMessage[]
}

export type DateRange = {
  from?: string  // YYYY-MM-DD
  to?: string    // YYYY-MM-DD
}

export type ScanScope = 'default' | 'with-subfolder' | 'all'

export type ScanOptions = {
  dateRange?: DateRange
  scope?: ScanScope       // default: 'default'
  basePath?: string       // single base path (default: current dir). Use paths[] for multiple.
  paths?: string[]        // multiple base paths (each treated as 'with-subfolder' scope)
  excludePaths?: string[] // paths to exclude (project hashes that start with these are skipped)
  tz?: string             // IANA timezone (default: system local)
  includeSubagents?: boolean  // include user-initiated subagent sessions (default: false)
}

// System subagent prefixes to exclude (not user-initiated work)
const SYSTEM_SUBAGENT_PREFIXES = ['agent-acompact', 'agent-aside_question']

// ============================================================================
// Timezone Helpers
// ============================================================================

/**
 * Get the local date string (YYYY-MM-DD) for a Date in a given timezone.
 * Uses Intl.DateTimeFormat to avoid external dependencies.
 */
export function dateToLocalString(d: Date, tz?: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    year: 'numeric', month: '2-digit', day: '2-digit',
    timeZone: tz,
  }
  // en-CA gives YYYY-MM-DD format natively
  return new Intl.DateTimeFormat('en-CA', opts).format(d)
}

/**
 * Get the hour (0-23) for a timestamp in a given timezone.
 */
export function getHourInTz(timestamp: string, tz?: string): number | null {
  const d = new Date(timestamp)
  if (isNaN(d.getTime())) return null
  const hour = parseInt(
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: tz }).format(d),
    10,
  )
  return isNaN(hour) ? null : hour % 24
}

/**
 * Get the day of week (0=Sun ~ 6=Sat) for a timestamp in a given timezone.
 */
export function getDayOfWeekInTz(timestamp: string, tz?: string): number | null {
  const d = new Date(timestamp)
  if (isNaN(d.getTime())) return null
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: tz }).format(d)
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return map[weekday] ?? null
}

export function getSystemTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

// ============================================================================
// Date Parsing
// ============================================================================

export function parseDateArg(arg: string, tz?: string): string | null {
  const trimmed = arg.trim()

  // Relative: "7d", "2w", "1m" — returns ISO timestamp for exact duration
  const relMatch = trimmed.match(/^(\d+)([dwm])$/i)
  if (relMatch) {
    const n = parseInt(relMatch[1]!, 10)
    const unit = relMatch[2]!.toLowerCase()
    const d = new Date()
    if (unit === 'd') d.setTime(d.getTime() - n * 24 * 60 * 60 * 1000)
    else if (unit === 'w') d.setTime(d.getTime() - n * 7 * 24 * 60 * 60 * 1000)
    else if (unit === 'm') d.setMonth(d.getMonth() - n)
    return d.toISOString()
  }

  // Absolute date: "2026-03-01"
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }
  // Month-only: "2026-03" → return with month marker so caller knows
  // from → first day of month, to → last day of month
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    return `${trimmed}` // keep as YYYY-MM, handle in isSessionInDateRange
  }

  return null
}

// ============================================================================
// Session Discovery
// ============================================================================

export function getClaudeHome(): string {
  return process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude')
}

export function getCodexHome(): string {
  return process.env.CODEX_HOME || join(homedir(), '.codex')
}

function getProjectsDir(): string {
  return join(getClaudeHome(), 'projects')
}

/**
 * Convert an absolute filesystem path to the project hash used by Claude Code.
 * CC's sanitizePath replaces ALL non-alphanumeric chars with `-`.
 * e.g. "/Users/kim/Documents/My Project (v2)" → "-Users-kim-Documents-My-Project--v2-"
 */
export function pathToProjectHash(absPath: string): string {
  return absPath.replace(/[^a-zA-Z0-9]/g, '-')
}

/**
 * Check if a project hash matches the given scope and path configuration.
 */
function matchesScope(
  projectHash: string,
  baseHash: string,
  scope: ScanScope,
): boolean {
  if (scope === 'all') return true
  if (scope === 'default') return projectHash === baseHash
  // with-subfolder: base hash is a prefix
  return projectHash === baseHash || projectHash.startsWith(baseHash + '-')
}

function matchesMultiPath(
  projectHash: string,
  pathHashes: string[],
): boolean {
  return pathHashes.some(h => projectHash === h || projectHash.startsWith(h + '-'))
}

function isExcluded(
  projectHash: string,
  excludeHashes: string[],
): boolean {
  return excludeHashes.some(h => projectHash === h || projectHash.startsWith(h + '-'))
}

export async function scanSessionFiles(
  options?: ScanOptions,
): Promise<SessionFile[]> {
  const projectsDir = getProjectsDir()
  const dateRange = options?.dateRange
  const scope = options?.scope ?? 'default'
  const basePath = options?.basePath ?? process.cwd()
  const baseHash = pathToProjectHash(basePath)

  // Multi-path support: if paths[] is provided, use those instead of single basePath
  const multiPathHashes = options?.paths?.map(pathToProjectHash)
  const excludeHashes = options?.excludePaths?.map(pathToProjectHash) ?? []

  let projectDirs: Array<{ name: string; fullPath: string }>
  try {
    const entries = await readdir(projectsDir, { withFileTypes: true })
    projectDirs = entries
      .filter(e => e.isDirectory() || e.isSymbolicLink())
      .filter(e => {
        // Exclude check first (applies to all modes)
        if (isExcluded(e.name, excludeHashes)) return false
        // Multi-path mode: if paths[] provided, match against those
        if (multiPathHashes) return matchesMultiPath(e.name, multiPathHashes)
        // Single path mode: use scope + basePath
        return matchesScope(e.name, baseHash, scope)
      })
      .map(e => ({ name: e.name, fullPath: join(projectsDir, e.name) }))
  } catch {
    projectDirs = []
  }

  // Convert date range to epoch ms for mtime pre-filtering
  const fromMs = dateRange?.from
    ? (dateRange.from.includes('T')
        ? new Date(dateRange.from).getTime()
        : new Date(`${dateRange.from}T00:00:00Z`).getTime()
      ) - 86_400_000 // 1-day buffer for mtime approximation
    : 0
  const toMs = dateRange?.to
    ? (dateRange.to.includes('T')
        ? new Date(dateRange.to).getTime()
        : new Date(`${dateRange.to}T23:59:59Z`).getTime()
      ) + 86_400_000
    : Infinity

  const results: SessionFile[] = []

  for (const dir of projectDirs) {
    // Collect JSONL files from project dir
    let files: string[]
    try {
      const entries = await readdir(dir.fullPath)
      files = entries.filter(f => f.endsWith('.jsonl'))
    } catch {
      continue
    }

    for (const file of files) {
      const filePath = join(dir.fullPath, file)
      try {
        const fileStat = await stat(filePath)
        const mtime = fileStat.mtimeMs
        if (mtime < fromMs || mtime > toMs) continue
        const sessionId = file.replace('.jsonl', '')
        results.push({ sessionId, path: filePath, mtime, size: fileStat.size, projectHash: dir.name })
      } catch {
        continue
      }
    }

    // Also scan subagent sessions if requested
    if (options?.includeSubagents) {
      // Subagents live under {projectDir}/{sessionId}/subagents/*.jsonl
      for (const file of files) {
        const sessionDir = join(dir.fullPath, file.replace('.jsonl', ''), 'subagents')
        let subFiles: string[]
        try {
          subFiles = (await readdir(sessionDir)).filter(f => f.endsWith('.jsonl'))
        } catch {
          continue // no subagents dir
        }

        for (const subFile of subFiles) {
          const basename = subFile.replace('.jsonl', '')
          // Skip system subagents (auto-compact, aside questions)
          if (SYSTEM_SUBAGENT_PREFIXES.some(prefix => basename.startsWith(prefix))) continue

          const subPath = join(sessionDir, subFile)
          try {
            const subStat = await stat(subPath)
            if (subStat.mtimeMs < fromMs || subStat.mtimeMs > toMs) continue
            results.push({
              sessionId: basename,
              path: subPath,
              mtime: subStat.mtimeMs,
              size: subStat.size,
              projectHash: dir.name,
            })
          } catch {
            continue
          }
        }
      }
    }
  }

  // Codex baseline: ~/.codex/sessions/YYYY/MM/DD/*.jsonl. Read only session_meta
  // to apply the same cwd scope; message normalization happens in parseSessionFile.
  const codexRoot = join(getCodexHome(), 'sessions')
  const safeList = async (path: string): Promise<string[]> => {
    try { return await readdir(path) } catch { return [] }
  }
  for (const year of await safeList(codexRoot)) for (const month of await safeList(join(codexRoot, year))) for (const day of await safeList(join(codexRoot, year, month))) {
      const dir = join(codexRoot, year, month, day)
      for (const file of (await safeList(dir)).filter(name => name.endsWith('.jsonl'))) {
        const filePath = join(dir, file)
        let fileStat
        try { fileStat = await stat(filePath) } catch { continue }
        if (fileStat.mtimeMs < fromMs || fileStat.mtimeMs > toMs) continue
        let cwd = ''
        let isSubagentRollout = false
        try {
          const rl = createInterface({ input: createReadStream(filePath, { encoding: 'utf-8' }), crlfDelay: Infinity })
          for await (const line of rl) {
            try {
              const row = JSON.parse(line)
              if (row.type === 'session_meta') {
                cwd = row.payload?.cwd ?? ''
                isSubagentRollout = row.payload?.thread_source === 'subagent' || !!row.payload?.source?.subagent?.thread_spawn
                break
              }
            } catch { /* malformed row */ }
          }
          rl.close()
        } catch { continue }
        if (!cwd) continue
        if (isSubagentRollout && !options?.includeSubagents) continue
        const hash = pathToProjectHash(cwd)
        if (isExcluded(hash, excludeHashes)) continue
        const matches = multiPathHashes ? matchesMultiPath(hash, multiPathHashes) : matchesScope(hash, baseHash, scope)
        if (!matches) continue
        const match = file.match(/([0-9a-f]{8}-[0-9a-f-]{27,})\.jsonl$/i)
        results.push({ sessionId: match?.[1] ?? file.replace('.jsonl', ''), path: filePath, mtime: fileStat.mtimeMs, size: fileStat.size, projectHash: hash })
      }
  }

  // Sort by mtime descending (most recent first)
  results.sort((a, b) => b.mtime - a.mtime)
  return results
}

// ============================================================================
// JSONL Parsing
// ============================================================================

export type SessionViews = { raw: unknown[]; messages: SessionMessage[] }

/** Read once and expose both immutable raw rows and the filtered dialogue view. */
export async function parseSessionViews(
  filePath: string,
  maxLines?: number,
): Promise<SessionViews> {
  const raw: unknown[] = []
  const messages: SessionMessage[] = []
  const limit = maxLines ?? Infinity
  let count = 0

  const stream = createReadStream(filePath, { encoding: 'utf-8' })
  const rl = createInterface({ input: stream, crlfDelay: Infinity })

  try {
    for await (const line of rl) {
      if (count >= limit) break
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        const row = JSON.parse(trimmed)
        raw.push(row)
        const message = normalizeTranscriptRow(row)
        if (message) messages.push(message)
        count++
      } catch {
        // Skip malformed lines
      }
    }
  } finally {
    rl.close()
    stream.destroy()
  }

  return { raw, messages }
}

export async function parseSessionFile(
  filePath: string,
  maxLines?: number,
): Promise<SessionMessage[]> {
  return (await parseSessionViews(filePath, maxLines)).messages
}

export function getSessionTimestamps(
  messages: SessionMessage[],
): { start: string; end: string } | null {
  let firstTs: string | null = null
  let lastTs: string | null = null

  for (const msg of messages) {
    if (msg.timestamp) {
      if (!firstTs) firstTs = msg.timestamp
      lastTs = msg.timestamp
    }
  }

  if (!firstTs || !lastTs) return null
  return { start: firstTs, end: lastTs }
}

/**
 * Lightweight prompt-only scanner — reads JSONL line by line,
 * extracts only user message text. Skips full message parsing
 * for sessions where metrics are already cached.
 */
export async function extractPromptsFromFile(
  filePath: string,
): Promise<Array<{ text: string; timestamp: string; index: number }>> {
  const prompts: Array<{ text: string; timestamp: string; index: number }> = []
  let idx = 0

  const stream = createReadStream(filePath, { encoding: 'utf-8' })
  const rl = createInterface({ input: stream, crlfDelay: Infinity })

  try {
    for await (const line of rl) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        const obj = normalizeTranscriptRow(JSON.parse(trimmed))
        if (obj?.type !== 'user' || !obj.message) continue
        const content = obj.message.content
        let text = ''
        if (typeof content === 'string') text = content
        else if (Array.isArray(content)) {
          text = content
            .filter((b: any) => b.type === 'text' && b.text)
            .map((b: any) => b.text)
            .join('\n')
        }
        if (text.trim()) {
          prompts.push({ text, timestamp: obj.timestamp || '', index: idx++ })
        }
      } catch {
        // Skip malformed lines
      }
    }
  } finally {
    rl.close()
    stream.destroy()
  }

  return prompts
}

export async function extractLastUserMessagesFromFile(
  filePath: string,
  limit = 5,
): Promise<Array<{ text: string; timestamp: string; index: number }>> {
  if (!Number.isInteger(limit) || limit < 1) throw new Error('limit must be a positive integer')
  return (await extractPromptsFromFile(filePath)).slice(-limit)
}

// ============================================================================
// Transcript Formatting (for prepare-facets)
// ============================================================================

/**
 * Truncate text preserving start and end, with "[...N chars omitted...]" in the middle.
 * User: first 1000 + last 500. Assistant: first 600 + last 300.
 */
function truncateText(text: string, headLen: number, tailLen: number): string {
  const maxLen = headLen + tailLen
  if (text.length <= maxLen) return text
  const omitted = text.length - headLen - tailLen
  return `${text.slice(0, headLen)} [...${omitted} chars omitted...] ${text.slice(-tailLen)}`
}

/**
 * Stream a JSONL session file and produce a formatted transcript string.
 * User messages: first 1000 + last 500 chars. Assistant: first 600 + last 300 chars.
 * Tool use blocks rendered as `[Tool: name]` only.
 */
export async function formatTranscript(filePath: string): Promise<string> {
  const lines: string[] = []

  const stream = createReadStream(filePath, { encoding: 'utf-8' })
  const rl = createInterface({ input: stream, crlfDelay: Infinity })

  try {
    for await (const line of rl) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        const msg = normalizeTranscriptRow(JSON.parse(trimmed))
        if (!msg) continue
        const role = msg.type ?? msg.message?.role
        if (!role) continue

        if (role === 'user') {
          const text = extractText(msg)
          if (text) lines.push(`[User] ${truncateText(text, 1000, 500)}`)
        } else if (role === 'assistant') {
          const content = msg.message?.content
          if (Array.isArray(content)) {
            for (const block of content) {
              if (block.type === 'text' && block.text) {
                lines.push(`[Assistant] ${truncateText(block.text, 600, 300)}`)
              } else if (block.type === 'tool_use' && block.name) {
                lines.push(`[Tool: ${block.name}]`)
              }
            }
          } else if (typeof content === 'string' && content) {
            lines.push(`[Assistant] ${truncateText(content, 600, 300)}`)
          }
        }
      } catch {
        // Skip malformed lines
      }
    }
  } finally {
    rl.close()
    stream.destroy()
  }

  return lines.join('\n')
}

function extractText(msg: SessionMessage): string {
  const content = msg.message?.content
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .filter((b: ContentBlock) => b.type === 'text' && b.text)
      .map((b: ContentBlock) => b.text!)
      .join('\n')
  }
  return ''
}

/**
 * Convert a date-only string (YYYY-MM-DD) to epoch ms at 00:00 in the given timezone.
 * If tz is omitted, uses system timezone.
 */
function dateToMsInTz(dateStr: string, hour: number, tz?: string): number {
  // Build a date at the given hour in the target timezone by iterating
  // Create a UTC date and adjust for timezone offset
  const probe = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:00:00Z`)
  if (!tz) return probe.getTime()
  // Find the UTC offset for this timezone at this date
  const utcStr = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false, timeZone: 'UTC',
  }).format(probe)
  const tzStr = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false, timeZone: tz,
  }).format(probe)
  // Parse both to ms and get offset
  const parse = (s: string) => {
    const m = s.match(/(\d{4})-(\d{2})-(\d{2}),?\s*(\d{2}):(\d{2}):(\d{2})/)
    if (!m) return 0
    return Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]!, +m[5]!, +m[6]!)
  }
  const offsetMs = parse(tzStr) - parse(utcStr)
  // We want dateStr at hour:00 in tz → subtract the offset from UTC
  return new Date(`${dateStr}T${String(hour).padStart(2, '0')}:00:00Z`).getTime() - offsetMs
}

export function isSessionInDateRange(
  startTime: string,
  dateRange?: DateRange,
  tz?: string,
): boolean {
  if (!dateRange?.from && !dateRange?.to) return true
  const sessionMs = new Date(startTime).getTime()
  if (isNaN(sessionMs)) return false
  if (dateRange.from) {
    let fromMs: number
    if (dateRange.from.includes('T')) {
      fromMs = new Date(dateRange.from).getTime()
    } else if (/^\d{4}-\d{2}$/.test(dateRange.from)) {
      // Month-only: YYYY-MM → first day 00:00 in tz
      fromMs = dateToMsInTz(`${dateRange.from}-01`, 0, tz)
    } else {
      fromMs = dateToMsInTz(dateRange.from, 0, tz)
    }
    if (sessionMs < fromMs) return false
  }
  if (dateRange.to) {
    // to: exclusive upper bound (< next boundary 00:00 in tz)
    let toMs: number
    if (dateRange.to.includes('T')) {
      toMs = new Date(dateRange.to).getTime()
    } else if (/^\d{4}-\d{2}$/.test(dateRange.to)) {
      // Month-only: YYYY-MM → next month 1st 00:00 in tz
      const [y, m] = dateRange.to.split('-').map(Number) as [number, number]
      const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
      toMs = dateToMsInTz(nextMonth, 0, tz)
    } else {
      // Date: YYYY-MM-DD → next day 00:00 in tz
      const next = new Date(`${dateRange.to}T12:00:00Z`)
      next.setDate(next.getDate() + 1)
      const nextStr = next.toISOString().split('T')[0]!
      toMs = dateToMsInTz(nextStr, 0, tz)
    }
    if (sessionMs >= toMs) return false
  }
  return true
}
