import {
    Plugin,
    showMessage,
    confirm,
    Dialog,
    Menu,
    openTab,
    adaptHotkey,
    getFrontend,
    getBackend,
    IModel,
    Protyle,
    openWindow,
    IOperation,
    Constants,
    openMobileFileById,
    lockScreen,
    ICard,
    ICardData
} from "siyuan";
import "@/index.scss";

import HelloExample from "@/hello.svelte";
import SettingExample from "@/setting-example.svelte";

import { svelteDialog } from "./libs/dialog";

// 移除外部的静态属性声明
const STORAGE_NAME = "menu-config";
const TAB_TYPE = "custom_tab";
const DOCK_TYPE = "small_notes_dock";
const DOCK_STORAGE_NAME = "dock-content";
const ITEMS_PER_PAGE = 10; // 每次加载10条记录
const MAX_TEXT_LENGTH = 250; // 超过这个长度的文本会被折叠

export default class PluginSample extends Plugin {
    // 将静态属性移到类内部
    private static readonly ARCHIVE_STORAGE_NAME = "archive-content";
    private isCreatingNote: boolean = false; // 添加标志位跟踪新建小记窗口状态
    private tempNoteContent: string = ''; // 添加临时内容存储
    private tempNoteTags: string[] = []; // 添加临时标签存储

    customTab: () => IModel;
    private isMobile: boolean;
    private blockIconEventBindThis = this.blockIconEvent.bind(this);
    private isDescending: boolean = true;
    private dock: any;
    private currentDisplayCount: number = ITEMS_PER_PAGE;
    private selectedTags: string[] = [];
    private showArchived: boolean = false;

