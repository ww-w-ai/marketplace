/**
 * Metrics Extractor — extracts quantitative metrics from parsed session messages.
 * Independent implementation (no Claude Code source dependency).
 */

import { extname } from 'path'
import type { SessionMessage, ContentBlock } from './session-scanner.js'
import { getHourInTz, getDayOfWeekInTz, dateToLocalString } from './session-scanner.js'

// ============================================================================
// Types
// ============================================================================

export type TokenUsage = {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheCreationTokens: number
}

// Anthropic API pricing (per million tokens, as of 2026)
// Using Opus pricing as conservative estimate
const PRICING = {
  input: 15,           // $15/M
  output: 75,          // $75/M
  cacheRead: 1.50,     // $1.50/M (90% discount)
  cacheCreation: 18.75, // $18.75/M (25% premium)
}

export type CostEstimate = {
  inputCost: number
  outputCost: number
  cacheReadCost: number
  cacheCreationCost: number
  totalCost: number
}

export function estimateCost(tokens: TokenUsage): CostEstimate {
  const inputCost = (tokens.inputTokens / 1_000_000) * PRICING.input
  const outputCost = (tokens.outputTokens / 1_000_000) * PRICING.output
  const cacheReadCost = (tokens.cacheReadTokens / 1_000_000) * PRICING.cacheRead
  const cacheCreationCost = (tokens.cacheCreationTokens / 1_000_000) * PRICING.cacheCreation
  return {
    inputCost,
    outputCost,
    cacheReadCost,
    cacheCreationCost,
    totalCost: inputCost + outputCost + cacheReadCost + cacheCreationCost,
  }
}

export type SessionMetrics = {
  sessionId: string
  projectPath: string
  startTime: string
  endTime: string
  durationMinutes: number
  userMessageCount: number
  assistantMessageCount: number
  toolCounts: Record<string, number>
  languages: Record<string, number>
  linesAdded: number
  linesRemoved: number
  filesModified: Set<string>
  filesByCategory: {
    code: string[]       // .ts .py .tsx .js .go .rs etc
    docs: string[]       // .md .pptx .xlsx .docx .pdf .txt
    config: string[]     // .json .yaml .yml .env .toml .tf
    assets: string[]     // .html .css .svg .png .jpg
    other: string[]
  }
  gitCommits: number
  gitPushes: number
  bashCliTools: Record<string, number>  // CLI tools used inside Bash (git, docker, npm, etc.)
  toolErrors: number
  toolErrorCategories: Record<string, number>
  userPrompts: UserPrompt[]
  messageHours: number[]
  messageDays: string[]       // YYYY-MM-DD dates when messages occurred
  messageDayOfWeek: number[]  // 0=Sun ~ 6=Sat
  responseTimes: number[]     // seconds between assistant response and next user message
  tokens: TokenUsage
}

export type UserPrompt = {
  text: string
  timestamp: string
  index: number
}

// ============================================================================
// Language Detection
// ============================================================================

// ============================================================================
// File Categorization
// ============================================================================

const CODE_EXTS = new Set([
  // Web
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue', '.svelte', '.astro',
  // Backend
  '.py', '.rb', '.go', '.rs', '.java', '.kt', '.scala', '.clj',
  '.php', '.lua', '.ex', '.exs', '.erl', '.hs',
  // Systems
  '.c', '.cpp', '.cc', '.h', '.hpp', '.cs', '.swift', '.m', '.mm',
  // Mobile
  '.dart', '.gradle', '.kts',
  // Scripting
  '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd',
  // Data/ML
  '.r', '.R', '.jl', '.ipynb', '.sql',
  // Other
  '.proto', '.graphql', '.gql', '.wasm',
])
const DOC_EXTS = new Set([
  '.md', '.mdx', '.txt', '.rst', '.adoc', '.org',
  // Office
  '.pptx', '.ppt', '.xlsx', '.xls', '.docx', '.doc', '.odt', '.ods', '.odp',
  // Data docs
  '.csv', '.tsv', '.rtf', '.tex', '.bib',
  // PDF
  '.pdf',
  // Notebook
  '.ipynb',
])
const CONFIG_EXTS = new Set([
  '.json', '.jsonc', '.json5',
  '.yaml', '.yml',
  '.toml', '.ini', '.cfg', '.conf',
  '.env', '.env.local', '.env.production',
  '.tf', '.tfvars', '.hcl',
  '.lock', '.lockb',
  '.editorconfig', '.prettierrc', '.eslintrc',
  '.gitignore', '.dockerignore', '.npmrc',
  '.xml', '.plist',
])
const ASSET_EXTS = new Set([
  // Web
  '.html', '.htm', '.css', '.scss', '.sass', '.less', '.styl',
  // Images
  '.svg', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.avif', '.bmp',
  // Fonts
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  // Media
  '.mp3', '.mp4', '.wav', '.ogg', '.webm', '.mov', '.avi',
  // 3D/Design
  '.fig', '.sketch', '.xd', '.ai', '.psd', '.eps',
])

