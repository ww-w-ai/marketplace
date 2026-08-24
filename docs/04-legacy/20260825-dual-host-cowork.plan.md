> Status: FROZEN — completed process artifact. Current truth: [`../01-built/cowork-sprint.md`](../01-built/cowork-sprint.md).

# Dual-host cowork roadmap

Date: 2026-08-25
Branch: `sprint/dual-host`

Completion commits: `7bb23ba`, `bfa749e`, `6a83fed`, `1c1e9c6`, plus the final parity/doc-close commits. This roadmap is preserved as execution history; it no longer governs current work.

## Goal

Ship one ai-native-cowork product from one repository for Claude Code and Codex. Both hosts expose the same skills, triggers, phases, gates, durable state, outputs, and completion rules. Only execution mechanisms differ.

## Product success

- Claude Code keeps its current capabilities.
- Codex installs the same six skills from the same source repository.
- `pdca-wf` and `cowork-sprint` implement the same method on both hosts.
- Both hosts read and write one minimal `status.json` contract.
- Sprint work uses rolling-wave planning, separate Plan and Design reviews, dynamic role deltas, targeted sprint tests, and mandatory sprint commits.
- A 0–10 risk score adds verification without removing core gates.
- Transcript consumers accept Claude and Codex sessions through one normalized boundary.
- Automated parity checks reject accidental feature drift between hosts.

## Out of scope

- Publishing, pushing, or creating a release tag.
- Replacing provider-native agent runtimes.
- Giving Codex unsupported hooks or plugin-agent registration.
- Rewriting proven transcript parsing from memory.
- Updating the stale vendored marketplace copy as a second source of truth.

## Risk score

| Dimension | Score | Reason |
|---|---:|---|
| Impact | 2 | Six skills, manifests, agents, scripts, and installation surfaces |
| Recovery | 1 | Git rollback is available, but two hosts may cache different versions |
| Security or external effects | 0 | No production deployment or credential mutation |
| Contract change | 2 | Public skill behavior, manifests, state schema, and transcript inputs |
| Verification difficulty | 2 | Host parity and installation behavior require separate checks |
| **Total** | **7/10** | Heavy verification applies at the roadmap boundary |

External actions remain approval-gated regardless of score.

## Coarse roadmap

| Sprint | Deliverable | Dependencies | Done summary |
|---|---|---|---|
| S1 | Shared method contract, minimal state schema, risk score, host seams | none | Shared contract and deterministic state validation pass |
| S2 | Dual-host `pdca-wf` | S1 | Same phases, gates, WorkList, and outputs on both hosts |
| S3 | Dual-host `cowork-sprint` | S1, S2 | Rolling roadmap, dependency-based sequential/parallel/mixed clusters, role deltas, risk gates, targeted tests, commits, resume |
| S4 | Remaining skills, agents, manifests, transcript boundary, packaging | S1–S3 | Six-skill parity, both manifests valid, tests and install smoke pass; Codex goal-control messages excluded from user-message views |

Only the active sprint receives detailed Plan and Design. Later sprints remain coarse until their dependencies settle.

### S3 execution-cluster addition

Roadmap planning classifies sprint relationships before execution:

```text
explicit or implicit dependency
  -> sequential

shared file, shared mutable artifact, shared public contract, or overlapping ownership
  -> sequential unless the Plan defines a deterministic merge owner

no dependency and no ownership overlap
  -> parallel-eligible
```

Store the resulting roadmap mode as `sequential`, `concurrent`, or `mixed`. In mixed mode, independent sprints run as a bounded parallel cluster and the next dependent cluster waits for every prerequisite commit and checkpoint. Both hosts expose the same cluster plan and completion semantics; only their dispatch mechanisms differ.

S3 acceptance must cover a pure sequential graph, a parallel diamond, mixed clusters, dependency failure blocking downstream work, file-ownership collision forcing serialization, and deterministic integration after a parallel cluster.

### S4 transcript acceptance addition

