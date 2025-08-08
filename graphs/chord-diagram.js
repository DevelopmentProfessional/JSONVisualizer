// Chord Diagram stub implementation
export const graphDefinition = {
  name: 'Chord Diagram',
  description: 'Matrix of flows between groups represented as chords.',
  requiredInputs: [
    { role: 'source', name: 'Source', description: 'Source group', required: true },
    { role: 'target', name: 'Target', description: 'Target group', required: true },
    { role: 'value', name: 'Value', description: 'Flow value', required: true }
  ],
  optionalInputs: [
    { role: 'color', name: 'Color', description: 'Group color variable' }
  ]
};

export async function render(container, data, mappings, config={}) {
  const width = config.width || 800;
  const height = config.height || 800;
  const sel = d3.select(container);
  sel.selectAll('*').remove();
  sel.append('svg').attr('width', width).attr('height', height)
    .append('text').attr('x', 20).attr('y', 30).attr('fill','#ccc')
    .text('Chord Diagram placeholder');
}
