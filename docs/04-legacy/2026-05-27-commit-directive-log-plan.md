> 상태: FROZEN (2026-06-06) — SUPERSEDED. cowork-commit 스킬로 구현 완료 (2026-05-27~28 출하). 현재 진실 = skills/cowork-commit/SKILL.md

# Commit Directive Log — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing `recap-commit` skill so one run produces **both** the curated
recap in the commit message (existing) **and** a full verbatim per-commit directive-log file
under `docs/commit-log/` (new). Add a `commit-log` engine subcommand that powers forward
(since last commit) and backfill (`--from/--to`) extraction.

**Architecture:** Reuse the Bun/TS engine. Add `src/commit-log.ts` (pure extraction logic +
streaming reader), wire a `commit-log` subcommand into `src/cli.ts`, and update
`skills/recap-commit/SKILL.md` to write/stage the log file. The engine reads JSONL from disk;
the LLM only formats the distilled `turns` JSON into the verbatim doc.

**Tech Stack:** Bun, TypeScript (ESM, `.js` import specifiers), `bun:test`, git.

---

## START HERE — context for a fresh session

You are working in **`~/Documents/DEV/ww-w-ai/www-cowork`** (a Claude Code plugin, formerly
named `1d1cc`, moved + renamed on 2026-05-27). It ships two skills, `recap` and
`recap-commit`, backed by a TypeScript engine in `src/`. Read these before coding:

1. **Spec (authoritative):** `docs/specs/2026-05-27-commit-directive-log-skill-design.md` —
   read it fully. It explains the commit-hash paradox (→ hash-free `YYYYMMDD-HHMMSS-<slug>.md`
   filenames), the two modes, and the token-efficiency principle.
2. **Existing format reference (⚠ OLD format, read for TONE only):** the *previous* hand-made
   output lives in `~/Documents/DEV/thessen-ai/docs/commit-log/` (11 docs + `README.md`).
   Read 1-2 for the verbatim-transcription **style** (`[sessionId Ln]` markers, 🤖 reactive
   pairing, chronological flow). **BUT** these use the OLD format with hash in filenames
   (`20260526-050343-f42cf60-slug.md`) and headers (`# f42cf60 — subject`), and the README
   has a `커밋` column. The NEW format is **hash-free** — use the template from Task 4
   (`commit-log-format.md`) for structure. See Gotcha #13.
3. **Engine entry:** `src/cli.ts` — subcommand `switch`. The `recap-commit` case
   (around line 466) shows the `git log -1 --format=%cI` pattern you will mirror.
4. **Scanner:** `src/session-scanner.ts` — types `SessionMessage`, `ContentBlock` (lines
   16-32); `scanSessionFiles(opts)` (line 197) discovers session JSONL overlapping a date
   range; `parseSessionFile` / `extractPromptsFromFile` show the streaming-read pattern.
   **Note:** neither tracks JSONL line numbers — the log format needs `[sessionId Ln]`, so the
   new reader tracks line numbers itself.

**Key facts that constrain the code:**
- `SessionMessage = { type: 'user'|'assistant'|'system', message?: { role?, content: string |
  ContentBlock[] }, timestamp? }`. User/assistant text = `content` (string) or the joined
  `text` of `content[]` blocks where `block.type === 'text'`.
- `AskUserQuestion` appears as an assistant `ContentBlock` with `type:'tool_use'`,
  `name:'AskUserQuestion'`, `input.questions[].options[].label`.
- Its answer comes back as a synthetic user message whose text starts with
  `"Your questions have been answered:"` followed by `"<question>"="<choice>"` pairs.
- **`recap-engine.ts`** exports `runCommitRecapPipeline(sinceISO, basePath?)` — used by the
  existing `recap-commit` CLI case. Task 3 Step 2b adds a `basePath` parameter to this
  function so `--path` can be forwarded to `scanSessionFiles`. Trace the call chain in
  `recap-engine.ts` to find where `scanSessionFiles` is called and add the plumbing (2-3
  lines). The new `commit-log` case does NOT use this function — it has its own scan logic.
- The project has **no package.json / tsconfig / test runner**; code runs via
  `bun run src/cli.ts <cmd>`. We introduce `bun:test` for the new pure logic (zero-config) and
  use CLI-execution checks for glue. Do **not** restructure the existing engine.
- Run commands from the repo root: `cd ~/Documents/DEV/ww-w-ai/www-cowork`.

**Commit discipline:** small commits per task. Never `git add -A`; stage named files. No
secrets. The repo was `git init`'d on `main` with no commits yet — Task 0 makes the baseline.

---

## EDGE CASES & GOTCHAS — read before coding (a blank session WILL hit these)

These are the non-obvious facts that break naïve implementations. Each is handled in a task
below; this list exists so you recognize them.

1. **Project targeting (cwd).** The `commit-log` subcommand's `git log` and `scanSessionFiles`
   both key off `process.cwd()`. `scanSessionFiles` derives the project from
   `pathToProjectHash(cwd)` = `cwd.replace(/[^a-zA-Z0-9]/g, '-')` matched against dir names in
   `~/.claude/projects/`. **If the skill `cd`s into the plugin dir before running, it scans the
   WRONG project.** → the subcommand takes `--path <dir>` (default `process.cwd()`), uses it for
   both `scanSessionFiles` basePath AND as the `cwd` for the `git log` child process. The skill
   runs the engine WITHOUT `cd`-ing away from the user's repo, passing `--path "$PWD"`.

