// Word Cloud stub implementation
export const graphDefinition = {
  name: 'Word Cloud',
  description: 'Visual prominence of words sized by frequency/value.',
  requiredInputs: [
    { role: 'text', name: 'Text', description: 'Word/term', required: true },
    { role: 'value', name: 'Value', description: 'Frequency/value', required: true }
  ],
  optionalInputs: [
    { role: 'color', name: 'Color', description: 'Color variable' },
    { role: 'rotate', name: 'Rotate', description: 'Rotation variable/flag' }
  ]
};

export async function render(container, data, mappings, config={}) {
  const width = config.width || 800;
  const height = config.height || 500;
  const sel = d3.select(container);
  sel.selectAll('*').remove();
  sel.append('svg').attr('width', width).attr('height', height)
    .append('text').attr('x', 20).attr('y', 30).attr('fill','#ccc')
    .text('Word Cloud placeholder');
}
