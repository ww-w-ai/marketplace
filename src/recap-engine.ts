/**
 * Recap Engine — orchestrates the full recap pipeline.
 * Independent implementation (no Claude Code source dependency).
 *
 * Pipeline:
 *   1. Scan sessions (with mtime pre-filter)
 *   2. Load metrics (cached or parse)
 *   3. Filter by date range (exact)
 *   4. Filter substantive sessions
 *   5. Load facets (cached or need extraction)
 *   6. Aggregate metrics
 *   7. Return data ready for report generation
 */

import {
  scanSessionFiles,
  parseSessionFile,
  extractPromptsFromFile,
  isSessionInDateRange,
  type DateRange,
  type ScanScope,
  type SessionFile,
} from './session-scanner.js'
import {
  extractMetrics,
  aggregateMetrics,
  detectConcurrentSessions,
  type SessionMetrics,
  type AggregatedMetrics,
} from './metrics-extractor.js'
import {
  loadCachedFacets,
  loadCachedMetas,
  saveMeta,
  type SessionFacet,
  type CachedSessionMeta,
} from './facet-cache.js'

// ============================================================================
// Config
// ============================================================================

const MAX_SESSIONS_TO_PARSE = 200
const META_BATCH_SIZE = 50

// ============================================================================
// Types
// ============================================================================

export type RecapData = {
  metrics: AggregatedMetrics
  sessionMetrics: SessionMetrics[]
  facets: Map<string, SessionFacet>
  uncachedSessionIds: string[]  // Sessions that need facet extraction
  totalScanned: number
  dateRange?: DateRange
}

// ============================================================================
// Main Pipeline
// ============================================================================