For Codex transcripts only, a message whose payload is a `<codex_internal_context source="goal">...</codex_internal_context>` control envelope remains available as raw execution history but is not user dialogue. Exclude it from:

- last-five user messages;
- cowork-insights user-prompt summaries;
- cowork-commit directive-log user-turn lists.

Do not apply this source-specific filter to Claude transcripts. Tests must place several goal-continuation envelopes between real user messages and prove the last-five result contains only real user-authored turns in chronological order.

## Shared lifecycle

```text
Roadmap:
  Goal -> one PRD-lite -> coarse sprint map -> roadmap review -> approval

Sprint:
  Research -> Sprint Brief -> Plan -> Plan review
  -> Design -> Design review -> dynamic role execution
  -> targeted test -> WorkList gap check -> sprint commit -> state update

Roadmap close:
  full regression -> final intent audit -> release-readiness check
  -> doc-sync -> local merge -> retrospective
```

## Host execution seam

| Shared concept | Claude Code | Codex |
|---|---|---|
| Durable state | `status.json` | `status.json` |
| Long-running control | session + status | Goal + status |
| Short plan | TodoWrite | `update_plan` |
| Parallel work | Agent / Workflow | collaboration agents |
| Single feature | Workflow-backed `pdca-wf` | root/worker-backed `pdca-wf` |
| Rules | `CLAUDE.md` | `AGENTS.md` |
| Transcript | Claude JSONL | Codex rollout JSONL |

## S1 Sprint Brief

### Problem

Method rules and Claude execution details currently live in the same skill files. State is manually edited and has drifted in real runs. Risk-dependent verification is described with ambiguous labels.

### Success

- One shared contract defines phases, core gates, risk thresholds, outputs, and state.
- Host-specific references define execution without duplicating the method.
- State transitions are validated by a deterministic script.
- Existing uncommitted TRIM work is retained but reconciled with the simplified default flow.

### Out of scope

- Implementing the complete Codex `pdca-wf` or `cowork-sprint` entrypoint.
- Transcript normalization and manifest installation.

### Dependencies

- Existing 1.17.0 Claude implementation.
- Local Codex plugin and transcript-tool references.

### Pre-mortem

- Shared files become an abstract framework no host consumes.
- State schema drops information needed for resume.
- Risk scoring removes core gates at low scores.
- Existing TRIM edits are lost or turned into a mandatory extra agent pass.

## S1 Plan

1. Define the shared phase, gate, risk, dynamic-role, test, commit, and close contracts.
2. Define a minimal status schema that stores resume state, not reports.
3. Add a deterministic validator and transition helper with tests.
4. Add Claude Code and Codex runtime references.
5. Update skill entrypoints only enough to route to the shared contract and preserve current behavior, except for one intentional divergence: retain TRIM as a concise diff question inside QA instead of a mandatory separate agent pass.
6. Run targeted schema, transition, lifecycle-fixture, host-seam, risk, and contract parity checks.
7. Commit S1 independently.

### Plan evidence map

| WorkList | Artifact | Owner step | Deterministic evidence |
|---|---|---|---|
| S1-01 | shared method + two host references | 1, 4, 5 | contract test rejects host tool names in shared text and phase/gate redefinition in host text |
| S1-02 | status schema | 2 | valid CC/Codex lifecycle fixtures pass; unknown/report fields and bad references fail |
| S1-03 | state helper | 3 | unit tests cover start, phase, pause/resume, decision, commit, complete, fail, archive, stale revision |
| S1-04 | risk contract + calculator | 1, 3 | score fixtures prove 0–3/4–6/7–10 and core/safety non-waiver |
| S1-05 | dynamic-role contract | 1 | contract test finds the four required role-delta parts once in shared text |
| S1-06 | reconciled TRIM contract | 5 | focused assertion rejects a mandatory separate trim-agent gate and retains the unrequested-diff question |

Representative lifecycle fixtures model S2 single-feature completion and S3 rolling-sprint pause/resume without implementing either host runtime.

## S1 Plan review contract

