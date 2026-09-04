# Competitor Analysis: burn-baby-burn

**Repo**: https://github.com/dtnewman/burn-baby-burn  
**Analyzed**: 2026-05-19  
**Language**: Bash (single script, ~350 LOC)

---

## What It Is

burn-baby-burn is a **satirical token-burning tool** — the exact opposite of claude-code-token-saver. It deliberately wastes tokens to inflate vanity metrics (leaderboard padding, OKR padding, impressing management with "AI usage"). There is no token optimization logic whatsoever.

---

## Architecture

- Single bash script (`bin/burn`) + pricing helper (`bin/codex_rates.sh`)
- CLI wrapper around `claude -p` or `codex exec`
- Loop: sends filler-padded prompt repeatedly until token target is reached
- Filler technique: repeats `"~1000 token" string` (~4 chars/token heuristic) as input padding
- JSON output parsed with `jq` to count actual tokens consumed per call
- System overhead constants hardcoded empirically (`CLAUDE_SYSTEM_OVERHEAD_TOKENS=9000`, `CODEX_SYSTEM_OVERHEAD_TOKENS=12000`)

---

## Token Mechanics (Inverted Lessons)

| burn-baby-burn technique | claude-code-token-saver inverse |
|---|---|
| Pads input with ~4 chars/token filler to hit a token count | Use 4 chars/token heuristic to **estimate** token budget before API call |
| Hardcodes system overhead (9k for claude, 12k for codex) | Empirically measured system overhead is a real constant worth tracking in our token estimator |
| Uses `--no-session-persistence` + `--tools ""` to keep overhead minimal per call | Same flags reduce noise when doing token audits |
| Parses `cache_creation_input_tokens` + `cache_read_input_tokens` + `input_tokens` + `output_tokens` separately | Our usage parser should track all four fields — cache hits are separate from raw input |
| Codex cost: non-cached and cached tokens billed at different rates | Cache hit rate tracking matters for ROI reporting in claude-code-token-saver |

---

## Adoptable Techniques for claude-code-token-saver

1. **4 chars/token heuristic** — already industry standard, but burn-baby-burn uses it directly in token budget estimation. Worth exposing as a util in our SDK.
2. **Separate cache field parsing** — their `parse_usage` jq query handles all four usage fields correctly. Our usage tracking should mirror this exactly.
3. **Empirical overhead constants** — they measured CLI overhead at 9k (claude) and 12k (codex). Useful reference for our "pre-call budget check" feature.
4. **Hard cap with user warning** — 1M token hard stop + explicit "this is not real" message is a good UX pattern for guardrails in our limit-warning feature.

---

## What to Ignore

- No prompt compression, context pruning, or optimization of any kind
- No middleware, proxy, or SDK integration
- Entirely satirical — no production use case

---

## Verdict

Not a competitor. Inverted goal. But the token accounting mechanics (usage field parsing, overhead constants, cache rate separation) are written correctly and serve as a useful sanity-check reference for our own token counter implementation.