function categorizeFile(filePath: string): 'code' | 'docs' | 'config' | 'assets' | 'other' {
  const ext = extname(filePath).toLowerCase()
  if (CODE_EXTS.has(ext)) return 'code'
  if (DOC_EXTS.has(ext)) return 'docs'
  if (CONFIG_EXTS.has(ext)) return 'config'
  if (ASSET_EXTS.has(ext)) return 'assets'
  return 'other'
}

// ============================================================================
// Language Detection
// ============================================================================

const EXT_TO_LANG: Record<string, string> = {
  '.ts': 'TypeScript', '.tsx': 'TypeScript',
  '.js': 'JavaScript', '.jsx': 'JavaScript',
  '.py': 'Python',
  '.rb': 'Ruby',
  '.go': 'Go',
  '.rs': 'Rust',
  '.java': 'Java',
  '.kt': 'Kotlin',
  '.swift': 'Swift',
  '.cs': 'C#',
  '.cpp': 'C++', '.cc': 'C++', '.h': 'C++',
  '.c': 'C',
  '.md': 'Markdown',
  '.json': 'JSON',
  '.yaml': 'YAML', '.yml': 'YAML',
  '.sh': 'Shell', '.bash': 'Shell', '.zsh': 'Shell',
  '.css': 'CSS', '.scss': 'CSS',
  '.html': 'HTML',
  '.sql': 'SQL',
  '.vue': 'Vue',
  '.svelte': 'Svelte',
}

function detectLanguage(filePath: string): string | null {
  return EXT_TO_LANG[extname(filePath).toLowerCase()] ?? null
}

// ============================================================================
// Content Extraction Helpers
// ============================================================================

function extractTextFromContent(
  content: string | ContentBlock[],
): string {
  if (typeof content === 'string') return content
  return content
    .filter(b => b.type === 'text' && b.text)
    .map(b => b.text!)
    .join('\n')
}

function extractToolUseBlocks(content: string | ContentBlock[]): ContentBlock[] {
  if (typeof content === 'string') return []
  return content.filter(b => b.type === 'tool_use')
}

function extractToolResultBlocks(content: string | ContentBlock[]): ContentBlock[] {
  if (typeof content === 'string') return []
  return content.filter(b => b.type === 'tool_result')
}

// ============================================================================
// Error Classification
// ============================================================================

function classifyToolError(text: string): string {
  if (text.includes('exit code') || text.includes('Command failed')) return 'command_failed'
  if (text.includes('rejected') || text.includes('denied')) return 'user_rejected'
  if (text.includes('not found in file') || text.includes('string to replace')) return 'edit_failed'
  if (text.includes('changed since') || text.includes('modified')) return 'file_changed'
  if (text.includes('too large')) return 'file_too_large'
  if (text.includes('No such file') || text.includes('ENOENT')) return 'file_not_found'
  return 'other'
}

// ============================================================================
// Main Extractor
// ============================================================================

