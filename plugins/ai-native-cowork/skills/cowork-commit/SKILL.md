---
name: cowork-commit
description: Trigger whenever the user asks to commit AND wants the commit message enriched with AI collaboration history. Creates a lightweight commit message (key decision highlights + link) and a full directive-log file with conversation transcript + recap. The key signal is the combination of (1) making a commit with (2) capturing how AI contributed. Trigger on phrases like commit with AI recap, attach collaboration history to commit, record AI work in commit, cowork-commit. DO NOT trigger for plain commits without AI documentation, standalone time-period recaps (use cowork-insights instead), PR reviews, or general git operations.
allowedTools:
  - Bash
  - Read
  - Glob
  - Grep
  - Write
  - Edit
---

You are creating a git commit that includes an **AI collaboration recap** — a record of how the developer collaborated with AI to produce this commit's changes.

## Why this skill exists (the lens for every keep/drop decision)

The critical reason to use this skill: **when a different worker (or a future session) later touches this code, they must be able to recover the *intent* behind the previous worker's changes and continue with full context — instead of guessing/inferring it from the diff alone.** Lost intent is the core failure this skill prevents: a buried decision (why a value, why a cap removed, why this approach over the rejected one) that a successor cannot reconstruct becomes silent ambiguity later.

So when deciding **what conversation to leave** (Step 2 message lines, Step 3a kept turns), do not ask only "was this substantive?" — ask **"would a future/different worker need this to understand WHY this was done and safely build on it?"** Keep the turns that carry *intent and the reasoning that won*; drop the turns that a successor would never need to continue the work. This intent-for-the-next-worker perspective is the primary filter, not an afterthought.

## Language

The user may specify a language: `/cowork-commit --language ko` (or `en`, `ja`, etc.).
If omitted, match the language the user has been speaking in this conversation.
This affects the **Recap section** (Summary, Friction, Assessment) and the **commit message body**.
The **Conversation Log** contains only the *kept* turns (see Step 3 scope-filter); kept
turns are always verbatim — never translate or paraphrase user/assistant text.

## Step 1: Run the Engine

```bash
ENGINE=/Users/taehyoungkim/Documents/DEV/ww-w-ai/ai-native-cowork/src/cli.ts
bun run "$ENGINE" cowork-commit --path "$PWD"
```

This scans sessions since the last git commit **in the current project** and outputs JSON
with metrics and user prompts. Do NOT `cd` into the plugin dir — the engine must target
the user's repo via `--path`.

- If output contains `{"error": "no_previous_commit"}`, tell the user to use `/commit` instead.
- If `sessions` is 0, tell the user no sessions were found since the last commit.

## Step 2: Format the Commit Message

From the `userPrompts` array, pick **2-3 key conversation lines** that reveal the
decision-making — direction changes, pivots, root causes, conclusions. Apply the same
**materiality test** as Step 3a: keep only what materially shaped context or results; skip
exploratory chatter, tool-call notifications, and superseded back-and-forth. Summarize each in one line.

```
<details>
<summary>AI Recap — N sessions, X.Xh, M messages, +A/-R lines</summary>

- "user's key decision quote" → what happened as a result
- "another pivotal quote" → outcome

📄 Full log: docs/commit-log/<filename>.md
</details>
```

Keep the commit message body **under 10 lines**. The full conversation and recap
live in the directive-log file (Step 3), not in the commit message.

## Step 3: Write the directive-log file (forward)

Run the engine to get full-depth directives since the last commit:

```bash
ENGINE=/Users/taehyoungkim/Documents/DEV/ww-w-ai/ai-native-cowork/src/cli.ts
bun run "$ENGINE" commit-log --path "$PWD"
```

This outputs `{ window, turns }`. Each turn has `ts`, `sessionId`, `line`, `userText`,
`isReactive`, optional `precedingAssistant` / `options` / `decision`.

### Step 3a: Scope-filter the turns (MANDATORY)

The log is committed to git → keep **only development substance**. Kept prompts are copied
verbatim (the prompt wording is the reusable know-how). Classify every turn:

- **KEEP** (verbatim) — code, design, debugging, tooling, decisions that shaped the diff.
- **DROP** (whole turn, no masking, no summarizing) — personal, financial, credentials/secrets,
  security-incident, or off-topic.
- **Unsure → DROP.** Over-removal is recoverable; a committed leak is not.
- **Materiality test — keep only what shaped context or results.** Even on-topic, keep a turn
  only if it materially affected the work: a **decision, a pivot, a root cause, or a conclusion**
  that the diff or the direction depended on. The log is the *distilled decision trail*, not a
  raw transcript dump.
- **Intent-for-the-next-worker test (primary lens, see "Why this skill exists").** For each
  candidate turn ask: *"would a different worker, later, need this to understand WHY this change
  was made and to continue safely without re-deriving it?"* Keep turns that capture **intent and
  the reasoning that won** — especially *why this over the rejected alternative*, why a value/cap/
  constraint was chosen or removed, and assumptions a successor must not silently violate. If a
  successor could pick up the work cleanly without a turn, it is droppable trivia.
- **DROP the trivia** (whole turn): exploratory chatter, tool-call notifications / status pings,
  transient back-and-forth, acknowledgments, "focus on X" redirections, and **mid-way reversals
  that were later superseded** (keep only the conclusion that won, not the abandoned detours).
  The Recap narrates the flow; the log keeps only the substantive, still-standing decisions.
