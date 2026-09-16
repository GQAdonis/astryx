// Copyright (c) Meta Platforms, Inc. and affiliates.

/**
 * @file listbox.ts
 * @input Uses the shared accessibility contract vocabulary
 * @output LISTBOX_PATTERN and ListboxStateFacts
 * @position Standards-derived semantics for listbox, group, and option parts.
 */

import {definePattern, type WcagCriterion} from '../contract';

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
        if (
          facts.multiple &&
          (await subject.attribute('aria-multiselectable')) !== 'true'
        ) {
          throw new Error(
            'the listbox permits multiple selection but aria-multiselectable is not true',
          );
        }
      },
    },
  ],
  exemptions: {},
});
