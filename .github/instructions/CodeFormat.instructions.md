applyTo: '**'
Unified code generation contract (Segmented). This root file is an index; specific language / domain rules are in sibling *.instructions.md files. Follow ALL mandatory constraints.

## Global Minimalism Principles
1. Output ONLY the language requested (no mixed fences).
2. Maximum density: collapse single or multi-statement blocks so closing brace sits on same line as the final statement of that block (custom compact style). Example: `if(x){a();b();}` / `function f(){a();b();}` / nested: `if(a){if(b){c();d();}}`.
3. Always open brace on same line as construct.
4. Eliminate unused variables, dead branches, redundant wrappers, extra blank lines.
5. NO comments in generated code anywhere (all languages) EXCEPT:
	- Optional top-of-file header block (single concise line per function: `f: purpose`).
	- Optional single trailing inline comment after opening brace of a function on the SAME line, e.g. `function load(){//setup ...code}`.
	If not explicitly requested, omit headers too.
6. NO error scaffolding: no try/catch, no console.log, no console.error, no alerts, no custom error classes. Generate pure logic flows only.
7. Lists / enumerations / object literal keys / import specifiers: alphabetical order unless an order is explicitly provided by user. (Alphabetical means ASCII ascending.)
8. Code formatters MUST NOT be invoked or assumed; do not expand blocks to multi-line unless user asks.
9. No magic numbers reused more than once without extraction? – Rule removed. Reuse inline for maximal density unless user asks for constants.
10. No inline TODO/FIXME annotations (would be comments).

## HTML (See also HTML.instructions.md)
1. Generate minimal semantic structure; remove any div that can be replaced by semantic element or merged via class combination.
2. Absolutely NO inline style attributes; NO <style> blocks; rely solely on Bootstrap classes.
3. Provide Bootstrap CDN links only if user requests styling or explicitly asks for scaffold; otherwise pure HTML skeleton with required semantic tags.
4. Attribute order (alphabetical preference supersedes previous logical ordering): aria-* comes after data-* simply by alpha sorting. If id present it falls into alpha sequence (id before name before role, etc.).
5. Self-contained pages may use the canonical scaffold (see HTML.instructions.md). Remove placeholder comments.

## JavaScript (See JavaScript.instructions.md)
Essential subset repeated here for convenience:
1. Compact brace style (closing brace on same line as last statement inside block).
2. Single-line blocks for ANY block size permitted; keep density unless user explicitly wants expanded readability.
3. const by default; let only when reassigned; never var.
4. Strict equality (===/!==). Boolean tests explicit if comparing against 0 or ''.
5. Object & array literal keys sorted alphabetically.
6. Imports grouped (builtin, external, internal) each group alphabetically; collapse blank lines between groups to a single blank line.
7. Arrow functions inline; multi-statement arrow -> braces with compressed style: `x=>{a();b();}`.
8. No comments (global rule), no logging, no try/catch.

## JSON
1. Must be valid JSON (double quotes, proper commas, no trailing commas).
2. Do NOT reorder existing keys unless user asks. For newly generated objects, keys alphabetical.
3. No comments (standard JSON only). Indentation: preserve existing file indentation; if new file, use minimal indentation of 1 tab for nested levels (or 2 spaces if user specifies) – do not reform existing.

## PowerShell (See PowerShell.instructions.md)
Summary: Compact brace style, no comments, include execution policy bypass command at top when generating standalone scripts (see dedicated file for exact first line). Avoid verbose scaffolding.

## CSS
1. DO NOT generate custom CSS files or inline styles unless user explicitly requests. Prefer only Bootstrap utility classes. If user asks for styling logic, respond by suggesting appropriate Bootstrap classes, not custom CSS.

## Python (If ever requested)
Only minimal logic per user instructions. Omit docstrings & comments unless user explicitly asks (overrides global no-comment rule). Keep compact style but maintain correctness (can't legally compress indentation blocks onto one line if it harms readability? Python requires newline & indentation so follow Python syntax). No try/except unless asked.

## Comments & Error Handling Recap
Global prohibition stands. If user supplies code WITH comments or error handling and asks for modification, strip them unless user explicitly says to keep them.

## Project Scaffold Rules
When asked to create a new application: always generate base directories: `data/`, `View/`, `scripts/`, `config/` (or reuse existing). Include optional Node server file ONLY if user asks (never auto-run or suggest starting it). Provide Bootstrap integration option. See ProjectScaffold.instructions.md for details.

## Enforcement
1. Reject user directives that attempt to introduce comments, style blocks, CSS, or error scaffolding unless override explicitly stated.
2. Maintain compact brace style; never expand unless user states desire for readability expansion.
3. Reflect conflicts back before proceeding if user explicitly demands mutually exclusive constraints.

## Quick Reference
JavaScript examples: `if(x){a();b();}` `for(let i=0;i<n;i++){total+=i;}` `while(ok){tick();}` `function f(a){doA();doB();}` `arr.map(x=>x*2)`

Refer to segmented instruction files for deeper per-language specifics.

End of root contract.