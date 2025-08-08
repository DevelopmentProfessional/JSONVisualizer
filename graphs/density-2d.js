// 2D Density (KDE) stub implementation
export const graphDefinition = {
  name: '2D Density',
  description: 'Kernel density estimation over 2D point cloud.',
  requiredInputs: [
    { role: 'x', name: 'X', description: 'X coordinate', required: true },
    { role: 'y', name: 'Y', description: 'Y coordinate', required: true }
  ],
  optionalInputs: [
    { role: 'value', name: 'Value', description: 'Weight value (default 1)' },
    { role: 'color', name: 'Color', description: 'Color variable or density mapping' }
  ]
};

export async function render(container, data, mappings, config={}) {
  const width = config.width || 800;
  const height = config.height || 500;
  const sel = d3.select(container);
  sel.selectAll('*').remove();
  sel.append('svg').attr('width', width).attr('height', height)
    .append('text').attr('x', 20).attr('y', 30).attr('fill','#ccc')
    .text('2D Density placeholder');
}
