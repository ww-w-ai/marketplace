# Releasing a plugin

A release is done only when `scripts/release.py check <plugin> <source-repo> --local` prints `RELEASED`.
Do not report a release as done before that, and paste its output in the report.

## Where users get the files
| Channel | Reads | Updated by |
|---|---|---|
| Claude Code | `.claude-plugin/marketplace.json`, then the plugin's source repository | steps 3 and 6 |
| Codex | the copy under `plugins/<plugin>/` in this repository | step 6 |
| GitHub visitors | tags and Releases of the source repository | steps 4 and 5 |

Claude Code can already show the new version while Codex, the tag and the Release are still old. Bumping
`marketplace.json` alone is not a release.

## Steps (`<src>` = the plugin's source repository, `X.Y.Z` = the new version)
1. **Base.** `git -C <src> fetch origin --tags`; start from the current `origin/main`. Check for a release already in progress: compare the versions in `origin/main`, the tags and the Releases (`release.py check`).
2. **Tests** pass in `<src>`. For super-video-agent: `npm --prefix <src>/skills/super-video-agent test`.
3. **Version bump** in every version file, committed as `Release X.Y.Z`. super-video-agent: `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `skills/super-video-agent/package.json`, `skills/super-video-agent/package-lock.json` (2 places). Stage by path; leave other sessions' uncommitted files alone. If the READMEs or docs changed what users see, commit them before this step.
4. **Annotated tag** on that commit, pushed with main: `git -C <src> tag -a vX.Y.Z -m "X.Y.Z — <summary>" <commit>`, then `git -C <src> push origin main vX.Y.Z`. Never a lightweight tag.
5. **GitHub Release**, marked latest, with notes written for users (sections by area, one bullet per change, from the commits and `docs/evolution/ledger.md`): `gh release create vX.Y.Z -R <owner/repo> --verify-tag --latest -t "X.Y.Z — <summary>" -F <notes.md>`.
6. **Marketplace.** In this repository: `git pull --ff-only`, then `python3 scripts/release.py sync <plugin> <src> --version X.Y.Z` (copies the tag's files, force-adds ignored ones, bumps `marketplace.json`, stages). Review `git diff --cached --stat`, commit `Publish <plugin> X.Y.Z for Claude Code and Codex`, push.
7. **Local installs.**
   - Claude Code: `claude plugin marketplace update ww-w-ai`, then `claude plugin update <plugin>@ww-w-ai --scope user` and `--scope project`. A restart applies it.
   - Codex: `codex plugin marketplace upgrade ww-w-ai`, then `codex plugin add <plugin>@ww-w-ai`.
8. **Check:** `python3 scripts/release.py check <plugin> <src> --local` prints `RELEASED`.

## Misses found in past releases (audit of super-video-agent 1.8.0–1.23.0, 2026-11-27)
| Miss | Versions | Now caught by |
|---|---|---|
| No GitHub Release | 1.8.0, 1.9.0, 1.11.0–1.18.1, 1.21.0–1.21.2 (added later), 1.23.0 | check: latest Release |
| No tag | 1.2.0, 1.9.0, 1.12.0 (added later), 1.23.0 | check: tag pushed |
| Lightweight tag | 1.18.0, 1.18.1, 1.20.1, 1.20.2 | check: tag annotated |
| `marketplace.json` bumped, Codex copy left at the old version | 1.23.0 | check: Codex copy matches |
| Test audio dropped from the Codex copy by `*.wav` in its `.gitignore` | 1.11.0–1.22.0 | sync force-adds; check: Codex copy matches |
| Never published to the marketplace | 1.9.0 (folded into 1.10.0) | check: marketplace version |
| Local Codex install left old | 1.23.0 | check `--local` |
