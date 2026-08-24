# pdca-wf — Workflow script templates

These are **reference templates**. At runtime the MAIN session interpolates the feature's values and passes the string as `Workflow({script, args})`. The harness persists it to a file and runs it in the Workflow sandbox.

## Script contract (the Workflow runtime — NOT a standard ES module)

- The string MUST begin with `export const meta = { name, description, phases }` (pure literal).
- The body then uses **ambient** hooks — no import, no declaration: `agent()`, `parallel()`, `pipeline()`, `phase()`, `log()`, `args`, `budget`, `workflow()`.
- **Top-level `await` and top-level `return` ARE supported** by this runtime (the harness wraps the body). So `const x = await agent(...)` and a final `return {...}` at top level are correct here — do not "fix" them into a function.
- `args` is exactly the JSON value passed as `Workflow({script, args})`. Main builds it.

## Sandbox rules (violating these throws or breaks resume)

- NO `Date.now()` / `new Date()` / `Math.random()`. Timestamps come from `args.dt` (main stamps via `date`). For per-item variety use the index, not randomness.
- NO `fs` / Node APIs. Agents do file I/O, not the script. **Therefore schemas CANNOT be loaded from schemas.md at runtime — main MUST inline the real JSON Schema object into the script string before dispatch** (the `{ /* ... */ }` placeholders below are where main pastes the actual schema from schemas.md).
- Standard JS built-ins (JSON, Math, Array) are fine.
- Concurrency cap ≈ min(16, cores-2); pass big arrays freely, they queue.
- `agentType` resolves from the same registry as the Agent tool. Omit it for the default workflow agent. `args.agentMap` (built by main in Phase 3, schema in schemas.md) maps work-item id → agentType, plus a `fix` key for the Act step.

## Phase 1 — Research

```js
export const meta = {
  name: 'pdca-research',
  description: 'Multi-modal research sweep for one feature',
  phases: [{ title: 'Research' }],
}
const ANGLES = [
  { area:'code',   prompt:`Search the codebase for prior art / patterns relevant to: ${args.feature}` },
  { area:'web',    prompt:`Web research current best practice / pitfalls for: ${args.feature}` },
  { area:'entity', prompt:`Find existing entities, configs, constraints touching: ${args.feature}` },
]
const FINDINGS = { /* ResearchFindings schema — main inlines the real object from schemas.md (sandbox has no fs) */ }
const results = await parallel(ANGLES.map(a => () =>
  agent(a.prompt, { label:`research:${a.area}`, phase:'Research', schema: FINDINGS })))
return { findings: results.filter(Boolean).flatMap(r => r.findings) }
```

## Phase 4 — Do

```js
export const meta = {
  name: 'pdca-do',
  description: 'Implement the design work-list',
  phases: [{ title: 'Do' }],
}
// args.workList = WorkList (schemas.md), already TOPO-SORTED by main (dependsOn honored before dispatch).
// args.agentMap = { [workItemId]: agentType, fix: agentType }  (built by main, schemas.md).
// Collision rule (user rule "one file = one role"): items sharing a file run SERIALLY (one chain);
// items on disjoint files run in PARALLEL. Main pre-groups items by file into `args.workList.fileGroups`
// = array of arrays (each inner array = items on one file, in dependency order).
const groups = args.workList.fileGroups       // [[w1a,w1b],[w2],...]  (one group per file)
const built = await parallel(groups.map(group => async () => {
  const out = []
  for (const item of group) {                 // serial within a file → no lost-update, no worktree needed
    out.push(await agent(
      `Implement per design ${args.designPath}: ${item.change} in ${item.file}`,
      { label:`do:${item.id}`, phase:'Do', agentType: args.agentMap?.[item.id] }))
  }
  return out
}))
return { built: built.filter(Boolean).flat() }
```

## Phase 5 — Check/Act (loop-to-100, max 5)

