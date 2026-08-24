/**
 * HTML Report Generator — creates self-contained recap report.
 * Independent implementation (no Claude Code source dependency).
 *
 * Two rendering paths:
 * 1. Legacy: generateHtmlReport(metrics, insights) — used by old LLM-writes-HTML flow
 * 2. New:    generateFullReport(metrics, narrative) — engine renders from NarrativeData JSON
 *            generateMarkdownReport(metrics, narrative) — engine renders Markdown from same JSON
 */

import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { getClaudeHome } from './session-scanner.js'
import type { AggregatedMetrics, UserPrompt, CostEstimate } from './metrics-extractor.js'
import { estimateCost } from './metrics-extractor.js'
import type { SessionFacet } from './facet-cache.js'

// ============================================================================
// Types
// ============================================================================

export type KeyPrompt = {
  original: string
  sessionDate: string
  whyImportant: string
  whatHappened: string
}

export type RecapInsights = {
  atAGlance: {
    whatsWorking: string
    whatsHindering: string
    quickWins: string
    learnings: string
  }
  keyPrompts: KeyPrompt[]
  otherPromptsSummary: string
  whatWorked: Array<{ title: string; description: string }>
  frictionPoints: Array<{ category: string; description: string; examples: string[] }>
  facetSummary: {
    outcomes: Record<string, number>
    helpfulness: Record<string, number>
    frictionTypes: Record<string, number>
  }
  suggestions?: {
    claudeMd: string[]          // CLAUDE.md additions to suggest
    featuresToTry: string[]     // Unused features to recommend
    usagePatterns: string[]     // Effective prompting patterns to reuse
  }
}

// ============================================================================
// NarrativeData — JSON schema the LLM generates, engine renders to HTML/MD
// ============================================================================

export type NarrativeData = {
  format: 'full' | 'standard' | 'minimal'
  atAGlance: {
    whatsWorking: string
    whatsHindering: string
    quickWins: string
    horizon: string  // full only
  }
  workDone: Array<{
    name: string       // project area name
    sessions: number
    description: string // goals + process + metrics
  }>
  resultsImpact: Array<{
    project: string
    outcomes: string
    impact: string
  }>
  howYouUseCC: {
    narrative: string   // 1-2 paragraphs
    keyPattern: string  // 1 sentence
  }
  highlights: Array<{
    title: string
    description: string
  }>
  learningsToShare?: string[]
  aiCollaborationTips?: string[]
  friction?: {
    categories: Array<{
      title: string
      description: string
      examples: string[]
    }>
    suggestions?: {
      claudeMd: Array<{ text: string; why: string }>
      featuresToTry?: Array<{ name: string; oneliner: string; why: string; code: string }>
      usagePatterns?: Array<{ name: string; summary: string; prompt: string }>
    }
  }
  keyPrompts: Array<{
    context: string    // why pivotal
    verbatim: string   // exact quote
    outcome: string    // what happened
  }>
  otherNotes?: string
  teamFeedback: {
    forTeam: string[]
    forAI: string[]
  }
  onTheHorizon?: Array<{
    title: string
    description: string
    tip: string
    prompt: string
  }>
  translations?: {
    // Translate enum labels to target language
    labels?: Record<string, string>  // e.g. "iterative_refinement" -> localized display label
    // Translate session goals from facet cache
    sessionGoals?: Record<string, string>  // sessionId → translated goal
    // Translate fixed UI text
    parallelWork?: string   // e.g. "Peak 3 sessions at once; 45% of work time was parallel"
    costNote?: string       // e.g. "Cache reads are ~90% cheaper per token, but ..."
    costSummary?: string    // e.g. "Total: ~$8,912 · saved $8,712 vs Max $200/mo (45x ROI)"
  }
}

// ============================================================================
// Scan data shape (passed alongside narrative for rendering)
// ============================================================================

export type ScanData = {
  sessions: number
  messages: number
  durationMinutes: number
  toolCounts: Record<string, number>
  languages: Record<string, number>
  linesAdded: number
  linesRemoved: number
  filesModified: number
  gitCommits: number
  toolErrors: number
  tokens: {
    input: number
    output: number
    cacheRead: number
    cacheCreation: number
    used: number
    cached: number
    total: number
    estimatedCost: CostEstimate
  }
  daysActive: number
  dayOfWeekCounts: number[]
  concurrentPeriods: { maxConcurrent: number; parallelMinutes: number; totalMinutes: number; parallelPct: number }
  toolCategories: Record<string, { count: number; tools: Record<string, number> }>
  responseTimeStats: {
    median: number
    average: number
    histogram: Record<string, number>
  }
  timezone?: string
  dateRange: { start: string; end: string }
  requestedRange?: { from: string; to: string }
  activityRange?: { start: string; end: string }
  projectBreakdown?: Array<{ path: string; sessions: number; hours: number; messages: number }>
  userName?: string
  messagesPerDay?: Record<string, number>
  messageHours?: number[]
  toolErrorCategories?: Record<string, number>
  // Facet aggregates (computed from individual facets)
  facets?: {
    outcomes: Record<string, number>
    helpfulness: Record<string, number>
    frictionTypes: Record<string, number>
    satisfaction: Record<string, number>
    sessionTypes: Record<string, number>
    successFactors: Record<string, number>
    goalCategories: Record<string, number>
    sessions: Array<{
      id: string
      goal: string
      outcome: string
      helpfulness: string
      satisfaction: string
      frictionTypes: string[]
    }>
  }
}

// ============================================================================
// Label Map (human-readable names for chart labels)
// ============================================================================

const LABEL_MAP: Record<string, string> = {
  // Outcomes (best → worst)
  fully_achieved: 'Fully Achieved',
  mostly_achieved: 'Mostly Achieved',
  partially_achieved: 'Partially Achieved',
  not_achieved: 'Not Achieved',
  // Satisfaction (best → worst)
  happy: 'Happy',
  satisfied: 'Satisfied',
  likely_satisfied: 'Likely Satisfied',
  dissatisfied: 'Dissatisfied',
  frustrated: 'Frustrated',
  // Helpfulness (best → worst)
  essential: 'Essential',
  very_helpful: 'Very Helpful',
  moderately_helpful: 'Moderately Helpful',
  slightly_helpful: 'Slightly Helpful',
  unhelpful: 'Unhelpful',
  // Session types
  iterative_refinement: 'Iterative Refinement',
  multi_task: 'Multi-Task',
  exploration: 'Exploration',
  quick_question: 'Quick Question',
  autonomous_pipeline: 'Autonomous Pipeline',
  // Friction types
  misunderstood_request: 'Misunderstood Request',
  wrong_approach: 'Wrong Approach',
  buggy_code: 'Buggy Code',
  user_rejected_action: 'User Rejected Action',
  excessive_changes: 'Excessive Changes',
  // Error categories
  command_failed: 'Command Failed',
  user_rejected: 'User Rejected',
  edit_failed: 'Edit Failed',
  file_changed: 'File Changed',
  file_too_large: 'File Too Large',
  file_not_found: 'File Not Found',
}

// Fixed sort orders for level-based charts (best → worst)
const OUTCOME_ORDER = ['fully_achieved', 'mostly_achieved', 'partially_achieved', 'not_achieved']
const SATISFACTION_ORDER = ['happy', 'satisfied', 'likely_satisfied', 'dissatisfied', 'frustrated']
const HELPFULNESS_ORDER = ['essential', 'very_helpful', 'moderately_helpful', 'slightly_helpful', 'unhelpful']

/**
 * Render a bar chart with fixed sort order (for outcomes, satisfaction, helpfulness).
 * Only includes items that exist in the data.
 */
function renderOrderedBarChart(
  data: Record<string, number>,
  order: string[],
  color: string,
  labelFn: (key: string) => string,
): string {
  const entries = order
    .filter(key => (data[key] ?? 0) > 0)
    .map(key => [labelFn(key), data[key]!] as [string, number])
  if (entries.length === 0) return '<p class="section-intro">No data</p>'
  const maxVal = Math.max(...entries.map(e => e[1]))
  return entries
    .map(([label, count]) => {
      const pct = maxVal > 0 ? (count / maxVal) * 100 : 0
      return `<div class="bar-row">
        <div class="bar-label" style="width:130px">${escapeHtml(label)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
        <div class="bar-value">${fmtNum(count)}</div>
      </div>`
    })
    .join('\n')
}

