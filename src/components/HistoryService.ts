import { Dialog, Plugin } from "siyuan";
import { DOCK_STORAGE_NAME, ARCHIVE_STORAGE_NAME } from '../libs/const';

export interface HistoryItem {
    text: string;
    timestamp: number;
    isPinned?: boolean;
    tags?: string[];
}

export interface HistoryData {
    history: HistoryItem[];
    archivedHistory?: HistoryItem[];
}

export interface SaveContentOptions {
    text: string;
    tags?: string[];
    timestamp?: number;
    isPinned?: boolean;
}

export interface EditDialogOptions {
    getEditorTemplate: (text: string) => string;
    setupTagsFeature: (element: HTMLElement) => void;
    setupImageUpload: (element: HTMLElement) => void;
}

export interface SortOptions {
    isDescending: boolean;
}
export interface RenderCallback {
    (showAll?: boolean): void;
}
export class HistoryService {
    private i18n: any;
    private data: HistoryData;
    private isDescending: boolean = true;
    private selectedTags: string[] = [];
    private showArchived: boolean = false;
    private currentDisplayCount: number;
    private readonly itemsPerPage: number;
    private parent: Plugin;

    constructor(parent: Plugin, data: HistoryData, itemsPerPage: number = 10, i18n: any) {
        this.parent = parent;
        this.data = data;
        this.itemsPerPage = itemsPerPage;
        this.currentDisplayCount = itemsPerPage;
        this.i18n = i18n;
    }

    public setIsDescending(isDescending: boolean) {
        this.isDescending = isDescending;
    }
    public setShowArchived(showArchived: boolean) {
        this.showArchived = showArchived;
    }
    public searchHistory(searchText: string) {
        // 在选定的数据源中搜索
        const filteredHistory = this.getCurrentData().filter(item => {
            const text = item.text.toLowerCase();
            const tags = item.tags?.join(' ').toLowerCase() || '';
            return text.includes(searchText) || tags.includes(searchText);
        });
        return filteredHistory;
    }

    public getFilteredHistory(showAll: boolean = false): {
        pinnedItems: HistoryItem[];
        unpinnedItems: HistoryItem[];
    } {
        // 根据当前状态选择数据源
        const sourceData = this.showArchived ?
            this.data.archivedHistory || [] :
            this.data.history;

        // 应用标签过滤
        const filteredData = this.selectedTags.length > 0 ?
            sourceData.filter(item =>
                this.selectedTags.some(tag => item.tags?.includes(tag))
            ) :
            sourceData;

        // 分离置顶和非置顶项
        const pinnedItems = filteredData.filter(item => item.isPinned);
        const unpinnedItems = filteredData.filter(item => !item.isPinned);

        // 应用排序
        this.sortItems(pinnedItems);
        this.sortItems(unpinnedItems);

        // 根据 showAll 参数决定返回的非置顶项数量
        const slicedUnpinnedItems = showAll ?
            unpinnedItems.slice(0, unpinnedItems.length) :
            unpinnedItems.slice(0, this.itemsPerPage);

        return {
            pinnedItems,
            unpinnedItems: slicedUnpinnedItems
        };
    }

    private sortItems(items: HistoryItem[]) {
        items.sort((a, b) =>
            this.isDescending ?
                b.timestamp - a.timestamp :
                a.timestamp - b.timestamp
        );
    }

    public getSortStatus(): boolean {
        return this.isDescending;
    }

    public renderSortButton(): string {
        return `
            <button class="b3-button b3-button--outline sort-btn fn__flex" style="margin-right: 8px; padding: 4px 8px;">
                <svg class="b3-button__icon" style="height: 14px; width: 14px; margin-right: 4px;">
                    <use xlink:href="#iconSort"></use>
                </svg>
                <span>${this.i18n.note.sort}: ${this.isDescending ? this.i18n.note.newest : this.i18n.note.oldest}</span>
            </button>
        `;
    }

    public toggleArchiveView() {
        this.showArchived = !this.showArchived;
        return this.showArchived;
    }

    public updateSelectedTags(tags: string[]) {
        console.log("updateSelectedTags", tags);
        this.selectedTags = tags;
    }

    public loadMore() {
        this.currentDisplayCount += this.itemsPerPage;
        return this.currentDisplayCount;
    }

    public resetDisplayCount() {
        this.currentDisplayCount = this.itemsPerPage;
    }

    public hasMoreItems(): boolean {
        const sourceData = this.showArchived ?
            this.data.archivedHistory || [] :
            this.data.history;

        const unpinnedCount = sourceData.filter(item => !item.isPinned).length;
        return unpinnedCount > this.currentDisplayCount;
    }

