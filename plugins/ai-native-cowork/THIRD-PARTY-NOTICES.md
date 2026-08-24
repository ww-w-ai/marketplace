# Third-Party Notices

This project (ai-native-cowork) includes material adapted from third-party
open-source projects. Their licenses and attributions are listed below.

---

## bkit (bkit-claude-code)

- **Source**: https://github.com/popup-studio-ai/bkit-claude-code
- **Author**: POPUP STUDIO PTE. LTD.
- **License**: Apache License 2.0 (permissive)

### What was adapted

The cowork-sprint **dev profile** vendors and adapts material from bkit. In all
cases the *method/approach/expertise* was adapted — bkit-plugin infrastructure
references (PDCA state, `.bkit/` store, `bkit.config.json`, `lib/`, M1-M10 SSoT,
CI invariants) were removed so the result runs standalone with **no bkit install
required**. Where verbatim agent prose was carried over, it was modified to fit
cowork's structure and philosophy.

**Vendored agents** (in `agents/`, each carries an in-file attribution header):
- `gap-detector.md` — adapted from bkit `gap-detector`
- `code-analyzer.md` — adapted from bkit `code-analyzer`
- `design-validator.md` — adapted from bkit `design-validator`
- `security-architect.md` — adapted from bkit `security-architect`
- `qa-test-planner.md` — adapted from bkit `qa-test-planner`
- `qa-test-generator.md` — adapted from bkit `qa-test-generator`
- `qa-debug-analyst.md` — adapted from bkit `qa-debug-analyst`; the docker-log /
  `zero-script-qa` skill assumption was removed and the log/trace mechanism
  generalized to be runtime-agnostic (uses whatever log surfaces the stack exposes).
- `frontend-architect.md` — adapted from bkit `frontend-architect`
- `infra-architect.md` — adapted from bkit `infra-architect`
- `enterprise-expert.md` — adapted from bkit `enterprise-expert`
- `bkend-expert.md` — adapted from bkit `bkend-expert` (targets the bkend.ai BaaS
  service; optional, project-dependent)

**Adapted methods/ideas** (in `skills/cowork-sprint/references/`, `templates/`):
- gap-analysis classification (`done/partial/missing/divergent` → matchRate) and the
  two-axis QA gate — adapted from bkit's gap-detector approach
  (`references/gap-analysis.md`).
- dev profile mechanisms — Context Anchor, sprint-master-planner topo-sort +
  bin-packing scheduler, sprint-orchestrator auto-pause + measure-then-advance,
  pdca-iterator plateau/anti-gaming, qa-lead L1-L5 taxonomy, M2/M4 design/test
  discipline (`references/dev-profile.md`).

Facts and methods are not copyrightable; no bkit source is reproduced verbatim
beyond what is noted above as adapted agent prose. Apache-2.0 requires preservation
of copyright and license notices — this file and the per-file headers satisfy that.

### Apache License 2.0 — notice

```
Copyright POPUP STUDIO PTE. LTD.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

The full Apache-2.0 license text is available at the URL above.

### Additional adaptation — measurable verification gates

`skills/cowork-sprint/scripts/gates/gate-lib.mjs` is a **derivative work** of bkit's
`lib/application/quality-gates/measure-router.js` (Apache-2.0). The gate-routing
contract, the balanced-JSON extraction (`extractBalancedJson`), and the
agent-output→numeric-value parse (`parseAgentOutput`) are adapted from it.

Modifications from the original (Apache-2.0 §4 "stating changes"):
- Deterministic gates (build/test/migration grep) execute directly in Node
  rather than always routing to an agent.
- Threshold resolution: project override > catalog default > fallback.
- Gate catalog remapped from bkit's M1-M10/S1 to cowork lenses
  (G-BUILD/G-CONTRACT/G-MATCH/G-CRIT/G-MIGRATE/G-INTENT/G-DOCSYNC).
- Added an audit formatter and a standalone CLI (`cli.mjs`).
- The bkit sprint FSM, phase enforcement, and Stop-hook are NOT included.

### Additional adaptation — cowork-sprint durable state

`skills/cowork-sprint/scripts/state/state.py` adapts the atomic temporary-file
plus rename persistence pattern and the declarative state-transition approach
from bkit commit `eec224f3911ad1484295b7837ca88fd013eb540d`
(`v2.1.38-2-geec224f`), specifically
`lib/infra/sprint/sprint-state-store.adapter.js` and
`lib/pdca/state-transitions.js` (Apache-2.0).

The cowork implementation is a new, smaller Python state machine. It replaces
bkit's PDCA states, events, guards, actions, indexes, and `.bkit/` storage with
the dual-host cowork schema, optimistic revisions, explicit sprint commands,
semantic validation, and one atomic `status.json` file. No bkit parsing,
validation, compatibility, or transition table was copied verbatim.
