// Copyright (c) Meta Platforms, Inc. and affiliates.

/**
 * @file semanticFence.test.tsx
 * @input Semantic-fence helper, canonical transforms, and Markdown rendering
 * @output Regression coverage for typing, immutability, precedence, fallback, and SSR
 * @position Focused acceptance tests for AST-036 semantic code fences
 */

import {render, screen} from '@testing-library/react';
import {renderToString} from 'react-dom/server';
import {describe, expect, expectTypeOf, it, vi} from 'vitest';
import {Markdown} from './Markdown';
import type {MarkdownAstRoot} from './ast';
import {parseMarkdown, parseMarkdownAst} from './parser';
import {
  applyMarkdownTransforms,
  createMarkdownPlugin,
  prepareMarkdownPlugins,
  type MarkdownTransform,
} from './plugins';
import {
  createMarkdownSemanticFenceTransform,
  getMarkdownSemanticFenceProposal,
  type MarkdownSemanticFenceRenderResult,
} from './semanticFence';

function createFencePlugin(
  renderFence: (props: {
    readonly code: string;
    readonly language: 'diagram';
    readonly meta?: string;
  }) => MarkdownSemanticFenceRenderResult,
  name = 'diagram-fences',
) {
  return createMarkdownPlugin({
    name,
    apiVersion: 1,
    transform: createMarkdownSemanticFenceTransform({
      languages: ['diagram'],
      render: renderFence,
    }),
  });
}

function ThrowingFenceChild(): never {
  throw new Error('broken semantic fence child');
}

