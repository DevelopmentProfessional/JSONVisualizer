export const graphDefinition = { name:'Pack', description:'Circle packing layout.', requiredInputs:[ {role:'label', name:'Label', required:true} ], optionalInputs:[ {role:'value', name:'Value'} ] };
export async function render(container){ d3.select(container).selectAll('*').remove(); d3.select(container).append('div').style('color','#ccc').text('Pack layout placeholder'); }
