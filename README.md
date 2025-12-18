# Whiteboard - Points & Lines

A simple, interactive whiteboard web app for placing points, moving them, and creating connections between them.

## Features

- **Add Points**: Click anywhere on the whiteboard to place points
- **Move Points**: Drag points to reposition them
- **Connect Points**: Create lines between any two points
- **Delete Points**: Select a point and press Delete/Backspace
- **Remove Lines**: Double-click a line to remove it
- **Clear All**: Remove all points and lines at once

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `A` | Switch to Add Point mode |
| `M` | Switch to Move mode |
| `C` | Switch to Connect mode |
| `Escape` | Cancel current selection |
| `Delete` / `Backspace` | Delete selected point |

## Usage

1. Open `index.html` in a web browser
2. Use the toolbar buttons or keyboard shortcuts to switch modes
3. In **Add** mode, click on the canvas to place points
4. In **Move** mode, drag points to reposition them
5. In **Connect** mode, click two points to draw a line between them

## Tech Stack

- Vanilla HTML, CSS, and JavaScript
- SVG for rendering points and lines
- No external dependencies

## Running Locally

Simply open `index.html` in any modern web browser, or use a local server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js (npx)
npx serve
```

Then open http://localhost:8000 in your browser.
