#!/usr/bin/env node
// Checks a rea-loop ledger: every claim complete and well-formed; with --closed, none left open;
// with --deliverables, every cited claim exists and was not refuted.
//
//   node check-ledger.mjs ledger.md [--closed] [--deliverables a.md b.md ...]
//
// Exit 0 = pass, 1 = problems found (listed on stdout), 2 = usage or unreadable file.

import { readFileSync } from 'node:fs'

const FIELDS = ['claim', 'kind', 'evidence', 'limit', 'check', 'status']
const KINDS = new Set(['observation', 'inference', 'unknown'])
const STATUSES = new Set(['open', 'confirmed', 'refuted', 'narrowed', 'unknown'])
const EMPTY = /^(|none|n\/a|-|<.*>|none yet)$/i
const CLAIM_HEAD = /^### (C-\d{3,})\s*$/
const CITATION = /\bC-\d{3,}\b/g

function parseArgs(argv) {
  const opts = { ledger: null, closed: false, deliverables: [] }
  let inDeliverables = false
  for (const a of argv) {
    if (a === '--closed') opts.closed = true
    else if (a === '--deliverables') { inDeliverables = true; opts.closed = true }
    else if (inDeliverables) opts.deliverables.push(a)
    else if (!opts.ledger) opts.ledger = a
  }
  return opts
}

function read(path) {
  try {
    return readFileSync(path, 'utf8')
  } catch (err) {
    console.error(`cannot read ${path}: ${err.message}`)
    process.exit(2)
  }
}

/** Claim blocks in file order: { id, line, fields }. */
function parseClaims(text) {
  const claims = []
  let current = null
  text.split('\n').forEach((raw, i) => {
    const head = raw.match(CLAIM_HEAD)
    if (head) {
      current = { id: head[1], line: i + 1, fields: {} }
      claims.push(current)
      return
    }
    if (/^#{1,3} /.test(raw)) current = null
    const field = current && raw.match(/^- (\w+):\s*(.*)$/)
    if (field) current.fields[field[1]] = field[2].trim()
  })
  return claims
}

function claimProblems(c) {
  const out = []
  const where = `${c.id} (line ${c.line})`
  for (const f of FIELDS) if (!(f in c.fields)) out.push(`${where}: missing field "${f}"`)
  const { claim = '', kind = '', evidence = '', limit = '', check = '', status = '' } = c.fields
  if (EMPTY.test(claim)) out.push(`${where}: claim is empty`)
  if (!KINDS.has(kind)) out.push(`${where}: kind "${kind}" is not one of ${[...KINDS].join(', ')}`)
  if (!STATUSES.has(status)) out.push(`${where}: status "${status}" is not one of ${[...STATUSES].join(', ')}`)
  if (kind === 'observation' && EMPTY.test(evidence)) out.push(`${where}: an observation needs evidence`)
  if (EMPTY.test(limit)) out.push(`${where}: limit is empty — state what the evidence does not cover`)
  if (status && status !== 'open' && EMPTY.test(check)) out.push(`${where}: status "${status}" needs a recorded check`)
  return out
}

function ledgerProblems(claims, closed) {
  const out = []
  if (claims.length === 0) out.push('no claims found (expected "### C-001" blocks)')
  const seen = new Set()
  for (const c of claims) {
    if (seen.has(c.id)) out.push(`${c.id} (line ${c.line}): duplicate id`)
    seen.add(c.id)
    out.push(...claimProblems(c))
  }
  if (closed) {
    for (const c of claims) if (c.fields.status === 'open') out.push(`${c.id} (line ${c.line}): still open`)
  }
  return out
}

function deliverableProblems(path, byId) {
  const cited = new Set(read(path).match(CITATION) ?? [])
  if (cited.size === 0) return [`${path}: cites no claim IDs`]
  const out = []
  for (const id of cited) {
    const c = byId.get(id)
    if (!c) out.push(`${path}: cites ${id}, which is not in the ledger`)
    else if (c.fields.status === 'refuted') out.push(`${path}: cites ${id}, which was refuted`)
  }
  return out
}

function summary(claims) {
  const count = {}
  for (const c of claims) count[c.fields.status ?? '?'] = (count[c.fields.status ?? '?'] ?? 0) + 1
  return `${claims.length} claims: ` + Object.entries(count).map(([k, v]) => `${v} ${k}`).join(', ')
}

function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (!opts.ledger) {
    console.error('usage: node check-ledger.mjs ledger.md [--closed] [--deliverables a.md ...]')
    process.exit(2)
  }
  const claims = parseClaims(read(opts.ledger))
  const byId = new Map(claims.map(c => [c.id, c]))
  const problems = [
    ...ledgerProblems(claims, opts.closed),
    ...opts.deliverables.flatMap(d => deliverableProblems(d, byId)),
  ]
  console.log(summary(claims))
  for (const p of problems) console.log(`FAIL ${p}`)
  console.log(problems.length ? `${problems.length} problem(s)` : 'PASS')
  process.exit(problems.length ? 1 : 0)
}

main()
