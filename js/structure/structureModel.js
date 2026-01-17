export class Vertex {
  constructor(index, label = null) {
    this.id = `V:${index}`;
    this.index = index;
    this.label = label;
    this.edges = [];
    this.faces = [];
  }
}

export class Edge {
  constructor(a, b) {
    const i1 = Math.min(a, b);
    const i2 = Math.max(a, b);
    this.id = `E:${i1}${i2}`;
    this.vertices = [`V:${i1}`, `V:${i2}`];
    this.faces = [];
    this.snapPoints = [];
  }
}

export class Face {
  constructor(indices) {
    this.id = `F:${indices.join('')}`;
    this.vertices = indices.map(i => `V:${i}`);
    this.edges = [];
    this.adjacentFaces = [];
  }
}

const DEFAULT_EDGE_PAIRS = [
  [0, 1], [1, 2], [2, 3], [3, 0],
  [4, 5], [5, 6], [6, 7], [7, 4],
  [0, 4], [1, 5], [2, 6], [3, 7]
];

const DEFAULT_FACES = [
  [0, 3, 2, 1],
  [4, 5, 6, 7],
  [0, 1, 5, 4],
  [2, 3, 7, 6],
  [1, 2, 6, 5],
  [0, 4, 7, 3]
];

function resolveVertexLabel(index, labelMap, fallbackLabelMap) {
  if (labelMap && labelMap[`V:${index}`]) return labelMap[`V:${index}`];
  if (fallbackLabelMap && fallbackLabelMap[index]) return fallbackLabelMap[index];
  return null;
}

function createDefaultEdgeSnapPoints(edgeId) {
  return [
    {
      edgeId,
      ratio: { numerator: 1, denominator: 2 },
      snapId: `${edgeId}@1/2`
    }
  ];
}

export function buildCubeStructure({ indexMap, labelMap = null, fallbackLabelMap = null } = {}) {
  const indices = indexMap
    ? Object.keys(indexMap).map(Number).sort((a, b) => a - b)
    : Array.from({ length: 8 }, (_, i) => i);

  const vertices = indices.map(i => new Vertex(i, resolveVertexLabel(i, labelMap, fallbackLabelMap)));
  const vertexMap = new Map(vertices.map(v => [v.id, v]));

  const edges = DEFAULT_EDGE_PAIRS.map(([a, b]) => new Edge(a, b));
  const edgeMap = new Map(edges.map(e => [e.id, e]));

  const faces = DEFAULT_FACES.map(indices => new Face(indices));
  const faceMap = new Map(faces.map(f => [f.id, f]));

  edges.forEach(edge => {
    edge.snapPoints = createDefaultEdgeSnapPoints(edge.id);
    edge.vertices.forEach(vertexId => {
      const vertex = vertexMap.get(vertexId);
      if (vertex && !vertex.edges.includes(edge.id)) vertex.edges.push(edge.id);
    });
  });

  faces.forEach(face => {
    const faceVertexIndices = face.vertices.map(id => Number(id.split(':')[1]));
    const faceEdges = [];
    for (let i = 0; i < faceVertexIndices.length; i++) {
      const a = faceVertexIndices[i];
      const b = faceVertexIndices[(i + 1) % faceVertexIndices.length];
      const edgeId = `E:${Math.min(a, b)}${Math.max(a, b)}`;
      if (edgeMap.has(edgeId)) faceEdges.push(edgeId);
    }
    face.edges = faceEdges;
    face.vertices.forEach(vertexId => {
      const vertex = vertexMap.get(vertexId);
      if (vertex && !vertex.faces.includes(face.id)) vertex.faces.push(face.id);
    });
    face.edges.forEach(edgeId => {
      const edge = edgeMap.get(edgeId);
      if (edge && !edge.faces.includes(face.id)) edge.faces.push(face.id);
    });
  });

  edges.forEach(edge => {
    if (edge.faces.length < 2) return;
    const [f0, f1] = edge.faces;
    const face0 = faceMap.get(f0);
    const face1 = faceMap.get(f1);
    if (face0 && !face0.adjacentFaces.includes(f1)) face0.adjacentFaces.push(f1);
    if (face1 && !face1.adjacentFaces.includes(f0)) face1.adjacentFaces.push(f0);
  });

  return {
    indexMap: indexMap || null,
    vertices,
    edges,
    faces,
    vertexMap,
    edgeMap,
    faceMap,
    labelMap: labelMap || null
  };
}

export function applyVertexLabelMap(structure, labelMap, fallbackLabelMap = null) {
  if (!structure || !structure.vertices) return;
  structure.labelMap = labelMap || null;
  structure.vertices.forEach(vertex => {
    const index = vertex.index;
    vertex.label = resolveVertexLabel(index, labelMap, fallbackLabelMap);
  });
}
