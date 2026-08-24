#!/usr/bin/env bun
/**
 * CLI entry point for the recap engine.
 * Called by the skill prompts via Bash tool.
 *
 * Usage:
 *   bun run src/cli.ts scan [--from DATE] [--to DATE] [--scope default|with-subfolder|all] [--path PATH] [--tz TIMEZONE]
 *   bun run src/cli.ts recap-commit
 *
 * Scope:
 *   default          (default) specified or current folder only
 *   with-subfolder   specified or current folder + all subdirectory projects
 *   all       all projects across the machine
 */

import { runRecapPipeline, runCommitRecapPipeline } from './recap-engine.js'
import { estimateCost } from './metrics-extractor.js'
import { analyzeGitHistory } from './git-analyzer.js'
import { parseDateArg, getSystemTimezone, getClaudeHome, scanSessionFiles, formatTranscript, type ScanScope } from './session-scanner.js'
import { readRawMessages, buildTurns } from './commit-log.js'
import { generateFullReport, generateMarkdownReport, NARRATIVE_SCHEMA_DESCRIPTION, type NarrativeData, type ScanData } from './html-report.js'
import { loadCachedFacets, loadCachedFacet, type SessionFacet } from './facet-cache.js'
import { execFileSync, execSync } from 'child_process'
import { mkdir, writeFile, readFile } from 'fs/promises'
import { join } from 'path'

const args = process.argv.slice(2)
const command = args[0]

function parseCliArgs(): {
  from?: string
  to?: string
  scope: ScanScope
  path?: string
  paths?: string[]
  excludePaths?: string[]
  tz: string
  includeSubagents: boolean
} {
  // Resolve tz first so parseDateArg can use it
  let tz = getSystemTimezone()
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--tz' && args[i + 1]) {
      tz = args[i + 1]!
      break
    }
  }

  const result: {
    from?: string
    to?: string
    scope: ScanScope
    path?: string
    paths?: string[]
    excludePaths?: string[]
    tz: string
    includeSubagents: boolean
  } = { scope: 'default', tz, includeSubagents: true }

  const paths: string[] = []
  const excludePaths: string[] = []

  for (let i = 1; i < args.length; i++) {
    const arg = args[i]
    const next = args[i + 1]
    if (arg === '--from' && next) {
      result.from = parseDateArg(next, tz) ?? undefined
      i++
    } else if (arg === '--to' && next) {
      result.to = parseDateArg(next, tz) ?? undefined
      i++
    } else if (arg === '--scope' && next) {
      if (next === 'default' || next === 'with-subfolder' || next === 'all') {
        result.scope = next
      }
      i++
    } else if (arg === '--path' && next) {
      paths.push(next)
      i++
    } else if ((arg === '--exclude-path' || arg === '--exclude') && next) {
      excludePaths.push(next)
      i++
    } else if (arg === '--exclude-subagents') {
      result.includeSubagents = false
    } else if (arg === '--tz') {
      i++ // already parsed above
    }
  }

  // Single --path → basePath, multiple → paths[]
  if (paths.length === 1) {
    result.path = paths[0]
  } else if (paths.length > 1) {
    result.paths = paths
  }
  if (excludePaths.length > 0) {
    result.excludePaths = excludePaths
  }

  return result
}