    public async archiveItem(timestamp: number): Promise<boolean> {
        try {
            const itemIndex = this.data.history.findIndex(item => item.timestamp === timestamp);
            if (itemIndex === -1) return false;

            const item = this.data.history[itemIndex];
            if (item.isPinned) {
                item.isPinned = false;
            }

            // 初始化归档数组
            if (!this.data.archivedHistory) {
                this.data.archivedHistory = [];
            }

            // 移动到归档
            this.data.archivedHistory.push(item);
            this.data.history.splice(itemIndex, 1);

            // 保存两个存储位置的数据
            await this.parent.saveData(DOCK_STORAGE_NAME, { history: this.data.history });
            await this.parent.saveData(ARCHIVE_STORAGE_NAME, { history: this.data.archivedHistory });
            return true;
        } catch (error) {
            console.error('Archive failed:', error);
            return false;
        }
    }

    public async unarchiveItem(timestamp: number): Promise<boolean> {
        try {
            if (!this.data.archivedHistory) return false;

            const itemIndex = this.data.archivedHistory.findIndex(item => item.timestamp === timestamp);
            if (itemIndex === -1) return false;

            const item = this.data.archivedHistory[itemIndex];
            this.data.history.unshift(item);
            this.data.archivedHistory.splice(itemIndex, 1);

            // 保存更改
            await this.saveData(DOCK_STORAGE_NAME, this.data.history);
            await this.saveData(ARCHIVE_STORAGE_NAME, this.data.archivedHistory);
            return true;
        } catch (error) {
            console.error('Unarchive failed:', error);
            return false;
        }
    }

    public async deleteItem(timestamp: number): Promise<boolean> {
        try {
            const itemIndex = this.getCurrentData().findIndex(item => item.timestamp === timestamp);
            if (itemIndex === -1) return false;

            this.getCurrentData().splice(itemIndex, 1);
            await this.saveData(this.getStorageKey(), this.getCurrentData());
            return true;
        } catch (error) {
            console.error('Delete failed:', error);
            return false;
        }
    }

    public async updateItemTags(timestamp: number, tags: string[]): Promise<boolean> {
        try {
            const item = this.getCurrentData().find(item => item.timestamp === timestamp);
            if (!item) return false;

            item.tags = tags;
            await this.saveData(this.getStorageKey(), this.getCurrentData());
            return true;
        } catch (error) {
            console.error('Update tags failed:', error);
            return false;
        }
    }

    public getAllTags(): string[] {
        const allItems = [
            ...this.data.history,
            ...(this.data.archivedHistory || [])
        ];

        return Array.from(new Set(
            allItems.flatMap(item => item.tags || [])
        ));
    }

    public getTagCount(tag: string): number {
        const allItems = [
            ...this.data.history,
            ...(this.data.archivedHistory || [])
        ];

        return allItems.filter(item =>
            item.tags?.includes(tag)
        ).length;
    }

    public isArchiveView(): boolean {
        return this.showArchived;
    }

    public getCurrentDisplayCount(): number {
        return this.currentDisplayCount;
    }

    public getItemsPerPage(): number {
        return this.itemsPerPage;
    }

    public async saveContent(options: SaveContentOptions): Promise<boolean> {
        try {
            const newItem: HistoryItem = {
                text: options.text,
                timestamp: options.timestamp || Date.now(),
                tags: options.tags || [],
                isPinned: options.isPinned || false
            };

            // 如果提供了时间戳，说明是编辑现有条目
            const sourceData = this.getCurrentData();
            if (options.timestamp) {

                const itemIndex = sourceData.findIndex(item => item.timestamp === options.timestamp);
                if (itemIndex !== -1) {
                    sourceData[itemIndex] = newItem;
                } else {
                    return false;
                }
            } else {
                // 新建条目
                sourceData.unshift(newItem);
            }
            await this.saveData(this.getStorageKey(), sourceData);
            return true;
        } catch (error) {
            console.error('Save content failed:', error);
            return false;
        }
    }

    public async editHistoryItem(
        timestamp: number,
        content: string,
        tags: string[],
    ): Promise<boolean> {
        console.log("editHistoryItem");
        this.saveContent(
            {
                text: content,
                tags: tags,
                timestamp: timestamp,
                isPinned: this.getHistoryItem(timestamp)?.isPinned
            },

        );
        return true;
    }

    public async toggleItemPin(timestamp: number): Promise<boolean> {
        try {
            const item = this.getHistoryItem(timestamp);
            if (!item) return false;

            item.isPinned = !item.isPinned;
            await this.saveData(this.getStorageKey(), this.getCurrentData());
            return true;
        } catch (error) {
            console.error('Toggle pin failed:', error);
            return false;
        }
    }

    public async deleteHistoryItem(timestamp: number): Promise<boolean> {
        try {
            const itemIndex = this.getCurrentData().findIndex(item => item.timestamp === timestamp);
            if (itemIndex === -1) return false;
            this.getCurrentData().splice(itemIndex, 1);

            await this.saveData(this.getStorageKey(), this.getCurrentData());
            return true;
        } catch (error) {
            console.error('Delete failed:', error);
            return false;
        }
    }

