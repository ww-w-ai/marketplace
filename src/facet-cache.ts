/**
 * Facet Cache — stores and retrieves structured session assessments.
 * Independent implementation (no Claude Code source dependency).
 *
 * Facets are per-session structured analyses (goal, outcome, friction, etc.)
 * that ensure consistency across recap reports.
 */

import { mkdir, readFile, writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { getClaudeHome } from './session-scanner.js'

// ============================================================================
// Types
// ============================================================================

export type OutcomeLevel = 'fully_achieved' | 'mostly_achieved' | 'partially_achieved' | 'not_achieved'
export type HelpfulnessLevel = 'essential' | 'very_helpful' | 'moderately_helpful' | 'slightly_helpful' | 'unhelpful'
export type SatisfactionLevel = 'frustrated' | 'dissatisfied' | 'likely_satisfied' | 'satisfied' | 'happy'
export type SessionTypeEnum = 'iterative_refinement' | 'multi_task' | 'exploration' | 'quick_question' | 'autonomous_pipeline'

export type SessionFacet = {
  sessionId: string
  goal: string
  outcome: OutcomeLevel
  helpfulness: HelpfulnessLevel
  frictionTypes: string[]
  frictionDetail: string
  summary: string
  goalCategories: Record<string, number>
  sessionType: SessionTypeEnum
  satisfaction: SatisfactionLevel
  successFactors: string[]
  keyPrompts?: Array<{ verbatim: string; why: string; impact: string }>
  repeatedInstructions?: string[]
  memoriesCreated?: Array<{ name: string; type: string; summary: string }>
}

// ============================================================================
// Cache Paths
// ============================================================================

function getCacheDir(): string {
  return join(getClaudeHome(), 'recap-data', 'facets')
}

function getMetaCacheDir(): string {
  return join(getClaudeHome(), 'recap-data', 'meta')
}

// ============================================================================
// Normalization
// ============================================================================

const VALID_OUTCOMES: readonly OutcomeLevel[] = ['fully_achieved', 'mostly_achieved', 'partially_achieved', 'not_achieved']
const VALID_HELPFULNESS: readonly HelpfulnessLevel[] = ['essential', 'very_helpful', 'moderately_helpful', 'slightly_helpful', 'unhelpful']
const VALID_SATISFACTION: readonly SatisfactionLevel[] = ['frustrated', 'dissatisfied', 'likely_satisfied', 'satisfied', 'happy']
const VALID_SESSION_TYPES: readonly SessionTypeEnum[] = ['iterative_refinement', 'multi_task', 'exploration', 'quick_question', 'autonomous_pipeline']

const VALID_FRICTION_TYPES = [
  'destructive-action', 'repeated-bugs', 'trust-erosion', 'context_loss',
  'wrong_approach', 'misunderstood_request', 'rate_limit', 'verbose_process',
  'context_length', 'incomplete_work', 'looping_on_errors', 'trust_gap',
  'scope_creep', 'design_iteration', 'context_limit', 'session_too_long',
  'iterative_debugging', 'repeated_attempts', 'tool_limitation',
  'overcomplicated_approach', 'ux_gaps_found_during_testing',
] as const

function normalizeOutcome(raw: string): OutcomeLevel {
  const lower = raw.toLowerCase().replace(/[\s-]/g, '_')
  if ((VALID_OUTCOMES as readonly string[]).includes(lower)) return lower as OutcomeLevel
  // For short enum-like values, do keyword inference
  // For long free text (>80 chars), default to mostly_achieved (long descriptions usually mean substantial work was done)
  if (lower.length > 80) return 'mostly_achieved'
  if (lower.includes('fully') || lower.includes('success')) return 'fully_achieved'
  if (lower.includes('most')) return 'mostly_achieved'
  if (lower.includes('partial')) return 'partially_achieved'
  if (lower.includes('not_achieved') || lower.includes('failed')) return 'not_achieved'
  return 'partially_achieved'
}

function normalizeHelpfulness(raw: string): HelpfulnessLevel {
  const lower = raw.toLowerCase().replace(/[\s-]/g, '_')
  if ((VALID_HELPFULNESS as readonly string[]).includes(lower)) return lower as HelpfulnessLevel
  // Infer from free text
  if (lower.includes('essential')) return 'essential'
  if (lower.includes('very') || lower.includes('high')) return 'very_helpful'
  if (lower.includes('moderate') || lower.includes('mixed')) return 'moderately_helpful'
  if (lower.includes('slight') || lower.includes('low')) return 'slightly_helpful'
  if (lower.includes('unhelpful') || lower.includes('not_helpful')) return 'unhelpful'
  return 'moderately_helpful'
}

function normalizeSatisfaction(raw: string): SatisfactionLevel {
  const lower = raw.toLowerCase().replace(/[\s-]/g, '_')
  if ((VALID_SATISFACTION as readonly string[]).includes(lower)) return lower as SatisfactionLevel
  // Infer from free text
  if (lower.includes('happy') || lower === 'high') return 'happy'
  if (lower === 'satisfied' || lower.includes('mostly_satisfied')) return 'satisfied'
  if (lower.includes('moderate') || lower.includes('mixed')) return 'likely_satisfied'
  if (lower.includes('dissatisfied') || lower === 'low') return 'dissatisfied'
  if (lower.includes('frustrated')) return 'frustrated'
  return 'likely_satisfied'
}

function normalizeSessionType(raw: string): SessionTypeEnum {
  const lower = raw.toLowerCase().replace(/[\s-]/g, '_')
  if ((VALID_SESSION_TYPES as readonly string[]).includes(lower)) return lower as SessionTypeEnum
  // Map common variants
  const iterativeVariants = [
    'feature_development', 'iterative_development', 'greenfield_project',
    'major_feature_development',
  ]
  const multiTaskVariants = [
    'collaborative_authoring', 'extended_development', 'marathon_development',
  ]
  if (iterativeVariants.includes(lower)) return 'iterative_refinement'
  if (multiTaskVariants.includes(lower)) return 'multi_task'
  if (lower.includes('explor')) return 'exploration'
  if (lower.includes('quick') || lower.includes('question')) return 'quick_question'
  if (lower.includes('autonom') || lower.includes('pipeline')) return 'autonomous_pipeline'
  return 'iterative_refinement'
}

function normalizeFrictionTypes(raw: string[]): string[] {
  if (!Array.isArray(raw)) return []
  const validSet = new Set<string>(VALID_FRICTION_TYPES)
  return raw.map(f => {
    const normalized = f.toLowerCase().replace(/[\s-]/g, '_').replace(/_+/g, '_')
    // Return as-is if valid or close enough — friction types are more open-ended
    return validSet.has(normalized) ? normalized : normalized
  })
}

/**
 * Validate and normalize a raw facet object into a properly typed SessionFacet.
 * Returns null if required fields are missing.
 */
export function normalizeFacet(raw: any): SessionFacet | null {
  if (!raw || typeof raw !== 'object') return null
  if (!raw.sessionId || !raw.goal || !raw.outcome) return null

  return {
    sessionId: String(raw.sessionId),
    goal: String(raw.goal),
    outcome: normalizeOutcome(String(raw.outcome)),
    helpfulness: normalizeHelpfulness(String(raw.helpfulness ?? 'moderately_helpful')),
    frictionTypes: normalizeFrictionTypes(raw.frictionTypes ?? []),
    frictionDetail: String(raw.frictionDetail ?? ''),
    summary: String(raw.summary ?? ''),
    goalCategories: raw.goalCategories && typeof raw.goalCategories === 'object' ? raw.goalCategories : {},
    sessionType: normalizeSessionType(String(raw.sessionType ?? 'iterative_refinement')),
    satisfaction: normalizeSatisfaction(String(raw.satisfaction ?? 'likely_satisfied')),
    successFactors: Array.isArray(raw.successFactors) ? raw.successFactors.map(String) : [],
    keyPrompts: Array.isArray(raw.keyPrompts)
      ? raw.keyPrompts.filter((p: any) => p?.verbatim).map((p: any) => ({
          verbatim: String(p.verbatim),
          why: String(p.why || ''),
          impact: String(p.impact || ''),
        }))
      : undefined,
    repeatedInstructions: Array.isArray(raw.repeatedInstructions)
      ? raw.repeatedInstructions.map(String)
      : undefined,
    memoriesCreated: Array.isArray(raw.memoriesCreated)
      ? raw.memoriesCreated.filter((m: any) => m?.name).map((m: any) => ({
          name: String(m.name),
          type: String(m.type || 'project'),
          summary: String(m.summary || ''),
        }))
      : undefined,
  }
}

// ============================================================================
// Facet Cache
// ============================================================================

export async function loadCachedFacet(sessionId: string): Promise<SessionFacet | null> {
  const cachePath = join(getCacheDir(), `${sessionId}.json`)
  try {
    const content = await readFile(cachePath, 'utf-8')
    const parsed = JSON.parse(content)
    const normalized = normalizeFacet(parsed)
    if (!normalized) {
      await unlink(cachePath).catch(() => {})
      return null
    }
    return normalized
  } catch {
    return null
  }
}

export async function saveFacet(facet: SessionFacet): Promise<void> {
  const cacheDir = getCacheDir()
  await mkdir(cacheDir, { recursive: true })
  const cachePath = join(cacheDir, `${facet.sessionId}.json`)
  await writeFile(cachePath, JSON.stringify(facet, null, 2), {
    encoding: 'utf-8',
    mode: 0o600,
  })
}

export async function loadCachedFacets(
  sessionIds: string[],
): Promise<Map<string, SessionFacet>> {
  const results = new Map<string, SessionFacet>()

  // Parallel cache lookups in batches of 50
  const BATCH_SIZE = 50
  for (let i = 0; i < sessionIds.length; i += BATCH_SIZE) {
    const batch = sessionIds.slice(i, i + BATCH_SIZE)
    const loaded = await Promise.all(
      batch.map(async id => ({ id, facet: await loadCachedFacet(id) })),
    )
    for (const { id, facet } of loaded) {
      if (facet) results.set(id, facet)
    }
  }

  return results
}

// ============================================================================
// Session Meta Cache (for metrics, so we don't re-parse JSONL)
// ============================================================================

export type CachedSessionMeta = {
  sessionId: string
  startTime: string
  endTime?: string
  durationMinutes: number
  userMessageCount: number
  assistantMessageCount: number
  toolCounts: Record<string, number>
  languages: Record<string, number>
  linesAdded: number
  linesRemoved: number
  filesModified: number
  gitCommits: number
  gitPushes: number
  toolErrors: number
  toolErrorCategories: Record<string, number>
  messageHours: number[]
  messageDays: string[]
  messageDayOfWeek: number[]
  responseTimes: number[]
  tokens?: { input: number; output: number; cacheRead: number; cacheCreation: number }
  fileSize?: number  // JSONL file size at cache time — used to detect stale cache
}

export async function loadCachedMeta(
  sessionId: string,
): Promise<CachedSessionMeta | null> {
  const cachePath = join(getMetaCacheDir(), `${sessionId}.json`)
  try {
    const content = await readFile(cachePath, 'utf-8')
    return JSON.parse(content) as CachedSessionMeta
  } catch {
    return null
  }
}

export async function saveMeta(meta: CachedSessionMeta): Promise<void> {
  const cacheDir = getMetaCacheDir()
  await mkdir(cacheDir, { recursive: true })
  const cachePath = join(cacheDir, `${meta.sessionId}.json`)
  await writeFile(cachePath, JSON.stringify(meta, null, 2), {
    encoding: 'utf-8',
    mode: 0o600,
  })
}

export async function loadCachedMetas(
  sessionIds: string[],
): Promise<Map<string, CachedSessionMeta>> {
  const results = new Map<string, CachedSessionMeta>()

  const BATCH_SIZE = 50
  for (let i = 0; i < sessionIds.length; i += BATCH_SIZE) {
    const batch = sessionIds.slice(i, i + BATCH_SIZE)
    const loaded = await Promise.all(
      batch.map(async id => ({ id, meta: await loadCachedMeta(id) })),
    )
    for (const { id, meta } of loaded) {
      if (meta) results.set(id, meta)
    }
  }

  return results
}
