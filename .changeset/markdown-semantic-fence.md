---
'@astryxdesign/core': patch
---

[feat] Markdown: add a semantic code-fence transform helper

Use `createMarkdownSemanticFenceTransform()` to render declared fenced-code languages semantically while preserving `components.code` precedence and Markdown's accessible, copyable `CodeBlock` fallback.

@cixzhang