- Completeness: every agreed invariant has an owner and output.
- Scope: S1 does not implement host orchestration.
- Sequencing: S2 and S3 can consume S1 without revising its schema.
- Sizing: one cohesive shared-contract deliverable.

## S1 Design

### Files

```text
shared/
  references/cowork-method.md
  references/runtime-claude-code.md
  references/runtime-codex.md

skills/cowork-sprint/
  references/status.schema.json
  scripts/state/state.py
  scripts/state/test_state.py
```

The existing skill folders remain the public entrypoints. Shared references own common semantics. Host references own only tool and path mechanics.

### Minimal status

```text
schemaVersion, revision, runId, goal, roadmapFile
executionMode
git { baseBranch, worktree, sprintBranch, lastCommit }
sprints[] { id, deps, planFile, risk, status, phase, commit, resultFile? }
pause, openDecisions[], updatedAt
```

Reports own full QA tables, review findings, research notes, and resolved decisions.

### Risk score

Five dimensions score 0–2: impact, recovery, security/external, contract, verification.

```text
0–3  core gates only
4–6  deeper independent review and adjacent regression
7–10 specialist review plus applicable parity or mutation and final intent/rollback checks
```

Core gates and external-action approvals never depend on score.

### Dynamic roles

Every delegated task uses:

```text
base role + sprint role delta + evidence contract + explicit exclusions
```

One-off deltas stay in prompts. Repeated, proven deltas become retrospective promotion candidates.

### State semantics

Canonical phases are `pending`, `research`, `brief`, `plan`, `plan-review`, `design`, `design-review`, `do`, `test`, `gap-check`, `commit`, and `done`. Sprint statuses are `pending`, `in-progress`, `blocked`, `failed`, `completed`, and `archived`.

An active sprint has status `in-progress` or `blocked`. In sequential mode, at most one sprint may be active. A sprint can start only when every dependency is completed. Normal phase transitions move one step forward. `blocked` preserves the current phase. `failed` and `archived` are terminal. Completion requires phase `commit`, a non-empty commit identifier, and every dependency completed.

| Command | Allowed source | Result |
|---|---|---|
| `start-sprint` | `pending/pending` with completed deps | `in-progress/research` |
| `set-phase` | `in-progress/<current>` | `in-progress/<next>` |
| `block-sprint` | `in-progress/<any nonterminal phase>` | `blocked/<same phase>` |
| `resume` | matching global pause and `blocked/<same phase>` or `in-progress/<same phase>` | clears pause; blocked sprint becomes `in-progress/<same phase>` |
| `fail-sprint` | `in-progress` or `blocked`, any nonterminal phase | `failed/<same phase>` |
| `set-commit` | `in-progress/commit` | records commit; state remains `in-progress/commit` |
| `complete-sprint` | `in-progress/commit` with commit and completed deps | `completed/done` |
| `archive-sprint` | `completed/done` or `failed/<same phase>` | `archived/<same phase>` |

`completed` and `archived` are terminal for execution. A completed sprint may only be archived. A failed sprint may only be archived; retry creates a new sprint or follows a future explicit retry contract rather than silently reviving failed state.

`pause` is either null or `{code, sprintId, phase, detail, blockedBy, createdAt}`. Codes are the shared auto-pause set. Resume clears pause only after the caller re-evaluates and explicitly supplies the same code. `openDecisions[]` contains `{id, sprintId, question, chosenDefault, reason, status}` where status is `open`; resolved decisions move to reports instead of remaining active state.

### State transitions

The script provides `init`, `start-sprint`, `set-phase`, `set-commit`, `complete-sprint`, `block-sprint`, `fail-sprint`, `archive-sprint`, `pause`, `resume`, `open-decision`, `resolve-decision`, and `validate`.

Every mutation requires `--expected-revision`. The script reads the current document, compares revisions, validates the transition, increments the revision, writes a sibling temporary file, and atomically renames it. Failed validation leaves the prior file unchanged.

It rejects unknown fields and phases, duplicate sprint IDs, missing dependency references, dependency cycles, illegal phase/status combinations, dependency violations, completion without a commit, stale revisions, non-ISO timestamps, absolute plan/report paths, and multiple active sprints in sequential mode.

