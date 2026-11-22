import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const bundleDirectory = resolve(process.argv[2] ?? 'dist/_expo/static/js/android');
const bundles = readdirSync(bundleDirectory)
  .filter((fileName) => fileName.endsWith('.hbc'))
  .map((fileName) => resolve(bundleDirectory, fileName));

if (bundles.length === 0) {
  throw new Error(`No Hermes Android bundles found in ${bundleDirectory}`);
}

const forbiddenDefault = /function\s+combatMathTs\d+\([^)]*=\s*GAME_CONSTANTS\./g;
const violations = [];

for (const bundlePath of bundles) {
  const source = readFileSync(bundlePath, 'utf8');
  const matches = source.match(forbiddenDefault);
  if (matches) violations.push(`${bundlePath}: ${matches.join(', ')}`);
}

if (violations.length > 0) {
  throw new Error(
    `Unsafe GAME_CONSTANTS worklet default detected:\n${violations.join('\n')}`
  );
}

console.log(`Verified ${bundles.length} Hermes Android bundle(s).`);
