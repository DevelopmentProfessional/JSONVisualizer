// Density Estimation (d3-contour / KDE) stub
export const graphDefinition = {
  name: 'Density Estimation',
  description: '2D point density contours / heatmap.',
  requiredInputs: [
    { role: 'x', name: 'X', required: true },
    { role: 'y', name: 'Y', required: true }
  ],
  optionalInputs: [ { role: 'weight', name: 'Weight' } ]
};
export async function render(container,data,mappings,config={}) {
  const w = config.width||800, h = config.height||500;
  d3.select(container).selectAll('*').remove();
  const root = d3.select(container).append('svg').attr('width',w).attr('height',h);
  root.append('text').attr('x',20).attr('y',30).attr('fill','#ccc').text('Density Estimation placeholder');
}
