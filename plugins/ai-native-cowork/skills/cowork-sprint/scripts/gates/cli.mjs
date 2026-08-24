#!/usr/bin/env node
// cowork-gates CLI — run/inspect measurable verification gates.
// See gate-lib.mjs header for provenance (adapted from bkit, Apache-2.0).
//
// Usage:
//   node cli.mjs list                                  # catalog table
//   node cli.mjs run   <GATE> [--cwd <repo>]           # deterministic gate: exec + evaluate (exit 0=pass,1=fail)
//   node cli.mjs prompt <GATE> [--target X] [--repo R] # agent gate: print the structured-output prompt to dispatch
//   node cli.mjs eval  <GATE> (--value <n> | --output-file <f>) [--cwd <repo>]  # parse+threshold an agent result
//
// Agent gates flow: `prompt` → leader dispatches the Agent → feed its output to `eval --output-file`.

import { readFileSync } from "node:fs";
import {
  loadConfig, listGates, runDeterministicGate, buildGatePrompt,
  parseAgentOutput, evaluateGate, formatAudit,
} from "./gate-lib.mjs";

const [, , action, gate, ...rest] = process.argv;
const flag = (name, def = null) => {
  const i = rest.indexOf(`--${name}`);
  return i !== -1 && rest[i + 1] ? rest[i + 1] : def;
};

function die(msg, code = 2) { console.error(msg); process.exit(code); }

if (action === "list" || !action) {
  const rows = listGates();
  console.log("GATE        MODE           METRIC (threshold)                WHEN");
  for (const r of rows) {
    console.log(
      `${r.gate.padEnd(11)} ${String(r.mode).padEnd(14)} ${(`${r.metric} ${r.cmp} ${r.threshold}`).padEnd(33)} ${r.when || ""}`,
    );
  }
  process.exit(0);
}

if (!gate) die("gate key required (e.g. G-BUILD). Run `node cli.mjs list`.");
const cwd = flag("cwd", process.cwd());
const config = loadConfig(cwd);
const g = config.gates[gate];
if (!g) die(`unknown gate: ${gate}. Run \`node cli.mjs list\`.`);

if (action === "run") {
  if (g.mode !== "deterministic") die(`${gate} is mode='${g.mode}'. Use \`prompt\`+\`eval\` for agent gates, or run the skill for skill gates.`);
  const res = runDeterministicGate(gate, { cwd }, config);
  for (const s of res.steps) console.log(`  · ${s.label}: ${s.ok ? "ok" : "FAIL"}${s.out !== undefined ? ` (${s.out})` : ""}${s.err ? `\n    ${s.err.split("\n").slice(-3).join("\n    ")}` : ""}`);
  console.log(formatAudit(res));
  process.exit(res.pass ? 0 : 1);
}

if (action === "prompt") {
  console.log(buildGatePrompt(gate, { target: flag("target", "the current change"), repo: flag("repo", "") }, config));
  process.exit(0);
}

if (action === "eval") {
  let value;
  const vFlag = flag("value");
  const outFile = flag("output-file");
  if (vFlag !== null) {
    value = Number(vFlag);
    if (!Number.isFinite(value)) die(`--value must be numeric`);
  } else if (outFile) {
    const parsed = parseAgentOutput(readFileSync(outFile, "utf8"));
    if (!parsed.ok) die(`could not parse agent output: ${parsed.reason} ${parsed.error || ""}`, 2);
    value = parsed.value;
    if (parsed.details) console.log(`  details: ${parsed.details}`);
  } else {
    die(`eval needs --value <n> or --output-file <f>`);
  }
  const res = evaluateGate(gate, value, config);
  console.log(formatAudit(res));
  process.exit(res.pass ? 0 : 1);
}

die(`unknown action: ${action}. One of: list | run | prompt | eval.`);
