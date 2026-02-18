# Change Log

All notable changes to the "pin-folders-extended" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [1.0.5] - 2026-02-18
### Added
- Unified drag & drop controller for the entire Pinned Folders view.
- Support for moving files and subfolders directly into pinned root folders.
- Support for dropping files onto other files (moves into parent folder).
- Reorder of pinned folders via drag & drop (pinned → pinned).

### Changed
- Completely rewritten drag & drop logic for higher reliability and native‑like behavior.
- Simplified internal architecture: removed old inline drag/drop handlers.
- Removed legacy expand/collapse logic and related commands.
- Improved consistency between pinned folders view and search results view.

### Fixed
- Files could not be dropped into pinned root folders — now fully supported.
- Dragging pinned folders no longer triggers file‑move logic.
- Various edge cases when dragging onto files or nested folders.

### Removed
- Deprecated `handleDrag` logic from the provider.
- Removed expand/collapse features that were no longer needed.

## [1.0.6] - 2026-02-18
### Added
- New command: **Reset All Pinned Folders** — clears pinned folders, search cache, collapsible state, watchers, and persistent workspace storage.
- Added **Reset All Pinned Folders** to the Pinned Folders view menu (⋯).

### Changed
- Reset logic now fully clears both runtime state and `workspaceState`, ensuring pinned folders do not reappear after restarting VS Code.
- Improved internal cleanup when resetting: watchers are now properly disposed and re‑initialized.

### Fixed
- Pinned folders previously reappeared after VS Code restart even after reset — now resolved.
- Search results and cached state are now consistently cleared when performing a full reset.
