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

import { SettingUtils } from "./libs/setting-utils";
import { svelteDialog } from "./libs/dialog";

const STORAGE_NAME = "menu-config";
const TAB_TYPE = "custom_tab";
const DOCK_TYPE = "small_notes_dock";
const DOCK_STORAGE_NAME = "dock-content";
const ITEMS_PER_PAGE = 10; // 每次加载10条记录
const MAX_TEXT_LENGTH = 250; // 超过这个长度的文本会被折叠

export default class PluginSample extends Plugin {

    customTab: () => IModel;
    private isMobile: boolean;
    private blockIconEventBindThis = this.blockIconEvent.bind(this);
    private settingUtils: SettingUtils;
    private isDescending: boolean = true; // 添加排序状态属性
    private dock: any; // 添加 dock 属性
    private currentDisplayCount: number = ITEMS_PER_PAGE;
    private selectedTags: string[] = [];

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
<symbol id="iconSmallNote" viewBox="0 0 1024 1024"><path d="M525.489 551.877c26.867-40.836 125.288-187.583 162.151-219.15-47.001 111.956-139.59 227.146-194.992 336.989 102.353 34.68 148.738-6.429 205.211-54.28l-55.957-10.735c71.059-23.289 66.096-14.656 90.981-49.064 19.741-27.271 36.126-64.094 42.13-102.545l-46.244 5.751c14.758-8.592 47.618-23.683 52.834-32.103 13.959-22.5 50.621-237.738 51.045-282.476-141.319 1.304-367.1 296.536-383.434 437.633-16.435 141.855-177.9 356.214 76.274-30.031v0.011z m210.649 79.762c42.15 25.128 67.218 57.585 67.218 93.761 0 195.113-612.005 195.113-612.005 0 0-89.607 139.024-129.786 211.043-140.793-1.698 12.049-5.398 24.35-10.239 36.924-49.499 9.057-166.013 42.544-166.013 103.869 0 147.384 542.422 147.384 542.422 0 0-25.866-23.299-50.55-61.79-70.381 9.856-7.177 19.519-15.102 29.364-23.38z"/></symbol>
+       <symbol id="iconExportNew" viewBox="0 0 1024 1024">
+           <path d="M894.6 532.3c-17.5 0-31.7 14.2-31.7 31.7v251c0 23.3-19 42.3-42.3 42.3H203.7c-23.3 0-42.3-19-42.3-42.3V233.7c0-23.3 19-42.3 42.3-42.3h270.7c17.5 0 31.7-14.2 31.7-31.7S492 128 474.4 128H203.7C145.4 128 98 175.4 98 233.7V815c0 58.3 47.4 105.7 105.7 105.7h616.9c58.3 0 105.7-47.4 105.7-105.7V564c0-17.5-14.2-31.7-31.7-31.7z M253.1 688.9c98.5-93.2 197.9-237.3 373.7-228 12.4 0.7 22.1 10.4 22.1 22.9v61c-0.1 19.2 22.2 29.9 37.1 17.8l227.9-184.3c11.3-9.1 11.3-26.4-0.1-35.5L687 138.8c-14.9-12-38.1-1.4-38.2 17.7v61.8c0 11.6-7.9 20-19.3 22.6-302.5 69-379 423.6-376.4 448z"/>
+       </symbol>`);

        // 初始化 dock 数据
        this.data[DOCK_STORAGE_NAME] = await this.loadData(DOCK_STORAGE_NAME) || { 
            text: "",
            history: []
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
            callback: () => {
                this.createNewNote(this.dock);
            }
        });

        const statusIconTemp = document.createElement("template");
        statusIconTemp.innerHTML = `<div class="toolbar__item ariaLabel" aria-label="Remove plugin-sample Data">
    <svg>
        <use xlink:href="#iconTrashcan"></use>
    </svg>
</div>`;
        statusIconTemp.content.firstElementChild.addEventListener("click", () => {
            confirm("⚠️", this.i18n.confirmRemove.replace("${name}", this.name), () => {
                this.removeData(STORAGE_NAME).then(() => {
                    this.data[STORAGE_NAME] = { readonlyText: "Readonly" };
                    showMessage(`[${this.name}]: ${this.i18n.removedData}`);
                });
            });
        });
        this.addStatusBar({
            element: statusIconTemp.content.firstElementChild as HTMLElement,
        });

        // 创建 dock 时读取保存的位置
        this.dock = this.addDock({
            config: {
                position: "RightTop",
                size: { width: 300, height: 0 },
                icon: "iconSmallNote",
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
                            <div class="toolbar toolbar--border toolbar--dark">
                                <svg class="toolbar__icon"><use xlink:href="#iconSmallNote"></use></svg>
                                <div class="toolbar__text">${this.i18n.note.title}</div>
                    </div>
                            <div class="fn__flex-1 plugin-sample__custom-dock fn__flex-column">
                                <div style="min-height: 200px; flex-shrink: 0; padding: 16px;">
                                    ${this.getEditorTemplate()}
                                </div>
                                <div class="fn__flex-1 history-list" style="overflow: auto; padding: 0 16px;">
                                    ${this.renderHistory(this.data[DOCK_STORAGE_NAME]?.history || [], showAll)}
                    </div>
                    </div>`;
                } else {
                        dock.element.innerHTML = `
                            <div class="fn__flex-1 fn__flex-column">
                    <div class="block__icons">
                        <div class="block__logo">
                            <svg class="block__logoicon"><use xlink:href="#iconSmallNote"></use></svg>
                            ${this.i18n.note.title}
                        </div>
                        <span class="fn__flex-1 fn__space"></span>
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
                                <div class="fn__flex-1 plugin-sample__custom-dock fn__flex-column">
                                    <div style="min-height: 200px; flex-shrink: 0; padding: 16px;">
                                        ${this.getEditorTemplate()}
                                    </div>
                                    <div class="fn__flex-1 history-list" style="overflow: auto; padding: 0 16px;">
                                        ${this.renderHistory(this.data[DOCK_STORAGE_NAME]?.history || [], showAll)}
                                    </div>
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
                                    showMessage(this.i18n.note.saveSuccess);
                                    textarea.value = '';
                                    dock.data.text = '';
                                    // 清空标签
                                    dock.element.querySelector('.tags-list').innerHTML = '';
                                    dock.renderDock(false);
                                }
                            } else if (e.key === ' ' && textarea.value.endsWith('-')) {
                                e.preventDefault();
                                textarea.value = textarea.value.slice(0, -1) + '• ';
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
                                switch(type) {
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

        try {
            this.settingUtils.load();
        } catch (error) {
            console.error("Error loading settings storage, probably empty config json:", error);
        }


        this.protyleSlash = [{
            filter: ["insert emoji 😊", "插入表情 😊", "crbqwx"],
            html: `<div class="b3-list-item__first"><span class="b3-list-item__text">${this.i18n.insertEmoji}</span><span class="b3-list-item__meta">😊</span></div>`,
            id: "insertEmoji",
            callback(protyle: Protyle) {
                protyle.insert("😊");
            }
        }];

        this.protyleOptions = {
            toolbar: ["block-ref",
                "a",
                "|",
                "text",
                "strong",
                "em",
                "u",
                "s",
                "mark",
                "sup",
                "sub",
                "clear",
                "|",
                "code",
                "kbd",
                "tag",
                "inline-math",
                "inline-memo",
                "|",
                {
                    name: "insert-smail-emoji",
                    icon: "iconEmoji",
                    hotkey: "⇧⌘I",
                    tipPosition: "n",
                    tip: this.i18n.insertEmoji,
                    click(protyle: Protyle) {
                        protyle.insert("😊");
                    }
                }],
        };

        console.log(this.i18n.helloPlugin);
    }

    async onLayoutReady() {
        // this.loadData(STORAGE_NAME);
        this.settingUtils.load();
        console.log(`frontend: ${getFrontend()}; backend: ${getBackend()}`);

        console.log(
            "Official settings value calling example:\n" +
            this.settingUtils.get("InputArea") + "\n" +
            this.settingUtils.get("Slider") + "\n" +
            this.settingUtils.get("Select") + "\n"
        );

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
                        doc: {id: "20200812220555-lj3enxa"}
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
    private renderHistory(history: Array<{text: string, timestamp: number, isPinned?: boolean, tags?: string[]}> = [], showAll: boolean = false) {
        // 首先根据标签过滤历史记录
        const filteredHistory = this.selectedTags.length > 0 
            ? history.filter(item => 
                this.selectedTags.some(tag => item.tags?.includes(tag))
            )
            : history;

        // 分离置顶和非置顶记录
        const pinnedHistory = filteredHistory.filter(item => item.isPinned);
        const unpinnedHistory = filteredHistory.filter(item => !item.isPinned);
        
        let html = `
            <div style="border-bottom: 1px solid var(--b3-border-color);">
                <div class="fn__flex fn__flex-center" style="padding: 8px;">
                    <div style="color: var(--b3-theme-on-surface-light); font-size: 12px;">
                        ${this.i18n.note.total.replace('${count}', history.length.toString())}
                    </div>
                </div>
                <div class="fn__flex fn__flex-end" style="padding: 0 8px 8px 8px; gap: 8px;">
                    <div class="search-container fn__flex">
                        <div class="search-wrapper" style="position: relative;">
                            <input type="text" 
                                class="search-input b3-text-field" 
                                placeholder="${this.i18n.note.search}" 
                                style="width: 0; padding: 4px 8px; transition: all 0.3s ease; opacity: 0;">
                            <button class="search-btn" style="position: absolute; right: 0; top: 0; border: none; background: none; padding: 4px; cursor: pointer;">
                                <svg class="b3-button__icon" style="height: 16px; width: 16px;"><use xlink:href="#iconSearch"></use></svg>
                            </button>
                        </div>
                    </div>
                    <button class="filter-btn" 
                        style="border: none; 
                            background: none; 
                            padding: 4px; 
                            cursor: pointer;
                            color: ${this.selectedTags.length > 0 ? 'var(--b3-theme-primary)' : 'inherit'};
                            position: relative;" 
                        title="${this.i18n.note.tagFilter}">
                        <svg class="b3-button__icon" style="height: 16px; width: 16px;">
                            <use xlink:href="#iconFilter"></use>
                        </svg>
                        ${this.selectedTags.length > 0 ? `
                            <div style="position: absolute; 
                                top: 0; 
                                right: 0; 
                                width: 6px; 
                                height: 6px; 
                                border-radius: 50%; 
                                background-color: var(--b3-theme-primary);"></div>
                        ` : ''}
                    </button>
                    <button class="sort-btn" style="border: none; background: none; padding: 4px; cursor: pointer;" title="${this.i18n.note.sort}">
                        <svg class="b3-button__icon" style="height: 16px; width: 16px;"><use xlink:href="#iconSort"></use></svg>
                    </button>
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
            </div>`;

        // 渲染置顶记录
        if (pinnedHistory.length > 0) {
            html += this.renderPinnedHistory(pinnedHistory);
        }

        // 渲染非置顶记录
        const displayHistory = showAll ? 
            unpinnedHistory.slice(0, this.currentDisplayCount) : 
            unpinnedHistory.slice(0, ITEMS_PER_PAGE);

        if (displayHistory.length > 0) {
            html += this.renderUnpinnedHistory(displayHistory, pinnedHistory.length > 0);
        }

        // 添加加载更多按钮
        if (unpinnedHistory.length > displayHistory.length) {
            html += this.renderLoadMoreButton(displayHistory.length, unpinnedHistory.length);
        } else if (unpinnedHistory.length > 0) {
            html += this.renderNoMoreItems();
        }

        return html;
    }

    // 渲染置顶记录
    private renderPinnedHistory(pinnedHistory: Array<{text: string, timestamp: number, isPinned?: boolean, tags?: string[]}>) {
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
                    onmouseover="this.style.boxShadow='0 2px 8px rgba(0, 0, 0, 0.1)'" 
                    onmouseout="this.style.boxShadow='none'">
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
    private renderUnpinnedHistory(displayHistory: Array<{text: string, timestamp: number, isPinned?: boolean, tags?: string[]}>, hasPinned: boolean) {
        return `<div style="margin-top: ${hasPinned ? '16px' : '8px'}">
            ${displayHistory.map(item => `
                <div class="history-item" style="margin-bottom: 8px; padding: 8px; 
                    border: 1px solid var(--b3-border-color); 
                    border-radius: 4px; 
                    transition: all 0.2s ease; 
                    cursor: text;
                    user-select: text;
                    position: relative;" 
                    onmouseover="this.style.boxShadow='0 2px 8px rgba(0, 0, 0, 0.1)'; this.style.borderColor='var(--b3-theme-primary-light)'" 
                    onmouseout="this.style.boxShadow='none'; this.style.borderColor='var(--b3-border-color)'">
                    ${this.renderNoteContent(item)}
                </div>
            `).join('')}
        </div>`;
    }

    // 渲染笔记内容
    private renderNoteContent(item: {text: string, timestamp: number, tags?: string[]}) {
        const displayText = item.text;
        const encodeText = (text: string) => {
            return text.replace(/&/g, '&amp;')
                      .replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;')
                      .replace(/"/g, '&quot;')
                      .replace(/'/g, '&#039;');
        };

        return `
            <div class="text-content" data-text="${encodeText(displayText)}">
                ${item.text.length > MAX_TEXT_LENGTH ? 
                    `<div style="word-break: break-word;">
                        <span class="collapsed-text" style="color: var(--b3-theme-on-surface); white-space: pre-wrap;">${encodeText(displayText.substring(0, MAX_TEXT_LENGTH))}...</span>
                        <span class="expanded-text" style="display: none; color: var(--b3-theme-on-surface); white-space: pre-wrap;">${encodeText(displayText)}</span>
                        <button class="b3-button b3-button--text toggle-text" 
                            style="padding: 0 4px; font-size: 12px; color: var(--b3-theme-primary); display: inline-flex; align-items: center;">
                            ${this.i18n.note.expand}
                            <svg class="b3-button__icon" style="height: 12px; width: 12px; margin-left: 2px; transition: transform 0.2s ease;">
                                <use xlink:href="#iconDown"></use>
                            </svg>
                        </button>
                    </div>` 
                    : `<div style="color: var(--b3-theme-on-surface); word-break: break-word; white-space: pre-wrap;">${encodeText(displayText)}</div>`}
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
                <button class="b3-button b3-button--text more-btn" data-timestamp="${item.timestamp}" 
                    style="padding: 4px; height: 20px; width: 20px;">
                    <svg class="b3-button__icon" style="height: 14px; width: 14px;">
                        <use xlink:href="#iconMore"></use>
                    </svg>
                </button>
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
        try {
            return new Promise((resolve) => {
                const dialog = new Dialog({
                    title: this.i18n.note.new,
                    content: `
                        <div class="b3-dialog__content" style="box-sizing: border-box; padding: 16px;">
                            ${this.getEditorTemplate()}
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
                        const text = textarea.value;
                        const tags = Array.from(dialog.element.querySelectorAll('.tag-item'))
                            .map(tag => tag.getAttribute('data-tag'));
                        
                        if (text.trim()) {
                            if (!this.data[DOCK_STORAGE_NAME]) {
                                this.data[DOCK_STORAGE_NAME] = { text: '', history: [] };
                            }
                            if (!Array.isArray(this.data[DOCK_STORAGE_NAME].history)) {
                                this.data[DOCK_STORAGE_NAME].history = [];
                            }
                            
                            this.data[DOCK_STORAGE_NAME].history.unshift({
                                text: text,
                                timestamp: Date.now(),
                                tags: tags
                            });
                            
                            await this.saveData(DOCK_STORAGE_NAME, this.data[DOCK_STORAGE_NAME]);
                            showMessage(this.i18n.note.saveSuccess);
                            dialog.destroy();
                            resolve(true);
                            this.dock.renderDock(false);
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
            // 获取当前记录项
            const currentItem = this.data[DOCK_STORAGE_NAME].history.find(
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
                            
                            const index = this.data[DOCK_STORAGE_NAME].history.findIndex(
                                item => item.timestamp === timestamp
                            );
                            if (index !== -1) {
                                this.data[DOCK_STORAGE_NAME].history[index].text = newText;
                                this.data[DOCK_STORAGE_NAME].history[index].tags = tags;
                                await this.saveData(DOCK_STORAGE_NAME, this.data[DOCK_STORAGE_NAME]);
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
                    } else if(event.key === ' ' && this.value.endsWith('-')) {
                        event.preventDefault();
                        this.value = this.value.slice(0, -1) + '• ';
                    }"
                >${text}</textarea>
                <div style="border-top: 1px solid var(--b3-border-color); padding: 8px 12px;">
                    <div class="tags-list" style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; min-height: 0;"></div>
                    <div class="fn__flex" style="justify-content: space-between; align-items: center;">
                        <button class="b3-button b3-button--text add-tag-btn" style="padding: 4px;">
                            <svg class="b3-button__icon" style="height: 16px; width: 16px;"><use xlink:href="#iconTags"></use></svg>
                            <span style="margin-left: 4px; font-size: 12px;">${this.i18n.note.addTag}</span>
                        </button>
                        <button class="b3-button b3-button--text b3-tooltips b3-tooltips__n" data-type="save" aria-label="${adaptHotkey('⌘Enter')}">
                            <svg class="b3-button__icon"><use xlink:href="#iconSave"></use></svg>
                            ${this.i18n.note.save}
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
            addTagBtn.onclick = () => {
                const dialog = new Dialog({
                    title: this.i18n.note.addTag,
                    content: `
                        <div class="b3-dialog__content" style="box-sizing: border-box; padding: 16px;">
                            <div class="fn__flex" style="margin-bottom: 12px;">
                                <input type="text" 
                                    class="b3-text-field fn__flex-1 tag-input" 
                                    placeholder="${this.i18n.note.addTag}..."
                                    style="margin-right: 8px;">
                                <button class="b3-button b3-button--outline confirm-tag-btn">${this.i18n.note.save}</button>
                            </div>
                            <div style="font-size: 12px; color: var(--b3-theme-on-surface-light); margin-bottom: 8px;">
                                ${this.i18n.note.existingTags}
                            </div>
                            <div class="history-tags" style="display: flex; flex-wrap: wrap; gap: 8px;">
                                ${Array.from(new Set(this.data[DOCK_STORAGE_NAME]?.history
                                    ?.flatMap(item => item.tags || []) || []))
                                    .map(tag => `
                                        <span class="b3-chip b3-chip--middle history-tag" 
                                            style="cursor: pointer;" 
                                            data-tag="${tag}">
                                            <span class="b3-chip__content">${tag}</span>
                                        </span>
                                    `).join('')}
                            </div>
                        </div>`,
                    width: "520px",
                    height: "320px",
                });

                const tagInput = dialog.element.querySelector('.tag-input') as HTMLInputElement;
                const confirmBtn = dialog.element.querySelector('.confirm-tag-btn');
                const historyTags = dialog.element.querySelector('.history-tags');

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
                        dialog.destroy();
                    }
                };

                // 回车添加标签
                tagInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag(tagInput.value);
                    }
                });

                // 点击确认按钮添加标签
                confirmBtn.addEventListener('click', () => {
                    addTag(tagInput.value);
                });

                // 点击历史标签直接添加
                historyTags.addEventListener('click', (e) => {
                    const target = e.target as HTMLElement;
                    const tagChip = target.closest('.history-tag') as HTMLElement;
                    if (tagChip) {
                        const tagText = tagChip.getAttribute('data-tag');
                        addTag(tagText);
                    }
                });

                // 自动聚焦输入框
                setTimeout(() => tagInput.focus(), 100);
            };
        }
    }

    // 设置历史列表事件
    private setupHistoryListEvents(historyList: HTMLElement, renderDock: (showAll: boolean) => void, showAll: boolean) {
        historyList.onclick = async (e) => {
            const target = e.target as HTMLElement;
            const moreBtn = target.closest('.more-btn') as HTMLElement;
            
            if (moreBtn) {
                e.stopPropagation();
                const timestamp = Number(moreBtn.getAttribute('data-timestamp'));
                const rect = moreBtn.getBoundingClientRect();
                
                // 获取当前记录项
                const currentItem = this.data[DOCK_STORAGE_NAME].history.find(
                    item => item.timestamp === timestamp
                );
                
                const menu = new Menu("historyItemMenu");
                menu.addItem({
                    icon: "iconPin",
                    label: currentItem?.isPinned ? this.i18n.note.unpin : this.i18n.note.pin,
                    click: async () => {
                        const index = this.data[DOCK_STORAGE_NAME].history.findIndex(
                            i => i.timestamp === timestamp
                        );
                        if (index !== -1) {
                            // 切换置顶状态
                            this.data[DOCK_STORAGE_NAME].history[index].isPinned = !this.data[DOCK_STORAGE_NAME].history[index].isPinned;
                            await this.saveData(DOCK_STORAGE_NAME, this.data[DOCK_STORAGE_NAME]);
                            renderDock(showAll);
                        }
                    }
                });
                menu.addItem({
                    icon: "iconEdit",
                    label: this.i18n.note.edit,
                    click: async () => {
                        const textContainer = moreBtn.closest('.history-item').querySelector('[data-text]');
                        if (textContainer) {
                            const text = textContainer.getAttribute('data-text') || '';
                            if (await this.editHistoryItem(this.dock, timestamp, text)) {
                                renderDock(false);
                            }
                        }
                    }
                });
                menu.addItem({
                    icon: "iconTrashcan",
                    label: this.i18n.note.delete,
                    click: () => {
                        confirm(this.i18n.note.delete, this.i18n.note.deleteConfirm, async () => {
                            if (await this.deleteHistoryItem(this.dock, timestamp)) {
                                showMessage(this.i18n.note.deleteSuccess);
                                renderDock(false);
                            } else {
                                showMessage('删除失败');
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

        // 添加双击复制功能
        historyList.ondblclick = async (e) => {
            const target = e.target as HTMLElement;
            const historyItem = target.closest('.history-item') as HTMLElement;
            if (historyItem && !target.closest('.more-btn')) {
                const textContainer = historyItem.querySelector('[data-text]');
                if (textContainer) {
                    const text = textContainer.getAttribute('data-text') || '';
                    try {
                        await navigator.clipboard.writeText(text);
                        showMessage('已复制到剪贴板');
                    } catch (err) {
                        console.error('复制失败:', err);
                        showMessage('复制失败');
                    }
                }
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
                const historyItems = container.querySelectorAll('.history-item');
                
                historyItems.forEach((item: HTMLElement) => {
                    const textElement = item.querySelector('[data-text]');
                    if (textElement) {
                        const text = textElement.getAttribute('data-text').toLowerCase();
                        if (text.includes(searchText)) {
                            item.style.display = 'block';
                            // 高亮匹配文本
                            const displayText = item.querySelector('[style*="color: var(--b3-theme-on-surface)"]');
                            if (displayText) {
                                const highlightedText = text.replace(
                                    new RegExp(searchText, 'gi'),
                                    match => `<span style="background-color: var(--b3-theme-primary-light);">${match}</span>`
                                );
                                displayText.innerHTML = highlightedText;
                            }
                        } else {
                            item.style.display = 'none';
                        }
                    }
                });
            };

            searchInput.onkeydown = (e) => {
                if (e.key === 'Escape') {
                    searchInput.value = '';
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
                this.data[DOCK_STORAGE_NAME].history.sort((a, b) => {
                    return this.isDescending ? 
                        b.timestamp - a.timestamp : 
                        a.timestamp - b.timestamp;
                });
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
                    <div class="fn__flex" style="gap: 8px;">
                        <label class="fn__flex" style="align-items: center; gap: 4px;">
                            <input type="checkbox" class="b3-checkbox export-pinned-only">
                            <span>${this.i18n.note.exportPinnedOnly}</span>
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

            // 过滤数据
            const filteredData = this.data[DOCK_STORAGE_NAME].history.filter(item => {
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

    private exportData(data: Array<{text: string, timestamp: number, isPinned?: boolean, tags?: string[]}>, format: string) {
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

    private generateCSV(data: Array<{text: string, timestamp: number, isPinned?: boolean, tags?: string[]}>) {
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

    private generateMarkdown(data: Array<{text: string, timestamp: number, isPinned?: boolean, tags?: string[]}>) {
        return `# 小记导出
导出时间：${new Date().toLocaleString()}

${data.map(item => `## ${new Date(item.timestamp).toLocaleString()}${item.isPinned ? ' 📌' : ''}
${item.text}

${item.tags?.length ? `标签：${item.tags.map(tag => `\`${tag}\``).join(' ')}` : ''}`).join('\n\n---\n\n')}`;
    }
}