2. **Synthetic user messages.** Many `type:'user'` JSONL entries are NOT human directives:
   `<command-name>` / `<command-message>` / `<command-args>` / `<local-command-stdout>`,
   `<bash-input>` / `<bash-stdout>` / `<bash-stderr>`, `<user-prompt-submit-hook>`, and
   `Caveat: The messages below were generated by the user...`. Also real user messages often
   carry trailing `<system-reminder>…</system-reminder>` blocks. Transcribing these verbatim
   produces garbage. → `buildTurns` drops whole-message synthetic entries (`isSynthetic`) and
   strips embedded `<system-reminder>` / `<user-prompt-submit-hook>` blocks (`stripSystemTags`);
   if nothing remains, the turn is skipped. **Keep** `Your questions have been answered:` — that
   is the decision signal, not noise.

3. **Session discovery is mtime-based (±1-day buffer), not start-time based.** A session that
   started before the window but stayed active inside it has mtime in range → kept. So
   forward-mode windows that span `/clear` boundaries / multiple sessions are covered. Exact
   second-level trimming happens in `buildTurns` via `inWindow`. Do NOT add a start-time filter.

4. **Timezones.** git `%cI` is local time WITH offset (e.g. `+09:00`); transcript `timestamp`
   is UTC (`Z`). `Date.parse` handles both → compare as epoch ms. Filename/header timestamps are
   **KST** — format with `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', … })` (snippet
   in Task 5). Do not hand-roll offset math.

5. **Slug from a non-ASCII subject.** Commit subjects here are usually Korean. A mechanical
   `[^a-zA-Z0-9]→-` slug would strip Korean entirely → empty. → the slug is a SHORT ENGLISH
   descriptor the skill coins from the subject's meaning (e.g. subject "런타임 노이즈 gitignore
   추가" → slug `gitignore-noise`). Never mechanically slugify a Korean string.

6. **Filename second-collisions (backfill).** Two commits in the same second → same
   `YYYYMMDD-HHMMSS` prefix (it happened in the reference docs). If the target filename already
   exists, append `-2`, `-3`, … .

7. **No build/type gate.** There is no `tsc`, no `package.json`, no `pnpm build`. The only gates
   are `bun run …` (executes) and `bun test` (zero-config, discovers `*.test.ts`; the
   `recap-commit-workspace/` snapshot `.ts` files are NOT `*.test.ts`, so they are not run). Do
   not look for a build step.

8. **`cli.ts` already imports** `scanSessionFiles`, `getSystemTimezone` (line ~19) and
   `execFileSync` (line ~22). Only ADD the `commit-log.js` import; do not duplicate the others.

9. **Engine path / `CLAUDE_PLUGIN_ROOT`.** When run as a symlinked user skill,
   `${CLAUDE_PLUGIN_ROOT}` may be unset. Use the absolute path
   `/Users/taehyoungkim/Documents/DEV/ww-w-ai/www-cowork` (this is what `recap/SKILL.md` does),
   with `${CLAUDE_PLUGIN_ROOT}` as a fallback only if you confirm it is set.

10. **Example test repo.** Commands below use `~/Documents/DEV/thessen-ai` as a sample project
    with real sessions + commits. Any git repo with recent Claude Code sessions works; it is not
    special.

11. **CRITICAL: Existing `recap-commit` Step 1 has the SAME cwd bug.** The current SKILL.md
    line 17 does `cd ${CLAUDE_PLUGIN_ROOT} && bun run src/cli.ts recap-commit`, so `git log` and
    `scanSessionFiles` inside that subcommand target the PLUGIN's project, not the user's repo.
    This accidentally worked because the plugin was always used while developing itself. When we
    add the new `commit-log` call (Step 4.5) with `--path "$PWD"` (correct cwd), the **two
    engine calls in the same skill would scan DIFFERENT projects**. → Fix Step 1 too: change it
    to `ENGINE=/Users/taehyoungkim/Documents/DEV/ww-w-ai/www-cowork/src/cli.ts` then
    `bun run "$ENGINE" recap-commit --path "$PWD"` (no `cd`). **This requires also adding
    `--path` support to the existing `recap-commit` case in cli.ts** (Task 3, Step 2b). Without
    this fix, forward mode would use the plugin's last commit time for the recap message but the
    user's last commit time for the log file — completely wrong.

12. **CRITICAL: `isReactive` + ack-filter logic bug in the plan.** The plan's code sets
    `isReactive = Boolean(options) || Boolean(decision) || userText.length < 60`, then filters
    `if (!isReactive && isAck(userText)) continue`. Since acks like "ok" are always < 60 chars,
    `isReactive` is always true for acks → the filter NEVER fires → standalone acks without any
    preceding assistant proposal are kept. The correct filter is:
    `if (isAck(userText) && !precedingAssistant) continue` (drop acks unless they respond to a
    proposal). Apply this fix in Task 2 Step 1 `buildTurns`.

