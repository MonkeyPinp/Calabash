import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';

// React Flow uses ResizeObserver to measure nodes before drawing edges.
// Fire asynchronously so it runs after React's initial render completes.
global.ResizeObserver = class ResizeObserver {
  private cb: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) { this.cb = cb; }
  observe(target: Element) {
    queueMicrotask(() => {
      this.cb(
        [{
          target,
          contentRect: { width: 120, height: 40, top: 0, left: 0, right: 120, bottom: 40, x: 0, y: 0 } as DOMRectReadOnly,
          borderBoxSize:             [{ blockSize: 40, inlineSize: 120 }],
          contentBoxSize:            [{ blockSize: 40, inlineSize: 120 }],
          devicePixelContentBoxSize: [{ blockSize: 40, inlineSize: 120 }],
        }],
        this,
      );
    });
  }
  unobserve() {}
  disconnect() {}
};

// React Flow reads getBoundingClientRect for handle/viewport math.
Element.prototype.getBoundingClientRect = () => ({
  x: 0, y: 0, width: 120, height: 40,
  top: 0, left: 0, right: 120, bottom: 40,
  toJSON() { return this; },
});

// React Flow uses DOMMatrixReadOnly for viewport transforms; jsdom lacks it.
if (!window.DOMMatrixReadOnly) {
  // @ts-expect-error - jsdom stub
  window.DOMMatrixReadOnly = class DOMMatrixReadOnly {
    m41 = 0; m42 = 0; a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    constructor(_init?: string | number[]) {}
    toJSON() { return {}; }
    transformPoint(p?: DOMPointInit) { return { x: p?.x ?? 0, y: p?.y ?? 0, z: 0, w: 1 }; }
  };
}
if (!window.DOMMatrix) {
  // @ts-expect-error - jsdom stub
  window.DOMMatrix = window.DOMMatrixReadOnly;
}