export function extractMetrics(
  sessionId: string,
  projectPath: string,
  messages: SessionMessage[],
  tz?: string,
): SessionMetrics {
  const metrics: SessionMetrics = {
    sessionId,
    projectPath,
    startTime: '',
    endTime: '',
    durationMinutes: 0,
    userMessageCount: 0,
    assistantMessageCount: 0,
    toolCounts: {},
    languages: {},
    linesAdded: 0,
    linesRemoved: 0,
    filesModified: new Set(),
    filesByCategory: { code: [], docs: [], config: [], assets: [], other: [] },
    gitCommits: 0,
    gitPushes: 0,
    bashCliTools: {},
    toolErrors: 0,
    toolErrorCategories: {},
    userPrompts: [],
    messageHours: [],
    messageDays: [],
    messageDayOfWeek: [],
    responseTimes: [],
    tokens: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0 },
  }

  let firstTimestamp: string | null = null
  let lastTimestamp: string | null = null
  let userPromptIndex = 0
  let lastAssistantTimestamp: string | null = null
  // Deduplicate token usage: streaming chunks share the same msg_id with cumulative usage
  const tokenUsageByMsgId = new Map<string, {
    input_tokens: number
    output_tokens: number
    cache_read_input_tokens: number
    cache_creation_input_tokens: number
  }>()

  for (const msg of messages) {
    // Track timestamps
    if (msg.timestamp) {
      if (!firstTimestamp) firstTimestamp = msg.timestamp
      lastTimestamp = msg.timestamp
    }

    if (!msg.message) continue
    const content = msg.message.content

    // --- User messages ---
    if (msg.type === 'user') {
      // Response time: gap between last assistant message and this user message
      if (lastAssistantTimestamp && msg.timestamp) {
        const assistMs = new Date(lastAssistantTimestamp).getTime()
        const userMs = new Date(msg.timestamp).getTime()
        if (!isNaN(assistMs) && !isNaN(userMs)) {
          const gapSec = (userMs - assistMs) / 1000
          // Filter: 2s minimum (ignore automated), 3600s max (ignore AFK)
          if (gapSec >= 2 && gapSec <= 3600) {
            metrics.responseTimes.push(Math.round(gapSec))
          }
        }
      }
      lastAssistantTimestamp = null  // reset until next assistant message

      const text = extractTextFromContent(content)
      if (text.trim()) {
        metrics.userMessageCount++
        metrics.userPrompts.push({
          text,
          timestamp: msg.timestamp || '',
          index: userPromptIndex++,
        })

        // Track hour + day distribution (in user's timezone)
        if (msg.timestamp) {
          const hour = getHourInTz(msg.timestamp, tz)
          if (hour !== null) metrics.messageHours.push(hour)

          const dow = getDayOfWeekInTz(msg.timestamp, tz)
          if (dow !== null) metrics.messageDayOfWeek.push(dow)

          const d = new Date(msg.timestamp)
          if (!isNaN(d.getTime())) {
            metrics.messageDays.push(dateToLocalString(d, tz))
          }
        }
      }

      // Check tool results for errors
      const toolResults = extractToolResultBlocks(content)
      for (const tr of toolResults) {
        if (tr.is_error) {
          metrics.toolErrors++
          const errorText = typeof tr.text === 'string' ? tr.text : ''
          const category = classifyToolError(errorText)
          metrics.toolErrorCategories[category] =
            (metrics.toolErrorCategories[category] || 0) + 1
        }
      }
    }

    // --- Assistant messages ---
    if (msg.type === 'assistant') {
      metrics.assistantMessageCount++
      if (msg.timestamp) lastAssistantTimestamp = msg.timestamp

      // Token usage from API response
      // IMPORTANT: JSONL logs each streaming content block (thinking, text, tool_use)
      // as a separate line with the SAME msg_id and SAME cumulative usage.
      // We must deduplicate by msg_id, keeping only the last (final) usage per response.
      const usage = (msg as any).message?.usage
      const msgId = (msg as any).message?.id
      if (usage && msgId) {
        tokenUsageByMsgId.set(msgId, {
          input_tokens: usage.input_tokens ?? 0,
          output_tokens: usage.output_tokens ?? 0,
          cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
          cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
        })
      }

      const toolUses = extractToolUseBlocks(content)
      for (const tu of toolUses) {
        const toolName = tu.name || 'unknown'
        metrics.toolCounts[toolName] = (metrics.toolCounts[toolName] || 0) + 1

        const input = tu.input || {}

        // Language detection from file paths
        const filePath =
          (input as Record<string, string>).file_path ||
          (input as Record<string, string>).path
        if (typeof filePath === 'string') {
          const lang = detectLanguage(filePath)
          if (lang) {
            metrics.languages[lang] = (metrics.languages[lang] || 0) + 1
          }

          // Track modified files + categorize
          if (toolName === 'Edit' || toolName === 'Write') {
            if (!metrics.filesModified.has(filePath)) {
              metrics.filesModified.add(filePath)
              const cat = categorizeFile(filePath)
              metrics.filesByCategory[cat].push(filePath)
            }
          }
        }

        // Lines changed estimation
        if (toolName === 'Edit') {
          const oldStr = (input as Record<string, string>).old_string || ''
          const newStr = (input as Record<string, string>).new_string || ''
          const oldLines = oldStr.split('\n').length
          const newLines = newStr.split('\n').length
          if (newLines > oldLines) metrics.linesAdded += newLines - oldLines
          if (oldLines > newLines) metrics.linesRemoved += oldLines - newLines
        }

        if (toolName === 'Write') {
          const writeContent = (input as Record<string, string>).content || ''
          metrics.linesAdded += writeContent.split('\n').length
        }

        // Git activity detection
        // Track individual skill names as separate tool entries
        if (toolName === 'Skill') {
          const skillName = (input as Record<string, string>).skill || 'unknown'
          const key = `Skill:${skillName}`
          metrics.toolCounts[key] = (metrics.toolCounts[key] || 0) + 1
        }

        // Track agent calls — prefer subagent_type (named plugin agents),
        // fall back to description (ad-hoc agents)
        if (toolName === 'Agent') {
          const subType = (input as Record<string, string>).subagent_type
          let agentKey: string
          if (subType && subType !== 'general-purpose' && subType !== 'none') {
            // Named agent (e.g., feature-dev:code-reviewer, Explore)
            agentKey = `Agent:${subType}`
          } else {
            // Ad-hoc agent — prefer name (addressable identifier), fall back to description
            const desc = (input as Record<string, string>).name
              || (input as Record<string, string>).description
              || 'ad-hoc'
            agentKey = `Agent:${desc.slice(0, 40)}`
          }
          metrics.toolCounts[agentKey] = (metrics.toolCounts[agentKey] || 0) + 1
        }

        if (toolName === 'Bash') {
          const command = (input as Record<string, string>).command || ''
          if (command.includes('git commit')) metrics.gitCommits++
          if (command.includes('git push')) metrics.gitPushes++

          // Extract CLI tool from first word of command
          const firstWord = command.trim().split(/[\s;|&]/)[0]?.replace(/^(cd|sudo|nohup|env)\s+/, '') || ''
          const cliTool = firstWord.split('/').pop() || ''  // handle full paths
          if (cliTool && cliTool.length > 1 && cliTool.length < 30 && !/^[.\/~$]/.test(cliTool)) {
            metrics.bashCliTools[cliTool] = (metrics.bashCliTools[cliTool] || 0) + 1
          }
        }
      }
    }
  }

  // Aggregate deduplicated token usage (last usage per unique msg_id)
  for (const usage of tokenUsageByMsgId.values()) {
    metrics.tokens.inputTokens += usage.input_tokens
    metrics.tokens.outputTokens += usage.output_tokens
    metrics.tokens.cacheReadTokens += usage.cache_read_input_tokens
    metrics.tokens.cacheCreationTokens += usage.cache_creation_input_tokens
  }

  // Calculate timing
  if (firstTimestamp) {
    metrics.startTime = firstTimestamp
    metrics.endTime = lastTimestamp || firstTimestamp
    if (lastTimestamp) {
      const startMs = new Date(firstTimestamp).getTime()
      const endMs = new Date(lastTimestamp).getTime()
      if (!isNaN(startMs) && !isNaN(endMs) && endMs >= startMs) {
        metrics.durationMinutes = Math.round((endMs - startMs) / 60000)
      }
    }
  }

  return metrics
}

