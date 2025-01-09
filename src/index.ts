import {
    Plugin,
    showMessage,
    confirm,
    Dialog,
    Menu,
    getFrontend,
    adaptHotkey
} from "siyuan";
import "@/index.scss";
import { upload, lsNotebooks, createDocWithMd, appendBlock, createDailyNote } from "./api";
import { initMardownStyle } from './components/markdown';
// 导入新的组件
import { ExportDialog } from './components/ExportDialog';
import { ExportService } from './components/ExportService';
import { HistoryService, HistoryData } from './components/HistoryService';
import { ARCHIVE_STORAGE_NAME, DOCK_STORAGE_NAME, CONFIG_DATA_NAME, ITEMS_PER_PAGE, MAX_TEXT_LENGTH, DOCK_TYPE, SETTINGS_STORAGE_NAME } from './libs/const';
import { iconsSVG } from './components/icon';
import { QuickInputWindow } from './components/QuickInputWindow';
import { SettingUtils } from "./libs/setting-utils";

export default class PluginQuickNote extends Plugin {
    private isCreatingNote: boolean = false; // 添加标志位跟踪新建小记窗口状态
    private tempNoteContent: string = ''; // 添加临时内容存储
    private tempNoteTags: string[] = []; // 添加临时标签存储
    private frontend: string;

    private isDescending: boolean = true; //是否降序
    private element: HTMLElement;  //侧边栏dock元素

    private itemsPerPage: number = 10;
    private currentDisplayCount: number; //当前历史小记显示数量
    private selectedTags: string[] = [];//过滤标签
    private showArchived: boolean = false;//是否显示归档小记
    private isBatchSelect: boolean = false;//是否处于批量选择状态

    private exportDialog: ExportDialog;
    private exportService: ExportService;
    private historyService: HistoryService;
    private settingUtils: SettingUtils;

    // 在类定义开始处添加属性
    private historyClickHandler: (e: MouseEvent) => Promise<void>;

    async onload() {
        // 初始化设置
        this.settingUtils = new SettingUtils({
            plugin: this,
            name: SETTINGS_STORAGE_NAME,
            callback: async () => {
                console.log("callback");
                if (this.element) {
                    this.itemsPerPage = this.settingUtils.get("itemsPerPage") || ITEMS_PER_PAGE;
                    this.renderDockHistory();
                }
            }
        });

        // 添加设置项
        this.settingUtils.addItem({
            key: "defaultNotebook",
            value: "",
            type: "textinput",
            title: this.i18n.note.defaultNotebook,
            description: this.i18n.note.defaultNotebookDesc
        });

        // this.settingUtils.addItem({
        //     key: "autoCopyToDaily",
        //     value: false,
        //     type: "checkbox",
        //     title: this.i18n.note.autoCopyToDaily,
        //     description: this.i18n.note.autoCopyToDailyDesc
        // });
        this.settingUtils.addItem({
            key: "deleteAfterInsert",
            value: true,
            type: "checkbox",
            title: this.i18n.note.deleteAfterInsert,
            description: this.i18n.note.deleteAfterInsertDesc
        });

        this.settingUtils.addItem({
            key: "insertTemplate",
            value: "-  ${time} ${tags}  ${content} ",
            type: "textarea",
            title: this.i18n.note.insertTemplate,
            description: this.i18n.note.insertTemplateDesc
        });

        this.settingUtils.addItem({
            key: "maxTextLength",
            value: 250,
            type: "number",
            title: this.i18n.note.maxTextLength,
            description: this.i18n.note.maxTextLengthDesc
        });

        this.settingUtils.addItem({
            key: "itemsPerPage",
            value: 10,
            type: "number",
            title: this.i18n.note.itemsPerPage,
            description: this.i18n.note.itemsPerPageDesc
        });

        this.settingUtils.addItem({
            key: "quickWindowWidth",
            value: 250,
            type: "number",
            title: this.i18n.note.quickWindowWidth,
            description: this.i18n.note.quickWindowWidthDesc
        });

        this.settingUtils.addItem({
            key: "quickWindowHeight",
            value: 300,
            type: "number",
            title: this.i18n.note.quickWindowHeight,
            description: this.i18n.note.quickWindowHeightDesc
        });


        await this.settingUtils.load();
        await this.initData();
        this.initComponents();
        console.log("onload");
    }

    async onLayoutReady() {
        // let lute = window.Lute.New();
        // let html = lute.Md2HTML('![Line Simple Example (1).png]("assets/Line Simple Example 1-20250108081401-kduj7tl.png")');
        // console.log(html);
        console.log("onLayoutReady");
    }

    async onunload() {
        this.cleanupEventListeners();
        console.log(this.i18n.byePlugin);
    }

    uninstall() {
        console.log("uninstall");
    }