- **Reactive turns**: a kept one emits its `precedingAssistant`/`options`/`decision`, so judge
  and scan the whole unit — a sensitive *suggestion* drops the turn even if the reply looks fine.

Deterministic backstop — write each kept turn's text (incl. assistant fields) to a file and
force-drop any turn that matches:

```bash
grep -nEi 'sk-[a-z0-9_-]{16,}|(api[_-]?key|secret|password|passwd|token|bearer)["'"'"' :=]+[^ "'"'"']{6,}|-----BEGIN[ A-Z]*PRIVATE KEY-----|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|[0-9]{1,3}(\.[0-9]{1,3}){3}:[^ ]+' /tmp/cowork-kept-turns.txt || echo "clean"
```

Keep the keep/drop ledger in your reasoning only — never write it into the file.

1. If `turns` is empty **after filtering**, skip the file (still create the commit with the message block).
2. **`slug`** — a SHORT ENGLISH descriptor coined from the commit subject's meaning,
   lowercase, words joined by `-`, ≤ 50 chars. Do NOT mechanically slugify a Korean subject.
3. **timestamp** — "now" in KST as `YYYYMMDD-HHMMSS`:
   ```bash
   TS=$(TZ=Asia/Seoul date +%Y%m%d-%H%M%S)
   ```
4. **filename** = `docs/commit-log/$TS-$slug.md`. If that file already exists, append `-2`.
5. Write the file using the template in `references/commit-log-format.md`:
   - **Conversation Log** (top): **kept turns only** (Step 3a), verbatim user text, 🤖 assistant
     context on reactive turns, `[sessionId Ln]` source markers, in `turns` order.
   - **Recap** (bottom): from Step 1 engine output — sessions, duration, messages, top 3 tools,
     lines changed as a table, 2-3 sentence summary, friction, and assessment
     (goal/outcome/helpfulness).
   - Header `Date(KST)` = `TZ=Asia/Seoul date "+%Y-%m-%d %H:%M:%S"`.
6. Update `docs/commit-log/README.md` — append one row; create the file with header if absent.
7. Stage both: `git add "docs/commit-log/$TS-$slug.md" docs/commit-log/README.md`

The file rides in the SAME commit created by Step 4.

## Step 4: Create the Commit(s) — atomic, one unit per commit

1. Run `git status` and `git diff HEAD`.
2. **Group the changes by logical unit** — feature vs docs vs fix vs config vs refactor.
   Each cohesive change is its own commit; do **not** dump everything into one giant commit.
   The directive-log (`docs/commit-log/$TS-$slug.md` + README row) rides with the unit it
   documents — usually the primary change unit.
3. **Stage by filename, per unit** — `git add <file> <file>…` for that unit only.
   **Never `git add .` / `git add -A`** (stage by name; secrets like `.env`/credentials never staged).
4. **Pre-commit gate** — re-scan the assembled log (`docs/commit-log/$TS-$slug.md`) with the
   Step 3a regex. On any match, **STOP — do not commit**; report the line and remove it first.
5. **Hunk-split limitation** — if core files interleave two concerns at the **line level**
   (the same file's hunks can't be cleanly separated by filename), do **not** force a broken
   split. State the limitation explicitly and fall back to a sensible smaller number of commits
   (e.g., 2) that still keep each commit coherent — and note this in the Recap.
6. Commit each unit with a focused WHY-centric message via HEREDOC. Repeat per unit:

```bash
git commit -m "$(cat <<'EOF'
<concise commit title for THIS unit>

<short WHY — 1-2 sentences; recap block from Step 2 on the unit that carries the log>

🤖 Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

Do not stage secrets (.env, credentials). Do not create empty commits. Do not use
`--no-verify`. Order commits so dependencies land first (e.g., config/fix before the feature
that relies on them).

## Backfill mode (document past commits)

Triggered when the user asks to backfill / document existing commits.

```bash
ENGINE=/Users/taehyoungkim/Documents/DEV/ww-w-ai/ai-native-cowork/src/cli.ts
```

1. List commits: `git log --format='%H %cI %s' --no-merges`.
2. Read existing `docs/commit-log/` filenames; parse `YYYYMMDD-HHMMSS` prefixes → documented timestamps.
3. Undocumented = commits with no matching doc. If > 8, ask the user which to document.
4. For each target commit C (committer time `C_cI`) with previous commit P (`P_cI`):
   ```bash
   bun run "$ENGINE" commit-log --path "$PWD" --from "$P_cI" --to "$C_cI"
   ```
   For the first commit (no P), omit `--from`.
5. Filename from C's committer time in KST:
   ```bash
   TS=$(TZ=Asia/Seoul date -j -f '%Y-%m-%dT%H:%M:%S%z' "${C_cI}" +%Y%m%d-%H%M%S 2>/dev/null)
   ```
6. Apply the **Step 3a scope-filter** to the turns (drop personal/financial/credential/off-scope
   turns; drop-on-doubt; scan assistant context on reactive turns), then write
   `docs/commit-log/$TS-<slug>.md` (slug = short English descriptor). On collision append `-2`.
   Run the Step 4 pre-commit secret gate before committing.
   The commit hash MAY be included in the body (commit already exists — no paradox).
7. Update `docs/commit-log/README.md` (time order, append-only).
8. Commit: `git add docs/commit-log/ && git commit -m "docs(commit-log): backfill <range>"`
