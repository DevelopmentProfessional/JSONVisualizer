// Heatmap stub implementation
export const graphDefinition = {
  name: 'Heatmap',
  description: 'Matrix of color-encoded values.',
  requiredInputs: [
    { role: 'x', name: 'X', description: 'Column/variable', required: true },
    { role: 'y', name: 'Y', description: 'Row/variable', required: true },
    { role: 'value', name: 'Value', description: 'Cell value', required: true }
  ],
  optionalInputs: [
    { role: 'color', name: 'Color', description: 'Color variable (default value)' }
  ]
};

export async function render(container, data, mappings, config={}) {
  const width = config.width || 800;
  const height = config.height || 500;
  const sel = d3.select(container);
  sel.selectAll('*').remove();
  sel.append('svg').attr('width', width).attr('height', height)
    .append('text').attr('x', 20).attr('y', 30).attr('fill','#ccc')
    .text('Heatmap placeholder');
}
