// Copyright (c) Meta Platforms, Inc. and affiliates.

/**
 * @file listbox.ts
 * @input Uses the shared accessibility contract vocabulary
 * @output LISTBOX_PATTERN and ListboxStateFacts
 * @position Standards-derived semantics for listbox, group, and option parts.
 */

import {definePattern, type WcagCriterion} from '../contract';
import {MissingBindingCapability} from '../check';

const NAME_ROLE_VALUE: WcagCriterion = {
  standard: 'wcag',
  id: '4.1.2',
  name: 'Name, Role, Value',
  level: 'A',
  url: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html',
};

export interface ListboxStateFacts {
  readonly part: 'listbox' | 'group' | 'option';
  readonly multiple: boolean;
  readonly selected?: boolean;
  readonly disabled?: boolean;
  readonly selectionAttribute?: 'aria-selected' | 'aria-checked';
}

export const LISTBOX_PATTERN = definePattern<ListboxStateFacts>({
  pattern: 'listbox',
  url: 'https://www.w3.org/TR/wai-aria-1.2/#listbox',
  scope:
    'Listbox, group, and option semantics; not a new keyboard or selection model.',
  expectations: [
    {
      id: 'listbox.state.multiselectable',
      outcome:
        'The listbox exposes whether more than one option may be selected.',
      sources: [NAME_ROLE_VALUE],
      covers: ['4.1.2-name-role-value'],
      appliesWhen: {
        condition: 'the subject is a listbox',
        test: facts => facts.part === 'listbox',
      },
      evidenceLayer: 'dom',
      enforcement: 'required',
      run: async ({subject, facts}) => {
        const multiple = await subject.attribute('aria-multiselectable');
        if (facts.multiple && multiple !== 'true') {
          throw new Error(
            'the listbox permits multiple selection but aria-multiselectable is not true',
          );
        }
        if (!facts.multiple && multiple !== null && multiple !== 'false') {
          throw new Error(
            'the listbox permits only one selection but aria-multiselectable is not false or absent',
          );
        }
      },
    },
    {
      id: 'listbox.option.selection-state',
      outcome: 'An option exposes the selection state its owner supplies.',
      sources: [NAME_ROLE_VALUE],
      covers: ['4.1.2-name-role-value'],
      appliesWhen: {
        condition: 'the subject is an option',
        test: facts => facts.part === 'option',
      },
      evidenceLayer: 'dom',
      enforcement: 'required',
      run: async ({subject, facts}) => {
        if (facts.selected == null) {
          throw new MissingBindingCapability(
            'an option binding must declare selected state',
          );
        }
        const attribute = facts.selectionAttribute ?? 'aria-selected';
        const authored = await subject.attribute(attribute);
        const selected =
          authored === null && attribute === 'aria-selected'
            ? 'false'
            : authored;
        if (selected !== String(facts.selected)) {
          throw new Error(
            `the option is ${facts.selected ? 'selected' : 'unselected'} but ${attribute} is ${selected ?? 'absent'}`,
          );
        }
      },
    },
    {
      id: 'listbox.option.disabled-state',
      outcome:
        'An option exposes its availability without choosing a focus policy.',
      sources: [NAME_ROLE_VALUE],
      covers: ['4.1.2-name-role-value'],
      appliesWhen: {
        condition: 'the subject is an option',
        test: facts => facts.part === 'option',
      },
      evidenceLayer: 'dom',
      enforcement: 'required',
      run: async ({subject, facts}) => {
        if (facts.disabled == null) {
          throw new MissingBindingCapability(
            'an option binding must declare disabled state',
          );
        }
        const disabled = await subject.attribute('aria-disabled');
        if (
          facts.disabled
            ? disabled !== 'true'
            : disabled !== null && disabled !== 'false'
        ) {
          throw new Error(
            `the option is ${facts.disabled ? 'disabled' : 'available'} but aria-disabled is ${disabled ?? 'absent'}`,
          );
        }
      },
    },
    {
      id: 'listbox.relationship.owned',
      outcome: 'Options and groups keep their declared listbox relationship.',
      sources: [
        {
          standard: 'wcag',
          id: '1.3.1',
          name: 'Info and Relationships',
          level: 'A',
          url: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html',
        },
        {
          standard: 'web-standard',
          specification: 'WAI-ARIA 1.2',
          requirement:
            'Authors MUST ensure elements with role option are contained in, or owned by, an element with the role listbox or group within a listbox.',
          url: 'https://www.w3.org/TR/wai-aria-1.2/#option',
        },
      ],
      covers: ['1.3.1-info-and-relationships'],
      appliesWhen: {
        condition: 'the subject is an option or option group',
        test: facts => facts.part !== 'listbox',
      },
      evidenceLayer: 'dom',
      enforcement: 'required',
      run: async ({harness, subject, facts}) => {
        const listbox = await harness.related('listbox');
        if (
          !(await harness.contains(listbox, subject)) &&
          !(await harness.references(listbox, 'aria-owns', subject))
        ) {
          throw new Error(
            `the ${facts.part} is neither contained nor owned by its listbox`,
          );
        }
      },
    },
    {
      id: 'listbox.exposure.identity',
      outcome:
        'The browser exposes each part with its role and identifying name.',
      sources: [NAME_ROLE_VALUE],
      covers: ['4.1.2-name-role-value'],
      appliesWhen: {
        condition: 'the declared semantic part is rendered',
        test: () => true,
      },
      evidenceLayer: 'accessibility-tree',
      enforcement: 'required',
      run: async () => undefined,
    },
  ],
  exemptions: {},
});