The atomic-write and declarative-transition baseline is adapted from `/Users/taehyoungkim/Documents/DEV/ww-w-ai/bkit/bkit-claude-code` commit `eec224f3911ad1484295b7837ca88fd013eb540d` (`v2.1.38-2-geec224f`), files `lib/infra/sprint/sprint-state-store.adapter.js` and `lib/pdca/state-transitions.js` (Apache-2.0). The cowork schema and transitions are intentionally smaller; provenance is recorded in `THIRD-PARTY-NOTICES.md`.

### Schema seam

The schema uses JSON Schema draft 2020-12 and recursively closes authored objects with `additionalProperties: false`. Required fields are explicit. Nullable fields use a type union with `null`. IDs are non-empty stable strings. Commit identifiers accept Git hex object IDs of 7–64 characters. Plan/report paths are repository-relative. Semantic checks that JSON Schema cannot express, including dependency cycles and phase transitions, belong to the state helper.

### Risk seam

Each sprint stores `risk: {impact, recovery, securityExternal, contract, verification, total}`. Every dimension is an integer from 0 through 2. `total` is their sum from 0 through 10. The helper validates the sum and derives the level at runtime; the level is not persisted. Risk affects added gates only. Core gates and approval for external or irreversible actions remain mandatory at every score.

## S1 Design review contract

- Schema supports CC-to-Codex resume without host-only fields.
- Transition commands cover every lifecycle mutation needed by the skills.
- Shared references contain no host tool names.
- Host references do not redefine shared phases or gates.
- Tests exercise invalid transitions, not wording.

## S1 WorkList

| ID | Work | Acceptance evidence | Priority |
|---|---|---|---|
| S1-01 | Shared method contract | Both host references point to one phase/gate definition | P0 |
| S1-02 | Minimal state schema | CC single-feature and Codex rolling-resume fixtures pass; unknown/report fields, bad refs, cycles, and invalid paths fail | P0 |
| S1-03 | State transition helper | Transition tests cover start, phase, pause/resume, decision, commit, complete, fail, archive, stale revision, and atomic preservation | P0 |
| S1-04 | Risk score contract | Threshold and non-waivable core/safety tests pass | P0 |
| S1-05 | Dynamic role contract | Base+delta+evidence+exclusions documented once and consumed by both host references | P1 |
| S1-06 | Existing TRIM preservation | Original intent retained as a concise QA diff check; default flow has no mandatory separate trim agent | P1 |
| S1-07 | Host seam parity | Shared text contains no host tools; host references cannot redefine phases/gates | P0 |
| S1-08 | Entrypoint consumption | Current public skills link to shared method/runtime references without implementing S2/S3 orchestration | P1 |

## S2 Sprint Brief

### Problem

`pdca-wf` currently defines the product as a Claude Workflow engine. Codex has no Workflow or TodoWrite primitive, but it can implement the same single-feature lifecycle with `update_plan`, explorer/worker collaboration agents, and root-owned judgment.

### Success

- One `skills/pdca-wf/SKILL.md` exposes the same trigger, phases, gates, WorkList, outputs, and Done rules to both hosts.
- Existing Claude Workflow behavior moves intact to a Claude execution reference.
- Codex receives an explicit root/worker execution reference.
- The entrypoint selects by available host capabilities, not by user configuration.
- Contract tests prove both mappings cover every shared phase and core gate.

### Out of scope

- Multi-sprint orchestration, worktree lifecycle, and roadmap state transitions owned by `cowork-sprint`.
- Codex manifest and transcript normalization.
- Rewriting Claude Workflow scripts.

### Dependencies

- S1 shared method and runtime mappings.
- Existing `pdca-wf` Workflow implementation and schemas.

### Pre-mortem

- The entrypoint contains both full implementations and doubles its context cost.
- Moving Claude instructions changes behavior or breaks relative references.
- Codex creates Goals for ordinary feature work without explicit authorization.
- Platform mappings drift in phase names or artifacts.