// ============================================================================
// Aggregation across sessions
// ============================================================================

export type AggregatedMetrics = {
  totalSessions: number
  totalUserMessages: number
  totalAssistantMessages: number
  totalDurationMinutes: number
  toolCounts: Record<string, number>
  languages: Record<string, number>
  totalLinesAdded: number
  totalLinesRemoved: number
  totalFilesModified: number
  filesByCategory: { code: string[]; docs: string[]; config: string[]; assets: string[]; other: string[] }
  totalGitCommits: number
  bashCliTools: Record<string, number>
  totalToolErrors: number
  toolErrorCategories: Record<string, number>
  allUserPrompts: UserPrompt[]
  messageHours: number[]
  dateRange: { start: string; end: string }
  totalTokens: TokenUsage
  daysActive: number
  dayOfWeekCounts: number[]  // [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
  messagesPerDay: Record<string, number>
  concurrentPeriods: {
    maxConcurrent: number      // peak: max sessions running at the same time
    parallelMinutes: number    // total minutes where 2+ sessions overlapped
    totalMinutes: number       // total span of all sessions
    parallelPct: number        // parallelMinutes / totalMinutes * 100
  }
  toolCategories: Record<string, { count: number; tools: Record<string, number> }>
  responseTimeStats: {
    median: number
    average: number
    histogram: Record<string, number>  // "2-10s", "10-30s", "30s-1m", "1-2m", "2-5m", "5-15m", ">15m"
  }
}

