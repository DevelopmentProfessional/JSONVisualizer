export const graphDefinition = { name:'Cluster', description:'Dendrogram cluster layout.', requiredInputs:[ {role:'label', name:'Label', required:true} ], optionalInputs:[ {role:'value', name:'Value'} ] };
export async function render(container){ d3.select(container).selectAll('*').remove(); d3.select(container).append('div').style('color','#ccc').text('Cluster layout placeholder'); }