function humanLabel(key: string): string {
  return LABEL_MAP[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ============================================================================
// Chart Generation (pure CSS, no JS libraries)
// ============================================================================

function barChart(
  data: Record<string, number>,
  color: string,
  maxItems = 6,
): string {
  const entries = Object.entries(data)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxItems)

  if (entries.length === 0) return '<p class="empty">No data</p>'

  const maxVal = Math.max(...entries.map(e => e[1]))
  return entries
    .map(([label, count]) => {
      const pct = (count / maxVal) * 100
      return `<div class="bar-row">
        <div class="bar-label">${escapeHtml(humanLabel(label))}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
        <div class="bar-value">${fmtNum(count)}</div>
      </div>`
    })
    .join('\n')
}

function timeOfDayChart(hours: number[]): string {
  if (hours.length === 0) return '<p class="empty">No data</p>'

  const periods = [
    { label: 'Morning (6-12)', range: [6, 7, 8, 9, 10, 11] },
    { label: 'Afternoon (12-18)', range: [12, 13, 14, 15, 16, 17] },
    { label: 'Evening (18-24)', range: [18, 19, 20, 21, 22, 23] },
    { label: 'Night (0-6)', range: [0, 1, 2, 3, 4, 5] },
  ]

  const hourCounts: Record<number, number> = {}
  for (const h of hours) hourCounts[h] = (hourCounts[h] || 0) + 1

  const periodCounts = periods.map(p => ({
    label: p.label,
    count: p.range.reduce((sum, h) => sum + (hourCounts[h] || 0), 0),
  }))
  const maxVal = Math.max(...periodCounts.map(p => p.count)) || 1

  return periodCounts
    .map(
      p => `<div class="bar-row">
        <div class="bar-label">${p.label}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(p.count / maxVal) * 100}%;background:#8b5cf6"></div></div>
        <div class="bar-value">${p.count}</div>
      </div>`,
    )
    .join('\n')
}

function dayOfWeekChart(counts: number[]): string {
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const maxVal = Math.max(...counts) || 1
  if (counts.every(c => c === 0)) return '<p class="empty">No data</p>'

  return labels
    .map((label, i) => {
      const count = counts[i]!
      return `<div class="bar-row">
        <div class="bar-label">${label}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(count / maxVal) * 100}%;background:#06b6d4"></div></div>
        <div class="bar-value">${fmtNum(count)}</div>
      </div>`
    })
    .join('\n')
}

/** Strip home directory prefix from project hash for display.
 *  macOS:  "-Users-taehyoungkim-Documents-DEV-noul" → "~/Documents-DEV-noul"
 *  Linux:  "-home-username-projects-noul" → "~/projects-noul"
 *  Windows: "-C-Users-username-Documents-noul" → "~/Documents-noul"
 *  Unknown: "-foo-bar" → "foo-bar" */
function shortProjectPath(hash: string): string {
  const raw = hash.replace(/^-/, '')
  const parts = raw.split('-')

  // macOS: Users-username-...
  if (parts.length > 2 && parts[0] === 'Users') {
    return '~/' + parts.slice(2).join('-')
  }
  // Linux: home-username-...
  if (parts.length > 2 && parts[0] === 'home') {
    return '~/' + parts.slice(2).join('-')
  }
  // Windows: C-Users-username-...
  if (parts.length > 3 && parts[0]?.length === 1 && parts[1] === 'Users') {
    return '~/' + parts.slice(3).join('-')
  }

  return raw || '~'
}

function escapeHtml(text: string): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

// ============================================================================
// HTML Report
// ============================================================================

export function generateHtmlReport(
  metrics: AggregatedMetrics,
  insights: RecapInsights,
): string {
  const hours = (metrics.totalDurationMinutes / 60).toFixed(1)
  const usedTokens = metrics.totalTokens.inputTokens + metrics.totalTokens.outputTokens
  const cachedTokens = metrics.totalTokens.cacheReadTokens + metrics.totalTokens.cacheCreationTokens
  const formatTokens = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : `${n}`
  const tokenDisplay = `${formatTokens(usedTokens)} used`

  const topTools = Object.entries(metrics.toolCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([n, c]) => `${n}(${c})`)
    .join(', ')

  const keyPromptsHtml = insights.keyPrompts.length > 0
    ? insights.keyPrompts
        .map(
          kp => `
        <div class="key-prompt-card">
          <div class="prompt-meta">${escapeHtml(kp.sessionDate)} — ${escapeHtml(kp.whyImportant)}</div>
          <blockquote class="verbatim-prompt">${escapeHtml(kp.original)}</blockquote>
          <div class="prompt-outcome">→ ${escapeHtml(kp.whatHappened)}</div>
        </div>`,
        )
        .join('\n')
    : '<p class="empty">No key prompts identified</p>'

  const frictionHtml = insights.frictionPoints.length > 0
    ? insights.frictionPoints
        .map(
          fp => `
        <div class="friction-card">
          <div class="friction-title">${escapeHtml(fp.category)}</div>
          <div class="friction-desc">${escapeHtml(fp.description)}</div>
          <ul>${fp.examples.map(e => `<li>${escapeHtml(e)}</li>`).join('')}</ul>
        </div>`,
        )
        .join('\n')
    : ''

  const whatWorkedHtml = insights.whatWorked.length > 0
    ? insights.whatWorked
        .map(
          w => `
        <div class="win-card">
          <div class="win-title">${escapeHtml(w.title)}</div>
          <div class="win-desc">${escapeHtml(w.description)}</div>
        </div>`,
        )
        .join('\n')
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>AI Collaboration Recap</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; color: #1e293b; line-height: 1.6; padding: 24px; max-width: 900px; margin: 0 auto; }
  h1 { font-size: 28px; margin-bottom: 8px; }
  h2 { font-size: 20px; margin: 32px 0 16px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
  .stats-row { display: flex; gap: 16px; flex-wrap: wrap; margin: 16px 0; }
  .stat-card { background: white; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; min-width: 120px; text-align: center; }
  .stat-value { font-size: 24px; font-weight: 700; color: #3b82f6; }
  .stat-label { font-size: 12px; color: #64748b; }
  .at-a-glance { background: #fffbeb; border: 1px solid #fbbf24; border-radius: 8px; padding: 20px; margin: 24px 0; }
  .glance-title { font-size: 18px; font-weight: 700; margin-bottom: 12px; }
  .glance-section { margin-bottom: 8px; }
  .key-prompt-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
  .prompt-meta { font-size: 13px; color: #64748b; margin-bottom: 8px; }
  .verbatim-prompt { border-left: 3px solid #3b82f6; padding: 8px 16px; margin: 8px 0; background: #f8fafc; font-style: italic; white-space: pre-wrap; }
  .prompt-outcome { font-size: 14px; color: #475569; }
  .other-prompts { background: #f1f5f9; padding: 16px; border-radius: 8px; margin-top: 16px; }
  .friction-card { background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
  .friction-title { font-weight: 700; color: #dc2626; }
  .win-card { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
  .win-title { font-weight: 700; color: #16a34a; }
  .charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0; }
  .chart-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
  .chart-title { font-weight: 700; font-size: 14px; margin-bottom: 12px; }
  .bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .bar-label { width: 140px; font-size: 13px; text-align: right; flex-shrink: 0; }
  .bar-track { flex: 1; height: 20px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
  .bar-value { width: 40px; font-size: 13px; font-weight: 600; }
  .empty { color: #94a3b8; font-style: italic; }
  .copy-btn { background: #3b82f6; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; }
  .copy-btn:hover { background: #2563eb; }
  details { margin: 8px 0; }
  summary { cursor: pointer; font-weight: 600; }
  @media (max-width: 600px) { .charts-row { grid-template-columns: 1fr; } .stats-row { flex-direction: column; } }
</style>
</head>
<body>
  <h1>AI Collaboration Recap</h1>
  <p>${escapeHtml(metrics.dateRange.start)} to ${escapeHtml(metrics.dateRange.end)}</p>

  <div class="stats-row">
    <div class="stat-card"><div class="stat-value">${metrics.totalSessions}</div><div class="stat-label">Sessions</div></div>
    <div class="stat-card"><div class="stat-value">${metrics.totalUserMessages}</div><div class="stat-label">Messages</div></div>
    <div class="stat-card"><div class="stat-value">${hours}h</div><div class="stat-label">Duration</div></div>
    <div class="stat-card"><div class="stat-value">${metrics.totalGitCommits}</div><div class="stat-label">Commits</div></div>
    <div class="stat-card"><div class="stat-value">+${metrics.totalLinesAdded}/-${metrics.totalLinesRemoved}</div><div class="stat-label">Lines</div></div>
    <div class="stat-card"><div class="stat-value">${tokenDisplay}</div><div class="stat-label">Tokens</div></div>
    <div class="stat-card"><div class="stat-value">${metrics.daysActive}</div><div class="stat-label">Days Active</div></div>${metrics.concurrentPeriods.maxConcurrent > 1 ? `
    <div class="stat-card"><div class="stat-value">${metrics.concurrentPeriods.maxConcurrent}</div><div class="stat-label">Peak Parallel</div></div>` : ''}
  </div>

  <div class="at-a-glance">
    <div class="glance-title">At a Glance</div>
    <div class="glance-section"><strong>What's working:</strong> ${escapeHtml(insights.atAGlance.whatsWorking)}</div>
    <div class="glance-section"><strong>What's hindering:</strong> ${escapeHtml(insights.atAGlance.whatsHindering)}</div>
    <div class="glance-section"><strong>Quick wins:</strong> ${escapeHtml(insights.atAGlance.quickWins)}</div>
    <div class="glance-section"><strong>Learnings:</strong> ${escapeHtml(insights.atAGlance.learnings)}</div>
  </div>

  <h2>Key Prompts That Shaped Your Work</h2>
  ${keyPromptsHtml}
  ${insights.otherPromptsSummary ? `<div class="other-prompts"><strong>Other prompts:</strong> ${escapeHtml(insights.otherPromptsSummary)}</div>` : ''}

  ${whatWorkedHtml ? `<h2>What Worked Well</h2>${whatWorkedHtml}` : ''}

  ${frictionHtml ? `<h2>Friction Points</h2>${frictionHtml}` : ''}

  ${insights.suggestions ? `<h2>Suggestions</h2>
  ${insights.suggestions.claudeMd.length > 0 ? `
  <div style="background:#f0f9ff;border:1px solid #7dd3fc;border-radius:8px;padding:16px;margin-bottom:12px">
    <div style="font-weight:700;color:#0284c7;margin-bottom:8px">CLAUDE.md Additions</div>
    <div style="font-size:13px;color:#64748b;margin-bottom:8px">Add these to your CLAUDE.md for better AI collaboration:</div>
    ${insights.suggestions.claudeMd.map(s => `<div style="margin:4px 0"><label style="cursor:pointer"><input type="checkbox" class="claude-md-item" style="margin-right:8px">${escapeHtml(s)}</label></div>`).join('')}
    <button class="copy-btn" style="margin-top:8px" onclick="copyCheckedClaudeMd()">Copy Checked</button>
  </div>` : ''}
  ${insights.suggestions.featuresToTry.length > 0 ? `
  <div style="background:#fefce8;border:1px solid #fde047;border-radius:8px;padding:16px;margin-bottom:12px">
    <div style="font-weight:700;color:#a16207;margin-bottom:8px">Features to Try</div>
    <ul style="margin:0;padding-left:20px">${insights.suggestions.featuresToTry.map(f => `<li>${escapeHtml(f)}</li>`).join('')}</ul>
  </div>` : ''}
  ${insights.suggestions.usagePatterns.length > 0 ? `
  <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin-bottom:12px">
    <div style="font-weight:700;color:#16a34a;margin-bottom:8px">Effective Patterns to Reuse</div>
    <ul style="margin:0;padding-left:20px">${insights.suggestions.usagePatterns.map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ul>
  </div>` : ''}` : ''}

  <h2>Stats</h2>
  <div class="charts-row">
    <div class="chart-card">
      <div class="chart-title">Tools by Category</div>
      ${(() => {
        const catColors: Record<string, string> = { Core: '#3b82f6', Execution: '#f59e0b', Agent: '#8b5cf6', MCP: '#06b6d4', Web: '#10b981', Notebook: '#ec4899', Other: '#94a3b8' }
        const cats = Object.entries(metrics.toolCategories).sort((a, b) => b[1].count - a[1].count)
        const maxCat = Math.max(...cats.map(c => c[1].count)) || 1
        return cats.map(([name, { count }]) =>
          `<div class="bar-row"><div class="bar-label">${escapeHtml(name)}</div><div class="bar-track"><div class="bar-fill" style="width:${(count / maxCat) * 100}%;background:${catColors[name] || '#94a3b8'}"></div></div><div class="bar-value">${count}</div></div>`
        ).join('\n')
      })()}
      ${['MCP', 'Web', 'Agent'].filter(c => metrics.toolCategories[c]?.count).map(c =>
        `<span style="display:inline-block;background:${c === 'MCP' ? '#06b6d4' : c === 'Web' ? '#10b981' : '#8b5cf6'};color:white;padding:2px 8px;border-radius:4px;font-size:12px;margin:4px 4px 0 0">${c} active</span>`
      ).join('')}
    </div>
    <div class="chart-card">
      <div class="chart-title">Languages</div>
      ${barChart(metrics.languages, '#10b981')}
    </div>
  </div>
  <div class="charts-row">
    <div class="chart-card">
      <div class="chart-title">Time of Day</div>
      ${timeOfDayChart(metrics.messageHours)}
    </div>
    <div class="chart-card">
      <div class="chart-title">Assessment</div>
      ${barChart(insights.facetSummary.outcomes, '#f59e0b')}
    </div>
  </div>
  <div class="charts-row">
    <div class="chart-card">
      <div class="chart-title">Day of Week</div>
      ${dayOfWeekChart(metrics.dayOfWeekCounts)}
    </div>
    <div class="chart-card">
      <div class="chart-title">Messages per Day</div>
      ${barChart(metrics.messagesPerDay, '#8b5cf6', 10)}
    </div>
  </div>

  <script>
  function copyText(btn) {
    const code = btn.previousElementSibling;
    navigator.clipboard.writeText(code.textContent).then(() => {
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = 'Copy', 1500);
    });
  }
  function copyCheckedClaudeMd() {
    const items = document.querySelectorAll('.claude-md-item:checked');
    const text = Array.from(items).map(cb => cb.parentElement.textContent.trim()).join('\\n');
    if (!text) { alert('No items checked'); return; }
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.querySelector('[onclick="copyCheckedClaudeMd()"]');
      if (btn) { btn.textContent = 'Copied!'; setTimeout(() => btn.textContent = 'Copy Checked', 1500); }
    });
  }
  </script>
</body>
</html>`
}

// ============================================================================
// Save Report
// ============================================================================

export async function saveReport(html: string): Promise<string> {
  const dir = join(getClaudeHome(), 'recap-reports')
  await mkdir(dir, { recursive: true })
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace('T', '_')
    .slice(0, 15)
  const filePath = join(dir, `recap-${timestamp}.html`)
  await writeFile(filePath, html, { encoding: 'utf-8', mode: 0o600 })
  return filePath
}

// ============================================================================
// Full CSS from style guide
// ============================================================================

const FULL_CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #f8fafc; color: #334155; line-height: 1.65; padding: 48px 24px; }
.container { max-width: 800px; margin: 0 auto; }
h1 { font-size: 32px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
h2 { font-size: 20px; font-weight: 600; color: #0f172a; margin-top: 48px; margin-bottom: 16px; }
.subtitle { color: #64748b; font-size: 15px; margin-bottom: 32px; }
.section-intro { font-size: 14px; color: #64748b; margin-bottom: 16px; }

.nav-toc { display: flex; flex-wrap: wrap; gap: 8px; margin: 24px 0 32px 0; padding: 16px; background: white; border-radius: 8px; border: 1px solid #e2e8f0; }
.nav-toc a { font-size: 12px; color: #64748b; text-decoration: none; padding: 6px 12px; border-radius: 6px; background: #f1f5f9; transition: all 0.15s; }
.nav-toc a:hover { background: #e2e8f0; color: #334155; }

.stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 12px; margin-bottom: 40px; }
.stat { text-align: center; background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 8px; }
.stat-value { font-size: 28px; font-weight: 700; color: #0f172a; line-height: 1.2; }
.stat-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; }

.at-a-glance { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 1px solid #f59e0b; border-radius: 12px; padding: 20px 24px; margin-bottom: 32px; }
.glance-title { font-size: 16px; font-weight: 700; color: #92400e; margin-bottom: 16px; }
.glance-section { font-size: 14px; color: #78350f; line-height: 1.6; margin-bottom: 12px; }
.glance-section strong { color: #92400e; }
.see-more { color: #b45309; text-decoration: none; font-size: 13px; }

.project-area { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
.area-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.area-name { font-weight: 600; font-size: 15px; color: #0f172a; }
.area-count { font-size: 12px; color: #64748b; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; }
.area-desc { font-size: 14px; color: #475569; line-height: 1.5; }

.narrative { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
.narrative p { margin-bottom: 12px; font-size: 14px; color: #475569; line-height: 1.7; }
.key-insight { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; margin-top: 12px; font-size: 14px; color: #166534; }

.big-win { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
.big-win-title { font-weight: 600; font-size: 15px; color: #166534; margin-bottom: 8px; }
.big-win-desc { font-size: 14px; color: #15803d; line-height: 1.5; }

.friction-category { background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
.friction-title { font-weight: 600; font-size: 15px; color: #991b1b; margin-bottom: 6px; }
.friction-desc { font-size: 13px; color: #7f1d1d; margin-bottom: 10px; }
.friction-examples { margin: 0 0 0 20px; font-size: 13px; color: #334155; }

.claude-md-section { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
.claude-md-item { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 8px; padding: 10px 0; border-bottom: 1px solid #dbeafe; }
.cmd-code { background: white; padding: 8px 12px; border-radius: 4px; font-size: 12px; color: #1e40af; border: 1px solid #bfdbfe; font-family: monospace; flex: 1; white-space: pre-wrap; }
.cmd-why { font-size: 12px; color: #64748b; width: 100%; padding-left: 24px; margin-top: 4px; }

.feature-card { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
.pattern-card { background: #f0f9ff; border: 1px solid #7dd3fc; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
.horizon-card { background: linear-gradient(135deg, #faf5ff 0%, #f5f3ff 100%); border: 1px solid #c4b5fd; border-radius: 8px; padding: 16px; margin-bottom: 12px; }

.feature-title, .pattern-title { font-weight: 600; font-size: 15px; color: #0f172a; margin-bottom: 6px; }
.horizon-title { font-weight: 600; font-size: 15px; color: #5b21b6; margin-bottom: 8px; }

.copyable-prompt { background: #f8fafc; padding: 10px 12px; border-radius: 4px; font-family: monospace; font-size: 12px; color: #334155; border: 1px solid #e2e8f0; white-space: pre-wrap; }
.copy-btn { background: #e2e8f0; border: none; border-radius: 4px; padding: 4px 8px; font-size: 11px; cursor: pointer; color: #475569; }
.copy-btn:hover { background: #cbd5e1; }

.feedback-section { margin-top: 16px; }
.feedback-section h3 { font-size: 14px; font-weight: 600; color: #475569; margin-bottom: 12px; }
.feedback-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
.feedback-card.team-card { background: #eff6ff; border-color: #bfdbfe; }
.feedback-card.model-card { background: #faf5ff; border-color: #e9d5ff; }
.feedback-title { font-weight: 600; font-size: 14px; color: #0f172a; margin-bottom: 6px; }
.feedback-detail { font-size: 13px; color: #475569; line-height: 1.5; }

.chart-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
.chart-title { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 12px; }
.charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 24px 0; }
.bar-row { display: flex; align-items: center; margin-bottom: 6px; }
.bar-label { width: 100px; font-size: 11px; color: #475569; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bar-track { flex: 1; height: 6px; background: #f1f5f9; border-radius: 3px; margin: 0 8px; }
.bar-fill { height: 100%; border-radius: 3px; }
.bar-value { width: 28px; font-size: 11px; font-weight: 500; color: #64748b; text-align: right; }

.fun-ending { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 1px solid #fbbf24; border-radius: 12px; padding: 24px; margin-top: 40px; text-align: center; }
.fun-headline { font-size: 18px; font-weight: 600; color: #78350f; margin-bottom: 8px; }
.fun-detail { font-size: 14px; color: #92400e; }


.assessment-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.assessment-table th { text-align: left; padding: 8px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-weight: 600; font-size: 11px; text-transform: uppercase; }
.assessment-table td { padding: 8px; border-bottom: 1px solid #f1f5f9; }
.badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
.badge-green { background: #dcfce7; color: #166534; }
.badge-yellow { background: #fef9c3; color: #854d0e; }
.badge-orange { background: #ffedd5; color: #9a3412; }
.badge-red { background: #fee2e2; color: #991b1b; }
.badge-blue { background: #dbeafe; color: #1e40af; }
.badge-purple { background: #f3e8ff; color: #6b21a8; }

.narrative ul { margin: 0 0 0 20px; padding: 0; }
.narrative ul li { font-size: 14px; color: #475569; line-height: 1.7; margin-bottom: 10px; }

.results-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
.results-project { font-weight: 600; font-size: 15px; color: #0f172a; margin-bottom: 6px; }
.results-outcomes { font-size: 14px; color: #475569; line-height: 1.5; margin-bottom: 4px; }
.results-impact { font-size: 13px; color: #64748b; font-style: italic; }

@media (max-width: 640px) { .charts-row { grid-template-columns: 1fr; } .stats-row { justify-content: center; } }
`

const FULL_JS = `
function copyText(btn) {
  const code = btn.previousElementSibling;
  navigator.clipboard.writeText(code.textContent).then(() => {
    btn.textContent = 'Copied!'; setTimeout(() => btn.textContent = 'Copy', 2000);
  });
}

function copyAllCheckedClaudeMd() {
  const checkboxes = document.querySelectorAll('.cmd-checkbox:checked');
  const texts = Array.from(checkboxes).map(cb => cb.dataset.text).filter(Boolean);
  navigator.clipboard.writeText(texts.join('\\n')).then(() => {
    const btn = document.querySelector('.copy-all-btn');
    if (btn) { btn.textContent = 'Copied!'; setTimeout(() => btn.textContent = 'Copy All Checked', 2000); }
  });
}

// toggleCollapsible removed — all sections always visible
function _unused_toggleCollapsible(header) {
  header.classList.toggle('open');
  header.nextElementSibling.classList.toggle('open');
}
`

// ============================================================================
// Helpers for new renderer
// ============================================================================

function fmtNum(n: number): string {
  return Math.floor(n).toLocaleString('en-US')
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`
  return fmtNum(n)
}

function fmtCost(n: number): string {
  if (n >= 1) return `$${fmtNum(n)}`
  return `$${n.toFixed(2)}`
}

// Force enum values — if free text slipped through, map to closest
function normalizeOutcomeForDisplay(v: string): string {
  if (OUTCOME_ORDER.includes(v)) return v
  const l = v.toLowerCase()
  if (l.includes('fully') || l.includes('complete')) return 'fully_achieved'
  if (l.includes('most')) return 'mostly_achieved'
  if (l.includes('partial')) return 'partially_achieved'
  return 'not_achieved'
}
function normalizeHelpfulnessForDisplay(v: string): string {
  if (HELPFULNESS_ORDER.includes(v)) return v
  const l = v.toLowerCase()
  if (l.includes('essential')) return 'essential'
  if (l.includes('very')) return 'very_helpful'
  if (l.includes('moderate')) return 'moderately_helpful'
  if (l.includes('slight')) return 'slightly_helpful'
  return 'moderately_helpful' // safe default
}
function normalizeSatisfactionForDisplay(v: string): string {
  if (SATISFACTION_ORDER.includes(v)) return v
  const l = v.toLowerCase()
  if (l.includes('happy') || l.includes('high')) return 'happy'
  if (l.includes('satisfied') && !l.includes('dis') && !l.includes('likely')) return 'satisfied'
  if (l.includes('likely') || l.includes('moderate') || l.includes('mixed')) return 'likely_satisfied'
  if (l.includes('dissatisfied') || l.includes('low')) return 'dissatisfied'
  if (l.includes('frustrated')) return 'frustrated'
  return 'likely_satisfied'
}

function outcomeBadgeClass(outcome: string): string {
  switch (outcome) {
    case 'fully_achieved': return 'badge-green'
    case 'mostly_achieved': return 'badge-yellow'
    case 'partially_achieved': return 'badge-orange'
    case 'not_achieved': return 'badge-red'
    default: return 'badge-blue'
  }
}

function helpfulnessBadgeClass(h: string): string {
  switch (h) {
    case 'essential': return 'badge-green'
    case 'very_helpful': return 'badge-green'
    case 'moderately_helpful': return 'badge-yellow'
    case 'slightly_helpful': return 'badge-orange'
    case 'unhelpful': return 'badge-red'
    default: return 'badge-blue'
  }
}

function satisfactionBadgeClass(s: string): string {
  switch (s) {
    case 'happy': case 'satisfied': return 'badge-green'
    case 'likely_satisfied': return 'badge-yellow'
    case 'dissatisfied': return 'badge-orange'
    case 'frustrated': return 'badge-red'
    default: return 'badge-blue'
  }
}

function renderBarChartStyleGuide(
  data: Record<string, number>,
  color: string,
  maxItems = 8,
  labelFn: (key: string) => string = humanLabel,
): string {
  const entries = Object.entries(data)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxItems)
  if (entries.length === 0) return '<p class="section-intro">No data</p>'
  const maxVal = Math.max(...entries.map(e => e[1]))
  return entries
    .map(([label, count]) => {
      const pct = maxVal > 0 ? (count / maxVal) * 100 : 0
      return `<div class="bar-row">
        <div class="bar-label">${escapeHtml(labelFn(label))}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
        <div class="bar-value">${fmtNum(count)}</div>
      </div>`
    })
    .join('\n')
}

function renderTimeOfDayStyleGuide(hours: number[]): string {
  if (!hours || hours.length === 0) return '<p class="section-intro">No data</p>'
  // 2-hour blocks from 0:00
  const blocks: Array<{ label: string; start: number; end: number }> = []
  for (let h = 0; h < 24; h += 2) {
    const s = String(h).padStart(2, '0')
    const e = String(h + 2).padStart(2, '0')
    blocks.push({ label: `${s}-${e}`, start: h, end: h + 2 })
  }
  const hourCounts: Record<number, number> = {}
  for (const h of hours) hourCounts[h] = (hourCounts[h] || 0) + 1
  const blockCounts = blocks.map(b => ({
    label: b.label,
    count: (hourCounts[b.start] || 0) + (hourCounts[b.start + 1] || 0),
  }))
  const maxVal = Math.max(...blockCounts.map(b => b.count)) || 1
  return blockCounts
    .map(b => `<div class="bar-row">
      <div class="bar-label">${b.label}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(b.count / maxVal) * 100}%;background:#8b5cf6"></div></div>
      <div class="bar-value">${fmtNum(b.count)}</div>
    </div>`)
    .join('\n')
}

function renderDayOfWeekStyleGuide(counts: number[]): string {
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const maxVal = Math.max(...counts) || 1
  if (counts.every(c => c === 0)) return '<p class="section-intro">No data</p>'
  return labels
    .map((label, i) => {
      const count = counts[i]!
      return `<div class="bar-row">
        <div class="bar-label">${label}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(count / maxVal) * 100}%;background:#06b6d4"></div></div>
        <div class="bar-value">${fmtNum(count)}</div>
      </div>`
    })
    .join('\n')
}

function renderResponseTimeHistogram(stats: ScanData['responseTimeStats']): string {
  if (!stats || Object.keys(stats.histogram).length === 0) return ''
  const html = renderBarChartStyleGuide(stats.histogram, '#6366f1')
  return `<div class="chart-card">
    <div class="chart-title">Response Time Distribution</div>
    ${html}
    <div style="font-size: 12px; color: #64748b; margin-top: 8px;">
      Median: ${stats.median.toFixed(1)}s &bull; Average: ${stats.average.toFixed(1)}s
    </div>
  </div>`
}

function copyableBlock(text: string): string {
  return `<div style="position:relative;margin:8px 0">
    <div class="copyable-prompt">${escapeHtml(text)}</div>
    <button class="copy-btn" style="position:absolute;top:4px;right:4px" onclick="copyText(this)">Copy</button>
  </div>`
}

// ============================================================================
// generateFullReport — engine-rendered HTML from NarrativeData + ScanData
// ============================================================================

export function generateFullReport(scan: ScanData, narrative: NarrativeData): string {
  const fmt = narrative.format
  const isFull = fmt === 'full'
  const isMinimal = fmt === 'minimal'
  const t = narrative.translations ?? {}
  // Localized label: use translations map, fall back to humanLabel
  const tLabel = (key: string) => t.labels?.[key] ?? humanLabel(key)
  // Localized session goal
  const tGoal = (sessionId: string, fallback: string) => t.sessionGoals?.[sessionId] ?? t.sessionGoals?.[sessionId.slice(0, 8)] ?? fallback
  // Translate chart data keys
  const translateKeys = (data: Record<string, number>): Record<string, number> => {
    const result: Record<string, number> = {}
    for (const [key, val] of Object.entries(data)) result[tLabel(key)] = val
    return result
  }

  const hours = (scan.durationMinutes / 60).toFixed(1)
  const usedTokens = scan.tokens.used
  const cost = scan.tokens.estimatedCost

  // Report title
  const userName = scan.userName || 'User'
  const periodLabel = scan.durationMinutes >= 40320 ? 'Monthly' : scan.durationMinutes >= 8640 ? 'Weekly' : 'Daily'
  const reportTitle = `${userName}'s ${periodLabel} AI-Driven Work Report`

  // Section IDs for TOC
  const sections: Array<{ id: string; label: string }> = [
    { id: 'at-a-glance', label: 'At a Glance' },
  ]
  if (scan.projectBreakdown?.length) sections.push({ id: 'projects', label: 'Projects' })
  if (narrative.workDone.length > 0) sections.push({ id: 'work-done', label: 'Work Done' })
  if (narrative.resultsImpact.length > 0) sections.push({ id: 'results', label: 'Results & Impact' })
  if (narrative.howYouUseCC.narrative) sections.push({ id: 'how-you-use-cc', label: 'How You Use CC' })
  if (narrative.highlights.length > 0) sections.push({ id: 'highlights', label: 'Highlights' })
  if (narrative.friction && !isMinimal) sections.push({ id: 'friction', label: 'Friction' })
  if (narrative.keyPrompts.length > 0) sections.push({ id: 'key-prompts', label: 'Key Prompts' })
  if ((narrative as any).memoriesHighlight) sections.push({ id: 'memories', label: 'Memories' })
  if (narrative.learningsToShare?.length) sections.push({ id: 'learnings', label: 'Learnings' })
  if (narrative.aiCollaborationTips?.length) sections.push({ id: 'ai-tips', label: 'AI Tips' })
  if (narrative.friction?.suggestions && !isMinimal) sections.push({ id: 'suggestions', label: 'Suggestions' })
  if (narrative.onTheHorizon?.length && isFull) sections.push({ id: 'horizon', label: 'On the Horizon' })
  sections.push({ id: 'stats', label: 'Stats' })
  if (scan.facets?.sessions?.length) sections.push({ id: 'assessment', label: 'Assessment' })
  const hasTeamFeedbackToc = narrative.teamFeedback.forTeam.length > 0 || narrative.teamFeedback.forAI.length > 0
  if (hasTeamFeedbackToc) sections.push({ id: 'team-feedback', label: 'Team Feedback' })

  // Build HTML parts
  const parts: string[] = []

  // --- Title + subtitle ---
  parts.push(`<h1>${escapeHtml(reportTitle)}</h1>`)
  const rangeLabel = scan.requestedRange
    ? `${escapeHtml(scan.requestedRange.from)} ~ ${escapeHtml(scan.requestedRange.to)}`
    : `${escapeHtml(scan.dateRange.start)} ~ ${escapeHtml(scan.dateRange.end)}`
  const activityLabel = scan.activityRange
    ? `Activity: ${escapeHtml(scan.activityRange.start)} ~ ${escapeHtml(scan.activityRange.end)}`
    : ''
  parts.push(`<p class="subtitle">${rangeLabel}${scan.timezone ? ` &bull; ${escapeHtml(scan.timezone)}` : ''}${activityLabel ? `<br><span style="font-size:13px;color:#94a3b8">${activityLabel}</span>` : ''}</p>`)

  // --- 1. At a Glance ---
  parts.push(`<div id="at-a-glance" class="at-a-glance">
    <div class="glance-title">At a Glance</div>
    <div class="glance-section"><strong>What's working:</strong> ${escapeHtml(narrative.atAGlance.whatsWorking)} <a href="#highlights" class="see-more">&rarr; Highlights</a></div>
    <div class="glance-section"><strong>What's hindering:</strong> ${escapeHtml(narrative.atAGlance.whatsHindering)}${narrative.friction && !isMinimal ? ` <a href="#friction" class="see-more">&rarr; Friction</a>` : ''}</div>
    <div class="glance-section"><strong>Quick wins:</strong> ${escapeHtml(narrative.atAGlance.quickWins)}</div>
    ${isFull && narrative.atAGlance.horizon ? `<div class="glance-section"><strong>Horizon:</strong> ${escapeHtml(narrative.atAGlance.horizon)} <a href="#horizon" class="see-more">&rarr; On the Horizon</a></div>` : ''}
  </div>`)

  // --- 2. Navigation TOC ---
  parts.push(`<div class="nav-toc">
    <span style="font-size:11px;color:#94a3b8;margin-right:4px">Jump to:</span>
    ${sections.map(s => `<a href="#${s.id}">${s.label}</a>`).join('\n    ')}
  </div>`)

  // --- 3. Project Breakdown (time allocation by folder) ---
  if (scan.projectBreakdown?.length) {
    parts.push(`<h2 id="projects">Project Time Allocation</h2>`)
    const maxHours = Math.max(...scan.projectBreakdown.map((p: any) => p.hours)) || 1
    parts.push(`<div style="margin-bottom:24px">`)
    for (const p of scan.projectBreakdown) {
      const pct = ((p as any).hours / maxHours) * 100
      const folder = (p as any).path as string
      // Show last 2 path segments for readability
      const shortPath = shortProjectPath(folder)
      parts.push(`<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
        <div style="width:200px;font-size:13px;font-weight:500;color:#0f172a;text-align:right;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(folder)}">${escapeHtml(shortPath)}</div>
        <div style="flex:1;height:24px;background:#f1f5f9;border-radius:4px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#3b82f6,#60a5fa);border-radius:4px;display:flex;align-items:center;padding-left:8px">
            <span style="font-size:11px;color:white;font-weight:600">${Number((p as any).hours).toFixed(1)}h</span>
          </div>
        </div>
        <div style="font-size:11px;color:#64748b;flex-shrink:0;width:100px">${(p as any).sessions} sessions &bull; ${fmtNum((p as any).messages)} msgs</div>
      </div>`)
    }
    parts.push(`</div>`)
  }

  // --- 4. Work Done ---
  if (narrative.workDone.length > 0) {
  parts.push(`<h2 id="work-done">What You Worked On</h2>`)
  for (const area of narrative.workDone) {
    parts.push(`<div class="project-area">
      <div class="area-header">
        <div class="area-name">${escapeHtml(area.name)}</div>
        <div class="area-count">${area.sessions} session${area.sessions !== 1 ? 's' : ''}</div>
      </div>
      <div class="area-desc">${escapeHtml(area.description)}</div>
    </div>`)
  }
  // Goal categories chart + tool categories chart
  if (scan.facets?.goalCategories && Object.keys(scan.facets.goalCategories).length > 0) {
    parts.push(`<div class="charts-row">
      <div class="chart-card">
        <div class="chart-title">Goal Categories</div>
        ${renderBarChartStyleGuide(scan.facets.goalCategories, '#2563eb', 8, tLabel)}
      </div>
      <div class="chart-card">
        <div class="chart-title">Tool Categories</div>
        ${(() => {
          const catColors: Record<string, string> = { Core: '#3b82f6', Execution: '#f59e0b', Agent: '#8b5cf6', MCP: '#06b6d4', Web: '#10b981', Notebook: '#ec4899', Other: '#94a3b8' }
          const cats = Object.entries(scan.toolCategories).sort((a, b) => b[1].count - a[1].count)
          const maxCat = Math.max(...cats.map(c => c[1].count)) || 1
          return cats.map(([name, { count }]) =>
            `<div class="bar-row"><div class="bar-label">${escapeHtml(name)}</div><div class="bar-track"><div class="bar-fill" style="width:${(count / maxCat) * 100}%;background:${catColors[name] || '#94a3b8'}"></div></div><div class="bar-value">${count}</div></div>`
          ).join('\n')
        })()}
      </div>
    </div>`)
  }

  } // end workDone check

  // --- 5. Results & Impact ---
  if (narrative.resultsImpact.length > 0) {
  parts.push(`<h2 id="results">Results & Impact</h2>`)
  for (const r of narrative.resultsImpact) {
    parts.push(`<div class="results-card">
      <div class="results-project">${escapeHtml(r.project)}</div>
      <div class="results-outcomes">${escapeHtml(r.outcomes)}</div>
      <div class="results-impact">${escapeHtml(r.impact)}</div>
    </div>`)
  }

  } // end resultsImpact check

  // --- 6. How You Use Claude Code ---
  if (narrative.howYouUseCC.narrative) {
  parts.push(`<h2 id="how-you-use-cc">How You Use Claude Code</h2>`)
  parts.push(`<div class="narrative">
    ${narrative.howYouUseCC.narrative.split('\n').filter(p => p.trim()).map(p => `<p>${escapeHtml(p)}</p>`).join('\n')}
    <div class="key-insight"><strong>Key Pattern:</strong> ${escapeHtml(narrative.howYouUseCC.keyPattern)}</div>
  </div>`)
  // Charts: response time, multi-clauding, session types, day of week
  {
    const chartPairs: string[] = []
    chartPairs.push(renderResponseTimeHistogram(scan.responseTimeStats))
    if (scan.concurrentPeriods.maxConcurrent > 1) {
      chartPairs.push(`<div class="chart-card">
        <div class="chart-title">Multi-Clauding</div>
        <div style="font-size:14px;color:#475569;line-height:1.8">
          <strong>${scan.concurrentPeriods.maxConcurrent}</strong> peak parallel sessions<br>
          <strong>${Math.round(scan.concurrentPeriods.parallelMinutes)}</strong> minutes of parallel work<br>
          <strong>${scan.concurrentPeriods.parallelPct.toFixed(1)}%</strong> of the span was parallel
        </div>
      </div>`)
    }
    if (scan.facets?.sessionTypes && Object.keys(scan.facets.sessionTypes).length > 0) {
      // Wider labels for session type names
      const stEntries = Object.entries(scan.facets.sessionTypes).sort((a, b) => b[1] - a[1])
      const stMax = Math.max(...stEntries.map(e => e[1])) || 1
      chartPairs.push(`<div class="chart-card">
        <div class="chart-title">Session Types</div>
        ${stEntries.map(([key, count]) => `<div class="bar-row"><div class="bar-label" style="width:150px">${escapeHtml(tLabel(key))}</div><div class="bar-track"><div class="bar-fill" style="width:${(count / stMax) * 100}%;background:#8b5cf6"></div></div><div class="bar-value">${fmtNum(count)}</div></div>`).join('\n')}
      </div>`)
    }
    chartPairs.push(`<div class="chart-card">
      <div class="chart-title">Day of Week</div>
      ${renderDayOfWeekStyleGuide(scan.dayOfWeekCounts)}
    </div>`)
    const filled = chartPairs.filter(c => c)
    for (let i = 0; i < filled.length; i += 2) {
      parts.push(`<div class="charts-row">
        ${filled[i]}
        ${filled[i + 1] || ''}
      </div>`)
    }
  }

  } // end howYouUseCC check

  // --- 7. Highlights ---
  if (narrative.highlights.length > 0) {
  parts.push(`<h2 id="highlights">Highlights</h2>`)
  if ((narrative as any).highlightsIntro) {
    parts.push(`<p class="section-intro">${escapeHtml((narrative as any).highlightsIntro)}</p>`)
  }
  for (const h of narrative.highlights) {
    parts.push(`<div class="big-win">
      <div class="big-win-title">${escapeHtml(h.title)}</div>
      <div class="big-win-desc">${escapeHtml(h.description)}</div>
    </div>`)
  }
  // Charts: outcomes, success factors, satisfaction
  if (scan.facets && isFull) {
    const chartCards: string[] = []
    if (scan.facets.outcomes && Object.keys(scan.facets.outcomes).length > 0) {
      chartCards.push(`<div class="chart-card">
        <div class="chart-title">Outcomes</div>
        ${renderOrderedBarChart(scan.facets.outcomes, OUTCOME_ORDER, '#8b5cf6', tLabel)}
      </div>`)
    }
    if (scan.facets.successFactors && Object.keys(scan.facets.successFactors).length > 0) {
      chartCards.push(`<div class="chart-card">
        <div class="chart-title">Most Useful AI Capabilities</div>
        ${renderBarChartStyleGuide(scan.facets.successFactors, '#16a34a', 8, tLabel)}
      </div>`)
    }
    if (scan.facets.satisfaction && Object.keys(scan.facets.satisfaction).length > 0) {
      chartCards.push(`<div class="chart-card">
        <div class="chart-title">Satisfaction</div>
        ${renderOrderedBarChart(scan.facets.satisfaction, SATISFACTION_ORDER, '#eab308', tLabel)}
      </div>`)
    }
    for (let i = 0; i < chartCards.length; i += 2) {
      parts.push(`<div class="charts-row">
        ${chartCards[i]}
        ${chartCards[i + 1] || ''}
      </div>`)
    }
  }

  } // end highlights check

  // --- 8. Friction & Improvements ---
  if (narrative.friction && !isMinimal) {
    parts.push(`<h2 id="friction">Friction & Improvements</h2>`)
    for (const cat of narrative.friction.categories) {
      parts.push(`<div class="friction-category">
        <div class="friction-title">${escapeHtml(cat.title)}</div>
        <div class="friction-desc">${escapeHtml(cat.description)}</div>
        ${cat.examples.length > 0 ? `<ul class="friction-examples">${cat.examples.map(e => `<li>${escapeHtml(e)}</li>`).join('')}</ul>` : ''}
      </div>`)
    }
    // Friction charts
    if (scan.facets && isFull) {
      const frictionCharts: string[] = []
      if (scan.facets.frictionTypes && Object.keys(scan.facets.frictionTypes).length > 0) {
        frictionCharts.push(`<div class="chart-card">
          <div class="chart-title">Friction Types</div>
          ${renderBarChartStyleGuide(scan.facets.frictionTypes, '#dc2626', 8, tLabel)}
        </div>`)
      }
      if (scan.toolErrorCategories && Object.keys(scan.toolErrorCategories).length > 0) {
        frictionCharts.push(`<div class="chart-card">
          <div class="chart-title">Tool Errors</div>
          ${renderBarChartStyleGuide(scan.toolErrorCategories, '#dc2626')}
        </div>`)
      }
      if (frictionCharts.length > 0) {
        parts.push(`<div class="charts-row">
          ${frictionCharts[0]}
          ${frictionCharts[1] || ''}
        </div>`)
      }
    }
  }

  // --- 11. Key Prompts ---
  if (narrative.keyPrompts.length > 0) {
    parts.push(`<h2 id="key-prompts">Key Prompts</h2>`)
    for (const kp of narrative.keyPrompts) {
      parts.push(`<div class="project-area" style="margin-bottom:12px">
        <div style="font-size:13px;color:#64748b;margin-bottom:8px">${escapeHtml(kp.context)}</div>
        <blockquote style="border-left:3px solid #2563eb;padding:8px 16px;margin:8px 0;background:#f8fafc;font-style:italic;white-space:pre-wrap">${escapeHtml(kp.verbatim)}</blockquote>
        <div style="font-size:14px;color:#475569">&rarr; ${escapeHtml(kp.outcome)}</div>
      </div>`)
    }
  }

  // --- Memories / Key Learnings ---
  if ((narrative as any).memoriesHighlight) {
    parts.push(`<h2 id="memories">Memories & Key Learnings</h2>`)
    parts.push(`<div class="narrative"><p>${escapeHtml((narrative as any).memoriesHighlight)}</p></div>`)
  }

  // --- Learnings to Share ---
  if (narrative.learningsToShare?.length) {
    parts.push(`<h2 id="learnings">Learnings to Share</h2>`)
    parts.push(`<div class="narrative"><ul>${narrative.learningsToShare.map(l => `<li>${escapeHtml(l)}</li>`).join('\n')}</ul></div>`)
  }

  // --- AI Collaboration Tips ---
  if (narrative.aiCollaborationTips?.length) {
    parts.push(`<h2 id="ai-tips">AI Collaboration Tips</h2>`)
    parts.push(`<div class="narrative"><ul>${narrative.aiCollaborationTips.map(t => `<li>${escapeHtml(t)}</li>`).join('\n')}</ul></div>`)
  }

  // --- Other Notes ---
  if (narrative.otherNotes) {
    parts.push(`<h2>Other Notes</h2>`)
    parts.push(`<div class="narrative"><p>${escapeHtml(narrative.otherNotes)}</p></div>`)
  }

  // --- 12. Suggestions ---
  if (narrative.friction?.suggestions && !isMinimal) {
    parts.push(`<h2 id="suggestions">Suggestions</h2>`)
    const sugg = narrative.friction.suggestions

    // CLAUDE.md
    if (sugg.claudeMd.length > 0) {
      parts.push(`<div class="claude-md-section">
        <div style="font-weight:700;color:#1e40af;margin-bottom:12px">CLAUDE.md Additions</div>
        <div style="font-size:13px;color:#64748b;margin-bottom:12px">Add these to your CLAUDE.md for better AI collaboration:</div>
        ${sugg.claudeMd.map(item => `<div class="claude-md-item">
          <input type="checkbox" class="cmd-checkbox" data-text="${escapeHtml(item.text)}" style="margin-top:2px">
          <div class="cmd-code">${escapeHtml(item.text)}</div>
          <div class="cmd-why">${escapeHtml(item.why)}</div>
        </div>`).join('\n')}
        <button class="copy-all-btn copy-btn" style="margin-top:12px" onclick="copyAllCheckedClaudeMd()">Copy All Checked</button>
      </div>`)
    }

    // Features to try
    if (sugg.featuresToTry?.length) {
      for (const feat of sugg.featuresToTry) {
        parts.push(`<div class="feature-card">
          <div class="feature-title">${escapeHtml(feat.name)}</div>
          <div style="font-size:14px;color:#475569;margin-bottom:8px">${escapeHtml(feat.oneliner)}</div>
          <div style="font-size:13px;color:#64748b;margin-bottom:8px">${escapeHtml(feat.why)}</div>
          ${copyableBlock(feat.code)}
        </div>`)
      }
    }

    // Usage patterns
    if (sugg.usagePatterns?.length) {
      for (const pat of sugg.usagePatterns) {
        parts.push(`<div class="pattern-card">
          <div class="pattern-title">${escapeHtml(pat.name)}</div>
          <div style="font-size:14px;color:#475569;margin-bottom:8px">${escapeHtml(pat.summary)}</div>
          ${copyableBlock(pat.prompt)}
        </div>`)
      }
    }
  }

  // --- 13. On the Horizon (full only) ---
  if (narrative.onTheHorizon?.length && isFull) {
    parts.push(`<h2 id="horizon">On the Horizon</h2>`)
    for (const h of narrative.onTheHorizon) {
      parts.push(`<div class="horizon-card">
        <div class="horizon-title">${escapeHtml(h.title)}</div>
        <div style="font-size:14px;color:#475569;margin-bottom:8px">${escapeHtml(h.description)}</div>
        <div style="font-size:13px;color:#7c3aed;margin-bottom:8px">${escapeHtml(h.tip)}</div>
        ${copyableBlock(h.prompt)}
      </div>`)
    }
  }

  // --- 14. Bottom Stats ---
  parts.push(`<h2 id="stats">Stats</h2>`)
  {
    const chartPairs: string[] = []
    // Notable tools (exclude always-used basics)
    // Generic tools + agent plumbing — excluded from charts
    const BASIC_TOOLS = new Set(['Read', 'Write', 'Edit', 'Grep', 'Glob', 'Bash', 'BashOutput', 'KillShell', 'ToolSearch', 'NotebookEdit', 'NotebookRead', 'LS', 'WebSearch', 'WebFetch', 'Skill', 'Agent', 'SendMessage', 'TaskCreate', 'TaskUpdate', 'TaskList', 'TaskGet', 'TaskStop', 'TaskOutput'])
    const notableTools: Record<string, number> = {}
    const agentDescriptions: Record<string, number> = {}
    for (const [tool, count] of Object.entries(scan.toolCounts)) {
      if (tool.startsWith('Agent:')) {
        // Individual agent descriptions → Agent Orchestration chart
        const desc = tool.slice(6)  // remove "Agent:" prefix
        agentDescriptions[desc] = count
      } else if (!BASIC_TOOLS.has(tool)) {
        notableTools[tool] = count
      }
    }

    // Agent Orchestration chart — shows what agents were spawned
    if (Object.keys(agentDescriptions).length > 0) {
      const cp = scan.concurrentPeriods
      // Render agent descriptions with wider labels
      const agentEntries = Object.entries(agentDescriptions).sort((a, b) => b[1] - a[1]).slice(0, 15)
      const maxAgent = Math.max(...agentEntries.map(e => e[1])) || 1
      const agentBars = agentEntries.map(([desc, count]) =>
        `<div class="bar-row"><div class="bar-label" style="width:220px">${escapeHtml(desc)}</div><div class="bar-track"><div class="bar-fill" style="width:${(count / maxAgent) * 100}%;background:#7c3aed"></div></div><div class="bar-value">${count}</div></div>`
      ).join('\n')
      chartPairs.push(`<div class="chart-card">
        <div class="chart-title">Agent Orchestration</div>
        ${agentBars}
        ${cp && cp.maxConcurrent > 1 ? `
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:13px;color:#475569">
          ${t.parallelWork ? escapeHtml(t.parallelWork) : `<strong style="color:#7c3aed">Parallel work:</strong> Peak ${cp.maxConcurrent} sessions simultaneously. ${cp.parallelPct}% of work time had 2+ sessions active (${fmtNum(cp.parallelMinutes)} of ${fmtNum(cp.totalMinutes)} min).`}
        </div>` : ''}
      </div>`)
    }
    if (Object.keys(notableTools).length > 0) {
      // Notable tools get their own full-width section with wider labels for MCP tool names
      const notableEntries = Object.entries(notableTools).sort((a, b) => b[1] - a[1]).slice(0, 20)
      const maxVal = Math.max(...notableEntries.map(e => e[1])) || 1
      const notableBars = notableEntries.map(([label, count]) => {
        const pct = (count / maxVal) * 100
        // Shorten mcp__ prefixes for readability
        const shortLabel = label
          .replace(/^mcp__plugin_[^_]+_[^_]+__/, 'mcp: ')
          .replace(/^mcp__[^_]+__/, 'mcp: ')
          .replace(/^Skill:/, 'skill: ')
        return `<div class="bar-row"><div class="bar-label" style="width:220px">${escapeHtml(shortLabel)}</div><div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:#0891b2"></div></div><div class="bar-value">${count}</div></div>`
      }).join('\n')
      parts.push(`<div class="chart-card" style="margin:24px 0">
        <div class="chart-title">Notable Tools — MCP, Skills, Planning, and more</div>
        ${notableBars}
      </div>`)
    // Bash CLI tools
    if (scan.bashCliTools && Object.keys(scan.bashCliTools).length > 0) {
      chartPairs.push(`<div class="chart-card">
        <div class="chart-title">CLI Tools (inside Bash)</div>
        ${renderBarChartStyleGuide(scan.bashCliTools, '#059669', 10)}
      </div>`)
    }
    } else {
      chartPairs.push(`<div class="chart-card">
        <div class="chart-title">Tool Categories</div>
        ${renderBarChartStyleGuide(
          Object.fromEntries(Object.entries(scan.toolCategories).map(([k, v]) => [k, (v as any).count])),
          '#0891b2', 8)}
      </div>`)
    }
    // Languages
    chartPairs.push(`<div class="chart-card">
      <div class="chart-title">Languages</div>
      ${renderBarChartStyleGuide(scan.languages, '#10b981')}
    </div>`)
    // Time of day
    if (scan.messageHours?.length) {
      chartPairs.push(`<div class="chart-card">
        <div class="chart-title">Time of Day</div>
        ${renderTimeOfDayStyleGuide(scan.messageHours)}
      </div>`)
    }
    // Messages per day
    if (scan.messagesPerDay && Object.keys(scan.messagesPerDay).length > 0) {
      chartPairs.push(`<div class="chart-card">
        <div class="chart-title">Messages per Day</div>
        ${renderBarChartStyleGuide(scan.messagesPerDay, '#8b5cf6', 10)}
      </div>`)
    }
    // Token & Cost are rendered as a separate highlighted section below
    for (let i = 0; i < chartPairs.length; i += 2) {
      parts.push(`<div class="charts-row">
        ${chartPairs[i]}
        ${chartPairs[i + 1] || ''}
      </div>`)
    }
  }

  // --- Token Usage & Cost (dedicated section) ---
  {
    const maxTok = Math.max(scan.tokens.input, scan.tokens.output, scan.tokens.cacheRead, scan.tokens.cacheCreation) || 1
    const tokBar = (label: string, raw: number, color: string) => {
      const pct = (raw / maxTok) * 100
      return `<div class="bar-row"><div class="bar-label" style="width:120px">${label}</div><div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div><div class="bar-value" style="width:60px">${formatTokens(raw)}</div></div>`
    }

    const maxCost = Math.max(cost.inputCost, cost.outputCost, cost.cacheReadCost, cost.cacheCreationCost) || 1
    const costBar = (label: string, raw: number, color: string) => {
      const pct = (raw / maxCost) * 100
      return `<div class="bar-row"><div class="bar-label" style="width:120px">${label}</div><div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div><div class="bar-value" style="width:60px">$${raw.toFixed(0)}</div></div>`
    }

    parts.push(`
    <h2 id="token-cost" style="font-size:22px">Token Usage & Estimated Cost</h2>
    <div class="charts-row">
      <div class="chart-card">
        <div class="chart-title" style="font-size:14px">Token Usage</div>
        <div style="margin-bottom:12px">
          <div style="font-size:11px;color:#94a3b8;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em">New Tokens (actual work)</div>
          ${tokBar('Input', scan.tokens.input, '#6366f1')}
          ${tokBar('Output', scan.tokens.output, '#818cf8')}
        </div>
        <div>
          <div style="font-size:11px;color:#94a3b8;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em">Cache (context reuse)</div>
          ${tokBar('Cache Read', scan.tokens.cacheRead, '#a5b4fc')}
          ${tokBar('Cache Write', scan.tokens.cacheCreation, '#c7d2fe')}
        </div>
        <div style="font-size:13px;color:#475569;margin-top:12px;padding-top:8px;border-top:1px solid #e2e8f0">
          <strong>Used: ${formatTokens(usedTokens)}</strong> (input + output) &bull; Cached: ${formatTokens(scan.tokens.cached)}
        </div>
      </div>
      <div class="chart-card">
        <div class="chart-title" style="font-size:14px">Estimated API Cost</div>
        ${costBar('Input', cost.inputCost, '#f59e0b')}
        ${costBar('Output', cost.outputCost, '#fbbf24')}
        ${costBar('Cache Read', cost.cacheReadCost, '#f97316')}
        ${costBar('Cache Write', cost.cacheCreationCost, '#fb923c')}
        <div style="font-size:14px;color:#0f172a;font-weight:700;margin-top:12px;padding-top:8px;border-top:1px solid #e2e8f0">
          <div>Total: ~${fmtCost(cost.totalCost)}</div>
          <div style="margin-top:4px">$200/mo Max plan → <strong style="font-size:18px;color:#16a34a">${Math.round(cost.totalCost / 200)}x ROI</strong></div>
        </div>
        <div style="font-size:11px;color:#94a3b8;margin-top:8px;line-height:1.5">
          ${t.costNote ? escapeHtml(t.costNote) : 'Cache Read is 90% cheaper per token than regular input, but accumulates rapidly because the full context window is re-sent on every API call. Context window management (/compact, shorter sessions) directly reduces cost.'}
        </div>
      </div>
    </div>`)
  }

  // --- 15. Session Assessment ---
  if (scan.facets?.sessions?.length) {
  parts.push(`<h2 id="assessment">Session Assessment</h2>`)
    parts.push(`<table class="assessment-table">
      <thead><tr><th>Session</th><th>Goal</th><th>Outcome</th><th>Helpfulness</th><th>Satisfaction</th></tr></thead>
      <tbody>`)
    for (const s of scan.facets.sessions) {
      parts.push(`<tr>
        <td style="font-family:monospace;font-size:12px">${escapeHtml(s.id)}</td>
        <td>${escapeHtml(tGoal(s.id, s.goal))}</td>
        <td><span class="badge ${outcomeBadgeClass(normalizeOutcomeForDisplay(s.outcome))}">${escapeHtml(tLabel(normalizeOutcomeForDisplay(s.outcome)))}</span></td>
        <td><span class="badge ${helpfulnessBadgeClass(normalizeHelpfulnessForDisplay(s.helpfulness))}">${escapeHtml(tLabel(normalizeHelpfulnessForDisplay(s.helpfulness)))}</span></td>
        <td><span class="badge ${satisfactionBadgeClass(normalizeSatisfactionForDisplay(s.satisfaction))}">${escapeHtml(tLabel(normalizeSatisfactionForDisplay(s.satisfaction)))}</span></td>
      </tr>`)
    }
    parts.push(`</tbody></table>`)
  }

  // --- 16. Team Feedback ---
  const hasTeamFeedback = narrative.teamFeedback.forTeam.length > 0 || narrative.teamFeedback.forAI.length > 0
  if (hasTeamFeedback) {
  parts.push(`<h2 id="team-feedback">Team Feedback</h2>`)
  parts.push(`<div class="feedback-section">`)
  if (narrative.teamFeedback.forTeam.length > 0) {
    parts.push(`<h3>For the Team</h3>`)
    for (const item of narrative.teamFeedback.forTeam) {
      parts.push(`<div class="feedback-card team-card">
        <div class="feedback-detail">${escapeHtml(item)}</div>
      </div>`)
    }
  }
  if (narrative.teamFeedback.forAI.length > 0) {
    parts.push(`<h3>For AI Improvement</h3>`)
    for (const item of narrative.teamFeedback.forAI) {
      parts.push(`<div class="feedback-card model-card">
        <div class="feedback-detail">${escapeHtml(item)}</div>
      </div>`)
    }
  }
  parts.push(`</div>`)
  } // end teamFeedback check

  // --- Fun ending ---
  // --- Summary Dashboard (bottom) ---
  const cp = scan.concurrentPeriods
  parts.push(`
  <div style="margin-top:48px;padding-top:32px;border-top:2px solid #e2e8f0">
    <h2 style="text-align:center;margin-bottom:24px">Summary</h2>
    <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:16px;margin-bottom:24px">
      <div class="stat" style="padding:20px">
        <div class="stat-value">${fmtNum(scan.sessions)}</div>
        <div class="stat-label">Sessions</div>
      </div>
      <div class="stat" style="padding:20px">
        <div class="stat-value">${fmtNum(scan.messages)}</div>
        <div class="stat-label">Messages</div>
      </div>
      <div class="stat" style="padding:20px">
        <div class="stat-value">${fmtNum(Math.floor(parseFloat(hours)))}h</div>
        <div class="stat-label">Session Hours${cp.maxConcurrent > 1 ? ' (combined)' : ''}</div>
      </div>
      <div class="stat" style="padding:20px">
        <div class="stat-value">${fmtNum(scan.gitCommits)}</div>
        <div class="stat-label">Commits</div>
      </div>
      <div class="stat" style="padding:20px">
        <div class="stat-value">+${fmtNum(scan.linesAdded)}<span style="font-size:16px;color:#64748b">/-${fmtNum(scan.linesRemoved)}</span></div>
        <div class="stat-label">Lines Changed</div>
      </div>
      <div class="stat" style="padding:20px">
        <div class="stat-value">${fmtNum(scan.daysActive)}</div>
        <div class="stat-label">Days Active</div>
      </div>
      <div class="stat" style="padding:20px">
        <div class="stat-value">${formatTokens(usedTokens)}</div>
        <div class="stat-label">Tokens Used</div>
      </div>
      <div class="stat" style="padding:20px">
        <div class="stat-value">${fmtCost(cost.totalCost)}</div>
        <div class="stat-label">Est. API Cost</div>
        <div style="font-size:10px;color:#16a34a;margin-top:4px;font-weight:700">${Math.round(cost.totalCost / 200)}x ROI</div>
      </div>
      ${cp.maxConcurrent > 1 ? `<div class="stat" style="padding:20px">
        <div class="stat-value">${cp.maxConcurrent}</div>
        <div class="stat-label">Peak Parallel</div>
      </div>` : `<div class="stat" style="padding:20px">
        <div class="stat-value">${Object.keys(scan.languages).length}</div>
        <div class="stat-label">Languages</div>
      </div>`}
    </div>
    <div class="fun-ending">
      <div class="fun-headline">${fmtNum(scan.sessions)} sessions &bull; ${fmtNum(scan.messages)} messages &bull; ${fmtNum(Math.floor(parseFloat(hours)))} hours</div>
      <div class="fun-detail">${narrative.otherNotes ? escapeHtml(narrative.otherNotes) : 'Another productive stretch of AI-assisted development.'}</div>
    </div>
  </div>`)

  // Wrap in full HTML document
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(reportTitle)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${FULL_CSS}</style>
</head>
<body>
<div class="container">
${parts.join('\n')}
</div>
<script>${FULL_JS}</script>
</body>
</html>`
}

// ============================================================================
// generateMarkdownReport — GFM Markdown from NarrativeData + ScanData
// ============================================================================

export function generateMarkdownReport(scan: ScanData, narrative: NarrativeData): string {
  const fmt = narrative.format
  const isFull = fmt === 'full'
  const isMinimal = fmt === 'minimal'
  const t = narrative.translations ?? {}
  const tLabel = (key: string) => t.labels?.[key] ?? humanLabel(key)
  const tGoal = (sessionId: string, fallback: string) => t.sessionGoals?.[sessionId] ?? t.sessionGoals?.[sessionId.slice(0, 8)] ?? fallback
  const hours = (scan.durationMinutes / 60).toFixed(1)
  const usedTokens = scan.tokens.used
  const cost = scan.tokens.estimatedCost
  const userName = scan.userName || 'User'
  const periodLabel = scan.durationMinutes >= 40320 ? 'Monthly' : scan.durationMinutes >= 8640 ? 'Weekly' : 'Daily'
  const reportTitle = `${userName}'s ${periodLabel} AI-Driven Work Report`
  const lines: string[] = []

  lines.push(`# ${reportTitle}`)
  lines.push(``)
  const mdRange = scan.requestedRange
    ? `${scan.requestedRange.from} ~ ${scan.requestedRange.to}`
    : `${scan.dateRange.start} ~ ${scan.dateRange.end}`
  const mdActivity = scan.activityRange
    ? ` | Activity: ${scan.activityRange.start} ~ ${scan.activityRange.end}`
    : ''
  lines.push(`**${mdRange}**${scan.timezone ? ` | ${scan.timezone}` : ''}${mdActivity}`)
  lines.push(``)

  // Stats
  lines.push(`| Sessions | Messages | Duration | Commits | Lines | Tokens Used | Est. Cost | Days Active |`)
  lines.push(`|----------|----------|----------|---------|-------|-------------|-----------|-------------|`)
  lines.push(`| ${fmtNum(scan.sessions)} | ${fmtNum(scan.messages)} | ${fmtNum(Math.floor(parseFloat(hours)))}h | ${fmtNum(scan.gitCommits)} | +${fmtNum(scan.linesAdded)}/-${fmtNum(scan.linesRemoved)} | ${formatTokens(usedTokens)} | ${fmtCost(cost.totalCost)} | ${fmtNum(scan.daysActive)} |`)
  lines.push(``)

  // At a Glance
  lines.push(`## At a Glance`)
  lines.push(``)
  lines.push(`- **What's working:** ${narrative.atAGlance.whatsWorking}`)
  lines.push(`- **What's hindering:** ${narrative.atAGlance.whatsHindering}`)
  lines.push(`- **Quick wins:** ${narrative.atAGlance.quickWins}`)
  if (isFull && narrative.atAGlance.horizon) {
    lines.push(`- **Horizon:** ${narrative.atAGlance.horizon}`)
  }
  lines.push(``)

  // Project Time Allocation
  if (scan.projectBreakdown?.length) {
    lines.push(`## Project Time Allocation`)
    lines.push(``)
    lines.push(`| Project | Hours | Sessions | Messages |`)
    lines.push(`|---------|------:|:--------:|---------:|`)
    for (const p of scan.projectBreakdown) {
      const shortPath = shortProjectPath((p as any).path)
      lines.push(`| ${shortPath} | ${Number((p as any).hours).toFixed(1)}h | ${(p as any).sessions} | ${fmtNum((p as any).messages)} |`)
    }
    lines.push(``)
  }

  // Work Done
  lines.push(`## What You Worked On`)
  lines.push(``)
  for (const area of narrative.workDone) {
    lines.push(`### ${area.name} (${area.sessions} session${area.sessions !== 1 ? 's' : ''})`)
    lines.push(``)
    lines.push(area.description)
    lines.push(``)
  }

  // Results & Impact
  lines.push(`## Results & Impact`)
  lines.push(``)
  for (const r of narrative.resultsImpact) {
    lines.push(`### ${r.project}`)
    lines.push(``)
    lines.push(r.outcomes)
    lines.push(``)
    lines.push(`*${r.impact}*`)
    lines.push(``)
  }

  // How You Use CC
  lines.push(`## How You Use Claude Code`)
  lines.push(``)
  lines.push(narrative.howYouUseCC.narrative)
  lines.push(``)
  lines.push(`> **Key Pattern:** ${narrative.howYouUseCC.keyPattern}`)
  lines.push(``)

  // Response time
  if (scan.responseTimeStats && Object.keys(scan.responseTimeStats.histogram).length > 0) {
    lines.push(`### Response Time Distribution`)
    lines.push(``)
    lines.push(`| Bucket | Count |`)
    lines.push(`|--------|-------|`)
    for (const [bucket, count] of Object.entries(scan.responseTimeStats.histogram).sort((a, b) => b[1] - a[1])) {
      lines.push(`| ${bucket} | ${count} |`)
    }
    lines.push(``)
    lines.push(`Median: ${scan.responseTimeStats.median.toFixed(1)}s | Average: ${scan.responseTimeStats.average.toFixed(1)}s`)
    lines.push(``)
  }

  // Multi-clauding
  if (scan.concurrentPeriods.maxConcurrent > 1) {
    lines.push(`### Multi-Clauding`)
    lines.push(``)
    lines.push(`- **${scan.concurrentPeriods.maxConcurrent}** peak parallel sessions`)
    lines.push(`- **${Math.round(scan.concurrentPeriods.parallelMinutes)}** minutes of parallel work`)
    lines.push(`- **${scan.concurrentPeriods.parallelPct.toFixed(1)}%** of the span was parallel`)
    lines.push(``)
  }

  // Day of week
  {
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    lines.push(`### Day of Week`)
    lines.push(``)
    lines.push(`| ${labels.join(' | ')} |`)
    lines.push(`| ${labels.map(() => '---').join(' | ')} |`)
    lines.push(`| ${scan.dayOfWeekCounts.join(' | ')} |`)
    lines.push(``)
  }

  // Highlights
  lines.push(`## Highlights`)
  lines.push(``)
  if ((narrative as any).highlightsIntro) {
    lines.push((narrative as any).highlightsIntro)
    lines.push(``)
  }
  for (const h of narrative.highlights) {
    lines.push(`### ${h.title}`)
    lines.push(``)
    lines.push(h.description)
    lines.push(``)
  }

  // Friction (moved before Key Prompts; Learnings/Tips moved after Key Prompts)
  if (narrative.friction && !isMinimal) {
    lines.push(`## Friction & Improvements`)
    lines.push(``)
    for (const cat of narrative.friction.categories) {
      lines.push(`### ${cat.title}`)
      lines.push(``)
      lines.push(cat.description)
      lines.push(``)
      if (cat.examples.length > 0) {
        for (const e of cat.examples) {
          lines.push(`- ${e}`)
        }
        lines.push(``)
      }
    }
  }

  // Key Prompts
  lines.push(`## Key Prompts`)
  lines.push(``)
  for (const kp of narrative.keyPrompts) {
    lines.push(`**${kp.context}**`)
    lines.push(``)
    lines.push(`> ${kp.verbatim.split('\n').join('\n> ')}`)
    lines.push(``)
    lines.push(`*${kp.outcome}*`)
    lines.push(``)
  }

  // Memories
  if ((narrative as any).memoriesHighlight) {
    lines.push(`## Memories & Key Learnings`)
    lines.push(``)
    lines.push((narrative as any).memoriesHighlight)
    lines.push(``)
  }

  // Learnings
  if (narrative.learningsToShare?.length) {
    lines.push(`## Learnings to Share`)
    lines.push(``)
    for (const l of narrative.learningsToShare) {
      lines.push(`- ${l}`)
    }
    lines.push(``)
  }

  // AI Tips
  if (narrative.aiCollaborationTips?.length) {
    lines.push(`## AI Collaboration Tips`)
    lines.push(``)
    for (const t of narrative.aiCollaborationTips) {
      lines.push(`- ${t}`)
    }
    lines.push(``)
  }

  // Other notes
  if (narrative.otherNotes) {
    lines.push(`## Other Notes`)
    lines.push(``)
    lines.push(narrative.otherNotes)
    lines.push(``)
  }

  // Suggestions
  if (narrative.friction?.suggestions && !isMinimal) {
    lines.push(`## Suggestions`)
    lines.push(``)
    const sugg = narrative.friction.suggestions

    if (sugg.claudeMd.length > 0) {
      lines.push(`### CLAUDE.md Additions`)
      lines.push(``)
      for (const item of sugg.claudeMd) {
        lines.push(`- [ ] \`${item.text}\` — ${item.why}`)
      }
      lines.push(``)
    }

    if (sugg.featuresToTry?.length) {
      lines.push(`### Features to Try`)
      lines.push(``)
      for (const feat of sugg.featuresToTry) {
        lines.push(`**${feat.name}** — ${feat.oneliner}`)
        lines.push(``)
        lines.push(`${feat.why}`)
        lines.push(``)
        lines.push('```')
        lines.push(feat.code)
        lines.push('```')
        lines.push(``)
      }
    }

    if (sugg.usagePatterns?.length) {
      lines.push(`### Effective Patterns`)
      lines.push(``)
      for (const pat of sugg.usagePatterns) {
        lines.push(`**${pat.name}** — ${pat.summary}`)
        lines.push(``)
        lines.push('```')
        lines.push(pat.prompt)
        lines.push('```')
        lines.push(``)
      }
    }
  }

  // On the Horizon
  if (narrative.onTheHorizon?.length && isFull) {
    lines.push(`## On the Horizon`)
    lines.push(``)
    for (const h of narrative.onTheHorizon) {
      lines.push(`### ${h.title}`)
      lines.push(``)
      lines.push(h.description)
      lines.push(``)
      lines.push(`> ${h.tip}`)
      lines.push(``)
      lines.push('```')
      lines.push(h.prompt)
      lines.push('```')
      lines.push(``)
    }
  }

  // Stats tables
  lines.push(`## Stats`)
  lines.push(``)

  // Top tools
  {
    const topTools = Object.entries(scan.toolCounts).sort((a, b) => b[1] - a[1]).slice(0, 8)
    if (topTools.length > 0) {
      lines.push(`### Top Tools`)
      lines.push(``)
      lines.push(`| Tool | Count |`)
      lines.push(`|------|-------|`)
      for (const [tool, count] of topTools) {
        lines.push(`| ${tool} | ${count} |`)
      }
      lines.push(``)
    }
  }

  // Languages
  {
    const topLangs = Object.entries(scan.languages).sort((a, b) => b[1] - a[1]).slice(0, 8)
    if (topLangs.length > 0) {
      lines.push(`### Languages`)
      lines.push(``)
      lines.push(`| Language | Count |`)
      lines.push(`|----------|-------|`)
      for (const [lang, count] of topLangs) {
        lines.push(`| ${lang} | ${count} |`)
      }
      lines.push(``)
    }
  }

  // Tokens
  lines.push(`### Token Usage`)
  lines.push(``)
  lines.push(`| Category | Tokens |`)
  lines.push(`|----------|--------|`)
  lines.push(`| Input | ${formatTokens(scan.tokens.input)} |`)
  lines.push(`| Output | ${formatTokens(scan.tokens.output)} |`)
  lines.push(`| Cache Read | ${formatTokens(scan.tokens.cacheRead)} |`)
  lines.push(`| Cache Write | ${formatTokens(scan.tokens.cacheCreation)} |`)
  lines.push(`| **Used (input+output)** | **${formatTokens(usedTokens)}** |`)
  lines.push(``)
  lines.push(`API equivalent: ~${fmtCost(cost.totalCost)}`)
  lines.push(``)

  // Facet tables
  if (scan.facets) {
    // Outcomes
    if (scan.facets.outcomes && Object.keys(scan.facets.outcomes).length > 0) {
      lines.push(`### Outcomes`)
      lines.push(``)
      lines.push(`| Outcome | Count |`)
      lines.push(`|---------|-------|`)
      for (const [k, v] of Object.entries(scan.facets.outcomes).sort((a, b) => b[1] - a[1])) {
        lines.push(`| ${tLabel(k)} | ${v} |`)
      }
      lines.push(``)
    }

    // Satisfaction
    if (scan.facets.satisfaction && Object.keys(scan.facets.satisfaction).length > 0) {
      lines.push(`### Satisfaction`)
      lines.push(``)
      lines.push(`| Level | Count |`)
      lines.push(`|-------|-------|`)
      for (const [k, v] of Object.entries(scan.facets.satisfaction).sort((a, b) => b[1] - a[1])) {
        lines.push(`| ${tLabel(k)} | ${v} |`)
      }
      lines.push(``)
    }

    // Session types
    if (scan.facets.sessionTypes && Object.keys(scan.facets.sessionTypes).length > 0) {
      lines.push(`### Session Types`)
      lines.push(``)
      lines.push(`| Type | Count |`)
      lines.push(`|------|-------|`)
      for (const [k, v] of Object.entries(scan.facets.sessionTypes).sort((a, b) => b[1] - a[1])) {
        lines.push(`| ${tLabel(k)} | ${v} |`)
      }
      lines.push(``)
    }
  }

  // Session Assessment (collapsible)
  if (scan.facets?.sessions?.length) {
    lines.push(`## Session Assessment`)
    lines.push(``)
    lines.push(`<details>`)
    lines.push(`<summary>Click to expand (${scan.facets.sessions.length} sessions)</summary>`)
    lines.push(``)
    lines.push(`| Session | Goal | Outcome | Helpfulness | Satisfaction |`)
    lines.push(`|---------|------|---------|-------------|--------------|`)
    for (const s of scan.facets.sessions) {
      lines.push(`| \`${s.id}\` | ${tGoal(s.id, s.goal)} | ${tLabel(s.outcome)} | ${tLabel(s.helpfulness)} | ${tLabel(s.satisfaction)} |`)
    }
    lines.push(``)
    lines.push(`</details>`)
    lines.push(``)
  }

  // Team Feedback (always visible)
  lines.push(`## Team Feedback`)
  lines.push(``)
  if (narrative.teamFeedback.forTeam.length > 0) {
    lines.push(`### For the Team`)
    lines.push(``)
    for (const item of narrative.teamFeedback.forTeam) {
      lines.push(`- ${item}`)
    }
    lines.push(``)
  }
  if (narrative.teamFeedback.forAI.length > 0) {
    lines.push(`### For AI Improvement`)
    lines.push(``)
    for (const item of narrative.teamFeedback.forAI) {
      lines.push(`- ${item}`)
    }
    lines.push(``)
  }

  return lines.join('\n')
}

// ============================================================================
// Schema export — provide to LLM so it knows the JSON structure
// ============================================================================

export const NARRATIVE_SCHEMA_DESCRIPTION = `The NarrativeData JSON schema for report generation. The LLM should output a JSON object matching this structure:

{
  "format": "full" | "standard" | "minimal",
  "atAGlance": {
    "whatsWorking": "string",
    "whatsHindering": "string",
    "quickWins": "string",
    "horizon": "string (full only)"
  },
  "workDone": [{ "name": "string", "sessions": number, "description": "string" }],
  "resultsImpact": [{ "project": "string", "outcomes": "string", "impact": "string" }],
  "howYouUseCC": { "narrative": "string (Full: 3 paragraphs weaving in tool counts/friction counts/ratios. Standard: 1 paragraph. Minimal: 2-3 sentences)", "keyPattern": "string (1 sentence)" },
  "highlights": [{ "title": "string", "description": "string (cite concrete artifact counts: files, tests, issues)" }],
  "highlightsIntro": "string (e.g., '84% achievement rate across 83 sessions')" (optional),
  "learningsToShare": ["string"] (optional),
  "aiCollaborationTips": ["string"] (optional),
  "friction": {
    "categories": [{ "title": "string (6-10 word problem name)", "description": "string (explain pattern + mitigation)", "examples": ["string (2 per category, reference real artifacts)"] }],
    "suggestions": {
      "claudeMd": [{ "text": "string (actual CLAUDE.md directive)", "why": "string (what friction triggered this — cite session events)" }],
      "featuresToTry": [{ "name": "string", "oneliner": "string", "why": "string (start with 'Why for you:' + cite friction counts)", "code": "string (REQUIRED — complete working code: shell command, JSON config, or bash script. NEVER leave empty)" }],
      "usagePatterns": [{ "name": "string", "summary": "string (cite a data point: '27 of 61 sessions ended mostly_achieved')", "prompt": "string (REQUIRED — 50-100 word ready-to-paste prompt with numbered steps and verification requirements. NEVER leave empty)" }]
    }
  } (optional, omit for minimal),
  "keyPrompts": [{ "context": "string", "verbatim": "string (exact quote)", "outcome": "string" }],
  "otherNotes": "string (end on a humanizing note — a fun moment, surprising discovery, or personality-revealing quote)" (optional),
  "teamFeedback": { "forTeam": ["string"], "forAI": ["string"] },
  "onTheHorizon": [{ "title": "string", "description": "string (3-4 sentences, cite data making this relevant)", "tip": "string (Getting started: concrete first step)", "prompt": "string (REQUIRED — 100-150 word multi-step prompt with phases, verification requirements, and output format spec. NEVER leave empty)" }] (optional, full only)
}`
