#!/usr/bin/env bun
/**
 * generate-narrative — Code-orchestrated recap report generator.
 *
 * Instead of LLM interpreting SKILL.md and making tool calls,
 * this TypeScript code orchestrates the full pipeline:
 *   1. Run summarize (data collection)
 *   2. Spawn parallel `claude -p` for section groups
 *   3. Spawn sequential `claude -p` for At a Glance
 *   4. Assemble NarrativeData JSON + translations
 *   5. Render HTML + Markdown
 *
 * Target: ~60-130 seconds (comparable to insights' 69s)
 */

import { execFile } from 'child_process'
import { writeFile, readFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomBytes } from 'crypto'
import { tmpdir } from 'os'
import { generateFullReport, generateMarkdownReport, type NarrativeData, type ScanData } from './html-report.js'
import { getClaudeHome } from './session-scanner.js'

const PLUGIN_ROOT = join(import.meta.dir, '..')

// ============================================================================
// Helper: spawn claude -p and extract JSON
// ============================================================================

function spawnClaude(prompt: string, model: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('claude', [
      '-p', prompt,
      '--output-format', 'text',
      '--model', model,
      '--effort', 'medium',
      '--tools', '',
    ], {
      timeout: 180_000,
      maxBuffer: 2 * 1024 * 1024,
      env: { ...process.env },
    }, (err, stdout, stderr) => {
      if (err) reject(new Error(`claude -p failed: ${err.message}\n${stderr}`))
      else resolve(stdout)
    })
  })
}

function extractJson(text: string): any {
  // Find the outermost balanced JSON object
  const start = text.indexOf('{')
  if (start === -1) throw new Error('No JSON found in response')

  let depth = 0
  let inString = false
  let escape = false

  for (let i = start; i < text.length; i++) {
    const ch = text[i]!
    if (escape) { escape = false; continue }
    if (ch === '\\' && inString) { escape = true; continue }
    if (ch === '"' && !escape) { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        return JSON.parse(text.slice(start, i + 1))
      }
    }
  }
  throw new Error('No complete JSON object found in response')
}

// ============================================================================
// Section prompts
// ============================================================================

function makePrompt(group: string, format: string, language: string, data: string, schema: string): string {
  const itemCounts = format === 'full'
    ? '3 highlights, 5-10 key prompts, 3-5 CLAUDE.md suggestions, 2-3 features with code, 2-3 patterns with prompts, 3 on-the-horizon with 100+ word prompts.'
    : format === 'standard'
      ? '2-3 highlights, 3-5 key prompts, 3-5 CLAUDE.md suggestions. No features/patterns/horizon.'
      : '1-2 highlights, 1-3 key prompts. No suggestions, no horizon.'

  // DATA comes FIRST as identical prefix across all groups → enables API prompt caching
  // All 8 parallel calls share the same 20KB prefix, so 7 of them get cache hits
  return `DATA:
${data}

---

You are generating the "${group}" section of an AI collaboration recap report. Write in ${language}.
Write detailed, substantive narratives. Cite specific data points, tool counts, and session events. Weave quantitative data into prose.
Items to include: ${itemCounts}

Generate ONLY a valid JSON object. No explanation, no markdown, ONLY JSON.

SCHEMA:
${schema}

Respond with ONLY a JSON object.`
}

