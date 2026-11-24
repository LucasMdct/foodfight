import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const bundleDirectory = resolve(process.argv[2] ?? 'dist/_expo/static/js/android');
const bundles = readdirSync(bundleDirectory)
  .filter((fileName) => fileName.endsWith('.hbc'))
  .map((fileName) => resolve(bundleDirectory, fileName));

if (bundles.length === 0) {
  throw new Error(`No Hermes Android bundles found in ${bundleDirectory}`);
}

const violations = [];

function matchingClose(source, openIndex, openChar, closeChar) {
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let index = openIndex; index < source.length; index += 1) {
    const character = source[index];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }

    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }

    if (character === openChar) depth += 1;
    if (character === closeChar) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}

function unsafeFunctionSignatures(source) {
  const signatures = [];
  const functionPattern = /function(?:\s+[A-Za-z_$][\w$]*)?\s*\(/g;
  let match;

  while ((match = functionPattern.exec(source))) {
    const openIndex = source.indexOf('(', match.index);
    const closeIndex = matchingClose(source, openIndex, '(', ')');
    if (closeIndex < 0) continue;

    const parameters = source.slice(openIndex + 1, closeIndex);
    if (parameters.includes('GAME_CONSTANTS.')) {
      signatures.push(source.slice(match.index, closeIndex + 1));
    }

    functionPattern.lastIndex = closeIndex + 1;
  }

  return signatures;
}

for (const bundlePath of bundles) {
  const source = readFileSync(bundlePath, 'utf8');
  const matches = unsafeFunctionSignatures(source);
  if (matches.length > 0) violations.push(`${bundlePath}: ${matches.join(', ')}`);
}

if (violations.length > 0) {
  throw new Error(
    `Unsafe GAME_CONSTANTS worklet default detected:\n${violations.join('\n')}`
  );
}

console.log(`Verified ${bundles.length} Hermes Android bundle(s).`);
