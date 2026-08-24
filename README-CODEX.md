# ai-native-cowork for Codex

[English](./README-CODEX.md) · [한국어](./README-CODEX.ko.md) · [日本語](./README-CODEX.ja.md) · [简体中文](./README-CODEX.zh-CN.md)

> Turn Codex from a fast coding assistant into a durable delivery partner.

Codex can implement a feature in minutes. The hard part starts after that: keeping the plan intact, proving the result, preserving why decisions were made, and handing the work to the next session without losing context.

**ai-native-cowork adds that missing operating system.** It gives Codex six shared skills for sprint delivery, single-feature PDCA, session recovery, AI-aware commits, and documentation maintenance. The same product also runs in Claude Code, with one method and host-native execution on both platforms.

## What you get

| Skill | Use it when you need to… |
|---|---|
| `cowork-sprint` | Plan and execute a multi-feature roadmap with sequential, concurrent, or mixed sprint clusters. |
| `pdca-wf` | Build one feature through Research, Plan, Design, Do, Check/Act, and Report. |
| `cowork-insights` | Turn prior Codex or Claude Code sessions into a useful work report. |
| `cowork-commit` | Commit the code with a filtered, durable record of the AI collaboration behind it. |
| `cowork-doc-init` | Bootstrap an existing project into the numbered documentation taxonomy. |
| `cowork-doc-sync` | Align living documentation with the code and decisions that actually shipped. |

## Why it fits Codex

- One shared lifecycle. Claude Code and Codex follow the same gates, artifacts, and Done rules.
- Native execution. Codex uses collaboration workers, plans, tools, and approval boundaries instead of imitating another host.
- Durable sprint state. Resume facts are schema-validated and written through guarded state transitions.
- Safe parallel delivery. Dependency and ownership checks decide which sprints may run concurrently.
- Clean session history. Codex Goal-control envelopes remain available in raw audit data but are excluded from user directives, insights, and commit logs.
- No duplicate skill tree. Both hosts load the same six canonical skills from one repository.

## Install from the ww-w-ai Marketplace

Add the Git Marketplace, then install the plugin:

```bash
codex plugin marketplace add ww-w-ai/marketplace
codex plugin add ai-native-cowork@ww-w-ai
```

Start a new Codex thread after installation. New threads load the installed skills and plugin metadata.

## Update

Refresh the Marketplace snapshot and reinstall the plugin:

```bash
codex plugin marketplace upgrade ww-w-ai
codex plugin add ai-native-cowork@ww-w-ai
```

Start a new thread after the update.

## Verify

```bash
codex plugin list
```

Look for `ai-native-cowork@ww-w-ai` with status `installed, enabled`.

## Try it

Ask Codex naturally. The skills trigger from intent, so slash commands are optional.

```text
Plan and execute this roadmap with cowork-sprint.
Build this feature through PDCA.
Summarize my Codex work from the last seven days.
Commit this with an AI collaboration recap.
Sync the docs now that the implementation is complete.
```

## How the dual-host product works

```text
One repository
├── shared method and schemas
├── six canonical skills
├── Claude Code runtime mappings
├── Codex runtime mappings
├── Claude transcript adapter
└── Codex transcript adapter
```

The shared method owns requirements, review gates, risk rules, artifacts, and completion. Runtime references map those contracts to each host's available tools. Compatibility logic is tested as behavior, not inferred from similar prose.

## Codex-specific behavior

### Goals and continuation

Ordinary feature work does not create a Codex Goal implicitly. When work already belongs to a Goal, continuation uses its thread ID and restores that exact session rather than guessing from the latest transcript.

### Parallel work

`cowork-sprint` computes deterministic clusters from dependencies and owned paths. Only the first unfinished cluster may run. Concurrent members must have disjoint ownership, and integration order stays stable across resumes.

### Approval boundaries

External or irreversible actions still require explicit approval. Installing a plugin, pushing a branch, publishing a release, migrating data, or changing an external system is never implied by a planning request.

### Session privacy

The reporting engine reads local transcript files. It normalizes only the messages needed for the requested report or commit record. `cowork-commit` applies a strict relevance and secret filter before anything enters git.

## Requirements

- Codex with plugin support
- Git
- Bun for the TypeScript session-reporting engine
- Python 3 for deterministic state, scheduler, and parity checks

## Develop locally

The public Marketplace is the normal installation path. For plugin development, use a local Codex Marketplace whose entry points to a local `plugins/ai-native-cowork` checkout, then reinstall with `codex plugin add` after changing the manifest cachebuster or version.

Canonical source: [ww-w-ai/ai-native-cowork](https://github.com/ww-w-ai/ai-native-cowork)

## Claude Code

Using Claude Code instead? See [README.md](./README.md) for the Claude Marketplace workflow and the full product architecture.

## License

MIT
