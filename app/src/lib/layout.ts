/**
 * Improved Fruchterman–Reingold layout with:
 * - Larger ideal spring length (respects node footprint)
 * - Gravity towards centre (prevents disconnected components drifting apart)
 * - Strong anti-overlap repulsion
 * - Directional bias for directed edges (source floats up, target down)
 */

interface FRNode {
  id: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
}

export interface LayoutEdge {
  source: string;
  target: string;
  directed?: boolean;
}

export interface LayoutPoint {
  x: number;
  y: number;
}

// Approximate rendered node size
const NODE_W = 180;
const NODE_H = 80;
const RENDERED_NODE_DIAGONAL = Math.sqrt(NODE_W * NODE_W + NODE_H * NODE_H);
// Minimum centre-to-centre distance before anti-overlap kicks in.
// The rendered node diagonal is about 197px; 240px leaves a readable gap.
export const MIN_LAYOUT_NODE_DISTANCE = Math.ceil(RENDERED_NODE_DIAGONAL * 1.22);
const CROSSING_WEIGHT = 1_000_000;
const EPSILON = 0.0001;

function orientation(a: LayoutPoint, b: LayoutPoint, c: LayoutPoint): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function segmentsProperlyIntersect(a: LayoutPoint, b: LayoutPoint, c: LayoutPoint, d: LayoutPoint): boolean {
  const abC = orientation(a, b, c);
  const abD = orientation(a, b, d);
  const cdA = orientation(c, d, a);
  const cdB = orientation(c, d, b);

  // Only count proper crossings. Touching endpoints or collinear overlaps are not
  // visually harmful here, and adjacent edges are filtered before this runs.
  return abC * abD < -EPSILON && cdA * cdB < -EPSILON;
}

export function countLayoutEdgeCrossings(
  positions: Map<string, LayoutPoint>,
  edges: LayoutEdge[],
): number {
  let crossings = 0;
  for (let i = 0; i < edges.length; i++) {
    const first = edges[i];
    if (first.source === first.target) continue;
    const firstSource = positions.get(first.source);
    const firstTarget = positions.get(first.target);
    if (!firstSource || !firstTarget) continue;

    for (let j = i + 1; j < edges.length; j++) {
      const second = edges[j];
      if (second.source === second.target) continue;
      if (
        first.source === second.source ||
        first.source === second.target ||
        first.target === second.source ||
        first.target === second.target
      ) {
        continue;
      }

      const secondSource = positions.get(second.source);
      const secondTarget = positions.get(second.target);
      if (!secondSource || !secondTarget) continue;
      if (segmentsProperlyIntersect(firstSource, firstTarget, secondSource, secondTarget)) crossings += 1;
    }
  }
  return crossings;
}

function totalEdgeLength(positions: Map<string, LayoutPoint>, edges: LayoutEdge[]): number {
  return edges.reduce((total, edge) => {
    const source = positions.get(edge.source);
    const target = positions.get(edge.target);
    if (!source || !target) return total;
    return total + Math.hypot(source.x - target.x, source.y - target.y);
  }, 0);
}

function layoutScore(positions: Map<string, LayoutPoint>, edges: LayoutEdge[]): number {
  return countLayoutEdgeCrossings(positions, edges) * CROSSING_WEIGHT + totalEdgeLength(positions, edges);
}

export function getMinimumLayoutNodeDistance(positions: Map<string, LayoutPoint>): number {
  const points = [...positions.values()];
  if (points.length < 2) return Infinity;

  let min = Infinity;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      min = Math.min(min, Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y));
    }
  }
  return min;
}

export function separateLayoutNodes(
  positions: Map<string, LayoutPoint>,
  minDistance = MIN_LAYOUT_NODE_DISTANCE,
  maxPasses = 80,
): Map<string, LayoutPoint> {
  if (positions.size < 2) return positions;

  const entries: Array<[string, LayoutPoint]> = [...positions].map(([id, point]) => [id, { ...point }]);

  for (let pass = 0; pass < maxPasses; pass++) {
    let moved = false;

    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const a = entries[i][1];
        const b = entries[j][1];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist = Math.hypot(dx, dy);

        if (dist === 0) {
          const angle = ((i + 1) * 17 + (j + 1) * 31) % 360;
          dx = Math.cos((angle * Math.PI) / 180);
          dy = Math.sin((angle * Math.PI) / 180);
          dist = 1;
        }

        if (dist >= minDistance) continue;

        const push = (minDistance - dist) / 2;
        const nx = dx / dist;
        const ny = dy / dist;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
        moved = true;
      }
    }

    if (!moved) break;
  }

  return new Map(entries.map(([id, point]) => [id, { x: Math.round(point.x), y: Math.round(point.y) }]));
}

