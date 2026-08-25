import { afterEach, expect, test } from 'bun:test'
import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { extractLastUserMessagesFromFile, parseSessionViews, scanSessionFiles } from './session-scanner.js'

let root = ''
const oldCodex = process.env.CODEX_HOME
const oldClaude = process.env.CLAUDE_CONFIG_DIR

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true })
  if (oldCodex === undefined) delete process.env.CODEX_HOME; else process.env.CODEX_HOME = oldCodex
  if (oldClaude === undefined) delete process.env.CLAUDE_CONFIG_DIR; else process.env.CLAUDE_CONFIG_DIR = oldClaude
})

async function session(day: string, id: string, cwd: string, payloadExtra?: Record<string, unknown>) {
  const dir = join(root, 'codex', 'sessions', '2026', '08', day)
  await mkdir(dir, { recursive: true })
  const rows = [
    { type: 'session_meta', timestamp: '2026-08-25T00:00:00Z', payload: { session_id: id, cwd, ...payloadExtra } },
    { type: 'response_item', timestamp: '2026-08-25T00:00:01Z', payload: { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'hello' }] } },
  ]
  await writeFile(join(dir, `rollout-${id}.jsonl`), rows.map(JSON.stringify).join('\n'))
}

test('Codex discovery scopes by cwd and survives malformed tree entries', async () => {
  root = await mkdtemp(join(tmpdir(), 'cowork-scan-'))
  const project = join(root, 'project')
  await mkdir(join(root, 'claude', 'projects'), { recursive: true })
  await mkdir(join(root, 'codex', 'sessions'), { recursive: true })
  await writeFile(join(root, 'codex', 'sessions', 'stray-file'), 'not a directory')
  await session('24', '11111111-1111-1111-1111-111111111111', project)
  await session('25', '22222222-2222-2222-2222-222222222222', join(project, 'child'))
  await session('26', '33333333-3333-3333-3333-333333333333', join(root, 'other'))
  process.env.CODEX_HOME = join(root, 'codex')
  process.env.CLAUDE_CONFIG_DIR = join(root, 'claude')
  const files = await scanSessionFiles({ scope: 'with-subfolder', basePath: project })
  expect(files.map(file => file.sessionId).sort()).toEqual([
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
  ])
})

test('Codex subagent rollouts are excluded by default and included with includeSubagents', async () => {
  root = await mkdtemp(join(tmpdir(), 'cowork-scan-subagent-'))
  const project = join(root, 'project')
  await mkdir(join(root, 'claude', 'projects'), { recursive: true })
  await mkdir(join(root, 'codex', 'sessions'), { recursive: true })
  await session('24', '11111111-1111-1111-1111-111111111111', project, { thread_source: 'user' })
  await session('25', '22222222-2222-2222-2222-222222222222', project, {
    thread_source: 'subagent',
    source: { subagent: { thread_spawn: { parent_thread_id: '11111111-1111-1111-1111-111111111111', agent_role: 'explorer', agent_nickname: 'Feynman' } } },
  })
  process.env.CODEX_HOME = join(root, 'codex')
  process.env.CLAUDE_CONFIG_DIR = join(root, 'claude')

  const defaultFiles = await scanSessionFiles({ scope: 'with-subfolder', basePath: project })
  expect(defaultFiles.map(file => file.sessionId)).toEqual([
    '11111111-1111-1111-1111-111111111111',
  ])

  const withSubagents = await scanSessionFiles({ scope: 'with-subfolder', basePath: project, includeSubagents: true })
  expect(withSubagents.map(file => file.sessionId).sort()).toEqual([
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
  ])
})

test('raw view preserves a Goal envelope while dialogue view filters it', async () => {
  root = await mkdtemp(join(tmpdir(), 'cowork-views-'))
  const path = join(root, 'session.jsonl')
  const goal = '<codex_internal_context source="goal">control</codex_internal_context>'
  const rows = [
    { type: 'response_item', timestamp: 't1', payload: { type: 'message', role: 'user', content: [{ type: 'input_text', text: goal }] } },
    { type: 'response_item', timestamp: 't2', payload: { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'real request' }] } },
  ]
  await writeFile(path, rows.map(JSON.stringify).join('\n'))
  const views = await parseSessionViews(path)
  expect((views.raw[0] as any).payload.content[0].text).toBe(goal)
  expect(JSON.stringify(views.messages)).not.toContain(goal)
  expect(JSON.stringify(views.messages)).toContain('real request')
})

test('last-five view excludes Goal control and stays chronological', async () => {
  root = await mkdtemp(join(tmpdir(), 'cowork-last-five-'))
  const path = join(root, 'session.jsonl')
  const goal = '<codex_internal_context source="goal">control</codex_internal_context>'
  const texts = ['one', goal, 'two', 'three', 'four', 'five', 'six']
  const rows = texts.map((text, index) => ({
    type: 'response_item', timestamp: `t${index}`, payload: { type: 'message', role: 'user', content: [{ type: 'input_text', text }] },
  }))
  await writeFile(path, rows.map(JSON.stringify).join('\n'))
  expect((await extractLastUserMessagesFromFile(path)).map(item => item.text)).toEqual(['two', 'three', 'four', 'five', 'six'])
})
