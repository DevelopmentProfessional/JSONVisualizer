applyTo: '**/*.ps1'
PowerShell Generation Contract (Segmentation of root CodeFormat)

EXECUTION HEADER
1. First line ALWAYS: `#requires -Version 5.1` (exception to global no-comment rule ONLY if user requests ability gating). Otherwise omit comments entirely.
2. If script needs execution policy bypass example, provide separate instruction text OUTSIDE the code block; do not embed Set-ExecutionPolicy commands inside script.

STYLE
1. Compact brace style: `function Get-Thing{param(... ) process{...}}` with closing braces sharing line of last statement when feasible.
2. No comments unless user explicitly requests (header rule above optional). If comments removed, also remove empty lines.
3. Function naming Verb-Noun PascalCase.
4. Parameters camelCase. Constants ALL_CAPS.
5. Use single quotes for static strings; double quotes only for interpolation or escape necessity.
6. No Write-Host / Write-Output for logging unless user asks. No Try/Catch.
7. Assume valid inputs; no defensive parameter checks beyond mandatory attributes.
8. Alphabetize function declarations within a file when order is not semantically constrained.

FORMAT
1. One space after commas; no extra spaces around = in parameter default values.
2. Pipe chains single line unless readability collapse would exceed 160 chars.
3. Avoid long splat constructs; inline arguments unless request differs.

EXAMPLE
function Get-Sum{param([int]$A,[int]$B) return ($A+$B)}

END PowerShell Contract.