13. **Reference docs use OLD format — do NOT copy it.** The existing docs in
    `~/Documents/DEV/thessen-ai/docs/commit-log/` have `<hash>` in the filename
    (`20260526-050343-f42cf60-ui-design-overhaul.md`) and header (`# f42cf60 — UI design…`),
    and the README has a `커밋` (hash) column. The NEW format is **hash-free**: filename
    `YYYYMMDD-HHMMSS-<slug>.md`, header `# <commit subject>`, README has NO hash column.
    Read the reference docs for the TONE and STYLE (verbatim transcription, `[sessionId Ln]`
    markers, 🤖 reactive pairing), but use the template from Task 4 for STRUCTURE.

14. **`allowedTools` in SKILL.md is missing `Edit`.** The skill needs to append rows to an
    existing `docs/commit-log/README.md`. Without `Edit` in allowedTools, the LLM must use
    Read + Write (read entire file, append row, write back). Either add `Edit` to allowedTools
    in Task 5, or document that the LLM should use the Read→append→Write pattern.

15. **Spec §2 says the old path `/Users/taehyoungkim/Downloads/1d1cc/`** — the repo was moved
    to `~/Documents/DEV/ww-w-ai/www-cowork` on 2026-05-27. The spec is now **stale on this
    point only** (all logic/design decisions are still correct). Trust this plan's paths over
    the spec's §2 path.

---

## File structure

| File | Responsibility |
|------|----------------|
| `src/commit-log.ts` (new) | Pure extraction: `messageText`, `findAskUserQuestion`, `isAck`, `parseDecision`, `inWindow`, `truncate`, `buildTurns`; IO: `readRawMessages`. Exports `CommitLogTurn`, `RawMessage`. |
| `src/commit-log.test.ts` (new) | `bun:test` unit tests for the pure functions. |
| `src/cli.ts` (modify) | Add `commit-log` subcommand (parse `--from/--to`; default = since last commit; discover sessions; emit `{window, turns}` JSON). |
| `skills/recap-commit/SKILL.md` (modify) | Forward: run `commit-log`, write log file, update index, stage. Add `backfill` invocation path. |
| `skills/recap-commit/references/commit-log-format.md` (new) | Verbatim-transcription template, reactive/noise rules, slug + README-index rules. |

---

## Task 0: Baseline commit

**Files:** none created — commit the renamed repo as the starting point.

- [ ] **Step 1: Confirm clean state and stage the source**

Run: `cd ~/Documents/DEV/ww-w-ai/www-cowork && git status --short`
Expected: untracked files (`src/`, `skills/`, `manifest.json`, `README.md`, `docs/`, `evals/`,
`.gitignore`, `.claude-plugin/`). `.bkit/` must NOT appear (it is gitignored).

- [ ] **Step 2: Stage named top-level entries (not `-A`)**

```bash
git add .gitignore .claude-plugin manifest.json README.md src skills evals docs
```

- [ ] **Step 3: Commit the baseline**

```bash
git commit -m "$(cat <<'EOF'
chore: baseline www-cowork (renamed from 1d1cc)

Recap + recap-commit engine and skills, relocated under ww-w-ai.
EOF
)"
```

Expected: one commit on `main`.

---

## Task 1: Pure extraction helpers + tests

**Files:**
- Create: `src/commit-log.ts`
- Test: `src/commit-log.test.ts`

- [ ] **Step 1: Write `src/commit-log.ts` (helpers only — no `buildTurns` yet)**

```typescript
import { createReadStream } from 'fs'
import { createInterface } from 'readline'
import type { SessionMessage } from './session-scanner.js'

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

// Standalone acknowledgements (dropped unless they answer a proposal).
const ACK_RE = /^(ok|okay|go|y|yes|yep|sure|continue|네|응|ㅇㅇ|그래|진행|좋아)\.?\s*$/i

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

export function isAck(text: string): boolean {
  return ACK_RE.test(text.trim())
}

export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max)} […${text.length - max} more]`
}

// Parse a synthetic AskUserQuestion-answer user message into a decision string.
// Matches: ..."question"="choice"... → returns choices joined by " / ".
export function parseDecision(userText: string): string | undefined {
  if (!userText.startsWith('Your questions have been answered:')) return undefined
  const choices = [...userText.matchAll(/="([^"]+)"/g)].map(m => m[1])
  return choices.length ? choices.join(' / ') : undefined
}

// Whole-message synthetic entries that are NOT human directives (command echoes,
// bash !-input/stdout, hook injections, local-command caveats). These must be dropped.
// NOTE: "Your questions have been answered:" is intentionally NOT matched — it is a decision.
const SYNTHETIC_RE =
  /^(<command-(name|message|args)>|<local-command-(stdout|stderr)>|<bash-(input|stdout|stderr)>|<user-prompt-submit-hook>|Caveat: The messages below were generated)/

export function isSynthetic(text: string): boolean {
  return SYNTHETIC_RE.test(text.trim())
}

// Strip embedded system/hook blocks that ride along with otherwise-real user messages.
export function stripSystemTags(text: string): string {
  return text
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '')
    .replace(/<user-prompt-submit-hook>[\s\S]*?<\/user-prompt-submit-hook>/g, '')
    .trim()
}

// from/to are epoch ms. Window is (from, to]. Missing bound = open.
export function inWindow(ts: string, from?: number, to?: number): boolean {
  if (!ts) return false
  const t = Date.parse(ts)
  if (Number.isNaN(t)) return false
  if (from !== undefined && t <= from) return false
  if (to !== undefined && t > to) return false
  return true
}
```

- [ ] **Step 2: Write `src/commit-log.test.ts` covering the helpers**

```typescript
import { test, expect } from 'bun:test'
import {
  messageText, findAskUserQuestion, isAck, truncate, parseDecision, inWindow,
  isSynthetic, stripSystemTags,
} from './commit-log.js'

