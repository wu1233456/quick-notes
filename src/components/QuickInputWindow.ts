import { Plugin } from "siyuan";

interface IPlugin extends Plugin {
    saveContent: (text: string, tags: string[]) => Promise<void>;
    historyService: {
        getCurrentData: () => Array<{ text: string, tags: string[] }>;
    };
    i18n: {
        note: {
            placeholder: string;
            addTag: string;
            uploadImage: string;
            save: string;
            keepTop: string;
            noTags: string;
            existingTags: string;
            addTagPlaceholder: string;
            tagCount: string;
        };
    };
}

export class QuickInputWindow {
    private win: any;
    private isClosing: boolean = false;
    private plugin: IPlugin;
    private isPinned: boolean = false;
    private static instance: QuickInputWindow | null = null;
    private iconsSVG: string;
    private tagPanelStyle: string = `
        .tag-panel {
            position: fixed;
            z-index: 205;
            width: 133px;
            height: 150px;
            background: var(--b3-menu-background);
            border: 1px solid var(--b3-border-color);
            border-radius: var(--b3-border-radius);
            box-shadow: var(--b3-dialog-shadow);
            display: flex;
            flex-direction: column;
            padding: 0;
            overflow: hidden;
        }
        .history-tag {
            display: inline-flex;
            align-items: center;
            border-radius: var(--b3-border-radius);
            padding: 0 8px;
            cursor: pointer;
            font-size: 12px;
            height: 24px;
            line-height: 24px;
            background-color: var(--b3-theme-surface);
            color: var(--b3-theme-on-surface);
            margin: 0 4px 4px 0;
            transition: all 0.2s ease;
            justify-content: space-between;
        }
        .history-tag:hover {
            background-color: var(--b3-theme-primary-light);
            color: var(--b3-theme-on-primary);
        }
        .tag-count {
            font-size: 10px;
            opacity: 0.7;
            background: var(--b3-theme-surface);
            padding: 2px 4px;
            border-radius: 8px;
            margin-left: 4px;
            transition: all 0.2s ease;
            color: var(--b3-theme-on-surface);
        }
        .b3-text-field {
            background-color: var(--b3-theme-background);
            border: 1px solid var(--b3-border-color);
            border-radius: var(--b3-border-radius);
            box-sizing: border-box;
            color: var(--b3-theme-on-background);
            font-size: 14px;
            line-height: 20px;
            padding: 4px 8px;
            width: 100%;
        }
        .b3-text-field:focus {
            border-color: var(--b3-theme-primary);
        }
    `;
    private static draftContent: {
        text: string;
        tags: string[];
    } = {
        text: '',
        tags: []
    };

    constructor(plugin: IPlugin) {
        this.plugin = plugin;
        const siyuanIcon = document.getElementById('iconScript')?.innerHTML || '';
        this.iconsSVG = siyuanIcon;
    }
    

    public static getInstance(plugin: IPlugin): QuickInputWindow {
        if (!QuickInputWindow.instance) {
            QuickInputWindow.instance = new QuickInputWindow(plugin);
        }
        return QuickInputWindow.instance;
    }