// ============================================================================
// Tool Categorization
// ============================================================================

const TOOL_CATEGORIES: Array<{ name: string; match: (tool: string) => boolean }> = [
  { name: 'Core', match: t => ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'LS'].includes(t) },
  { name: 'Execution', match: t => t === 'Bash' || t === 'BashOutput' || t === 'KillShell' },
  { name: 'Agent', match: t => t === 'Agent' || t === 'SendMessage' || t.startsWith('Task') },
  { name: 'MCP', match: t => t.startsWith('mcp__') },
  { name: 'Web', match: t => t === 'WebSearch' || t === 'WebFetch' },
  { name: 'Notebook', match: t => t === 'NotebookEdit' || t === 'NotebookRead' },
]

export function categorizeTools(
  toolCounts: Record<string, number>,
): Record<string, { count: number; tools: Record<string, number> }> {
  const result: Record<string, { count: number; tools: Record<string, number> }> = {}

  for (const [tool, count] of Object.entries(toolCounts)) {
    const category = TOOL_CATEGORIES.find(c => c.match(tool))?.name ?? 'Other'
    if (!result[category]) result[category] = { count: 0, tools: {} }
    result[category]!.count += count
    result[category]!.tools[tool] = count
  }

  return result
}

// ============================================================================
// Concurrent Session Detection
// ============================================================================

export function detectConcurrentSessions(
  sessions: SessionMetrics[],
): { maxConcurrent: number; parallelMinutes: number; totalMinutes: number; parallelPct: number } {
  const timed = sessions
    .filter(s => s.startTime && s.durationMinutes > 0)
    .map(s => {
      const startMs = new Date(s.startTime).getTime()
      return { start: startMs, end: startMs + s.durationMinutes * 60_000 }
    })
    .filter(t => !isNaN(t.start))

  if (timed.length < 2) return { maxConcurrent: timed.length, parallelMinutes: 0, totalMinutes: 0, parallelPct: 0 }

  // Sweep line algorithm: find max concurrent and total parallel time
  const events: Array<{ time: number; delta: 1 | -1 }> = []
  for (const t of timed) {
    events.push({ time: t.start, delta: 1 })
    events.push({ time: t.end, delta: -1 })
  }
  events.sort((a, b) => a.time - b.time || a.delta - b.delta)

  let active = 0
  let maxConcurrent = 0
  let parallelMs = 0
  let lastTime = events[0]!.time

  for (const { time, delta } of events) {
    if (active >= 2) {
      parallelMs += time - lastTime  // time spent with 2+ sessions active
    }
    lastTime = time
    active += delta
    if (active > maxConcurrent) maxConcurrent = active
  }

  // Total span from earliest start to latest end
  const allStarts = timed.map(t => t.start)
  const allEnds = timed.map(t => t.end)
  const totalMs = Math.max(...allEnds) - Math.min(...allStarts)
  const totalMinutes = Math.round(totalMs / 60_000)
  const parallelMinutes = Math.round(parallelMs / 60_000)

  return {
    maxConcurrent,
    parallelMinutes,
    totalMinutes,
    parallelPct: totalMinutes > 0 ? Math.round((parallelMinutes / totalMinutes) * 100) : 0,
  }
}