test('messageText: string content', () => {
  expect(messageText({ type: 'user', message: { content: 'hello' } })).toBe('hello')
})

test('messageText: block content joins text blocks', () => {
  expect(messageText({
    type: 'assistant',
    message: { content: [
      { type: 'text', text: 'a' },
      { type: 'tool_use', name: 'X' },
      { type: 'text', text: 'b' },
    ] },
  })).toBe('a\nb')
})

test('findAskUserQuestion: extracts option labels', () => {
  const r = findAskUserQuestion({
    type: 'assistant',
    message: { content: [
      { type: 'tool_use', name: 'AskUserQuestion', input: {
        questions: [{ options: [{ label: 'A' }, { label: 'B' }] }],
      } },
    ] },
  })
  expect(r?.options).toEqual(['A', 'B'])
})

test('findAskUserQuestion: null when absent', () => {
  expect(findAskUserQuestion({ type: 'assistant', message: { content: 'hi' } })).toBeNull()
})

test('isAck: acks vs real directives', () => {
  expect(isAck('ok')).toBe(true)
  expect(isAck('진행')).toBe(true)
  expect(isAck('실행')).toBe(false)
  expect(isAck('use TypeScript instead')).toBe(false)
})

test('truncate: keeps short, marks long', () => {
  expect(truncate('abc', 10)).toBe('abc')
  expect(truncate('abcdef', 3)).toBe('abc […3 more]')
})

test('parseDecision: extracts choices', () => {
  expect(parseDecision('Your questions have been answered: "Q"="Yes"')).toBe('Yes')
  expect(parseDecision('plain text')).toBeUndefined()
})

test('isSynthetic: command/bash/hook echoes are synthetic, real text is not', () => {
  expect(isSynthetic('<command-name>/clear</command-name>')).toBe(true)
  expect(isSynthetic('<bash-input>pwd</bash-input>')).toBe(true)
  expect(isSynthetic('Caveat: The messages below were generated by the user')).toBe(true)
  expect(isSynthetic('use TypeScript instead')).toBe(false)
  // decision answers must NOT be treated as synthetic
  expect(isSynthetic('Your questions have been answered: "Q"="Yes"')).toBe(false)
})

test('stripSystemTags: removes reminder/hook blocks, keeps real text', () => {
  const t = 'do the thing\n<system-reminder>noise here</system-reminder>'
  expect(stripSystemTags(t)).toBe('do the thing')
  expect(stripSystemTags('<system-reminder>only noise</system-reminder>')).toBe('')
})

test('inWindow: (from, to] half-open lower bound', () => {
  const from = Date.parse('2026-05-27T00:00:00Z')
  const to = Date.parse('2026-05-27T12:00:00Z')
  expect(inWindow('2026-05-27T00:00:00Z', from, to)).toBe(false) // == from excluded
  expect(inWindow('2026-05-27T06:00:00Z', from, to)).toBe(true)
  expect(inWindow('2026-05-27T12:00:00Z', from, to)).toBe(true)  // == to included
  expect(inWindow('2026-05-27T12:00:01Z', from, to)).toBe(false)
})
```

- [ ] **Step 3: Run the tests — expect FAIL (module/exports not complete) then PASS**

Run: `cd ~/Documents/DEV/ww-w-ai/www-cowork && bun test src/commit-log.test.ts`
Expected: all tests PASS (helpers are fully implemented in Step 1). If any fail, fix
`commit-log.ts` until green.

- [ ] **Step 4: Commit**

```bash
git add src/commit-log.ts src/commit-log.test.ts
git commit -m "feat(commit-log): pure extraction helpers + tests"
```

---

## Task 2: `buildTurns` + `readRawMessages`

**Files:**
- Modify: `src/commit-log.ts` (append)
- Test: `src/commit-log.test.ts` (append)

- [ ] **Step 1: Append `buildTurns` and `readRawMessages` to `src/commit-log.ts`**

```typescript
// Build directive turns for ONE session's messages (with JSONL line numbers),
// keeping only user messages inside the window. Reactive turns (a short reply, or a
// reply to an AskUserQuestion / preceding assistant proposal) carry the assistant
// context; standalone acks are dropped.
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
    if (!rawText || isSynthetic(rawText)) continue          // drop command/bash/hook echoes
    const userText = stripSystemTags(rawText)               // strip embedded reminder/hook blocks
    if (!userText) continue                                  // nothing real left

    // Nearest preceding assistant message (stop at the previous user turn).
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

    // Noise filter: drop standalone acks UNLESS they respond to an assistant proposal.
    // Note: isAck + !precedingAssistant (not !isReactive) — acks are always < 60 chars
    // so isReactive would always be true; using !isReactive would never filter. (Gotcha #12)
    if (isAck(userText) && !precedingAssistant) continue

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

// Stream a JSONL session file, tracking 1-based line numbers (for [sessionId Ln]).
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
        raw.push({ msg: JSON.parse(t) as SessionMessage, line })
      } catch {
        // skip malformed lines (line counter still advances)
      }
    }
  } finally {
    rl.close()
    stream.destroy()
  }
  return raw
}
```

- [ ] **Step 2: Append `buildTurns` tests to `src/commit-log.test.ts`**

```typescript
import { buildTurns, type RawMessage } from './commit-log.js'