    public async createWindow() {
        if (this.win && !this.win.isDestroyed()) {
            this.win.show();
            this.win.focus();
            return;
        }
        const { BrowserWindow } = require('@electron/remote');
        console.log("createWindow");
        this.win = new BrowserWindow({
            width: 320,
            height: 360,
            frame: true,
            alwaysOnTop: false,
            skipTaskbar: true,
            title: 'knote-quick-input',
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                enableRemoteModule: true,
                webSecurity: false
            },
            backgroundColor: 'var(--b3-theme-background)',
            autoHideMenuBar: true,
            titleBarStyle: 'hidden',
            show: true
        });
        // 打开开发者工具以便调试
        // this.win.webContents.openDevTools();
        this.setupIPCListeners();
        await this.win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(this.getWindowContent())}`);
        this.setupWindowEvents();
    }

    private setupIPCListeners() {
        const { ipcMain } = require('@electron/remote');
        const saveNoteHandler = async (event, data) => {
            console.log('Save note event received:', data);
            try {
                await this.plugin.saveContent(data.text, data.tags);
                if (!this.isClosing && !this.win.isDestroyed()) {
                    this.isClosing = true;
                    this.win.close();
                }
            } catch (error) {
                console.error('Error saving note:', error);
            }
        };

        const togglePinHandler = (event, data) => {
            this.isPinned = data.isPinned;
            if (this.win && !this.win.isDestroyed()) {
                this.win.setAlwaysOnTop(this.isPinned);
            }
        };

        const saveDraftHandler = (event, data) => {
            QuickInputWindow.draftContent = {
                text: data.text,
                tags: data.tags
            };
        };

        const clearDraftHandler = () => {
            QuickInputWindow.draftContent = {
                text: '',
                tags: []
            };
        };

        ipcMain.on('save-note', saveNoteHandler);
        ipcMain.on('toggle-pin', togglePinHandler);
        ipcMain.on('save-draft', saveDraftHandler);
        ipcMain.on('clear-draft', clearDraftHandler);

        this.win.on('closed', () => {
            ipcMain.removeListener('save-note', saveNoteHandler);
            ipcMain.removeListener('toggle-pin', togglePinHandler);
            ipcMain.removeListener('save-draft', saveDraftHandler);
            ipcMain.removeListener('clear-draft', clearDraftHandler);
            QuickInputWindow.instance = null;
            console.log('IPC listeners removed');
        });
    }

    private setupWindowEvents() {
        this.win.once('ready-to-show', () => {
            console.log('Window ready to show');
            this.win.show();
            this.win.focus();
        });

        this.win.on('blur', () => {
            if (!this.isPinned && !this.win.isDestroyed()) {
                this.win.close();
            }
        });
    }

    private getEditorTemplate(text: string = ''): string {
        const draftText = QuickInputWindow.draftContent.text || text;
        const draftTags = QuickInputWindow.draftContent.tags || [];
        const i18n = this.plugin.i18n;

        const draftTagsHtml = draftTags.map(tag => `
            <span class="tag-item b3-chip b3-chip--middle" data-tag="${tag}">
                <span class="b3-chip__content">${tag}</span>
                <svg class="b3-chip__close">
                    <use xlink:href="#iconClose"></use>
                </svg>
            </span>
        `).join('');

        return `
            <div style="border: 1px solid var(--b3-border-color); border-radius: 8px; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1); overflow: hidden; height: 100%; display: flex; flex-direction: column;">
                <textarea class="fn__flex-1 editor-textarea" 
                    placeholder="${i18n.note.placeholder}"
                    style="width: 100%; 
                    height: 0; 
                    flex: 1;
                    resize: none; 
                    padding: 8px 12px;
                    background-color: var(--b3-theme-background);
                    color: var(--b3-theme-on-background);
                    border: none;
                    box-sizing: border-box;
                    transition: border-color 120ms ease-out 0s;"
                    onkeydown="if((event.metaKey || event.ctrlKey) && event.key === 'Enter') { 
                        event.preventDefault(); 
                        this.closest('.b3-dialog__content')?.querySelector('[data-type=\\'save\\']')?.click(); 
                    }"
                >${draftText}</textarea>
                <div style="border-top: 1px solid var(--b3-border-color); padding: 4px 8px; flex-shrink: 0;">
                    <div class="tags-list" style="display: flex; flex-wrap: wrap; gap: 4px; min-height: 24px;">
                        ${draftTagsHtml}
                    </div>
                    <div class="fn__flex" style="justify-content: space-between; align-items: center; margin-top: 2px;">
                        <div class="fn__flex" style="gap: 8px;">
                            <button class="b3-button b3-button--text add-tag-btn b3-tooltips b3-tooltips__n" 
                                style="padding: 4px;margin-left: 8px;marigin-bottom:8px" 
                                aria-label="ctrl/⌘+k">
                                <svg class="b3-button__icon" style="height: 16px; width: 16px;" viewBox="0 0 1024 1024">
                                    <path d="M332.117333 597.333333l17.92-170.666666H170.666667V341.333333h188.373333l22.4-213.333333h85.802667l-22.4 213.333333h170.197333l22.4-213.333333h85.802667l-22.4 213.333333H853.333333v85.333334h-161.450666l-17.92 170.666666H853.333333v85.333334h-188.373333l-22.4 213.333333h-85.802667l22.4-213.333333H408.96l-22.4 213.333333H300.757333l22.4-213.333333H170.666667v-85.333334h161.450666z m85.802667 0h170.24l17.92-170.666666h-170.24l-17.92 170.666666z" fill="currentColor"/>
                                </svg>
                            </button>
                            <input type="file" class="fn__none image-upload-input" accept="image/*" multiple>
                        </div>
                        <button class="b3-button b3-button--text b3-tooltips b3-tooltips__n fn__flex fn__flex-center main_save_btn" 
                            data-type="save" 
                            aria-label="ctrl/⌘+Enter" 
                            style="padding: 4px 8px; gap: 8px;margin-right: 8px;">
                            <span>${i18n.note.save}</span>
                        </button>
                    </div>
                </div>
            </div>`;
    }

    private getWindowContent(): string {
        const i18n = this.plugin.i18n;
        const historyData = this.plugin.historyService.getCurrentData();
        const allTags = Array.from(new Set(historyData.flatMap(item => item.tags || [])));
        const tagsHtml = allTags.length > 0 
            ? allTags.map(tag => {
                const count = historyData.filter(item => item.tags?.includes(tag)).length;
                return `
                    <div class="history-tag" 
                        data-tag="${tag}">
                        <span class="b3-chip__content" style="max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${tag}
                        </span>
                        <span class="tag-count">
                            ${count}
                        </span>
                    </div>
                `;
            }).join('')
            : `<div style="color: var(--b3-theme-on-surface-light); font-size: 12px; text-align: center; padding: 8px;">
                ${i18n.note.noTags}
            </div>`;

        return `
            <html>
            <head>
                <style>
                    body {
                        margin: 0;
                        padding: 8px;
                        height: 100vh;
                        box-sizing: border-box;
                        background: var(--b3-theme-background);
                        color: var(--b3-theme-on-background);
                        font-family: var(--b3-font-family);
                        overflow: hidden;
                    }
                    :root {
                        ${this.getThemeStyle()}
                    }
                    ${this.getBasicStyle()}
                    ${this.tagPanelStyle}
                    .window-drag {
                        -webkit-app-region: drag;
                        height: 22px;
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        display: flex;
                        justify-content: flex-end;
                        padding-right: 8px;
                        z-index: 100;
                    }
                    .pin-button {
                        -webkit-app-region: no-drag;
                        background: none;
                        border: none;
                        padding: 4px;
                        cursor: pointer;
                        color: var(--b3-theme-on-surface);
                        opacity: 0.6;
                        transition: opacity 0.2s;
                    }
                    .pin-button:hover {
                        opacity: 1;
                    }
                    .pin-button.pinned {
                        color: var(--b3-theme-primary);
                        opacity: 1;
                    }
                    .content {
                        margin-top: 22px;
                        height: calc(100% - 22px);
                    }
                </style>
            </head>
            <body>
                <svg class="fn__none" id="iconScript">
                    ${this.iconsSVG}
                </svg>
                <div class="window-drag">
                    <button class="pin-button" id="pinButton" title="${i18n.note.keepTop}">
                        <svg style="width: 16px; height: 16px;" viewBox="0 0 1024 1024">
                            <path d="M1008.618567 392.01748l-383.019709-383.019709C606.447872-10.153214 574.529563 2.61411 568.145902 34.532419l-6.383662 57.452956-6.383662 70.22028c0 12.767324-6.383662 19.150985-12.767324 25.534647L236.195487 404.784804c-6.383662 6.383662-12.767324 6.383662-25.534647 6.383662h-12.767324l-57.452956-6.383662c-31.918309 0-51.069295 38.301971-25.534647 57.452956l44.685632 44.685633 127.673237 127.673236L0 1024l383.019709-287.264782 172.358869 172.358869c25.534647 25.534647 63.836618 6.383662 57.452956-25.534647l-6.383662-57.452956v-12.767324c0-6.383662 0-19.150985 6.383662-25.534647L829.876036 481.388746c6.383662-6.383662 12.767324-12.767324 25.534647-12.767324l70.22028-6.383662 57.452957-6.383662c38.301971-6.383662 51.069295-38.301971 25.534647-63.836618z m-255.346473 31.918309l-217.044501 306.415767s0 6.383662-6.383662 6.383662L287.264782 494.156069s6.383662 0 6.383662-6.383662l306.415767-217.044501c31.918309-19.150985 51.069295-51.069295 57.452956-89.371266l178.742531 178.742531c-31.918309 12.767324-63.836618 31.918309-82.987604 63.836618z" fill="currentColor"/>
                        </svg>
                    </button>
                </div>
                <div class="content">
                    ${this.getEditorTemplate()}
                </div>
                <script>
                    const { ipcRenderer } = require('electron');
                    
                    const textarea = document.querySelector('textarea');
                    const saveBtn = document.querySelector('.main_save_btn');
                    const addTagBtn = document.querySelector('.add-tag-btn');
                    const uploadBtn = document.querySelector('.upload-image-btn');
                    const pinButton = document.getElementById('pinButton');
                    
                    let isPinned = false;
                    textarea.focus();
                    pinButton.addEventListener('click', () => {
                        isPinned = !isPinned;
                        pinButton.classList.toggle('pinned', isPinned);
                        ipcRenderer.send('toggle-pin', { isPinned });
                    });
                    
                    textarea.addEventListener('keydown', (e) => {
                        if((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                            saveBtn.click();
                        }
                        if((e.metaKey || e.ctrlKey) && e.key === 'k') {
                            addTagBtn.click();
                        }
                    });

                    const saveDraft = () => {
                        const text = textarea.value;
                        const tags = Array.from(document.querySelectorAll('.tag-item'))
                            .map(tag => tag.getAttribute('data-tag'));
                        
                        ipcRenderer.send('save-draft', { text, tags });
                    };

                    textarea.addEventListener('input', saveDraft);
                    
                    window.addEventListener('beforeunload', saveDraft);

                    saveBtn.onclick = () => {
                        const text = textarea.value;
                        const tags = Array.from(document.querySelectorAll('.tag-item'))
                            .map(tag => tag.getAttribute('data-tag'));
                        
                        console.log('Saving note:', { text, tags });
                        
                        if(text.trim()) {
                            ipcRenderer.send('save-note', { text, tags });
                            ipcRenderer.send('clear-draft');
                            saveBtn.disabled = true;
                        }
                    };

                    addTagBtn.onclick = (e) => {
                        e.stopPropagation();
                        const existingPanel = document.querySelector('.tag-panel');
                        if (existingPanel) {
                            existingPanel.remove();
                            return;
                        }

                        const tagPanel = document.createElement('div');
                        tagPanel.className = 'tag-panel';
                        
                        const btnRect = addTagBtn.getBoundingClientRect();
                        const viewportHeight = window.innerHeight;
                        const panelHeight = 150;
                        const margin = 8;

                        const showAbove = btnRect.top > panelHeight + margin;
                        const top = showAbove ?
                            btnRect.top - panelHeight - margin :
                            btnRect.bottom + margin;

                        tagPanel.style.top = \`\${top}px\`;
                        tagPanel.style.left = \`\${btnRect.left}px\`;

                        if (btnRect.left + 133 > window.innerWidth) {
                            tagPanel.style.left = \`\${btnRect.left + btnRect.width - 133}px\`;
                        }

                        tagPanel.innerHTML = \`
                            <div style="padding: 8px; border-bottom: 1px solid var(--b3-border-color); background: var(--b3-menu-background); flex-shrink: 0;">
                                <input type="text" 
                                    class="b3-text-field fn__flex-1 tag-input" 
                                    placeholder="${i18n.note.addTag}"
                                    style="width: 100%; background: var(--b3-theme-background);">
                            </div>
                            <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--b3-menu-background);">
                                <div style="padding: 8px 8px 4px 8px; font-size: 12px; color: var(--b3-theme-on-surface-light); flex-shrink: 0;">
                                    ${i18n.note.existingTags}
                                </div>
                                <div class="history-tags" style="padding: 0 8px 8px 8px; overflow-y: auto; flex: 1;">
                                    <div style="display: flex; flex-direction: column; gap: 4px;justify-content: space-between;">
                                        ${tagsHtml}
                                    </div>
                                </div>
                            </div>
                        \`;

                        document.body.appendChild(tagPanel);

                        const tagInput = tagPanel.querySelector('.tag-input');
                        tagInput.focus();

                        const addTag = (tagText) => {
                            if (tagText.trim()) {
                                const tagsList = document.querySelector('.tags-list');
                                const existingTags = Array.from(tagsList.querySelectorAll('.tag-item'))
                                    .map(tag => tag.getAttribute('data-tag'));

                                if (!existingTags.includes(tagText)) {
                                    const tagElement = document.createElement('span');
                                    tagElement.className = 'tag-item b3-chip b3-chip--middle';
                                    tagElement.setAttribute('data-tag', tagText);
                                    tagElement.innerHTML = \`
                                        <span class="b3-chip__content">\${tagText}</span>
                                        <svg t="1736226890857" class="b3-chip__close" style="height: 18px; width: 18px;"  viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="40214" xmlns:xlink="http://www.w3.org/1999/xlink" ><path d="M512 451.669333l165.973333-165.973333a21.333333 21.333333 0 0 1 30.122667 0l30.165333 30.208a21.333333 21.333333 0 0 1 0 30.165333L572.330667 512l165.973333 165.973333a21.333333 21.333333 0 0 1 0 30.122667l-30.208 30.165333a21.333333 21.333333 0 0 1-30.165333 0L512 572.330667l-165.973333 165.973333a21.333333 21.333333 0 0 1-30.122667 0l-30.165333-30.208a21.333333 21.333333 0 0 1 0-30.165333L451.669333 512l-165.973333-165.973333a21.333333 21.333333 0 0 1 0-30.122667l30.208-30.165333a21.333333 21.333333 0 0 1 30.165333 0L512 451.669333z" fill="#A7B3BF" p-id="40215"></path></svg>
                                   
                                    \`;
                                    tagsList.appendChild(tagElement);

                                    tagElement.querySelector('.b3-chip__close').onclick = () => {
                                        tagElement.remove();
                                    };
                                }
                                tagPanel.remove();
                                textarea.focus();
                            }
                        };

                        let selectedIndex = -1;
                        const historyTags = tagPanel.querySelectorAll('.history-tag');

                        const searchTagInput = tagPanel.querySelector('.tag-input');
                        searchTagInput.addEventListener('input', () => {
                            const keyword = searchTagInput.value.trim().toLowerCase();
                            const historyTags = tagPanel.querySelectorAll('.history-tag');
                            historyTags.forEach(tag => {
                                const tagText = tag.getAttribute('data-tag').toLowerCase();
                                if (tagText.includes(keyword)) {
                                    tag.style.display = 'block';
                                } else {
                                    tag.style.display = 'none';
                                }
                            });
                        });

                        const updateSelection = (newIndex) => {
                            // 清除所有选中状态
                            historyTags.forEach(tag => {
                                tag.style.backgroundColor = '';
                                tag.style.color = '';
                            });
                            
                            // 设置新的选中状态
                            if (newIndex >= 0 && newIndex < historyTags.length) {
                                selectedIndex = newIndex;
                                const selectedTag = historyTags[selectedIndex];
                                selectedTag.style.backgroundColor = 'var(--b3-theme-primary-light)';
                                selectedTag.style.color = 'var(--b3-theme-on-primary)';
                                selectedTag.scrollIntoView({ block: 'nearest' });
                            } else {
                                selectedIndex = -1;
                            }
                        };

                        tagInput.addEventListener('keydown', (e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                if (selectedIndex >= 0) {
                                    // 如果有选中的标签，使用选中的标签
                                    const selectedTag = historyTags[selectedIndex].getAttribute('data-tag');
                                    addTag(selectedTag);
                                } else if (tagInput.value.trim()) {
                                    // 否则使用输入框的值
                                    addTag(tagInput.value.trim());
                                }
                            } else if (e.key === 'Escape') {
                                tagPanel.remove();
                                textarea.focus();
                            } else if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                updateSelection(selectedIndex < historyTags.length - 1 ? selectedIndex + 1 : 0);
                            } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                updateSelection(selectedIndex > 0 ? selectedIndex - 1 : historyTags.length - 1);
                            }
                        });

                        // 鼠标悬停时也更新选中状态
                        historyTags.forEach((tag, index) => {
                            tag.addEventListener('mouseenter', () => {
                                updateSelection(index);
                            });
                            
                            tag.addEventListener('mouseleave', () => {
                                updateSelection(-1);
                            });
                        });

                        const closePanel = (e) => {
                            if (!tagPanel.contains(e.target) && !addTagBtn.contains(e.target)) {
                                tagPanel.remove();
                                document.removeEventListener('click', closePanel);
                                textarea.focus();
                            }
                        };

                        setTimeout(() => {
                            document.addEventListener('click', closePanel);
                        }, 0);

                        tagPanel.querySelectorAll('.history-tag').forEach(tag => {
                            tag.addEventListener('click', () => {
                                const tagText = tag.getAttribute('data-tag');
                                if (tagText) {
                                    addTag(tagText);
                                }
                            });
                        });
                    };

                    window.allHistoryTags = ${JSON.stringify(allTags)};
                </script>
            </body>
            </html>
        `;
    }

    private getThemeStyle(): string {
        const styles = window.getComputedStyle(document.documentElement);
        const themeVars = [
            '--b3-theme-primary',
            '--b3-theme-background',
            '--b3-theme-surface',
            '--b3-theme-error',
            '--b3-theme-on-primary',
            '--b3-theme-on-background',
            '--b3-theme-on-surface',
            '--b3-theme-on-error',
            '--b3-font-family',
            '--b3-border-color',
            '--b3-border-radius',
            '--b3-dialog-shadow',
            '--b3-theme-primary-light',
            '--b3-scroll-color',
            '--b3-theme-primary-lighter',
            '--b3-theme-primary-lightest',
            '--b3-theme-surface-lighter',
            '--b3-theme-background-light',
            '--b3-menu-background',
        ];

        return themeVars
            .map(varName => `${varName}: ${styles.getPropertyValue(varName)};`)
            .join('\n');
    }

    private getBasicStyle(): string {
        return `
            /* 基础按钮样式 */
            .b3-button {
                cursor: pointer;
                color: var(--b3-theme-on-surface);
                border-radius: var(--b3-border-radius);
                line-height: 20px;
                padding: 4px 8px;
                background-color: transparent;
                border: 1px solid var(--b3-theme-surface);
                transition: box-shadow 120ms ease-out 0s;
                box-sizing: border-box;
                text-align: center;
            }

            .b3-button:hover {
                background-color: var(--b3-theme-surface);
            }

            .b3-button:active {
                background-color: var(--b3-theme-background);
            }

            .b3-button--text {
                padding: 4px;
                border: 0;
            }

            .b3-button__icon {
                height: 14px;
                width: 14px;
                vertical-align: middle;
            }

            /* 标签样式 */
            .b3-chip {
                display: inline-flex;
                align-items: center;
                border-radius: var(--b3-border-radius);
                padding: 0 8px;
                cursor: pointer;
                font-size: 12px;
                height: 24px;
                line-height: 24px;
                background-color: var(--b3-theme-surface);
                color: var(--b3-theme-on-surface);
                margin: 0 4px 4px 0;
            }

            .b3-chip--middle {
                font-size: 14px;
                height: 28px;
                line-height: 28px;
            }

            .b3-chip__content {
                max-width: 120px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .b3-chip__close {
                margin-left: 4px;
                height: 14px;
                width: 14px;
            }

            /* 布局辅助类 */
            .fn__flex {
                display: flex;
            }

            .fn__flex-1 {
                flex: 1;
            }

            .fn__flex-center {
                align-items: center;
            }

            .fn__space {
                width: 8px;
            }

            .fn__none {
                display: none;
            }

            /* 输入框相关样式 */
            textarea:focus {
                outline: none;
                border-color: var(--b3-theme-primary);
            }

            /* 工具提示样式 */
            .b3-tooltips__n {
                position: relative;
            }

            .b3-tooltips__n::after {
                position: absolute;
                top: -8px;
                left: 50%;
                transform: translate(-50%, -100%);
                padding: 4px 8px;
                border-radius: var(--b3-border-radius);
                background-color: var(--b3-theme-surface);
                color: var(--b3-theme-on-surface);
                font-size: 12px;
                content: attr(aria-label);
                opacity: 0;
                transition: opacity 120ms ease-out 0s;
                pointer-events: none;
                white-space: pre;
                z-index: 999;
                box-shadow: var(--b3-dialog-shadow);
            }

            .b3-tooltips__n:hover::after {
                opacity: 1;
            }

            /* 滚动条样式 */
            ::-webkit-scrollbar {
                width: 4px;
                height: 4px;
            }

            ::-webkit-scrollbar-track {
                background-color: transparent;
            }

            ::-webkit-scrollbar-thumb {
                background-color: var(--b3-scroll-color);
                border-radius: 2px;
            }

            ::-webkit-scrollbar-corner {
                background-color: transparent;
            }

            /* 输入框占位符样式 */
            ::placeholder {
                color: var(--b3-theme-on-surface);
                opacity: 0.36;
            }

            /* 文本选择样式 */
            ::selection {
                background-color: var(--b3-theme-primary);
                color: var(--b3-theme-on-primary);
            }
        `;
    }
} 