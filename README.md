# Quick Notes

> A SiYuan plugin for quick note-taking, similar to Yuque's quick notes feature. It supports tag management, archiving, Markdown rendering, and more to help you capture ideas efficiently.
[中文版](README_zh_CN.md)

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


### 7. Hotkeys
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
### 1.1.4 (2025-01-12)
- Added the ability to synchronize Flomo notes to XiaoJi. (This part of the work was done by referring to the functions of the existing plugin [浮墨同步](https://github.com/winter60/plugin-flomo-sync) in the marketplace. Thanks to the author for their contribution. I basically just integrated it.)

### v1.1.3 (2025-01-12)
- Fix the issue where the sidebar of the notes occasionally fails to load when launched.

### v1.1.2 (2025-01-11)
- A new system-level reminder function has been added. Even when Siyuan is minimized, you can still receive reminders. It supports setting reminder times and clearing reminders.
- Added a switch for the insert mode. You can choose to insert a quick note into today's notes with one click or insert it into a specified document.
- Optimized the layout of historical quick notes, moving commonly used buttons out of the "more options" section.
- Added the ability to generate shareable images from historical quick notes. 

### v1.1.1 (2025-01-08)
- Added the ability to insert a small note into today's notes with one click.
- Added the ability to create a small note as a SiYuan document with one click.
- Added the ability to directly drag historical small notes into a SiYuan document.
- Added the ability for pictures to be automatically uploaded when pasted.
- Added custom settings for small notes, supporting the following configurations:
  - Configuration of the ID of today's notebook, which is used to insert small notes into today's notes with one click.
  - Whether to automatically delete the small note after inserting it into today's notes.
  - Template configuration for inserting small notes into today's notes.
  - The number of historical small notes loaded each time.
  - The width and height of the independent small window.
- Fixed the issue where pictures with spaces in their names would not be displayed. 

### v1.1.0 (2025-01-07)
- The mini notes now support being called out in a separate window via shortcut keys. What's different from the previous pop-up windows is that you can call out this independent window alone without having to display the main body of SiYuan. 

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


## Acknowledgments
- Thanks to the author of the [浮墨同步](https://github.com/winter60/plugin-flomo-sync) plugin. I referred to its code and achieved the ability to synchronize Flomo notes to XiaoJi.
- Thanks to Mr. F for writing the [插件开发 Quick Start](https://ld246.com/article/1723732790981#%E8%A7%A3%E6%9E%90-markdown-%E6%96%87%E6%9C%AC), which enabled me to quickly get started with SiYuan plugin development. 