const GROUP_SCHEMAS: Record<string, string> = {
  projects: `{
  "workDone": [{"name": "string (project area)", "sessions": number, "description": "string (goals + process + metrics)"}],
  "resultsImpact": [{"project": "string", "outcomes": "string", "impact": "string"}]
}`,

  profile: `{
  "howYouUseCC": {"narrative": "string (3 paragraphs: 1-archetype with tool counts, 2-interaction style with friction examples, 3-cross-cutting observations)", "keyPattern": "string (1 sentence)"},
  "highlights": [{"title": "string", "description": "string (cite concrete artifact counts: files, tests, issues, lines)"}],
  "highlightsIntro": "string (achievement rate + task diversity, e.g. '84% achievement rate across 83 sessions')"
}`,

  insights: `{
  "learningsToShare": ["string (workflow patterns teammates should try, skip if nothing stands out)"],
  "aiCollaborationTips": ["string (effective prompting patterns, skip if nothing stands out)"]
}`,

  'friction-analysis': `{
  "frictionCategories": [{"title": "string (6-10 word problem name)", "description": "string (pattern + mitigation, split Claude vs user blame)", "examples": ["string (2 per category, cite session IDs and artifacts)"]}]
}`,

  'friction-suggestions': `{
  "claudeMd": [{"text": "string (actual CLAUDE.md directive)", "why": "string (what friction triggered this — cite session events)"}],
  "featuresToTry": [{"name": "string", "oneliner": "string", "why": "string (Why for you: + friction counts)", "code": "string (COMPLETE working code example — shell command, JSON config, or bash script)"}],
  "usagePatterns": [{"name": "string", "summary": "string (cite data point)", "prompt": "string (50-100 word ready-to-paste prompt with numbered steps)"}]
}`,

  content: `{
  "keyPrompts": [{"context": "string (why pivotal)", "verbatim": "string (exact quote from keyPrompts data)", "outcome": "string (what happened)"}],
  "memoriesHighlight": "string (summarize key memories/learnings saved during sessions — from memoriesCreated in DATA. What was learned, what rules were established, what decisions were made. Skip if no memories.)",
  "otherNotes": "string (free-form, end on humanizing note)",
  "teamFeedback": {"forTeam": ["string (workflows to adopt)"], "forAI": ["string (friction with evidence)"]}
}`,

  horizon: `{
  "onTheHorizon": [{"title": "string", "description": "string (3-4 sentences citing data)", "tip": "string (getting started)", "prompt": "string (100-150 word multi-step prompt with phases/verification/output format)"}]
}`,
}

// ============================================================================
// Main pipeline
// ============================================================================

