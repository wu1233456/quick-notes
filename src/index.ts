import {
    Plugin,
    showMessage,
    confirm,
    Dialog,
    Menu,
    adaptHotkey,
    getFrontend,
    IModel,
    ICard,
    ICardData
} from "siyuan";
import "@/index.scss";

import { upload } from "./api";
import { initMardownStyle } from './components/markdown';
// 导入新的组件
import { ExportDialog } from './components/ExportDialog';
import { ExportService } from './components/ExportService';
import { HistoryService, HistoryData } from './components/HistoryService';
import { ARCHIVE_STORAGE_NAME, DOCK_STORAGE_NAME, CONFIG_DATA_NAME, ITEMS_PER_PAGE, MAX_TEXT_LENGTH, DOCK_TYPE } from './libs/const';
import { iconsSVG } from './components/icon';

export default class PluginQuickNote extends Plugin {
    private isCreatingNote: boolean = false; // 添加标志位跟踪新建小记窗口状态
    private tempNoteContent: string = ''; // 添加临时内容存储
    private tempNoteTags: string[] = []; // 添加临时标签存储

    customTab: () => IModel;
    private isMobile: boolean;
    private isDescending: boolean = true;
    private element: HTMLElement;
    private inputText: string;
    private currentDisplayCount: number = ITEMS_PER_PAGE;
    private selectedTags: string[] = [];
    private showArchived: boolean = false;

    private isBatchSelect: boolean = false;

    private exportDialog: ExportDialog;
    private exportService: ExportService;
    private historyService: HistoryService;


    async onload() {
        await this.initData();
        this.initComponents();
        console.log("onload");
    }

    async onLayoutReady() {
        console.log("onLayoutReady");
    }

    async onunload() {
        console.log(this.i18n.byePlugin);
    }

    uninstall() {
        console.log("uninstall");
    }

    private async initData() {
        const frontEnd = getFrontend();
        this.isMobile = frontEnd === "mobile" || frontEnd === "browser-mobile";

        // 初始化配置数据
        this.data[CONFIG_DATA_NAME] = await this.loadData(CONFIG_DATA_NAME) || {
            editorVisible: true,
        }

        // 初始化未归档小记数据
        this.data[DOCK_STORAGE_NAME] = await this.loadData(DOCK_STORAGE_NAME) || {
            history: []
        };
        // 初始化归档数据
        this.data[ARCHIVE_STORAGE_NAME] = await this.loadData(ARCHIVE_STORAGE_NAME) || {
            history: []
        };

        // 初始化历史服务
        const historyData: HistoryData = {
            history: this.data[DOCK_STORAGE_NAME]?.history || [],
            archivedHistory: this.data[ARCHIVE_STORAGE_NAME]?.history
        };
        //小记相关的存储统一交由historyService管理
        this.historyService = new HistoryService(this, historyData, ITEMS_PER_PAGE, this.i18n);

        // 初始化导出对话框和导出服务
        this.exportDialog = new ExportDialog(this.i18n);
        this.exportService = new ExportService(this.i18n);
    }
    private initComponents() {
        this.addIcons(iconsSVG);
        // 添加顶部栏按钮
        this.addTopBar({
            icon: "iconSmallNote",
            title: this.i18n.note.title,
            position: "right",
            callback: () => {
                this.createNewNote();
            }
        });

        // 添加快捷键命令
        this.addCommand({
            langKey: "createNewSmallNote",
            hotkey: "⇧⌘Y",
            // callback: () => {
            //     this.createNewNote(this.dock);
            // },
            globalCallback: () => {
                this.createNewNote();
                const { getCurrentWindow } = window.require('@electron/remote');
                const win = getCurrentWindow();
                win.show();
                win.focus();
            }

        });
        this.initDock();
        initMardownStyle();
    }
    private initDock() {
        // 创建 dock 时读取保存的位置
        this.addDock({
            config: {
                position: "RightTop",
                size: { width: 300, height: 0 },
                icon: "iconSmallNote",
                hotkey: '⇧⌘U',
                title: this.i18n.note.title,
            },
            data: {
                plugin: this
            },
            type: DOCK_TYPE,
            init() {
                this.data.plugin.element = this.element;
                this.data.plugin.initDockPanel();
            },
            destroy() {
                console.log("destroy dock:", DOCK_TYPE);
            }
        });
    }

    private initDockPanel() {
        let element = this.element;
        element.innerHTML = `<div class="fn__flex-1 fn__flex-column" style="height: 100%;">
                                <div class="fn__flex-1 plugin-sample__custom-dock fn__flex-column dock_quicknotes_container">
                                    <div class="topbar-container" style="width:100%"></div>
                                    <div class="editor-container" style="${this.data[CONFIG_DATA_NAME].editorVisible ? 'width:95%;display:block' : 'width:95%;display:None'}" ></div>
                                    <div class="toolbar-container" style="border-bottom: 1px solid var(--b3-border-color); flex-shrink: 0; width:95%;"></div>
                                    <div class="fn__flex-1 history-list" style="overflow: auto; margin: 0 8px; width: 95%;">
                                    </div>
                                </div>
                            </div>`;
        this.renderDockerTopbar();
        this.renderDockerEditor();
        this.renderDockHistory();
        this.renderDockerToolbar();

        this.bindDockPanelEvents();
    }
        
    private renderDockerTopbar(){
        this.element.querySelector('.topbar-container').innerHTML = ` <div class="block__icons">
        <div class="block__logo">
            <svg class="block__logoicon">
                <use xlink:href="#iconSmallNote"></use>
            </svg>
            ${this.i18n.note.title}
        </div>
        <span class="fn__flex-1 fn__space"></span>
        <span data-type="toggle-editor" class="block__icon b3-tooltips b3-tooltips__sw editor_toggle_btn"
            aria-label="${this.data[CONFIG_DATA_NAME].editorVisible ? this.i18n.note.hideEditor : this.i18n.note.showEditor}">
            <svg class="block__logoicon">
                <use xlink:href="${this.data[CONFIG_DATA_NAME].editorVisible ? '#iconPreview' : '#iconEdit'}"></use>
            </svg>
        </span>
        <span data-type="refresh" class="block__icon b3-tooltips b3-tooltips__sw" aria-label="Refresh">
            <svg class="block__logoicon">
                <use xlink:href="#iconRefresh"></use>
            </svg>
        </span>
        <span data-type="export" class="block__icon b3-tooltips b3-tooltips__sw" aria-label="Export">
            <svg class="block__logoicon">
                <use xlink:href="#iconExportNew"></use>
            </svg>
        </span>
        <span data-type="min" class="block__icon b3-tooltips b3-tooltips__sw" aria-label="Min ${adaptHotkey("⌘W")}">
            <svg class="block__logoicon">
                <use xlink:href="#iconMin"></use>
            </svg>
        </span>
             </div>`;
            this.renderDockTopbarEvents();
        
    }

    private renderDockTopbarEvents(){
            let element = this.element;
            const editorToggleBtn = element.querySelector('.editor_toggle_btn');
            editorToggleBtn.addEventListener('click',async ()=>{
                console.log("editorToggleBtn");
                console.log("toggle-editor");
                const editorContainer = element.querySelector('.editor-container');
                if (editorContainer) {
                    const isVisible = editorContainer.style.display !== 'none';
                    editorContainer.style.display = isVisible ? 'none' : 'block';
                    // 保存状态
                    this.data[CONFIG_DATA_NAME].editorVisible = !isVisible;
                    console.log("this.data[CONFIG_DATA_NAME]", this.data[CONFIG_DATA_NAME]);
                    await this.saveData(CONFIG_DATA_NAME, this.data[CONFIG_DATA_NAME]);
                    // 更新按钮图标和提示文本
                    const icon = editorToggleBtn.querySelector('use');
                    if (icon) {
                        icon.setAttribute('xlink:href', !isVisible ? '#iconPreview' : '#iconEdit');
                    }
                    editorToggleBtn.setAttribute('aria-label', !isVisible ? this.i18n.note.hideEditor : this.i18n.note.showEditor);
                }
            });
            // element.querySelectorAll('button, .block__icon').forEach(button => {
            //     const type = button.getAttribute('data-type');
            //     if (type) {
            //         button.onclick = async () => {
            //             switch (type) {
            //                 case 'refresh':
            //                     this.initData();
            //                     this.initDockPanel();
            //                     break;
            //                 case 'export':
            //                     break;
            //             }
            //         };
            //     }
            // });
    }
    private renderDockerEditor(){
        let element = this.element;

        element.querySelector('.editor-container').innerHTML = this.getEditorTemplate();
            // 绑定事件监听器
        const textarea = element.querySelector('textarea');
        if (textarea) {
            // 添加快捷键保存功能和待办转换功能
            textarea.addEventListener('keydown', async (e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault();
                    if (textarea.value.trim()) {
                        const tags = Array.from(element.querySelectorAll('.tag-item'))
                            .map(tag => tag.getAttribute('data-tag'));
                        await this.saveContent(textarea.value, tags);
                        textarea.value = '';
                        this.inputText = '';
                        // 清空标签
                        element.querySelector('.tags-list').innerHTML = '';
                    }
                }
            });

            // 实时保存输入内容
            textarea.oninput = (e) => {
                this.inputText = (e.target as HTMLTextAreaElement).value;
            };
        }
        // 修改标签输入相关的 HTML 和事件处理
        this.setupTagsFeature(element);

