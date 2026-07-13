# StudyInk — How It Was Built (Developer Learning Guide)

> A complete walkthrough of every technology, concept, and design decision used to build StudyInk — a desktop PDF study editor.

---

## Table of Contents

1. [Tech Stack Overview](#1-tech-stack-overview)
2. [Electron Architecture](#2-electron-architecture)
3. [Project File Structure](#3-project-file-structure)
4. [PDF Rendering — pdf.js](#4-pdf-rendering--pdfjs)
5. [Annotation Drawing Engine](#5-annotation-drawing-engine)
6. [Shape Recognition Algorithm](#6-shape-recognition-algorithm)
7. [Graphics Tablet Support (Veikk S640)](#7-graphics-tablet-support-veikk-s640)
8. [CSS Design System](#8-css-design-system)
9. [Floating Draggable Toolbar](#9-floating-draggable-toolbar)
10. [PDF Export — pdf-lib](#10-pdf-export--pdf-lib)
11. [Auto-save & Persistence](#11-auto-save--persistence)
12. [Flashcard System](#12-flashcard-system)
13. [Full-text Search](#13-full-text-search)
14. [Theme System](#14-theme-system)
15. [Keyboard Shortcuts](#15-keyboard-shortcuts)
16. [Key Design Decisions](#16-key-design-decisions)

---

## 1. Tech Stack Overview

| Technology | Purpose | Why We Chose It |
|---|---|---|
| **Electron** | Desktop shell for HTML/JS apps | Cross-platform, gives file system access |
| **HTML5 Canvas** | Drawing surface for annotations | Native in browser, fast 2D graphics |
| **pdf.js** (Mozilla) | Render PDF pages to canvas | Industry standard, open source |
| **pdf-lib** | Create/modify/export PDFs | Pure JS, no server needed |
| **Pointer Events API** | Handle pen/stylus/mouse input | Supports pressure, tilt from graphics tablets |
| **Vanilla JS + CSS** | UI logic and styling | No framework needed for this scale |

---

## 2. Electron Architecture

Electron has **two processes**:

```
┌─────────────────────────────────────┐
│           MAIN PROCESS              │
│  (Node.js — has full OS access)     │
│                                     │
│  ● Creates windows                  │
│  ● Opens file dialogs               │
│  ● Reads/writes files to disk       │
│  ● Stores annotation data           │
└──────────────┬──────────────────────┘
               │ IPC (Inter-Process Communication)
               │ Messages sent via ipcMain / ipcRenderer
               ▼
┌─────────────────────────────────────┐
│         RENDERER PROCESS            │
│  (Chromium — browser-like sandbox)  │
│                                     │
│  ● Shows the UI (HTML/CSS/JS)       │
│  ● Renders the PDF                  │
│  ● Handles drawing/annotation       │
│  ● Talks to main via preload bridge │
└─────────────────────────────────────┘
```

### `main.js` — Main Process
Handles OS-level tasks:
```js
// Open a file dialog
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
  });
  return result.filePaths;
});
```

### `preload.js` — The Bridge
Uses **contextBridge** to safely expose main-process APIs to the renderer:
```js
contextBridge.exposeInMainWorld('studyAPI', {
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  readFile: (path) => ipcRenderer.invoke('read-file', path),
  // ...
});
```

### Why `contextIsolation: true`?
Security! Without it, a malicious PDF could run Node.js code. With it, the renderer can only use what `preload.js` explicitly exposes.

---

## 3. Project File Structure

```
d:\OWNPDF\
├── main.js               ← Electron main process (Node.js)
├── preload.js            ← IPC bridge (security layer)
├── package.json          ← Dependencies and scripts
├── node_modules/         ← Installed packages
│   ├── electron/
│   ├── pdf-lib/
│   └── electron-store/
└── renderer/             ← The frontend (HTML/CSS/JS)
    ├── index.html        ← App shell and all modals
    ├── index.css         ← Complete design system
    ├── app.js            ← Main orchestrator, wires everything together
    ├── theme.js          ← Color theme system
    ├── annotation.js     ← Drawing engine (pen, highlight, eraser, etc.)
    ├── shape-recognition.js ← Detects and corrects freehand shapes
    ├── pdf-viewer.js     ← PDF.js integration + page management
    ├── floating-toolbar.js  ← Draggable transparent toolbar
    ├── sidebar.js        ← File manager + page thumbnails
    ├── bookmarks.js      ← Bookmark system
    ├── search.js         ← Full-text search
    ├── flashcard.js      ← Flashcard Q&A system
    └── export.js         ← Export annotated PDF
```

---

## 4. PDF Rendering — pdf.js

**pdf.js** is Mozilla's open-source PDF renderer for the web.

### How PDF rendering works:

```js
// 1. Set the worker (runs PDF parsing in a background thread)
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/.../pdf.worker.min.js';

// 2. Load the PDF from binary data
const pdfDoc = await pdfjsLib.getDocument({ data: uint8Array }).promise;

// 3. Get a specific page (1-indexed)
const page = await pdfDoc.getPage(1);

// 4. Create a viewport (controls size/scale)
const viewport = page.getViewport({ scale: 1.5 });

// 5. Render the page onto an HTML canvas
const canvas = document.getElementById('my-canvas');
const ctx = canvas.getContext('2d');
canvas.width = viewport.width;
canvas.height = viewport.height;
await page.render({ canvasContext: ctx, viewport }).promise;
```

### Why do we use 3 canvases per page?

```
┌──────────────────────────┐
│   page-bg-canvas         │  ← Background pattern (lined, grid, dots)
│   page-pdf-canvas        │  ← PDF content rendered by pdf.js
│   page-annotation-canvas │  ← Drawings, highlights (user annotations)
└──────────────────────────┘
```

This separation lets us:
- Change backgrounds **without** re-rendering the PDF
- Export annotations **without** baking them into the PDF source
- Apply `destination-out` composite for erasing only the annotation layer

---

## 5. Annotation Drawing Engine

### How freehand drawing works:

```js
// 1. Listen for pointer events (works for mouse, touch, and stylus)
canvas.addEventListener('pointerdown', onPointerDown);
canvas.addEventListener('pointermove', onPointerMove);
canvas.addEventListener('pointerup', onPointerUp);

// 2. Collect points as the user draws
this.currentStroke.points.push({ x, y, pressure: e.pressure });

// 3. Draw smooth curves using Bézier curves
ctx.beginPath();
ctx.moveTo(points[0].x, points[0].y);
for (let i = 1; i < points.length - 1; i++) {
  const mx = (points[i].x + points[i+1].x) / 2;
  const my = (points[i].y + points[i+1].y) / 2;
  ctx.quadraticCurveTo(points[i].x, points[i].y, mx, my);
}
ctx.stroke();
```

### Why Quadratic Bézier curves instead of `lineTo()`?

A straight `lineTo()` creates a jagged, angular line:
```
Jagged:   p1---p2---p3---p4
Smooth:   p1 ~ p2 ~ p3 ~ p4  (curves through midpoints)
```

Bézier curves use control points between each pair of points, creating a beautifully smooth line even at low speeds.

### Highlighter tool trick:

```js
// Use 'multiply' composite operation to make highlights look transparent
// and stack naturally on top of existing text
ctx.globalCompositeOperation = 'multiply';
ctx.globalAlpha = 0.4;
ctx.lineWidth = 16; // Wide flat strokes
```

### Eraser trick:

```js
// 'destination-out' erases pixels from the canvas
ctx.globalCompositeOperation = 'destination-out';
ctx.beginPath();
ctx.arc(x, y, eraserRadius, 0, Math.PI * 2);
ctx.fill(); // "Fills" by removing pixels
```

---

## 6. Shape Recognition Algorithm

When you finish drawing, we analyze your stroke and snap it to a perfect shape.

### Ramer-Douglas-Peucker (RDP) Simplification

This algorithm removes unnecessary points from a complex path:

```
Original (100 points): ----~-~-~~~--~~---  (wobbly)
Simplified (3 points): ---               -  (almost straight!)
```

If after simplification you have ≤ 3 points → it's likely a **line**.

### Circle Detection

```js
function isCircle(pts) {
  const centroid = getCentroid(pts);
  const bb = getBoundingBox(pts);
  const rx = bb.w / 2, ry = bb.h / 2;

  // Check: are points roughly ON the ellipse?
  // Ellipse equation: (dx/rx)² + (dy/ry)² = 1
  let errors = 0;
  for (const p of pts) {
    const dx = (p.x - centroid.x) / rx;
    const dy = (p.y - centroid.y) / ry;
    if (Math.abs(dx*dx + dy*dy - 1) > 0.7) errors++;
  }
  return (errors / pts.length) < 0.4; // 60%+ points on ellipse → it's a circle
}
```

### Rectangle Detection

```js
// A rectangle stroke:
// 1. Has few "corners" after simplification (4-8 points)
// 2. Closes back near the starting point
// 3. Total stroke length ≈ perimeter of bounding box
```

---

## 7. Graphics Tablet Support (Veikk S640)

The Veikk S640 (and most Wacom-compatible tablets) communicate through the **Pointer Events API** — the same API as mouse/touch, but with extra data:

```js
canvas.addEventListener('pointermove', (e) => {
  const pressure = e.pressure;   // 0.0 to 1.0 (pen pressure)
  const tiltX = e.tiltX;         // -90 to 90 degrees
  const tiltY = e.tiltY;         // -90 to 90 degrees
  const pointerType = e.pointerType; // 'pen', 'mouse', or 'touch'
});
```

### Pressure-sensitive line width:

```js
// The line gets thicker when you press harder
ctx.lineWidth = Math.max(0.5, penSize * pressure * 2);
```

So a light tap gives a thin, delicate line, and pressing harder makes it wider — just like a real pen!

### Coalesced events for smoothness:

```js
// The browser may fire only 60 events/second, but the tablet sends 200+
// getCoalescedEvents() gives you ALL the in-between points
const coalesced = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
for (const ev of coalesced) {
  points.push({ x: ev.clientX, y: ev.clientY, pressure: ev.pressure });
}
```

This prevents gaps in fast strokes.

---

## 8. CSS Design System

### CSS Custom Properties (Variables)

Instead of hard-coding colors, we use variables. This makes **theming trivial**:

```css
:root {
  --accent: #6c63ff;         /* Main brand color */
  --bg-base: #0f1117;        /* Darkest background */
  --bg-surface: #161b27;     /* Cards, panels */
  --text-primary: #e8eaf0;   /* Main text */
}

/* Changing theme is just updating these variables: */
document.documentElement.style.setProperty('--accent', '#10b981');
```

### Glassmorphism (floating toolbar):

```css
.floating-toolbar {
  background: rgba(22, 27, 39, 0.25);  /* Semi-transparent */
  backdrop-filter: blur(12px);          /* Blurs content behind it */
  border: 1px solid rgba(255,255,255,0.08);
}
```

### Smooth animations:

```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

.welcome-content { animation: fadeInUp 0.6s ease; }
```

---

## 9. Floating Draggable Toolbar

### Making an element draggable:

```js
let startX, startY, startLeft, startTop;

handle.addEventListener('mousedown', (e) => {
  startX = e.clientX;
  startY = e.clientY;
  startLeft = parseInt(el.style.left);
  startTop = parseInt(el.style.top);

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
});

function onMove(e) {
  el.style.left = (startLeft + e.clientX - startX) + 'px';
  el.style.top  = (startTop  + e.clientY - startY) + 'px';
}

function onUp() {
  document.removeEventListener('mousemove', onMove);
  document.removeEventListener('mouseup', onUp);
}
```

**Key insight**: We listen on `document`, not the element itself, so dragging doesn't break if the mouse moves faster than the element.

### Auto-transparent when idle:

```css
.floating-toolbar {
  opacity: 0.18;  /* Nearly invisible by default */
  transition: opacity 250ms ease;
}
.floating-toolbar:hover { opacity: 1; } /* Fully visible on hover */
```

---

## 10. PDF Export — pdf-lib

**pdf-lib** lets you create and modify PDFs in pure JavaScript.

### Our export strategy:
1. For each page, merge all 3 canvases (bg + pdf + annotations) into one PNG
2. Embed that PNG as an image in a new PDF page
3. Save the PDF bytes

```js
const exportDoc = await PDFLib.PDFDocument.create();

// Convert merged canvas to PNG
const imgData = mergedCanvas.toDataURL('image/png');
const base64 = imgData.split(',')[1];
const imgBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

// Embed PNG into PDF
const pngImage = await exportDoc.embedPng(imgBytes);
const { width, height } = pngImage.scale(1);

// Add page and draw image
const page = exportDoc.addPage([width, height]);
page.drawImage(pngImage, { x: 0, y: 0, width, height });

// Get PDF bytes
const pdfBytes = await exportDoc.save();
```

---

## 11. Auto-save & Persistence

### How annotations are stored:

Annotations are **not stored inside the PDF** (that would require complex PDF editing). Instead they are stored as JSON files in the Electron app data directory:

```
C:\Users\[user]\AppData\Roaming\studyink\annotations\
  ├── [hash-of-file-path].json   ← annotation data for each PDF
```

### Auto-save with debouncing:

```js
// Debouncing: wait for 2 seconds of inactivity before saving
// This prevents saving on every single mouse move
scheduleAutoSave() {
  clearTimeout(this.autoSaveTimer);
  this.autoSaveTimer = setTimeout(() => this.autoSave(), 2000);
}
```

Every time you draw, the timer resets. Only after 2 seconds of no drawing does it save. This is efficient and prevents disk thrashing.

### Serialization format:

```json
{
  "annotations": {
    "0": {
      "strokes": [
        { "tool": "pen", "color": "#6c63ff", "size": 3, "points": [...], "recognized": null }
      ],
      "textBoxes": [{ "x": 100, "y": 200, "text": "My note", "fontSize": 14 }],
      "stickyNotes": [{ "x": 50, "y": 80, "text": "Remember this!", "color": "#ffd166" }]
    }
  },
  "bookmarks": [{ "page": 2, "label": "Important theorem", "id": 1234567890 }],
  "flashcards": [{ "id": 1234, "question": "What is X?", "answer": "X is...", "page": 2 }]
}
```

---

## 12. Flashcard System

Free-form Q&A cards with:
- **Question/Answer** (revealed on click)
- **Page link** (jump to the related lecture page)
- **Tags** (organize by chapter)

### Reveal animation trick:

```css
.fc-item-answer { display: none; }
.fc-item-answer.revealed { display: block; }
```

```js
const revealed = answerEl.classList.toggle('revealed');
revealBtn.textContent = revealed ? 'Hide answer ▴' : 'Reveal answer ▾';
```

---

## 13. Full-text Search

pdf.js can extract text from PDF pages:

```js
const page = await pdfDoc.getPage(pageNumber);
const textContent = await page.getTextContent();

// textContent.items is an array of text spans
const text = textContent.items.map(item => item.str).join(' ');

// Simple text search
const idx = text.toLowerCase().indexOf(query.toLowerCase());
```

**Limitation**: This only searches the original PDF text, not your handwritten annotations.

---

## 14. Theme System

### How CSS variable theming works:

Each theme is a simple object:
```js
const theme = {
  accent: '#00c9b7',
  accentLight: '#33d9c9',
  bg: '#0a1514',
  surface: '#0f201e'
};
```

Applying a theme:
```js
const root = document.documentElement; // the <html> element
root.style.setProperty('--accent', theme.accent);
root.style.setProperty('--bg-base', theme.bg);
// Every element using var(--accent) updates instantly!
```

No re-rendering needed. CSS variables cascade automatically.

---

## 15. Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+O` | Open PDF |
| `Ctrl+S` | Save/overwrite |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+F` | Search |
| `Ctrl++` | Zoom in |
| `Ctrl+-` | Zoom out |
| `Ctrl+Scroll` | Zoom with mouse wheel |
| `P` | Pen tool |
| `H` | Highlighter |
| `T` | Text box |
| `N` | Sticky note |
| `E` | Eraser |
| `V` | Select |
| `S` | Shape tool |
| `B` | Bookmark current page |
| `Esc` | Close all modals |

---

## 16. Key Design Decisions

### Why 3 separate canvases per page?

| Option | Problem |
|---|---|
| Single canvas | Can't change background without redrawing PDF; can't erase only annotations |
| 2 canvases | Background and PDF together means no background-only changes |
| **3 canvases** ✅ | Each layer is independent; maximum flexibility |

### Why Vanilla JS instead of React/Vue?

- No bundling complexity needed
- Electron already provides a V8 engine — no compilation step
- Direct DOM manipulation is fast enough for this scale
- Easier to learn and understand

### Why store annotations as JSON, not inside the PDF?

- PDF annotation format (PDF spec section 12.5) is extremely complex
- pdf-lib's annotation support is limited
- JSON is simple, fast, and easy to extend
- Can support features that PDF annotations don't (flashcards, bookmarks, etc.)
- **Trade-off**: The original PDF file stays clean; annotations only appear when opened in StudyInk

### Why use PointerEvents instead of MouseEvents?

- MouseEvents don't provide `pressure`, `tiltX`, `tiltY`
- PointerEvents work for mouse, touch, AND stylus with one unified API
- The Veikk S640 tablet sends pressure data through PointerEvents automatically

---

## Running the App

```powershell
# Navigate to project directory
cd d:\OWNPDF

# Start the app
npm start

# Or with dev logging
npm run dev
```

---

*Built with ❤️ for studying. Happy learning! 🎓*