export async function runRecapPipeline(
  dateRange?: DateRange,
  scope?: ScanScope,
  basePath?: string,
  tz?: string,
  includeSubagents?: boolean,
  paths?: string[],
  excludePaths?: string[],
): Promise<RecapData> {
  // Phase 1: Scan session files (mtime pre-filter + scope filter)
  const allFiles = await scanSessionFiles({ dateRange, scope, basePath, tz, includeSubagents, paths, excludePaths })
  const totalScanned = allFiles.length

  // Phase 2: Load cached metas, identify which need parsing
  const sessionIds = allFiles.map(f => f.sessionId)
  const cachedMetas = await loadCachedMetas(sessionIds)

  const toParse: SessionFile[] = []
  const metricsFromCache: SessionMetrics[] = []
  // Sessions with cached metrics but need prompt re-extraction
  const needPromptsFromCache: SessionFile[] = []

  for (const file of allFiles) {
    const cached = cachedMetas.get(file.sessionId)
    // Stale cache check: if file size changed, re-parse instead of using cache
    const isCacheStale = cached?.fileSize !== undefined && cached.fileSize !== file.size
    if (cached && !isCacheStale) {
      metricsFromCache.push({
        sessionId: cached.sessionId,
        projectPath: file.projectHash,
        startTime: cached.startTime,
        endTime: cached.endTime ?? cached.startTime,
        durationMinutes: cached.durationMinutes,
        userMessageCount: cached.userMessageCount,
        assistantMessageCount: cached.assistantMessageCount ?? 0,
        toolCounts: cached.toolCounts,
        languages: cached.languages,
        linesAdded: cached.linesAdded,
        linesRemoved: cached.linesRemoved,
        filesModified: new Set(),  // count preserved via cached.filesModified
        filesByCategory: { code: [], docs: [], config: [], assets: [], other: [] },
        bashCliTools: {},
        gitCommits: cached.gitCommits ?? 0,
        gitPushes: cached.gitPushes ?? 0,
        toolErrors: cached.toolErrors ?? 0,
        toolErrorCategories: cached.toolErrorCategories ?? {},
        userPrompts: [],  // Will be filled from JSONL re-scan below
        messageHours: cached.messageHours ?? [],
        messageDays: cached.messageDays ?? [],
        messageDayOfWeek: cached.messageDayOfWeek ?? [],
        responseTimes: cached.responseTimes ?? [],
        tokens: cached.tokens
          ? { inputTokens: cached.tokens.input, outputTokens: cached.tokens.output, cacheReadTokens: cached.tokens.cacheRead, cacheCreationTokens: cached.tokens.cacheCreation }
          : { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0 },
      })
      // Track file so we can extract prompts from it
      needPromptsFromCache.push(file)
    } else if (toParse.length < MAX_SESSIONS_TO_PARSE) {
      toParse.push(file)
    }
  }

  // Phase 2.5: Re-extract user prompts from cached sessions
  // Metrics are cached but prompts are not (too large to cache).
  // Uses lightweight stream scanner — reads line by line, extracts only user text.
  for (let i = 0; i < needPromptsFromCache.length; i += META_BATCH_SIZE) {
    const batch = needPromptsFromCache.slice(i, i + META_BATCH_SIZE)
    const batchResults = await Promise.all(
      batch.map(async file => {
        try {
          const prompts = await extractPromptsFromFile(file.path)
          return { sessionId: file.sessionId, prompts }
        } catch {
          return { sessionId: file.sessionId, prompts: [] }
        }
      }),
    )
    for (const { sessionId, prompts } of batchResults) {
      const cached = metricsFromCache.find(m => m.sessionId === sessionId)
      if (cached) {
        cached.userPrompts = prompts
      }
    }
  }

  // Phase 3: Parse uncached sessions in batches (full metrics + prompts)
  const parsedMetrics: SessionMetrics[] = []

  for (let i = 0; i < toParse.length; i += META_BATCH_SIZE) {
    const batch = toParse.slice(i, i + META_BATCH_SIZE)
    const batchResults = await Promise.all(
      batch.map(async file => {
        try {
          const messages = await parseSessionFile(file.path)
          if (messages.length === 0) return null

          // Determine project path from file path
          // ~/.claude/projects/<project-hash>/session.jsonl
          const pathParts = file.path.split('/')
          const projectIdx = pathParts.indexOf('projects')
          const projectPath = projectIdx >= 0 ? pathParts[projectIdx + 1] || '' : ''

          const metrics = extractMetrics(file.sessionId, projectPath, messages, tz)

          // Cache the meta for next time (include file size for stale detection)
          const metaToCache: CachedSessionMeta = {
            sessionId: metrics.sessionId,
            fileSize: file.size,
            startTime: metrics.startTime,
            endTime: metrics.endTime,
            durationMinutes: metrics.durationMinutes,
            userMessageCount: metrics.userMessageCount,
            assistantMessageCount: metrics.assistantMessageCount,
            toolCounts: metrics.toolCounts,
            languages: metrics.languages,
            linesAdded: metrics.linesAdded,
            linesRemoved: metrics.linesRemoved,
            filesModified: metrics.filesModified.size,
            gitCommits: metrics.gitCommits,
            gitPushes: metrics.gitPushes,
            toolErrors: metrics.toolErrors,
            toolErrorCategories: metrics.toolErrorCategories,
            messageHours: metrics.messageHours,
            messageDays: metrics.messageDays,
            messageDayOfWeek: metrics.messageDayOfWeek,
            responseTimes: metrics.responseTimes,
            tokens: {
              input: metrics.tokens.inputTokens,
              output: metrics.tokens.outputTokens,
              cacheRead: metrics.tokens.cacheReadTokens,
              cacheCreation: metrics.tokens.cacheCreationTokens,
            },
          }
          await saveMeta(metaToCache)

          return metrics
        } catch {
          return null
        }
      }),
    )

    for (const m of batchResults) {
      if (m) parsedMetrics.push(m)
    }
  }

  // Combine cached + parsed
  let allMetrics = [...metricsFromCache, ...parsedMetrics]

  // Phase 4: Exact date filter
  if (dateRange?.from || dateRange?.to) {
    allMetrics = allMetrics.filter(m =>
      isSessionInDateRange(m.startTime, dateRange, tz),
    )
  }

  // Phase 5: Filter substantive sessions
  allMetrics = allMetrics.filter(
    m => m.userMessageCount >= 2 && m.durationMinutes >= 1,
  )

  // Sort by startTime descending
  allMetrics.sort((a, b) => b.startTime.localeCompare(a.startTime))

  // Phase 6: Load cached facets
  const facetIds = allMetrics.map(m => m.sessionId)
  const facets = await loadCachedFacets(facetIds)

  // Identify sessions that need facet extraction
  const uncachedSessionIds = facetIds.filter(id => !facets.has(id))

  // Phase 7: Aggregate
  const aggregated = aggregateMetrics(allMetrics, tz)

  // Phase 8: Concurrent session detection
  aggregated.concurrentPeriods = detectConcurrentSessions(allMetrics)

  return {
    metrics: aggregated,
    sessionMetrics: allMetrics,
    facets,
    uncachedSessionIds,
    totalScanned,
    dateRange,
  }
}

// ============================================================================
// Commit-scoped pipeline (lighter, for recap-commit)
// ============================================================================

export async function runCommitRecapPipeline(
  sinceISO: string,
  basePath?: string,
): Promise<RecapData> {
  // Commit recap: scan only current project, from last commit date
  const fromDate = sinceISO.split('T')[0]!
  return runRecapPipeline({ from: fromDate }, 'default', basePath)
}
