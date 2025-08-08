/**
 * copy-d3.js
 * Vendors required d3 libraries (d3 core + d3-geo-projection) into /vendor
 * to avoid serving directly from node_modules and prevent MIME/type issues.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const vendorRoot = path.join(root, 'vendor');
const libs = [
	{ pkg: 'd3', dist: 'dist', files: ['d3.min.js', 'd3.js', 'LICENSE'] },
	{ pkg: 'd3-geo-projection', dist: 'dist', files: ['d3-geo-projection.min.js', 'd3-geo-projection.js', 'LICENSE'] }
];

function ensureDir(dir){ if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }
function copyIfExists(src, dest){
	if(fs.existsSync(src)) {
		fs.copyFileSync(src, dest);
		console.log('[vendor] copied', path.relative(root, dest));
	}
}

function vendor(){
	ensureDir(vendorRoot);
	libs.forEach(lib => {
		const srcBase = path.join(root, 'node_modules', lib.pkg, lib.dist);
		const destBase = path.join(vendorRoot, lib.pkg);
		ensureDir(destBase);
		lib.files.forEach(f => copyIfExists(path.join(srcBase, f), path.join(destBase, f)));
		// Add README
		const readme = path.join(destBase, 'README.vendored.txt');
		if(!fs.existsSync(readme)) {
			fs.writeFileSync(readme, `${lib.pkg} files vendored from node_modules/${lib.pkg}/${lib.dist}\n`);
		}
	});
}

try {
	vendor();
} catch (e) {
	console.error('Failed to vendor d3 libraries:', e);
	process.exitCode = 1;
}