function u(line: number, ts: string, text: string): RawMessage {
  return { msg: { type: 'user', timestamp: ts, message: { content: text } }, line }
}
function a(line: number, ts: string, text: string): RawMessage {
  return { msg: { type: 'assistant', timestamp: ts, message: { content: text } }, line }
}

test('buildTurns: keeps real directives, drops standalone acks without proposal', () => {
  const raw = [
    u(1, '2026-05-27T01:00:00Z', 'use TypeScript instead'),
    a(2, '2026-05-27T01:01:00Z', 'done'),
    u(3, '2026-05-27T01:02:00Z', 'ok'), // ack after "done" (not a proposal) → dropped
  ]
  const turns = buildTurns(raw, 'sess1234')
  expect(turns.length).toBe(1)
  expect(turns[0]!.userText).toBe('use TypeScript instead')
  expect(turns[0]!.line).toBe(1)
  expect(turns[0]!.sessionId).toBe('sess1234')
})

test('buildTurns: keeps ack that responds to an assistant proposal', () => {
  const raw = [
    a(1, '2026-05-27T01:00:00Z', 'Should I use approach A or B?'),
    u(2, '2026-05-27T01:01:00Z', 'go'), // ack WITH a preceding proposal → kept
  ]
  const turns = buildTurns(raw, 'sess1234')
  expect(turns.length).toBe(1)
  expect(turns[0]!.userText).toBe('go')
  expect(turns[0]!.precedingAssistant).toBe('Should I use approach A or B?')
})

test('buildTurns: reactive reply pairs the preceding assistant proposal', () => {
  const raw = [
    a(1, '2026-05-27T01:00:00Z', 'Option A or Option B?'),
    u(2, '2026-05-27T01:01:00Z', 'A'), // short reactive → kept with context
  ]
  const turns = buildTurns(raw, 'sess1234')
  expect(turns.length).toBe(1)
  expect(turns[0]!.isReactive).toBe(true)
  expect(turns[0]!.precedingAssistant).toBe('Option A or Option B?')
})

test('buildTurns: AskUserQuestion options + decision captured', () => {
  const raw: RawMessage[] = [
    { msg: { type: 'assistant', timestamp: '2026-05-27T01:00:00Z', message: { content: [
      { type: 'tool_use', name: 'AskUserQuestion', input: {
        questions: [{ options: [{ label: 'Forward' }, { label: 'Backfill' }] }],
      } },
    ] } }, line: 1 },
    u(2, '2026-05-27T01:01:00Z', 'Your questions have been answered: "mode"="Forward"'),
  ]
  const turns = buildTurns(raw, 'sess1234')
  expect(turns[0]!.options).toEqual(['Forward', 'Backfill'])
  expect(turns[0]!.decision).toBe('Forward')
})

test('buildTurns: window filter excludes out-of-range turns', () => {
  const from = Date.parse('2026-05-27T01:00:00Z')
  const raw = [
    u(1, '2026-05-27T00:30:00Z', 'too early, should be excluded'),
    u(2, '2026-05-27T02:00:00Z', 'in range, should be kept'),
  ]
  const turns = buildTurns(raw, 'sess1234', from)
  expect(turns.length).toBe(1)
  expect(turns[0]!.line).toBe(2)
})

