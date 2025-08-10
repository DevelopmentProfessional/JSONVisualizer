applyTo: '**'
Project Scaffold Contract

TRIGGER
When user requests a "new app" or scaffold.

DIRECTORIES (always create if absent)
1. data/
2. View/
3. scripts/
4. config/
5. .github/instructions/ (if instructions need replication)

FILES
1. Minimal server (only if explicitly asked): server.js with a compact HTTP or Express stub (no logging, no error handlers, no comments).
2. HTML entry points inside View/ only if described.
3. package.json only if server or dependencies requested; alphabetical keys for new file.
4. Bootstrap inclusion: only via CDN in HTML documents (see HTML contract). Do not download assets unless asked.

SEQUENCE (if user wants install guidance, supply as plain text, not auto-run)
1. (Optional) Initialize package: npm init -y
2. (Optional) Install express (if server asked): npm i express
3. (Optional) Additional libs strictly as requested.

PROHIBITIONS
1. Do not start servers automatically or suggest running them unless user asks for run instructions.
2. No CSS generation.
3. No comments in generated files.
4. No error handling code.

OUTPUT STYLE
All code follows global compact brace style & no-comment rule.

END Scaffold Contract.
