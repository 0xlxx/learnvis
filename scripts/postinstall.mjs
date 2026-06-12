#!/usr/bin/env node
import { symlinkSync, existsSync, readdirSync, statSync, readlinkSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { homedir } from 'os';

const HOME = homedir();
const TARGETS = [
  { from: '.pi/skills',      to: join(HOME, '.pi/agent/skills'),      isDir: true },
  { from: '.pi/agents',      to: join(HOME, '.pi/agent/agents'),      isDir: false },
  { from: '.agents/skills',  to: join(HOME, '.agents/skills'),        isDir: true },
  { from: '.agents/agents',  to: join(HOME, '.agents/agents'),        isDir: false },
];

const cwd = process.cwd();
let linked = 0;

for (const { from, to, isDir } of TARGETS) {
  const srcDir = resolve(cwd, from);
  if (!existsSync(srcDir)) continue;

  for (const entry of readdirSync(srcDir)) {
    if (entry.startsWith('.')) continue;

    const src = join(srcDir, entry);
    const dst = join(to, entry);

    // Skills: only symlink directories that contain SKILL.md
    if (isDir && statSync(src).isDirectory() && existsSync(join(src, 'SKILL.md'))) {
      if (existsSync(dst)) {
        try { if (readlinkSync(dst) === src) continue; } catch {}
      }
      mkdirSync(to, { recursive: true });
      symlinkSync(src, dst);
      linked++;
      console.log(`  ${from}/${entry} → ${to}/${entry}`);
    }

    // Agents: symlink .md files directly
    if (!isDir && entry.endsWith('.md') && statSync(src).isFile()) {
      if (existsSync(dst)) {
        try { if (readlinkSync(dst) === src) continue; } catch {}
      }
      mkdirSync(to, { recursive: true });
      symlinkSync(src, dst);
      linked++;
      console.log(`  ${from}/${entry} → ${to}/${entry}`);
    }
  }
}

if (linked) console.log(`\n✅ Linked ${linked} skill(s)/agent(s)`);
