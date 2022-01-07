import Ajax from 'core/ajax';

export const init = (params) => {
    setupSvg();
    var promises = Ajax.call([{
        methodname: 'block_availability_dependencies_fetch_course_modules_with_names_and_dependencies',
        args: {courseid: params}
     }]);

    promises[0].fail(ex => console.log(ex))
        .then(dependencies => {
            dependencies.forEach(d => {d.dep = JSON.parse(d.dep)});
            let simulation = generateSimulation(dependencies);
            display(simulation);
            rememberD3Selections();
            simulation.on('tick', tick);
            makeDraggable(simulation);
        });
};

/**
 * Make the svg as wide as the parent, height is width * 0.6, center viewBox.
 */
function setupSvg() {
    let svg = document.querySelector('svg');
    let width = svg.parentNode.clientWidth;
    let height = width * 0.6;
    d3.select('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', -width/2 + ' ' + -height/2 + ' ' + width + ' ' + height);
}

/**
 * Generate a simulation, using the nodes and edges (links)
 * extracted from json string representing the dependencies between course modules.
 * The nodes are indexed by the course module id.
 * @param {*} dependencies, modules
 * @returns 
 */
function generateSimulation(dependencies) {
    return d3.forceSimulation(dependencies)
        .force('charge', d3.forceManyBody().strength(-300))
        .force('link', d3.forceLink(computeEdges(dependencies)).id(d => d.id))
        .force('center', d3.forceCenter());
}

/**
 * Compute the edges (links) for d3-force
 * as an array of objects {source: cm_id, target: cm_id}.
 * 1) filter out all elements with no dependencies;
 * 2) filter out all dependencies that are not type: completion
 * 3) for each remaining produce an edge with source and target, collecting also the operator. 
 */ 
function computeEdges(dependencies) {
    return dependencies.filter(({id, name, dep}) => (dep !== null))
        .flatMap(({id, name, dep}) => {
            return dep.c.filter(x => x.type == 'completion').map(x => {return {target: id, source: x.cm, op: x.op}})
        });
}

/**
 * Use d3 to display nodes and edges (links).
 * The stroke-dasharray distingushes between the operator:
 * '&' (solid) - '|' dotted and all other cases dot-dash 
 * @param {*} simulation 
 */
function display(simulation) {
    displayEdges(simulation.force('link').links());
    displayNodesAndLabels(simulation.nodes());
}

function displayEdges(s_edges) {
    d3.select('svg g').selectAll('line').data(s_edges)
        .enter().append('line')
        .attr('stroke', 'lightgray')
        .attr('stroke-width', '2px')
        .attr('stroke-dasharray', x => (x.op == '&' ? '0 0' : (x.op == '|' ? '2 2' : '7 2 2 2')))
        .attr('marker-end', 'url(#arrow)');
}

function displayNodesAndLabels(s_nodes) {
    d3.select('svg g').selectAll('circle').data(s_nodes)
        .join('circle')
        .attr('fill', '#00a8d5')
        .attr('stroke', 'white')
        .attr('r', 5);
    d3.select('svg g').selectAll('text').data(s_nodes)
        .join('text')
        .attr('fill', 'darkgray')
        .attr('font-family', 'sans-serif')
        .attr('font-weight', 'bold')
        .attr('font-size', 'small');
}

let edges, nodes, labels;

function rememberD3Selections() {
    edges = d3.select('svg g').selectAll('line');
    nodes = d3.select('svg g').selectAll('circle');
    labels = d3.select('svg g').selectAll('text');
}

/**
 * Update the simulation.
 */
function tick() {
    nodes
        .attr('cx', n => n.x)
        .attr('cy', n => n.y);
    edges
        .attr('x1', e => e.source.x)
        .attr('y1', e => e.source.y)
        .attr('x2', e => e.target.x)
        .attr('y2', e => e.target.y);
    labels
        .attr('x', n => n.x + 5)
        .attr('y', n => n.y - 5)
        .text(n => n.name);

}

function makeDraggable(simulation) {
    nodes
        .call(d3.drag().on('drag',
            (event, n) => {
                n.fx = event.x;
                n.fy = event.y;
                simulation.alpha(1).restart();
            }))
}

