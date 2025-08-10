applyTo: '**/*.html'
HTML Generation Contract (Segmentation of root CodeFormat)

MANDATORY RULES
1. Minimal structure. Only include Bootstrap CDN links if user asks for styling or a full page scaffold.
2. No inline styles. No <style> tags. No custom CSS generation.
3. Prefer semantic elements (header, main, nav, section, footer) over generic divs. Merge adjacent containers where classes can coexist.
4. Attribute ordering: strictly alphabetical by attribute name.
5. Remove placeholder comments; global no-comment rule applies.
6. Collapse empty elements to `<tag></tag>` form (no self-closing for non-void elements).
7. Script tags placed at end of body unless user specifies otherwise.
8. When generating a full page scaffold on request, use:
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width,initial-scale=1">
	<title>Title</title>
	<link crossorigin="anonymous" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" rel="stylesheet">
</head>
<body>
	<main class="container py-3"></main>
	<script crossorigin="anonymous" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
9. Avoid redundant nesting: if a single element can hold multiple Bootstrap utility classes that were previously split, combine them.
10. Forms: use label elements directly associated with inputs (for and id) but no extra descriptive comments.

ENFORCEMENT
Reject attempts to introduce inline styles or style blocks unless user explicitly overrides. Apply compactness: remove blank lines unless they disambiguate structural sections.

END HTML Contract.
