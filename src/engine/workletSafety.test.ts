import { describe, expect, it } from 'vitest';

import source from './combatMath.ts?raw';

function matchingClose(
  input: string,
  openIndex: number,
  openChar: string,
  closeChar: string
): number {
  let depth = 0;
  let quote: string | null = null;
  let escaped = false;

  for (let index = openIndex; index < input.length; index += 1) {
    const character = input[index];

    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = null;
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

function workletParameterLists(input: string): string[] {
  const parameterLists: string[] = [];
  const arrowPattern = /=>\s*\{/g;
  let match;

  while ((match = arrowPattern.exec(input))) {
    const bodyStart = input.indexOf('{', match.index);
    const bodyEnd = matchingClose(input, bodyStart, '{', '}');
    if (bodyEnd < 0) continue;

    const beforeArrow = input.slice(0, match.index).trimEnd();
    const closeIndex = beforeArrow.length - 1;
    if (beforeArrow[closeIndex] !== ')') continue;
    let openIndex = closeIndex;
    let depth = 0;
    while (openIndex >= 0) {
      if (beforeArrow[openIndex] === ')') depth += 1;
      if (beforeArrow[openIndex] === '(') {
        depth -= 1;
        if (depth === 0) break;
      }
      openIndex -= 1;
    }
    if (openIndex < 0) continue;

    const body = input.slice(bodyStart + 1, bodyEnd);
    if (/^\s*['"]worklet['"]\s*;/m.test(body)) {
      parameterLists.push(beforeArrow.slice(openIndex + 1, closeIndex));
    }

    arrowPattern.lastIndex = bodyEnd + 1;
  }

  return parameterLists;
}

describe('worklet closure safety', () => {
  it('keeps GAME_CONSTANTS fallback resolution inside worklet bodies', () => {
    expect(workletParameterLists(source).join('\n')).not.toMatch(/GAME_CONSTANTS\./);
  });

  it('detects nested and transformed-looking imported defaults', () => {
    const unsafeSource = `
      const nested = (height = Math.max(GAME_CONSTANTS.HERO_HEIGHT, 0)) => {
        'worklet';
        return height;
      };
      const transformed = (height = __vite_ssr_import_0__.GAME_CONSTANTS.HERO_HEIGHT) => {
        'worklet';
        return height;
      };
    `;

    expect(workletParameterLists(unsafeSource).join('\n')).toMatch(/GAME_CONSTANTS\./);
  });
});