    private async initData() {
        this.frontend = getFrontend();

        // 初始化配置数据
        this.data[CONFIG_DATA_NAME] = await this.loadData(CONFIG_DATA_NAME) || {
            editorVisible: true,
        }
        console.log("Config data loaded:", this.data[CONFIG_DATA_NAME]);

        // 初始化未归档小记数据
        let unarchive_history = await this.loadData(DOCK_STORAGE_NAME) || {
            history: []
        };

        // 初始化归档数据
        let archive_history = await this.loadData(ARCHIVE_STORAGE_NAME) || {
            history: []
        };

        // 获取设置的每页显示数量，如果没有设置则使用默认值
        this.itemsPerPage = this.settingUtils.get("itemsPerPage") || ITEMS_PER_PAGE;
        this.currentDisplayCount = this.itemsPerPage;

        // 初始化历史服务
        const historyData: HistoryData = {
            history: unarchive_history.history || [],
            archivedHistory: archive_history.history || []
        };

        this.historyService = new HistoryService(this, historyData, this.itemsPerPage, this.i18n);
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
            globalCallback: () => {
                if (this.frontend === 'browser-desktop' || this.frontend === 'browser-mobile') {
                    this.createNewNote();
                } else {
                    const quickInputWindow = QuickInputWindow.getInstance(this);
                    quickInputWindow.createWindow();
                }
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
        console.log("initDockPanel");
        let element = this.element;
        element.innerHTML = `<div class="fn__flex-1 fn__flex-column" style="height: 100%;">
                                <div class="fn__flex-1 plugin-sample__custom-dock fn__flex-column dock_quicknotes_container" style="align-items: center;"> 
                                    <div class="topbar-container" style="width:100%"></div>
                                    <div class="editor-container" style="${this.data[CONFIG_DATA_NAME].editorVisible ? 'width: 95%;display:block' : 'width: 95%;display:None'}" ></div>
                                    <div class="toolbar-container" style="border-bottom: 1px solid var(--b3-border-color); flex-shrink: 0; width: 95%;"></div>
                                    <div class="fn__flex-1 history-list" style="overflow: auto; ;width: 95%;">
                                    </div>
                                </div>
                            </div>`;
        this.renderDockerTopbar();
        this.renderDockerEditor();
        this.renderDockHistory();
        this.renderDockerToolbar();

        this.bindDockPanelEvents();
    }

    private renderDockerTopbar() {
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
        <span data-type="refresh" class="block__icon b3-tooltips b3-tooltips__sw refresh_btn" aria-label="Refresh">
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

    private renderDockTopbarEvents() {
        let element = this.element;
        const editorToggleBtn = element.querySelector('.editor_toggle_btn');
        editorToggleBtn.addEventListener('click', async () => {
            const editorContainer = element.querySelector('.editor-container');
            if (editorContainer) {
                const isVisible = editorContainer.style.display !== 'none';
                editorContainer.style.display = isVisible ? 'none' : 'block';
                // 保存状态
                this.data[CONFIG_DATA_NAME].editorVisible = !isVisible;
                await this.saveData(CONFIG_DATA_NAME, this.data[CONFIG_DATA_NAME]);
                // 更新按钮图标和提示文本
                const icon = editorToggleBtn.querySelector('use');
                if (icon) {
                    icon.setAttribute('xlink:href', !isVisible ? '#iconPreview' : '#iconEdit');
                }
                editorToggleBtn.setAttribute('aria-label', !isVisible ? this.i18n.note.hideEditor : this.i18n.note.showEditor);
            }
        });
        const refreshBtn = element.querySelector('.refresh_btn');
        refreshBtn.addEventListener('click', async () => {
            this.currentDisplayCount = this.itemsPerPage;
            this.initData();
            this.initDockPanel();
        });
    }
    private renderDockerEditor() {
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
                if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                    e.preventDefault();
                    const addTagBtn = element.querySelector('.add-tag-btn') as HTMLElement;
                    if (addTagBtn) {
                        addTagBtn.click();
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

        element.querySelector('.main_save_btn').addEventListener('click', async () => {
            if (textarea.value.trim()) {
                const tags = Array.from(element.querySelectorAll('.tag-item'))
                    .map(tag => tag.getAttribute('data-tag'));
                await this.saveContent(textarea.value, tags);
            }
        });
    }

    private renderDockerToolbar() {
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
    private bindDockerToolbarEvents() {
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
                        this.historyService.setIsDescending(true);
                        // renderDock(true);
                        this.renderDockHistory();
                    }
                }, {
                    icon: !this.isDescending ? "iconSelect" : "",
                    label: this.i18n.note.sortByTimeAsc,
                    click: () => {
                        this.isDescending = false;
                        this.historyService.setIsDescending(false);
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
                let historyList = element.querySelector('.history-list');
                const selectedTimestamps = Array.from(historyList.querySelectorAll('.batch-checkbox input:checked'))
                    .map(input => Number((input as HTMLInputElement).getAttribute('data-timestamp')));

                if (selectedTimestamps.length === 0) {
                    showMessage(this.i18n.note.noItemSelected);
                    return;
                }

                confirm(this.i18n.note.batchDelete, this.i18n.note.batchDeleteConfirm, async () => {
                    try {
                        this.historyService.batchDeleteItems(selectedTimestamps)
                        cancelSelectBtn.click();
                        this.renderDockerToolbar();
                        this.renderDockHistory();
                        // showMessage(this.i18n.note.batchDeleteSuccess);
                    } catch (error) {
                        showMessage(this.i18n.note.batchDeleteFailed);
                    }
                });
            };
        }

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
                let historyList = element.querySelector('.history-list');
                const selectedItems = Array.from(historyList.querySelectorAll('.batch-checkbox input:checked'))
                const selectedTimestamps = Array.from(selectedItems)
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
                                this.historyService.batchUnarchiveItems(selectedTimestamps);
                            } else {
                                this.historyService.batchArchiveItems(selectedTimestamps);
                            }


                            showMessage(this.showArchived ?
                                this.i18n.note.batchUnarchiveSuccess :
                                this.i18n.note.batchArchiveSuccess
                            );

                            // cancelSelectBtn.click(); // 操作完成后退出选择模式
                            this.renderDockerToolbar();
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
                let historyList = element.querySelector('.history-list');
                const selectedItems = Array.from(historyList.querySelectorAll('.batch-checkbox input:checked'))
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

                // 询问是否删除已合并的小记
                confirm(this.i18n.note.mergeDeleteConfirm, this.i18n.note.mergeDeleteConfirmTitle, async () => {
                    try {
                        // 删除已合并的小记
                        const timestamps = selectedItems.map(item => item.timestamp);
                        this.historyService.batchDeleteItems(timestamps);
                    } catch (error) {
                        console.error('删除已合并的小记失败:', error);
                        showMessage(this.i18n.note.mergeDeleteFailed);
                    }
                    // 取消选择模式
                    cancelSelectBtn.click();
                    this.renderDockerToolbar();
                    this.renderDockHistory();
                    showMessage(this.i18n.note.mergeSuccess);
                }, () => {
                    // 用户取消删除，只取消选择模式
                    cancelSelectBtn.click();
                    this.renderDockerToolbar();
                    this.renderDockHistory();
                });
            };
        }

