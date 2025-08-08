/**
 * World Map (point plot) Visualization
 * Renders country points using longitude/latitude with optional grouping/color and tooltips.
 */

export const graphDefinition = {
  name: 'World Map',
  type: 'world-map',
  description: 'Plots data points on a world map using longitude/latitude.',
  requiredInputs: [
    { role: 'longitude', name: 'Longitude', description: 'Longitude coordinate', required: true },
    { role: 'latitude', name: 'Latitude', description: 'Latitude coordinate', required: true },
    { role: 'label', name: 'Label', description: 'Point label (e.g., country name)', required: true }
  ],
  optionalInputs: [
    { role: 'value', name: 'Value', description: 'Numeric value (for size or color scaling)' },
    { role: 'color', name: 'Color', description: 'Color category or field' },
    { role: 'group', name: 'Group', description: 'Grouping field' },
    { role: 'capital', name: 'Capital City', description: 'Capital city name' },
    { role: 'income', name: 'Income Level', description: 'Income level classification' },
    { role: 'region', name: 'Region', description: 'Geographic region' }
  ]
};

export async function render(container, data, mappings, config = {}) {
  d3.select(container).selectAll('*').remove();
  if (!mappings.longitude || !mappings.latitude || !mappings.label) {
    throw new Error('World map requires longitude, latitude, and label mappings');
  }

  const defaultConfig = {
    width: 1100,
    height: 600,
    margin: { top: 10, right: 10, bottom: 10, left: 10 },
    pointRadius: 4
  };
  const finalConfig = { ...defaultConfig, ...config };

  const rows = Array.isArray(data) ? data : (data ? Object.values(data) : []);
  const points = rows.map(r => {
    const lon = parseFloat(getValueByPath(r, mappings.longitude));
    const lat = parseFloat(getValueByPath(r, mappings.latitude));
    const label = getValueByPath(r, mappings.label);
    if (isNaN(lon) || isNaN(lat) || label == null || label === '') return null;
    return {
      lon, lat, label,
      value: mappings.value ? parseFloat(getValueByPath(r, mappings.value)) : null,
      colorField: mappings.color ? getValueByPath(r, mappings.color) : null,
      group: mappings.group ? getValueByPath(r, mappings.group) : null,
      capital: mappings.capital ? getValueByPath(r, mappings.capital) : null,
      income: mappings.income ? getValueByPath(r, mappings.income) : null,
      region: mappings.region ? getValueByPath(r, mappings.region) : null,
      __raw: r
    };
  }).filter(Boolean);

  const svg = d3.select(container)
    .append('svg')
    .attr('width', finalConfig.width)
    .attr('height', finalConfig.height);

  const g = svg.append('g').attr('transform', `translate(${finalConfig.width/2},${finalConfig.height/2})`);

  const projection = d3.geoNaturalEarth1()
    .scale((finalConfig.width / 640) * 160)
    .translate([0,0]);

  const graticule = d3.geoGraticule10();
  const path = d3.geoPath(projection);

  // Background sphere (ocean)
  g.append('path')
    .attr('d', path({ type: 'Sphere' }))
    .attr('fill','#082032')
    .attr('stroke','#334');

  // Land polygons (optional) – attempts to load /data/world-geo.json (GeoJSON FeatureCollection)
  // If file missing, silently continue with points + graticule.
  try {
    const landResp = await fetch('../data/world-geo.json');
    if (landResp.ok) {
      const landGeo = await landResp.json();
      if (landGeo && landGeo.type === 'FeatureCollection') {
        g.append('g')
          .selectAll('path')
          .data(landGeo.features)
          .enter()
          .append('path')
          .attr('d', path)
          .attr('fill', '#1d3b53')
          .attr('stroke', '#2f5d7a')
          .attr('stroke-width', 0.4);
      }
    }
  } catch (e) {
    // Ignore if not present
    console.warn('world-geo.json not found or failed to load; showing points only');
  }

  // Graticule overlay
  g.append('path')
    .attr('d', path(graticule))
    .attr('fill','none')
    .attr('stroke','#345')
    .attr('stroke-width',0.4)
    .attr('stroke-opacity',0.7);

  const colorDomain = Array.from(new Set(points.map(p => p.colorField || p.income || p.region).filter(Boolean)));
  const colorScale = colorDomain.length ? d3.scaleOrdinal(d3.schemeTableau10).domain(colorDomain) : () => '#ffcc00';

  const radiusScale = d3.scaleSqrt()
    .domain(d3.extent(points.filter(p => p.value != null), d => Math.abs(p.value)) || [0,1])
    .range([2,12]);

  const ptGroup = g.append('g');
  ptGroup.selectAll('circle')
    .data(points)
    .enter()
    .append('circle')
    .attr('cx', d => projection([d.lon, d.lat])[0])
    .attr('cy', d => projection([d.lon, d.lat])[1])
    .attr('r', d => d.value != null ? radiusScale(Math.abs(d.value)) : finalConfig.pointRadius)
    .attr('fill', d => colorScale(d.colorField || d.income || d.region))
    .attr('stroke','#111')
    .attr('stroke-width',0.5)
    .append('title')
    .text(d => {
      const parts = [d.label];
      if (d.capital) parts.push('Capital: ' + d.capital);
      if (d.region) parts.push('Region: ' + d.region);
      if (d.income) parts.push('Income: ' + d.income);
      if (d.value != null && !Number.isNaN(d.value)) parts.push('Value: ' + d.value);
      return parts.join('\n');
    });

  if (colorDomain.length && colorDomain.length <= 12) {
    const legend = svg.append('g').attr('transform', 'translate(10,10)');
    colorDomain.forEach((c,i) => {
      const row = legend.append('g').attr('transform', `translate(0,${i*16})`);
      row.append('rect').attr('width',12).attr('height',12).attr('fill', colorScale(c));
      row.append('text').attr('x',16).attr('y',10).text(c).style('fill','#fff').style('font-size','11px');
    });
  }
}

function getValueByPath(obj, path) {
  if (!path || obj == null) return null;
  const attempt = (p) => {
    try {
      const clean = p.replace(/^\$\./,'');
      const parts = clean.split(/\./).filter(Boolean);
      let ref = obj;
      for (const part of parts) {
        if (ref == null) return null;
        if (Object.prototype.hasOwnProperty.call(ref, part)) {
          ref = ref[part];
        } else if (part.includes(':')) { const noNs = part.split(':').pop(); if (Object.prototype.hasOwnProperty.call(ref, noNs)) { ref = ref[noNs]; } else { return null; } }
        else { return null; }
      }
      return ref;
    } catch { return null; }
  };
  let val = attempt(path);
  if (val == null && path.includes(':')) { const stripped = path.split('.').map(seg => seg.includes(':') ? seg.split(':').pop() : seg).join('.'); val = attempt(stripped); }
  return val;
}
