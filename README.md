# Quick Notes

> A SiYuan plugin similar to Yuque's quick notes feature. After migrating from Yuque to SiYuan, I found that SiYuan lacked a convenient quick notes function like Yuque's. So I created this plugin to help record quick thoughts and ideas. As this is the first version, there may be bugs - please use with caution!


## Features

### 1. Quick Recording
- Support quick input and save text content
- Press Ctrl+Shift+y globally to bring up Quick Notes window

### 2. Tag Management
- Add multiple tags to each note
- Filter and sort content by tags

### 3. Content Management
- Pin important notes to top
- Edit and delete existing notes
- Auto-fold long text, click to expand
- Support text copy and selection
- Toggle editor visibility

### 4. Search and Filter
- Search by content
- Sort by time (ascending/descending)
- Filter by tags
- Support activity records and archived content switching

### 5. Data Export
- Export to multiple formats (CSV/Markdown/JSON)
- Select export time range
- Filter export content by tags
- Option to export only pinned content
- Option to include archived content

## Usage Instructions

1. Install the plugin from the SiYuan marketplace
2. Find the "Quick Notes" icon in the left sidebar
3. Enter content in the input box, tags can be added
4. Save using Ctrl+Enter (Mac: Cmd+Enter) shortcut
5. Press Ctrl+Shift+y globally to bring up Quick Notes

## Changelog
### v1.0.7 (2025-01-04)
- Optimize the issue of global shortcut keys. Previously, they could only be activated within the SiYuan window. Now, even when you are in a non-SiYuan window, pressing "Ctrl + Shift + Y" will switch back to the SiYuan window and pop up the "New Quick Note" option. (The "New Quick Note" is not an independent window, so it will still jump back to the SiYuan application.)
- Optimize the scrolling experience. When scrolling through the history of quick notes, the editing box and toolbar will be fixed in place.
- Optimize the display experience. For the history of quick notes, the copy and edit buttons will only be shown when the mouse hovers over them, making the interface cleaner.

### v1.0.5 (2025-01-04)
- Added Markdown rendering support for note content
- Fixed cursor focus issue when opening Quick Notes with hotkey
- Improved overall user experience
  - Optimized button layouts
  - Added tooltips for better usability
  - Improved copy and edit functionality

### v1.0.4 (2025-01-03)
- Fixed archived notes not updating after editing
- Improved archive content management

### v1.0.3 (2025-01-03)
- Added editor toggle button
- Improved editor visibility control

### v1.0.2 (2025-01-02)
- Added archive feature, allowing unused records to be archived
- Support switching between activity records and archived content
- Search and sort functions support archived content
- Export option to include archived content

### v1.0 (2025-01-02)
- Initial release
- Basic record, edit, delete functions
- Tag management and content filtering
- Data export feature


