/**
 * Git Analyzer — extracts commit history for recap reports.
 * Runs `git log` on project directories to get real code change data.
 */

import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

// ============================================================================
// Types
// ============================================================================

export type GitCommit = {
  hash: string
  date: string        // ISO date
  message: string
  filesChanged: number
  insertions: number
  deletions: number
  files: string[]     // changed file paths
}

export type GitSummary = {
  totalCommits: number
  totalInsertions: number
  totalDeletions: number
  totalFilesChanged: number
  commits: GitCommit[]
  topFiles: Array<{ path: string; changes: number }>
  commitsByDay: Record<string, number>
}

// ============================================================================
// Git Log Parser
// ============================================================================

const GIT_LOG_FORMAT = '%H|%aI|%s'  // hash|date|message
const TIMEOUT_MS = 30_000

/**
 * Run git log on a directory and extract commit data.
 * Returns null if not a git repo or git is not available.
 */
export async function analyzeGitHistory(
  repoPath: string,
  since?: string,      // ISO date or relative (e.g., "2026-03-01")
  until?: string,
): Promise<GitSummary | null> {
  const args = [
    'log',
    '--format=' + GIT_LOG_FORMAT,
    '--numstat',
    '--no-merges',
  ]
  if (since) args.push(`--since=${since}`)
  if (until) args.push(`--until=${until}`)

  let output: string
  try {
    const result = await execFileAsync('git', args, {
      cwd: repoPath,
      timeout: TIMEOUT_MS,
      maxBuffer: 10 * 1024 * 1024,  // 10MB
    })
    output = result.stdout
  } catch {
    return null  // not a git repo or git not available
  }

  if (!output.trim()) return null

  // Parse git log output
  const commits: GitCommit[] = []
  const lines = output.split('\n')
  let current: GitCommit | null = null

  for (const line of lines) {
    if (!line.trim()) {
      if (current) {
        commits.push(current)
        current = null
      }
      continue
    }

    // Check if this is a commit header line (hash|date|message)
    const parts = line.split('|')
    if (parts.length >= 3 && parts[0]!.length === 40 && /^[a-f0-9]+$/.test(parts[0]!)) {
      if (current) commits.push(current)
      current = {
        hash: parts[0]!,
        date: parts[1]!,
        message: parts.slice(2).join('|'),  // message may contain |
        filesChanged: 0,
        insertions: 0,
        deletions: 0,
        files: [],
      }
    } else if (current) {
      // numstat line: insertions\tdeletions\tfilepath
      const statMatch = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/)
      if (statMatch) {
        const ins = statMatch[1] === '-' ? 0 : parseInt(statMatch[1]!, 10)
        const del = statMatch[2] === '-' ? 0 : parseInt(statMatch[2]!, 10)
        const filePath = statMatch[3]!
        current.insertions += ins
        current.deletions += del
        current.filesChanged++
        current.files.push(filePath)
      }
    }
  }
  if (current) commits.push(current)

  if (commits.length === 0) return null

  // Aggregate
  let totalInsertions = 0
  let totalDeletions = 0
  const allFiles = new Map<string, number>()
  const commitsByDay: Record<string, number> = {}

  for (const c of commits) {
    totalInsertions += c.insertions
    totalDeletions += c.deletions
    for (const f of c.files) {
      allFiles.set(f, (allFiles.get(f) || 0) + 1)
    }
    const day = c.date.split('T')[0] || ''
    if (day) commitsByDay[day] = (commitsByDay[day] || 0) + 1
  }

  const topFiles = [...allFiles.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([path, changes]) => ({ path, changes }))

  return {
    totalCommits: commits.length,
    totalInsertions,
    totalDeletions,
    totalFilesChanged: allFiles.size,
    commits,
    topFiles,
    commitsByDay,
  }
}

/**
 * Analyze git history for multiple repo paths.
 * Deduplicates by finding the git root for each path.
 */
export async function analyzeMultipleRepos(
  paths: string[],
  since?: string,
  until?: string,
): Promise<Map<string, GitSummary>> {
  const results = new Map<string, GitSummary>()
  const seen = new Set<string>()

  for (const repoPath of paths) {
    // Find git root to avoid analyzing the same repo twice
    let gitRoot: string
    try {
      const result = await execFileAsync('git', ['rev-parse', '--show-toplevel'], {
        cwd: repoPath,
        timeout: 5000,
      })
      gitRoot = result.stdout.trim()
    } catch {
      continue  // not a git repo
    }

    if (seen.has(gitRoot)) continue
    seen.add(gitRoot)

    const summary = await analyzeGitHistory(gitRoot, since, until)
    if (summary) {
      results.set(gitRoot, summary)
    }
  }

  return results
}
