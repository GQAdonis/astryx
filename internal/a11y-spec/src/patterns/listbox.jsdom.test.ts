// Copyright (c) Meta Platforms, Inc. and affiliates.
/** @vitest-environment jsdom */

/**
 * @file listbox.jsdom.test.ts
 * @input Uses real DOM fixtures, the listbox contract, and the jsdom harness
 * @output Positive and deliberately violating proof through checkAccessibilitySpec
 * @position Contract self-tests, not component bindings.
 */

import {afterEach, describe, expect, it} from 'vitest';
import {checkAccessibilitySpec} from '../check';
import {createJsdomHarness} from '../harness/jsdom';
import {LISTBOX_PATTERN} from './listbox';

afterEach(() => document.body.replaceChildren());

async function checkMultiple(attribute: string, multiple = true) {
  return checkAccessibilitySpec({
    spec: LISTBOX_PATTERN,
    binding: 'fixture',
    state: 'multiple',
    facts: {part: 'listbox', multiple},
    mount: async () => {
      document.body.innerHTML = `<div role="listbox" aria-label="Fruit" ${attribute}><div role="option" aria-selected="false">Apple</div></div>`;
      return createJsdomHarness({subject: document.body.firstElementChild!});
    },
    unmount: () => document.body.replaceChildren(),
  });
}

describe('listbox.state.multiselectable — WCAG 2.2 4.1.2', () => {
  it('accepts an exposed multiple-selection list', async () => {
    const result = await checkMultiple('aria-multiselectable="true"');
    expect(result.results[0]?.status).toBe('pass');
  });

  it('detects a multiple-selection list that omits its state', async () => {
    const result = await checkMultiple('');
    expect(result.results[0]?.status).toBe('fail');
    expect(result.results[0]?.detail).toBe(
      'the listbox permits multiple selection but aria-multiselectable is not true',
    );
  });
});