## S2 Plan

1. Characterize the current Claude `pdca-wf` surface and relative references.
2. Move Claude-only runtime mechanics to a Claude execution reference. Preserve Workflow scripts, schemas, same-file serialization, bounded Check/Act, and document lifecycle mechanics. Intentionally change lifecycle ordering to add Sprint Brief, pre-Design Plan review, and post-Design Design review.
3. Write a Codex execution reference that maps the same lifecycle to root, `update_plan`, explorer, worker, and fresh reviewers.
4. Replace the public entrypoint with concise shared routing, trigger boundaries, common inputs/outputs, and host selection.
5. Extend parity tests to require every shared phase, core gate, output, and safety boundary in both runtime mappings.
6. Run only pdca contract, moved-reference, path, frontmatter, and existing Bun regression tests.
7. Commit S2 independently and checkpoint state.

### Entry modes and commit ownership

| Entry mode | Planning | Commit owner | Durable checkpoint |
|---|---|---|---|
| standalone interactive `pdca-wf` | full feature lifecycle | no implicit commit; commit only when the user requested it | report/as-built output; no cowork sprint state required |
| pre-planned standalone | validate supplied Brief/Plan/Design/WorkList, then execute | no implicit commit; return commit-ready evidence | report/as-built output |
| invoked by `cowork-sprint` | planning artifacts already reviewed; execution starts at Do | cowork-sprint leader must commit the sprint | cowork-sprint leader updates shared state after commit |

The execution-only return contract is `{artifacts, targetedTests, gapResult, qaDiff, done, commitReady}`. `cowork-sprint` consumes it and performs its mandatory commit and state checkpoint. Standalone execution reports the same evidence but does not infer authorization to commit.

### Intentional lifecycle delta

| Current Claude behavior | S2 target | Classification |
|---|---|---|
| Research -> Plan -> Design -> one review | Research -> Brief -> Plan -> Plan review -> Design -> Design review | intentional shared-method correction |
| Workflow Research/Do/Check | same Workflow mechanics | preserved |
| WorkList topo-sort, file groups, same-file serialization | same | preserved |
| bounded Check/Act and document lifecycle | same, ordered under shared gates | preserved |
| no standalone commit | still no implicit standalone commit | preserved safety boundary |
| cowork caller commits outside pdca | explicit execution-only handoff to leader | clarified |

## S2 Plan review contract

- Scope: only one-feature execution; no sprint orchestration leaks in.
- Completeness: CC behavior remains reachable and Codex has an executable path.
- Sequencing: S3 can invoke this stable contract without host-specific branching.
- Done: parity checks verify behavior, not only links or headings.

## S2 Design

### Public entrypoint

`skills/pdca-wf/SKILL.md` becomes a thin host router. It retains the shared name and discriminating description. It reads `../../shared/references/cowork-method.md`, then selects:

```text
if update_plan and collaboration tools are available, and Workflow/TodoWrite are not
  read references/runtime-codex.md
else if Workflow and TodoWrite are available, and update_plan is not
  read references/runtime-claude-code.md
else if both capability sets are visible
  stop: ambiguous host capability surface
else
  stop with an unsupported-host explanation
```

Host detection uses available capabilities. It never asks the user to select the host.

### Claude execution reference

Move the existing Workflow constraints, actor model, execution mechanics, OODA, gates, and document lifecycle into `skills/pdca-wf/references/runtime-claude-code.md`. Preserve the runtime mechanics while adopting the intentional lifecycle delta above. Do not rewrite `workflow-scripts.md` or schemas.

Rewrite moved links mechanically:

```text
references/<file> -> <file>
skills/pdca-wf/docs/01-built/pdca-wf.md -> ../docs/01-built/pdca-wf.md
```

A link-resolution test must verify every local Markdown target from the entrypoint and moved reference.

### Codex execution reference

The root agent owns Research integration, Sprint Brief, Plan, Design, review resolution, integration, tests, gap check, QA diff question, report, and safety decisions. It uses:

