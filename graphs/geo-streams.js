export const graphDefinition = { name:'Geo Streams', description:'Demonstrates custom projection streams.', requiredInputs:[ {role:'features', name:'Features', required:true} ], optionalInputs:[] };
export async function render(container){ d3.select(container).selectAll('*').remove(); d3.select(container).append('div').style('color','#ccc').text('Geo streams placeholder'); }
