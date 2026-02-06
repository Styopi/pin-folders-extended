# Pin Folders Extended

Pin Folders Extended is an improved and modernized version of the original **Pin Folders** extension.  
It provides a dedicated sidebar view where you can pin frequently used folders for quick access, enhanced navigation, and a smoother workflow.

> Based on the original “Pin Folders” extension by **shivaprasanth** (Apache‑2.0 license).

---

## Features

### • Pinned Folders View  
A dedicated sidebar panel that displays your pinned folders with custom labels.  
Useful when working across multiple projects or folders with identical names (e.g., multiple `src` directories).

### • Drag & Drop Move  
Move files and folders between pinned folders using drag & drop.  
Behavior matches the native VS Code Explorer:  
- drag = **MOVE**  
- modifier‑key copy is intentionally not supported (due to VS Code API limitations)

### • Automatic Refresh  
Pinned folders update automatically when their contents change:
- file created  
- file deleted  
- file renamed  
- folder structure modified  

Works even when changes happen **outside** VS Code (Finder, Explorer, CLI).

### • Integrated Search  
Search within pinned folders and browse results in a dedicated view.

---

## Usage

### Add a Pinned Folder
- Right‑click any folder in the Explorer → **Pin in Pinned Folders**
- Or use Command Palette → **Pin Folders Extended: Add Folder**

You can assign a custom name to each pinned folder.

### Move Files and Folders
- Drag items between pinned folders  
- Operation always performs a **MOVE**

### Automatic Refresh
No need to manually refresh.  
The view updates automatically whenever pinned folders change on disk.

### Open in New Window
Right‑click a pinned folder → **Open in New Window**

---

## Commands

| Command | Description |
|--------|-------------|
| `Pin Folders Extended: Add Folder` | Pin a new folder |
| `Pin Folders Extended: Refresh` | Manually refresh the view |
| `Pin Folders Extended: Focus View` | Focus the pinned folders panel |
| `Pin Folders Extended: Open in New Window` | Open folder in a new VS Code window |

---

## Known Limitations

### Copy/Paste via Keyboard  
VS Code does not support `Ctrl/Cmd + C` and `Ctrl/Cmd + V` for custom TreeViews.  
Copy operations must be done through context menu or Explorer.

### Modifier Keys During Drag & Drop  
macOS and the VS Code TreeView API do not expose modifier keys (Cmd/Option/Control) during drag operations.  
Therefore:
- drag = MOVE  
- copy via drag is not supported

This matches the behavior of the native VS Code Explorer on macOS.

---

## License

This project is licensed under the **Apache‑2.0** license.  
The extension is based on the original “Pin Folders” extension by **shivaprasanth**.
