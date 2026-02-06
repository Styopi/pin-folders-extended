# Pin Folders Extended

Pin Folders Extended is an improved and modernized version of the original **Pin Folders** extension.  
It provides a dedicated sidebar view where you can pin frequently used folders for quick access, enhanced navigation, and a smoother workflow.

> Based on the original “Pin Folders” extension by **shivaprasanth** (Apache‑2.0 license).

---

## Features

### • Project‑based pinned folders  
Each workspace/project maintains its **own independent list** of pinned folders.  
This avoids mixing bookmarks across unrelated projects and keeps your workflow clean and organized.

### • Pinned Folders View  
A dedicated sidebar panel that displays your pinned folders with custom labels.  
Useful when working across multiple projects or folders with identical names (e.g., multiple `src` directories).

### • Drag & Drop Move  
Move files and folders between pinned folders using drag & drop.  
Behavior matches the native VS Code Explorer:  
- drag = **MOVE**  
- modifier‑key copy is not supported (VS Code API limitation)

### • Automatic Refresh  
Pinned folders update automatically when their contents change:
- file created  
- file deleted  
- file renamed  
- folder structure modified  

Works even when changes happen **outside** VS Code (Finder, Explorer, CLI).

### • Integrated Search (files + folders)  
Search within pinned folders and browse results in a dedicated view.  
The search engine matches **both files and directories**, making it easy to locate anything inside your pinned structure.

### • Expand All / Collapse All  
Quickly expand or collapse the entire pinned folder tree using toolbar commands.  
Useful for large folder structures or when navigating deeply nested directories.

### • Per‑folder Expand / Collapse  
Each pinned folder can be expanded or collapsed individually using context menu actions.

### • File & Folder Operations  
Perform common file operations directly inside the pinned folders view:
- **Create** file or folder  
- **Rename** file or folder  
- **Copy** file or folder  
- **Move** file or folder  
- **Delete** file or folder  

These actions work consistently across both the pinned folders view and search results.

### • Open in New Window  
Click to icon in any pinned folder and open it in a new VS Code window.

---

## Usage

### Add a Pinned Folder
- Right‑click any folder in the Explorer → **Pin in Pinned Folders**

You can assign a custom name to each pinned folder.

### Move Files and Folders
- Drag items between pinned folders  
- Operation always performs a **MOVE**

### Automatic Refresh
No need to manually refresh.  
The view updates automatically whenever pinned folders change on disk.

### Search
- Use the **Search** panel to find files or folders inside pinned directories  
- Results appear in a dedicated **Search Results** view  
- Switch back to the main pinned folders tree when results are cleared

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
| `Pin Folders Extended: Expand All` | Expand all pinned folders |
| `Pin Folders Extended: Collapse All` | Collapse all pinned folders |
| `Create File/Folder` | Create a new file or directory |
| `Rename File/Folder` | Rename an existing file or directory |
| `Copy File/Folder` | Copy a file or directory |
| `Move File/Folder` | Move a file or directory |
| `Delete File/Folder` | Delete a file or directory |
| `Rename Pinned Entry` | Rename the pinned folder label |
| `Remove Pinned Entry` | Remove a folder from pinned list |

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

### Search depth
The search view shows the direct contents of matched folders, but does not currently expand into deeper subfolders.
Recursive search inside nested directories may be added in a future update.

---

## License

This project is licensed under the **Apache‑2.0** license.  
The extension is based on the original “Pin Folders” extension by **shivaprasanth**.
