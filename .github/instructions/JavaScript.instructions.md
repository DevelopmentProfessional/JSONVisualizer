applyTo: '**/*.js'
JavaScript Generation Contract (Segmentation of root CodeFormat)

STYLE & STRUCTURE
1. Compact blocks: closing brace on same line as last statement of block.
2. Single-line permissible for any block length (density prioritized over conventional readability).
3. No comments. Optional function header map only if explicitly requested by user.
4. Use const; use let only if variable is reassigned; never var.
5. Alphabetical ordering:
   - Import groups: builtin, external, internal. Within each, alphabetize by module specifier.
   - Object literal keys & exported names: alphabetical.
   - Named import specifiers: alphabetical within braces: `import {A,B,C} from 'x'`.
6. No error handling scaffolding: no try/catch, no logging, no alerts, no console.* calls.
7. No defensive checks unless user asks; assume inputs are valid.
8. Arrow functions inline when single expression: `x=>x*2`. Multi-statement arrow: `x=>{a();b();}`.
9. Return early patterns allowed; do not add else after return.
10. Avoid creating intermediate variables if a direct expression suffices.
11. Prefer pure functions; if side effects required, keep them explicit and minimal.
12. JSON serialization/deserialization only if explicitly needed; do not add wrappers.
13. Strict equality (===/!==); no loose equality.
14. Avoid optional chaining unless it replaces multiple explicit checks concisely.
15. Modules default to ES module syntax (import/export) unless user states CommonJS requirement.

FORMAT
1. No automatic semicolon insertion reliance: end statements with semicolons.
2. Spaces: minimal; exactly one space after commas; none before parentheses in calls: `fn(x,y)`.
3. Ternaries allowed; nest only if each branch is a simple expression.
4. Do not expand objects/arrays across multiple lines unless required for nested literals readability; still keep closing brace with last entry line.

EXAMPLES
function add(a,b){return a+b;}
if(x){a();b();}
for(let i=0;i<n;i++){total+=i;}
const list=[1,2,3];
const obj={a:1,b:2,c:3};

ENFORCEMENT
Strip comments/error handling from user-provided snippets unless override stated.

END JavaScript Contract.
