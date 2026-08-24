// cowork-gates/gate-lib.mjs — measurable verification gates for the cowork leader.
//
// PROVENANCE / LICENSE (MUST keep): the gate-routing contract, the balanced-JSON
// extraction (`extractBalancedJson`) and the agent-output→numeric-value parse
// (`parseAgentOutput`) are ADAPTED from bkit
// (popup-studio-ai/bkit-claude-code, Apache-2.0)
// lib/application/quality-gates/measure-router.js. Modified: deterministic gates
// run directly here (no agent), project threshold override, audit formatter.
// Apache-2.0 §4 notice retained in the plugin's THIRD-PARTY-NOTICES.md. Derivative work.
//
// DESIGN: pure/deterministic parts run standalone (Node). Agent gates cannot spawn
// Claude agents from Node — the cowork leader (model) injects the agent result:
// buildGatePrompt() -> leader dispatches Agent -> parseAgentOutput() -> evaluateGate().

import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = join(__dir, "gates.config.json");

/** Load the catalog, merged with an optional per-repo override (<repo>/.cowork-gates.json). */
export function loadConfig(repoDir = null) {
  const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf8"));
  if (repoDir) {
    const ovPath = join(repoDir, ".cowork-gates.json");
    if (existsSync(ovPath)) {
      const ov = JSON.parse(readFileSync(ovPath, "utf8"));
      for (const [k, v] of Object.entries(ov.gates || {})) {
        catalog.gates[k] = { ...(catalog.gates[k] || {}), ...v }; // shallow per-gate override
      }
    }
  }
  return catalog;
}

// ── ported from bkit measure-router.js (Apache-2.0) — string-aware balanced JSON ──
export function extractBalancedJson(text) {
  if (typeof text !== "string") return null;
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0, inString = false, escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escape) { escape = false; continue; }
    if (c === "\\" && inString) { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) return text.slice(start, i + 1); }
  }
  return null;
}

/** Parse an agent's output into { ok, value, details } (adapted from bkit parseAgentOutput). */
export function parseAgentOutput(output) {
  if (typeof output !== "string") return { ok: false, reason: "no_output" };
  const block = extractBalancedJson(output);
  if (!block) return { ok: false, reason: "no_json", error: "no balanced JSON object in agent output" };
  let parsed;
  try { parsed = JSON.parse(block); } catch (e) {
    return { ok: false, reason: "json_invalid", error: "JSON parse fail: " + e.message };
  }
  if (typeof parsed.value !== "number" || !Number.isFinite(parsed.value)) {
    return { ok: false, reason: "invalid_value", error: "agent did not return a finite numeric 'value'" };
  }
  return { ok: true, value: parsed.value, details: typeof parsed.details === "string" ? parsed.details : null };
}

/** Build the structured-output prompt a leader feeds to the routed Agent (agent gates only). */
export function buildGatePrompt(gateKey, { target = "the current change", repo = "" } = {}, config = loadConfig()) {
  const g = config.gates[gateKey];
  if (!g) throw new Error(`unknown gate: ${gateKey}`);
  if (g.mode !== "agent") throw new Error(`gate ${gateKey} is mode='${g.mode}', not an agent gate`);
  const shape = g.valueShape === "percent"
    ? "<number 0-100, percentage>"
    : "<integer count, lower is better>";
  return [
    `Measure cowork verification gate ${gateKey} (${g.metric}) for ${target}${repo ? ` in ${repo}` : ""}.`,
    ``,
    `What to measure: ${g.sourceArtifact}`,
    `Threshold (for your awareness): ${g.metric} ${g.higherIsBetter ? "≥" : "≤"} ${g.threshold}. Report the TRUE measured value regardless.`,
    ``,
    `Return ONLY a single JSON object, no prose/markdown/fences:`,
    `  { "value": ${shape}, "details": "<1-2 sentence rationale>", "evidence": ["<file:line or fact>", "..."] }`,
  ].join("\n");
}

/** Compare a measured value to the gate threshold. */
export function evaluateGate(gateKey, value, config = loadConfig()) {
  const g = config.gates[gateKey];
  if (!g) throw new Error(`unknown gate: ${gateKey}`);
  const pass = g.higherIsBetter ? value >= g.threshold : value <= g.threshold;
  return { gateKey, metric: g.metric, value, threshold: g.threshold, higherIsBetter: g.higherIsBetter, pass };
}

/**
 * Run a deterministic gate (G-BUILD, G-MIGRATE...) directly and evaluate.
 *
 * SECURITY / trust boundary (intentional execSync shell use): `c.cmd` strings come ONLY from the
 * trusted gate catalog (gates.config.json) or a repo-local `.cowork-gates.json` the developer owns —
 * never from end-user / model / network input. Shell IS required (deterministic gates use pipelines
 * like `grep ... | wc -l`). This matches the documented exception to the execFile guidance: shell
 * features needed + input guaranteed safe. Do NOT interpolate untrusted values into `c.cmd`.
 */
export function runDeterministicGate(gateKey, { cwd = process.cwd() } = {}, config = loadConfig()) {
  const g = config.gates[gateKey];
  if (!g) throw new Error(`unknown gate: ${gateKey}`);
  if (g.mode !== "deterministic") throw new Error(`gate ${gateKey} is mode='${g.mode}', not deterministic`);
  const steps = [];
  let value;
  if (g.commands.every((c) => c.success === "exitZero")) {
    // pass/fail composite → 100 iff every command exits 0
    let allOk = true;
    for (const c of g.commands) {
      let ok = true, err = "";
      try { execSync(c.cmd, { cwd, stdio: "pipe", encoding: "utf8" }); }
      catch (e) { ok = false; err = (e.stdout || "") + (e.stderr || e.message || ""); }
      steps.push({ label: c.label, cmd: c.cmd, ok, err: ok ? "" : err.slice(-400) });
      if (!ok) allOk = false;
    }
    value = allOk ? 100 : 0;
  } else {
    // single command whose stdout is the numeric value (e.g. destructive-keyword count)
    const c = g.commands[0];
    let out = "";
    try { out = execSync(c.cmd, { cwd, stdio: "pipe", encoding: "utf8" }); }
    catch (e) { out = e.stdout || "0"; }
    value = Number(String(out).trim()) || 0;
    steps.push({ label: c.label, cmd: c.cmd, ok: true, out: String(out).trim() });
  }
  return { ...evaluateGate(gateKey, value, config), steps };
}

/** One-line audit string for a report / commit trailer / sprint state. */
export function formatAudit(result) {
  const mark = result.pass ? "PASS" : "FAIL";
  const cmp = result.higherIsBetter ? "≥" : "≤";
  return `[gate ${result.gateKey}] ${mark} — ${result.metric}=${result.value} (threshold ${cmp} ${result.threshold})`;
}

export function listGates(config = loadConfig()) {
  return Object.entries(config.gates).map(([k, g]) => ({
    gate: k, metric: g.metric, mode: g.mode, threshold: g.threshold,
    cmp: g.higherIsBetter ? "≥" : "≤", agent: g.agent || g.skill || "-", when: g.when,
  }));
}