        element.querySelector('.main_save_btn').addEventListener('click',async ()=>{
            if (textarea.value.trim()) {
                const tags = Array.from(element.querySelectorAll('.tag-item'))
                    .map(tag => tag.getAttribute('data-tag'));
                await this.saveContent(textarea.value, tags);
            }
        });
    }

    private renderDockerToolbar(){
        this.element.querySelector('.toolbar-container').innerHTML = 
         `
                                <div class="fn__flex fn__flex-center" style="padding: 8px;">
                                    <div style="color: var(--b3-theme-on-surface-light); font-size: 12px;">
                                        ${this.i18n.note.total.replace('${count}', (this.historyService.getCurrentData() ||
            []).length.toString())}
                                    </div>
                                    <span class="fn__flex-1"></span>
                                    <button class="filter-menu-btn" style="border: none; background: none; padding: 4px; cursor: pointer;">
                                        <svg class="b3-button__icon" style="height: 16px; width: 16px; color: var(--b3-theme-primary);">
                                            <use xlink:href="#iconFilter"></use>
                                        </svg>
                                    </button>
                                </div>
                                <div class="fn__flex fn__flex-end" style="padding: 0 8px 8px 8px; gap: 8px;">
                                    <!-- 批量操作工具栏，默认隐藏 -->
                                    <div class="batch-toolbar fn__none fn__flex-column" style="gap: 8px; margin-right: auto;">
                                        <div class="fn__flex" style="gap: 8px;">
                                            <button class="b3-button b3-button--text batch-copy-btn b3-tooltips b3-tooltips__n"
                                                style="padding: 2px 2px; font-size: 12px;" aria-label="${this.i18n.note.copy}">
                                                <svg class="b3-button__icon" style="height: 14px; width: 14px;">
                                                    <use xlink:href="#iconCopy"></use>
                                                </svg>
                                            </button>
                                            <button class="b3-button b3-button--text batch-tag-btn b3-tooltips b3-tooltips__n"
                                                style="padding: 2px 2px; font-size: 12px;" aria-label="${this.i18n.note.tag}">
                                                <svg class="b3-button__icon" style="height: 14px; width: 14px;">
                                                    <use xlink:href="#iconTags"></use>
                                                </svg>
                                            </button>
                                            <button class="b3-button b3-button--text batch-archive-btn b3-tooltips b3-tooltips__n"
                                                style="padding: 2px 2px; font-size: 12px;"
                                                aria-label="${this.showArchived ? this.i18n.note.unarchive : this.i18n.note.archive}">
                                                <svg class="b3-button__icon" style="height: 14px; width: 14px;">
                                                    <use xlink:href="#iconArchive"></use>
                                                </svg>
                                            </button>
                                            <button class="b3-button b3-button--text batch-delete-btn b3-tooltips b3-tooltips__n"
                                                style="padding: 2px 2px; font-size: 12px;" aria-label="${this.i18n.note.delete}">
                                                <svg class="b3-button__icon" style="height: 14px; width: 14px;">
                                                    <use xlink:href="#iconTrashcan"></use>
                                                </svg>
                                            </button>
                                            <button class="b3-button b3-button--text batch-merge-btn b3-tooltips b3-tooltips__n"
                                                style="padding: 2px 2px; font-size: 12px;" aria-label="${this.i18n.note.merge}">
                                                <svg class="b3-button__icon" style="height: 14px; width: 14px;">
                                                    <use xlink:href="#iconMerge"></use>
                                                </svg>
                                            </button>
                                        </div>
                                        <div class="fn__flex" style="gap: 8px;">
                                            <button class="b3-button b3-button--outline select-all-btn"
                                                style="padding: 4px 8px; font-size: 12px;">
                                                ${this.i18n.note.selectAll}
                                            </button>
                                            <button class="b3-button b3-button--cancel cancel-select-btn"
                                                style="padding: 4px 8px; font-size: 12px;">
                                                ${this.i18n.note.cancelSelect}
                                            </button>
                                        </div>
                                    </div>
                                    <!-- 常规工具栏 -->
                                    <div class="normal-toolbar fn__flex" style="gap: 8px;">
                                        <div class="search-container fn__flex">
                                            <div class="search-wrapper" style="position: relative;">
                                                <input type="text" class="search-input b3-text-field" placeholder="${this.i18n.note.search}"
                                                    style="width: 0; padding: 4px 8px; transition: all 0.3s ease; opacity: 0;">
                                                <button class="search-btn"
                                                    style="position: absolute; right: 0; top: 0; border: none; background: none; padding: 4px; cursor: pointer;">
                                                    <svg class="b3-button__icon"
                                                        style="height: 16px; width: 16px; color: var(--b3-theme-primary);">
                                                        <use xlink:href="#iconSearch"></use>
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                        <button class="filter-btn"
                                            style="border: none; background: none; padding: 4px; cursor: pointer; position: relative;"
                                            title="${this.i18n.note.tagFilter}">
                                            <svg class="b3-button__icon" style="height: 16px; width: 16px; color: var(--b3-theme-primary);">
                                                <use xlink:href="#iconTags"></use>
                                            </svg>
                                            ${this.selectedTags.length > 0 ? `
                                            <div
                                                style="position: absolute; top: 0; right: 0; width: 6px; height: 6px; border-radius: 50%; background-color: var(--b3-theme-primary);">
                                            </div>
                                            ` : ''}
                                        </button>
                                        <button class="sort-btn" style="border: none; background: none; padding: 4px; cursor: pointer;"
                                            title="${this.i18n.note.sort}">
                                            <svg class="b3-button__icon" style="height: 16px; width: 16px; color: var(--b3-theme-primary);">
                                                <use xlink:href="#iconSort"></use>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                <div class="filter-panel"
                                    style="display: none; padding: 8px; border-top: 1px solid var(--b3-border-color);">
                                    <div style="font-size: 12px; color: var(--b3-theme-on-surface-light); margin-bottom: 8px;">
                                        ${this.i18n.note.tagFilter}
                                    </div>
                                    <div class="filter-tags" style="display: flex; flex-wrap: wrap; gap: 8px;">
                                        ${Array.from(new Set(this.historyService.getCurrentData()?.flatMap(item => item.tags || []) || []))
                .map(tag => {
                    const isSelected = this.selectedTags.includes(tag);
                    return `
                                        <span class="b3-chip b3-chip--middle filter-tag b3-tooltips b3-tooltips__n" style="cursor: pointer; 
                                                                                background-color: ${isSelected ? 'var(--b3-theme-primary)' : 'var(--b3-theme-surface)'};
                                                                                color: ${isSelected ? 'var(--b3-theme-on-primary)' : 'var(--b3-theme-on-surface)'};
                                                                                border: 1px solid ${isSelected ? 'var(--b3-theme-primary)' : 'var(--b3-border-color)'};
                                                                                transition: all 0.2s ease;" data-tag="${tag}"
                                            aria-label="${tag}" data-selected="${isSelected}">
                                            <span class="b3-chip__content"
                                                style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${tag}</span>
                                            <span class="tag-count" style="margin-left: 4px; font-size: 10px; opacity: 0.7;">
                                                ${this.historyService.getCurrentData().filter(item => item.tags?.includes(tag)).length}
                                            </span>
                                        </span>`;
                }).join('')}
                                    </div>
                                </div>`;
        this.bindDockerToolbarEvents();
    }
    private bindDockerToolbarEvents(){
        let element = this.element;

        // 添加批量选择相关的事件处理
        const container = element.querySelector('.toolbar-container');
        const filterMenuBtn = container.querySelector('.filter-menu-btn');
        const batchToolbar = container.querySelector('.batch-toolbar') as HTMLElement;
        const normalToolbar = container.querySelector('.normal-toolbar') as HTMLElement;

       
        filterMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const rect = filterMenuBtn.getBoundingClientRect();
            const menu = new Menu("filterMenu");

            // 添加批量选择选项
            menu.addItem({
                icon: "iconCheck",
                label: this.i18n.note.batchSelect,
                click: () => {
                    this.isBatchSelect = true;
                    // 重置全选按钮文本
                    if (selectAllBtn) {
                        selectAllBtn.textContent = this.i18n.note.selectAll;
                    }
                    batchToolbar.classList.remove('fn__none');
                    normalToolbar.classList.add('fn__none');
                    this.renderDockHistory();
                }
            });

            menu.addSeparator();

            // 修改为状态过滤选项
            menu.addItem({
                icon: "iconStatus",
                label: this.i18n.note.status,
                type: "submenu",
                submenu: [{
                    icon: !this.showArchived ? "iconSelect" : "",
                    label: this.i18n.note.showActive,
                    click: () => {
                        this.showArchived = false;
                        this.historyService.setShowArchived(false);
                        this.renderDockerToolbar();
                        this.renderDockHistory();
                    }
                }, {
                    icon: this.showArchived ? "iconSelect" : "",
                    label: this.i18n.note.showArchived,
                    click: () => {
                        this.showArchived = true;
                        this.historyService.setShowArchived(true);
                        // console.log("this.showArchived",this.showArchived);
                        this.renderDockerToolbar();
                        this.renderDockHistory();
                    }
                }]
            });

            // 添加其他过滤选项
            menu.addItem({
                icon: "iconSort",
                label: this.i18n.note.sort,
                type: "submenu",
                submenu: [{
                    icon: this.isDescending ? "iconSelect" : "",
                    label: this.i18n.note.sortByTimeDesc,
                    click: () => {
                        this.isDescending = true;
                        // 根据当前状态选择要排序的数据源
                        if (this.showArchived) {
                            this.data[ARCHIVE_STORAGE_NAME].history.sort((a, b) => b.timestamp - a.timestamp);
                        } else {
                            this.data[DOCK_STORAGE_NAME].history.sort((a, b) => b.timestamp - a.timestamp);
                        }
                        // renderDock(true);
                        this.renderDockHistory();
                    }
                }, {
                    icon: !this.isDescending ? "iconSelect" : "",
                    label: this.i18n.note.sortByTimeAsc,
                    click: () => {
                        this.isDescending = false;
                        // 根据当前状态选择要排序的数据源
                        if (this.showArchived) {
                            this.data[ARCHIVE_STORAGE_NAME].history.sort((a, b) => a.timestamp - b.timestamp);
                        } else {
                            this.data[DOCK_STORAGE_NAME].history.sort((a, b) => a.timestamp - b.timestamp);
                        }
                        
                        this.renderDockHistory();
                    }
                }]
            });

            menu.open({
                x: rect.right,
                y: rect.bottom,
                isLeft: true,
            });
        });

        // 批量选择相关的事件处理保持不变
        const selectAllBtn = container.querySelector('.select-all-btn') as HTMLButtonElement;
        const batchDeleteBtn = container.querySelector('.batch-delete-btn') as HTMLButtonElement;
        const cancelSelectBtn = container.querySelector('.cancel-select-btn') as HTMLButtonElement;

        if (selectAllBtn && batchDeleteBtn && cancelSelectBtn) {
            // 取消选择
            cancelSelectBtn.onclick = () => {
                batchToolbar.classList.add('fn__none');
                normalToolbar.classList.remove('fn__none');
                this.isBatchSelect = false;
                this.renderDockHistory();
            };

            // 全选/取消全选
            selectAllBtn.onclick = () => {
                let historyList = element.querySelector('.history-list');
                const inputs = historyList.querySelectorAll('.batch-checkbox input') as NodeListOf<HTMLInputElement>;
                const allChecked = Array.from(inputs).every(input => input.checked);
                inputs.forEach(input => input.checked = !allChecked);
                selectAllBtn.textContent = allChecked ? this.i18n.note.selectAll : this.i18n.note.deselectAll;
            };

            // 批量删除
            batchDeleteBtn.onclick = async () => {
                const selectedTimestamps = Array.from(container.querySelectorAll('.batch-checkbox input:checked'))
                    .map(input => Number((input as HTMLInputElement).getAttribute('data-timestamp')));

                if (selectedTimestamps.length === 0) {
                    showMessage(this.i18n.note.noItemSelected);
                    return;
                }

                confirm(this.i18n.note.batchDelete, this.i18n.note.batchDeleteConfirm, async () => {
                    try {
                        this.data[DOCK_STORAGE_NAME].history = this.data[DOCK_STORAGE_NAME].history
                            .filter(item => !selectedTimestamps.includes(item.timestamp));

                        await this.saveData(DOCK_STORAGE_NAME, this.data[DOCK_STORAGE_NAME]);

                        cancelSelectBtn.click();
                        this.renderDockHistory();

                        // showMessage(this.i18n.note.batchDeleteSuccess);
                    } catch (error) {
                        showMessage(this.i18n.note.batchDeleteFailed);
                    }
                });
            };
        }

        // 添加标签过滤功能
        const filterBtn = container.querySelector('.filter-btn');
        const filterPanel = container.querySelector('.filter-panel') as HTMLElement;

        
        filterBtn.onclick = () => {
            const filterPanel = container.querySelector('.filter-panel') as HTMLElement;
            if (filterPanel) {
                const isVisible = filterPanel.style.display !== 'none';
                filterPanel.style.display = isVisible ? 'none' : 'block';

                // 当面板显示时，重新绑定标签点击事件
                if (!isVisible) {
                    filterPanel.querySelectorAll('.filter-tag').forEach(tag => {
                        // 移除旧的事件监听器
                        tag.replaceWith(tag.cloneNode(true));

                        // 重新获取元素并添加事件监听器
                        const newTag = filterPanel.querySelector(`[data-tag="${tag.getAttribute('data-tag')}"]`);
                        if (newTag) {
                            newTag.addEventListener('click', () => {
                                const tagText = newTag.getAttribute('data-tag');
                                const isSelected = newTag.getAttribute('data-selected') === 'true';

                                if (isSelected) {
                                    this.selectedTags = this.selectedTags.filter(t => t !== tagText);
                                    newTag.style.backgroundColor = 'var(--b3-theme-surface)';
                                    newTag.style.color = 'var(--b3-theme-on-surface)';
                                    newTag.style.border = '1px solid var(--b3-border-color)';
                                } else {
                                    this.selectedTags.push(tagText);
                                    newTag.style.backgroundColor = 'var(--b3-theme-primary)';
                                    newTag.style.color = 'var(--b3-theme-on-primary)';
                                    newTag.style.border = '1px solid var(--b3-theme-primary)';
                                }
                                newTag.setAttribute('data-selected', (!isSelected).toString());

                                // 更新过滤状态小圆点
                                const indicator = filterBtn.querySelector('div');
                                if (this.selectedTags.length > 0) {
                                    if (!indicator) {
                                        filterBtn.insertAdjacentHTML('beforeend', `
                                            <div style="position: absolute; top: 0; right: 0; width: 6px; height: 6px; border-radius: 50%; background-color: var(--b3-theme-primary);"></div>
                                        `);
                                    }
                                } else if (indicator) {
                                    indicator.remove();
                                }

                                // 重新渲染列表
                                this.renderDockHistory();
                            });
                        }
                    });
                }
            }
        };
        // 批量复制
        const batchCopyBtn = container.querySelector('.batch-copy-btn') as HTMLButtonElement;
        
        batchCopyBtn.onclick = async () => {
            let historyList = element.querySelector('.history-list');
            const selectedItems = Array.from(historyList.querySelectorAll('.batch-checkbox input:checked'))
                .map(input => {
                    const historyItem = (input as HTMLInputElement).closest('.history-item');
                    return historyItem?.querySelector('[data-text]')?.getAttribute('data-text') || '';
                })
                .filter(text => text);

            if (selectedItems.length === 0) {
                showMessage(this.i18n.note.noItemSelected);
                return;
            }

            try {
                await navigator.clipboard.writeText(selectedItems.join('\n\n'));
                showMessage(this.i18n.note.copySuccess);
                cancelSelectBtn.click(); // 复制后自动退出选择模式
            } catch (err) {
                console.error('批量复制失败:', err);
                showMessage(this.i18n.note.copyFailed);
            }
        };

        // 批量归档/取消归档
        const batchArchiveBtn = container.querySelector('.batch-archive-btn') as HTMLButtonElement;
        if (batchArchiveBtn) {
            batchArchiveBtn.onclick = async () => {
                const selectedTimestamps = Array.from(container.querySelectorAll('.batch-checkbox input:checked'))
                    .map(input => Number((input as HTMLInputElement).getAttribute('data-timestamp')));

                if (selectedTimestamps.length === 0) {
                    showMessage(this.i18n.note.noItemSelected);
                    return;
                }

                const confirmMessage = this.showArchived ?
                    this.i18n.note.batchUnarchiveConfirm :
                    this.i18n.note.batchArchiveConfirm;

                confirm(
                    this.showArchived ? this.i18n.note.unarchive : this.i18n.note.archive,
                    confirmMessage,
                    async () => {
                        try {
                            if (this.showArchived) {
                                // 批量取消归档
                                const itemsToUnarchive = this.data[ARCHIVE_STORAGE_NAME].history
                                    .filter(item => selectedTimestamps.includes(item.timestamp));

                                // 从归档中移除
                                this.data[ARCHIVE_STORAGE_NAME].history =
                                    this.data[ARCHIVE_STORAGE_NAME].history
                                        .filter(item => !selectedTimestamps.includes(item.timestamp));

                                // 添加到活动记录
                                this.data[DOCK_STORAGE_NAME].history.unshift(...itemsToUnarchive);
                            } else {
                                // 批量归档
                                const itemsToArchive = this.data[DOCK_STORAGE_NAME].history
                                    .filter(item => selectedTimestamps.includes(item.timestamp));

                                // 从活动记录中移除
                                this.data[DOCK_STORAGE_NAME].history =
                                    this.data[DOCK_STORAGE_NAME].history
                                        .filter(item => !selectedTimestamps.includes(item.timestamp));

                                // 添加到归档
                                this.data[ARCHIVE_STORAGE_NAME].history.unshift(...itemsToArchive);
                            }

                            // 保存更改
                            await this.saveData(DOCK_STORAGE_NAME, this.data[DOCK_STORAGE_NAME]);
                            await this.saveData(ARCHIVE_STORAGE_NAME, this.data[ARCHIVE_STORAGE_NAME]);

                            showMessage(this.showArchived ?
                                this.i18n.note.batchUnarchiveSuccess :
                                this.i18n.note.batchArchiveSuccess
                            );

                            cancelSelectBtn.click(); // 操作完成后退出选择模式
                            this.renderDockHistory();
                        } catch (error) {
                            console.error('批量归档/取消归档失败:', error);
                            showMessage(this.showArchived ?
                                this.i18n.note.batchUnarchiveFailed :
                                this.i18n.note.batchArchiveFailed
                            );
                        }
                    }
                );
            };
        }

        // 批量合并功能
        const batchMergeBtn = container.querySelector('.batch-merge-btn') as HTMLButtonElement;
        if (batchMergeBtn) {
            batchMergeBtn.onclick = async () => {
                const selectedItems = Array.from(container.querySelectorAll('.batch-checkbox input:checked'))
                    .map(input => {
                        const historyItem = (input as HTMLInputElement).closest('.history-item');
                        return {
                            timestamp: Number((input as HTMLInputElement).getAttribute('data-timestamp')),
                            text: historyItem?.querySelector('[data-text]')?.getAttribute('data-text') || '',
                            tags: Array.from(historyItem?.querySelectorAll('.b3-chip__content') || []).map(tag => tag.textContent)
                        };
                    })
                    .filter(item => item.text);

                if (selectedItems.length === 0) {
                    showMessage(this.i18n.note.noItemSelected);
                    return;
                }

                // 合并内容和标签
                const mergedText = selectedItems.map(item => item.text).join('\n\n');
                const mergedTags = Array.from(new Set(selectedItems.flatMap(item => item.tags)));

                // 创建新的小记
                await this.saveContent(mergedText, mergedTags);
                showMessage(this.i18n.note.mergeSuccess);

                // 询问是否删除已合并的小记
                confirm(this.i18n.note.mergeDeleteConfirm, this.i18n.note.mergeDeleteConfirmTitle, async () => {
                    try {
                        // 删除已合并的小记
                        const timestamps = selectedItems.map(item => item.timestamp);
                        this.data[DOCK_STORAGE_NAME].history = this.data[DOCK_STORAGE_NAME].history
                            .filter(item => !timestamps.includes(item.timestamp));

                        // 保存更改
                        await this.saveData(DOCK_STORAGE_NAME, this.data[DOCK_STORAGE_NAME]);
                        showMessage(this.i18n.note.mergeDeleteSuccess);
                    } catch (error) {
                        console.error('删除已合并的小记失败:', error);
                        showMessage(this.i18n.note.mergeDeleteFailed);
                    }

                    // 取消选择模式
                    cancelSelectBtn.click();
                    this.renderDockHistory();
                }, () => {
                    // 用户取消删除，只取消选择模式
                    cancelSelectBtn.click();
                    this.renderDockHistory();
                });
            };
        }

        // 批量标签修改功能
        const batchTagBtn = container.querySelector('.batch-tag-btn') as HTMLButtonElement;
        if (batchTagBtn) {
            batchTagBtn.onclick = () => {
                const selectedTimestamps = Array.from(container.querySelectorAll('.batch-checkbox input:checked'))
                    .map(input => Number((input as HTMLInputElement).getAttribute('data-timestamp')));

                if (selectedTimestamps.length === 0) {
                    showMessage(this.i18n.note.noItemSelected);
                    return;
                }

                // 创建标签面板
                const tagPanel = document.createElement('div');
                tagPanel.className = 'tag-panel';
                tagPanel.style.cssText = `
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
                `;

                // 计算位置
                const btnRect = batchTagBtn.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                const panelHeight = 150;
                const margin = 8;

                // 判断是否有足够空间在上方显示
                const showAbove = btnRect.top > panelHeight + margin;
                const top = showAbove ?
                    btnRect.top - panelHeight - margin :
                    btnRect.bottom + margin;

                tagPanel.style.top = `${top}px`;
                tagPanel.style.left = `${btnRect.left}px`;

                // 如果面板会超出视口右侧，则向左对齐
                if (btnRect.left + 133 > window.innerWidth) {
                    tagPanel.style.left = `${btnRect.left + btnRect.width - 133}px`;
                }

                // 获取所有已有标签
                const allTags = Array.from(new Set(this.data[DOCK_STORAGE_NAME]?.history
                    ?.flatMap(item => item.tags || []) || []));

                // 修改面板内容结构
                tagPanel.innerHTML = `
                    <div style="padding: 8px; border-bottom: 1px solid var(--b3-border-color); background: var(--b3-menu-background); flex-shrink: 0;">
                        <input type="text" 
                            class="b3-text-field fn__flex-1 tag-input" 
                            placeholder="${this.i18n.note.addTag}..."
                            style="width: 100%; background: var(--b3-theme-background);">
                    </div>
                    <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--b3-menu-background);">
                        <div style="padding: 8px 8px 4px 8px; font-size: 12px; color: var(--b3-theme-on-surface-light); flex-shrink: 0;">
                            ${this.i18n.note.existingTags}
                        </div>
                        <div class="history-tags" style="padding: 0 8px 8px 8px; overflow-y: auto; flex: 1;">
                            <div style="display: flex; flex-direction: column; gap: 4px;">
                                ${allTags.length > 0 ?
                        allTags
                            .sort((a, b) => {
                                const countA = this.data[DOCK_STORAGE_NAME].history.filter(item => item.tags?.includes(a)).length;
                                const countB = this.data[DOCK_STORAGE_NAME].history.filter(item => item.tags?.includes(b)).length;
                                return countB - countA;
                            })
                            .map(tag => `
                                            <div class="history-tag b3-chip b3-chip--middle" 
                                                style="cursor: pointer; padding: 4px 8px; display: flex; justify-content: space-between; align-items: center; background: var(--b3-menu-background);" 
                                                data-tag="${tag}">
                                                <span class="b3-chip__content" style="max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                                    ${tag}
                                                </span>
                                                <span class="tag-count" style="font-size: 10px; opacity: 0.7; background: var(--b3-theme-surface); padding: 2px 4px; border-radius: 8px;">
                                                    ${this.data[DOCK_STORAGE_NAME].history.filter(item => item.tags?.includes(tag)).length}
                                                </span>
                                            </div>
                                        `).join('')
                        : `<div style="color: var(--b3-theme-on-surface-light); font-size: 12px; text-align: center; padding: 8px;">
                                        ${this.i18n.note.noTags}
                                       </div>`
                    }
                            </div>
                        </div>
                    </div>
                `;

                // 将面板添加到文档根节点
                document.body.appendChild(tagPanel);

                // 获取输入框元素
                const tagInput = tagPanel.querySelector('.tag-input') as HTMLInputElement;
                tagInput.focus();

                // 添加标签的函数
                const addTag = async (tagText: string) => {
                    if (tagText.trim()) {
                        // 更新选中小记的标签
                        const updatedItems = [];
                        for (const timestamp of selectedTimestamps) {
                            const note = this.data[DOCK_STORAGE_NAME].history.find(note => note.timestamp === timestamp);
                            if (note) {
                                note.tags = [tagText.trim()]; // 直接覆盖原有标签
                                updatedItems.push(note);
                            }
                        }

                        if (updatedItems.length > 0) {
                            // 保存更改
                            await this.saveData(DOCK_STORAGE_NAME, this.data[DOCK_STORAGE_NAME]);
                            showMessage(this.i18n.note.tagSuccess);

                            // 取消选择模式并关闭面板
                            const cancelSelectBtn = container.querySelector('.cancel-select-btn');
                            if (cancelSelectBtn) {
                                (cancelSelectBtn as HTMLElement).click();
                            }
                            tagPanel.remove();
                            document.removeEventListener('click', closePanel);
                            this.renderDockHistory();
                        }
                    }
                };

                // 回车添加标签
                tagInput.addEventListener('keydown', async (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        const searchText = tagInput.value.trim();
                        if (searchText) {
                            // 检查是否有匹配的已有标签
                            const matchingTag = Array.from(tagPanel.querySelectorAll('.history-tag'))
                                .find(tag => tag.getAttribute('data-tag').toLowerCase() === searchText.toLowerCase());

                            if (matchingTag) {
                                // 如果有完全匹配的标签，直接使用该标签
                                await addTag(matchingTag.getAttribute('data-tag'));
                            } else {
                                // 如果没有完全匹配的标签，创建新标签
                                await addTag(searchText);
                            }
                        }
                    }
                });

                // 点击历史标签直接添加
                tagPanel.addEventListener('click', async (e) => {
                    const target = e.target as HTMLElement;
                    const tagChip = target.closest('.history-tag') as HTMLElement;
                    if (tagChip) {
                        const tagText = tagChip.getAttribute('data-tag');
                        if (tagText) {
                            await addTag(tagText);
                        }
                    }
                });

                // 添加搜索功能
                tagInput.addEventListener('input', (e) => {
                    const searchText = (e.target as HTMLInputElement).value.toLowerCase();
                    const historyTags = tagPanel.querySelectorAll('.history-tag');

                    historyTags.forEach(tag => {
                        const tagText = tag.getAttribute('data-tag').toLowerCase();
                        if (tagText.includes(searchText)) {
                            (tag as HTMLElement).style.display = 'flex';
                        } else {
                            (tag as HTMLElement).style.display = 'none';
                        }
                    });

                    // 如果没有匹配的标签，显示"无匹配标签"提示
                    const visibleTags = Array.from(historyTags).filter(tag =>
                        (tag as HTMLElement).style.display !== 'none'
                    );

                    const noMatchMessage = tagPanel.querySelector('.no-match-message');
                    if (visibleTags.length === 0 && searchText) {
                        if (!noMatchMessage) {
                            const messageDiv = document.createElement('div');
                            messageDiv.className = 'no-match-message';
                            messageDiv.style.cssText = 'color: var(--b3-theme-on-surface-light); font-size: 12px; text-align: center; padding: 8px;';
                            messageDiv.textContent = this.i18n.note.noMatchingTags;
                            tagPanel.querySelector('.history-tags').appendChild(messageDiv);
                        }
                    } else if (noMatchMessage) {
                        noMatchMessage.remove();
                    }
                });

                // 点击其他地方关闭面板
                const closePanel = (e: MouseEvent) => {
                    if (!tagPanel.contains(e.target as Node) && !batchTagBtn.contains(e.target as Node)) {
                        tagPanel.remove();
                        document.removeEventListener('click', closePanel);
                    }
                };

                // 延迟添加点击事件，避免立即触发
                setTimeout(() => {
                    document.addEventListener('click', closePanel);
                }, 0);

                // 添加标签悬停效果
                tagPanel.querySelectorAll('.history-tag').forEach(tag => {
                    tag.addEventListener('mouseenter', () => {
                        (tag as HTMLElement).style.backgroundColor = 'var(--b3-theme-primary-light)';
                    });
                    tag.addEventListener('mouseleave', () => {
                        (tag as HTMLElement).style.backgroundColor = '';
                    });
                });
            };
        }

         // 设置搜索功能
         this.setupSearchFeature(element);

         // 设置排序功能
         this.setupSortFeature(element);
 
         // // 设置标签过滤功能
         this.setupFilterFeature(element);
    }
    private renderDockHistory(){
        let element = this.element;
        this.historyService.setIsDescending(this.isDescending);
        this.historyService.setShowArchived(this.showArchived);
        const filteredHistory = this.historyService.getFilteredHistory(true);
        let historyHtml = '';

        // 添加归档状态指示
        if (this.historyService.isArchiveView()) {
            historyHtml += `
                <div class="fn__flex-center" style="padding: 8px; background: var(--b3-theme-surface); color: var(--b3-theme-on-surface); font-size: 12px;">
                    <svg class="b3-button__icon" style="height: 14px; width: 14px; margin-right: 4px;">
                        <use xlink:href="#iconArchive"></use>
                    </svg>
                    ${this.i18n.note.archivedView}
                </div>`;
        }

        // 渲染置顶记录
        if (filteredHistory.pinnedItems.length > 0) {
            historyHtml += this.renderPinnedHistory(filteredHistory.pinnedItems);
        }

        // 渲染非置顶记录，但只显示当前限制数量的记录
        const displayedUnpinnedItems = filteredHistory.unpinnedItems.slice(0, this.currentDisplayCount);
        if (displayedUnpinnedItems.length > 0) {
            historyHtml += this.renderUnpinnedHistory(displayedUnpinnedItems, filteredHistory.pinnedItems.length > 0);
        }

        // 添加加载更多按钮
        const totalUnpinnedCount = filteredHistory.unpinnedItems.length;
        console.log("totalUnpinnedCount", totalUnpinnedCount);
        if (totalUnpinnedCount > this.currentDisplayCount) {
            historyHtml += this.renderLoadMoreButton(this.currentDisplayCount, totalUnpinnedCount);
        } else if (displayedUnpinnedItems.length > 0) {
            historyHtml += this.renderNoMoreItems();
        }

        let historyContent = `<div class="history-content">${historyHtml}</div>`;
        element.querySelector('.history-list').innerHTML = historyContent;


        const loadMoreBtn = element.querySelector('.load-more-btn');
        if (loadMoreBtn) {
            loadMoreBtn.onclick = () => {
                // 增加显示数量
                this.currentDisplayCount += ITEMS_PER_PAGE;

                // 获取历史内容容器
                const historyContent = element.querySelector('.history-content');
                if (historyContent) {
                    // 获取新的要显示的记录
                    const newItems = filteredHistory.unpinnedItems.slice(
                        this.currentDisplayCount - ITEMS_PER_PAGE, 
                        this.currentDisplayCount
                    );

                    // 渲染并追加新的记录
                    if (newItems.length > 0) {
                        const newContent = this.renderUnpinnedHistory(newItems, false);
                        // 将新内容插入到加载更多按钮之前
                        loadMoreBtn.parentElement.insertAdjacentHTML('beforebegin', newContent);
                    }

                    // 更新加载更多按钮的文本和显示状态
                    const loadMoreContainer = loadMoreBtn.parentElement;
                    const noMoreContainer = element.querySelector('.no-more-container');
                    
                    if (totalUnpinnedCount > this.currentDisplayCount) {
                        // 还有更多内容可以加载
                        loadMoreBtn.textContent = `${this.i18n.note.loadMore} (${this.i18n.note.showing
                            .replace('${shown}', this.currentDisplayCount.toString())
                            .replace('${total}', totalUnpinnedCount.toString())})`;
                        loadMoreContainer.style.display = '';
                        if (noMoreContainer) noMoreContainer.style.display = 'none';
                    } else {
                        // 没有更多内容了
                        loadMoreContainer.style.display = 'none';
                        if (noMoreContainer) {
                            noMoreContainer.style.display = '';
                        } else {
                            // 如果没有"没有更多"提示元素，则创建一个
                            historyContent.insertAdjacentHTML('beforeend', `
                                <div class="fn__flex-center no-more-container" style="padding: 16px 0; color: var(--b3-theme-on-surface-light); font-size: 12px;">
                                    ${this.i18n.note.noMore}
                                </div>`
                            );
                        }
                    }

                    // 重新绑定新添加内容的事件处理
                    this.setupHistoryListEvents();
                }
            };
        }

        // 监听历史记录点击事件
        this.setupHistoryListEvents();
    }

       // 设置历史小记中的编辑、复制、删除事件
    private setupHistoryListEvents() {
        let element = this.element;
        let historyList =  element.querySelector('.history-list')
        historyList.addEventListener('click',async (e)=>{
            const target = e.target as HTMLElement;
            const moreBtn = target.closest('.more-btn') as HTMLElement;
            const copyBtn = target.closest('.copy-btn') as HTMLElement;
            const editBtn = target.closest('.edit-btn') as HTMLElement;
            const toggleBtn = target.closest('.toggle-text');

            if (copyBtn) {
                e.stopPropagation();
                const textContainer = copyBtn.closest('.history-item').querySelector('[data-text]');
                if (textContainer) {
                    const text = textContainer.getAttribute('data-text') || '';
                    try {
                        await navigator.clipboard.writeText(text);
                        showMessage(this.i18n.note.copySuccess);
                    } catch (err) {
                        console.error('复制失败:', err);
                        showMessage(this.i18n.note.copyFailed);
                    }
                }
            } else if (editBtn) {
                e.stopPropagation();
                const timestamp = Number(editBtn.getAttribute('data-timestamp'));
                const textContainer = editBtn.closest('.history-item').querySelector('[data-text]');
                if (textContainer) {
                    await this.editHistoryItem(timestamp)
                }
            } else if (moreBtn) {
                e.stopPropagation();
                const timestamp = Number(moreBtn.getAttribute('data-timestamp'));
                const rect = moreBtn.getBoundingClientRect();

                // 获取当前记录项
                const currentItem = this.showArchived ?
                    this.data[ARCHIVE_STORAGE_NAME].history.find(
                        item => item.timestamp === timestamp
                    ) :
                    this.data[DOCK_STORAGE_NAME].history.find(
                        item => item.timestamp === timestamp
                    );

                const menu = new Menu("historyItemMenu");
                menu.addItem({
                    icon: "iconPin",
                    label: currentItem?.isPinned ? this.i18n.note.unpin : this.i18n.note.pin,
                    click: async () => {
                        this.historyService.toggleItemPin(timestamp);
                    }
                });

                // 添加归档/取消归档选项
                menu.addItem({
                    icon: "iconArchive",
                    label: this.showArchived ? this.i18n.note.unarchive : this.i18n.note.archive,
                    click: async () => {
                        if (this.showArchived) {
                            // 从归档中恢复
                            const index = this.data[ARCHIVE_STORAGE_NAME].history.findIndex(
                                i => i.timestamp === timestamp
                            );
                            if (index !== -1) {
                                const item = this.data[ARCHIVE_STORAGE_NAME].history.splice(index, 1)[0];
                                this.data[DOCK_STORAGE_NAME].history.unshift(item);
                                await this.saveData(ARCHIVE_STORAGE_NAME, this.data[ARCHIVE_STORAGE_NAME]);
                                await this.saveData(DOCK_STORAGE_NAME, this.data[DOCK_STORAGE_NAME]);
                                showMessage(this.i18n.note.unarchiveSuccess);
                            }
                        } else {
                            await this.historyService.archiveItem(timestamp);
                        }
                        this.renderDockHistory();
                    }
                });

                menu.addItem({
                    icon: "iconTrashcan",
                    label: this.i18n.note.delete,
                    click: async () => {
                        confirm(this.i18n.note.delete, this.i18n.note.deleteConfirm, async () => {
                            // 根据当前状态选择正确的数据源
                            const storageKey = this.showArchived ? ARCHIVE_STORAGE_NAME : DOCK_STORAGE_NAME;

                            // 从对应的数据源中删除
                            const index = this.data[storageKey].history.findIndex(
                                i => i.timestamp === timestamp
                            );

                            if (index !== -1) {
                                this.data[storageKey].history.splice(index, 1);
                                await this.saveData(storageKey, this.data[storageKey]);
                                // showMessage(this.i18n.note.deleteSuccess);
                                this.renderDockHistory();
                            }
                        });
                    }
                });

                menu.open({
                    x: rect.right,
                    y: rect.bottom,
                    isLeft: true,
                });
            } else if (toggleBtn) {
                const textContent = toggleBtn.closest('.text-content');
                const collapsedText = textContent.querySelector('.collapsed-text');
                const expandedText = textContent.querySelector('.expanded-text');

                if (collapsedText.style.display !== 'none') {
                    // 展开
                    collapsedText.style.display = 'none';
                    expandedText.style.display = 'inline';
                    toggleBtn.innerHTML = `${this.i18n.note.collapse}
                        <svg class="b3-button__icon" style="height: 12px; width: 12px; margin-left: 2px; transform: rotate(180deg); transition: transform 0.2s ease;">
                            <use xlink:href="#iconDown"></use>
                        </svg>`;
                } else {
                    // 折叠
                    collapsedText.style.display = 'inline';
                    expandedText.style.display = 'none';
                    toggleBtn.innerHTML = `${this.i18n.note.expand}
                        <svg class="b3-button__icon" style="height: 12px; width: 12px; margin-left: 2px; transform: rotate(0deg); transition: transform 0.2s ease;">
                            <use xlink:href="#iconDown"></use>
                        </svg>`;
                }
                e.stopPropagation();
            }
        });
           // 添加任务列表勾选框事件处理
        historyList.addEventListener('change', async (e) => {
            const target = e.target as HTMLInputElement;
            if (target.classList.contains('task-list-item-checkbox')) {
                const timestamp = Number(target.closest('.task-list-item').getAttribute('data-timestamp'));
                const originalMark = target.getAttribute('data-original');
                const newMark = target.checked ? '[x]' : '[ ]';

                // 更新数据
                const note = this.data[DOCK_STORAGE_NAME].history.find(
                    item => item.timestamp === timestamp
                );

                if (note) {
                    // 获取当前任务项的完整文本
                    const taskItemText = target.nextElementSibling.textContent.trim();

                    // 使用更精确的替换方法
                    const oldTaskItem = `${originalMark} ${taskItemText}`;
                    const newTaskItem = `${newMark} ${taskItemText}`;
                    note.text = note.text.replace(oldTaskItem, newTaskItem);

                    // 保存更改
                    await this.saveData(DOCK_STORAGE_NAME, this.data[DOCK_STORAGE_NAME]);

                    // 更新 data-original 属性
                    target.setAttribute('data-original', newMark);

                    // 添加视觉反馈
                    const textSpan = target.nextElementSibling as HTMLElement;
                    if (textSpan) {
                        textSpan.style.textDecoration = target.checked ? 'line-through' : 'none';
                        textSpan.style.opacity = target.checked ? '0.6' : '1';
                    }

                    // 可选：添加操作成功的提示
                    showMessage(target.checked ? '已完成任务' : '已取消完成');
                }
            }
        });

    }

    private bindDockPanelEvents() {
        let element = this.element;

        // 设置导出功能
        this.setupExportFeature(element);
        this.setupImageUpload(element);
    };


    // 渲染置顶记录
    private renderPinnedHistory(pinnedHistory: Array<{ text: string, timestamp: number, isPinned?: boolean, tags?: string[] }>) {
        return `<div class="pinned-records" style="margin-top: 8px;">
            ${pinnedHistory.map(item => `
                <div class="history-item" style="margin-bottom: 8px; padding: 8px; 
                    border: 1px solid var(--b3-theme-primary); 
                    border-radius: 4px; 
                    background: var(--b3-theme-background); 
                    transition: all 0.2s ease; 
                    cursor: text;
                    user-select: text;
                    position: relative;" 
                    onmouseover="this.style.boxShadow='0 2px 8px rgba(0, 0, 0, 0.1)';
                                this.querySelector('.action-buttons').style.opacity='1';" 
                    onmouseout="this.style.boxShadow='none';
                               this.querySelector('.action-buttons').style.opacity='0';">
                    <div class="fn__flex" style="align-items: center; margin-bottom: 4px;">
                        <svg class="b3-button__icon" style="height: 16px; width: 16px; color: var(--b3-theme-primary);">
                            <use xlink:href="#iconPin"></use>
                        </svg>
                        <span style="margin-left: 4px; font-size: 12px; color: var(--b3-theme-primary);">
                            ${this.i18n.note.pinned}
                        </span>
                    </div>
                    ${this.renderNoteContent(item)}
                </div>
            `).join('')}
        </div>`;
    }

    // 渲染非置顶记录
    private renderUnpinnedHistory(displayHistory: Array<{ text: string, timestamp: number, isPinned?: boolean, tags?: string[] }>, hasPinned: boolean) {
        return `<div style="margin-top: ${hasPinned ? '16px' : '8px'}">
            ${displayHistory.map(item => `
                <div class="history-item" style="margin-bottom: 8px; padding: 8px; 
                    border: 1px solid var(--b3-border-color); 
                    border-radius: 4px; 
                    transition: all 0.2s ease; 
                    cursor: text;
                    user-select: text;
                    position: relative;" 
                    onmouseover="this.style.boxShadow='0 2px 8px rgba(0, 0, 0, 0.1)'; 
                                this.style.borderColor='var(--b3-theme-primary-light)';
                                this.querySelector('.action-buttons').style.opacity='1';" 
                    onmouseout="this.style.boxShadow='none'; 
                               this.style.borderColor='var(--b3-border-color)';
                               this.querySelector('.action-buttons').style.opacity='0';">
                    ${this.renderNoteContent(item)}
                </div>
            `).join('')}
        </div>`;
    }

    // 渲染笔记内容
    private renderNoteContent(item: { text: string, timestamp: number, tags?: string[] }) {
        const displayText = item.text;
        const encodeText = (text: string) => {
            return text.replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        };

        // 处理任务列表
        const processTaskList = (content: string) => {
            // 首先处理输入的 [] 转换为 [ ]
            content = content.replace(/\[\]([^\n]*)/g, '[ ]$1');

            // 然后处理任务列表，使用新的正则表达式匹配多行
            return content.replace(
                /(\[ \]|\[x\])([^\n]*)/g,
                (match, checkbox, text) => {
                    const isChecked = checkbox === '[x]';
                    return `
                        <div class="task-list-item">
                            <input type="checkbox" 
                                class="task-list-item-checkbox" 
                                ${isChecked ? 'checked' : ''} 
                                data-original="${checkbox}">
                            <span style="${isChecked ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${text.trim()}</span>
                        </div>`;
                }
            );
        };

        // 使用 Lute 渲染 Markdown
        let renderedContent = '';
        try {
            renderedContent = window.Lute.New().Md2HTML(displayText);
            renderedContent = processTaskList(renderedContent);
        } catch (error) {
            console.error('Markdown rendering failed:', error);
            renderedContent = `<div style="color: var(--b3-theme-on-surface); word-break: break-word; white-space: pre-wrap;">${encodeText(displayText)}</div>`;
        }

        return `
            <div class="fn__flex" style="gap: 8px;">
                <!-- 添加复选框，默认隐藏 -->
                <div class="${this.isBatchSelect? 'batch-checkbox' : 'batch-checkbox fn__none'}" style="padding-top: 2px;">
                    <input type="checkbox" class="b3-checkbox" data-timestamp="${item.timestamp}">
                </div>
                <div class="fn__flex-1">
                    <div class="text-content" data-text="${encodeText(displayText)}">
                        ${item.text.length > MAX_TEXT_LENGTH ?
                `<div style="word-break: break-word;">
                                <div class="collapsed-text markdown-content" style="color: var(--b3-theme-on-surface);">
                                    ${window.Lute.New().Md2HTML(displayText.substring(0, MAX_TEXT_LENGTH))}...
                                </div>
                                <div class="expanded-text markdown-content" style="display: none; color: var(--b3-theme-on-surface);">
                                    ${renderedContent}
                                </div>
                                <button class="b3-button b3-button--text toggle-text" 
                                    style="padding: 0 4px; font-size: 12px; color: var(--b3-theme-primary); display: inline-flex; align-items: center;">
                                    ${this.i18n.note.expand}
                                    <svg class="b3-button__icon" style="height: 12px; width: 12px; margin-left: 2px; transition: transform 0.2s ease;">
                                        <use xlink:href="#iconDown"></use>
                                    </svg>
                                </button>
                            </div>`
                : `<div class="markdown-content" style="color: var(--b3-theme-on-surface); word-break: break-word;">
                                ${renderedContent}
                            </div>`}
                    </div>
                    ${item.tags && item.tags.length > 0 ? `
                        <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px;">
                            ${item.tags.map(tag => `
                                <span class="b3-chip b3-chip--small b3-tooltips b3-tooltips__n" 
                                    style="padding: 0 6px; height: 18px; font-size: 10px;"
                                    aria-label="${tag}">
                                    <span class="b3-chip__content" style="max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${tag}</span>
                                </span>
                            `).join('')}
                        </div>
                    ` : ''}
                    <div class="fn__flex" style="margin-top: 4px; justify-content: space-between; align-items: center;">
                        <div style="font-size: 12px; color: var(--b3-theme-on-surface-light);">
                            ${new Date(item.timestamp).toLocaleString()}
                        </div>
                        <div class="fn__flex action-buttons" style="gap: 4px; opacity: 0; transition: opacity 0.2s ease;">
                            <button class="b3-button b3-button--text copy-btn b3-tooltips b3-tooltips__n" data-timestamp="${item.timestamp}" 
                                style="padding: 4px; height: 20px; width: 20px;" aria-label="${this.i18n.note.copy}">
                                <svg class="b3-button__icon" style="height: 14px; width: 14px;">
                                    <use xlink:href="#iconCopy"></use>
                                </svg>
                            </button>
                            <button class="b3-button b3-button--text edit-btn b3-tooltips b3-tooltips__n" data-timestamp="${item.timestamp}" 
                                style="padding: 4px; height: 20px; width: 20px;" aria-label="${this.i18n.note.edit}">
                                <svg class="b3-button__icon" style="height: 14px; width: 14px;">
                                    <use xlink:href="#iconEdit"></use>
                                </svg>
                            </button>
                            <button class="b3-button b3-button--text more-btn" data-timestamp="${item.timestamp}" 
                                style="padding: 4px; height: 20px; width: 20px;">
                                <svg class="b3-button__icon" style="height: 14px; width: 14px;">
                                    <use xlink:href="#iconMore"></use>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    // 渲染加载更多按钮
    private renderLoadMoreButton(shown: number, total: number) {
        return `
            <div class="fn__flex-center" style="padding: 8px 8px 0;">
                <button class="b3-button b3-button--outline load-more-btn">
                    ${this.i18n.note.loadMore} (${this.i18n.note.showing
                .replace('${shown}', shown.toString())
                .replace('${total}', total.toString())})
                </button>
            </div>`;
    }

    // 渲染没有更多内容提示
    private renderNoMoreItems() {
        return `
            <div class="fn__flex-center" style="padding: 16px 0; color: var(--b3-theme-on-surface-light); font-size: 12px;">
                ${this.i18n.note.noMore}
            </div>`;
    }

    // 创建新笔记
    private async createNewNote() {
        // 如果已经有窗口在打开中,则返回
        if (this.isCreatingNote) {
            return false;
        }

        try {
            this.isCreatingNote = true; // 设置标志位
            return new Promise((resolve) => {
                const dialog = new Dialog({
                    title: this.i18n.note.new,
                    content: `
                        <div class="b3-dialog__content" style="box-sizing: border-box; padding: 16px;">
                            ${this.getEditorTemplate(this.tempNoteContent)}
                        </div>`,
                    width: "520px",
                    height: "320px",
                    transparent: false,
                    disableClose: false,
                    disableAnimation: false,
                    destroyCallback: () => {
                        // 只有在没有成功保存的情况下才保存临时内容
                        const textarea = dialog.element.querySelector('textarea') as HTMLTextAreaElement;
                        if (textarea && textarea.value.trim()) {
                            this.tempNoteContent = textarea.value;
                            // 保存标签
                            this.tempNoteTags = Array.from(dialog.element.querySelectorAll('.tag-item'))
                                .map(tag => tag.getAttribute('data-tag'))
                                .filter(tag => tag !== null) as string[];
                        }
                        this.isCreatingNote = false; // 重置标志位
                        resolve(false);
                    }
                });

                // 在对话框创建后立即聚焦到文本框
                setTimeout(() => {
                    const textarea = dialog.element.querySelector('textarea') as HTMLTextAreaElement;
                    if (textarea) {
                        textarea.focus();
                        // 将光标移到文本末尾
                        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
                    }
                    // 恢复之前保存的标签
                    if (this.tempNoteTags.length > 0) {
                        const tagsList = dialog.element.querySelector('.tags-list');
                        if (tagsList) {
                            this.tempNoteTags.forEach(tagText => {
                                const tagElement = document.createElement('span');
                                tagElement.className = 'tag-item b3-chip b3-chip--middle b3-tooltips b3-tooltips__n';
                                tagElement.setAttribute('data-tag', tagText);
                                tagElement.setAttribute('aria-label', tagText);
                                tagElement.style.cursor = 'default';
                                tagElement.innerHTML = `
                                    <span class="b3-chip__content" style="max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${tagText}</span>
                                    <svg class="b3-chip__close" style="cursor: pointer;">
                                        <use xlink:href="#iconClose"></use>
                                    </svg>
                                `;
                                tagsList.appendChild(tagElement);

                                // 添加删除标签的事件
                                tagElement.querySelector('.b3-chip__close').addEventListener('click', () => {
                                    tagElement.remove();
                                });
                            });
                        }
                    }
                }, 100);

                // 绑定保存按钮事件
                const saveBtn = dialog.element.querySelector('[data-type="save"]');
                const textarea = dialog.element.querySelector('textarea');
                if (saveBtn && textarea) {
                    saveBtn.onclick = async () => {
                        const text = textarea.value;
                        const tags = Array.from(dialog.element.querySelectorAll('.tag-item'))
                            .map(tag => tag.getAttribute('data-tag'));

                        if (text.trim()) {
                            await this.saveContent(text, tags);
                            showMessage(this.i18n.note.saveSuccess);
                            dialog.destroy();
                            // 清空临时内容和标签
                            this.tempNoteContent = '';
                            this.tempNoteTags = [];
                            resolve(true);
                            return;
                        }
                        resolve(false);
                    };
                }

                // 设置标签功能
                this.setupTagsFeature(dialog.element);

                // 在对话框创建后设置图片上传功能
                setTimeout(() => {
                    this.setupImageUpload(dialog.element);
                }, 100);
            });
        } catch (error) {
            console.error('Error creating new note:', error);
            return false;
        }
    }

    // 编辑历史记录
    private async editHistoryItem(timestamp: number) {
        try {
            const success = await this.historyService.openEditDialog(timestamp,
                {
                    getEditorTemplate: (text) => this.getEditorTemplate(text),
                    setupTagsFeature: (element) => this.setupTagsFeature(element),
                    setupImageUpload: (element) => this.setupImageUpload(element)
                },
            );
            if (success) {
                showMessage(this.i18n.note.editSuccess);
                this.renderDockHistory();
            }
        } catch (error) {
            console.error('Error editing history item:', error);
            return false;
        }
    }

    // 保存内容并更新历史记录
    private async saveContent(text: string, tags: string[] = []) {
        const success = await this.historyService.saveContent({ text, tags });

        if (success) {
            this.initDockPanel();
        }
    }

    // 创建编辑器模板
    private getEditorTemplate(text: string = '', placeholder: string = this.i18n.note.placeholder) {
        return `
            <div style="border: 1px solid var(--b3-border-color); border-radius: 8px; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                <textarea class="fn__flex-1" 
                    placeholder="${placeholder}"
                    style="width: 100%; 
                    height: 160px; 
                    resize: none; 
                    padding: 12px; 
                    background-color: var(--b3-theme-background);
                    color: var(--b3-theme-on-background);
                    border: none;
                    box-sizing: border-box;"
                    onkeydown="if((event.metaKey || event.ctrlKey) && event.key === 'Enter') { 
                        event.preventDefault(); 
                        this.closest('.b3-dialog__content')?.querySelector('[data-type=\\'save\\']')?.click(); 
                    }"
                >${text}</textarea>
                <div style="border-top: 1px solid var(--b3-border-color); padding: 8px 12px;">
                    <div class="tags-list" style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; min-height: 0;"></div>
                    <div class="fn__flex" style="justify-content: space-between; align-items: center;">
                        <div class="fn__flex" style="gap: 8px;">
                            <button class="b3-button b3-button--text add-tag-btn b3-tooltips b3-tooltips__n" style="padding: 4px;" aria-label="${this.i18n.note.addTag}">
                                <svg class="b3-button__icon" style="height: 16px; width: 16px;"><use xlink:href="#iconTags"></use></svg>
                            </button>
                            <button class="b3-button b3-button--text upload-image-btn b3-tooltips b3-tooltips__n" style="padding: 4px;" aria-label="${this.i18n.note.uploadImage}">
                                <svg class="b3-button__icon" style="height: 16px; width: 16px;"><use xlink:href="#iconImage"></use></svg>
                            </button>
                            <input type="file" class="fn__none image-upload-input" accept="image/*" multiple>
                        </div>
                        <button class="b3-button b3-button--text b3-tooltips b3-tooltips__n fn__flex fn__flex-center main_save_btn" data-type="save" aria-label="${adaptHotkey('⌘Enter')}" style="padding: 4px 8px; gap: 4px;">
                            <span>${this.i18n.note.save}</span>
                        </button>
                    </div>
                </div>
            </div>`;
    }

    // 设置标签功能
    private setupTagsFeature(container: HTMLElement) {
        const tagsList = container.querySelector('.tags-list');
        const addTagBtn = container.querySelector('.add-tag-btn');

        if (tagsList && addTagBtn) {
            addTagBtn.onclick = (e) => {
                e.stopPropagation();

                // 添加调试日志
                console.log('DOCK_STORAGE_NAME data:', this.data[DOCK_STORAGE_NAME]);
                console.log('History:', this.data[DOCK_STORAGE_NAME]?.history);

                // 获取所有标签并去重
                const allTags = Array.from(new Set(this.historyService.getCurrentData()
                    ?.filter(item => item && Array.isArray(item.tags))
                    .flatMap(item => item.tags || [])
                ));

                console.log('Available tags:', allTags);

                // 创建标签选择面板
                const tagPanel = document.createElement('div');
                tagPanel.className = 'tag-panel';
                tagPanel.style.cssText = `
                    position: fixed;
                    z-index: 205;
                    width: 133px;
                    height: 150px; // 固定高度
                    background: var(--b3-menu-background);
                    border: 1px solid var(--b3-border-color);
                    border-radius: var(--b3-border-radius);
                    box-shadow: var(--b3-dialog-shadow);
                    display: flex;
                    flex-direction: column;
                    padding: 0;
                    overflow: hidden; // 防止内容溢出
                `;

                // 修改位置计算逻辑
                const btnRect = addTagBtn.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                const panelHeight = 150; // 面板高度
                const margin = 8; // 边距

                // 判断是否有足够空间在上方显示
                const showAbove = btnRect.top > panelHeight + margin;
                // 如果上方空间不够，就显示在下方
                const top = showAbove ?
                    btnRect.top - panelHeight - margin :
                    btnRect.bottom + margin;

                tagPanel.style.top = `${top}px`;
                tagPanel.style.left = `${btnRect.left}px`;

                // 如果面板会超出视口右侧，则向左对齐
                if (btnRect.left + 133 > window.innerWidth) { // 使用新的宽度
                    tagPanel.style.left = `${btnRect.left + btnRect.width - 133}px`; // 使用新的宽度
                }

                // 修改面板内容结构
                tagPanel.innerHTML = `
                    <div style="padding: 8px; border-bottom: 1px solid var(--b3-border-color); background: var(--b3-menu-background); flex-shrink: 0;">
                        <input type="text" 
                            class="b3-text-field fn__flex-1 tag-input" 
                            placeholder="${this.i18n.note.addTag}..."
                            style="width: 100%; background: var(--b3-theme-background);">
                    </div>
                    <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--b3-menu-background);">
                        <div style="padding: 8px 8px 4px 8px; font-size: 12px; color: var(--b3-theme-on-surface-light); flex-shrink: 0;">
                            ${this.i18n.note.existingTags}
                        </div>
                        <div class="history-tags" style="padding: 0 8px 8px 8px; overflow-y: auto; flex: 1;">
                            <div style="display: flex; flex-direction: column; gap: 4px;">
                                ${allTags.length > 0 ?
                        allTags
                            .sort((a, b) => {
                                const countA = this.historyService.getCurrentData().filter(item => item.tags?.includes(a)).length;
                                const countB = this.historyService.getCurrentData().filter(item => item.tags?.includes(b)).length;
                                return countB - countA;
                            })
                            .map(tag => `
                                            <div class="history-tag b3-chip b3-chip--middle" 
                                                style="cursor: pointer; padding: 4px 8px; display: flex; justify-content: space-between; align-items: center; background: var(--b3-menu-background);" 
                                                data-tag="${tag}">
                                                <span class="b3-chip__content" style="max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                                    ${tag}
                                                </span>
                                                <span class="tag-count" style="font-size: 10px; opacity: 0.7; background: var(--b3-theme-surface); padding: 2px 4px; border-radius: 8px;">
                                                    ${this.historyService.getCurrentData().filter(item => item.tags?.includes(tag)).length}
                                                </span>
                                            </div>
                                        `).join('')
                        : `<div style="color: var(--b3-theme-on-surface-light); font-size: 12px; text-align: center; padding: 8px;">
                                ${this.i18n.note.noTags}
                               </div>`
                    }
                            </div>
                        </div>
                    </div>
                `;

                // 将面板添加到文档根节点
                document.body.appendChild(tagPanel);

                // 获取输入框元素
                const tagInput = tagPanel.querySelector('.tag-input') as HTMLInputElement;
                tagInput.focus();

                // 添加标签的函数
                const addTag = (tagText: string) => {
                    if (tagText.trim()) {
                        const existingTags = Array.from(tagsList.querySelectorAll('.tag-item'))
                            .map(tag => tag.getAttribute('data-tag'));

                        if (!existingTags.includes(tagText)) {
                            const tagElement = document.createElement('span');
                            tagElement.className = 'tag-item b3-chip b3-chip--middle b3-tooltips b3-tooltips__n';
                            tagElement.setAttribute('data-tag', tagText);
                            tagElement.setAttribute('aria-label', tagText);
                            tagElement.style.cursor = 'default';
                            tagElement.innerHTML = `
                                <span class="b3-chip__content" style="max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${tagText}</span>
                                <svg class="b3-chip__close" style="cursor: pointer;">
                                    <use xlink:href="#iconClose"></use>
                                </svg>
                            `;
                            tagsList.appendChild(tagElement);

                            // 添加删除标签的事件
                            tagElement.querySelector('.b3-chip__close').addEventListener('click', () => {
                                tagElement.remove();
                            });
                        }
                        tagInput.value = '';
                        // 添加标签后关闭面板
                        tagPanel.remove();
                        document.removeEventListener('click', closePanel);
                    }
                };

                // 回车添加标签
                tagInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag(tagInput.value);
                        const textarea = container.querySelector('textarea');
                        if (textarea) {
                            // 将焦点设置到编辑框上
                            textarea.focus();
                        }
                    }
                });

                // 点击历史标签直接添加
                tagPanel.addEventListener('click', (e) => {
                    const target = e.target as HTMLElement;
                    const tagChip = target.closest('.history-tag') as HTMLElement;
                    if (tagChip) {
                        const tagText = tagChip.getAttribute('data-tag');
                        addTag(tagText);
                        const textarea = container.querySelector('textarea');
                        if (textarea) {
                            // 将焦点设置到编辑框上
                            textarea.focus();
                        }
                    }
                });


                // 点击其他地方关闭面板
                const closePanel = (e: MouseEvent) => {
                    if (!tagPanel.contains(e.target as Node) && !addTagBtn.contains(e.target as Node)) {
                        tagPanel.remove();
                        document.removeEventListener('click', closePanel);
                    }
                    const textarea = container.querySelector('textarea');
                    if (textarea) {
                        // 将焦点设置到编辑框上
                        textarea.focus();
                    }
                };

                // 延迟添加点击事件，避免立即触发
                setTimeout(() => {
                    document.addEventListener('click', closePanel);
                }, 0);

                // 添加标签点击事件
                tagPanel.querySelectorAll('.history-tag').forEach(tag => {
                    tag.addEventListener('click', () => {
                        const tagText = tag.getAttribute('data-tag');
                        if (tagText) {
                            addTag(tagText);
                        }
                    });

                    // 添加悬停效果
                    tag.addEventListener('mouseenter', () => {
                        tag.style.backgroundColor = 'var(--b3-theme-primary-light)';
                    });
                    tag.addEventListener('mouseleave', () => {
                        tag.style.backgroundColor = '';
                    });
                });

                // 添加搜索功能
                tagInput.addEventListener('input', (e) => {
                    const searchText = (e.target as HTMLInputElement).value.toLowerCase();
                    const historyTags = tagPanel.querySelectorAll('.history-tag');

                    historyTags.forEach(tag => {
                        const tagText = tag.getAttribute('data-tag').toLowerCase();
                        if (tagText.includes(searchText)) {
                            (tag as HTMLElement).style.display = 'flex';
                        } else {
                            (tag as HTMLElement).style.display = 'none';
                        }
                    });

                    // 如果没有匹配的标签，显示"无匹配标签"提示
                    const visibleTags = Array.from(historyTags).filter(tag =>
                        (tag as HTMLElement).style.display !== 'none'
                    );

                    const noMatchMessage = tagPanel.querySelector('.no-match-message');
                    if (visibleTags.length === 0 && searchText) {
                        if (!noMatchMessage) {
                            const messageDiv = document.createElement('div');
                            messageDiv.className = 'no-match-message';
                            messageDiv.style.cssText = 'color: var(--b3-theme-on-surface-light); font-size: 12px; text-align: center; padding: 8px;';
                            messageDiv.textContent = this.i18n.note.noMatchingTags;
                            tagPanel.querySelector('.history-tags').appendChild(messageDiv);
                        }
                    } else if (noMatchMessage) {
                        noMatchMessage.remove();
                    }
                });

                // 修改回车键处理逻辑
                tagInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        const searchText = tagInput.value.trim();
                        if (searchText) {
                            // 检查是否有匹配的已有标签
                            const matchingTag = Array.from(tagPanel.querySelectorAll('.history-tag'))
                                .find(tag => tag.getAttribute('data-tag').toLowerCase() === searchText.toLowerCase());

                            if (matchingTag) {
                                // 如果有完全匹配的标签，直接使用该标签
                                addTag(matchingTag.getAttribute('data-tag'));
                            } else {
                                // 如果没有完全匹配的标签，创建新标签
                                addTag(searchText);
                            }

                            const textarea = container.querySelector('textarea');
                            if (textarea) {
                                textarea.focus();
                            }
                        }
                    }
                });
            };
        }
    }


    // 设置搜索功能
    private setupSearchFeature(container: HTMLElement) {
        const searchBtn = container.querySelector('.search-btn');
        const searchInput = container.querySelector('.search-input') as HTMLInputElement;
        const searchWrapper = container.querySelector('.search-wrapper');

        if (searchBtn && searchInput && searchWrapper) {
            searchBtn.onclick = () => {
                searchInput.style.width = '200px';
                searchInput.style.opacity = '1';
                searchBtn.style.display = 'none';
                searchInput.focus();
            };

            searchInput.onblur = () => {
                if (!searchInput.value) {
                    searchInput.style.width = '0';
                    searchInput.style.opacity = '0';
                    setTimeout(() => {
                        searchBtn.style.display = 'block';
                    }, 300);
                }
            };

            searchInput.oninput = () => {
                console.log("searchInput.oninput");
                const searchText = searchInput.value.toLowerCase();

                if (!searchText) {
                    this.currentDisplayCount = ITEMS_PER_PAGE;
                    this.renderDockHistory();
                    return;
                }
                // 在选定的数据源中搜索
                const filteredHistory = this.historyService.searchHistory(searchText);
                console.log("filteredHistory", filteredHistory);

                // 只更新历史记录内容部分
                const historyContent = container.querySelector('.history-content');
                console.log("historyContent", historyContent);
                if (historyContent) {
                    const pinnedHistory = filteredHistory.filter(item => item.isPinned);
                    const unpinnedHistory = filteredHistory.filter(item => !item.isPinned);

                    historyContent.innerHTML = `
                        ${this.showArchived ? `
                            <div class="fn__flex-center" style="padding: 8px; background: var(--b3-theme-surface); color: var(--b3-theme-on-surface); font-size: 12px;">
                                <svg class="b3-button__icon" style="height: 14px; width: 14px; margin-right: 4px;">
                                    <use xlink:href="#iconArchive"></use>
                                </svg>
                                ${this.i18n.note.archivedView}
                            </div>
                        ` : ''}
                        ${pinnedHistory.length > 0 ? this.renderPinnedHistory(pinnedHistory) : ''}
                        ${this.renderUnpinnedHistory(unpinnedHistory, pinnedHistory.length > 0)}
                        ${filteredHistory.length === 0 ? `
                            <div class="fn__flex-center" style="padding: 16px 0; color: var(--b3-theme-on-surface-light); font-size: 12px;">
                                ${this.i18n.note.noSearchResults}
                            </div>
                        ` : ''}
                    `;

                    // 高亮匹配文本
                    historyContent.querySelectorAll('.text-content').forEach(content => {
                        const text = content.getAttribute('data-text');
                        if (text) {
                            const displayText = content.querySelector('[style*="color: var(--b3-theme-on-surface)"]');
                            if (displayText) {
                                const highlightedText = text.replace(
                                    new RegExp(searchText, 'gi'),
                                    match => `<span style="background-color: var(--b3-theme-primary-light);">${match}</span>`
                                );
                                displayText.innerHTML = highlightedText;
                            }
                        }
                    });

                    // 重新绑定事件
                    this.setupHistoryListEvents();
                }
            };

            searchInput.onkeydown = (e) => {
                if (e.key === 'Escape') {
                    searchInput.value = '';
                    searchInput.dispatchEvent(new Event('input'));
                    searchInput.blur();
                }
            };
        }
    }

    // 设置排序功能
    private setupSortFeature(container: HTMLElement) {
        const sortBtn = container.querySelector('.sort-btn');
        if (sortBtn) {
            const sortIcon = sortBtn.querySelector('svg');
            if (sortIcon) {
                sortIcon.style.transform = this.isDescending ? 'rotate(0deg)' : 'rotate(180deg)';
                sortIcon.style.transition = 'transform 0.3s ease';
            }

            sortBtn.onclick = () => {
                this.isDescending = !this.isDescending;
                this.historyService.setIsDescending(this.isDescending);
                // 更新图标旋转状态
                if (sortIcon) {
                    sortIcon.style.transform = this.isDescending ? 'rotate(0deg)' : 'rotate(180deg)';
                }

                this.initDockPanel();
            };
        }
    }

    // 设置标签过滤功能
    private setupFilterFeature(container: HTMLElement) {
        const filterBtn = container.querySelector('.filter-btn');
        const filterPanel = container.querySelector('.filter-panel');
        if (filterBtn && filterPanel) {
            let isFilterPanelOpen = false;

            filterBtn.onclick = () => {
                isFilterPanelOpen = !isFilterPanelOpen;
                filterPanel.style.display = isFilterPanelOpen ? 'block' : 'none';
                filterBtn.style.color = isFilterPanelOpen ? 'var(--b3-theme-primary)' : '';
            };

            // 获取所有标签及其使用次数
            const tagUsage = this.historyService.getCurrentData()
                .flatMap(item => item.tags || [])
                .reduce((acc, tag) => {
                    acc[tag] = (acc[tag] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);

            // 按使用次数排序标签
            const sortedTags = Object.entries(tagUsage)
                .sort((a, b) => b[1] - a[1])
                .map(([tag]) => tag);

            // 显示前几个常用标签
            const commonTags = sortedTags.slice(0, 6);
            const otherTags = sortedTags.slice(6);

            // 渲染常用标签
            let tagsHtml = `<div class="tags-container" style="display: flex; flex-wrap: wrap; gap: 8px;">`;
            tagsHtml += commonTags.map(tag => `
                <span class="b3-chip b3-chip--middle filter-tag b3-tooltips b3-tooltips__n" 
                    style="cursor: pointer; 
                        background-color: var(--b3-theme-surface);
                        color: var(--b3-theme-on-surface);
                        border: 1px solid var(--b3-border-color);
                        transition: all 0.2s ease;" 
                    data-tag="${tag}"
                    aria-label="${tag}"
                    data-selected="false">
                    <span class="b3-chip__content" style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${tag}</span>
                    <span class="tag-count" style="margin-left: 4px; font-size: 10px; opacity: 0.7;">
                        ${tagUsage[tag]}
                    </span>
                </span>
            `).join('');

            // 添加折叠按钮
            if (otherTags.length > 0) {
                tagsHtml += `
                    <div class="other-tags" style="display: none;">
                        ${otherTags.map(tag => `
                            <span class="b3-chip b3-chip--middle filter-tag b3-tooltips b3-tooltips__n" 
                                style="cursor: pointer; 
                                    background-color: var(--b3-theme-surface);
                                    color: var(--b3-theme-on-surface);
                                    border: 1px solid var(--b3-border-color);
                                    transition: all 0.2s ease;" 
                                data-tag="${tag}"
                                aria-label="${tag}"
                                data-selected="false">
                                <span class="b3-chip__content" style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${tag}</span>
                                <span class="tag-count" style="margin-left: 4px; font-size: 10px; opacity: 0.7;">
                                    ${tagUsage[tag]}
                                </span>
                            </span>
                        `).join('')}
                    </div>
                    <button class="b3-button b3-button--text toggle-tags" 
                        style="padding: 0 4px; font-size: 12px; color: var(--b3-theme-primary); display: inline-flex; align-items: center;">
                        ${this.i18n.note.expandTags}
                        <svg class="b3-button__icon" style="height: 12px; width: 12px; margin-left: 2px; transition: transform 0.2s ease;">
                            <use xlink:href="#iconDown"></use>
                        </svg>
                    </button>
                `;
            }
            tagsHtml += `</div>`;

            filterPanel.innerHTML = tagsHtml;

            // 绑定折叠按钮事件
            const toggleTagsBtn = filterPanel.querySelector('.toggle-tags');
            const otherTagsDiv = filterPanel.querySelector('.other-tags');
            if (toggleTagsBtn && otherTagsDiv) {
                toggleTagsBtn.onclick = () => {
                    const isVisible = otherTagsDiv.style.display !== 'none';
                    otherTagsDiv.style.display = isVisible ? 'none' : 'block';
                    toggleTagsBtn.innerHTML = isVisible ? `${this.i18n.note.expandTags}
                        <svg class="b3-button__icon" style="height: 12px; width: 12px; margin-left: 2px; transform: rotate(0deg); transition: transform 0.2s ease;">
                            <use xlink:href="#iconDown"></use>
                        </svg>` : `${this.i18n.note.collapseTags}
                        <svg class="b3-button__icon" style="height: 12px; width: 12px; margin-left: 2px; transform: rotate(180deg); transition: transform 0.2s ease;">
                            <use xlink:href="#iconDown"></use>
                        </svg>`;
                };
            }

            // 绑定标签点击事件
            const filterTags = filterPanel.querySelectorAll('.filter-tag');
            filterTags.forEach(tag => {
                tag.addEventListener('click', () => {
                    console.log("tag.addEventListener");
                    const isSelected = tag.getAttribute('data-selected') === 'true';
                    tag.setAttribute('data-selected', (!isSelected).toString());
                    if (!isSelected) {
                        tag.style.backgroundColor = 'var(--b3-theme-primary)';
                        tag.style.color = 'var(--b3-theme-on-primary)';
                        tag.style.border = '1px solid var(--b3-theme-primary)';
                    } else {
                        tag.style.backgroundColor = 'var(--b3-theme-surface)';
                        tag.style.color = 'var(--b3-theme-on-surface)';
                        tag.style.border = '1px solid var(--b3-border-color)';
                    }

                    this.selectedTags = Array.from(filterPanel.querySelectorAll('.filter-tag[data-selected="true"]'))
                        .map(tag => tag.getAttribute('data-tag'));

                    this.currentDisplayCount = ITEMS_PER_PAGE;

                    const filterPanelDisplay = filterPanel.style.display;
                    const filterBtnColor = filterBtn.style.color;


                    const newFilterPanel = container.querySelector('.filter-panel');
                    const newFilterBtn = container.querySelector('.filter-btn');
                    if (newFilterPanel && newFilterBtn) {
                        newFilterPanel.style.display = filterPanelDisplay;
                        newFilterBtn.style.color = filterBtnColor;
                    }
                    this.historyService.updateSelectedTags(this.selectedTags);
                    this.renderDockHistory();
                });
            });
        }
    }

    // 设置导出功能
    private setupExportFeature(container: HTMLElement) {
        const exportBtn = container.querySelector('.export-btn');
        if (exportBtn) {
            exportBtn.onclick = () => {
                try {
                    const exportData = this.data[DOCK_STORAGE_NAME].history.map(item => ({
                        '内容': item.text,
                        '标签': (item.tags || []).join(', '),
                        '时间': new Date(item.timestamp).toLocaleString(),
                        '状态': item.isPinned ? '已置顶' : '未置顶'
                    }));

                    const headers = ['内容', '标签', '时间', '状态'];
                    const csvContent = [
                        headers.join(','),
                        ...exportData.map(row =>
                            headers.map(header =>
                                JSON.stringify(row[header] || '')
                            ).join(',')
                        )
                    ].join('\n');

                    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `小记导出_${new Date().toLocaleDateString()}.csv`;

                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    // showMessage(this.i18n.note.exportSuccess);
                } catch (error) {
                    console.error('Export failed:', error);
                    showMessage('导出失败');
                }
            };
        }
    }

    private showExportDialog() {
        this.exportDialog.show(
            {
                history: this.data[DOCK_STORAGE_NAME].history,
                archivedHistory: this.data[ARCHIVE_STORAGE_NAME]?.history
            },
            this.data[DOCK_STORAGE_NAME],
            (filteredData, format) => {
                if (this.exportService.exportData(filteredData, format)) {
                    showMessage(this.i18n.note.exportSuccess);
                } else {
                    showMessage(this.i18n.note.exportFailed);
                }
            }
        );
    }

    // 在 createNewNote 和 editHistoryItem 方法中添加图片上传事件处理
    private setupImageUpload(container: HTMLElement) {
        const uploadBtn = container.querySelector('.upload-image-btn');
        const uploadInput = container.querySelector('.image-upload-input') as HTMLInputElement;
        const textarea = container.querySelector('textarea') as HTMLTextAreaElement;

        if (uploadBtn && uploadInput && textarea) {
            console.log('setupImageUpload');
            uploadBtn.addEventListener('click', () => {
                uploadInput.click();
            });

            uploadInput.addEventListener('change', async () => {
                const files = Array.from(uploadInput.files || []);
                if (files.length === 0) return;

                try {
                    // 上传图片
                    const result = await upload("/assets/", files);
                    if (result.succMap) {
                        // 获取光标位置
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const text = textarea.value;

                        // 构建 Markdown 图片语法
                        const imageLinks = Object.entries(result.succMap)
                            .map(([filename, url]) => `![${filename}](${url})`)
                            .join('\n');

                        // 在光标位置插入图片链接
                        textarea.value = text.substring(0, start) + imageLinks + text.substring(end);

                        // 更新光标位置
                        const newPosition = start + imageLinks.length;
                        textarea.setSelectionRange(newPosition, newPosition);
                        textarea.focus();

                        showMessage(this.i18n.note.uploadSuccess);
                    }
                } catch (error) {
                    console.error('Upload failed:', error);
                    showMessage(this.i18n.note.uploadFailed);
                }

                // 清空 input，允许重复上传相同文件
                uploadInput.value = '';
            });
        }
    }

}
