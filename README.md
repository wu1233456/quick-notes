# Quick Notes

> A SiYuan plugin for quick note-taking, similar to Yuque's quick notes feature. It supports tag management, archiving, Markdown rendering, and more to help you capture ideas efficiently.

## Key Features

### 1. Quick Recording
- Global hotkey `⇧⌘Y` to open Quick Notes (works outside SiYuan)
- Hotkey `⇧⌘U` to open Quick Notes sidebar
- `⌘Enter` to save content quickly
- `⌘K` to add tags quickly
- Support image upload and preview
- Support task lists. Entering "[]" allows you to create a task list. The historical notes will be rendered as checkboxes, and you can tick them to mark tasks as completed.

### 2. Markdown Support
- Full Markdown syntax support
- Real-time Markdown rendering
- Task list creation and status toggle
- Image preview and zoom

### 3. Tag Management
- Add multiple tags to notes
- Quick filter by specific tags
- Show tag usage frequency
- Tag search and quick selection

### 4. Content Management
- Pin important notes
- Archive unused content
- Auto-fold/expand long text
- Batch operations:
  - Batch copy
  - Batch tag
  - Batch archive/unarchive
  - Batch delete
  - Batch merge

### 5. Search and Filter
- Real-time content search
- Time-based sorting (asc/desc)
- Tag filtering
- View archived/unarchived content

### 6. Data Export
- Support formats: CSV/Markdown/JSON
- Optional time range
- Filter export by tags
- Option to export pinned only
- Option to include archived content

## Usage Guide

### Basic Operations
1. Quick Create:
   - Press hotkey globally (Windows: `Ctrl+Shift+Y`, macOS: `⇧⌘Y`)
   - Click Quick Notes icon in toolbar
   - Use hotkey to save (Windows: `Ctrl+Enter`, macOS: `⌘Enter`)
   - Enter "[]" to create a task list

2. Tag Management:
   - Press hotkey to add tags while editing (Windows: `Ctrl+K`, macOS: `⌘K`)
   - Click tag icon to select existing tags
   - Search or create new tags in tag panel

3. Content Management:
   - Hover to show action buttons
   - Click to expand/collapse long text
   - Click more for pin/archive options
   - Toggle task list status

4. Batch Operations:
   - Click filter button to enable batch select
   - Select multiple notes for batch operations
   - Support select all/deselect all

### Hotkeys
- `⇧⌘Y`: Open Quick Notes globally
- `⇧⌘U`: Open Quick Notes sidebar
- `⌘Enter`: Save content
- `⌘K`: Add tags
- `⌘W`: Close Quick Notes window
+ Windows/Linux:
+ - `Ctrl+Shift+Y`: Open Quick Notes globally
+ - `Ctrl+Shift+U`: Open Quick Notes sidebar
+ - `Ctrl+Enter`: Save content
+ - `Ctrl+K`: Add tags
+ - `Ctrl+W`: Close Quick Notes window
+
+ macOS:
+ - `⇧⌘Y`: Open Quick Notes globally
+ - `⇧⌘U`: Open Quick Notes sidebar
+ - `⌘Enter`: Save content
+ - `⌘K`: Add tags
+ - `⌘W`: Close Quick Notes window

## Changelog


### v1.0.8 (2025-01-07)
- A new task list feature has been added. Entering "[]" allows you to create a task list. Historical notes will be rendered as checkboxes, and you can tick them to mark tasks as completed.
- The image upload and preview functions have been added.
- A new shortcut key "⌘K" (Windows: "Ctrl + K") for adding tags has been added. It enables you to quickly add tags, select tags with the up and down arrow keys, and confirm with the Enter key.
- The experience of adding tags has been optimized, with support for tag searching and quick selection. 
- The content in the new note window summoned by the shortcut keys will be temporarily saved. Input will not be lost due to closing the new note window until it is saved or the Siyuan software is restarted. 


### v1.0.7 (2024-01-04)
- Optimize global hotkey, support `⇧⌘Y` outside SiYuan
- Add `⇧⌘U` hotkey for Quick Notes sidebar
- Improve UI interaction:
  - Fix editor and toolbar position
  - Show action buttons on hover
  - Enhance scrolling experience

### v1.0.6 (2024-01-04)
- Add batch operations:
  - Support batch copy, tagging
  - Support batch archive/unarchive
  - Support batch delete
  - Support note merging

### v1.0.5 (2024-01-04)
- Add full Markdown rendering support
- Add task list functionality
- Add image upload and preview
- Improve editing experience:
  - Better button layout and tooltips
  - Optimize hotkey response
  - Enhance copy and edit functions

### v1.0.4 (2024-01-03)
- Fix archived content update issue
- Optimize archive management
- Improve data sync logic

### v1.0.3 (2024-01-03)
- Add editor toggle functionality
- Optimize editor area display
- Improve UI responsiveness

### v1.0.2 (2024-01-02)
- Add archive feature
- Support archive content management
- Extend search and sort to archived content
- Add archive export options

### v1.0.1 (2024-01-02)
- Initial release
- Basic record, edit, delete functions
- Tag management and content filtering
- Data export functionality