function formatSessionData(data: Awaited<ReturnType<typeof runRecapPipeline>>, tz?: string) {
  return {
    totalScanned: data.totalScanned,
    sessions: data.metrics.totalSessions,
    messages: data.metrics.totalUserMessages,
    durationMinutes: data.metrics.totalDurationMinutes,
    toolCounts: data.metrics.toolCounts,
    languages: data.metrics.languages,
    linesAdded: data.metrics.totalLinesAdded,
    linesRemoved: data.metrics.totalLinesRemoved,
    filesModified: data.metrics.totalFilesModified,
    filesByCategory: {
      code: data.metrics.filesByCategory.code.length,
      docs: data.metrics.filesByCategory.docs.length,
      config: data.metrics.filesByCategory.config.length,
      assets: data.metrics.filesByCategory.assets.length,
      other: data.metrics.filesByCategory.other.length,
      docFiles: data.metrics.filesByCategory.docs,  // full list for LLM to describe
    },
    gitCommits: data.metrics.totalGitCommits,
    toolErrors: data.metrics.totalToolErrors,
    tokens: {
      input: data.metrics.totalTokens.inputTokens,
      output: data.metrics.totalTokens.outputTokens,
      cacheRead: data.metrics.totalTokens.cacheReadTokens,
      cacheCreation: data.metrics.totalTokens.cacheCreationTokens,
      used: data.metrics.totalTokens.inputTokens + data.metrics.totalTokens.outputTokens,
      cached: data.metrics.totalTokens.cacheReadTokens + data.metrics.totalTokens.cacheCreationTokens,
      total: data.metrics.totalTokens.inputTokens
        + data.metrics.totalTokens.outputTokens
        + data.metrics.totalTokens.cacheReadTokens
        + data.metrics.totalTokens.cacheCreationTokens,
      estimatedCost: estimateCost(data.metrics.totalTokens),
    },
    daysActive: data.metrics.daysActive,
    dayOfWeekCounts: data.metrics.dayOfWeekCounts,
    concurrentPeriods: data.metrics.concurrentPeriods,
    toolCategories: data.metrics.toolCategories,
    bashCliTools: data.metrics.bashCliTools,
    responseTimeStats: data.metrics.responseTimeStats,
    timezone: tz,
    dateRange: data.metrics.dateRange,
    cachedFacets: data.facets.size,
    uncachedSessionIds: data.uncachedSessionIds,
    userPrompts: data.metrics.allUserPrompts.map(p => ({
      text: p.text.slice(0, 1000),
      timestamp: p.timestamp,
    })),
    sessionSummaries: data.sessionMetrics.map(s => ({
      id: s.sessionId.slice(0, 8),
      project: s.projectPath,
      start: s.startTime,
      duration: s.durationMinutes,
      messages: s.userMessageCount,
      topTools: Object.entries(s.toolCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => `${name}(${count})`)
        .join(', '),
    })),
    // Project breakdown: folder → total hours, sessions, messages
    projectBreakdown: (() => {
      const projects: Record<string, { sessions: number; minutes: number; messages: number }> = {}
      for (const s of data.sessionMetrics) {
        const key = s.projectPath || 'unknown'
        if (!projects[key]) projects[key] = { sessions: 0, minutes: 0, messages: 0 }
        projects[key]!.sessions++
        projects[key]!.minutes += s.durationMinutes
        projects[key]!.messages += s.userMessageCount
      }
      return Object.entries(projects)
        .sort((a, b) => b[1].minutes - a[1].minutes)
        .map(([path, data]) => ({
          path: path,
          sessions: data.sessions,
          hours: parseFloat((data.minutes / 60).toFixed(1)),
          messages: data.messages,
        }))
    })(),
  }
}

