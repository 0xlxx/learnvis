#!/usr/bin/env node
// postinstall.mjs — link project skills/agents to all supported AI platforms
// Handles: fresh install, reinstall, update (new/removed skills)
import { symlinkSync, existsSync, readdirSync, statSync, realpathSync, mkdirSync, rmSync } from 'fs';
import { join, resolve, basename } from 'path';
import { homedir } from 'os';

const HOME = homedir();

// Platforms: each has a skills/ and (optionally) agents/ directory under HOME
const PLATFORMS = [
  { name: 'Claude Code', skills: '.claude/skills',  agents: '.claude/agents' },
  { name: 'Codex',       skills: '.codex/skills',   agents: null },
  { name: 'Pi',          skills: '.pi/agent/skills', agents: '.pi/agent/agents' },
  { name: 'OpenCode',    skills: '.opencode/skills', agents: null },
  { name: 'Generic',     skills: '.agents/skills',   agents: '.agents/agents' },
];

// Source directories in the project (relative to project root)
const SOURCES = [
  { rel: '.pi/skills',     type: 'dir' },
  { rel: '.pi/agents',     type: 'file' },
  { rel: '.agents/skills', type: 'dir' },
  { rel: '.agents/agents', type: 'file' },
];

const cwd = process.cwd();
let created = 0, replaced = 0, skipped = 0;

function ensureParent(path) {
  mkdirSync(resolve(path, '..'), { recursive: true });
}

// ── Link a single source → destination ──

function linkOne(src, dst) {
  if (!existsSync(src)) return 'nosrc';
  if (existsSync(dst)) {
    try {
      if (realpathSync(dst) === realpathSync(src)) return 'skip';
    } catch {}
    // Stale — remove and recreate
    try { rmSync(dst, { recursive: true, force: true }); } catch { return 'fail'; }
    ensureParent(dst);
    try { symlinkSync(src, dst); } catch { return 'fail'; }
    return 'replace';
  }
  ensureParent(dst);
  try { symlinkSync(src, dst); } catch { return 'fail'; }
  return 'create';
}

// ── Link ──

for (const srcDef of SOURCES) {
  const srcDir = resolve(cwd, srcDef.rel);
  if (!existsSync(srcDir)) continue;

  for (const entry of readdirSync(srcDir)) {
    if (entry.startsWith('.')) continue;
    const src = join(srcDir, entry);

    // Skills: only symlink directories containing SKILL.md
    if (srcDef.type === 'dir') {
      if (!statSync(src).isDirectory()) continue;
      if (!existsSync(join(src, 'SKILL.md'))) continue;

      for (const plat of PLATFORMS) {
        if (!plat.skills) continue;
        const dst = join(HOME, plat.skills, entry);
        const result = linkOne(src, dst);
        if (result === 'create')  { created++; console.log(`  + ${plat.name.padEnd(12)} ${entry} → ~/${plat.skills}/${entry}`); }
        if (result === 'replace') { replaced++; console.log(`  ~ ${plat.name.padEnd(12)} ${entry} → ~/${plat.skills}/${entry}`); }
        if (result === 'skip')    { skipped++; }
        if (result === 'fail')    { console.log(`  ✗ ${plat.name.padEnd(12)} ${entry} (failed)`); }
      }
    }

    // Agents: symlink .md files directly
    if (srcDef.type === 'file') {
      if (!entry.endsWith('.md')) continue;
      if (!statSync(src).isFile()) continue;

      for (const plat of PLATFORMS) {
        if (!plat.agents) continue;
        const dst = join(HOME, plat.agents, entry);
        const result = linkOne(src, dst);
        if (result === 'create')  { created++; console.log(`  + ${plat.name.padEnd(12)} ${entry} → ~/${plat.agents}/${entry}`); }
        if (result === 'replace') { replaced++; console.log(`  ~ ${plat.name.padEnd(12)} ${entry} → ~/${plat.agents}/${entry}`); }
        if (result === 'skip')    { skipped++; }
        if (result === 'fail')    { console.log(`  ✗ ${plat.name.padEnd(12)} ${entry} (failed)`); }
      }
    }
  }
}

// ── Summary ──

const parts = [];
if (created) parts.push(`${created} created`);
if (replaced) parts.push(`${replaced} replaced`);
if (skipped) parts.push(`${skipped} skipped`);
if (parts.length) {
  console.log(`\n✅ ${parts.join(', ')}`);
} else {
  console.log('  (up to date)');
}