export function improveLayoutEdgeCrossings(
  positions: Map<string, LayoutPoint>,
  edges: LayoutEdge[],
  maxPasses = 8,
): Map<string, LayoutPoint> {
  if (positions.size < 4 || edges.length < 2) return positions;

  const next = new Map([...positions].map(([id, point]) => [id, { ...point }] as const));
  const ids = [...next.keys()];
  let bestScore = layoutScore(next, edges);

  for (let pass = 0; pass < maxPasses; pass++) {
    let improved = false;

    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = next.get(ids[i]);
        const b = next.get(ids[j]);
        if (!a || !b) continue;

        next.set(ids[i], b);
        next.set(ids[j], a);

        const score = layoutScore(next, edges);
        if (score + EPSILON < bestScore) {
          bestScore = score;
          improved = true;
        } else {
          next.set(ids[i], a);
          next.set(ids[j], b);
        }
      }
    }

    if (!improved) break;
  }

  return next;
}

export function computeForceLayout(
  nodeIds: string[],
  edges: LayoutEdge[],
  canvasWidth = 1400,
  canvasHeight = 1000,
): Map<string, LayoutPoint> {
  const N = nodeIds.length;
  if (N === 0) return new Map();
  if (N === 1) return new Map([[nodeIds[0], { x: 0, y: 0 }]]);

  // Ideal spring length — bounded so small graphs stay compact.
  // sqrt(area/N) is the classical FR value; we use a tighter multiplier for density.
  const area = canvasWidth * canvasHeight;
  const k = Math.min(
    MIN_LAYOUT_NODE_DISTANCE * 1.15,
    Math.max(MIN_LAYOUT_NODE_DISTANCE * 0.95, Math.sqrt(area / N) * 0.55),
  );

  // Initialise on a circle (deterministic)
  const r = Math.min(canvasWidth, canvasHeight) * 0.35;
  const nodes: FRNode[] = nodeIds.map((id, i) => {
    const angle = (2 * Math.PI * i) / N;
    return { id, x: Math.cos(angle) * r, y: Math.sin(angle) * r, dx: 0, dy: 0 };
  });

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const links = edges
    .map((e) => [byId.get(e.source), byId.get(e.target), e.directed ?? false] as const)
    .filter((p): p is [FRNode, FRNode, boolean] => p[0] != null && p[1] != null);

  let temperature = k * 1.2;
  const cooling = 0.92;
  // Gravity pulls nodes towards centre, stronger value = tighter cluster
  const gravity = 0.35;
  // Soft downward nudge for directed edges (source up, target down)
  const dirBias = k * 0.05;

  for (let iter = 0; iter < 200; iter++) {
    for (const v of nodes) { v.dx = 0; v.dy = 0; }

    // Repulsive forces between every pair
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const v = nodes[i], u = nodes[j];
        const ddx = v.x - u.x || 0.01;
        const ddy = v.y - u.y || 0.01;
        const dist = Math.sqrt(ddx * ddx + ddy * ddy);
        const safeDist = Math.max(dist, 1);
        const nx = ddx / safeDist, ny = ddy / safeDist;

        // Standard Coulomb repulsion
        let rep = (k * k) / safeDist;
        // Extra hard-shell repulsion inside the minimum distance to prevent crowding
        if (dist < MIN_LAYOUT_NODE_DISTANCE) {
          rep += ((MIN_LAYOUT_NODE_DISTANCE - dist) / MIN_LAYOUT_NODE_DISTANCE) * k * 4;
        }

        v.dx += nx * rep;
        v.dy += ny * rep;
        u.dx -= nx * rep;
        u.dy -= ny * rep;
      }
    }

    // Attractive forces along edges + soft directional bias for directed edges
    for (const [v, u, directed] of links) {
      const ddx = v.x - u.x;
      const ddy = v.y - u.y;
      const dist = Math.sqrt(ddx * ddx + ddy * ddy) || 0.01;
      const att = (dist * dist) / k;
      const nx = ddx / dist, ny = ddy / dist;
      v.dx -= nx * att;
      v.dy -= ny * att;
      u.dx += nx * att;
      u.dy += ny * att;
      // Gentle directional bias: source floats slightly up, target slightly down
      if (directed) {
        v.dy -= dirBias;
        u.dy += dirBias;
      }
    }

    // Gravity — quadratic so it becomes dominant far from origin
    for (const v of nodes) {
      v.dx -= v.x * gravity;
      v.dy -= v.y * gravity;
    }

    // Apply displacement, capped by temperature
    for (const v of nodes) {
      const disp = Math.sqrt(v.dx * v.dx + v.dy * v.dy) || 0.01;
      v.x += (v.dx / disp) * Math.min(disp, temperature);
      v.y += (v.dy / disp) * Math.min(disp, temperature);
    }

    temperature *= cooling;
  }

  const positions = new Map(nodes.map((n) => [n.id, { x: Math.round(n.x), y: Math.round(n.y) }]));
  return improveLayoutEdgeCrossings(separateLayoutNodes(positions), edges);
}