```js
export const meta = {
  name: 'pdca-check',
  description: 'Verify build vs design, fix gaps, loop to 100',
  phases: [{ title: 'Check' }, { title: 'Act' }],
}
const GAP = { /* GapResult schema (main inlines from schemas.md) */ }
const LENSES = ['correctness', 'regression', 'design-fit']
function mergeGaps(votes) {
  const v = votes.filter(Boolean)
  if (!v.length) return { matchRate: null, gaps: [], votesMissing: true }  // no votes ≠ 0% — caller retries/aborts
  const matchRate = Math.min(...v.map(x => x.matchRate))                    // conservative
  const seen = new Set(), gaps = []
  for (const x of v) for (const g of (x.gaps||[])) {
    const k = `${g.item}|${g.expected}`
    if (!seen.has(k)) { seen.add(k); gaps.push(g) }
  }
  return { matchRate, gaps }
}
let gap, iter = 0, ranTests = 0
while (iter < 5) {
  // F10: for VERIFIABLE work, RUN the stack's real checks first — matchRate is grounded in executed tests,
  // not LLM opinion. args.verifyCmd = main-detected command(s) ("npm test && npm run lint && tsc --noEmit"),
  // or null for non-verifiable work (then lenses are the only signal).
  let testGate = { passed: true, output: '' }
  if (args.verifyCmd) {
    testGate = await agent(
      `Run \`${args.verifyCmd}\` and report {passed:boolean, output:string} from the real exit code (no guessing).`,
      { label:'check:exec', phase:'Check',
        schema:{ type:'object', required:['passed','output'],
                 properties:{ passed:{type:'boolean'}, output:{type:'string'} } } })
    ranTests++
  }
  const votes = await parallel(LENSES.map(lens => () =>
    agent(`Verify build vs ${args.designPath} via the ${lens} lens. ` +
          `Executed-check result: ${testGate.passed ? 'PASS' : 'FAIL\n'+testGate.output}. ` +
          `Compute matchRate (0-100) + gaps. If executed checks FAIL, matchRate < 100.`,
      { label:`check:${lens}`, phase:'Check', schema: GAP })))
  gap = mergeGaps(votes)
  if (gap.votesMissing) { log(`iter ${iter}: no verifier votes — aborting Check`); break }
  // verifiable work: 100 requires BOTH executed checks green AND lenses 100
  const reached100 = gap.matchRate >= 100 && (!args.verifyCmd || testGate.passed)
  log(`iter ${iter}: matchRate=${gap.matchRate}, testsPass=${testGate.passed}, gaps=${gap.gaps.length}`)
  if (reached100) { gap.matchRate = 100; break }
  await parallel(gap.gaps.map(g => () =>                                   // Act: fix concurrently
    agent(`Fix gap [${g.severity}]: expected "${g.expected}", actual "${g.actual}" (${g.item})`,
      { label:`act:${g.item}`, phase:'Act', agentType: args.agentMap?.fix })))
  iter++
}
return { ...gap, iterations: Math.min(iter + 1, 5), testsRun: ranTests }  // matchRate<100 → caller records residual, does NOT pause
```

## Phase 6 — Report (optional Workflow; main may do inline)

```js
export const meta = { name:'pdca-report', description:'Synthesize phase history', phases:[{title:'Report'}] }
const REPORT = { /* Report schema — main inlines the real object from schemas.md */ }
return await agent(
  `Synthesize a completion report for ${args.feature}. Inputs: ${JSON.stringify(args.summary)}. ` +
  `Include matchRate, residualGaps, carryItems.`,
  { phase:'Report', schema: REPORT })
```

## Notes

- **Quality gate has no branch**: Check returns even at matchRate<100; the MAIN session writes residuals to the report and continues. Never `throw`/pause for low score.
- **Safety gate is STRUCTURAL, not advisory**: agents dispatched from scripts must be **least-privilege** — scaffold/borrow them WITHOUT git-push/deploy/vault tools, so a script-spawned agent physically cannot fire an irreversible action. The launch happens only in main after approval.
- **Resume / determinism**: resume stability rests on the harness **replaying cached agent results** (same script + same args). The LLM agents themselves are non-deterministic — if a phase's agents re-execute uncached, the loop count / matchRate / lifecycle branch can differ, so treat that as a fresh run and re-derive. `mergeGaps` is deterministic given inputs, but that alone does NOT make the cycle deterministic; the cached-replay does.
- **Topo + grouping is main's job**: main sorts WorkList by `dependsOn` and builds `fileGroups` (one group per file, dependency-ordered) BEFORE dispatching Do. Scripts never re-sort.
