# 🎓 StudyInk

**StudyInk** is a powerful, lightweight desktop PDF study editor designed for students, researchers, and professionals. It provides a smooth, cross-platform environment for annotating, drawing, searching, and creating study materials directly on top of your PDFs.

Built with **Electron**, **HTML5 Canvas**, **pdf.js**, and **pdf-lib**, StudyInk operates entirely offline, keeping your documents and annotations private.

---

## ✨ Features

*   **✍️ Advanced Drawing Engine**: Smooth freehand pen strokes using Quadratic Bézier curves, transparent highlighting (`multiply` blend mode), and pixel-perfect erasing.
*   **📐 Shape Recognition**: Automatically detects and snaps freehand drawings into perfect geometric shapes (lines, circles, and rectangles) using the Ramer-Douglas-Peucker (RDP) algorithm.
*   **🖊️ Graphics Tablet Support**: Native pen pressure-sensitivity and tilt support for popular Wacom-compatible devices (like the Veikk S640) using the Pointer Events API.
*   **🎴 Flashcard System**: Build free-form Q&A flashcards tagged by chapter, linked directly to specific PDF pages for active recall study.
*   **🔍 Full-Text PDF Search**: Quickly locate keywords across your PDFs with direct navigation to search results.
*   **💾 Auto-Save & Persistence**: Annotations are serialized as clean JSON and automatically saved in the background with debouncing to prevent disk thrashing.
*   **🗂️ Clean Exports**: Merges backgrounds, original PDF content, and hand-drawn annotations into a fresh PDF file.
*   **🎨 Custom UI & Themes**: Responsive floating toolbar with glassmorphism styling and a system-wide theme selector using dynamic CSS custom properties.

---

## 🚀 Getting Started

### Prerequisites

You will need **Node.js** and **npm** installed on your system.

*   **Windows / macOS**: Download and install from [nodejs.org](https://nodejs.org/).
*   **Ubuntu/Debian**: `sudo apt install nodejs npm`
*   **Arch Linux / CachyOS**: `sudo pacman -S nodejs npm`

### Installation

1.  **Clone or download the repository:**
    ```bash
    git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
    cd studyink
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

### Running the App

*   **Start the application:**
    ```bash
    npm start
    ```

*   **Run in Developer mode (with logging):**
    ```bash
    npm run dev
    ```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + O` | Open PDF |
| `Ctrl + S` | Save / Export |
| `Ctrl + Z` / `Ctrl + Y` | Undo / Redo |
| `Ctrl + +` / `Ctrl + -` | Zoom In / Out |
| `P` / `H` / `E` | Select Pen / Highlighter / Eraser |
| `T` / `N` | Insert Textbox / Sticky Note |
| `S` | Toggle Shape Recognition |
| `B` | Bookmark current page |
| `Esc` | Close all modals |

---

## 🛠️ Project Structure

```text
├── main.js               # Electron main process (Node.js shell)
├── preload.js            # Secure IPC bridge between Main and Renderer
├── package.json          # Dependency configurations & scripts
├── HOW_IT_WORKS.md       # Developer architectural walkthrough
└── renderer/             # Frontend application UI
    ├── index.html        # Main app shell
    ├── index.css         # Styling system
    ├── app.js            # Application orchestrator
    ├── pdf-viewer.js     # PDF.js implementation
    └── annotation.js     # Canvas drawing engine
```

---

## 📄 License

This project is licensed under the ISC License.
