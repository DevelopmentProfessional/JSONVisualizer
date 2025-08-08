/**
 * Line Chart Visualization
 * Supports single or multi-series line charts using mappings.
 */

export const graphDefinition = {
  name: 'Line Chart',
  type: 'line-chart',
  description: 'Line chart for temporal or ordered numeric data (supports multi-series via group role).',
  requiredInputs: [
    { role: 'x', name: 'X Value', description: 'X-axis value (typically time or category)', required: true },
    { role: 'y', name: 'Y Value', description: 'Y-axis numeric value', required: true }
  ],
  optionalInputs: [
    { role: 'group', name: 'Series Group', description: 'Field indicating series/group for multi-line' },
    { role: 'color', name: 'Color', description: 'Color field or constant color value' },
    { role: 'label', name: 'Label', description: 'Label for points or series' },
    { role: 'tooltip', name: 'Tooltip', description: 'Tooltip content field' },
    { role: 'strokeWidth', name: 'Stroke Width', description: 'Line stroke width (numeric)' }
  ]
};

export async function render(container, data, mappings, config = {}) {
  d3.select(container).selectAll('*').remove();
  if (!mappings.x || !mappings.y) {
    throw new Error('Line chart requires both "x" and "y" mappings');
  }
  const defaultConfig = {
    width: 900,
    height: 600,
    margin: { top: 30, right: 40, bottom: 50, left: 60 },
    pointRadius: 3,
    stroke: mappings.color || '#4ba3f2',
    strokeWidth: mappings.strokeWidth ? Number(mappings.strokeWidth) : 2,
    curve: d3.curveLinear
  };
  const finalConfig = { ...defaultConfig, ...config };
  const rows = Array.isArray(data) ? data : (data ? Object.values(data) : []);
  const xPath = mappings.x;
  const yPath = mappings.y;
  const groupPath = mappings.group || mappings.series; // backward compat
  const colorPath = mappings.color; // may point to field for ordinal colors
  const labelPath = mappings.label || mappings.tooltip;
  const parsed = rows.map((row, idx) => {
    const xRaw = getValueByPath(row, xPath);
    const yRaw = getValueByPath(row, yPath);
    if (xRaw == null || yRaw == null || yRaw === '') return null;
    const groupVal = groupPath ? getValueByPath(row, groupPath) : '_default';
    const colorVal = colorPath ? getValueByPath(row, colorPath) : null;
    const labelVal = labelPath ? getValueByPath(row, labelPath) : null;
    return { __row: row, xRaw, y: Number(yRaw), group: groupVal ?? '_default', color: colorVal, label: labelVal, order: idx };
  }).filter(d => d && !Number.isNaN(d.y));
  if (!parsed.length) {
    d3.select(container).append('div').style('color','orange').text('No valid data points for line chart');
    return;
  }
  const dateParsed = parsed.map(p => ({ ...p, xDate: tryParseDate(p.xRaw) }));
  const useDate = dateParsed.every(p => p.xDate instanceof Date && !isNaN(p.xDate));
  const finalData = dateParsed.map(p => ({ ...p, x: useDate ? p.xDate : p.xRaw }));
  const seriesMap = new Map();
  finalData.forEach(d => {
    if (!seriesMap.has(d.group)) seriesMap.set(d.group, []);
    seriesMap.get(d.group).push(d);
  });
  seriesMap.forEach(arr => {
    arr.sort((a,b) => {
      if (useDate) return a.x - b.x;
      const an = +a.x; const bn = +b.x; if (!isNaN(an) && !isNaN(bn)) return an - bn; return (''+a.x).localeCompare(''+b.x);
    });
  });
  const allPoints = Array.from(seriesMap.values()).flat();
  const xDomain = useDate ? d3.extent(allPoints, d => d.x) : Array.from(new Set(allPoints.map(d => d.x)));
  const yDomain = d3.extent(allPoints, d => d.y);
  const width = finalConfig.width - finalConfig.margin.left - finalConfig.margin.right;
  const height = finalConfig.height - finalConfig.margin.top - finalConfig.margin.bottom;
  const svg = d3.select(container).append('svg').attr('width', finalConfig.width).attr('height', finalConfig.height);
  const g = svg.append('g').attr('transform', `translate(${finalConfig.margin.left},${finalConfig.margin.top})`);
  const xScale = useDate ? d3.scaleTime().domain(xDomain).range([0, width]) : d3.scalePoint().domain(xDomain).range([0, width]).padding(0.5);
  const yScale = d3.scaleLinear().domain([Math.min(0, yDomain[0]), yDomain[1]]).nice().range([height, 0]);
  const colorScale = colorPath || groupPath ? d3.scaleOrdinal(d3.schemeTableau10).domain(Array.from(seriesMap.keys())) : () => finalConfig.stroke;
  const lineGen = d3.line().defined(d => d.y != null && !Number.isNaN(d.y)).x(d => xScale(d.x)).y(d => yScale(d.y)).curve(finalConfig.curve);
  const xAxis = useDate ? d3.axisBottom(xScale).ticks(width/100) : d3.axisBottom(xScale);
  g.append('g').attr('transform', `translate(0,${height})`).call(xAxis).selectAll('text').style('fill','#fff').style('font-size','11px');
  g.append('g').call(d3.axisLeft(yScale)).selectAll('text').style('fill','#fff').style('font-size','11px');
  g.selectAll('.domain, .tick line').style('stroke','#ccc');
  seriesMap.forEach((pts, key) => { g.append('path').datum(pts).attr('fill','none').attr('stroke', colorScale(key)).attr('stroke-width', finalConfig.strokeWidth).attr('d', lineGen); });
  const showPoints = parsed.length <= 200;
  if (showPoints) {
    g.selectAll('.lc-point').data(allPoints).enter().append('circle').attr('class','lc-point').attr('r', finalConfig.pointRadius).attr('cx', d => xScale(d.x)).attr('cy', d => yScale(d.y)).attr('fill', d => colorScale(d.group)).append('title').text(d => `${d.label || d.xRaw}: ${d.y}`);
  }
  if (seriesMap.size > 1) {
    const legend = svg.append('g').attr('transform', `translate(${finalConfig.margin.left},${finalConfig.margin.top - 10})`);
    let lx = 0; Array.from(seriesMap.keys()).forEach(k => { const gItem = legend.append('g').attr('transform', `translate(${lx},0)`); gItem.append('rect').attr('width',12).attr('height',12).attr('fill', colorScale(k)).attr('stroke','#fff'); gItem.append('text').attr('x',16).attr('y',10).text(k).style('fill','#fff').style('font-size','11px'); lx += 16 + gItem.node().getBBox().width + 12; });
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

function tryParseDate(v) {
  if (v == null) return null; if (v instanceof Date) return v; const d = new Date(v); if (!isNaN(d)) return d; return null;
}
