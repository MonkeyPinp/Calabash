/**
 * Fruchterman–Reingold force-directed graph layout.
 * Pure function — no external deps. ~100 iterations converge well for ≤200 nodes.
 */

interface FRNode {
  id: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
}

export function computeForceLayout(
  nodeIds: string[],
  edges: { source: string; target: string }[],
  canvasWidth = 900,
  canvasHeight = 700,
): Map<string, { x: number; y: number }> {
  const N = nodeIds.length;
  if (N === 0) return new Map();
  if (N === 1) return new Map([[nodeIds[0], { x: 0, y: 0 }]]);

  // k = ideal spring length (area / node count heuristic)
  const area = canvasWidth * canvasHeight;
  const k = 0.85 * Math.sqrt(area / N);

  // Initialise on a circle so the result is deterministic
  const r = Math.min(canvasWidth, canvasHeight) * 0.35;
  const nodes: FRNode[] = nodeIds.map((id, i) => {
    const angle = (2 * Math.PI * i) / N;
    return { id, x: Math.cos(angle) * r, y: Math.sin(angle) * r, dx: 0, dy: 0 };
  });

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const links = edges
    .map((e) => [byId.get(e.source), byId.get(e.target)] as const)
    .filter((p): p is [FRNode, FRNode] => p[0] != null && p[1] != null);

  let temperature = canvasWidth / 8;
  const cooling = 0.94;

  for (let iter = 0; iter < 120; iter++) {
    // Reset displacement
    for (const v of nodes) { v.dx = 0; v.dy = 0; }

    // Repulsive forces between every pair
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const v = nodes[i], u = nodes[j];
        const ddx = v.x - u.x || 0.01;
        const ddy = v.y - u.y || 0.01;
        const dist = Math.sqrt(ddx * ddx + ddy * ddy);
        const rep = (k * k) / dist;
        v.dx += (ddx / dist) * rep;
        v.dy += (ddy / dist) * rep;
        u.dx -= (ddx / dist) * rep;
        u.dy -= (ddy / dist) * rep;
      }
    }

    // Attractive forces along edges
    for (const [v, u] of links) {
      const ddx = v.x - u.x;
      const ddy = v.y - u.y;
      const dist = Math.sqrt(ddx * ddx + ddy * ddy) || 0.01;
      const att = (dist * dist) / k;
      v.dx -= (ddx / dist) * att;
      v.dy -= (ddy / dist) * att;
      u.dx += (ddx / dist) * att;
      u.dy += (ddy / dist) * att;
    }

    // Apply displacement, capped by temperature
    for (const v of nodes) {
      const disp = Math.sqrt(v.dx * v.dx + v.dy * v.dy) || 0.01;
      v.x += (v.dx / disp) * Math.min(disp, temperature);
      v.y += (v.dy / disp) * Math.min(disp, temperature);
    }

    temperature *= cooling;
  }

  return new Map(nodes.map((n) => [n.id, { x: Math.round(n.x), y: Math.round(n.y) }]));
}
