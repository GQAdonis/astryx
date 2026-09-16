// Copyright (c) Meta Platforms, Inc. and affiliates.

/**
 * @file semanticFence.ts
 * @input Declared fenced-code languages and a synchronous semantic renderer
 * @output Immutable Markdown transform that annotates eligible canonical code nodes
 * @position Optional helper layer compiled onto the core transform protocol
 */

import type React from 'react';
import type {MarkdownAstBlockContent, MarkdownAstCode} from './ast';
import {
  getMarkdownTransformPluginName,
  markMarkdownTransformClaim,
  type MarkdownExtensionNode,
  type MarkdownTransform,
  type MarkdownTransformContext,
} from './plugins';

export interface MarkdownSemanticFenceRenderProps<Language extends string> {
  readonly code: string;
  readonly language: Language;
  readonly meta?: string;
}

export type MarkdownSemanticFenceRenderResult = Exclude<
  React.ReactNode,
  Promise<unknown>
>;

export interface MarkdownSemanticFenceTransformOptions<
  Languages extends readonly [string, ...string[]],
> {
  /** Exact, case-sensitive fenced-code language identifiers this helper owns. */
  readonly languages: Languages;
  /** Return null or undefined to use Markdown's ordinary CodeBlock fallback. */
  readonly render: (
    props: MarkdownSemanticFenceRenderProps<Languages[number]>,
  ) => MarkdownSemanticFenceRenderResult;
}

type SemanticFenceRenderer = (
  props: MarkdownSemanticFenceRenderProps<string>,
) => MarkdownSemanticFenceRenderResult;

interface MarkdownSemanticFenceProposal {
  readonly pluginName: string;
  readonly render: SemanticFenceRenderer;
}

const markdownSemanticFenceProposal = Symbol('MarkdownSemanticFenceProposal');

type SemanticFenceCode = MarkdownAstCode & {
  readonly [markdownSemanticFenceProposal]?: MarkdownSemanticFenceProposal;
};

/** @internal Returns the first transform-owned proposal attached to a code node. */
export function getMarkdownSemanticFenceProposal(
  node: MarkdownAstCode,
): MarkdownSemanticFenceProposal | undefined {
  return (node as SemanticFenceCode)[markdownSemanticFenceProposal];
}

function sameItems<T>(
  left: ReadonlyArray<T>,
  right: ReadonlyArray<T>,
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function annotateCode(
  node: MarkdownAstCode,
  languages: ReadonlySet<string>,
  proposal: MarkdownSemanticFenceProposal,
): MarkdownAstCode {
  if (
    node.lang == null ||
    !languages.has(node.lang) ||
    getMarkdownSemanticFenceProposal(node) != null
  ) {
    return node;
  }

  const annotated = {...node};
  Object.defineProperty(annotated, markdownSemanticFenceProposal, {
    configurable: false,
    enumerable: true,
    value: proposal,
    writable: false,
  });
  return annotated;
}

function transformBlocks(
  blocks: ReadonlyArray<MarkdownAstBlockContent<MarkdownExtensionNode>>,
  languages: ReadonlySet<string>,
  proposal: MarkdownSemanticFenceProposal,
): ReadonlyArray<MarkdownAstBlockContent<MarkdownExtensionNode>> {
  const next = blocks.map(block => {
    switch (block.type) {
      case 'code':
        return annotateCode(block, languages, proposal);
      case 'blockquote': {
        const children = transformBlocks(block.children, languages, proposal);
        return children === block.children ? block : {...block, children};
      }
      case 'list': {
        let changed = false;
        const children = block.children.map(item => {
          const itemChildren = transformBlocks(
            item.children,
            languages,
            proposal,
          );
          if (itemChildren === item.children) {
            return item;
          }
          changed = true;
          return {...item, children: itemChildren};
        });
        return changed ? {...block, children} : block;
      }
      case 'heading':
      case 'paragraph':
      case 'math':
      case 'table':
      case 'thematicBreak':
      case 'image':
      case 'extension':
        return block;
    }
  });
  return sameItems(blocks, next) ? blocks : next;
}

export function createMarkdownSemanticFenceTransform<
  const Languages extends readonly [string, ...string[]],
>(
  options: MarkdownSemanticFenceTransformOptions<Languages>,
): MarkdownTransform<never> {
  if (
    !Array.isArray(options.languages) ||
    options.languages.length === 0 ||
    options.languages.some(
      language => typeof language !== 'string' || language.trim() === '',
    )
  ) {
    throw new TypeError(
      'Markdown semantic fence languages must be non-empty strings',
    );
  }
  if (new Set(options.languages).size !== options.languages.length) {
    throw new TypeError('Markdown semantic fence languages must be unique');
  }
  if (typeof options.render !== 'function') {
    throw new TypeError('Markdown semantic fence render must be a function');
  }

  const declaredLanguages = Object.freeze([...options.languages]);
  const languages = new Set<string>(declaredLanguages);
  const render = options.render as SemanticFenceRenderer;
  const transform: MarkdownTransform<never> = (
    root,
    context: MarkdownTransformContext,
  ) => {
    const proposal = Object.freeze({
      pluginName:
        getMarkdownTransformPluginName(context) ?? 'semantic-fence-helper',
      render,
    });
    const children = transformBlocks(root.children, languages, proposal);
    return children === root.children ? root : {...root, children};
  };

  return markMarkdownTransformClaim(transform, source =>
    declaredLanguages.some(
      language =>
        source.includes(`\`\`\`${language}`) ||
        source.includes(`~~~${language}`),
    ),
  );
}