    public async batchDeleteItems(
        timestamps: number[]
    ): Promise<boolean> {
        try {
            const sourceData = this.getCurrentData();
            timestamps.forEach(timestamp => {
                const itemIndex = sourceData.findIndex(item => item.timestamp === timestamp);
                if (itemIndex !== -1) {
                    sourceData.splice(itemIndex, 1);
                }
            });

            await this.saveData(this.getStorageKey(), sourceData);
            return true;
        } catch (error) {
            console.error('Batch delete failed:', error);
            return false;
        }
    }

    public getHistoryItem(timestamp: number): HistoryItem | undefined {
        return this.getCurrentData().find(item => item.timestamp === timestamp);
    }

    public async mergeItems(
        timestamps: number[]
    ): Promise<boolean> {
        try {
            const items = timestamps
                .map(timestamp => this.getCurrentData().find(item => item.timestamp === timestamp))
                .filter(item => item) as HistoryItem[];

            if (items.length < 2) return false;

            // 按时间排序
            items.sort((a, b) => a.timestamp - b.timestamp);

            // 合并内容和标签
            const mergedContent = items.map(item => item.text).join('\n\n---\n\n');
            const mergedTags = Array.from(new Set(
                items.flatMap(item => item.tags || [])
            ));

            // 创建新条目
            const newItem: HistoryItem = {
                text: mergedContent,
                timestamp: Date.now(),
                tags: mergedTags,
                isPinned: false
            };

            // 删除原条目
            timestamps.forEach(timestamp => {
                const itemIndex = this.getCurrentData().findIndex(item => item.timestamp === timestamp);
                if (itemIndex !== -1) {
                    this.getCurrentData().splice(itemIndex, 1);
                }
            });

            // 添加新条目
            this.getCurrentData().unshift(newItem);
            await this.saveCurrentData(this.getCurrentData());
            return true;
        } catch (error) {
            console.error('Merge items failed:', error);
            return false;
        }
    }
    public async saveData(storageKey: string, data: HistoryItem[]) {
        await this.parent.saveData(storageKey, { 'history': data });
    }

    public async openEditDialog(
        timestamp: number,
        options: EditDialogOptions,
    ): Promise<boolean> {
        try {
            const item = this.getHistoryItem(timestamp);
            if (!item) return false;
            return new Promise((resolve) => {
                const dialog = new Dialog({
                    title: this.i18n.note.edit,
                    content: `
                        <div class="b3-dialog__content" style="box-sizing: border-box; padding: 16px;">
                            ${options.getEditorTemplate(item.text)}
                        </div>`,
                    width: "520px",
                    height: "320px",
                    transparent: false,
                    disableClose: false,
                    disableAnimation: false,
                    destroyCallback: () => {
                        // resolve(true);
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
                                .map(tag => tag.getAttribute('data-tag'))
                                .filter((tag): tag is string => tag !== null);

                            const success = await this.editHistoryItem(
                                timestamp,
                                newText,
                                tags
                            );

                            if (success) {
                                dialog.destroy();
                                console.log("saveContent");
                                resolve(true);
                                return;
                            }
                        }
                        resolve(false);
                    };
                }

                // 设置标签功能
                options.setupTagsFeature(dialog.element);

                // 添加已有标签
                if (item.tags?.length) {
                    const tagsList = dialog.element.querySelector('.tags-list');
                    if (tagsList) {
                        item.tags.forEach(tagText => {
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
                            const closeBtn = tagElement.querySelector('.b3-chip__close');
                            if (closeBtn) {
                                closeBtn.addEventListener('click', () => {
                                    tagElement.remove();
                                });
                            }
                        });
                    }
                }

                // 设置图片上传功能
                options.setupImageUpload(dialog.element);
            });
        } catch (error) {
            console.error('Open edit dialog failed:', error);
            return false;
        }
    }

    public getStorageKey(): string {
        return this.showArchived ? ARCHIVE_STORAGE_NAME : DOCK_STORAGE_NAME;
    }

    //根据归档状态获取当前数据
    public getCurrentData(): HistoryItem[] {
        return this.showArchived ?
            this.data.archivedHistory :
            this.data.history;
    }
    public getHistoryData(): HistoryItem[] {
        return this.data.history || [];
    }

    public getArchivedData(): HistoryItem[] {
        return this.data.archivedHistory || [];
    }

    public getTotalUnpinnedCount(): number {
        const sourceData = this.showArchived ?
            this.data.archivedHistory || [] :
            this.data.history;

        const filteredData = this.selectedTags.length > 0 ?
            sourceData.filter(item =>
                this.selectedTags.some(tag => item.tags?.includes(tag))
            ) :
            sourceData;

        return filteredData.filter(item => !item.isPinned).length;
    }

    public async updateItemContent(timestamp: number, newText: string): Promise<boolean> {
        try {
            // 查找并更新活动记录
            const activeItem = this.getCurrentData().find(item => item.timestamp === timestamp);
            if (activeItem) {
                console.log(newText)
                console.log("updateItemContent", activeItem);
                activeItem.text = newText;
                await this.saveData(this.getStorageKey(), this.getCurrentData());
                return true;
            }

            return false;
        } catch (error) {
            console.error('Failed to update item content:', error);
            return false;
        }
    }
} 