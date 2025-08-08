// d3-shim.js
// Loads d3 via ESM (import map resolves 'd3') and assigns window.d3 for legacy modules.
import * as d3 from 'd3';
import * as d3GeoProjection from 'd3-geo-projection';

// Merge projection exports into d3 namespace (non-destructive)
Object.keys(d3GeoProjection).forEach(k => {
	if (!d3[k]) d3[k] = d3GeoProjection[k];
});

window.d3 = d3;
export default d3;
