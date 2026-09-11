import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'addon-package', 'addon.json');
const fail = (message) => { throw new Error(`Alexa add-on check failed: ${message}`); };

if (!fs.existsSync(manifestPath)) fail('addon-package/addon.json is missing');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (manifest.manifestVersion !== '1.0') fail('manifestVersion must be 1.0');

const listing = manifest.storeListing?.locales?.['en-US'];
if (!listing) fail('en-US store listing is missing');
if (!listing.name?.value || listing.name.value.length > 30) fail('name must be 1-30 characters');
if (!listing.shortDescription || listing.shortDescription.length > 123) fail('shortDescription must be 1-123 characters');
if (!listing.fullDescription || listing.fullDescription.length > 4000) fail('fullDescription must be 1-4000 characters');
if (!Array.isArray(listing.examplePhrases) || listing.examplePhrases.length < 3 || listing.examplePhrases.length > 4) fail('examplePhrases must contain 3-4 phrases');
if (listing.examplePhrases.some((p) => !p || p.length > 200)) fail('each example phrase must be 1-200 characters');

for (const [key, value] of Object.entries({
  privacyPolicyUrl: listing.privacyAndCompliance?.privacyPolicyUrl,
  termsOfUseUrl: listing.privacyAndCompliance?.termsOfUseUrl
})) {
  if (typeof value !== 'string' || !value.startsWith('https://')) fail(`${key} must be an HTTPS URL`);
}

const integration = manifest.integrations?.find((i) => i.type === 'MCP');
const endpoint = integration?.config?.endpoints?.default;
if (endpoint?.type !== 'HTTPS' || typeof endpoint.uri !== 'string' || !endpoint.uri.startsWith('https://')) fail('MCP default endpoint must be HTTPS');

function pngSize(file) {
  const b = fs.readFileSync(file);
  if (b.length < 24 || b.toString('hex', 0, 8) !== '89504e470d0a1a0a') fail(`${file} is not a PNG`);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

const required = [64, 72, 88, 126, 180, 241];
const icons = listing.mediaAssets?.icons?.light;
if (!Array.isArray(icons)) fail('light icon assets are missing');
for (const size of required) {
  const label = `${size}x${size}`;
  const asset = icons.find((i) => i.size === label);
  if (!asset?.uri?.startsWith('https://')) fail(`HTTPS icon URI missing for ${label}`);
  const file = path.join(root, 'assets', 'alexa', `icon-${label}.png`);
  if (!fs.existsSync(file)) fail(`local icon file missing for ${label}`);
  const [w, h] = pngSize(file);
  if (w !== size || h !== size) fail(`icon ${label} has wrong dimensions ${w}x${h}`);
}

const carousel = listing.mediaAssets?.carouselImages?.[0];
if (!carousel || carousel.size !== '600x900' || !carousel.uri?.startsWith('https://')) fail('600x900 HTTPS carousel asset is required');
const carouselFile = path.join(root, 'assets', 'alexa', 'carousel-600x900.png');
if (!fs.existsSync(carouselFile)) fail('local carousel asset is missing');
const [cw, ch] = pngSize(carouselFile);
if (cw !== 600 || ch !== 900) fail(`carousel has wrong dimensions ${cw}x${ch}`);

for (const policy of ['PRIVACY.md', 'TERMS.md']) {
  if (!fs.existsSync(path.join(root, policy))) fail(`${policy} is missing`);
}

console.log(`Alexa add-on package OK: ${listing.name.value} -> ${endpoint.uri}`);