async function main() {
  const args = process.argv.slice(2)
  const startTime = Date.now()
  const runId = randomBytes(4).toString('hex')  // unique ID for temp files

  // Parse args
  let format = 'full'
  let language = 'ko'
  let model = 'opus'
  let outputBase = ''
  const passthrough: string[] = []  // args to pass to summarize

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    const next = args[i + 1]
    if (arg === '--format' && next) { format = next; i++ }
    else if (arg === '--language' && next) { language = next; i++ }
    else if (arg === '--model' && next) { model = next; i++ }
    else if (arg === '--output' && next) { outputBase = next; i++ }
    else passthrough.push(arg)
  }

  console.error(`[recap] Starting ${format} report in ${language} (model: ${model})...`)

  // ─── Step 1: Run summarize ───
  const scanOutputPath = join(tmpdir(), `recap-scan-${runId}.json`)
  const summarizeArgs = ['run', 'src/cli.ts', 'summarize', ...passthrough, '--scan-output', scanOutputPath]
  console.error(`[recap] Step 1: Summarizing sessions...`)
  const step1Start = Date.now()

  const summarizeOutput = await new Promise<string>((resolve, reject) => {
    execFile('bun', summarizeArgs, {
      cwd: PLUGIN_ROOT,
      timeout: 60_000,
      maxBuffer: 2 * 1024 * 1024,
    }, (err, stdout, stderr) => {
      if (err) reject(new Error(`summarize failed: ${err.message}\n${stderr}`))
      else resolve(stdout)
    })
  })

  const summaryData = JSON.parse(summarizeOutput)
  const dataStr = JSON.stringify(
    Object.fromEntries(Object.entries(summaryData).filter(([k]) => !k.startsWith('_') && k !== 'narrativeSchema')),
    null, 0  // compact JSON to minimize tokens
  )
  console.error(`[recap] Step 1 done (${((Date.now() - step1Start) / 1000).toFixed(1)}s). Sessions: ${summaryData.sessions}, Facets: ${summaryData.analyzedWithFacets}`)

  // ─── Step 2: Parallel section generation + translations ───
  console.error(`[recap] Step 2: Generating sections + translations in parallel...`)
  const step2Start = Date.now()

  // Determine which groups to generate
  const groups = format === 'minimal'
    ? ['projects', 'profile', 'content']
    : format === 'standard'
      ? ['projects', 'profile', 'insights', 'friction-analysis', 'friction-suggestions', 'content']
      : ['projects', 'profile', 'insights', 'friction-analysis', 'friction-suggestions', 'content', 'horizon']

  // Build translations prompt (runs in parallel with sections)
  const facetData = summaryData.facets || {}
  const allEnumKeys = new Set<string>()
  for (const bucket of ['outcomes', 'satisfaction', 'helpfulness', 'sessionTypes', 'frictionTypes', 'successFactors', 'goalCategories']) {
    if (facetData[bucket]) {
      for (const key of Object.keys(facetData[bucket])) allEnumKeys.add(key)
    }
  }
  const needsTranslation = allEnumKeys.size > 0 && language !== 'English' && language !== 'english'

  // ─── Step 2a: Cache seed — run translations first (same model, same DATA prefix) ───
  // This call primes the API cache with our 20KB DATA prefix.
  // Subsequent parallel calls with the same prefix get cache hits.
  let translations: any = { labels: {} }
  if (needsTranslation) {
    console.error(`[recap] Step 2a: Seeding cache with translations (${allEnumKeys.size} labels)...`)
    // Use same DATA prefix as section prompts for cache sharing
    const translationPrompt = `DATA:
${dataStr}

---

Translate these English enum labels to ${language}. Return ONLY a JSON object.

Labels: ${Array.from(allEnumKeys).join(', ')}

Session goals to translate:
${(summaryData._engineData?.facetSessions || []).slice(0, 20).map((s: any) => `${s.id}: ${s.goal}`).join('\n')}

Format: { "labels": {"key": "translated"}, "sessionGoals": {"id": "translated"}, "parallelWork": "...", "costNote": "...", "costSummary": "..." }

Context: concurrent=${summaryData.concurrentPeriods?.maxConcurrent || 1}, parallel=${summaryData.concurrentPeriods?.parallelPct || 0}%, cost=$${summaryData.tokens?.estimatedCost?.totalCost?.toFixed(0) || 0}, ROI=${Math.round((summaryData.tokens?.estimatedCost?.totalCost || 0) / 200)}x

Respond with ONLY a JSON object.`
    try {
      const response = await spawnClaude(translationPrompt, model)  // same model as sections!
      translations = extractJson(response)
      console.error(`[recap] Step 2a done — cache seeded.`)
    } catch (err) {
      console.error(`[recap] Warning: translations failed: ${(err as Error).message}`)
    }
  }

  // ─── Step 2b: All sections in parallel (cache should be warm now) ───
  const groupResults = await Promise.all(
    groups.map(async group => {
      const prompt = makePrompt(group, format, language, dataStr, GROUP_SCHEMAS[group]!)
      try {
        const response = await spawnClaude(prompt, model)
        return { group, data: extractJson(response) }
      } catch (err) {
        console.error(`[recap] Warning: ${group} failed: ${(err as Error).message}`)
        return { group, data: null }
      }
    })
  )

  console.error(`[recap] Step 2b done (${((Date.now() - step2Start) / 1000).toFixed(1)}s). ${groupResults.filter(r => r.data).length}/${groups.length} groups succeeded.`)

  // ─── Step 3: At a Glance (sequential, references other sections) ───
  console.error(`[recap] Step 3: Generating At a Glance...`)
  const step3Start = Date.now()

  const sectionSummary = groupResults
    .filter(r => r.data)
    .map(r => `${r.group}: ${JSON.stringify(r.data).slice(0, 1000)}`)
    .join('\n')

  const atAGlancePrompt = `You are generating the "At a Glance" summary for an AI collaboration recap report. Write in ${language}.
${format === 'full' ? 'Full format: 4 parts (whatsWorking, whatsHindering, quickWins, horizon). Each 2-3 sentences.' : format === 'standard' ? 'Standard: 4 parts, concise.' : 'Minimal: 3-line summary.'}

DATA:
${dataStr.slice(0, 5000)}

SECTIONS ALREADY GENERATED:
${sectionSummary}

Generate ONLY a JSON object:
{
  "atAGlance": {
    "whatsWorking": "string (cite highlights and successful workflows)",
    "whatsHindering": "string (cite friction categories, split Claude vs user blame)",
    "quickWins": "string (reference specific suggestions)",
    "horizon": "string (reference on the horizon items)"
  }
}

Respond with ONLY a JSON object.`

  let atAGlance: any = null
  try {
    const response = await spawnClaude(atAGlancePrompt, model)
    atAGlance = extractJson(response)
  } catch (err) {
    console.error(`[recap] Warning: atAGlance failed: ${(err as Error).message}`)
    atAGlance = { atAGlance: { whatsWorking: '', whatsHindering: '', quickWins: '', horizon: '' } }
  }

  console.error(`[recap] Step 3 done (${((Date.now() - step3Start) / 1000).toFixed(1)}s)`)

  // ─── Step 4: Assemble NarrativeData ───
  const narrative: NarrativeData = {
    format: format as 'full' | 'standard' | 'minimal',
    atAGlance: atAGlance?.atAGlance ?? { whatsWorking: '', whatsHindering: '', quickWins: '', horizon: '' },
    workDone: [],
    resultsImpact: [],
    howYouUseCC: { narrative: '', keyPattern: '' },
    highlights: [],
    keyPrompts: [],
    teamFeedback: { forTeam: [], forAI: [] },
  }

  for (const { group, data } of groupResults) {
    if (!data) continue
    if (group === 'projects') {
      narrative.workDone = data.workDone || []
      narrative.resultsImpact = data.resultsImpact || []
    } else if (group === 'profile') {
      narrative.howYouUseCC = data.howYouUseCC || { narrative: '', keyPattern: '' }
      narrative.highlights = data.highlights || []
      if (data.highlightsIntro) (narrative as any).highlightsIntro = data.highlightsIntro
    } else if (group === 'insights') {
      narrative.learningsToShare = data.learningsToShare
      narrative.aiCollaborationTips = data.aiCollaborationTips
    } else if (group === 'friction-analysis') {
      if (!narrative.friction) narrative.friction = { categories: [] }
      narrative.friction.categories = data.frictionCategories || []
    } else if (group === 'friction-suggestions') {
      if (!narrative.friction) narrative.friction = { categories: [] }
      narrative.friction.suggestions = {
        claudeMd: data.claudeMd || [],
        featuresToTry: data.featuresToTry,
        usagePatterns: data.usagePatterns,
      }
    } else if (group === 'content') {
      narrative.keyPrompts = data.keyPrompts || []
      if (data.memoriesHighlight) (narrative as any).memoriesHighlight = data.memoriesHighlight
      narrative.otherNotes = data.otherNotes
      narrative.teamFeedback = data.teamFeedback || { forTeam: [], forAI: [] }
    } else if (group === 'horizon') {
      narrative.onTheHorizon = data.onTheHorizon
    }
  }

  // Translations already generated in parallel with Step 2
  narrative.translations = translations

  // ─── Step 5: Save and render ───
  console.error(`[recap] Step 5: Rendering...`)

  const narrativePath = join(tmpdir(), `recap-narrative-${runId}.json`)
  await writeFile(narrativePath, JSON.stringify(narrative, null, 2), { encoding: 'utf-8', mode: 0o600 })

  // Load scan data and add facets
  const scanRaw = JSON.parse(await readFile(scanOutputPath, 'utf-8'))
  // Merge facet sessions from summarize _engineData
  if (summaryData._engineData?.facetSessions) {
    scanRaw.facets = {
      ...summaryData.facets,
      sessions: summaryData._engineData.facetSessions,
    }
  }
  await writeFile(scanOutputPath, JSON.stringify(scanRaw, null, 2), { encoding: 'utf-8', mode: 0o600 })

  const scanData = scanRaw as ScanData
  const html = generateFullReport(scanData, narrative)
  const md = generateMarkdownReport(scanData, narrative)

  // Output paths
  if (!outputBase) {
    const dir = join(getClaudeHome(), 'recap-reports')
    await mkdir(dir, { recursive: true })
    const ts = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15)
    outputBase = join(dir, `recap-${ts}`)
  }

  const htmlPath = outputBase.endsWith('.html') ? outputBase : `${outputBase}.html`
  const mdPath = outputBase.endsWith('.html') ? outputBase.replace(/\.html$/, '.md') : `${outputBase}.md`

  await writeFile(htmlPath, html, { encoding: 'utf-8', mode: 0o600 })
  await writeFile(mdPath, md, { encoding: 'utf-8', mode: 0o600 })

  // Cleanup temp files
  try {
    const { unlink } = await import('fs/promises')
    await unlink(scanOutputPath).catch(() => {})
    await unlink(narrativePath).catch(() => {})
  } catch {}

  const totalSec = ((Date.now() - startTime) / 1000).toFixed(1)
  console.error(`[recap] Done in ${totalSec}s`)

  console.log(JSON.stringify({
    html: htmlPath,
    md: mdPath,
    time: `${totalSec}s`,
    sessions: summaryData.sessions,
    messages: summaryData.messages,
    format,
  }, null, 2))
}

main().catch(err => {
  console.error(`[recap] Fatal: ${err.message}`)
  process.exit(1)
})