async function main() {
  switch (command) {
    case 'scan': {
      const { from, to, scope, path, paths, excludePaths, tz, includeSubagents } = parseCliArgs()
      const dateRange = from || to ? { from, to } : undefined
      const data = await runRecapPipeline(dateRange, scope, path, tz, includeSubagents, paths, excludePaths)

      // Git analysis (optional — fails gracefully if not a git repo)
      const repoPath = path || paths?.[0] || process.cwd()
      const gitData = await analyzeGitHistory(repoPath, from, to)

      const output = formatSessionData(data, tz) as any

      // Add requested range (what the user asked for) vs actual activity range
      const now = new Date()
      const fmtLocal = (d: Date) => {
        const opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }
        return new Intl.DateTimeFormat('en-CA', opts).format(d).replace(',', '')
      }
      // User name for report title
      let userName = 'User'
      try { userName = execFileSync('git', ['config', 'user.name'], { encoding: 'utf-8', timeout: 3000 }).trim() } catch {}
      if (!userName || userName === 'User') {
        try { userName = execFileSync('whoami', [], { encoding: 'utf-8', timeout: 3000 }).trim() } catch {}
      }
      output.userName = userName

      output.requestedRange = {
        from: from ? fmtLocal(from.includes('T') ? new Date(from) : new Date(`${from}T00:00:00`)) : 'all time',
        to: to ? fmtLocal(to.includes('T') ? new Date(to) : new Date(`${to}T23:59:59`)) : fmtLocal(now),
      }
      output.activityRange = output.dateRange  // actual first/last session timestamps
      if (gitData) {
        output.git = {
          commits: gitData.totalCommits,
          insertions: gitData.totalInsertions,
          deletions: gitData.totalDeletions,
          filesChanged: gitData.totalFilesChanged,
          topFiles: gitData.topFiles.slice(0, 10),
          recentCommits: gitData.commits.slice(0, 20).map(c => ({
            date: c.date.split('T')[0],
            message: c.message,
            files: c.filesChanged,
            lines: `+${c.insertions}/-${c.deletions}`,
          })),
          commitsByDay: gitData.commitsByDay,
        }
      }

      // Include narrative schema so LLM knows what JSON to generate
      output.narrativeSchema = NARRATIVE_SCHEMA_DESCRIPTION

      console.log(JSON.stringify(output, null, 2))
      break
    }

    case 'summarize': {
      // Compact summary (~20KB) for LLM narrative generation.
      // Same pipeline as scan, but outputs aggregated data instead of raw details.
      const { from, to, scope, path, paths, excludePaths, tz, includeSubagents } = parseCliArgs()
      const dateRange = from || to ? { from, to } : undefined
      const data = await runRecapPipeline(dateRange, scope, path, tz, includeSubagents, paths, excludePaths)

      const cost = estimateCost(data.metrics.totalTokens)
      const usedTokens = data.metrics.totalTokens.inputTokens + data.metrics.totalTokens.outputTokens

      // User name
      let userName = 'User'
      try { userName = execFileSync('git', ['config', 'user.name'], { encoding: 'utf-8', timeout: 3000 }).trim() } catch {}
      if (!userName || userName === 'User') {
        try { userName = execFileSync('whoami', [], { encoding: 'utf-8', timeout: 3000 }).trim() } catch {}
      }

      // Requested/activity range
      const now = new Date()
      const fmtLocal = (d: Date) => {
        const opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }
        return new Intl.DateTimeFormat('en-CA', opts).format(d).replace(',', '')
      }

      // Load facets for all sessions
      const sessionIds = data.sessionMetrics.map(s => s.sessionId)
      const facets = await loadCachedFacets(sessionIds)

      // --- Build compact summary ---

      // Top tools (8)
      const topTools = Object.entries(data.metrics.toolCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)

      // Top languages (8)
      const topLanguages = Object.entries(data.metrics.languages)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)

      // Project breakdown (top 10)
      const projectMap: Record<string, { sessions: number; minutes: number; messages: number }> = {}
      for (const s of data.sessionMetrics) {
        const key = s.projectPath || 'unknown'
        if (!projectMap[key]) projectMap[key] = { sessions: 0, minutes: 0, messages: 0 }
        projectMap[key]!.sessions++
        projectMap[key]!.minutes += s.durationMinutes
        projectMap[key]!.messages += s.userMessageCount
      }
      const projectBreakdown = Object.entries(projectMap)
        .sort((a, b) => b[1].minutes - a[1].minutes)
        .slice(0, 10)
        .map(([p, d]) => ({
          path: p,
          hours: parseFloat((d.minutes / 60).toFixed(1)),
          sessions: d.sessions,
          messages: d.messages,
        }))

      // Aggregate facets
      const outcomes: Record<string, number> = {}
      const satisfaction: Record<string, number> = {}
      const helpfulness: Record<string, number> = {}
      const frictionTypes: Record<string, number> = {}
      const successFactors: Record<string, number> = {}
      const goalCategories: Record<string, number> = {}
      const sessionTypes: Record<string, number> = {}
      const facetSummaries: string[] = []
      const frictionDetails: string[] = []
      const repeatedInstructions: string[] = []
      const allKeyPrompts: Array<{ verbatim: string; why: string; impact: string; sessionId: string }> = []
      const allMemories: Array<{ name: string; type: string; summary: string; session: string }> = []
      const facetSessions: Array<{ id: string; goal: string; outcome: string; helpfulness: string; satisfaction: string; frictionTypes: string[] }> = []

      for (const [sid, facet] of facets.entries()) {
        if (!facet) continue
        // Counts
        outcomes[facet.outcome] = (outcomes[facet.outcome] || 0) + 1
        satisfaction[facet.satisfaction] = (satisfaction[facet.satisfaction] || 0) + 1
        helpfulness[facet.helpfulness] = (helpfulness[facet.helpfulness] || 0) + 1
        sessionTypes[facet.sessionType] = (sessionTypes[facet.sessionType] || 0) + 1
        for (const ft of facet.frictionTypes) frictionTypes[ft] = (frictionTypes[ft] || 0) + 1
        for (const sf of facet.successFactors) successFactors[sf] = (successFactors[sf] || 0) + 1
        for (const [gc, cnt] of Object.entries(facet.goalCategories)) goalCategories[gc] = (goalCategories[gc] || 0) + (cnt as number)

        // 1-line summaries (max 50)
        if (facetSummaries.length < 50) {
          facetSummaries.push(`${sid.slice(0, 8)}: ${facet.summary.slice(0, 150)} (${facet.outcome})`)
        }

        // Friction details (max 20)
        if (facet.frictionDetail && frictionDetails.length < 20) {
          frictionDetails.push(facet.frictionDetail)
        }

        // Repeated instructions (max 15)
        if (facet.repeatedInstructions) {
          for (const inst of facet.repeatedInstructions) {
            if (repeatedInstructions.length < 15 && !repeatedInstructions.includes(inst)) {
              repeatedInstructions.push(inst)
            }
          }
        }

        // Key prompts (collect all, sort later)
        if (facet.keyPrompts) {
          for (const kp of facet.keyPrompts) {
            allKeyPrompts.push({ ...kp, sessionId: sid.slice(0, 8) })
          }
        }

        // Memories created during session
        if (facet.memoriesCreated) {
          for (const m of facet.memoriesCreated) {
            allMemories.push({ ...m, session: sid.slice(0, 8) })
          }
        }

        // Session assessment rows (compact for LLM — just id, goal, outcome)
        facetSessions.push({
          id: sid.slice(0, 8),
          goal: facet.goal.slice(0, 100),
          outcome: facet.outcome,
          helpfulness: facet.helpfulness,
          satisfaction: facet.satisfaction,
        })
      }

      // Top key prompts (max 20, prioritize longer verbatim — user invested effort)
      const topKeyPrompts = allKeyPrompts
        .sort((a, b) => b.verbatim.length - a.verbatim.length)
        .slice(0, 20)
        .map(kp => ({
          verbatim: kp.verbatim.slice(0, 500),
          why: kp.why,
          impact: kp.impact,
          session: kp.sessionId,
        }))

      // Top user prompts (not from facets — raw prompts for context, max 15, truncated)
      const topUserPrompts = data.metrics.allUserPrompts
        .sort((a, b) => b.text.length - a.text.length)
        .slice(0, 15)
        .map(p => p.text.slice(0, 200))

      const summary = {
        // --- Header ---
        userName,
        sessions: data.metrics.totalSessions,
        analyzedWithFacets: facets.size,
        messages: data.metrics.totalUserMessages,
        hours: parseFloat((data.metrics.totalDurationMinutes / 60).toFixed(1)),
        daysActive: data.metrics.daysActive,
        commits: data.metrics.totalGitCommits,
        linesAdded: data.metrics.totalLinesAdded,
        linesRemoved: data.metrics.totalLinesRemoved,
        filesModified: data.metrics.totalFilesModified,
        timezone: tz,
        requestedRange: {
          from: from ? fmtLocal(from.includes('T') ? new Date(from) : new Date(`${from}T00:00:00`)) : 'all time',
          to: to ? fmtLocal(to.includes('T') ? new Date(to) : new Date(`${to}T23:59:59`)) : fmtLocal(now),
        },
        activityRange: data.metrics.dateRange,

        // --- Aggregated metrics ---
        topTools,
        topLanguages,
        projectBreakdown,
        tokens: { used: usedTokens, cached: data.metrics.totalTokens.cacheReadTokens + data.metrics.totalTokens.cacheCreationTokens, estimatedCost: cost },
        responseTimeStats: data.metrics.responseTimeStats,
        dayOfWeekCounts: data.metrics.dayOfWeekCounts,
        concurrentPeriods: data.metrics.concurrentPeriods,

        // --- Facet aggregates (counts only for LLM, top entries) ---
        facets: {
          outcomes,
          satisfaction,
          helpfulness,
          sessionTypes,
          frictionTypes: Object.fromEntries(Object.entries(frictionTypes).sort((a, b) => b[1] - a[1]).slice(0, 10)),
          successFactors: Object.fromEntries(Object.entries(successFactors).sort((a, b) => b[1] - a[1]).slice(0, 10)),
          goalCategories: Object.fromEntries(Object.entries(goalCategories).sort((a, b) => b[1] - a[1]).slice(0, 10)),
        },

        // --- Narrative inputs ---
        sessionSummaries: facetSummaries,
        frictionDetails,
        repeatedInstructions,
        keyPrompts: topKeyPrompts,
        memoriesCreated: allMemories,
        topUserPrompts,

        // --- Schema for LLM to know the exact JSON structure ---
        narrativeSchema: NARRATIVE_SCHEMA_DESCRIPTION,

        // --- For render-report (engine data, not for LLM narrative generation) ---
        _engineData: {
          uncachedSessionIds: data.uncachedSessionIds,
          facetSessions,  // full assessment table data for engine rendering
        },
      }

      // Also save full scan data for render-report if --scan-output specified
      let scanOutputPath = ''
      for (let i = 1; i < args.length; i++) {
        if (args[i] === '--scan-output' && args[i + 1]) { scanOutputPath = args[i + 1]!; break }
      }
      if (scanOutputPath) {
        const fullScan = formatSessionData(data, tz) as any
        // Add requestedRange, activityRange, userName
        fullScan.userName = userName
        fullScan.requestedRange = summary.requestedRange
        fullScan.activityRange = summary.activityRange
        // Add facets for engine rendering
        fullScan.facets = {
          ...summary.facets,
          sessions: facetSessions,
        }
        fullScan.narrativeSchema = NARRATIVE_SCHEMA_DESCRIPTION
        await writeFile(scanOutputPath, JSON.stringify(fullScan, null, 2), { encoding: 'utf-8', mode: 0o600 })
      }

      console.log(JSON.stringify(summary, null, 2))
      break
    }

    case 'cowork-commit':
    case 'www-commit':
    case 'recap-commit': {
      let repoPath = process.cwd()
      for (let i = 1; i < args.length; i++) {
        if (args[i] === '--path' && args[i + 1]) { repoPath = args[i + 1]!; i++ }
      }
      let lastCommitISO: string
      try {
        lastCommitISO = execFileSync('git', ['log', '-1', '--format=%cI'], {
          encoding: 'utf-8', timeout: 10000, cwd: repoPath,
        }).trim()
      } catch {
        console.error(JSON.stringify({ error: 'no_previous_commit' }))
        process.exit(1)
      }

      const data = await runCommitRecapPipeline(lastCommitISO, repoPath)
      console.log(JSON.stringify({
        lastCommit: lastCommitISO,
        ...formatSessionData(data, getSystemTimezone()),
      }, null, 2))
      break
    }

    case 'list-uncached': {
      // List the sessions the report will ACTUALLY analyze that have NO cached
      // facet yet, with their JSONL paths — so the skill can dispatch the
      // facet-extractor agent per session (deterministic: the skill never
      // recomputes the project hash itself).
      //
      // Uses runRecapPipeline (NOT raw scanSessionFiles) so the set matches the
      // report's analyzed sessions after branch-dedup + empty-session filtering.
      // Subagent sessions (id starts with "agent-") are skipped: low signal for
      // qualitative facet analysis.
      const { from, to, scope, path, paths, excludePaths, tz, includeSubagents } = parseCliArgs()
      const dateRange = from || to ? { from, to } : undefined
      const data = await runRecapPipeline(dateRange, scope, path, tz, includeSubagents, paths, excludePaths)

      // sessionId -> JSONL path map (from the same file scan the pipeline used)
      const files = await scanSessionFiles({ dateRange, scope, basePath: path, tz, includeSubagents, paths, excludePaths })
      const pathById = new Map(files.map(f => [f.sessionId, f.path]))

      const uncached: Array<{ sessionId: string; path: string }> = []
      let subagentsSkipped = 0
      let pathMissing = 0
      for (const sid of data.uncachedSessionIds) {
        if (sid.startsWith('agent-')) { subagentsSkipped++; continue }
        const p = pathById.get(sid)
        if (!p) { pathMissing++; continue }
        uncached.push({ sessionId: sid, path: p })
      }

      const facetsDir = join(getClaudeHome(), 'recap-data', 'facets')
      console.log(JSON.stringify({
        facetsDir,
        analyzed: data.sessionMetrics.length,
        cached: data.sessionMetrics.length - data.uncachedSessionIds.length,
        subagentsSkipped,
        pathMissing,
        uncachedCount: uncached.length,
        uncached,
      }, null, 2))
      break
    }

    case 'prepare-facets': {
      const { from, to, scope, path, paths, excludePaths, tz, includeSubagents } = parseCliArgs()
      const dateRange = from || to ? { from, to } : undefined
      const sessions = await scanSessionFiles({ dateRange, scope, basePath: path, tz, includeSubagents, paths, excludePaths })

      const TWO_MB = 2 * 1024 * 1024
      const transcriptsDir = join(getClaudeHome(), 'recap-data', 'transcripts')
      await mkdir(transcriptsDir, { recursive: true })

      let prepared = 0
      let skipped = 0
      const transcriptPaths: Record<string, string> = {}

      for (const session of sessions) {
        if (session.size < TWO_MB) {
          skipped++
          continue
        }
        const transcript = await formatTranscript(session.path)
        const outPath = join(transcriptsDir, `${session.sessionId}.txt`)
        await writeFile(outPath, transcript, { encoding: 'utf-8', mode: 0o600 })
        transcriptPaths[session.sessionId] = outPath
        prepared++
      }

      console.log(JSON.stringify({ prepared, skipped, paths: transcriptPaths }, null, 2))
      break
    }

    case 'render-report': {
      // Parse --narrative and --scan-data and optional --output
      let narrativePath = ''
      let scanDataPath = ''
      let outputBase = ''
      for (let i = 1; i < args.length; i++) {
        if (args[i] === '--narrative' && args[i + 1]) { narrativePath = args[i + 1]!; i++ }
        else if (args[i] === '--scan-data' && args[i + 1]) { scanDataPath = args[i + 1]!; i++ }
        else if (args[i] === '--output' && args[i + 1]) { outputBase = args[i + 1]!; i++ }
      }
      if (!narrativePath || !scanDataPath) {
        console.error('Usage: bun run src/cli.ts render-report --narrative <path> --scan-data <path> [--output <base>]')
        process.exit(1)
      }

      const narrativeJson = JSON.parse(await readFile(narrativePath, 'utf-8')) as NarrativeData
      const scanJson = JSON.parse(await readFile(scanDataPath, 'utf-8')) as ScanData

      const html = generateFullReport(scanJson, narrativeJson)
      const md = generateMarkdownReport(scanJson, narrativeJson)

      // Default output: recap-reports dir
      if (!outputBase) {
        const dir = join(getClaudeHome(), 'recap-reports')
        await mkdir(dir, { recursive: true })
        const timestamp = new Date()
          .toISOString()
          .replace(/[-:]/g, '')
          .replace('T', '_')
          .slice(0, 15)
        outputBase = join(dir, `recap-${timestamp}`)
      }

      const htmlPath = outputBase.endsWith('.html') ? outputBase : `${outputBase}.html`
      const mdPath = outputBase.endsWith('.html') ? outputBase.replace(/\.html$/, '.md') : `${outputBase}.md`

      await writeFile(htmlPath, html, { encoding: 'utf-8', mode: 0o600 })
      await writeFile(mdPath, md, { encoding: 'utf-8', mode: 0o600 })

      console.log(JSON.stringify({ html: htmlPath, md: mdPath }, null, 2))
      break
    }

    case 'commit-log': {
      let fromISO: string | undefined
      let toISO: string | undefined
      let repoPath = process.cwd()
      for (let i = 1; i < args.length; i++) {
        if (args[i] === '--from' && args[i + 1]) { fromISO = args[i + 1]!; i++ }
        else if (args[i] === '--to' && args[i + 1]) { toISO = args[i + 1]!; i++ }
        else if (args[i] === '--path' && args[i + 1]) { repoPath = args[i + 1]!; i++ }
      }
      if (!fromISO) {
        try {
          fromISO = execFileSync('git', ['log', '-1', '--format=%cI'], {
            encoding: 'utf-8', timeout: 10000, cwd: repoPath,
          }).trim()
        } catch {
          console.error(JSON.stringify({ error: 'no_previous_commit' }))
          process.exit(1)
        }
      }

      const from = fromISO ? Date.parse(fromISO) : undefined
      const to = toISO ? Date.parse(toISO) : undefined

      const files = await scanSessionFiles({
        dateRange: { from: fromISO?.split('T')[0], to: toISO?.split('T')[0] },
        scope: 'default',
        basePath: repoPath,
        tz: getSystemTimezone(),
        includeSubagents: false,
      })

      const turns = []
      for (const f of files) {
        const raw = await readRawMessages(f.path)
        turns.push(...buildTurns(raw, f.sessionId.slice(0, 8), from, to))
      }
      turns.sort((a, b) => a.ts.localeCompare(b.ts))

      console.log(JSON.stringify({
        window: { from: fromISO, to: toISO ?? null },
        turns,
      }, null, 2))
      break
    }

    default:
      console.error('Usage: bun run src/cli.ts [scan|summarize|cowork-commit|commit-log|prepare-facets|render-report] [--from DATE] [--to DATE] ...')
      process.exit(1)
  }
}

main().catch(err => {
  console.error(JSON.stringify({ error: err.message }))
  process.exit(1)
})
