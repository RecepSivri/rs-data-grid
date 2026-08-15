#!/usr/bin/env node
// Parses the raw test-run logs collected by test-all.sh (one .log file per
// project, whatever that project's own runner printed -- Vitest or Karma)
// and renders them into one consolidated HTML dashboard. Both runners share
// istanbul's own text summary format for the coverage block, and both print
// a recognizable "N passed"/"SUCCESS" line for test counts, so a single pair
// of regexes covers every project without needing per-runner parsing.

const fs = require('fs');
const path = require('path');

const PROJECTS = [
  { key: 'vanilla', label: 'Vanilla JS', color: '#F0DB4F' },
  { key: 'jquery', label: 'jQuery', color: '#0868AC' },
  { key: 'vue', label: 'Vue', color: '#41B883' },
  { key: 'react', label: 'React', color: '#61DAFB' },
  { key: 'angular', label: 'Angular', color: '#DD0031' },
  { key: 'root-config', label: 'Root Config', color: '#8b5cf6' },
];

const reportDir = process.argv[2];
if (!reportDir) {
  console.error('Usage: node generate-test-report.js <report-dir>');
  process.exit(1);
}

// Vitest colors its output whenever it detects a TTY -- which it does when
// test-all.sh is run from an interactive terminal (it did NOT when this was
// first verified via a non-interactive tool call, which is how the ANSI
// codes went unnoticed). Karma's own TOTAL line happens to stay plain,
// which is why Angular parsed fine while every Vitest project came back
// empty. Stripping escape codes before matching makes parsing agnostic to
// however the sub-process was invoked.
function stripAnsi(text) {
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

function parseCoverage(rawLog) {
  const log = stripAnsi(rawLog);
  const metric = name => {
    const re = new RegExp(`${name}\\s*:\\s*([\\d.]+)%\\s*\\(\\s*(\\d+)\\s*\\/\\s*(\\d+)\\s*\\)`);
    const m = log.match(re);
    return m ? { pct: parseFloat(m[1]), covered: parseInt(m[2], 10), total: parseInt(m[3], 10) } : null;
  };
  const statements = metric('Statements');
  const branches = metric('Branches');
  const functions = metric('Functions');
  const lines = metric('Lines');
  if (!statements || !branches || !functions || !lines) return null;
  return { statements, branches, functions, lines };
}

function parseTests(rawLog) {
  const log = stripAnsi(rawLog);
  // Vitest: "Tests  143 passed (143)" or "Tests  3 failed | 140 passed (143)"
  const vitestMatch = log.match(/Tests\s+(?:(\d+)\s+failed\s*\|\s*)?(\d+)\s+passed\s*\((\d+)\)/);
  if (vitestMatch) {
    const failed = vitestMatch[1] ? parseInt(vitestMatch[1], 10) : 0;
    const passed = parseInt(vitestMatch[2], 10);
    const total = parseInt(vitestMatch[3], 10);
    return { passed, failed, total };
  }
  // Karma: "TOTAL: 289 SUCCESS" or "TOTAL: 2 FAILED, 287 SUCCESS"
  const karmaMatch = log.match(/TOTAL:\s*(?:(\d+)\s+FAILED,\s*)?(\d+)\s+SUCCESS/);
  if (karmaMatch) {
    const failed = karmaMatch[1] ? parseInt(karmaMatch[1], 10) : 0;
    const passed = parseInt(karmaMatch[2], 10);
    return { passed, failed, total: passed + failed };
  }
  return null;
}

// istanbul's own coverage-summary.json ({ total: { statements: {pct,covered,
// total}, branches: {...}, functions: {...}, lines: {...} }, ...per-file }),
// written directly to disk by both @vitest/coverage-istanbul and
// karma-coverage. Reading this instead of scraping the printed text summary
// sidesteps two real failure modes hit while building this script: ANSI
// color codes splitting the text apart when run from an interactive shell,
// and Vitest occasionally losing the last buffered stdout chunk (the
// summary is the very last thing printed) when stdout is redirected to a
// plain file. The .log is kept around for humans, not for parsing.
function readCoverageSummaryJson(project) {
  const jsonPath = path.join(reportDir, `${project.key}.coverage-summary.json`);
  if (!fs.existsSync(jsonPath)) return null;
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const total = data.total;
  if (!total) return null;
  const metric = m => ({ pct: total[m].pct, covered: total[m].covered, total: total[m].total });
  return { statements: metric('statements'), branches: metric('branches'), functions: metric('functions'), lines: metric('lines') };
}

function loadProject(project) {
  const logPath = path.join(reportDir, `${project.key}.log`);
  if (!fs.existsSync(logPath)) {
    return { ...project, status: 'missing', tests: null, coverage: null };
  }
  const log = fs.readFileSync(logPath, 'utf8');
  const tests = parseTests(log);
  // Karma (Angular) doesn't get a coverage-summary.json companion file from
  // this script (see readCoverageSummaryJson's comment) -- text parsing is
  // reliable for it in practice, so it's kept as the fallback.
  const coverage = readCoverageSummaryJson(project) ?? parseCoverage(log);
  const status = tests && tests.failed === 0 && coverage ? 'ok' : 'failed';
  return { ...project, status, tests, coverage };
}

const results = PROJECTS.map(loadProject);

function pctClass(pct) {
  if (pct == null) return 'pct-unknown';
  if (pct >= 100) return 'pct-full';
  if (pct >= 90) return 'pct-high';
  if (pct >= 70) return 'pct-mid';
  return 'pct-low';
}

function fmtPct(m) {
  if (!m) return '<span class="pct-unknown">—</span>';
  return `<span class="${pctClass(m.pct)}">${m.pct.toFixed(2)}%</span>`;
}

function statusBadge(status) {
  if (status === 'ok') return '<span class="badge badge-ok">✓ pass</span>';
  if (status === 'failed') return '<span class="badge badge-fail">✕ fail</span>';
  return '<span class="badge badge-missing">? no data</span>';
}

const totalTests = results.reduce((sum, r) => sum + (r.tests ? r.tests.total : 0), 0);
const totalPassed = results.reduce((sum, r) => sum + (r.tests ? r.tests.passed : 0), 0);
const totalFailed = results.reduce((sum, r) => sum + (r.tests ? r.tests.failed : 0), 0);
const allOk = results.every(r => r.status === 'ok');

const rows = results.map(r => `
        <tr>
          <td class="proj-cell"><span class="dot" style="background:${r.color}"></span>${r.label}</td>
          <td>${statusBadge(r.status)}</td>
          <td>${r.tests ? `${r.tests.passed}/${r.tests.total}${r.tests.failed ? ` <span class="pct-low">(${r.tests.failed} failed)</span>` : ''}` : '—'}</td>
          <td>${fmtPct(r.coverage && r.coverage.statements)}</td>
          <td>${fmtPct(r.coverage && r.coverage.branches)}</td>
          <td>${fmtPct(r.coverage && r.coverage.functions)}</td>
          <td>${fmtPct(r.coverage && r.coverage.lines)}</td>
        </tr>`).join('');

const generatedAt = new Date().toLocaleString();

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>rs-data-grid — Test Report</title>
<style>
  :root {
    color-scheme: light dark;
    --bg: #ffffff; --fg: #1a1a1a; --muted: #6b7280; --border: #e5e7eb; --card: #f9fafb;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #0f1117; --fg: #e5e7eb; --muted: #9ca3af; --border: #2a2e37; --card: #171a21; }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 2.5rem 1.5rem; background: var(--bg); color: var(--fg);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  .wrap { max-width: 980px; margin: 0 auto; }
  h1 { font-size: 1.5rem; margin: 0 0 0.25rem; }
  .subtitle { color: var(--muted); font-size: 0.9rem; margin-bottom: 1.75rem; }
  .summary-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.75rem; margin-bottom: 2rem; }
  .card { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 1rem 1.1rem; }
  .card .label { color: var(--muted); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; }
  .card .value { font-size: 1.6rem; font-weight: 600; margin-top: 0.2rem; }
  table { width: 100%; border-collapse: collapse; font-size: 0.9rem; overflow-x: auto; display: block; }
  thead, tbody { display: table; width: 100%; table-layout: fixed; }
  th, td { text-align: left; padding: 0.65rem 0.75rem; border-bottom: 1px solid var(--border); }
  th { color: var(--muted); font-weight: 600; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.03em; }
  .proj-cell { display: flex; align-items: center; gap: 0.5rem; font-weight: 600; }
  .dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
  .badge { display: inline-block; padding: 0.15rem 0.55rem; border-radius: 999px; font-size: 0.78rem; font-weight: 600; }
  .badge-ok { background: rgba(34,197,94,0.15); color: #16a34a; }
  .badge-fail { background: rgba(239,68,68,0.15); color: #dc2626; }
  .badge-missing { background: rgba(156,163,175,0.15); color: #6b7280; }
  .pct-full { color: #16a34a; font-weight: 600; }
  .pct-high { color: #65a30d; font-weight: 600; }
  .pct-mid { color: #d97706; font-weight: 600; }
  .pct-low { color: #dc2626; font-weight: 600; }
  .pct-unknown { color: var(--muted); }
  footer { margin-top: 2rem; color: var(--muted); font-size: 0.8rem; }
  .table-scroll { overflow-x: auto; border: 1px solid var(--border); border-radius: 10px; }
  .table-scroll table { min-width: 640px; }
  .table-scroll th:first-child, .table-scroll td:first-child { padding-left: 1rem; }
</style>
</head>
<body>
  <div class="wrap">
    <h1>rs-data-grid — Consolidated Test Report</h1>
    <div class="subtitle">Generated ${generatedAt} · run <code>./test-all.sh</code> to refresh</div>

    <div class="summary-cards">
      <div class="card"><div class="label">Projects</div><div class="value">${results.length}</div></div>
      <div class="card"><div class="label">Total tests</div><div class="value">${totalTests}</div></div>
      <div class="card"><div class="label">Passed</div><div class="value" style="color:#16a34a">${totalPassed}</div></div>
      <div class="card"><div class="label">Failed</div><div class="value" style="color:${totalFailed ? '#dc2626' : 'var(--fg)'}">${totalFailed}</div></div>
      <div class="card"><div class="label">Overall</div><div class="value">${allOk ? '<span class="pct-full">✓ all green</span>' : '<span class="pct-low">✕ attention</span>'}</div></div>
    </div>

    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Project</th>
            <th>Status</th>
            <th>Tests</th>
            <th>Statements</th>
            <th>Branches</th>
            <th>Functions</th>
            <th>Lines</th>
          </tr>
        </thead>
        <tbody>${rows}
        </tbody>
      </table>
    </div>

    <footer>Per-project raw logs: <code>.test-reports/&lt;project&gt;.log</code></footer>
  </div>
</body>
</html>
`;

const outPath = path.join(reportDir, 'index.html');
fs.writeFileSync(outPath, html);
console.log(`Report written to ${outPath}`);

if (!allOk) {
  process.exitCode = 1;
}
