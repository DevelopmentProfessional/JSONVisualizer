export const graphDefinition = { name:'Spherical Math', description:'Geodesic calculations demo.', requiredInputs:[ {role:'features', name:'Features', required:true} ], optionalInputs:[] };
export async function render(container){ d3.select(container).selectAll('*').remove(); d3.select(container).append('div').style('color','#ccc').text('Geo spherical math placeholder'); }
