applyTo: '**'
Project code formatting contract. These rules MUST be followed exactly when generating or modifying code. Segment output by language where relevant.

## General
1. Only output code for the language section currently requested; do not mix languages in one fenced block.
2. Keep code minimal: remove redundant wrappers, unused variables, commented‑out code, and superfluous whitespace.
3. Prefer clarity over cleverness; explicit is better than implicit.

## HTML
Required minimal scaffold for any standalone page (always include Bootstrap, no inline styles / no custom <style> blocks):

```html
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width,initial-scale=1">
	<title>Title</title>
	<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
</head>
<body>
	<div class="container py-3">
		<!-- content -->
	</div>
	<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script>
</body>
</html>
```

Rules:
1. NO inline style attributes.
2. NO custom <style> sections (only Bootstrap classes). If truly necessary, ask first.
3. Use semantic elements (main, nav, header, footer, section) when they reduce div count.
4. Eliminate nested divs if they can be merged without changing layout.
5. Keep attribute order: id, class, data-*, aria-*, other.

## JavaScript
Core brace & block style:
1. Opening brace on SAME line as construct (function, if, else, for, while, switch, object method).
2. Single‑statement blocks MUST collapse to one line with braces: `if(cond){doThing();}` / `for(let i=0;i<n;i++){sum+=i;}`
3. Multi‑statement blocks:
```
if(cond){
	line1();
	line2();}
```
4. Function declarations / expressions:
```
function name(args){
	stmt1();
	stmt2();
}
```
5. Arrow functions: single expression => inline: `arr.map(x=>x*2)`; multi-line use braces & return if needed.
6. Trailing commas in multi-line object/array literals allowed; avoid in single-line literals.
7. Use const by default; let only if reassigned; never var.
8. Strict comparisons (=== / !==). No implicit truthy checks for numeric zero unless intentional.
9. Keep imports at top; group: builtin, external, internal; blank line between groups.
10. Order object keys logically (id, name, type, ...), not alphabetically if semantic order clearer.

Example mixed:
```
for(let i=0;i<items.length;i++){if(items[i].active){process(items[i]);}}

if(ready){
	init();
	start();}

function buildUser(u){
	return {id:u.id,name:u.name,role:u.role};
}
```

## JSON
1. Always valid, double quotes only.
2. No trailing commas.
3. Indent 2 spaces unless existing file dictates otherwise; keep consistency with touched file.
4. Sort top-level keys logically (metadata first: name, version, description, then config blocks).
5. Do not add comments (JSON, not JSON5) unless the file is explicitly documented as allowing them.

## Python
1. Follow PEP8 except: line length up to 100 chars permitted.
2. Use snake_case for functions/variables, PascalCase for classes, UPPER_CASE for constants.
3. Prefer f-strings. No bare except; catch specific exceptions or re-raise.
4. One import per line; group: stdlib, third-party, local (blank line between groups).
5. Docstring for public functions/classes (triple double quotes). One return path if readable.

## PowerShell
1. PascalCase for functions: Verb-Noun (Get-Items).
2. CamelCase for parameters; ALL_CAPS for constants.
3. Use single quotes for literal strings without interpolation; double quotes only if needed.
4. Functions structure:
```
function Get-Thing{
	param(
		[Parameter(Mandatory)][string]$Name
	)
	$result = Invoke-Something -Name $Name
	return $result
}
```
5. Pipe formatting: each pipe segment on its own line only if it enhances clarity; otherwise single line.

## CSS
1. Prefer Bootstrap utility classes; ONLY write custom CSS if utility classes cannot express requirement.
2. If custom CSS unavoidable, place in external .css file; never inline or <style> for new code.
3. Class naming: component: `c-`, utility extension: `u-`, state: `is-` / `has-`.
4. Order properties: layout (display, position, top/right/bottom/left, flex/grid), box (margin, padding, width/height), typography (font, line-height, color), visual (background, border, shadow), misc.
5. Avoid !important unless documenting reason adjacent.

## Enforcement Notes
1. When transforming existing code, retain prevailing indentation if inconsistent unless refactor is explicitly requested.
2. Reject or rewrite user-provided snippets that violate mandatory rules (HTML inline styles, wrong JS brace style) unless user explicitly opts out.
3. Always reflect back non-compliant constraints before proceeding if conflict arises.

## Quick Reference (One-Line Blocks)
JavaScript examples: `if(x){doIt();}` `for(let i=0;i<n;i++){total+=i;}` `while(ok){tick();}`

End of formatting contract.