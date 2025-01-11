import { Dialog, showMessage } from "siyuan";
import { createDocWithMd, lsNotebooks, createDailyNote, appendBlock } from "../api";
import { SettingUtils } from "../libs/setting-utils";

export interface IDocumentService {
    createNoteAsDocument(timestamp: number, note: any): Promise<void>;
    insertToDaily(timestamp: number, note: any): Promise<void>;
    insertToDocument(timestamp: number, note: any): Promise<void>;
}

export class DocumentService implements IDocumentService {
    private i18n: any;
    private settingUtils: SettingUtils;
    private onSuccess: () => void;
    private plugin: any;
    private readonly STORAGE_NAME = "quicknote-doc-settings";
    private historyService: any;

    constructor(i18n: any, settingUtils: SettingUtils, onSuccess: () => void, plugin: any, historyService: any) {
        this.i18n = i18n;
        this.settingUtils = settingUtils;
        this.onSuccess = onSuccess;
        this.plugin = plugin;
        this.historyService = historyService;
    }

    private async getDocSettings() {
        const settings = await this.plugin.loadData(this.STORAGE_NAME) || {};
        return {
            lastSelectedNotebook: settings.lastSelectedNotebook || "",
            lastDocPath: settings.lastDocPath || "/小记"
        };
    }

    private async saveDocSettings(settings: { lastSelectedNotebook: string, lastDocPath: string }) {
        await this.plugin.saveData(this.STORAGE_NAME, settings);
    }

    public async createNoteAsDocument(timestamp: number, note: any): Promise<void> {
        try {
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

            // 获取上次选择的笔记本和路径
            const settings = await this.getDocSettings();
            const lastSelectedNotebook = settings.lastSelectedNotebook;
            const lastDocPath = settings.lastDocPath;

            // 创建选择笔记本的对话框
            const dialog = new Dialog({
                title: this.i18n.note.createDoc,
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
                                        value="${lastDocPath}" 
                                        placeholder="${this.i18n.note.docPathPlaceholder}"
                                        style="padding: 8px 12px; border-radius: 6px;">
                                </div>
                            </div>
                            <div class="fn__flex-column" style="gap: 8px;">
                                <span class="ft__on-surface" style="font-size: 14px; font-weight: 500;">${this.i18n.note.selectNotebook}</span>
                                <div class="fn__flex-column notebooks-list" style="gap: 8px; max-height: 200px; overflow-y: auto; padding: 8px; background: var(--b3-theme-background); border-radius: 6px; border: 1px solid var(--b3-border-color);">
                                    ${notebooks.notebooks.map((notebook) => `
                                        <label class="fn__flex b3-label" style="padding: 8px; border-radius: 4px; cursor: pointer; transition: all 0.2s ease;">
                                            <input type="radio" name="notebook" value="${notebook.id}" style="margin-right: 8px;" 
                                                ${lastSelectedNotebook === notebook.id ? 'checked' : 
                                                  (!lastSelectedNotebook && notebook.id === notebooks.notebooks[0].id) ? 'checked' : ''}>
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
                    // 保存选择的笔记本和路径
                    await this.saveDocSettings({
                        lastSelectedNotebook: selectedNotebook.value,
                        lastDocPath: docPath
                    });

                    // 创建文档
                    const notebookId = selectedNotebook.value;
                    const title = docTitle || this.i18n.note.untitledDoc;
                    const path = `${docPath}/${title}`;
                    await createDocWithMd(notebookId, path, note.text);

                    // 如果选择了创建后删除，调用回调函数
                    if (deleteAfterCreate) {
                        this.historyService.deleteHistoryItem(note.timestamp)
                        this.onSuccess();
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

    public async insertToDaily(timestamp: number, note: any): Promise<void> {
        try {
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
                const content = note.text;
                const tags = note.tags && note.tags.length > 0 ? note.tags.map(tag => `#${tag}`).join(' ') : '';

                // 替换模板中的变量
                const content_final = template
                    .replace(/\${time}/g, time)
                    .replace(/\${content}/g, content)
                    .replace(/\${tags}/g, tags);

                // 插入内容到文档末尾
                await appendBlock("markdown", content_final, result.id);
                showMessage(this.i18n.note.insertSuccess);

                // 检查是否需要删除原小记
                const deleteAfterInsert = this.settingUtils.get("deleteAfterInsert");
                if (deleteAfterInsert) {
                    this.historyService.deleteHistoryItem(note.timestamp)
                    this.onSuccess();
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

    public async insertToDocument(timestamp: number, note: any): Promise<void> {
        if (!note) {
            showMessage(this.i18n.note.noteNotFound);
            return;
        }

        const targetDocId = this.settingUtils.get("targetDocId");
        if (!targetDocId) {
            showMessage(this.i18n.note.noTargetDoc);
            return;
        }

        const content = this.buildContent(note);
        try {
            await this.appendBlock(targetDocId, content);
            showMessage(this.i18n.note.insertSuccess);
            
           // 检查是否需要删除原小记
           const deleteAfterInsert = this.settingUtils.get("deleteAfterInsert");
           if (deleteAfterInsert) {
               this.historyService.deleteHistoryItem(note.timestamp)
               this.onSuccess();
           }
        } catch (error) {
            console.error('Failed to insert to document:', error);
            showMessage(this.i18n.note.insertFailed);
        }
    }

    private buildContent(note: any): string {
        let template = this.settingUtils.get("insertTemplate") || "> [!note] 小记 ${time}\n${content}${tags}";

        const time = new Date(note.timestamp).toLocaleString();
        const content = note.text;
        const tags = note.tags && note.tags.length > 0 ? note.tags.map(tag => `#${tag}`).join(' ') : '';

        return template
            .replace(/\${time}/g, time)
            .replace(/\${content}/g, content)
            .replace(/\${tags}/g, tags);
    }

    private async appendBlock(docId: string, content: string): Promise<void> {
        await appendBlock("markdown", content, docId);
    }
} 