- `update_plan` for current phases;
- explorers for bounded codebase research;
- workers for explicitly owned implementation slices;
- fresh-context agents for separate Plan and Design reviews;
- root-executed targeted commands for exit-code evidence.

The Codex reference contains a phase table with inputs, owner/tool, output, exit condition, and fallback. WorkList items are topologically sorted. Disjoint file groups may go to workers; same-file changes remain serial. Check/Act is bounded at five iterations. OODA re-plans only the affected slice and re-runs only invalidated review lenses.

Fresh reviews use collaboration agents with no inherited task rationale beyond the raw Brief/Plan or Design and governing paths. If no independent slot is available, wait for one or stop with `INDEPENDENT_REVIEW_UNAVAILABLE`; the root may implement directly but may not replace mandatory independent review with self-review. Worker failure returns ownership to root for bounded direct execution and does not skip the exit gate.

An ordinary `pdca-wf` run does not create a Codex Goal. It participates in an existing Goal when its caller already has one. It creates a Goal only when the user explicitly requests one.

### Shared observable contract

Both hosts produce the same artifacts: research note when needed, Sprint Brief, Plan, Plan review result, Design with WorkList, Design review result, targeted test evidence, gap result, QA diff decision, report, and as-built update. Both use the same risk score and safety approval rule. Execution-only mode returns the fixed handoff object defined above.

Parity validation uses a canonical matrix, not prose headings. It asserts interactive and execution-only ordering, separate review barriers, blocker-only re-review, WorkList grouping, five-iteration bound, targeted test before gap check, QA diff after gap check, output/return fields, risk thresholds, external approval, unsupported/ambiguous hosts, and absence of implicit Goal creation.

## S2 Design review contract

- Claude procedure relocation is behavior-preserving and all links resolve.
- Codex mapping can execute every shared phase without invented tools.
- Entry routing is deterministic from capabilities.
- Common artifacts and Done rules appear once and are tested for both hosts.
- No ordinary feature run creates a Goal implicitly.

## S2 WorkList

| ID | Work | Acceptance evidence | Priority |
|---|---|---|---|
| S2-01 | Thin shared entrypoint | Trigger boundaries remain; entrypoint routes by capabilities | P0 |
| S2-02 | Claude procedure extraction | Existing phase/reference inventory preserved and links resolve | P0 |
| S2-03 | Codex execution mapping | Every shared phase has a concrete Codex owner and mechanism | P0 |
| S2-04 | Common outputs and Done | Parity test covers artifacts, core gates, risk, safety, and sprint commit handoff | P0 |
| S2-05 | Goal boundary | Test/contract proves no implicit Goal for ordinary feature work | P1 |
| S2-06 | Entry modes and commit ownership | Behavioral matrix covers interactive, pre-planned, and cowork execution-only return/commit/checkpoint rules | P0 |
| S2-07 | Targeted regression | Contract tests, moved-link resolution, host selection matrix, frontmatter, and Bun tests pass | P0 |
| S2-08 | Supporting lifecycle artifacts | Review lenses/schema, templates, and as-built use the named dual-review lifecycle; parity test prevents drift | P0 |

## Continuation execution policy — user decision, 2026-08-25

Starting with the next Codex session, work that would normally be delegated to a Codex subagent should instead be delegated to the authenticated Claude CLI using Sonnet. Run Claude outside the sandbox when required for its existing Claude Max login and session environment. Use JSON streaming so the Codex leader can observe the live event stream.

Recommended invocation shape:

```text
claude -p --model sonnet --output-format stream-json --include-partial-messages --dangerously-skip-permissions <prompt>
```

The user explicitly approved sending the relevant private repository plan/source context to the external Claude service and allowing Sonnet to edit the files assigned to its owned slice. The command still requires the normal escalated sandbox approval at execution time.

`--dangerously-skip-permissions` removes Claude's internal prompts; it does not widen task scope. Every invocation must state an exact writable file allowlist, an exact focused-test command, and explicit forbidden files. The Codex leader compares the resulting diff with that allowlist and rejects out-of-scope edits. Planning documents, durable state, and sibling slices remain read-only unless the invocation explicitly assigns them.