export function aggregateMetrics(sessions: SessionMetrics[], tz?: string): AggregatedMetrics {
  const agg: AggregatedMetrics = {
    totalSessions: sessions.length,
    totalUserMessages: 0,
    totalAssistantMessages: 0,
    totalDurationMinutes: 0,
    toolCounts: {},
    languages: {},
    totalLinesAdded: 0,
    totalLinesRemoved: 0,
    totalFilesModified: 0,
    filesByCategory: { code: [], docs: [], config: [], assets: [], other: [] },
    totalGitCommits: 0,
    bashCliTools: {},
    totalToolErrors: 0,
    toolErrorCategories: {},
    allUserPrompts: [],
    messageHours: [],
    dateRange: { start: '', end: '' },
    totalTokens: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0 },
    daysActive: 0,
    dayOfWeekCounts: [0, 0, 0, 0, 0, 0, 0],
    messagesPerDay: {},
    concurrentPeriods: { maxConcurrent: 0, parallelMinutes: 0, totalMinutes: 0, parallelPct: 0 },
    toolCategories: {},
    responseTimeStats: { median: 0, average: 0, histogram: {} },
  }

  const allFiles = new Set<string>()
  const dates: string[] = []
  const allDays = new Set<string>()

  for (const s of sessions) {
    agg.totalUserMessages += s.userMessageCount
    agg.totalAssistantMessages += s.assistantMessageCount
    agg.totalDurationMinutes += s.durationMinutes
    agg.totalLinesAdded += s.linesAdded
    agg.totalLinesRemoved += s.linesRemoved
    agg.totalGitCommits += s.gitCommits
    for (const [cli, count] of Object.entries(s.bashCliTools)) {
      agg.bashCliTools[cli] = (agg.bashCliTools[cli] || 0) + count
    }
    agg.totalTokens.inputTokens += s.tokens.inputTokens
    agg.totalTokens.outputTokens += s.tokens.outputTokens
    agg.totalTokens.cacheReadTokens += s.tokens.cacheReadTokens
    agg.totalTokens.cacheCreationTokens += s.tokens.cacheCreationTokens
    agg.totalToolErrors += s.toolErrors

    for (const [tool, count] of Object.entries(s.toolCounts)) {
      agg.toolCounts[tool] = (agg.toolCounts[tool] || 0) + count
    }
    for (const [lang, count] of Object.entries(s.languages)) {
      agg.languages[lang] = (agg.languages[lang] || 0) + count
    }
    for (const [cat, count] of Object.entries(s.toolErrorCategories)) {
      agg.toolErrorCategories[cat] = (agg.toolErrorCategories[cat] || 0) + count
    }
    for (const file of s.filesModified) allFiles.add(file)

    agg.allUserPrompts.push(...s.userPrompts)
    agg.messageHours.push(...s.messageHours)

    for (const day of s.messageDays) {
      allDays.add(day)
      agg.messagesPerDay[day] = (agg.messagesPerDay[day] || 0) + 1
    }
    for (const dow of s.messageDayOfWeek) {
      agg.dayOfWeekCounts[dow]!++
    }

    if (s.startTime) dates.push(s.startTime)
  }

  agg.daysActive = allDays.size
  agg.totalFilesModified = allFiles.size

  // Aggregate file categories (deduplicate across sessions)
  const seenFiles = new Set<string>()
  for (const s of sessions) {
    for (const cat of ['code', 'docs', 'config', 'assets', 'other'] as const) {
      for (const f of s.filesByCategory[cat]) {
        if (!seenFiles.has(f)) {
          seenFiles.add(f)
          agg.filesByCategory[cat].push(f)
        }
      }
    }
  }
  agg.toolCategories = categorizeTools(agg.toolCounts)

  // Response time statistics
  const allResponseTimes = sessions.flatMap(s => s.responseTimes)
  if (allResponseTimes.length > 0) {
    const sorted = [...allResponseTimes].sort((a, b) => a - b)
    agg.responseTimeStats.median = sorted[Math.floor(sorted.length / 2)]!
    agg.responseTimeStats.average = Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length)

    const buckets: Array<[string, number, number]> = [
      ['2-10s', 2, 10], ['10-30s', 10, 30], ['30s-1m', 30, 60],
      ['1-2m', 60, 120], ['2-5m', 120, 300], ['5-15m', 300, 900], ['>15m', 900, Infinity],
    ]
    for (const [label, lo, hi] of buckets) {
      const count = allResponseTimes.filter(t => t >= lo && t < hi).length
      if (count > 0) agg.responseTimeStats.histogram[label] = count
    }
  }

  // dateRange: earliest startTime to latest endTime (not session start)
  const fmtDate = (iso: string) => {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso.slice(0, 16).replace('T', ' ')
    const opts: Intl.DateTimeFormatOptions = {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
      timeZone: tz,
    }
    return new Intl.DateTimeFormat('en-CA', opts).format(d).replace(',', '')
  }

  const startDates = sessions.map(s => s.startTime).filter(Boolean).sort()
  const endDates = sessions.map(s => s.endTime || s.startTime).filter(Boolean).sort()
  if (startDates.length > 0) {
    agg.dateRange.start = fmtDate(startDates[0]!)
    agg.dateRange.end = fmtDate(endDates[endDates.length - 1]!)
  }

  return agg
}