    async onload() {
        this.data[STORAGE_NAME] = { readonlyText: "Readonly" };

        console.log("loading plugin-sample", this.i18n);

        const frontEnd = getFrontend();
        this.isMobile = frontEnd === "mobile" || frontEnd === "browser-mobile";
        // 图标的制作参见帮助文档
        this.addIcons(`<symbol id="iconFace" viewBox="0 0 32 32">
<path d="M13.667 17.333c0 0.92-0.747 1.667-1.667 1.667s-1.667-0.747-1.667-1.667 0.747-1.667 1.667-1.667 1.667 0.747 1.667 1.667zM20 15.667c-0.92 0-1.667 0.747-1.667 1.667s0.747 1.667 1.667 1.667 1.667-0.747 1.667-1.667-0.747-1.667-1.667-1.667zM29.333 16c0 7.36-5.973 13.333-13.333 13.333s-13.333-5.973-13.333-13.333 5.973-13.333 13.333-13.333 13.333 5.973 13.333 13.333zM14.213 5.493c1.867 3.093 5.253 5.173 9.12 5.173 0.613 0 1.213-0.067 1.787-0.16-1.867-3.093-5.253-5.173-9.12-5.173-0.613 0-1.213 0.067-1.787 0.16zM5.893 12.627c2.28-1.293 4.040-3.4 4.88-5.92-2.28 1.293-4.040 3.4-4.88 5.92zM26.667 16c0-1.040-0.16-2.040-0.44-2.987-0.933 0.2-1.893 0.32-2.893 0.32-4.173 0-7.893-1.92-10.347-4.92-1.4 3.413-4.187 6.093-7.653 7.4 0.013 0.053 0 0.12 0 0.187 0 5.88 4.787 10.667 10.667 10.667s10.667-4.787 10.667-10.667z"></path>
</symbol>
<symbol id="iconSaving" viewBox="0 0 32 32">
<path d="M20 13.333c0-0.733 0.6-1.333 1.333-1.333s1.333 0.6 1.333 1.333c0 0.733-0.6 1.333-1.333 1.333s-1.333-0.6-1.333-1.333zM10.667 12h6.667v-2.667h-6.667v2.667zM29.333 10v9.293l-3.76 1.253-2.24 7.453h-7.333v-2.667h-2.667v2.667h-7.333c0 0-3.333-11.28-3.333-15.333s3.28-7.333 7.333-7.333h6.667c1.213-1.613 3.147-2.667 5.333-2.667 1.107 0 2 0.893 2 2 0 0.28-0.053 0.533-0.16 0.773-0.187 0.453-0.347 0.973-0.427 1.533l3.027 3.027h2.893zM26.667 12.667h-1.333l-4.667-4.667c0-0.867 0.12-1.72 0.347-2.547-1.293 0.333-2.347 1.293-2.787 2.547h-8.227c-2.573 0-4.667 2.093-4.667 4.667 0 2.507 1.627 8.867 2.68 12.667h2.653v-2.667h8v2.667h2.68l2.067-6.867 3.253-1.093v-4.707z"></path>
</symbol>
<symbol id="iconSmallNote" viewBox="0 0 1024 1024">
    <path d="M525.489 551.877c26.867-40.836 125.288-187.583 162.151-219.15-47.001 111.956-139.59 227.146-194.992 336.989 102.353 34.68 148.738-6.429 205.211-54.28l-55.957-10.735c71.059-23.289 66.096-14.656 90.981-49.064 19.741-27.271 36.126-64.094 42.13-102.545l-46.244 5.751c14.758-8.592 47.618-23.683 52.834-32.103 13.959-22.5 50.621-237.738 51.045-282.476-141.319 1.304-367.1 296.536-383.434 437.633-16.435 141.855-177.9 356.214 76.274-30.031v0.011z m210.649 79.762c42.15 25.128 67.218 57.585 67.218 93.761 0 195.113-612.005 195.113-612.005 0 0-89.607 139.024-129.786 211.043-140.793-1.698 12.049-5.398 24.35-10.239 36.924-49.499 9.057-166.013 42.544-166.013 103.869 0 147.384 542.422 147.384 542.422 0 0-25.866-23.299-50.55-61.79-70.381 9.856-7.177 19.519-15.102 29.364-23.38z"/>
</symbol>
<symbol id="iconStatus" viewBox="0 0 24 24">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.88-11.71L10 14.17l-1.88-1.88a.996.996 0 1 0-1.41 1.41l2.59 2.59c.39.39 1.02.39 1.41 0L17.3 9.7a.996.996 0 0 0 0-1.41c-.39-.39-1.03-.39-1.42 0z"/>
</symbol>
<symbol id="iconArchive" viewBox="0 0 1024 1024">
    <path d="M865.3 506.3V184.1c0-64.8-52.7-117.5-117.5-117.5H281c-64.8 0-117.5 52.7-117.5 117.5v322.2c-46.4 5.8-82.4 45.5-82.4 93.5v257.8c0 52 42.3 94.2 94.2 94.2h678.2c52 0 94.2-42.3 94.2-94.2V599.8c0-47.9-36-87.6-82.4-93.5zM233.5 184.1c0-26.2 21.3-47.5 47.5-47.5h466.8c26.2 0 47.5 21.3 47.5 47.5v321.5H669.9v87.6c0 3.3-2.7 6-6 6H365c-3.3 0-6-2.7-6-6v-87.6H233.5V184.1z m644.2 673.6c0 13.4-10.9 24.2-24.2 24.2H175.3c-13.4 0-24.2-10.9-24.2-24.2V599.8c0-13.4 10.9-24.2 24.2-24.2H289v17.6c0 41.9 34.1 76 76 76h298.8c41.9 0 76-34.1 76-76v-17.6H853.4c13.4 0 24.2 10.9 24.2 24.2v257.9z"/>
    <path d="M513.2 520.3l140.6-140.6-49.5-49.5-57.3 57.4V194.5h-70v190.6l-54.9-54.9-49.5 49.5 91.1 91.1z"/>
</symbol>
<symbol id="iconMerge" viewBox="0 0 1024 1024">
  <path d="M1024 385.024l0 189.44-169.984 0q-12.288 0-16.896 5.12t-4.608 15.36l0 26.624q0 8.192-6.656 14.336t-16.896 8.192-22.528-1.024-23.552-14.336q-29.696-28.672-60.928-65.536t-57.856-66.56q-6.144-7.168-5.12-19.456t9.216-21.504q27.648-32.768 58.368-64.512l67.584-66.56q5.12-5.12 14.848-6.656t19.456-0.512 16.896 5.12 7.168 9.216l0 15.36q0 10.24 4.608 24.064t23.04 13.824l163.84 0zM63.488 574.464l0-189.44 163.84 0q17.408 0 22.528-7.68t5.12-17.92l0-16.384q0-12.288 7.168-18.944t16.896-8.192 19.456 1.024 14.848 7.68l67.584 66.56q30.72 31.744 58.368 64.512 8.192 9.216 9.216 21.504t-6.144 19.456q-26.624 29.696-57.856 66.56t-60.928 65.536q-11.264 11.264-23.552 15.36t-22.016 2.048-16.384-9.728-6.656-20.992l0-26.624q0-10.24-4.608-12.288t-17.92-2.048l-168.96 0zM896 63.488q26.624 0 49.664 10.24t40.448 27.648 27.648 40.448 10.24 49.664l0 128-128 0 0-128-320.512 0 0 576.512 320.512 0 0-128 128 0 0 128q0 26.624-10.24 49.664t-27.648 40.448-40.448 27.648-49.664 10.24l-704.512 0q-26.624 0-49.664-10.24t-40.448-27.648-27.648-40.448-10.24-49.664l0-128 128 0 0 128 320.512 0 0-576.512-320.512 0 0 128-128 0 0-128q0-26.624 10.24-49.664t27.648-40.448 40.448-27.648 49.664-10.24l704.512 0z" p-id="4414"></path>
</symbol>
<symbol id="iconExportNew" viewBox="0 0 1024 1024">
    <path d="M512 202.666667a32 32 0 0 0-32-32H256a85.333333 85.333333 0 0 0-85.333333 85.333333v512a85.333333 85.333333 0 0 0 85.333333 85.333333h512a85.333333 85.333333 0 0 0 85.333333-85.333333v-224a32 32 0 0 0-64 0V768a21.333333 21.333333 0 0 1-21.333333 21.333333H256a21.333333 21.333333 0 0 1-21.333333-21.333333V256a21.333333 21.333333 0 0 1 21.333333-21.333333h224a32 32 0 0 0 32-32z" fill="currentColor"/>
    <path d="M848.469333 361.258667a8.533333 8.533333 0 0 1-0.085333 12.8l-194.218667 171.178666a8.533333 8.533333 0 0 1-14.165333-6.4V448c0-27.434667-25.898667-10.325333-67.370667-3.029333-44.288 7.722667-124.970667 63.018667-164.906666 92.032-6.954667 5.034667-16.170667-1.92-12.928-9.856 18.773333-45.781333 59.008-135.466667 96.981333-164.48C599.594667 280.362667 640 310.869333 640 283.434667V192.853333a8.533333 8.533333 0 0 1 14.250667-6.314666l194.218666 174.72z" fill="currentColor"/>
</symbol>`);

        // 初始化 dock 数据
        this.data[DOCK_STORAGE_NAME] = await this.loadData(DOCK_STORAGE_NAME) || {
            text: "",
            history: [],
            editorVisible: true  // 添加编辑框显示状态
        };

        // 确保 history 是数组
        if (!Array.isArray(this.data[DOCK_STORAGE_NAME].history)) {
            this.data[DOCK_STORAGE_NAME].history = [];
        }

        // 添加顶部栏按钮
        const topBarElement = this.addTopBar({
            icon: "iconSmallNote",
            title: this.i18n.note.title,
            position: "right",
            callback: () => {
                this.createNewNote(this.dock);
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
                this.createNewNote(this.dock);
                const { getCurrentWindow } = window.require('@electron/remote');
                const win = getCurrentWindow();
                win.show(); 
                win.focus(); 
            }

        });

        // 初始化归档数据
        this.data[PluginSample.ARCHIVE_STORAGE_NAME] = await this.loadData(PluginSample.ARCHIVE_STORAGE_NAME) || {
            history: []
        };


        // 创建 dock 时读取保存的位置
        this.dock = this.addDock({
            config: {
                position: "RightTop",
                size: { width: 300, height: 0 },
                icon: "iconSmallNote",
                hotkey: '⇧⌘U',
                title: this.i18n.note.title,
            },
            data: {
                text: "",
            },
            type: DOCK_TYPE,
            init: (dock) => {
                this.dock = dock;
                const renderDock = (showAll: boolean = false) => {
                    if (this.isMobile) {
                        dock.element.innerHTML = `
                            <div class="toolbar toolbar--border toolbar--dark" style="height: 100%;">
                                <svg class="toolbar__icon"><use xlink:href="#iconSmallNote"></use></svg>
                                <div class="toolbar__text">${this.i18n.note.title}</div>
                    </div>
                            <div class="fn__flex-1 plugin-sample__custom-dock fn__flex-column">
                                <div style="min-height: 200px; flex-shrink: 0; margin: 0 8px;  width: 95%; display: ${this.data[DOCK_STORAGE_NAME].editorVisible ? 'block' : 'none'};">
                                    ${this.getEditorTemplate()}
                                </div>
                                <div class="fn__flex-1 history-list" style="overflow: auto;margin: 0 8px;  width: 95%;">
                                    ${this.renderHistory(this.data[DOCK_STORAGE_NAME]?.history || [], showAll)}
                    </div>
                    </div>`;
                    } else {
                        dock.element.innerHTML = `
                            <div class="fn__flex-1 fn__flex-column" style="height: 100%;">

                                <div class="fn__flex-1 plugin-sample__custom-dock fn__flex-column">
                                                        <div class="block__icons">
                                    <div class="block__logo">
                                        <svg class="block__logoicon"><use xlink:href="#iconSmallNote"></use></svg>
                                        ${this.i18n.note.title}
                                    </div>
                                    <span class="fn__flex-1 fn__space"></span>
                                    <span data-type="toggle-editor" class="block__icon b3-tooltips b3-tooltips__sw" 
                                        aria-label="${this.data[DOCK_STORAGE_NAME].editorVisible ? this.i18n.note.hideEditor : this.i18n.note.showEditor}">
                                        <svg class="block__logoicon">
                                            <use xlink:href="${this.data[DOCK_STORAGE_NAME].editorVisible ? '#iconPreview' : '#iconEdit'}"></use>
                                        </svg>
                                    </span>
                                    <span data-type="refresh" class="block__icon b3-tooltips b3-tooltips__sw" aria-label="Refresh">
                                        <svg class="block__logoicon"><use xlink:href="#iconRefresh"></use></svg>
                                    </span>
                                    <span data-type="export" class="block__icon b3-tooltips b3-tooltips__sw" aria-label="Export">
                                        <svg class="block__logoicon"><use xlink:href="#iconExportNew"></use></svg>
                                    </span>
                                    <span data-type="min" class="block__icon b3-tooltips b3-tooltips__sw" aria-label="Min ${adaptHotkey("⌘W")}">
                                        <svg class="block__logoicon"><use xlink:href="#iconMin"></use></svg>
                                    </span>
                                </div>
                                    <div style="min-height: 200px; flex-shrink: 0; margin: 0 8px;  width: 95%; display: ${this.data[DOCK_STORAGE_NAME].editorVisible ? 'block' : 'none'};">
                                        ${this.getEditorTemplate()}
                                    </div>
                                    <div class="toolbar-container" style="border-bottom: 1px solid var(--b3-border-color); flex-shrink: 0; width:95%;">
                                        <div class="fn__flex fn__flex-center" style="padding: 8px;">
                                            <div style="color: var(--b3-theme-on-surface-light); font-size: 12px;">
                                                ${this.i18n.note.total.replace('${count}', (this.data[DOCK_STORAGE_NAME]?.history || []).length.toString())}
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
                                                    <button class="b3-button b3-button--text batch-copy-btn b3-tooltips b3-tooltips__n" style="padding: 2px 2px; font-size: 12px;" aria-label="${this.i18n.note.copy}">
                                                        <svg class="b3-button__icon" style="height: 14px; width: 14px;">
                                                            <use xlink:href="#iconCopy"></use>
                                                        </svg>
                                                    </button>
                                                    <button class="b3-button b3-button--text batch-tag-btn b3-tooltips b3-tooltips__n" style="padding: 2px 2px; font-size: 12px;" aria-label="${this.i18n.note.tag}">
                                                        <svg class="b3-button__icon" style="height: 14px; width: 14px;">
                                                            <use xlink:href="#iconTags"></use>
                                                        </svg>
                                                    </button>
                                                    <button class="b3-button b3-button--text batch-archive-btn b3-tooltips b3-tooltips__n" style="padding: 2px 2px; font-size: 12px;" aria-label="${this.showArchived ? this.i18n.note.unarchive : this.i18n.note.archive}">
                                                        <svg class="b3-button__icon" style="height: 14px; width: 14px;">
                                                            <use xlink:href="#iconArchive"></use>
                                                        </svg>
                                                    </button>
                                                    <button class="b3-button b3-button--text batch-delete-btn b3-tooltips b3-tooltips__n" style="padding: 2px 2px; font-size: 12px;" aria-label="${this.i18n.note.delete}">
                                                        <svg class="b3-button__icon" style="height: 14px; width: 14px;">
                                                            <use xlink:href="#iconTrashcan"></use>
                                                        </svg>
                                                    </button>
                                                    <button class="b3-button b3-button--text batch-merge-btn b3-tooltips b3-tooltips__n" style="padding: 2px 2px; font-size: 12px;" aria-label="${this.i18n.note.merge}">
                                                        <svg class="b3-button__icon" style="height: 14px; width: 14px;">
                                                            <use xlink:href="#iconMerge"></use>
                                                        </svg>
                                                    </button>
                                                </div>
                                                <div class="fn__flex" style="gap: 8px;">
                                                    <button class="b3-button b3-button--outline select-all-btn" style="padding: 4px 8px; font-size: 12px;">
                                                        ${this.i18n.note.selectAll}
                                                    </button>
                                                    <button class="b3-button b3-button--cancel cancel-select-btn" style="padding: 4px 8px; font-size: 12px;">
                                                        ${this.i18n.note.cancelSelect}
                                                    </button>
                                                </div>
                                            </div>
                                            <!-- 常规工具栏 -->
                                            <div class="normal-toolbar fn__flex" style="gap: 8px;">
                                                <div class="search-container fn__flex">
                                                    <div class="search-wrapper" style="position: relative;">
                                                        <input type="text" 
                                                            class="search-input b3-text-field" 
                                                            placeholder="${this.i18n.note.search}" 
                                                            style="width: 0; padding: 4px 8px; transition: all 0.3s ease; opacity: 0;">
                                                        <button class="search-btn" style="position: absolute; right: 0; top: 0; border: none; background: none; padding: 4px; cursor: pointer;">
                                                            <svg class="b3-button__icon" style="height: 16px; width: 16px; color: var(--b3-theme-primary);">
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
                                                        <div style="position: absolute; top: 0; right: 0; width: 6px; height: 6px; border-radius: 50%; background-color: var(--b3-theme-primary);"></div>
                                                    ` : ''}
                                                </button>
                                                <button class="sort-btn" 
                                                    style="border: none; background: none; padding: 4px; cursor: pointer;" 
                                                    title="${this.i18n.note.sort}">
                                                    <svg class="b3-button__icon" style="height: 16px; width: 16px; color: var(--b3-theme-primary);">
                                                        <use xlink:href="#iconSort"></use>
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                        <div class="filter-panel" style="display: none; padding: 8px; border-top: 1px solid var(--b3-border-color);">
                                            <div style="font-size: 12px; color: var(--b3-theme-on-surface-light); margin-bottom: 8px;">
                                                ${this.i18n.note.tagFilter}
                                            </div>
                                            <div class="filter-tags" style="display: flex; flex-wrap: wrap; gap: 8px;">
                                                ${Array.from(new Set(this.data[DOCK_STORAGE_NAME]?.history
                            ?.flatMap(item => item.tags || []) || []))
                                .map(tag => {
                                    const isSelected = this.selectedTags.includes(tag);
                                    return `
                                                            <span class="b3-chip b3-chip--middle filter-tag b3-tooltips b3-tooltips__n" 
                                                                style="cursor: pointer; 
                                                                    background-color: ${isSelected ? 'var(--b3-theme-primary)' : 'var(--b3-theme-surface)'};
                                                                    color: ${isSelected ? 'var(--b3-theme-on-primary)' : 'var(--b3-theme-on-surface)'};
                                                                    border: 1px solid ${isSelected ? 'var(--b3-theme-primary)' : 'var(--b3-border-color)'};
                                                                    transition: all 0.2s ease;" 
                                                                data-tag="${tag}"
                                                                aria-label="${tag}"
                                                                data-selected="${isSelected}">
                                                                <span class="b3-chip__content" style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${tag}</span>
                                                                <span class="tag-count" style="margin-left: 4px; font-size: 10px; opacity: 0.7;">
                                                                    ${this.data[DOCK_STORAGE_NAME].history.filter(item => item.tags?.includes(tag)).length}
                                                                </span>
                                                            </span>
                                                        `;
                                }).join('')}
                                            </div>
                                        </div>
                                    </div>
                                    <div class="fn__flex-1 history-list" style="overflow: auto; margin: 0 8px; width: 95%;">
                                        ${this.renderHistory(this.data[DOCK_STORAGE_NAME]?.history || [], showAll)}
                                    </div>
                    </div>`;
                    }

                    // 绑定事件监听器
                    const textarea = dock.element.querySelector('textarea');
                    if (textarea) {
                        // 添加快捷键保存功能和待办转换功能
                        textarea.addEventListener('keydown', async (e) => {
                            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                                e.preventDefault();
                                if (textarea.value.trim()) {
                                    const tags = Array.from(dock.element.querySelectorAll('.tag-item'))
                                        .map(tag => tag.getAttribute('data-tag'));
                                    await this.saveContent(dock, textarea.value, tags);
                                    // showMessage(this.i18n.note.saveSuccess);
                                    textarea.value = '';
                                    dock.data.text = '';
                                    // 清空标签
                                    dock.element.querySelector('.tags-list').innerHTML = '';
                                    dock.renderDock(false);
                                }
                            }
                        });

                        // 实时保存输入内容
                        textarea.oninput = (e) => {
                            dock.data.text = (e.target as HTMLTextAreaElement).value;
                        };
                    }

                    // 修改标签输入相关的 HTML 和事件处理
                    this.setupTagsFeature(dock.element);

                    // 修改保存按钮的处理逻辑
                    dock.element.querySelectorAll('button, .block__icon').forEach(button => {
                        const type = button.getAttribute('data-type');
                        if (type) {
                            button.onclick = async () => {
                                switch (type) {
                                    case 'refresh':
                                        // 重新加载数据
                                        this.data[DOCK_STORAGE_NAME] = await this.loadData(DOCK_STORAGE_NAME) || {
                                            text: '',
                                            history: []
                                        };
                                        // 重新渲染
                                        renderDock(false);
                                        showMessage('已刷新');
                                        break;
                                    case 'save':
                                        if (textarea.value.trim()) {
                                            const tags = Array.from(dock.element.querySelectorAll('.tag-item')).map(tag =>
                                                tag.getAttribute('data-tag')
                                            );
                                            await this.saveContent(dock, textarea.value, tags);
                                            showMessage(this.i18n.note.saveSuccess);
                                            textarea.value = '';
                                            dock.data.text = '';
                                            // 清空标签
                                            dock.element.querySelector('.tags-list').innerHTML = '';
                                            renderDock();
                                        }
                                        break;
                                    case 'clear':
                                        textarea.value = '';
                                        dock.data.text = '';
                                        showMessage('内容已清空');
                                        break;
                                    case 'export':
                                        this.showExportDialog();
                                        break;
                                    case 'toggle-editor':
                                        const editorContainer = dock.element.querySelector('[style*="min-height: 200px"]');
                                        if (editorContainer) {
                                            const isVisible = editorContainer.style.display !== 'none';
                                            editorContainer.style.display = isVisible ? 'none' : 'block';

                                            // 保存状态
                                            this.data[DOCK_STORAGE_NAME].editorVisible = !isVisible;
                                            await this.saveData(DOCK_STORAGE_NAME, this.data[DOCK_STORAGE_NAME]);

                                            // 更新按钮图标和提示文本
                                            const icon = button.querySelector('use');
                                            if (icon) {
                                                icon.setAttribute('xlink:href', !isVisible ? '#iconPreview' : '#iconEdit');
                                            }
                                            button.setAttribute('aria-label', !isVisible ? this.i18n.note.hideEditor : this.i18n.note.showEditor);
                                        }
                                        break;
                                }
                            };
                        }
                    });

                    // 处理加载更多按钮点击事件
                    const loadMoreBtn = dock.element.querySelector('.load-more-btn');
                    if (loadMoreBtn) {
                        loadMoreBtn.onclick = () => {
                            this.currentDisplayCount += ITEMS_PER_PAGE;
                            renderDock(true);
                        };
                    }

                    // 监听历史记录点击事件
                    const historyList = dock.element.querySelector('.history-list');
                    if (historyList) {
                        this.setupHistoryListEvents(historyList, renderDock, showAll);
                    }

                    // 设置搜索功能
                    this.setupSearchFeature(dock.element);

                    // 设置排序功能
                    this.setupSortFeature(dock.element, renderDock);

                    // 设置标签过滤功能
                    this.setupFilterFeature(dock.element, renderDock);

                    // 设置导出功能
                    this.setupExportFeature(dock.element);
                };

                // 将 renderDock 函数添加到 dock 对象上
                dock.renderDock = renderDock;

                // 初始渲染时应用当前排序
                if (this.data[DOCK_STORAGE_NAME]?.history) {
                    this.data[DOCK_STORAGE_NAME].history.sort((a, b) => {
                        return this.isDescending ?
                            b.timestamp - a.timestamp :
                            a.timestamp - b.timestamp;
                    });
                }

                // 初始渲染
                renderDock(false);
            },
            destroy() {
                console.log("destroy dock:", DOCK_TYPE);
            }
        });

        console.log(this.i18n.helloPlugin);

        // 在 onload 方法中添加快捷键命令
        this.addCommand({
            langKey: "openTagPanel",
            hotkey: "⌃⌥K",
            callback: () => {
                const addTagBtn = document.querySelector('.add-tag-btn');
                if (addTagBtn) {
                    addTagBtn.click();
                    setTimeout(() => {
                        const tagInput = document.querySelector('.tag-input') as HTMLInputElement;
                        if (tagInput) {
                            tagInput.focus();
                        }
                    }, 100);
                }
            }
        });

        // 添加 Markdown 列表样式
        const style = document.createElement('style');
        style.textContent = `
            .markdown-content ul {
                list-style-type: disc;
                padding-left: 2em;
                margin: 4px 0;
            }
            .markdown-content ol {
                list-style-type: decimal;
                padding-left: 2em;
                margin: 4px 0;
            }
            .markdown-content li {
                margin: 2px 0;
            }
            .markdown-content li > ul,
            .markdown-content li > ol {
                margin: 2px 0;
            }
            .markdown-content li p {
                margin: 0;
            }
            
            /* 代码块样式 */
            .markdown-content pre {
                margin: 8px 0;
                padding: 0;
                background-color: var(--b3-theme-surface);
                border-radius: 4px;
                overflow: hidden;
            }
            
            .markdown-content pre > code {
                display: block;
                padding: 16px;
                overflow-x: auto;
                font-family: 'JetBrainsMono-Regular', 'Consolas', monospace;
                font-size: 90%;
                line-height: 1.5;
                background-color: var(--b3-theme-surface);
                color: var(--b3-theme-on-surface);
                border: 1px solid var(--b3-border-color);
                border-radius: 4px;
            }
            
            /* 行内代码样式 */
            .markdown-content code:not(pre > code) {
                padding: 2px 4px;
                margin: 0 2px;
                font-family: 'JetBrainsMono-Regular', 'Consolas', monospace;
                font-size: 90%;
                background-color: var(--b3-theme-surface);
                color: var(--b3-theme-on-surface);
                border: 1px solid var(--b3-border-color);
                border-radius: 4px;
            }

            /* 任务列表样式 */
            .markdown-content .task-list-item {
                list-style-type: none;
                padding-left: 0.5em;
                margin: 4px 0;
            }
            
            .markdown-content .task-list-item-checkbox {
                margin-right: 0.5em;
                vertical-align: middle;
            }
        `;
        document.head.appendChild(style);
    }

    async onLayoutReady() {
        let tabDiv = document.createElement("div");
        new HelloExample({
            target: tabDiv,
            props: {
                app: this.app,
            }
        });
        this.customTab = this.addTab({
            type: TAB_TYPE,
            init() {
                this.element.appendChild(tabDiv);
                console.log(this.element);
            },
            beforeDestroy() {
                console.log("before destroy tab:", TAB_TYPE);
            },
            destroy() {
                console.log("destroy tab:", TAB_TYPE);
            }
        });

        // 加载小记数据
        const savedData = await this.loadData(DOCK_STORAGE_NAME);
        if (savedData) {
            this.data[DOCK_STORAGE_NAME] = savedData;
            // 如果 dock 已经初始化，重新渲染
            if (this.dock?.renderDock) {
                this.dock.renderDock(false);
            }
        }
    }

    async onunload() {
        console.log(this.i18n.byePlugin);
    }

    uninstall() {
        console.log("uninstall");
    }

    async updateCards(options: ICardData) {
        options.cards.sort((a: ICard, b: ICard) => {
            if (a.blockID < b.blockID) {
                return -1;
            }
            if (a.blockID > b.blockID) {
                return 1;
            }
            return 0;
        });
        return options;
    }

    /**
     * A custom setting pannel provided by svelte
     */
    openDIYSetting(): void {
        let dialog = new Dialog({
            title: "SettingPannel",
            content: `<div id="SettingPanel" style="height: 100%;"></div>`,
            width: "800px",
            destroyCallback: (options) => {
                console.log("destroyCallback", options);
                //You'd better destroy the component when the dialog is closed
                pannel.$destroy();
            }
        });
        let pannel = new SettingExample({
            target: dialog.element.querySelector("#SettingPanel"),
        });
    }

    private eventBusPaste(event: any) {
        // 如果需异步处理请调用 preventDefault， 否则会进行默认处理
        event.preventDefault();
        // 如果使用了 preventDefault，必须调用 resolve，否则程序会卡死
        event.detail.resolve({
            textPlain: event.detail.textPlain.trim(),
        });
    }

    private eventBusLog({ detail }: any) {
        console.log(detail);
    }

    private blockIconEvent({ detail }: any) {
        detail.menu.addItem({
            iconHTML: "",
            label: this.i18n.removeSpace,
            click: () => {
                const doOperations: IOperation[] = [];
                detail.blockElements.forEach((item: HTMLElement) => {
                    const editElement = item.querySelector('[contenteditable="true"]');
                    if (editElement) {
                        editElement.textContent = editElement.textContent.replace(/ /g, "");
                        doOperations.push({
                            id: item.dataset.nodeId,
                            data: item.outerHTML,
                            action: "update"
                        });
                    }
                });
                detail.protyle.getInstance().transaction(doOperations);
            }
        });
    }

    private showDialog() {
        // let dialog = new Dialog({
        //     title: `SiYuan ${Constants.SIYUAN_VERSION}`,
        //     content: `<div id="helloPanel" class="b3-dialog__content"></div>`,
        //     width: this.isMobile ? "92vw" : "720px",
        //     destroyCallback() {
        //         // hello.$destroy();
        //     },
        // });
        // new HelloExample({
        //     target: dialog.element.querySelector("#helloPanel"),
        //     props: {
        //         app: this.app,
        //     }
        // });
        svelteDialog({
            title: `SiYuan ${Constants.SIYUAN_VERSION}`,
            width: this.isMobile ? "92vw" : "720px",
            constructor: (container: HTMLElement) => {
                return new HelloExample({
                    target: container,
                    props: {
                        app: this.app,
                    }
                });
            }
        });
    }

    private addMenu(rect?: DOMRect) {
        const menu = new Menu("topBarSample", () => {
            console.log(this.i18n.byeMenu);
        });
        menu.addItem({
            icon: "iconInfo",
            label: "Dialog(open help first)",
            accelerator: this.commands[0].customHotkey,
            click: () => {
                this.showDialog();
            }
        });
        if (!this.isMobile) {
            menu.addItem({
                icon: "iconFace",
                label: "Open Custom Tab",
                click: () => {
                    const tab = openTab({
                        app: this.app,
                        custom: {
                            icon: "iconFace",
                            title: "Custom Tab",
                            data: {
                                text: "This is my custom tab",
                            },
                            id: this.name + TAB_TYPE
                        },
                    });
                    console.log(tab);
                }
            });
            menu.addItem({
                icon: "iconImage",
                label: "Open Asset Tab(open help first)",
                click: () => {
                    const tab = openTab({
                        app: this.app,
                        asset: {
                            path: "assets/paragraph-20210512165953-ag1nib4.svg"
                        }
                    });
                    console.log(tab);
                }
            });
            menu.addItem({
                icon: "iconFile",
                label: "Open Doc Tab(open help first)",
                click: async () => {
                    const tab = await openTab({
                        app: this.app,
                        doc: {
                            id: "20200812220555-lj3enxa",
                        }
                    });
                    console.log(tab);
                }
            });
            menu.addItem({
                icon: "iconSearch",
                label: "Open Search Tab",
                click: () => {
                    const tab = openTab({
                        app: this.app,
                        search: {
                            k: "SiYuan"
                        }
                    });
                    console.log(tab);
                }
            });
            menu.addItem({
                icon: "iconRiffCard",
                label: "Open Card Tab",
                click: () => {
                    const tab = openTab({
                        app: this.app,
                        card: {
                            type: "all"
                        }
                    });
                    console.log(tab);
                }
            });
            menu.addItem({
                icon: "iconLayout",
                label: "Open Float Layer(open help first)",
                click: () => {
                    this.addFloatLayer({
                        ids: ["20210428212840-8rqwn5o", "20201225220955-l154bn4"],
                        defIds: ["20230415111858-vgohvf3", "20200813131152-0wk5akh"],
                        x: window.innerWidth - 768 - 120,
                        y: 32
                    });
                }
            });
            menu.addItem({
                icon: "iconOpenWindow",
                label: "Open Doc Window(open help first)",
                click: () => {
                    openWindow({
                        doc: { id: "20200812220555-lj3enxa" }
                    });
                }
            });
        } else {
            menu.addItem({
                icon: "iconFile",
                label: "Open Doc(open help first)",
                click: () => {
                    openMobileFileById(this.app, "20200812220555-lj3enxa");
                }
            });
        }
        menu.addItem({
            icon: "iconLock",
            label: "Lockscreen",
            click: () => {
                lockScreen(this.app);
            }
        });
        menu.addItem({
            icon: "iconScrollHoriz",
            label: "Event Bus",
            type: "submenu",
            submenu: [{
                icon: "iconSelect",
                label: "On ws-main",
                click: () => {
                    this.eventBus.on("ws-main", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off ws-main",
                click: () => {
                    this.eventBus.off("ws-main", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On click-blockicon",
                click: () => {
                    this.eventBus.on("click-blockicon", this.blockIconEventBindThis);
                }
            }, {
                icon: "iconClose",
                label: "Off click-blockicon",
                click: () => {
                    this.eventBus.off("click-blockicon", this.blockIconEventBindThis);
                }
            }, {
                icon: "iconSelect",
                label: "On click-pdf",
                click: () => {
                    this.eventBus.on("click-pdf", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off click-pdf",
                click: () => {
                    this.eventBus.off("click-pdf", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On click-editorcontent",
                click: () => {
                    this.eventBus.on("click-editorcontent", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off click-editorcontent",
                click: () => {
                    this.eventBus.off("click-editorcontent", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On click-editortitleicon",
                click: () => {
                    this.eventBus.on("click-editortitleicon", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off click-editortitleicon",
                click: () => {
                    this.eventBus.off("click-editortitleicon", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On click-flashcard-action",
                click: () => {
                    this.eventBus.on("click-flashcard-action", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off click-flashcard-action",
                click: () => {
                    this.eventBus.off("click-flashcard-action", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On open-noneditableblock",
                click: () => {
                    this.eventBus.on("open-noneditableblock", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off open-noneditableblock",
                click: () => {
                    this.eventBus.off("open-noneditableblock", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On loaded-protyle-static",
                click: () => {
                    this.eventBus.on("loaded-protyle-static", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off loaded-protyle-static",
                click: () => {
                    this.eventBus.off("loaded-protyle-static", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On loaded-protyle-dynamic",
                click: () => {
                    this.eventBus.on("loaded-protyle-dynamic", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off loaded-protyle-dynamic",
                click: () => {
                    this.eventBus.off("loaded-protyle-dynamic", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On switch-protyle",
                click: () => {
                    this.eventBus.on("switch-protyle", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off switch-protyle",
                click: () => {
                    this.eventBus.off("switch-protyle", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On destroy-protyle",
                click: () => {
                    this.eventBus.on("destroy-protyle", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off destroy-protyle",
                click: () => {
                    this.eventBus.off("destroy-protyle", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On open-menu-doctree",
                click: () => {
                    this.eventBus.on("open-menu-doctree", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off open-menu-doctree",
                click: () => {
                    this.eventBus.off("open-menu-doctree", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On open-menu-blockref",
                click: () => {
                    this.eventBus.on("open-menu-blockref", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off open-menu-blockref",
                click: () => {
                    this.eventBus.off("open-menu-blockref", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On open-menu-fileannotationref",
                click: () => {
                    this.eventBus.on("open-menu-fileannotationref", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off open-menu-fileannotationref",
                click: () => {
                    this.eventBus.off("open-menu-fileannotationref", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On open-menu-tag",
                click: () => {
                    this.eventBus.on("open-menu-tag", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off open-menu-tag",
                click: () => {
                    this.eventBus.off("open-menu-tag", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On open-menu-link",
                click: () => {
                    this.eventBus.on("open-menu-link", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off open-menu-link",
                click: () => {
                    this.eventBus.off("open-menu-link", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On open-menu-image",
                click: () => {
                    this.eventBus.on("open-menu-image", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off open-menu-image",
                click: () => {
                    this.eventBus.off("open-menu-image", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On open-menu-av",
                click: () => {
                    this.eventBus.on("open-menu-av", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off open-menu-av",
                click: () => {
                    this.eventBus.off("open-menu-av", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On open-menu-content",
                click: () => {
                    this.eventBus.on("open-menu-content", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off open-menu-content",
                click: () => {
                    this.eventBus.off("open-menu-content", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On open-menu-breadcrumbmore",
                click: () => {
                    this.eventBus.on("open-menu-breadcrumbmore", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off open-menu-breadcrumbmore",
                click: () => {
                    this.eventBus.off("open-menu-breadcrumbmore", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On open-menu-inbox",
                click: () => {
                    this.eventBus.on("open-menu-inbox", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off open-menu-inbox",
                click: () => {
                    this.eventBus.off("open-menu-inbox", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On input-search",
                click: () => {
                    this.eventBus.on("input-search", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off input-search",
                click: () => {
                    this.eventBus.off("input-search", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On paste",
                click: () => {
                    this.eventBus.on("paste", this.eventBusPaste);
                }
            }, {
                icon: "iconClose",
                label: "Off paste",
                click: () => {
                    this.eventBus.off("paste", this.eventBusPaste);
                }
            }, {
                icon: "iconSelect",
                label: "On open-siyuan-url-plugin",
                click: () => {
                    this.eventBus.on("open-siyuan-url-plugin", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off open-siyuan-url-plugin",
                click: () => {
                    this.eventBus.off("open-siyuan-url-plugin", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On open-siyuan-url-block",
                click: () => {
                    this.eventBus.on("open-siyuan-url-block", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off open-siyuan-url-block",
                click: () => {
                    this.eventBus.off("open-siyuan-url-block", this.eventBusLog);
                }
            }]
        });
        menu.addSeparator();
        menu.addItem({
            icon: "iconSettings",
            label: "Official Setting Dialog",
            click: () => {
                this.openSetting();
            }
        });
        menu.addItem({
            icon: "iconSettings",
            label: "A custom setting dialog (by svelte)",
            click: () => {
                this.openDIYSetting();
            }
        });
        menu.addItem({
            icon: "iconSparkles",
            label: this.data[STORAGE_NAME].readonlyText || "Readonly",
            type: "readonly",
        });
        if (this.isMobile) {
            menu.fullscreen();
        } else {
            menu.open({
                x: rect.right,
                y: rect.bottom,
                isLeft: true,
            });
        }
    }

    // 渲染历史记录列表
    private renderHistory(history: Array<{ text: string, timestamp: number, isPinned?: boolean, tags?: string[] }> = [], showAll: boolean = false) {
        // 根据当前模式选择显示的数据
        const sourceData = this.showArchived ?
            this.data[PluginSample.ARCHIVE_STORAGE_NAME].history :
            this.data[DOCK_STORAGE_NAME].history;

        // 首先根据标签过滤历史记录
        const filteredHistory = this.selectedTags.length > 0
            ? sourceData.filter(item =>
                this.selectedTags.some(tag => item.tags?.includes(tag))
            )
            : sourceData;

        // 分离置顶和非置顶记录
        const pinnedHistory = filteredHistory.filter(item => item.isPinned);
        const unpinnedHistory = filteredHistory.filter(item => !item.isPinned);

        // 渲染历史记录内容
        let historyHtml = '';

        // 添加归档状态指示
        if (this.showArchived) {
            historyHtml += `
                <div class="fn__flex-center" style="padding: 8px; background: var(--b3-theme-surface); color: var(--b3-theme-on-surface); font-size: 12px;">
                    <svg class="b3-button__icon" style="height: 14px; width: 14px; margin-right: 4px;">
                        <use xlink:href="#iconArchive"></use>
                    </svg>
                    ${this.i18n.note.archivedView}
                </div>`;
        }

        // 渲染置顶记录
        if (pinnedHistory.length > 0) {
            historyHtml += this.renderPinnedHistory(pinnedHistory);
        }

        // 渲染非置顶记录
        const displayHistory = showAll ?
            unpinnedHistory.slice(0, this.currentDisplayCount) :
            unpinnedHistory.slice(0, ITEMS_PER_PAGE);

        if (displayHistory.length > 0) {
            historyHtml += this.renderUnpinnedHistory(displayHistory, pinnedHistory.length > 0);
        }

        // 添加加载更多按钮
        if (unpinnedHistory.length > displayHistory.length) {
            historyHtml += this.renderLoadMoreButton(displayHistory.length, unpinnedHistory.length);
        } else if (unpinnedHistory.length > 0) {
            historyHtml += this.renderNoMoreItems();
        }

        // 返回完整的 HTML
        return `
            <div class="history-content">
                ${historyHtml}
            </div>`;
    }

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
            content = content.replace(/<p>\[\](.*?)<\/p>/g, '<p>[ ]$1</p>');
            
            // 然后处理任务列表
            return content.replace(
                /<p>(\[ \]|\[x\])(.*?)<\/p>/g, 
                (match, checkbox, text) => {
                    const isChecked = checkbox === '[x]';
                    const timestamp = item.timestamp;
                    return `
                        <div class="task-list-item" data-timestamp="${timestamp}">
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
                <div class="batch-checkbox fn__none" style="padding-top: 2px;">
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
    private async createNewNote(dock: any) {
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
                            await this.saveContent(dock, text, tags);
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
            });
        } catch (error) {
            console.error('Error creating new note:', error);
            return false;
        }
    }

    // 编辑历史记录
    private async editHistoryItem(dock: any, timestamp: number, oldText: string) {
        try {
            // 根据当前状态选择正确的数据源
            const storageKey = this.showArchived ? PluginSample.ARCHIVE_STORAGE_NAME : DOCK_STORAGE_NAME;

            // 获取当前记录项
            const currentItem = this.data[storageKey].history.find(
                item => item.timestamp === timestamp
            );

            return new Promise((resolve) => {
                const dialog = new Dialog({
                    title: this.i18n.note.edit,
                    content: `
                        <div class="b3-dialog__content" style="box-sizing: border-box; padding: 16px;">
                            ${this.getEditorTemplate(oldText)}
                        </div>`,
                    width: "520px",
                    height: "320px",
                    transparent: false,
                    disableClose: false,
                    disableAnimation: false,
                    destroyCallback: () => {
                        resolve(false);
                    }
                });

                // 绑定保存按钮事件
                const saveBtn = dialog.element.querySelector('[data-type="save"]');
                const textarea = dialog.element.querySelector('textarea');
                if (saveBtn && textarea) {
                    saveBtn.onclick = async () => {
                        const newText = textarea.value;
                        if (newText.trim()) {
                            const tags = Array.from(dialog.element.querySelectorAll('.tag-item'))
                                .map(tag => tag.getAttribute('data-tag'));

                            const index = this.data[storageKey].history.findIndex(
                                item => item.timestamp === timestamp
                            );
                            if (index !== -1) {
                                this.data[storageKey].history[index].text = newText;
                                this.data[storageKey].history[index].tags = tags;
                                await this.saveData(storageKey, this.data[storageKey]);
                                showMessage(this.i18n.note.saveSuccess);
                                dialog.destroy();
                                resolve(true);
                                dock.renderDock(false);
                                return;
                            }
                        }
                        resolve(false);
                    };
                }

                // 设置标签功能
                this.setupTagsFeature(dialog.element);

                // 添加已有标签
                if (currentItem?.tags?.length) {
                    const tagsList = dialog.element.querySelector('.tags-list');
                    currentItem.tags.forEach(tagText => {
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
            });
        } catch (error) {
            console.error('Error editing history item:', error);
            return false;
        }
    }

    // 删除历史记录
    private async deleteHistoryItem(dock: any, timestamp: number) {
        try {
            // 找到并删除指定的历史记录
            this.data[DOCK_STORAGE_NAME].history = this.data[DOCK_STORAGE_NAME].history.filter(
                item => item.timestamp !== timestamp
            );

            // 立即保存数据
            await this.saveData(DOCK_STORAGE_NAME, this.data[DOCK_STORAGE_NAME]);

            // 更新视图
            if (dock.renderDock) {
                dock.renderDock(false);
            }

            return true;
        } catch (error) {
            console.error('Error deleting history item:', error);
            return false;
        }
    }

    // 保存内容并更新历史记录
    private async saveContent(dock: any, content: string, tags: string[] = []) {
        try {
            const timestamp = Date.now();
            dock.data.text = content;

            if (!this.data[DOCK_STORAGE_NAME]) {
                this.data[DOCK_STORAGE_NAME] = { text: content, history: [] };
            }
            if (!Array.isArray(this.data[DOCK_STORAGE_NAME].history)) {
                this.data[DOCK_STORAGE_NAME].history = [];
            }

            this.data[DOCK_STORAGE_NAME].history.unshift({
                text: content,
                timestamp,
                tags
            });

            // 立即保存数据
            await this.saveData(DOCK_STORAGE_NAME, this.data[DOCK_STORAGE_NAME]);

            // 更新视图
            if (dock.renderDock) {
                dock.renderDock(false);
            }
        } catch (error) {
            console.error('Error saving content:', error);
            showMessage('保存失败');
        }
    }

    // 创建编辑器模板
    private getEditorTemplate(text: string = '', placeholder: string = '在这里输入你的想法...') {
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
                        <button class="b3-button b3-button--text add-tag-btn b3-tooltips b3-tooltips__n" style="padding: 4px;" aria-label="${this.i18n.note.addTag}">
                            <svg class="b3-button__icon" style="height: 16px; width: 16px;"><use xlink:href="#iconTags"></use></svg>
                        </button>
                        <button class="b3-button b3-button--text b3-tooltips b3-tooltips__n fn__flex fn__flex-center" data-type="save" aria-label="${adaptHotkey('⌘Enter')}" style="padding: 4px 8px; gap: 4px;">
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
                const allTags = Array.from(new Set(this.data[DOCK_STORAGE_NAME]?.history
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

    // 设置历史列表事件
    private setupHistoryListEvents(historyList: HTMLElement, renderDock: (showAll: boolean) => void, showAll: boolean) {
        historyList.onclick = async (e) => {
            const target = e.target as HTMLElement;
            const moreBtn = target.closest('.more-btn') as HTMLElement;
            const copyBtn = target.closest('.copy-btn') as HTMLElement;
            const editBtn = target.closest('.edit-btn') as HTMLElement;

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
                    const text = textContainer.getAttribute('data-text') || '';
                    if (await this.editHistoryItem(this.dock, timestamp, text)) {
                        renderDock(false);
                    }
                }
            } else if (moreBtn) {
                e.stopPropagation();
                const timestamp = Number(moreBtn.getAttribute('data-timestamp'));
                const rect = moreBtn.getBoundingClientRect();

                // 获取当前记录项
                const currentItem = this.showArchived ?
                    this.data[PluginSample.ARCHIVE_STORAGE_NAME].history.find(
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
                        // 根据当前状态选择正确的数据源
                        const storageKey = this.showArchived ? PluginSample.ARCHIVE_STORAGE_NAME : DOCK_STORAGE_NAME;
                        const index = this.data[storageKey].history.findIndex(
                            i => i.timestamp === timestamp
                        );

                        if (index !== -1) {
                            // 切换置顶状态
                            this.data[storageKey].history[index].isPinned = !this.data[storageKey].history[index].isPinned;
                            await this.saveData(storageKey, this.data[storageKey]);
                            renderDock(showAll);
                        }
                    }
                });

                // 添加归档/取消归档选项
                menu.addItem({
                    icon: "iconArchive",
                    label: this.showArchived ? this.i18n.note.unarchive : this.i18n.note.archive,
                    click: async () => {
                        if (this.showArchived) {
                            // 从归档中恢复
                            const index = this.data[PluginSample.ARCHIVE_STORAGE_NAME].history.findIndex(
                                i => i.timestamp === timestamp
                            );
                            if (index !== -1) {
                                const item = this.data[PluginSample.ARCHIVE_STORAGE_NAME].history.splice(index, 1)[0];
                                this.data[DOCK_STORAGE_NAME].history.unshift(item);
                                await this.saveData(PluginSample.ARCHIVE_STORAGE_NAME, this.data[PluginSample.ARCHIVE_STORAGE_NAME]);
                                await this.saveData(DOCK_STORAGE_NAME, this.data[DOCK_STORAGE_NAME]);
                                showMessage(this.i18n.note.unarchiveSuccess);
                            }
                        } else {
                            // 使用新的归档方法
                            await this.archiveItem(timestamp, renderDock);
                        }
                        this.dock.renderDock(true);
                    }
                });

                menu.addItem({
                    icon: "iconTrashcan",
                    label: this.i18n.note.delete,
                    click: async () => {
                        confirm(this.i18n.note.delete, this.i18n.note.deleteConfirm, async () => {
                            // 根据当前状态选择正确的数据源
                            const storageKey = this.showArchived ? PluginSample.ARCHIVE_STORAGE_NAME : DOCK_STORAGE_NAME;

                            // 从对应的数据源中删除
                            const index = this.data[storageKey].history.findIndex(
                                i => i.timestamp === timestamp
                            );

                            if (index !== -1) {
                                this.data[storageKey].history.splice(index, 1);
                                await this.saveData(storageKey, this.data[storageKey]);
                                showMessage(this.i18n.note.deleteSuccess);
                                // 使用 this.dock.renderDock 而不是 renderDock
                                this.dock.renderDock(false);
                            }
                        });
                    }
                });

                menu.open({
                    x: rect.right,
                    y: rect.bottom,
                    isLeft: true,
                });
            }
        };

        // 处理展开/折叠按钮
        historyList.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const toggleBtn = target.closest('.toggle-text');
            if (toggleBtn) {
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

        // 添加批量选择相关的事件处理
        const container = historyList.closest('.fn__flex-1.plugin-sample__custom-dock');
        if (container) {
            const filterMenuBtn = container.querySelector('.filter-menu-btn');
            const batchToolbar = container.querySelector('.batch-toolbar') as HTMLElement;
            const normalToolbar = container.querySelector('.normal-toolbar') as HTMLElement;
            const checkboxes = container.querySelectorAll('.batch-checkbox') as NodeListOf<HTMLElement>;

            if (filterMenuBtn) {
                filterMenuBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const rect = filterMenuBtn.getBoundingClientRect();
                    const menu = new Menu("filterMenu");

                    // 添加批量选择选项
                    menu.addItem({
                        icon: "iconCheck",
                        label: this.i18n.note.batchSelect,
                        click: () => {
                            // 重置所有复选框为未选中状态
                            checkboxes.forEach(checkbox => {
                                checkbox.classList.remove('fn__none');
                                const input = checkbox.querySelector('input') as HTMLInputElement;
                                if (input) {
                                    input.checked = false;
                                }
                            });
                            // 重置全选按钮文本
                            if (selectAllBtn) {
                                selectAllBtn.textContent = this.i18n.note.selectAll;
                            }
                            batchToolbar.classList.remove('fn__none');
                            normalToolbar.classList.add('fn__none');
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
                                renderDock(true);
                            }
                        }, {
                            icon: this.showArchived ? "iconSelect" : "",
                            label: this.i18n.note.showArchived,
                            click: () => {
                                this.showArchived = true;
                                renderDock(true);
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
                                    this.data[PluginSample.ARCHIVE_STORAGE_NAME].history.sort((a, b) => b.timestamp - a.timestamp);
                                } else {
                                    this.data[DOCK_STORAGE_NAME].history.sort((a, b) => b.timestamp - a.timestamp);
                                }
                                renderDock(true);
                            }
                        }, {
                            icon: !this.isDescending ? "iconSelect" : "",
                            label: this.i18n.note.sortByTimeAsc,
                            click: () => {
                                this.isDescending = false;
                                // 根据当前状态选择要排序的数据源
                                if (this.showArchived) {
                                    this.data[PluginSample.ARCHIVE_STORAGE_NAME].history.sort((a, b) => a.timestamp - b.timestamp);
                                } else {
                                    this.data[DOCK_STORAGE_NAME].history.sort((a, b) => a.timestamp - b.timestamp);
                                }
                                renderDock(true);
                            }
                        }]
                    });

                    menu.open({
                        x: rect.right,
                        y: rect.bottom,
                        isLeft: true,
                    });
                });
            }

            // 批量选择相关的事件处理保持不变
            const selectAllBtn = container.querySelector('.select-all-btn') as HTMLButtonElement;
            const batchDeleteBtn = container.querySelector('.batch-delete-btn') as HTMLButtonElement;
            const cancelSelectBtn = container.querySelector('.cancel-select-btn') as HTMLButtonElement;

            if (selectAllBtn && batchDeleteBtn && cancelSelectBtn) {
                // 取消选择
                cancelSelectBtn.onclick = () => {
                    batchToolbar.classList.add('fn__none');
                    normalToolbar.classList.remove('fn__none');
                    checkboxes.forEach(checkbox => {
                        checkbox.classList.add('fn__none');
                        const input = checkbox.querySelector('input');
                        if (input) input.checked = false;
                    });
                };

                // 全选/取消全选
                selectAllBtn.onclick = () => {
                    const inputs = container.querySelectorAll('.batch-checkbox input') as NodeListOf<HTMLInputElement>;
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
                            renderDock(false);

                            showMessage(this.i18n.note.batchDeleteSuccess);
                        } catch (error) {
                            console.error('Batch delete failed:', error);
                            showMessage(this.i18n.note.batchDeleteFailed);
                        }
                    });
                };
            }

            // 添加标签过滤功能
            const filterBtn = container.querySelector('.filter-btn');
            const filterPanel = container.querySelector('.filter-panel') as HTMLElement;

            if (filterBtn) {
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
                                        renderDock(true);
                                    });
                                }
                            });
                        }
                    }
                };
            }

            // 批量复制
            const batchCopyBtn = container.querySelector('.batch-copy-btn') as HTMLButtonElement;
            if (batchCopyBtn) {
                batchCopyBtn.onclick = async () => {
                    const selectedItems = Array.from(container.querySelectorAll('.batch-checkbox input:checked'))
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
            }

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
                                    const itemsToUnarchive = this.data[PluginSample.ARCHIVE_STORAGE_NAME].history
                                        .filter(item => selectedTimestamps.includes(item.timestamp));

                                    // 从归档中移除
                                    this.data[PluginSample.ARCHIVE_STORAGE_NAME].history =
                                        this.data[PluginSample.ARCHIVE_STORAGE_NAME].history
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
                                    this.data[PluginSample.ARCHIVE_STORAGE_NAME].history.unshift(...itemsToArchive);
                                }

                                // 保存更改
                                await this.saveData(DOCK_STORAGE_NAME, this.data[DOCK_STORAGE_NAME]);
                                await this.saveData(PluginSample.ARCHIVE_STORAGE_NAME, this.data[PluginSample.ARCHIVE_STORAGE_NAME]);

                                showMessage(this.showArchived ?
                                    this.i18n.note.batchUnarchiveSuccess :
                                    this.i18n.note.batchArchiveSuccess
                                );

                                cancelSelectBtn.click(); // 操作完成后退出选择模式
                                renderDock(false);
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
                    await this.saveContent(this.dock, mergedText, mergedTags);
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
                        renderDock(false);
                    }, () => {
                        // 用户取消删除，只取消选择模式
                        cancelSelectBtn.click();
                        renderDock(false);
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
                                this.dock.renderDock(false);
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
                const searchText = searchInput.value.toLowerCase();

                if (!searchText) {
                    this.currentDisplayCount = ITEMS_PER_PAGE;
                    this.dock.renderDock(false);
                    return;
                }

                // 根据当前状态选择搜索的数据源
                const sourceData = this.showArchived ?
                    this.data[PluginSample.ARCHIVE_STORAGE_NAME].history :
                    this.data[DOCK_STORAGE_NAME].history;

                // 在选定的数据源中搜索
                const filteredHistory = sourceData.filter(item => {
                    const text = item.text.toLowerCase();
                    const tags = item.tags?.join(' ').toLowerCase() || '';
                    return text.includes(searchText) || tags.includes(searchText);
                });

                // 只更新历史记录内容部分
                const historyContent = container.querySelector('.history-content');
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
                    this.setupHistoryListEvents(historyContent, this.dock.renderDock, true);
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
    private setupSortFeature(container: HTMLElement, renderDock: (showAll: boolean) => void) {
        const sortBtn = container.querySelector('.sort-btn');
        if (sortBtn) {
            const sortIcon = sortBtn.querySelector('svg');
            if (sortIcon) {
                sortIcon.style.transform = this.isDescending ? 'rotate(0deg)' : 'rotate(180deg)';
                sortIcon.style.transition = 'transform 0.3s ease';
            }

            sortBtn.onclick = () => {
                this.isDescending = !this.isDescending;

                // 根据当前状态选择要排序的数据源
                if (this.showArchived) {
                    this.data[PluginSample.ARCHIVE_STORAGE_NAME].history.sort((a, b) =>
                        this.isDescending ? b.timestamp - a.timestamp : a.timestamp - b.timestamp
                    );
                } else {
                    this.data[DOCK_STORAGE_NAME].history.sort((a, b) =>
                        this.isDescending ? b.timestamp - a.timestamp : a.timestamp - b.timestamp
                    );
                }

                // 更新图标旋转状态
                if (sortIcon) {
                    sortIcon.style.transform = this.isDescending ? 'rotate(0deg)' : 'rotate(180deg)';
                }

                renderDock(true);
            };
        }
    }

    // 设置标签过滤功能
    private setupFilterFeature(container: HTMLElement, renderDock: (showAll: boolean) => void) {
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
            const tagUsage = this.data[DOCK_STORAGE_NAME]?.history
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

                    renderDock(true);

                    const newFilterPanel = container.querySelector('.filter-panel');
                    const newFilterBtn = container.querySelector('.filter-btn');
                    if (newFilterPanel && newFilterBtn) {
                        newFilterPanel.style.display = filterPanelDisplay;
                        newFilterBtn.style.color = filterBtnColor;
                    }
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

                    showMessage(this.i18n.note.exportSuccess);
                } catch (error) {
                    console.error('Export failed:', error);
                    showMessage('导出失败');
                }
            };
        }
    }

    private async showExportDialog() {
        // 获取所有标签
        const allTags = Array.from(new Set(this.data[DOCK_STORAGE_NAME]?.history
            ?.flatMap(item => item.tags || []) || []));

        const dialog = new Dialog({
            title: this.i18n.note.export,
            content: `
                <div class="b3-dialog__content" style="box-sizing: border-box; padding: 16px;">
                    <div style="margin-bottom: 16px;">
                        <div style="margin-bottom: 8px; font-weight: 500;">${this.i18n.note.exportFilter}</div>
                        <div class="fn__flex-column" style="gap: 16px;">
                            <div>
                                <div style="margin-bottom: 4px; font-size: 12px;">${this.i18n.note.dateRange}</div>
                                <div class="fn__flex" style="gap: 8px;">
                                    <input type="date" class="b3-text-field fn__flex-1 export-start-date">
                                    <span style="line-height: 28px;">-</span>
                                    <input type="date" class="b3-text-field fn__flex-1 export-end-date">
                                </div>
                            </div>
                            <div>
                                <div style="margin-bottom: 4px; font-size: 12px;">${this.i18n.note.selectTags}</div>
                                <div class="export-tags-container" style="display: flex; flex-wrap: wrap; gap: 8px; min-height: 28px; padding: 4px 8px; border: 1px solid var(--b3-border-color); border-radius: 4px; background: var(--b3-theme-background);">
                                    ${allTags.map(tag => `
                                        <span class="b3-chip b3-chip--middle export-tag-item b3-tooltips b3-tooltips__n" 
                                            data-tag="${tag}"
                                            aria-label="${tag}"
                                            style="cursor: pointer; 
                                                background-color: var(--b3-theme-surface);
                                                color: var(--b3-theme-on-surface);
                                                border: 1px solid var(--b3-border-color);
                                                transition: all 0.2s ease;">
                                            <span class="b3-chip__content" style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                                ${tag}
                                            </span>
                                            <span class="tag-count" style="margin-left: 4px; font-size: 10px; opacity: 0.7;">
                                                ${this.data[DOCK_STORAGE_NAME].history.filter(item => item.tags?.includes(tag)).length}
                                            </span>
                                        </span>
                                    `).join('')}
                                </div>
                            </div>
                            <div>
                                <div style="margin-bottom: 4px; font-size: 12px;">${this.i18n.note.exportFormat}</div>
                                <div class="fn__flex" style="gap: 8px;">
                                    <label class="fn__flex" style="align-items: center; gap: 4px;">
                                        <input type="radio" name="export-format" value="csv" class="b3-radio" checked>
                                        <span>${this.i18n.note.formatCSV}</span>
                                    </label>
                                    <label class="fn__flex" style="align-items: center; gap: 4px;">
                                        <input type="radio" name="export-format" value="md" class="b3-radio">
                                        <span>${this.i18n.note.formatMD}</span>
                                    </label>
                                    <label class="fn__flex" style="align-items: center; gap: 4px;">
                                        <input type="radio" name="export-format" value="json" class="b3-radio">
                                        <span>${this.i18n.note.formatJSON}</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="fn__flex-column" style="gap: 8px;">
                        <label class="fn__flex" style="align-items: center; gap: 4px;">
                            <input type="checkbox" class="b3-checkbox export-pinned-only">
                            <span>${this.i18n.note.exportPinnedOnly}</span>
                        </label>
                        <label class="fn__flex" style="align-items: center; gap: 4px;">
                            <input type="checkbox" class="b3-checkbox export-include-archived">
                            <span>${this.i18n.note.exportIncludeArchived}</span>
                        </label>
                    </div>
                </div>
                <div class="b3-dialog__action">
                    <button class="b3-button b3-button--cancel">${this.i18n.cancel}</button>
                    <button class="b3-button b3-button--text" data-type="confirm">${this.i18n.note.export}</button>
                </div>`,
            width: "520px",
        });

        // 设置默认日期范围（最近一个月）
        const startDateInput = dialog.element.querySelector('.export-start-date') as HTMLInputElement;
        const endDateInput = dialog.element.querySelector('.export-end-date') as HTMLInputElement;
        const now = new Date();
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        startDateInput.value = oneMonthAgo.toISOString().split('T')[0];
        endDateInput.value = now.toISOString().split('T')[0];

        // 设置标签点击事件
        const tagItems = dialog.element.querySelectorAll('.export-tag-item');
        tagItems.forEach(tag => {
            tag.addEventListener('click', () => {
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
            });
        });

        // 绑定按钮事件
        const btns = dialog.element.querySelectorAll('.b3-button');
        btns[0].addEventListener('click', () => {
            dialog.destroy();
        });
        btns[1].addEventListener('click', () => {
            const startDate = new Date(startDateInput.value).getTime();
            const endDate = new Date(endDateInput.value).setHours(23, 59, 59, 999);
            const selectedTags = Array.from(dialog.element.querySelectorAll('.export-tag-item[data-selected="true"]'))
                .map(tag => tag.getAttribute('data-tag'));
            const pinnedOnly = (dialog.element.querySelector('.export-pinned-only') as HTMLInputElement).checked;
            const includeArchived = (dialog.element.querySelector('.export-include-archived') as HTMLInputElement).checked;

            // 合并活动记录和归档记录（如果需要）
            let allData = [...this.data[DOCK_STORAGE_NAME].history];
            if (includeArchived) {
                allData = allData.concat(this.data[PluginSample.ARCHIVE_STORAGE_NAME].history || []);
            }

            // 过滤数据
            const filteredData = allData.filter(item => {
                const matchDate = (!startDate || item.timestamp >= startDate) &&
                    (!endDate || item.timestamp <= endDate);
                const matchTags = selectedTags.length === 0 ||
                    selectedTags.some(tag => item.tags?.includes(tag));
                const matchPinned = !pinnedOnly || item.isPinned;
                return matchDate && matchTags && matchPinned;
            });

            if (filteredData.length === 0) {
                showMessage(this.i18n.note.noDataToExport);
                return;
            }

            // 获取选择的导出格式
            const format = dialog.element.querySelector('input[name="export-format"]:checked').value;

            // 导出过滤后的数据
            this.exportData(filteredData, format);
            dialog.destroy();
        });
    }

    private exportData(data: Array<{ text: string, timestamp: number, isPinned?: boolean, tags?: string[] }>, format: string) {
        try {
            let content: string;
            let filename: string;
            let mimeType: string;

            switch (format) {
                case 'md':
                    content = this.generateMarkdown(data);
                    filename = `小记导出_${new Date().toLocaleDateString()}.md`;
                    mimeType = 'text/markdown';
                    break;
                case 'json':
                    content = JSON.stringify(data, null, 2);
                    filename = `小记导出_${new Date().toLocaleDateString()}.json`;
                    mimeType = 'application/json';
                    break;
                default: // csv
                    content = this.generateCSV(data);
                    filename = `小记导出_${new Date().toLocaleDateString()}.csv`;
                    mimeType = 'text/csv;charset=utf-8';
                    break;
            }

            const blob = new Blob(['\ufeff' + content], { type: mimeType });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            showMessage(this.i18n.note.exportSuccess);
        } catch (error) {
            console.error('Export failed:', error);
            showMessage('导出失败');
        }
    }

    private generateCSV(data: Array<{ text: string, timestamp: number, isPinned?: boolean, tags?: string[] }>) {
        const headers = ['内容', '标签', '时间', '状态'];
        const rows = data.map(item => ({
            '内容': item.text,
            '标签': (item.tags || []).join(', '),
            '时间': new Date(item.timestamp).toLocaleString(),
            '状态': item.isPinned ? '已置顶' : '未置顶'
        }));

        return [
            headers.join(','),
            ...rows.map(row =>
                headers.map(header =>
                    JSON.stringify(row[header] || '')
                ).join(',')
            )
        ].join('\n');
    }

    private generateMarkdown(data: Array<{ text: string, timestamp: number, isPinned?: boolean, tags?: string[] }>) {
        return `# 小记导出
导出时间：${new Date().toLocaleString()}

${data.map(item => `## ${new Date(item.timestamp).toLocaleString()}${item.isPinned ? ' 📌' : ''}
${item.text}

${item.tags?.length ? `标签：${item.tags.map(tag => `\`${tag}\``).join(' ')}` : ''}`).join('\n\n---\n\n')}`;
    }

    // 修改归档功能的处理逻辑
    private async archiveItem(timestamp: number, renderDock: (showAll: boolean) => void) {
        // 初始化归档存储
        if (!this.data[PluginSample.ARCHIVE_STORAGE_NAME]) {
            this.data[PluginSample.ARCHIVE_STORAGE_NAME] = { history: [] };
        }

        // 找到要归档的项目
        const itemIndex = this.data[DOCK_STORAGE_NAME].history.findIndex(item => item.timestamp === timestamp);
        if (itemIndex !== -1) {
            const item = this.data[DOCK_STORAGE_NAME].history[itemIndex];

            // 取消置顶状态
            if (item.isPinned) {
                item.isPinned = false;
            }

            // 移动到归档
            this.data[PluginSample.ARCHIVE_STORAGE_NAME].history.push(item);
            this.data[DOCK_STORAGE_NAME].history.splice(itemIndex, 1);

            // 保存更改
            await this.saveData(DOCK_STORAGE_NAME, this.data[DOCK_STORAGE_NAME]);
            await this.saveData(PluginSample.ARCHIVE_STORAGE_NAME, this.data[PluginSample.ARCHIVE_STORAGE_NAME]);

            showMessage(this.i18n.note.archiveSuccess);
            renderDock(false);
        }
    }
}