Claude output is evidence or an owned implementation slice, not final acceptance. The Codex leader must inspect every diff. Claude tends to write verbose code and documentation, so the leader must ask for a more compact revision when the same contract can be implemented with less text or structure. Do not compact away contracts, safety boundaries, failure direction, or required evidence.

Observed environment facts:

- sandbox: `loggedIn: false`, `authMethod: none`;
- outside sandbox: `loggedIn: true`, Claude Max authentication works;
- sandbox creation under `~/.claude/session-env/` failed with `EPERM`.

## S3 Sprint Brief

### Problem

`cowork-sprint` describes parallel work, but durable state stores only a global mode and sprint DAG. It cannot reproduce cluster boundaries, prove file-ownership safety, or block a later cluster until every earlier sprint is committed and checkpointed.

### Success

- A deterministic scheduler converts dependencies and ownership into sequential, concurrent, or mixed clusters.
- Durable state stores clusters, ownership, and deterministic integration order.
- Both hosts expose the same planning and completion semantics with native dispatch mechanisms.
- Resume and transition guards enforce cluster barriers without weakening per-sprint gates or commits.

### Out of scope

Nested sprint leaders, parallel `pdca-wf` orchestrators, cross-worktree merge automation, remote actions, and S4 packaging work.

### Dependencies and pre-mortem

S1 supplies state/risk contracts; S2 supplies execution-only `pdca-wf`. Failure modes: a dependency enters the same cluster, two concurrent sprints own one file, a later cluster starts early, or integration order varies across resumes.

## S3 Plan

1. Extend the existing schema and validator with backward-compatible sprint ownership and cluster data.
2. Add a pure scheduler that layers the DAG, serializes ownership collisions, and derives global mode and integration order deterministically.
3. Enforce cluster barriers while retaining one commit and checkpoint per sprint.
4. Make `cowork-sprint` a thin shared router; move preserved Claude mechanics to a runtime reference and add the Codex mapping.
5. Point method/as-built docs to the scheduler as the mechanical authority.
6. Test chains, diamonds, mixed graphs, dependency failure, collisions, deterministic integration, resume, host parity, and existing behavior.
7. Run targeted tests, gap check, QA diff, independent commit, and checkpoint.

## S3 Design

## S3 Plan review contract

- Scope: scheduler, durable cluster state, host routing, and lifecycle sync only.
- Compatibility: legacy states without clusters validate; newly planned roadmaps persist clusters.
- Safety: every delegated process, including Claude CLI, receives one cluster member's ownership allowlist and cannot bypass the leader's cluster barrier.
- Done: schema/state/scheduler/parity tests prove the Plan rather than relying on prose.

### Scheduling data

Each sprint may store `owns: [repo-relative path or mutable-artifact key]`. State may store legacy data without clusters; new scheduler output includes:

```json
{"clusters":[{"id":"C1","mode":"sequential|concurrent","sprintIds":["S1"],"integrationOrder":["S1"]}]}
```

Every sprint appears exactly once. A dependency must be in an earlier cluster. Concurrent clusters contain at least two sprints with no ownership overlap. Ownership keys are normalized POSIX paths or explicit artifact keys; equality or ancestor/descendant path prefix counts as overlap. An empty `owns` list is unknown ownership and forces that sprint into a singleton cluster. `integrationOrder` is a stable roadmap-order permutation of `sprintIds`.

### Deterministic scheduler

`scripts/schedule.py` consumes sprint `{id,deps,owns}` records. It repeatedly selects dependency-ready sprints in roadmap order, packs a collision-free concurrent group, and serializes leftovers into later clusters. A singleton is sequential. Global mode is `sequential` when every cluster is singleton, `concurrent` when one concurrent cluster covers the roadmap, otherwise `mixed`.

### Runtime and transitions

