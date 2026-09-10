import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = ['LICENSE', 'README.md', 'SUBMISSION.md', 'src/server.ts', 'scripts/mcp-conformance.ts'];
const submission = readFileSync('SUBMISSION.md', 'utf8');
const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { license?: string; dependencies?: Record<string,string> };

const checks: Array<[string, boolean]> = [
  ['public-submission metadata exists', existsSync('SUBMISSION.md')],
  ['MIT license declared', pkg.license === 'MIT' && existsSync('LICENSE')],
  ['MCP 2025-11-25 documented', /2025-11-25/.test(submission)],
  ['Streamable HTTP documented', /Streamable HTTP/i.test(submission)],
  ['Bedrock SDK dependency present', Boolean(pkg.dependencies?.['@aws-sdk/client-bedrock-runtime'])],
  ['AWS Builder section present', /### AWS Builder/.test(submission)],
  ['Open Source section present', /### Open Source/.test(submission)],
  ['product feedback present', /## Product feedback/.test(submission)],
  ['demo storyboard present', /## Three-minute demo storyboard/.test(submission)],
  ['judge instructions present', /## Judge testing instructions/.test(submission)],
  ['known limitations disclosed', /## Known limitations/.test(submission)],
  ['all judge-critical files present', requiredFiles.every(existsSync)],
];

const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
console.log(JSON.stringify({
  status: failed.length ? 'SUBMISSION_AUDIT_FAILED' : 'SUBMISSION_AUDIT_PASSED',
  checkedAt: new Date().toISOString(),
  checks: Object.fromEntries(checks),
  manualGates: [
    'register/join hackathon on Devpost',
    'record and publish public demo video under three minutes',
    'complete Devpost submission form before 2026-10-23 12:00 PDT',
    'capture authorized Bedrock-backed run if AWS Builder evidence is desired'
  ]
}, null, 2));
if (failed.length) process.exit(1);
