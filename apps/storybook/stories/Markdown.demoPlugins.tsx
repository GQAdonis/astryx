// Copyright (c) Meta Platforms, Inc. and affiliates.

/**
 * @file Markdown.demoPlugins.tsx
 * @input Bounded mention and callout syntax definitions
 * @output Reusable Storybook-only Markdown demo plugins
 * @position Documentation fixtures for the core Markdown plugin protocol
 */

import {
  createMarkdownPlugin,
  createMarkdownSemanticFenceTransform,
  createMarkdownSourceDecoration,
  createMarkdownTextTransform,
  getMarkdownSourceDecorations,
  type MarkdownExtensionNode,
  type MarkdownSyntaxPluginDefinition,
} from '@astryxdesign/core/Markdown';

type MentionNode = MarkdownExtensionNode<
  'demo-mentions',
  'mention',
  {readonly label: string},
  'inline'
>;

type TodoNode = MarkdownExtensionNode<
  'demo-todos',
  'todo',
  {readonly label: string},
  'inline'
>;

type CalloutNode = MarkdownExtensionNode<
  'demo-callouts',
  'callout',
  {readonly body: string},
  'block'
>;

const mentionDefinition = {
  name: 'demo-mentions',
  apiVersion: 1,
  parseKey: 'v1',
  syntax: {
    inline: [
      {
        startsWith: ['@{'],
        maxSpan: 80,
        tokenize({source, offset, end, isFinal}) {
          const close = source.indexOf('}', offset + 2);
          if (close < 0 || close >= end) {
            return isFinal ? {status: 'no-match'} : {status: 'defer'};
          }
          return {
            status: 'match',
            end: close + 1,
            node: {
              type: 'extension',
              plugin: 'demo-mentions',
              name: 'mention',
              display: 'inline',
              data: {label: source.slice(offset + 2, close)},
            },
          };
        },
      },
    ],
  },
  renderers: {
    mention: {
      render: ({node}) => <mark>@{node.data.label}</mark>,
      toText: node => `@${node.data.label}`,
    },
  },
} satisfies MarkdownSyntaxPluginDefinition<'demo-mentions', MentionNode>;

const calloutDefinition = {
  name: 'demo-callouts',
  apiVersion: 1,
  parseKey: 'v1',
  syntax: {
    block: [
      {
        startsWith: [':::note'],
        maxSpan: 500,
        tokenize({source, offset, end, isFinal}) {
          const close = source.indexOf('\n:::', offset + 7);
          if (close < 0 || close + 4 > end) {
            return isFinal ? {status: 'no-match'} : {status: 'defer'};
          }
          return {
            status: 'match',
            end: close + 4,
            node: {
              type: 'extension',
              plugin: 'demo-callouts',
              name: 'callout',
              display: 'block',
              data: {body: source.slice(offset + 7, close).trim()},
            },
          };
        },
      },
    ],
  },
  renderers: {
    callout: {
      render: ({node}) => <aside aria-label="Note">{node.data.body}</aside>,
      toText: node => node.data.body,
    },
  },
} satisfies MarkdownSyntaxPluginDefinition<'demo-callouts', CalloutNode>;

const todoPlugin = createMarkdownPlugin<'demo-todos', TodoNode>({
  name: 'demo-todos',
  apiVersion: 1,
  transform: createMarkdownTextTransform<TodoNode>({
    pattern: /\bTODO\b/g,
    requiredSubstrings: ['TODO'],
    replace: () => ({
      type: 'extension',
      plugin: 'demo-todos',
      name: 'todo',
      display: 'inline',
      data: {label: 'TODO'},
    }),
  }),
  renderers: {
    todo: {
      render: ({node}) => <mark>{node.data.label}</mark>,
      toText: node => node.data.label,
    },
  },
});

const semanticFencePlugin = createMarkdownPlugin({
  name: 'demo-semantic-fences',
  apiVersion: 1,
  transform: createMarkdownSemanticFenceTransform({
    languages: ['diagram'],
    render: ({code, meta}) => (
      <figure aria-label={meta ?? 'Workflow diagram'}>
        <figcaption>{meta ?? 'Workflow diagram'}</figcaption>
        <pre>{code}</pre>
      </figure>
    ),
  }),
});

export const markdownSemanticFenceDemoPlugin = semanticFencePlugin;

export const markdownDemoPlugins = [
  createMarkdownPlugin<'demo-mentions', MentionNode>(mentionDefinition),
  createMarkdownPlugin<'demo-callouts', CalloutNode>(calloutDefinition),
  todoPlugin,
] as const;

/**
 * Decoration demo: one plugin records a search hit on the block a known
 * source range covers, a second reads the recorded metadata back. Decorations
 * are non-visual, so the rendered document is identical either way.
 */
export function createSourceDecorationDemo(source: string, query: string) {
  const start = source.indexOf(query);
  const readout: string[] = [];
  const plugins = [
    createMarkdownPlugin({
      name: 'demo-search-hits',
      apiVersion: 1,
      transform: createMarkdownSourceDecoration({
        name: 'search-hit',
        ranges:
          start < 0 ? [] : [{start, end: start + query.length, data: {query}}],
      }),
    }),
    createMarkdownPlugin({
      name: 'demo-decoration-readout',
      apiVersion: 1,
      transform(root) {
        readout.length = 0;
        root.children.forEach((block, index) => {
          for (const decoration of getMarkdownSourceDecorations(block)) {
            readout.push(`block ${index} (${block.type}) — ${decoration.name}`);
          }
        });
        return root;
      },
    }),
  ];
  return {plugins, readout};
}