test('buildTurns: drops synthetic messages, strips embedded reminders', () => {
  const raw = [
    u(1, '2026-05-27T01:00:00Z', '<bash-input>pwd</bash-input>'),                 // synthetic → drop
    u(2, '2026-05-27T01:01:00Z', '<command-name>/clear</command-name>'),           // synthetic → drop
    u(3, '2026-05-27T01:02:00Z',
      'refactor the parser\n<system-reminder>hook noise</system-reminder>'),       // kept, stripped
  ]
  const turns = buildTurns(raw, 'sess1234')
  expect(turns.length).toBe(1)
  expect(turns[0]!.line).toBe(3)
  expect(turns[0]!.userText).toBe('refactor the parser')
})
```

- [ ] **Step 3: Run tests — expect PASS**

Run: `cd ~/Documents/DEV/ww-w-ai/www-cowork && bun test src/commit-log.test.ts`
Expected: all tests PASS. Fix `buildTurns` until green (watch the ack-vs-reactive ordering:
the `isReactive` check must run before the ack drop).

- [ ] **Step 4: Commit**

```bash
git add src/commit-log.ts src/commit-log.test.ts
git commit -m "feat(commit-log): buildTurns + line-tracking JSONL reader"
```

---

## Task 3: `commit-log` CLI subcommand

**Files:**
- Modify: `src/cli.ts` (add import near line 19-21; add `case 'commit-log'` before `default`
  around line 557; extend the usage string)

- [ ] **Step 1: Add the import**

At the top of `src/cli.ts`, after the existing `session-scanner.js` import (line ~19), add:

```typescript
import { readRawMessages, buildTurns } from './commit-log.js'
```

- [ ] **Step 2: Add the subcommand case (immediately before `default:` in the `switch`)**

```typescript
    case 'commit-log': {
      // Window bounds + explicit project path. Default path = process.cwd() (the user's
      // repo). The skill passes --path "$PWD" so this is correct even if the engine is
      // invoked from elsewhere. Default window = since the last commit (forward mode).
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
          // cwd: repoPath — must target the USER's repo, not wherever the engine lives.
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

      // Discover sessions for THIS project (basePath = repoPath → correct project hash).
      // scanSessionFiles uses mtime with a ±1-day buffer, so sessions that started before
      // the window but were active within it are kept; buildTurns applies the exact
      // second-level window. Day-level dateRange just narrows the mtime pre-filter.
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
```

- [ ] **Step 2b: Fix the existing `recap-commit` case to accept `--path` (Gotcha #11)**

The existing `recap-commit` case (cli.ts line 466-484) does `git log -1 --format=%cI` with
no cwd override and calls `runCommitRecapPipeline(lastCommitISO)` which internally scans
sessions with default `process.cwd()`. When the skill does `cd ${CLAUDE_PLUGIN_ROOT}`, both
target the plugin project — not the user's repo. We must fix this so the skill can pass
`--path "$PWD"` to BOTH engine calls.

Replace the `recap-commit` case body (lines 466-484 in the current file) with:

```typescript
    case 'recap-commit': {
      // Parse --path (same as commit-log, for consistency). Gotcha #11.
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
```

**NOTE:** `runCommitRecapPipeline` also needs a `basePath` parameter plumbed through to
`scanSessionFiles`. Check `src/recap-engine.ts` for its signature — it probably passes
`options` to the scanner. Add `basePath?: string` to its signature and forward it. If the
function doesn't accept basePath, trace the call chain and add it. This is a 2-3 line
change in `recap-engine.ts`.

- [ ] **Step 3: Extend the usage string in the `default:` case**

Change the usage line to include `commit-log`:

```typescript
      console.error('Usage: bun run src/cli.ts [scan|summarize|recap-commit|commit-log|prepare-facets|render-report] [--from DATE] [--to DATE] ...')
```

- [ ] **Step 4: Verify it runs (forward, in a repo with commits)**

Run from a project that has commits and recent sessions, e.g.:
```bash
cd ~/Documents/DEV/thessen-ai && bun run ~/Documents/DEV/ww-w-ai/www-cowork/src/cli.ts commit-log --path "$PWD" 2>&1 | head -c 600
```
Expected: JSON `{ "window": { "from": "<last-commit ISO>", "to": null }, "turns": [ ... ] }`
with at least the `ts`, `sessionId`, `line`, `userText`, `isReactive` fields on each turn.
If `{"error":"no_previous_commit"}`, run in a repo that has at least one commit.

- [ ] **Step 5: Verify backfill range mode**

```bash
cd ~/Documents/DEV/thessen-ai && bun run ~/Documents/DEV/ww-w-ai/www-cowork/src/cli.ts commit-log \
  --path "$PWD" --from 2026-05-26T15:30:00+09:00 --to 2026-05-27T14:00:00+09:00 2>&1 | head -c 400
```
Expected: JSON with `window.from`/`window.to` set and `turns` limited to that range.

- [ ] **Step 6: Run unit tests again (no regressions)**

Run: `cd ~/Documents/DEV/ww-w-ai/www-cowork && bun test src/commit-log.test.ts`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add src/cli.ts
git commit -m "feat(cli): add commit-log subcommand (forward + backfill window)"
```

---

## Task 4: Output-format reference doc

**Files:**
- Create: `skills/recap-commit/references/commit-log-format.md`

- [ ] **Step 1: Write the format reference**

````markdown
# commit-log file format

Output: `docs/commit-log/<YYYYMMDD-HHMMSS>-<slug>.md` (timestamp = the documented commit's
committer time, KST; forward mode uses "now" at write time). **No commit hash in the
filename or body for forward mode** (a commit can't contain its own hash). Backfill MAY put
the hash in the body since those commits already exist.

`slug` = a SHORT ENGLISH descriptor coined from the commit subject's meaning, lowercase,
words joined by `-`, ≤ 50 chars. Commit subjects here are usually Korean; a mechanical
`[^a-zA-Z0-9]→-` slug would strip Korean to empty, so coin a meaningful English slug instead
(e.g. "런타임 노이즈 gitignore 추가" → `gitignore-noise`).

## Template

```markdown
# <commit subject>

- **일시(KST)**: YYYY-MM-DD HH:MM:SS
- **세션**: `<sessionId>`[, `<sessionId>` …]

> 시간순 verbatim 전사. `>` = 유저 원문. 🤖 = 직전 어시스턴트(축약, 유저가 응답한 경우만).

---

**HH:MM [<sessionId> L<line>]**
> <userText, verbatim>

**HH:MM [<sessionId> L<line>]** — 어시스턴트 제안에 응답
- 🤖 *"<precedingAssistant, truncated>"*
- 🤖 *[선택지] <options joined by " / ">*   ← only when options present
> **[선택] → "<decision>"**                ← only when decision present
> <userText if it adds beyond the decision>
```

## Rules
- Emit turns in `turns[]` order (already sorted by `ts`).
- For non-reactive turns: just the `>` user line with its `[sessionId Ln]` marker.
- For reactive turns (`isReactive: true`): show the 🤖 preceding-assistant line; if `options`
  present, add the `[선택지]` line; if `decision` present, add the `[선택]` line.
- Keep user text verbatim — do not paraphrase. Assistant text may stay truncated as provided.
- Group consecutive turns under a section heading only if it aids reading; otherwise list
  them flat in time order.

## README index (`docs/commit-log/README.md`)
Maintain a table; append/update one row per doc. Never rewrite existing rows.

```markdown
| 일시(KST) | 요지 | 문서 |
|-----------|------|------|
| YYYY-MM-DD HH:MM:SS | <commit subject> | [<slug>](./<filename>) |
```
````

- [ ] **Step 2: Commit**

```bash
git add skills/recap-commit/references/commit-log-format.md
git commit -m "docs(recap-commit): add commit-log output format reference"
```

---

## Task 5: Wire the log file into the recap-commit skill

**Files:**
- Modify: `skills/recap-commit/SKILL.md`

The current SKILL.md has Steps 1-5 (run engine → select prompts → assessment → format recap
block → create commit). Insert a new step before "Create the Commit" and add a Backfill
section. Do not remove existing behavior — the commit message recap stays.

- [ ] **Step 0: Fix the existing Step 1 in SKILL.md (Gotcha #11)**

The current Step 1 does `cd ${CLAUDE_PLUGIN_ROOT} && bun run src/cli.ts recap-commit`. This
runs git and session scan in the plugin dir, not the user's repo. Replace it with:

```markdown
## Step 1: Run the Engine

```bash
ENGINE=/Users/taehyoungkim/Documents/DEV/ww-w-ai/www-cowork/src/cli.ts
bun run "$ENGINE" recap-commit --path "$PWD"
```

This scans sessions since the last git commit **in the current project** and outputs JSON
with metrics and user prompts. Do NOT `cd` into the plugin dir — the engine must target
the user's repo via `--path`.

- If output contains `{"error": "no_previous_commit"}`, tell the user to use `/commit` instead.
- If `sessions` is 0, tell the user no sessions were found since the last commit.
```

Also add `Edit` to the `allowedTools` frontmatter (Gotcha #14) — the skill needs to append
rows to `docs/commit-log/README.md`:

```yaml
allowedTools:
  - Bash
  - Read
  - Glob
  - Grep
  - Write
  - Edit
```

- [ ] **Step 1: Insert "Step 4.5: Write the directive-log file" after Step 4**

```markdown
## Step 4.5: Write the directive-log file (forward)

Run the engine to get full-depth directives since the last commit. **Do NOT `cd` into the
plugin dir** — the engine must see the user's repo as the project. Run the engine by its
absolute path from the user's repo, and pass `--path "$PWD"` (Gotcha #1):

```bash
ENGINE=/Users/taehyoungkim/Documents/DEV/ww-w-ai/www-cowork/src/cli.ts
bun run "$ENGINE" commit-log --path "$PWD"
```

This outputs `{ window, turns }`. Each turn has `ts`, `sessionId`, `line`, `userText`,
`isReactive`, optional `precedingAssistant` / `options` / `decision`.

1. If `turns` is empty, skip the file (still create the commit with the message recap).
2. **`slug`** — a SHORT ENGLISH descriptor coined from the commit subject's meaning
   (Gotcha #5), lowercase, words joined by `-`, ≤ 50 chars. Do NOT mechanically slugify a
   Korean subject (it would become empty). Example: subject "런타임 노이즈 gitignore 추가"
   → `gitignore-noise`.
3. **timestamp** — "now" in KST as `YYYYMMDD-HHMMSS` (Gotcha #4). Compute with:
   ```bash
   TS=$(TZ=Asia/Seoul date +%Y%m%d-%H%M%S)
   ```
4. **filename** = `docs/commit-log/$TS-$slug.md`. If that file already exists (same-second
   collision, Gotcha #6), append `-2`, `-3`, … until unused.
5. Write the file using the template in `references/commit-log-format.md` — verbatim user
   text, 🤖 assistant context on reactive turns (`precedingAssistant` / `options` /
   `decision`), `[sessionId Ln]` source markers, in `turns` order. Header `일시(KST)` =
   `TZ=Asia/Seoul date "+%Y-%m-%d %H:%M:%S"`.
6. Update `docs/commit-log/README.md` — append one row in time order; create the file with
   the header table if it does not exist. Never rewrite existing rows.
7. Stage both: `git add "docs/commit-log/$TS-$slug.md" docs/commit-log/README.md`

The file then rides in the SAME commit created by Step 5 — no hash needed (git links the doc
to its commit via the commit that adds it).
```

- [ ] **Step 2: Append a Backfill section at the end of the skill**

```markdown
## Backfill mode (document past commits)

Triggered when the user asks to backfill / document existing commits.

Use the absolute engine path and `--path "$PWD"` here too (Gotcha #1, #9):
`ENGINE=/Users/taehyoungkim/Documents/DEV/ww-w-ai/www-cowork/src/cli.ts`.

1. List commits: `git log --format='%H %cI %s' --no-merges`.
2. Read existing `docs/commit-log/` filenames; parse their `YYYYMMDD-HHMMSS` prefixes →
   documented timestamps. A commit is "documented" if a doc's timestamp matches its `%cI`
   (compare as KST `YYYYMMDD-HHMMSS`).
3. Undocumented = the rest. If more than 8, list them and ask the user which to document.
4. For each target commit C (committer time `C_cI`) with previous commit P (`P_cI`):
   ```bash
   bun run "$ENGINE" commit-log --path "$PWD" --from "$P_cI" --to "$C_cI"
   ```
   For the first commit (no P), omit `--from`.
5. Filename timestamp from C's committer time in KST:
   ```bash
   TS=$(TZ=Asia/Seoul date -j -f '%Y-%m-%dT%H:%M:%S%z' "${C_cI}" +%Y%m%d-%H%M%S 2>/dev/null)
   # fallback (GNU date): TS=$(TZ=Asia/Seoul date -d "$C_cI" +%Y%m%d-%H%M%S)
   ```
   Write `docs/commit-log/$TS-<slug>.md` (slug = short English descriptor, Gotcha #5; on
   same-second collision append `-2`, Gotcha #6). The commit hash MAY be included in the
   body (the commit already exists — no paradox).
6. Update the README index (time order, append-only).
7. Commit the docs as a SEPARATE commit (they document past commits and cannot ride along):
   `git add docs/commit-log/ && git commit -m "docs(commit-log): backfill <range>"`.
```

- [ ] **Step 3: Sanity-check the skill renders (no broken fences)**

Run: `cd ~/Documents/DEV/ww-w-ai/www-cowork && sed -n '1,200p' skills/recap-commit/SKILL.md | grep -n "Step 4.5\|Backfill mode"`
Expected: both headings present.

- [ ] **Step 4: Commit**

```bash
git add skills/recap-commit/SKILL.md
git commit -m "feat(recap-commit): emit + stage directive-log file (forward + backfill)"
```

---

## Task 6: End-to-end forward dry-run

**Files:** none (verification only). Use a scratch commit in a throwaway repo or the
current project; do NOT push.

- [ ] **Step 1: Manually exercise the forward path**

In a project with recent sessions, run the engine and confirm a well-formed doc can be
produced from `turns`:
```bash
cd ~/Documents/DEV/thessen-ai && bun run ~/Documents/DEV/ww-w-ai/www-cowork/src/cli.ts commit-log --path "$PWD" \
  | bun -e 'const j=JSON.parse(await Bun.stdin.text()); console.log("turns:",j.turns.length); console.log(j.turns.slice(0,3))'
```
Expected: a turn count and the first few turns with verbatim `userText` and, where
applicable, `precedingAssistant`/`options`/`decision`.

- [ ] **Step 2: Confirm reactive pairing appears**

Verify at least one turn in a session that used AskUserQuestion has `options` populated
(`turns.some(t => t.options)`). If none in this window, test against a wider `--from/--to`
that covers a known AskUserQuestion exchange.

- [ ] **Step 3: Final test sweep + commit (if any fixes were needed)**

Run: `cd ~/Documents/DEV/ww-w-ai/www-cowork && bun test`
Expected: all PASS. Commit only if Steps above required code changes.

---

## Self-review notes (author)

- **Spec coverage:** §5 engine subcommand → Task 3; full-depth (assistant + options +
  decision) → Tasks 1-2 (`buildTurns`, `findAskUserQuestion`, `parseDecision`); forward both-
  artifacts → Task 5 Step 1; backfill → Task 5 Step 2; hash-free filename + index → Task 4;
  reactive/noise rules → Tasks 1-2 + Task 4; synthetic-message filter (Gotcha #2) →
  `isSynthetic`/`stripSystemTags` in Task 1, applied in Task 2; project targeting (Gotcha #1)
  → `--path` in Task 3, used by the skill in Task 5.
- **Naming consistency:** `buildTurns`, `readRawMessages`, `CommitLogTurn`, `RawMessage`,
  `inWindow`, `parseDecision` used identically across `commit-log.ts`, its tests, and
  `cli.ts`.
- **Known simplification (YAGNI):** reactive heuristic uses `length < 60` OR an
  AskUserQuestion/preceding-assistant signal. `decision` parsing targets the
  `"Your questions have been answered:"` synthetic message only; free-text decisions are left
  to the doc author reading `options` + `userText`. Revisit only if logs miss decisions.
- **Multi-session windows** are handled by Task 3 (scan returns all overlapping sessions;
  turns are merged and sorted) — covers the forward-spans-multiple-sessions case from the spec.

### Post-review additions (2026-05-27 session 2)

Gotchas 11-15 were added after the initial plan draft. Changes to task code:

- **Gotcha #11 (cwd mismatch):** Task 3 gains Step 2b (add `--path` to existing
  `recap-commit` case + plumb through `recap-engine.ts`); Task 5 gains Step 0 (rewrite
  SKILL.md Step 1 to use absolute engine path + `--path "$PWD"` instead of `cd`).
- **Gotcha #12 (ack filter):** Task 2 `buildTurns` now uses
  `if (isAck(userText) && !precedingAssistant) continue` (not `!isReactive`). Test added for
  ack-with-proposal case.
- **Gotcha #13 (old format):** Documented in gotchas + START HERE that reference docs use a
  DIFFERENT format (hash in filename/header). Use them for tone/style only, not structure.
- **Gotcha #14 (`Edit` tool):** Task 5 Step 0 adds `Edit` to SKILL.md `allowedTools`.
- **Gotcha #15 (stale spec path):** Documented in gotchas. Spec §2 path is wrong; this plan's
  paths take precedence.

These changes are **already embedded** in the task steps above — a blank session following the
plan top-to-bottom will apply them. This section exists for traceability only.