describe('createMarkdownSemanticFenceTransform', () => {
  it('narrows the renderer language to the declared language union', () => {
    const transform = createMarkdownSemanticFenceTransform({
      languages: ['mermaid', 'dot'] as const,
      render: props => {
        expectTypeOf(props.language).toEqualTypeOf<'mermaid' | 'dot'>();
        expectTypeOf(props.code).toBeString();
        expectTypeOf(props.meta).toEqualTypeOf<string | undefined>();
        return null;
      },
    });

    expectTypeOf(transform).toEqualTypeOf<MarkdownTransform<never>>();
  });

  it('annotates the original code node without replacing source fields', () => {
    const position = {
      start: {offset: 0},
      end: {offset: 35},
    } as const;
    const code = {
      type: 'code',
      lang: 'diagram',
      meta: 'title="Flow"',
      value: 'start --> finish',
      data: {owner: 'source'},
      position,
    } as const;
    const root: MarkdownAstRoot = {type: 'root', children: [code]};
    const plugin = createFencePlugin(() => null);
    const transformed = applyMarkdownTransforms(
      root,
      prepareMarkdownPlugins([plugin]),
      '```diagram title="Flow"\nstart --> finish\n```',
      true,
      'block',
    );
    const transformedCode = transformed.children[0];

    expect(transformed).not.toBe(root);
    expect(transformedCode).not.toBe(code);
    expect(transformedCode).toMatchObject(code);
    expect(code).not.toHaveProperty('render');
    expect(getMarkdownSemanticFenceProposal(code)).toBeUndefined();
    expect(
      transformedCode?.type === 'code'
        ? getMarkdownSemanticFenceProposal(transformedCode)
        : undefined,
    ).toBeDefined();
    expect(Object.isFrozen(transformed)).toBe(true);
    expect(Object.isFrozen(transformedCode)).toBe(true);
  });

  it('preserves fence metadata in the canonical tree without changing legacy output', () => {
    const source = '```diagram title="Flow"\nstart --> finish\n```';
    expect(parseMarkdownAst(source).children[0]).toMatchObject({
      type: 'code',
      lang: 'diagram',
      meta: 'title="Flow"',
      value: 'start --> finish',
    });
    expect(parseMarkdown(source)).toEqual([
      {
        type: 'codeblock',
        language: 'diagram',
        content: 'start --> finish',
      },
    ]);
  });

  it('matches the complete declared language without prefix collisions', () => {
    const prefixRender = vi.fn(() => <div>C renderer</div>);
    const exactRender = vi.fn(() => <div>C++ renderer</div>);
    const prefix = createMarkdownPlugin({
      name: 'c-fences',
      apiVersion: 1,
      transform: createMarkdownSemanticFenceTransform({
        languages: ['c'],
        render: prefixRender,
      }),
    });
    const exact = createMarkdownPlugin({
      name: 'cpp-fences',
      apiVersion: 1,
      transform: createMarkdownSemanticFenceTransform({
        languages: ['c++'],
        render: exactRender,
      }),
    });
    const source = '```c++ title="Example"\nint main() {}\n```';

    expect(parseMarkdownAst(source).children[0]).toMatchObject({
      type: 'code',
      lang: 'c++',
      meta: 'title="Example"',
    });
    expect(parseMarkdown(source)).toEqual([
      {type: 'codeblock', language: 'c', content: 'int main() {}'},
    ]);
    render(<Markdown plugins={[prefix, exact]}>{source}</Markdown>);
    expect(screen.getByText('C++ renderer')).toBeInTheDocument();
    expect(prefixRender).not.toHaveBeenCalled();
    expect(exactRender).toHaveBeenCalledOnce();
  });

  it('renders declared languages with typed code and metadata', () => {
    const renderFence = vi.fn(
      ({
        code,
        language,
        meta,
      }: Parameters<Parameters<typeof createFencePlugin>[0]>[0]) => (
        <figure aria-label={`${language}: ${meta ?? 'Untitled'}`}>
          <code>{code}</code>
        </figure>
      ),
    );
    const plugin = createFencePlugin(renderFence);

    render(
      <Markdown plugins={[plugin]}>
        {'```diagram title="Flow"\nstart --> finish\n```'}
      </Markdown>,
    );

    expect(
      screen.getByRole('figure', {name: 'diagram: title="Flow"'}),
    ).toHaveTextContent('start --> finish');
    expect(renderFence).toHaveBeenCalledOnce();
    expect(renderFence).toHaveBeenCalledWith({
      code: 'start --> finish',
      language: 'diagram',
      meta: 'title="Flow"',
    });
  });

  it('lets components.code win without invoking the semantic renderer', () => {
    const renderFence = vi.fn(() => <div>Semantic</div>);
    const plugin = createFencePlugin(renderFence);
    const CodeOverride = ({code}: {code: string; language?: string}) => (
      <div data-testid="code-override">Override: {code}</div>
    );

    render(
      <Markdown plugins={[plugin]} components={{code: CodeOverride}}>
        {'```diagram\nstart --> finish\n```'}
      </Markdown>,
    );

    expect(screen.getByTestId('code-override')).toHaveTextContent(
      'Override: start --> finish',
    );
    expect(renderFence).not.toHaveBeenCalled();
  });

  it('uses the accessible copyable CodeBlock for undeclared or declined fences', () => {
    const renderFence = vi.fn(() => null);
    const plugin = createFencePlugin(renderFence);
    const {rerender} = render(
      <Markdown plugins={[plugin]}>{'```text\nplain source\n```'}</Markdown>,
    );

    expect(renderFence).not.toHaveBeenCalled();
    expect(document.querySelector('pre')).toHaveTextContent('plain source');
    expect(screen.getByRole('button', {name: 'Copy code'})).toBeInTheDocument();
    expect(screen.getByRole('group', {name: 'text'})).toHaveAttribute(
      'tabindex',
      '0',
    );

    rerender(
      <Markdown plugins={[plugin]}>
        {'```diagram\nsemantic source\n```'}
      </Markdown>,
    );
    expect(renderFence).toHaveBeenCalledOnce();
    expect(document.querySelector('pre')).toHaveTextContent('semantic source');
    expect(screen.getByRole('button', {name: 'Copy code'})).toBeInTheDocument();
  });

  it('fails closed when a semantic renderer is async', async () => {
    const asyncRenderer = (async () => (
      <div>Async output</div>
    )) as unknown as Parameters<typeof createFencePlugin>[0];
    const plugin = createFencePlugin(asyncRenderer, 'async-resolved-fences');
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(
      <Markdown plugins={[plugin]}>
        {'```diagram\nstart --> finish\n```'}
      </Markdown>,
    );
    await Promise.resolve();

    expect(screen.queryByText('Async output')).not.toBeInTheDocument();
    expect(document.querySelector('pre')).toHaveTextContent('start --> finish');
    const warningText = warning.mock.calls.flat().map(String).join(' ');
    expect(warningText).toContain('async-resolved-fences');
    expect(warningText).not.toContain('start --> finish');
    warning.mockRestore();
  });

  it('consumes rejected semantic renderer promises in client and SSR', async () => {
    const source = '```diagram\nprivate source\n```';
    const clientRenderer = (async () => {
      throw new Error('client rejection: private source');
    }) as unknown as Parameters<typeof createFencePlugin>[0];
    const serverRenderer = (async () => {
      throw new Error('server rejection: private source');
    }) as unknown as Parameters<typeof createFencePlugin>[0];
    const clientPlugin = createFencePlugin(
      clientRenderer,
      'rejected-client-fences',
    );
    const serverPlugin = createFencePlugin(
      serverRenderer,
      'rejected-server-fences',
    );
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(<Markdown plugins={[clientPlugin]}>{source}</Markdown>);
    expect(document.querySelector('pre')).toHaveTextContent('private source');
    expect(
      renderToString(<Markdown plugins={[serverPlugin]}>{source}</Markdown>),
    ).toContain('private source');
    await Promise.resolve();

    const warningText = warning.mock.calls.flat().map(String).join(' ');
    expect(warningText).toContain('rejected-client-fences');
    expect(warningText).toContain('rejected-server-fences');
    expect(warningText).not.toContain('private source');
    warning.mockRestore();
  });

  it('fails closed when a semantic renderer throws and keeps siblings', () => {
    const plugin = createFencePlugin(() => {
      throw new Error('broken semantic fence');
    });
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(
      <Markdown plugins={[plugin]}>
        {'Before.\n\n```diagram\nstart --> finish\n```\n\nAfter.'}
      </Markdown>,
    );

    expect(screen.getByText('Before.')).toBeInTheDocument();
    expect(document.querySelector('pre')).toHaveTextContent('start --> finish');
    expect(screen.getByText('After.')).toBeInTheDocument();
    warning.mockRestore();
  });

  it('falls back for descendant errors and during server rendering', () => {
    const plugin = createFencePlugin(() => <ThrowingFenceChild />);
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const source = '```diagram\nstart --> finish\n```';

    expect(
      renderToString(<Markdown plugins={[plugin]}>{source}</Markdown>),
    ).toContain('start --&gt; finish');
    render(<Markdown plugins={[plugin]}>{source}</Markdown>);
    expect(document.querySelector('pre')).toHaveTextContent('start --> finish');

    warning.mockRestore();
    error.mockRestore();
  });

  it('keeps no-plugin and nonmatching-plugin server output identical', () => {
    const plugin = createFencePlugin(() => <div>Semantic</div>);
    const source = '```text\nplain source\n```';

    expect(
      renderToString(<Markdown plugins={[plugin]}>{source}</Markdown>),
    ).toBe(renderToString(<Markdown>{source}</Markdown>));
  });

  it('preserves the first proposal and legacy language through node rebuilds', () => {
    const firstRender = vi.fn(() => <div>First renderer</div>);
    const secondRender = vi.fn(() => <div>Second renderer</div>);
    const first = createMarkdownPlugin({
      name: 'first-cpp-fences',
      apiVersion: 1,
      transform: createMarkdownSemanticFenceTransform({
        languages: ['c++'],
        render: firstRender,
      }),
    });
    const rebuild = createMarkdownPlugin({
      name: 'rebuild-code-nodes',
      apiVersion: 1,
      transform: root => ({
        ...root,
        children: root.children.map(node =>
          node.type === 'code'
            ? {
                type: 'code',
                lang: node.lang,
                ...(node.meta == null ? {} : {meta: node.meta}),
                value: node.value,
                ...(node.data == null ? {} : {data: node.data}),
                ...(node.position == null ? {} : {position: node.position}),
              }
            : node,
        ),
      }),
    });
    const tamper = createMarkdownPlugin({
      name: 'tamper-with-code-internals',
      apiVersion: 1,
      transform: root => ({
        ...root,
        children: root.children.map(node => {
          if (node.type !== 'code') {
            return node;
          }
          const forged = {...node};
          for (const symbol of Object.getOwnPropertySymbols(node)) {
            Object.defineProperty(forged, symbol, {
              configurable: true,
              enumerable: true,
              value: 'forged',
              writable: true,
            });
          }
          return forged;
        }),
      }),
    });
    const second = createMarkdownPlugin({
      name: 'second-cpp-fences',
      apiVersion: 1,
      transform: createMarkdownSemanticFenceTransform({
        languages: ['c++'],
        render: secondRender,
      }),
    });
    const plugins = [first, rebuild, tamper, second] as const;
    const source = '```c++\nint main() {}\n```';

    expect(parseMarkdown(source, {plugins})).toEqual([
      {type: 'codeblock', language: 'c', content: 'int main() {}'},
    ]);
    render(<Markdown plugins={plugins}>{source}</Markdown>);

    expect(screen.getByText('First renderer')).toBeInTheDocument();
    expect(firstRender).toHaveBeenCalledOnce();
    expect(secondRender).not.toHaveBeenCalled();
  });
});