        // 批量标签修改功能
        const batchTagBtn = container.querySelector('.batch-tag-btn') as HTMLButtonElement;
        if (batchTagBtn) {
            batchTagBtn.onclick = () => {
                let historyList = element.querySelector('.history-list');
                const selectedTimestamps = Array.from(historyList.querySelectorAll('.batch-checkbox input:checked'))
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
                const allTags = Array.from(new Set(this.historyService.getCurrentData()
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
                                const countA = this.historyService.getCurrentData()?.filter(item => item.tags?.includes(a)).length;
                                const countB = this.historyService.getCurrentData()?.filter(item => item.tags?.includes(b)).length;
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
                const addTag = async (tagText: string) => {
                    if (tagText.trim()) {
                        // 更新选中小记的标签

                        if (selectedTimestamps.length > 0) {
                            this.historyService.batchUpdateTags(selectedTimestamps, [tagText.trim()]);
                            showMessage(this.i18n.note.tagSuccess);

                            // 取消选择模式并关闭面板
                            const cancelSelectBtn = container.querySelector('.cancel-select-btn');
                            if (cancelSelectBtn) {
                                (cancelSelectBtn as HTMLElement).click();
                            }
                            tagPanel.remove();
                            document.removeEventListener('click', closePanel);
                            this.renderDockerToolbar()
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
    private renderDockHistory() {
        let element = this.element;
        this.historyService.setItemsPerPage(this.itemsPerPage);
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
        // console.log("totalUnpinnedCount", totalUnpinnedCount);
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
                // 使用设置中的值增加显示数量
                const itemsPerPage = this.settingUtils.get("itemsPerPage") || ITEMS_PER_PAGE;
                this.currentDisplayCount += itemsPerPage;

                // 获取历史内容容器
                const historyContent = element.querySelector('.history-content');
                if (historyContent) {
                    // 获取新的要显示的记录
                    const newItems = filteredHistory.unpinnedItems.slice(
                        this.currentDisplayCount - this.itemsPerPage,
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
                            .replace('${num}', (totalUnpinnedCount - this.currentDisplayCount).toString())})`;
                        loadMoreContainer.style.display = ''
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
                    this.bindHistoryListEvents();
                }
            };
        }

        // 监听历史记录点击事件
        this.bindHistoryListEvents();
    }

    // 设置历史小记中的编辑、复制、删除事件
    private bindHistoryListEvents() {
        let element = this.element;
        let historyList = element.querySelector('.history-list');

        // 移除旧的事件监听器
        historyList.removeEventListener('click', this.historyClickHandler);

        // 添加拖拽相关的事件处理
        historyList.addEventListener('dragstart', (e: DragEvent) => {
            const target = e.target as HTMLElement;
            const textContent = target.closest('.text-content');
            if (textContent) {
                const text = textContent.getAttribute('data-text');
                if (text && e.dataTransfer) {
                    e.dataTransfer.effectAllowed = 'copyMove';

                    // 设置纯文本格式
                    e.dataTransfer.setData('text/plain', text);

                    // 生成思源块 ID
                    const blockId = `${Date.now()}0${Math.random().toString().substring(2, 6)}`;

                    // 设置思源特定的格式
                    e.dataTransfer.setData('application/x-siyuan', JSON.stringify({
                        id: blockId,
                        type: "NodeParagraph",
                        content: text
                    }));

                    // 设置HTML格式 - 使用思源的块结构
                    const markdownContent = window.Lute.New().Md2HTML(text);
                    const fullHtml = `<div data-node-id="${blockId}" data-type="NodeParagraph" class="protyle-wysiwyg__paragraph" data-subtype="p">${markdownContent}</div>`;
                    e.dataTransfer.setData('text/html', fullHtml);

                    // 添加拖拽时的视觉反馈
                    target.style.opacity = '0.5';

                    // 创建拖拽图像
                    const dragImage = document.createElement('div');
                    dragImage.style.position = 'fixed';
                    dragImage.style.top = '-9999px';
                    dragImage.style.left = '-9999px';
                    dragImage.style.zIndex = '-1';
                    dragImage.style.maxWidth = '360px';
                    dragImage.style.pointerEvents = 'none';

                    // 使用思源的块样式
                    dragImage.innerHTML = `
                        <div class="protyle-wysiwyg__paragraph" data-node-id="${blockId}" data-type="NodeParagraph" style="
                            margin-bottom: 8px; 
                            padding: 8px; 
                            border: 1px solid var(--b3-border-color); 
                            border-radius: 4px; 
                            background: var(--b3-theme-background);
                            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                            ${markdownContent}
                        </div>`;

                    document.body.appendChild(dragImage);
                    e.dataTransfer.setDragImage(dragImage, 0, 0);

                    // 拖拽结束后移除临时元素
                    setTimeout(() => {
                        document.body.removeChild(dragImage);
                    }, 0);
                }
            }
        });

        historyList.addEventListener('dragend', (e: DragEvent) => {
            const target = e.target as HTMLElement;
            // 恢复透明度
            target.style.opacity = '1';
        });

        // 创建新的事件处理函数
        this.historyClickHandler = async (e) => {
            const target = e.target as HTMLElement;
            // console.log("target", target);

            // 添加对复选框的处理
            if (target.classList.contains('task-list-item-checkbox')) {
                e.stopPropagation();
                const timestamp = Number(target.getAttribute('data-timestamp'));
                const originalMark = target.getAttribute('data-original');
                const newMark = target.checked ? '[x]' : '[]';
                // 更新数据
                const note = this.historyService.getHistoryItem(timestamp);

                if (note) {
                    // 获取当前任务项的完整文本
                    const taskItemText = target.nextElementSibling.textContent.trim();

                    // 使用更精确的替换方法
                    const oldTaskItem = `${originalMark} ${taskItemText}`;
                    const newTaskItem = `${newMark} ${taskItemText}`;
                    note.text = note.text.replace(oldTaskItem, newTaskItem);
                    await this.historyService.updateItemContent(timestamp, note.text);

                    // 更新 data-original 属性
                    target.setAttribute('data-original', newMark);

                    // 添加视觉反馈
                    const textSpan = target.nextElementSibling as HTMLElement;
                    if (textSpan) {
                        textSpan.style.textDecoration = target.checked ? 'line-through' : 'none';
                        textSpan.style.opacity = target.checked ? '0.6' : '1';
                    }

                    // 添加操作成功的提示
                    // showMessage(target.checked ? '已完成任务' : '已取消完成');
                }
                return;
            }

            // 其他现有的事件处理代码...
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
                await this.editHistoryItem(timestamp)
            } else if (moreBtn) {
                e.stopPropagation();
                const timestamp = Number(moreBtn.getAttribute('data-timestamp'));
                const rect = moreBtn.getBoundingClientRect();

                // 获取当前记录项
                const currentItem = this.historyService.getHistoryItem(timestamp);

                const menu = new Menu("historyItemMenu");
                if (!menu) {
                    console.error("Failed to create menu");
                    return;
                }

                menu.addItem({
                    icon: "iconPin",
                    label: currentItem?.isPinned ? this.i18n.note.unpin : this.i18n.note.pin,
                    click: async () => {
                        await this.historyService.toggleItemPin(timestamp);
                        menu.close();
                        this.renderDockHistory();
                    }
                });

                // 添加分享选项
                menu.addItem({
                    icon: "iconShare",
                    label: this.i18n.note.share,
                    click: async () => {
                        menu.close();
                        this.generateShareImage(timestamp);
                    }
                });

                // 添加归档/取消归档选项
                menu.addItem({
                    icon: "iconArchive",
                    label: this.showArchived ? this.i18n.note.unarchive : this.i18n.note.archive,
                    click: async () => {
                        if (this.showArchived) {
                            await this.historyService.unarchiveItem(timestamp);
                        } else {
                            await this.historyService.archiveItem(timestamp);
                        }

                        menu.close();
                        this.renderDockerToolbar();
                        this.renderDockHistory();
                    }
                });


                // 添加创建为文档选项
                menu.addItem({
                    icon: "iconFile",
                    label: this.i18n.note.createDoc,
                    click: async () => {
                        menu.close();
                        this.createNoteAsDocument(timestamp);
                    }
                });
                // 添加插入到每日笔记选项
                menu.addItem({
                    icon: "iconCalendar",
                    label: this.i18n.note.insertToDaily,
                    click: async () => {
                        menu.close();
                        this.insertToDaily(timestamp);
                    }
                });
                menu.addItem({
                    icon: "iconTrashcan",
                    label: this.i18n.note.delete,
                    click: async () => {
                        confirm(this.i18n.note.delete, this.i18n.note.deleteConfirm, async () => {
                            this.historyService.deleteItem(timestamp);
                            menu.close();
                            this.renderDockerToolbar();
                            this.renderDockHistory();
                        })
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

            // 添加图片点击处理
            if (target.classList.contains('zoomable-image')) {
                e.stopPropagation();
                const img = target as HTMLImageElement;

                // 创建对话框
                const dialog = new Dialog({
                    title: '',
                    content: `<div class="image-preview" style="text-align: center; padding: 16px;">
                        <img src="${img.src}" style="max-width: 100%; max-height: 80vh; object-fit: contain;">
                    </div>`,
                    width: '80vw',
                });

                // 添加关闭按钮
                const closeBtn = document.createElement('button');
                closeBtn.className = 'b3-button b3-button--text';
                closeBtn.innerHTML = `<svg class="b3-button__icon"><use xlink:href="#iconClose"></use></svg>`;
                closeBtn.style.position = 'absolute';
                closeBtn.style.top = '8px';
                closeBtn.style.right = '8px';
                closeBtn.onclick = () => dialog.destroy();

                dialog.element.querySelector('.b3-dialog__header').appendChild(closeBtn);

                return;
            }
        };

        // 添加新的事件监听器
        historyList.addEventListener('click', this.historyClickHandler);
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
        const maxTextLength = this.settingUtils.get("maxTextLength") || MAX_TEXT_LENGTH;
        const displayText = item.text;
        const encodeText = (text: string) => {
            return text.replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        };

        // 处理图片路径转义
        const processImagePaths = (content: string) => {
            return content.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, url) => {
                return `![${alt}](${encodeURI(url)})`;
            });
        };

        // 预处理文本，保留空行
        const preserveEmptyLines = (content: string) => {
            return content.replace(/\n\n/g, '\n&nbsp;\n');
        };


        // 处理任务列表
        const processTaskList = (content: string) => {
            // 使用捕获组来保存原始的方括号格式
            return content.replace(
                /(\[[ ]?\]|\[[ ]?x[ ]?\]) ([^\n]*)/g,
                (match, checkbox, text) => {
                    const isChecked = checkbox.includes('x');
                    // 保持原始的方括号格式
                    const emptyBox = checkbox.includes(' ') ? '[ ]' : '[]';
                    const checkedBox = checkbox.includes(' ') ? '[x ]' : '[x]';
                    const normalizedCheckbox = isChecked ? checkedBox : emptyBox;

                    return `
                        <div class="task-list-item">
                            <input type="checkbox" 
                                class="task-list-item-checkbox" 
                                ${isChecked ? 'checked' : ''} 
                                data-original="${normalizedCheckbox}"  data-timestamp="${item.timestamp}">
                            <span style="${isChecked ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${text.trim()}</span>
                        </div>`;
                }
            );
        };

        // 使用 Lute 渲染 Markdown
        let renderedContent = '';
        try {
            // 先处理图片路径，再进行Markdown渲染
            const processedText = processImagePaths(displayText);
            const textWithEmptyLines = preserveEmptyLines(processedText);
            renderedContent = window.Lute.New().Md2HTML(textWithEmptyLines);
            renderedContent = processTaskList(renderedContent);

            // 添加图片点击事件处理
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = renderedContent;

            // 为所有图片添加点击事件类和样式
            tempDiv.querySelectorAll('img').forEach(img => {
                img.classList.add('zoomable-image');
                img.style.cursor = 'zoom-in';
                img.style.maxWidth = '100%';
                img.style.height = 'auto';
            });

            renderedContent = tempDiv.innerHTML;
        } catch (error) {
            console.error('Markdown rendering failed:', error);
            renderedContent = `<div style="color: var(--b3-theme-on-surface); word-break: break-word; white-space: pre-wrap;">${encodeText(displayText)}</div>`;
        }

        return `
            <div class="fn__flex" style="gap: 8px;">
                <!-- 添加复选框，默认隐藏 -->
                <div class="${this.isBatchSelect ? 'batch-checkbox' : 'batch-checkbox fn__none'}" style="padding-top: 2px;">
                    <input type="checkbox" class="b3-checkbox" data-timestamp="${item.timestamp}">
                </div>
                <div class="fn__flex-1">
                    <div class="text-content" data-text="${encodeText(displayText)}" draggable="true">
                        ${item.text.length > maxTextLength ?
                `<div style="word-break: break-word;">
                                <div class="collapsed-text markdown-content" style="color: var(--b3-theme-on-surface);">
                                    ${window.Lute.New().Md2HTML(displayText.substring(0, maxTextLength))}...
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
                .replace('${num}', (total - shown).toString())}
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
                        <div class="b3-dialog__content" style="box-sizing: border-box; padding: 16px; height: 100%; display: flex; flex-direction: column;">
                            ${this.getEditorTemplate(this.tempNoteContent)}
                        </div>`,
                    width: "520px",
                    height: "400px",  // 添加初始高度
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

                        // 添加快捷键事件监听
                        textarea.addEventListener('keydown', async (e) => {
                            // 保存快捷键 (Cmd/Ctrl + Enter)
                            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                                e.preventDefault();
                                dialog.element.querySelector('[data-type="save"]')?.click();
                            }
                            // 添加标签快捷键 (Cmd/Ctrl + K)
                            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                                // console.log("ctrl/cmd + k");
                                e.preventDefault();
                                const addTagBtn = dialog.element.querySelector('.add-tag-btn') as HTMLElement;
                                if (addTagBtn) {
                                    addTagBtn.click();
                                }
                            }
                        });
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
                            // showMessage(this.i18n.note.saveSuccess);
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
                // showMessage(this.i18n.note.editSuccess);
                this.renderDockerToolbar();
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
            // 检查是否需要自动复制到每日笔记
            const autoCopyToDaily = this.settingUtils.get("autoCopyToDaily");
            let defaultNotebook = this.settingUtils.get("defaultNotebook");

            if (autoCopyToDaily) {
                try {
                    // 如果没有设置默认笔记本，获取第一个笔记本
                    if (!defaultNotebook) {
                        const notebooks = await lsNotebooks();
                        if (notebooks && notebooks.notebooks && notebooks.notebooks.length > 0) {
                            defaultNotebook = notebooks.notebooks[0].id;
                        }
                    }

                    if (defaultNotebook) {
                        // 创建或获取每日笔记
                        const result = await createDailyNote(defaultNotebook);

                        // 获取模板并替换变量
                        let template = this.settingUtils.get("insertTemplate") || "> [!note] 小记 ${time}\n${content}${tags}";

                        // 准备变量值
                        const time = new Date().toLocaleString();
                        const content = text;  // 不再添加 > 前缀
                        const tagsVal = tags && tags.length > 0 ? tags.map(tag => `#${tag}`).join(' ') : '';

                        // 替换模板中的变量
                        const content_final = template
                            .replace(/\${time}/g, time)
                            .replace(/\${content}/g, content)
                            .replace(/\${tags}/g, tagsVal);
                        // 插入内容到文档末尾
                        const appendResult = await appendBlock("markdown", content_final, result.id);
                        // appendResult[0] 包含 doOperations 数组，其中第一个操作的 id 就是 blockId
                        // const blockId = appendResult?.[0]?.doOperations?.[0]?.id;
                        // if (blockId) {
                        //     // 在原小记末尾添加引用链接
                        //     const newText = text + `\n\n[${this.i18n.note.referenceLink}](siyuan://blocks/${blockId})`;
                        //     await this.historyService.saveContent({ text: newText, tags });
                        // } else {
                        // 如果没有获取到 blockId，仍然保存原始内容
                        // await this.historyService.saveContent({ text, tags });
                        // }

                        await this.historyService.saveContent({ text, tags });
                    } else {
                        console.warn('没有可用的笔记本');
                    }
                } catch (error) {
                    console.error('自动复制到每日笔记失败:', error);
                    // 这里我们不显示错误消息，因为这是自动操作
                }
            }

            if (this.element) {
                this.initDockPanel();
            }
        }
    }

    // 创建编辑器模板
    private getEditorTemplate(text: string = '', placeholder: string = this.i18n.note.placeholder) {
        return `
            <div style="border: 1px solid var(--b3-border-color); border-radius: 8px; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1); overflow: hidden; height: 100%; display: flex; flex-direction: column;">
                <textarea class="fn__flex-1" 
                    placeholder="${placeholder}"
                    style="width: 100%; 
                    min-height: 160px; 
                    flex: 1;
                    resize: none; 
                    padding: 12px; 
                    background-color: var(--b3-theme-background);
                    color: var(--b3-theme-on-background);
                    border: none;
                    box-sizing: border-box;"
                    onkeydown="if((event.metaKey || event.ctrlKey) && event.key === 'Enter') { 
                        event.preventDefault(); 
                        this.closest('.b3-dialog__content')?.querySelector('[data-type=\\'save\\']')?.click(); 
                    } else if((event.metaKey || event.ctrlKey) && event.key === 'z') {
                        event.preventDefault();
                        if(event.shiftKey) {
                            document.execCommand('redo');
                        } else {
                            document.execCommand('undo');
                        }
                    }"
                >${text}</textarea>
                <div style="border-top: 1px solid var(--b3-border-color); padding: 8px 12px; flex-shrink: 0;">
                    <div class="tags-list" style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; min-height: 0;"></div>
                    <div class="fn__flex" style="justify-content: space-between; align-items: center;">
                        <div class="fn__flex" style="gap: 8px;">
                            <button class="b3-button b3-button--text add-tag-btn b3-tooltips b3-tooltips__n" 
                                style="padding: 4px;" 
                                aria-label="${this.i18n.note.addTag} ${adaptHotkey('⌘K')}">
                                <svg class="b3-button__icon" style="height: 16px; width: 16px;">
                                    <use xlink:href="#iconTags"></use>
                                </svg>
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


                // 获取所有标签并去重
                const allTags = Array.from(new Set(this.historyService.getCurrentData()
                    ?.filter(item => item && Array.isArray(item.tags))
                    .flatMap(item => item.tags || [])
                ));

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
                                const countA = this.historyService.getCurrentData()?.filter(item => item.tags?.includes(a)).length;
                                const countB = this.historyService.getCurrentData()?.filter(item => item.tags?.includes(b)).length;
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
                const addTag = async (tagText: string) => {
                    if (tagText.trim()) {
                        // 更新选中小记的标签

                        if (selectedTimestamps.length > 0) {
                            this.historyService.batchUpdateTags(selectedTimestamps, [tagText.trim()]);
                            showMessage(this.i18n.note.tagSuccess);

                            // 取消选择模式并关闭面板
                            const cancelSelectBtn = container.querySelector('.cancel-select-btn');
                            if (cancelSelectBtn) {
                                (cancelSelectBtn as HTMLElement).click();
                            }
                            tagPanel.remove();
                            document.removeEventListener('click', closePanel);
                            this.renderDockerToolbar()
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
                    this.currentDisplayCount = this.itemsPerPage;
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
                    this.bindHistoryListEvents();
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

                    this.currentDisplayCount = this.itemsPerPage;

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
        const exportBtn = container.querySelector('[data-type="export"]'); // 修改选择器以匹配顶部栏的导出按钮
        if (exportBtn) {
            this.exportDialog = new ExportDialog(this.i18n);
            this.exportService = new ExportService(this.i18n);
            console.log("setupExportFeature");
            exportBtn.addEventListener('click', () => {
                // 创建导出对话框
                this.exportDialog.show(
                    {
                        history: this.historyService.getHistoryData(),
                        archivedHistory: this.historyService.getArchivedData()
                    },
                    this.historyService.getHistoryData(),
                    (filteredData, format) => {
                        // 导出回调
                        const success = this.exportService.exportData(filteredData, format);
                        if (success) {
                            showMessage(this.i18n.note.exportSuccess);
                        } else {
                            showMessage(this.i18n.note.exportFailed);
                        }
                    }
                );
            });
        }
    }

    // 在 createNewNote 和 editHistoryItem 方法中添加图片上传事件处理
    private setupImageUpload(container: HTMLElement) {
        const uploadBtn = container.querySelector('.upload-image-btn');
        const uploadInput = container.querySelector('.image-upload-input') as HTMLInputElement;
        const textarea = container.querySelector('textarea') as HTMLTextAreaElement;

        if (uploadBtn && uploadInput && textarea) {
            // 处理图片上传
            const handleImageUpload = async (files: File[]) => {
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
                            .map(([filename, url]) => `![${filename}](${url as string})`)
                            .join('\n');

                        // 在光标位置插入图片链接
                        textarea.value = text.substring(0, start) + imageLinks + text.substring(end);

                        // 更新光标位置
                        const newPosition = start + imageLinks.length;
                        textarea.setSelectionRange(newPosition, newPosition);
                        textarea.focus();
                    }
                } catch (error) {
                    console.error('Upload failed:', error);
                    showMessage(this.i18n.note.uploadFailed);
                }
            };

            // 点击上传按钮处理
            uploadBtn.addEventListener('click', () => {
                uploadInput.click();
            });

            // 文件选择处理
            uploadInput.addEventListener('change', async () => {
                const files = Array.from(uploadInput.files || []);
                await handleImageUpload(files);
                // 清空 input，允许重复上传相同文件
                uploadInput.value = '';
            });

            // 添加粘贴事件处理
            textarea.addEventListener('paste', async (e: ClipboardEvent) => {
                const items = Array.from(e.clipboardData?.items || []);
                const imageFiles = items
                    .filter(item => item.type.startsWith('image/'))
                    .map(item => {
                        const file = item.getAsFile();
                        if (file) {
                            // 使用当前时间戳和原始文件类型作为文件名
                            const timestamp = new Date().getTime();
                            const ext = file.name?.split('.').pop() || file.type.split('/')[1] || 'png';
                            return new File([file], `pasted_image_${timestamp}.${ext}`, {
                                type: file.type
                            });
                        }
                        return null;
                    })
                    .filter((file): file is File => file !== null);

                if (imageFiles.length > 0) {
                    e.preventDefault(); // 阻止默认粘贴行为
                    await handleImageUpload(imageFiles);
                }
            });
        }
    }

    private cleanupEventListeners() {
        const historyList = this.element?.querySelector('.history-list');
        if (historyList && this.historyClickHandler) {
            historyList.removeEventListener('click', this.historyClickHandler);
        }
    }

    private async createNoteAsDocument(timestamp: number) {
        try {
            // 获取小记内容
            const note = this.historyService.getHistoryItem(timestamp);
            if (!note) {
                showMessage(this.i18n.note.noteNotFound);
                return;
            }

            // 获取所有笔记本
            const notebooks = await lsNotebooks();
            if (!notebooks || !notebooks.notebooks || notebooks.notebooks.length === 0) {
                showMessage(this.i18n.note.noNotebooks);
                return;
            }

            // 创建选择笔记本的对话框
            const dialog = new Dialog({
                title: this.i18n.note.selectNotebook,
                content: `
                    <div class="b3-dialog__content" style="max-height: 70vh; overflow: auto; padding: 20px;">
                        <div class="fn__flex-column" style="gap: 16px;">
                            <div class="fn__flex-column" style="gap: 8px;">
                                <div class="fn__flex" style="align-items: center;">
                                    <span class="ft__on-surface" style="font-size: 14px; font-weight: 500;">${this.i18n.note.docTitle}</span>
                                    <span class="fn__space"></span>
                                    <input type="text" class="b3-text-field fn__flex-1" id="docTitle" 
                                        placeholder="${this.i18n.note.docTitlePlaceholder}"
                                        style="padding: 8px 12px; border-radius: 6px;">
                                </div>
                                <div class="fn__flex" style="align-items: center;">
                                    <span class="ft__on-surface" style="font-size: 14px; font-weight: 500;">${this.i18n.note.docPath}</span>
                                    <span class="fn__space"></span>
                                    <input type="text" class="b3-text-field fn__flex-1" id="docPath" 
                                        value="/小记" 
                                        placeholder="${this.i18n.note.docPathPlaceholder}"
                                        style="padding: 8px 12px; border-radius: 6px;">
                                </div>
                            </div>
                            <div class="fn__flex-column" style="gap: 8px;">
                                <span class="ft__on-surface" style="font-size: 14px; font-weight: 500;">${this.i18n.note.selectNotebook}</span>
                                <div class="fn__flex-column notebooks-list" style="gap: 8px; max-height: 200px; overflow-y: auto; padding: 8px; background: var(--b3-theme-background); border-radius: 6px; border: 1px solid var(--b3-border-color);">
                                    ${notebooks.notebooks.map((notebook, index) => `
                                        <label class="fn__flex b3-label" style="padding: 8px; border-radius: 4px; cursor: pointer; transition: all 0.2s ease;">
                                            <input type="radio" name="notebook" value="${notebook.id}" style="margin-right: 8px;" ${index === 0 ? 'checked' : ''}>
                                            <span>${notebook.name}</span>
                                        </label>
                                    `).join('')}
                                </div>
                            </div>
                            <div class="fn__flex" style="align-items: center; margin-top: 8px;">
                                <label class="fn__flex b3-label" style="align-items: center; cursor: pointer;">
                                    <input type="checkbox" class="b3-checkbox" id="deleteAfterCreate" checked>
                                    <span style="margin-left: 8px;">${this.i18n.note.deleteAfterCreate}</span>
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="fn__flex b3-dialog__action" style="padding: 16px; border-top: 1px solid var(--b3-border-color); background: var(--b3-theme-background);">
                        <div class="fn__flex-1"></div>
                        <button class="b3-button b3-button--cancel" style="margin-right: 8px; padding: 8px 16px;">${this.i18n.note.cancel}</button>
                        <button class="b3-button b3-button--text" data-type="confirm" style="padding: 8px 16px;">${this.i18n.note.confirm}</button>
                    </div>
                `,
                width: "520px"
            });

            // 添加悬停效果
            const labels = dialog.element.querySelectorAll('.notebooks-list .b3-label');
            labels.forEach(label => {
                label.addEventListener('mouseenter', () => {
                    (label as HTMLElement).style.backgroundColor = 'var(--b3-theme-surface)';
                });
                label.addEventListener('mouseleave', () => {
                    (label as HTMLElement).style.backgroundColor = '';
                });
            });

            // 聚焦到标题输入框
            setTimeout(() => {
                const titleInput = dialog.element.querySelector('#docTitle') as HTMLInputElement;
                if (titleInput) {
                    titleInput.focus();
                }
            }, 100);

            const confirmBtn = dialog.element.querySelector('[data-type="confirm"]') as HTMLElement;
            const cancelBtn = dialog.element.querySelector('.b3-button--cancel') as HTMLElement;

            // 绑定取消按钮事件
            cancelBtn.addEventListener('click', () => {
                dialog.destroy();
            });

            // 绑定确认按钮事件
            confirmBtn.addEventListener('click', async () => {
                const selectedNotebook = dialog.element.querySelector('input[name="notebook"]:checked') as HTMLInputElement;
                const docTitle = (dialog.element.querySelector('#docTitle') as HTMLInputElement).value.trim();
                const docPath = (dialog.element.querySelector('#docPath') as HTMLInputElement).value.trim();
                const deleteAfterCreate = (dialog.element.querySelector('#deleteAfterCreate') as HTMLInputElement).checked;

                if (!selectedNotebook) {
                    showMessage(this.i18n.note.pleaseSelectNotebook);
                    return;
                }

                try {
                    // 创建文档
                    const notebookId = selectedNotebook.value;
                    const title = docTitle || this.i18n.note.untitledDoc;
                    const path = `${docPath}/${title}`;
                    await createDocWithMd(notebookId, path, note.text);

                    // 如果选择了创建后删除
                    if (deleteAfterCreate) {
                        this.historyService.deleteItem(timestamp);
                        this.renderDockerToolbar();
                        this.renderDockHistory();
                    }

                    showMessage(this.i18n.note.createDocSuccess);
                    dialog.destroy();
                } catch (error) {
                    console.error('创建文档失败:', error);
                    showMessage(this.i18n.note.createDocFailed);
                }
            });
        } catch (error) {
            console.error('创建文档失败:', error);
            showMessage(this.i18n.note.createDocFailed);
        }
    }

    // 添加插入到每日笔记的方法
    private async insertToDaily(timestamp: number) {
        try {
            // 获取小记内容
            const note = this.historyService.getHistoryItem(timestamp);
            if (!note) {
                showMessage(this.i18n.note.noteNotFound);
                return;
            }

            // 获取默认笔记本
            let defaultNotebook = this.settingUtils.get("defaultNotebook");

            // 如果没有设置默认笔记本，获取第一个笔记本
            if (!defaultNotebook) {
                const notebooks = await lsNotebooks();
                if (notebooks && notebooks.notebooks && notebooks.notebooks.length > 0) {
                    defaultNotebook = notebooks.notebooks[0].id;
                }
            }

            if (!defaultNotebook) {
                showMessage(this.i18n.note.noNotebooks);
                return;
            }

            try {
                // 创建或获取每日笔记
                const result = await createDailyNote(defaultNotebook);

                // 获取模板并替换变量
                let template = this.settingUtils.get("insertTemplate") || "> [!note] 小记 ${time}\n${content}${tags}";

                // 准备变量值
                const time = new Date(note.timestamp).toLocaleString();
                const content = note.text;  // 不再添加 > 前缀
                const tags = note.tags && note.tags.length > 0 ? note.tags.map(tag => `#${tag}`).join(' ') : '';

                // 替换模板中的变量
                const content_final = template
                    .replace(/\${time}/g, time)
                    .replace(/\${content}/g, content)
                    .replace(/\${tags}/g, tags);

                // 插入内容到文档末尾
                const appendResult = await appendBlock("markdown", content_final, result.id);
                // appendResult[0] 包含 doOperations 数组，其中第一个操作的 id 就是 blockId
                // const blockId = appendResult?.[0]?.doOperations?.[0]?.id;
                // if (blockId) {
                //     // 在原小记末尾添加引用链接
                //     const newText = note.text + `\n\n[${this.i18n.note.referenceLink}](siyuan://blocks/${blockId})`;
                //     await this.historyService.updateItemContent(timestamp, newText);
                // }
                showMessage(this.i18n.note.insertSuccess);

                // 检查是否需要删除原小记
                const deleteAfterInsert = this.settingUtils.get("deleteAfterInsert");
                if (deleteAfterInsert) {
                    this.historyService.deleteItem(timestamp);
                    this.renderDockerToolbar();
                    this.renderDockHistory();
                }
            } catch (error) {
                console.error('插入到每日笔记失败:', error);
                showMessage(this.i18n.note.insertFailed);
            }
        } catch (error) {
            console.error('插入到每日笔记失败:', error);
            showMessage(this.i18n.note.insertFailed);
        }
    }

    private async generateShareImage(timestamp: number) {
        try {
            const note = this.historyService.getHistoryItem(timestamp);
            if (!note) {
                showMessage(this.i18n.note.noteNotFound);
                return;
            }

            // 创建一个临时的 div 来渲染 Markdown
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = window.Lute.New().Md2HTML(note.text);

            // 等待所有图片加载完成
            const loadImages = async () => {
                const images = Array.from(tempDiv.querySelectorAll('img'));
                if (images.length === 0) return;

                await Promise.all(images.map(img => {
                    return new Promise((resolve, reject) => {
                        if (img.complete) {
                            resolve(img);
                        } else {
                            img.onload = () => resolve(img);
                            img.onerror = reject;
                        }
                    });
                }));
            };

            await loadImages();

            // 处理任务列表
            const processTaskList = (content: string) => {
                return content.replace(
                    /(\[[ ]?\]|\[[ ]?x[ ]?\]) ([^\n]*)/g,
                    (match, checkbox, text) => {
                        const isChecked = checkbox.includes('x');
                        return text.trim();
                    }
                );
            };

            // 获取处理后的文本内容
            const renderedText = processTaskList(tempDiv.innerText);

            // 创建一个离屏 canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                showMessage(this.i18n.note.generateImageFailed);
                return;
            }

            // 设置画布宽度和基础参数
            canvas.width = 800;
            const margin = 40;
            const contentPadding = 40; // 内容区域的内边距
            const contentWidth = canvas.width - margin * 2;

            // 设置字体样式用于计算文本高度
            ctx.font = '24px "PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif';
            
            // 计算文本换行后的实际高度
            const maxTextWidth = contentWidth - contentPadding * 2;
            const lines = [];
            let currentLine = '';
            const words = renderedText.split('');
            
            for (const char of words) {
                const testLine = currentLine + char;
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxTextWidth) {
                    lines.push(currentLine);
                    currentLine = char;
                } else {
                    currentLine = testLine;
                }
            }
            if (currentLine) {
                lines.push(currentLine);
            }

            // 计算图片高度
            const images = Array.from(tempDiv.querySelectorAll('img'));
            const imageHeight = images.reduce((total, img) => {
                const aspectRatio = img.naturalWidth / img.naturalHeight;
                const width = Math.min(maxTextWidth, img.naturalWidth);
                const height = width / aspectRatio;
                return total + height + 20; // 20px 为图片间距
            }, 0);

            // 计算内容总高度
            const lineHeight = 36; // 行高
            const textHeight = lines.length * lineHeight;
            const tagsHeight = note.tags?.length ? 80 : 0;
            const headerHeight = 60; // 日期区域高度
            const footerHeight = 60; // 底部信息区域高度
            const totalContentHeight = headerHeight + textHeight + imageHeight + tagsHeight + footerHeight;

            // 设置画布总高度（加上上下边距和内边距）
            canvas.height = totalContentHeight + contentPadding * 2 + margin * 2;

            // 设置背景色
            ctx.fillStyle = '#dc4446';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 绘制白色主体区域
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(margin, margin, contentWidth, canvas.height - margin * 2);

            // 设置半圆参数
            const arcRadius = 15;
            const arcSpacing = 45;
            const arcCount = Math.floor(contentWidth / arcSpacing);
            
            // 绘制上边的红色下半圆
            ctx.fillStyle = '#dc4446';
            for (let i = 0; i < arcCount; i++) {
                const x = margin + i * arcSpacing + arcSpacing/2;
                const y = margin;
                
                ctx.beginPath();
                ctx.arc(x, y, arcRadius, 0, Math.PI, false);
                ctx.fill();
            }

            // 绘制下边的红色上半圆
            for (let i = 0; i < arcCount; i++) {
                const x = margin + i * arcSpacing + arcSpacing/2;
                const y = canvas.height - margin;
                
                ctx.beginPath();
                ctx.arc(x, y, arcRadius, Math.PI, 2 * Math.PI, false);
                ctx.fill();
            }

            // 绘制日期（右上角，红色）
            ctx.fillStyle = '#dc4446';
            ctx.font = '20px "PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'top';
            const date = new Date(note.timestamp).toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).replace(/\//g, '-');
            ctx.fillText(date, canvas.width - margin - contentPadding, margin + contentPadding);

            // 绘制内容（黑色）
            ctx.fillStyle = '#333333';
            ctx.font = '24px "PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            
            // 逐行绘制文本和图片
            let currentY = margin + contentPadding + headerHeight;
            
            // 绘制文本
            lines.forEach((line) => {
                ctx.fillText(line, margin + contentPadding, currentY);
                currentY += lineHeight;
            });

            // 绘制图片
            if (images.length > 0) {
                currentY += 20; // 文本和图片之间的间距
                for (const img of images) {
                    const aspectRatio = img.naturalWidth / img.naturalHeight;
                    const width = Math.min(maxTextWidth, img.naturalWidth);
                    const height = width / aspectRatio;
                    
                    try {
                        ctx.drawImage(
                            img,
                            margin + contentPadding,
                            currentY,
                            width,
                            height
                        );
                        currentY += height + 20; // 图片间距
                    } catch (error) {
                        console.error('绘制图片失败:', error);
                    }
                }
            }

            // 绘制标签（红色椭圆背景）
            if (note.tags && note.tags.length > 0) {
                let tagX = margin + contentPadding;
                const tagY = margin + contentPadding + headerHeight + textHeight + imageHeight + 20;
                ctx.font = '16px "PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif';
                
                note.tags.forEach(tag => {
                    const tagText = '#' + tag;
                    const tagWidth = ctx.measureText(tagText).width + 20;
                    const tagHeight = 26;
                    
                    if (tagX + tagWidth > canvas.width - margin - contentPadding) return;
                    
                    // 绘制红色椭圆背景
                    ctx.fillStyle = '#dc4446';
                    ctx.beginPath();
                    ctx.ellipse(
                        tagX + tagWidth/2, 
                        tagY + tagHeight/2, 
                        tagWidth/2, 
                        tagHeight/2, 
                        0, 0, 2 * Math.PI
                    );
                    ctx.fill();
                    
                    // 绘制白色标签文本
                    ctx.fillStyle = '#ffffff';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(tagText, tagX + tagWidth/2, tagY + tagHeight/2);
                    
                    tagX += tagWidth + 10;
                });
            }

            // 绘制底部信息
            ctx.fillStyle = '#999999';
            ctx.font = '16px "PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            ctx.fillText('19 MEMOS · 398 DAYS', margin + contentPadding, canvas.height - margin - contentPadding);

            // 绘制 flomo 标志
            ctx.fillStyle = '#dc4446';
            ctx.textAlign = 'right';
            ctx.fillText('flomo', canvas.width - margin - contentPadding, canvas.height - margin - contentPadding);

            // 创建预览对话框
            const dialog = new Dialog({
                title: this.i18n.note.sharePreview,
                content: `
                    <div class="fn__flex-column" style="padding: 16px; gap: 16px;">
                        <div class="image-preview" style="text-align: center;">
                            <img src="${canvas.toDataURL('image/png')}" style="max-width: 100%; height: auto; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
                        </div>
                        <div class="fn__flex" style="justify-content: center; gap: 16px;">
                            <button class="b3-button b3-button--outline copy-btn">
                                <svg class="b3-button__icon"><use xlink:href="#iconCopy"></use></svg>
                                ${this.i18n.note.copyImage}
                            </button>
                            <button class="b3-button download-btn">
                                <svg class="b3-button__icon"><use xlink:href="#iconDownload"></use></svg>
                                ${this.i18n.note.downloadImage}
                            </button>
                        </div>
                    </div>
                `,
                width: '600px'
            });

            // 绑定复制按钮事件
            const copyBtn = dialog.element.querySelector('.copy-btn');
            if (copyBtn) {
                copyBtn.addEventListener('click', async () => {
                    try {
                        const blob = await new Promise<Blob>(resolve => canvas.toBlob(resolve, 'image/png'));
                        await navigator.clipboard.write([
                            new ClipboardItem({
                                'image/png': blob
                            })
                        ]);
                        showMessage(this.i18n.note.copySuccess);
                        dialog.destroy();
                    } catch (err) {
                        console.error('复制图片失败:', err);
                        showMessage(this.i18n.note.copyFailed);
                    }
                });
            }

            // 绑定下载按钮事件
            const downloadBtn = dialog.element.querySelector('.download-btn');
            if (downloadBtn) {
                downloadBtn.addEventListener('click', () => {
                    const link = document.createElement('a');
                    link.download = `share_${Date.now()}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                    dialog.destroy();
                    showMessage(this.i18n.note.downloadSuccess);
                });
            }
        } catch (error) {
            console.error('生成分享图失败:', error);
            showMessage(this.i18n.note.shareFailed);
        }
    }

}
