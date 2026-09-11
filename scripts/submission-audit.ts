import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  'LICENSE',
  'README.md',
  'SUBMISSION.md',
  'src/server.ts',
  'src/bedrock.ts',
  'scripts/mcp-conformance.ts',
  'scripts/demo-flow.ts',
  'JUDGE_CARD.md',
  'DEMO_RUNBOOK.md'
];

const read = (path: string) => existsSync(path) ? readFileSync(path, 'utf8') : '';
const submission = read('SUBMISSION.md');
const server = read('src/server.ts');
const bedrock = read('src/bedrock.ts');
const conformance = read('scripts/mcp-conformance.ts');
const demo = read('scripts/demo-flow.ts');
const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
  license?: string;
  dependencies?: Record<string, string>;
  scripts?: Record<string, string>;
};

const checks: Array<[string, boolean]> = [
  ['public-submission metadata exists', existsSync('SUBMISSION.md')],
  ['MIT license declared', pkg.license === 'MIT' && existsSync('LICENSE')],
  ['MCP 2025-11-25 documented', /2025-11-25/.test(submission)],
  ['MCP 2025-11-25 exposed by runtime', /protocol:\s*['"]2025-11-25['"]/.test(server)],
  ['Streamable HTTP transport implemented', /StreamableHTTPServerTransport/.test(server)],
  ['MCP POST endpoint implemented', /app\.post\(['"]\/mcp['"]/.test(server)],
  ['session lifecycle implemented', /mcp-session-id/i.test(server) && /app\.delete\(['"]\/mcp['"]/.test(server)],
  ['raw-wire conformance targets required protocol', /2025-11-25/.test(conformance)],
  ['Bedrock SDK dependency present', Boolean(pkg.dependencies?.['@aws-sdk/client-bedrock-runtime'])],
  ['Bedrock runtime implementation present', /BedrockRuntimeClient/.test(bedrock) && /ConverseCommand/.test(bedrock) && /client\.send\(/.test(bedrock)],
  ['Bedrock runtime is configuration-gated', /AWS_REGION/.test(bedrock) && /BEDROCK_MODEL_ID/.test(bedrock)],
  ['Bedrock output is validated before use', /extractJsonArray/.test(bedrock) && /normalizeMealSlot/.test(bedrock) && /no valid slots/i.test(bedrock)],
  ['AWS Builder section present', /### AWS Builder/.test(submission)],
  ['Open Source section present', /### Open Source/.test(submission)],
  ['product feedback present', /## Product feedback/.test(submission)],
  ['demo storyboard present', /## Three-minute demo storyboard/.test(submission)],
  ['demo emits judge evidence', /JUDGE EVIDENCE SUMMARY/i.test(demo)],
  ['judge instructions present', /## Judge testing instructions/.test(submission)],
  ['known limitations disclosed', /## Known limitations/.test(submission)],
  ['required verification scripts wired', ['build', 'smoke', 'mcp-conformance', 'judge-check', 'demo', 'eval'].every(name => Boolean(pkg.scripts?.[name]))],
  ['all judge-critical files present', requiredFiles.every(existsSync)],
];

const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
const result = {
  status: failed.length ? 'SUBMISSION_AUDIT_FAILED' : 'SUBMISSION_AUDIT_PASSED',
  checkedAt: new Date().toISOString(),
  checks: Object.fromEntries(checks),
  failed,
  manualGates: [
    'register/join hackathon on Devpost',
    'record and publish public demo video under three minutes',
    'complete Devpost submission form before 2026-10-23 12:00 PDT',
    'capture authorized Bedrock-backed run if AWS Builder evidence is desired'
  ]
};

console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exit(1);
