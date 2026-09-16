// Copyright (c) Meta Platforms, Inc. and affiliates.

/**
 * @file Selector.listbox.a11y.test.tsx
 * @input Uses Selector, its explicit part/state inventory, and the Listbox contract
 * @output DOM evidence for real single-select listbox, group, and option parts
 * @position Component-facing binding; keyboard, callbacks, forms, and styles stay local.
 */

import {cleanup, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it} from 'vitest';
import {
  expectAccessibilitySpec,
  LISTBOX_PATTERN,
} from '@astryxdesign/a11y-spec';
import {Selector} from '../Selector';
import {LISTBOX_SCENARIOS, listboxParts} from './Listbox.a11y.states';
import {installListboxDialogStubs} from './Listbox.a11y.dom';

installListboxDialogStubs();

const scenarios = LISTBOX_SCENARIOS.filter(
  scenario => scenario.component === 'Selector',
);

describe('Selector Listbox semantic binding', () => {
  it.each(scenarios)('$id', async scenario => {
    for (const part of listboxParts(scenario)) {
      await expectAccessibilitySpec({
        spec: LISTBOX_PATTERN,
        binding: `Selector.${part.role}`,
        state: part.state,
        facts: part.facts,
        render: async () => {
          render(
            <div dir={scenario.direction ?? 'ltr'}>
              <Selector
                label="Fruit"
                options={scenario.options}
                value={scenario.values[0]}
                onChange={() => {}}
                hasSearch={scenario.hasSearch}
                presentation={scenario.presentation}
                isLoading={scenario.isLoading}
                isLabelHidden={scenario.hiddenLabel}
                renderOption={
                  scenario.customContent
                    ? option => <span>{option.label} details</span>
                    : undefined
                }
                isDefaultOpen
              />
            </div>,
          );
          await screen.findByRole('listbox', {hidden: true});
          if (scenario.query != null) {
            await userEvent
              .setup()
              .type(
                screen.getByRole('combobox', {hidden: true}),
                scenario.query,
              );
          }
        },
        subject: () =>
          part.role === 'listbox'
            ? screen.getByRole('listbox', {hidden: true})
            : within(screen.getByRole('listbox', {hidden: true})).getByRole(
                part.role,
                {name: part.name, hidden: true},
              ),
        related: () => ({listbox: screen.getByRole('listbox', {hidden: true})}),
        cleanup,
      });
    }
  });

  it('keeps the bounded state matrix explicit', () => {
    expect(scenarios.map(scenario => scenario.id)).toEqual([
      'single-unset',
      'single-selected',
      'single-disabled-selected',
      'single-grouped',
      'single-filtered',
      'single-custom-rtl',
      'single-sheet',
      'single-sheet-search',
      'single-loading',
    ]);
  });
});