The state helper is the enforcement point. Root `clusters` and sprint `owns` are optional in schema and validator so legacy state stays valid. When clusters exist, `start-sprint` locates the target cluster and rejects it unless every member of every earlier cluster is `completed` with a commit. It admits multiple active members only from the same concurrent cluster. Failed or blocked members therefore prevent advance even without a dependency edge. The leader integrates concurrent members in stored order and runs cluster-adjacent tests. Claude Code uses flat Agent/Workflow workers; Codex uses flat collaboration workers or the approved Claude CLI replacement, always with the current member's ownership allowlist. Neither path creates nested leaders or mutates state directly.

`skills/cowork-sprint/SKILL.md` becomes a capability router. Host references own dispatch mechanics but share roadmap, Brief/Plan/Design, reviews, risk, clusters, commits, resume, and Done semantics.

## S3 Design review contract

- The scheduler is deterministic, cycle-safe, and handles empty ownership conservatively.
- Schema and Python validation express the same cluster invariants.
- Transition tests prove cluster admission, failure blocking, per-sprint commits, and resume.
- Host mappings cannot redefine cluster or Done semantics.

## S3 WorkList

| ID | Work | Acceptance evidence | Priority |
|---|---|---|---|
| S3-01 | Schema ownership and cluster contract | schema/state fixtures define the scheduler input and durable output | P0 |
| S3-02 | Cluster scheduler and transition guards | chain, diamond, mixed, collision, order, barrier, failure, and resume fixtures | P0 |
| S3-03 | Thin entrypoint and host mappings | parity covers cluster semantics, commits, and native dispatch | P0 |
| S3-04 | Reference and as-built sync | scheduler is the mechanical authority; preserved Claude behavior remains linked | P1 |
| S3-05 | Targeted regression and report | prior contract/state suites and new S3 suites pass | P0 |

## S4 Brief, Plan, and Design

### Brief

The remaining four skills, session engine, agents, manifests, and README still assume Claude Code. Codex needs the same six skills and transcript views without treating Goal control envelopes as user dialogue.

Success: both manifests expose one six-skill source; Claude and Codex JSONL normalize into the existing message contract; Goal envelopes remain raw but disappear from prompts, facet transcripts, and commit turns; docs and versions agree. Out of scope: publish, marketplace mutation, install, push, tag, or release.

### Plan

1. Copy the local codex-token-saver `response_item/payload.message` parsing shape into one TypeScript normalizer.
2. Route scanner, insights formatting, and commit turns through it; discover Codex session files by `session_meta.cwd`.
3. Add exact goal-envelope filtering and fixtures proving raw input is untouched.
4. Add the Codex manifest, six-skill parity check, dual-host skill/agent wording, README hook/pain/solution update, and version sync.
5. Run engine, state, scheduler, runtime, manifest, live discovery, and full regression checks.

### Design

`normalizeTranscriptRow(row)` is the only format seam. Claude rows pass through. Codex `response_item` messages map `input_text/output_text` blocks to the existing `SessionMessage`. A complete user `<codex_internal_context source="goal">...</codex_internal_context>` envelope returns null; embedded discussion of that syntax remains dialogue. Scanners and commit logs consume normalized messages while raw files remain unchanged.

Codex discovery walks `~/.codex/sessions/YYYY/MM/DD`, reads only `session_meta` for cwd scope, then defers full parsing. `.codex-plugin/plugin.json` points to the same `./skills/` directory as the Claude plugin. `scripts/test_product_parity.py` fixes the expected six-skill set and manifest name/version parity.

### Review contracts

- Plan: no second implementation tree, no raw-history mutation, no personal marketplace/install action.
- Design: exact control-envelope boundary, source-compatible parsing, scanner scope, commit/insights consumption, manifest validity, and regression evidence.

### WorkList

| ID | Work | Evidence |
|---|---|---|
| S4-01 | Shared transcript normalizer and Codex discovery | unit tests + live discovery smoke |
| S4-02 | Goal-control exclusion in insights and commit views | exact/embedded/raw-preservation fixtures |
| S4-03 | Six shared skills and Codex manifest | parity script + JSON validation |
| S4-04 | Agent, README, and version sync | diff audit + full regression |
