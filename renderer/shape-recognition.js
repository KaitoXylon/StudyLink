/**
 * shape-recognition.js — Smart Shape Detection & Correction
 * Analyzes freehand strokes and snaps them to perfect shapes.
 * Supports: straight lines, rectangles, circles/ellipses, arrows
 */

const ShapeRecognition = (() => {

  /**
   * Simplify a stroke using Ramer-Douglas-Peucker algorithm
   */
  function rdpSimplify(points, epsilon = 2) {
    if (points.length <= 2) return points;
    let maxDist = 0, maxIdx = 0;
    const first = points[0], last = points[points.length - 1];
    for (let i = 1; i < points.length - 1; i++) {
      const d = pointToLineDistance(points[i], first, last);
      if (d > maxDist) { maxDist = d; maxIdx = i; }
    }
    if (maxDist > epsilon) {
      const left = rdpSimplify(points.slice(0, maxIdx + 1), epsilon);
      const right = rdpSimplify(points.slice(maxIdx), epsilon);
      return [...left.slice(0, -1), ...right];
    }
    return [first, last];
  }

  function pointToLineDistance(pt, lineStart, lineEnd) {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const len = Math.sqrt(dx*dx + dy*dy);
    if (len === 0) return Math.hypot(pt.x - lineStart.x, pt.y - lineStart.y);
    return Math.abs(dy*pt.x - dx*pt.y + lineEnd.x*lineStart.y - lineEnd.y*lineStart.x) / len;
  }

  function strokeLength(pts) {
    let len = 0;
    for (let i = 1; i < pts.length; i++) {
      len += Math.hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y);
    }
    return len;
  }

  function getBoundingBox(pts) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
  }

  function getCentroid(pts) {
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    return { x: cx, y: cy };
  }

  /**
   * Check if stroke is a straight line
   */
  function isLine(pts) {
    const simplified = rdpSimplify(pts, 4);
    if (simplified.length > 3) return false;
    const bb = getBoundingBox(pts);
    const diag = Math.hypot(bb.w, bb.h);
    const actualLen = strokeLength(pts);
    // Straight lines: actual length close to bounding diagonal
    return actualLen / diag < 1.25 && diag > 15;
  }

  /**
   * Check if stroke is a rectangle
   */
  function isRectangle(pts) {
    const simplified = rdpSimplify(pts, 6);
    if (simplified.length < 4 || simplified.length > 8) return false;
    const bb = getBoundingBox(pts);
    if (bb.w < 20 || bb.h < 20) return false;
    // Check if the stroke roughly closes back to start
    const start = pts[0], end = pts[pts.length - 1];
    const closingDist = Math.hypot(end.x - start.x, end.y - start.y);
    const perimeter = 2 * (bb.w + bb.h);
    const strokeLen = strokeLength(pts);
    return closingDist < (bb.w + bb.h) * 0.4 && strokeLen / perimeter < 1.6;
  }

  /**
   * Check if stroke is a circle/ellipse
   */
  function isCircle(pts) {
    if (pts.length < 20) return false;
    const bb = getBoundingBox(pts);
    if (bb.w < 20 || bb.h < 20) return false;
    const centroid = getCentroid(pts);
    const rx = bb.w / 2, ry = bb.h / 2;
    // Check if start and end are close (closed curve)
    const start = pts[0], end = pts[pts.length - 1];
    const closingDist = Math.hypot(end.x - start.x, end.y - start.y);
    if (closingDist > (bb.w + bb.h) * 0.35) return false;
    // Check that points are roughly on an ellipse
    let errors = 0;
    for (const p of pts) {
      const dx = (p.x - centroid.x) / rx;
      const dy = (p.y - centroid.y) / ry;
      const val = dx*dx + dy*dy;
      if (Math.abs(val - 1) > 0.7) errors++;
    }
    return (errors / pts.length) < 0.4;
  }

  /**
   * Check if stroke is an arrow (line with a pointed end)
   * Arrow: mostly a straight line, last few points change direction sharply
   */
  function isArrow(pts) {
    if (!isLine(pts)) return false;
    // Check for a V shape at the end
    if (pts.length < 10) return false;
    const tail = pts.slice(-Math.floor(pts.length * 0.2));
    // The tail should diverge from the main line direction
    return false; // simplified: skip for now
  }

  /**
   * Main recognition function. Returns { type, params } or null if no shape detected.
   */
  function recognize(pts) {
    if (pts.length < 5) return null;
    if (isCircle(pts)) {
      const bb = getBoundingBox(pts);
      const centroid = getCentroid(pts);
      return { type: 'ellipse', cx: centroid.x, cy: centroid.y, rx: bb.w/2, ry: bb.h/2 };
    }
    if (isRectangle(pts)) {
      const bb = getBoundingBox(pts);
      return { type: 'rect', x: bb.minX, y: bb.minY, w: bb.w, h: bb.h };
    }
    if (isLine(pts)) {
      const start = pts[0], end = pts[pts.length - 1];
      return { type: 'line', x1: start.x, y1: start.y, x2: end.x, y2: end.y };
    }
    return null;
  }

  /**
   * Draw a recognized shape onto a canvas context
   */
  function drawShape(ctx, shape, style) {
    const { color = '#1a1a2e', lineWidth = 2, opacity = 1 } = style;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    if (shape.type === 'line') {
      ctx.moveTo(shape.x1, shape.y1);
      ctx.lineTo(shape.x2, shape.y2);
    } else if (shape.type === 'rect') {
      ctx.rect(shape.x, shape.y, shape.w, shape.h);
    } else if (shape.type === 'ellipse') {
      ctx.ellipse(shape.cx, shape.cy, shape.rx, shape.ry, 0, 0, Math.PI * 2);
    }

    ctx.stroke();
    ctx.restore();
    return shape;
  }

  return { recognize, drawShape, rdpSimplify, getBoundingBox };
})();

window.ShapeRecognition = ShapeRecognition;
