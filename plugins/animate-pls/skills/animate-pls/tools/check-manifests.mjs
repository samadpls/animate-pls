#!/usr/bin/env node
// The plugin manifests agree with each other and with SKILL.md (run before a release; no network, no deps).
//   usage: node tools/check-manifests.mjs
// One skill folder, several hosts, each reading its own file:
//   .claude-plugin/marketplace.json + plugins/animate-pls/.claude-plugin/plugin.json   Claude Code (and Codex, Copilot, Factory)
//   plugins/animate-pls/plugin.json                                                     Agent Plugins 1.0.0 (Codex, Cursor, Copilot, VS Code, Kiro)
//   .cursor-plugin/marketplace.json                                                     Cursor's marketplace import
// Checks: every name is "animate-pls"; the versions match SKILL.md metadata.version; every marketplace source holds
// the plugin; the Agent Plugins file uses schema 1.0.0 (Codex 0.164 rejects 1.1.0) with only the keys it allows;
// SKILL.md's frontmatter stays inside the Agent Skills set (a host may skip a skill that doesn't).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = path.resolve(SKILL, '../../../..');
const NAME = 'animate-pls', SCHEMA = 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json';
const fails = [], ok = [];
const check = (cond, msg) => (cond ? ok : fails).push(msg);
const json = (rel) => {
  const f = path.join(ROOT, rel);
  if (!fs.existsSync(f)) { fails.push(`missing ${rel}`); return null; }
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { fails.push(`${rel}: ${e.message}`); return null; }
};

// SKILL.md frontmatter (flat keys, plus metadata's indented ones)
const md = fs.readFileSync(path.join(SKILL, 'SKILL.md'), 'utf8');
const fm = (md.match(/^---\n([\s\S]*?)\n---/) || [])[1] || '';
const top = Object.fromEntries(fm.split('\n').filter((l) => /^[a-z-]+:/.test(l)).map((l) => [l.split(':')[0], l.slice(l.indexOf(':') + 1).trim()]));
const version = (fm.match(/^\s+version:\s*(\S+)/m) || [])[1];
check(top.name === NAME && path.basename(SKILL) === NAME, `SKILL.md name "${top.name}" = its folder "${path.basename(SKILL)}" = ${NAME}`);
check(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(top.name || ''), 'SKILL.md name is lowercase words joined by hyphens');
check(top.description && top.description.length <= 1024, `SKILL.md description is 1-1024 characters (${(top.description || '').length})`);
const allowed = ['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools'];
const extra = Object.keys(top).filter((k) => !allowed.includes(k));
check(!extra.length, `SKILL.md frontmatter keys are Agent Skills keys${extra.length ? ' (not: ' + extra.join(', ') + ')' : ''}`);
check(!!version, `SKILL.md metadata.version is set (${version})`);

// the manifests
const claudeMkt = json('.claude-plugin/marketplace.json'), claudePlugin = json('plugins/animate-pls/.claude-plugin/plugin.json');
const agentPlugin = json('plugins/animate-pls/plugin.json'), cursorMkt = json('.cursor-plugin/marketplace.json');
for (const [rel, m] of [['.claude-plugin/marketplace.json', claudeMkt], ['.cursor-plugin/marketplace.json', cursorMkt]]) {
  if (!m) continue;
  check(m.name === NAME, `${rel} name is ${NAME} (Codex builds the install id from it)`);
  const p = (m.plugins || []).find((x) => x.name === NAME);
  check(!!p, `${rel} lists the ${NAME} plugin`);
  const src = p && (typeof p.source === 'string' ? p.source : p.source?.path);
  check(!!src && fs.existsSync(path.join(ROOT, src, 'skills', NAME, 'SKILL.md')), `${rel} source "${src}" holds skills/${NAME}/SKILL.md`);
}
for (const [rel, m] of [['plugins/animate-pls/.claude-plugin/plugin.json', claudePlugin], ['plugins/animate-pls/plugin.json', agentPlugin]]) {
  if (!m) continue;
  check(m.name === NAME, `${rel} name is ${NAME}`);
  check(m.version === version, `${rel} version ${m.version} = SKILL.md ${version}`);
}
if (agentPlugin) {
  check(agentPlugin.$schema === SCHEMA, 'plugin.json uses the Agent Plugins 1.0.0 schema');
  const keys = ['$schema', 'name', 'version', 'description', 'author', 'homepage', 'repository', 'license', 'keywords', 'extensions'];
  const bad = Object.keys(agentPlugin).filter((k) => !keys.includes(k));
  check(!bad.length, `plugin.json has only the schema's keys${bad.length ? ' (not: ' + bad.join(', ') + ')' : ''}`);
}

for (const m of ok) console.log('  ok    ' + m);
for (const m of fails) console.log('  FAIL  ' + m);
console.log(`manifests: ${fails.length ? 'FAIL' : 'PASS'} (${ok.length}/${ok.length + fails.length})`);
process.exit(fails.length ? 1 : 0);
