// Copyright (c) Meta Platforms, Inc. and affiliates.

/**
 * @file MultiSelector.listbox.a11y.test.tsx
 * @input Uses MultiSelector and the shared listbox contract
 * @output DOM evidence from the real role-bearing popup
 * @position Listbox binding; component API and interaction tests stay local.
 */

import {cleanup, render, screen} from '@testing-library/react';
import {it} from 'vitest';
import {
  expectAccessibilitySpec,
  LISTBOX_PATTERN,
} from '@astryxdesign/a11y-spec';
import {MultiSelector} from '../MultiSelector';

it('MultiSelector popup exposes multiple selection — WCAG 2.2 4.1.2', async () => {
  await expectAccessibilitySpec({
    spec: LISTBOX_PATTERN,
    binding: 'MultiSelector.listbox',
    state: 'selected',
    facts: {part: 'listbox', multiple: true},
    render: () => {
      render(
        <MultiSelector
          label="Fruit"
          options={['Apple', 'Banana']}
          value={['Apple']}
          onChange={() => {}}
          isDefaultOpen
        />,
      );
    },
    subject: async () => screen.findByRole('listbox', {hidden: true}),
    cleanup,
  });
});
