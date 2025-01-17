import { Dialog, Plugin } from "siyuan";
import { DOCK_STORAGE_NAME, ARCHIVE_STORAGE_NAME } from '../libs/const';
import { StorageService } from './StorageService';

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
    private itemsPerPage: number;
    private parent: Plugin;
    private currentTimestamp: number | null = null;
    public storageService: StorageService;

    constructor(parent: Plugin, data: HistoryData, itemsPerPage: number = 10, i18n: any) {
        this.parent = parent;
        this.data = data;
        this.itemsPerPage = itemsPerPage;
        this.currentDisplayCount = itemsPerPage;
        this.i18n = i18n;
        this.storageService = new StorageService(parent);
    }
    public setItemsPerPage(itemsPerPage: number) {
        this.itemsPerPage = itemsPerPage;
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
            this.saveData(DOCK_STORAGE_NAME,  this.data.history );
            this.saveData(ARCHIVE_STORAGE_NAME, this.data.archivedHistory );
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
                    // 如果没有找到就新建条目
                     sourceData.unshift(newItem);
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
        this.currentTimestamp = timestamp;
        return this.getCurrentData()?.find(item => item.timestamp === timestamp);
    }

    public getCurrentTimestamp(): number | null {
        return this.currentTimestamp;
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
    //注意这个方法耗时会比较久，因为为了确保数据一致性，需要先同步，再保存，所以会比较慢
    public async saveData(storageKey: string, data: HistoryItem[]) {
        try {
            // 从 utils 导入同步状态检查函数
            const { getSyncEnabled } = await import('../libs/utils');
            const isSyncEnabled = await getSyncEnabled();
            console.log("isSyncEnabled", isSyncEnabled);

            if (!isSyncEnabled) {
                // 如果没有开启同步，直接保存
                await this.storageService.saveData<HistoryItem>(storageKey, { history: data });
                return;
            }

            // 如果开启了同步，执行原有的同步逻辑
            await this.sync();
            
            // 从存储服务加载最新数据
            const latestData = await this.storageService.loadData<HistoryItem>(storageKey);
            
            // 比对数据
            const hasChanges = await this.compareAndMergeData(data, latestData?.history || []);
            
            if (hasChanges) {
                // 如果有变化，保存合并后的数据
                await this.storageService.saveData<HistoryItem>(storageKey, { history: this.data.history });
                // 再次同步
                await this.sync();
            } else {
                // 如果没有变化，直接保存并同步
                await this.storageService.saveData<HistoryItem>(storageKey, { history: data });
                await this.sync();
            }
        } catch (error) {
            console.error('保存数据失败:', error);
            // 如果出错，尝试直接保存数据
            await this.storageService.saveData<HistoryItem>(storageKey, { history: data });
        }
    }

    private async compareAndMergeData(localData: HistoryItem[], syncedData: HistoryItem[]): Promise<boolean> {
        let hasChanges = false;
        
        // 创建时间戳映射以便快速查找
        const localMap = new Map(localData.map(item => [item.timestamp, item]));
        const syncedMap = new Map(syncedData.map(item => [item.timestamp, item]));
        
        // 检查新增的条目
        for (const [timestamp, item] of localMap) {
            if (!syncedMap.has(timestamp)) {
                // 本地新增的条目，保留
                hasChanges = true;
            }
        }
        
        // 检查同步下来的新条目
        for (const [timestamp, syncedItem] of syncedMap) {
            if (!localMap.has(timestamp)) {
                // 远程新增的条目，添加到本地
                localData.push(syncedItem);
                hasChanges = true;
            }
        }
        
        // 更新本地数据
        if (hasChanges) {
            if (this.showArchived) {
                this.data.archivedHistory = localData;
            } else {
                this.data.history = localData;
            }
        }
        
        return hasChanges;
    }

    private async sync(): Promise<boolean> {
        try {
            console.log("siyuan sync");
            const response = await fetch("http://127.0.0.1:6806/api/sync/performSync", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ "upload": true })
            });
            const result = await response.json();
            return result.code === 0;
        } catch (error) {
            console.error("Error during sync:", error);
            return false;
        }
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

                // 添加快捷键事件监听
                const textarea = dialog.element.querySelector('textarea');
                if (textarea) {
                    textarea.addEventListener('keydown', (e) => {
                        // 添加标签快捷键 (Cmd/Ctrl + K)
                        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                            e.preventDefault();
                            const addTagBtn = dialog.element.querySelector('.add-tag-btn') as HTMLElement;
                            if (addTagBtn) {
                                addTagBtn.click();
                            }
                        }
                    });
                }

                // 绑定保存按钮事件
                const saveBtn = dialog.element.querySelector('[data-type="save"]');
                if (saveBtn && textarea) {
                    (saveBtn as HTMLElement).addEventListener('click', async () => {
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
                    });
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
                activeItem.text = newText;
                this.saveData(this.getStorageKey(), this.getCurrentData());
                return true;
            }

            return false;
        } catch (error) {
            console.error('Failed to update item content:', error);
            return false;
        }
    }

    public async batchArchiveItems(timestamps: number[]): Promise<boolean> {
        try {
            const itemsToArchive = timestamps
                .map(timestamp => {
                    const index = this.data.history.findIndex(item => item.timestamp === timestamp);
                    if (index === -1) return null;
                    const item = this.data.history[index];
                    // 取消置顶状态
                    if (item.isPinned) {
                        item.isPinned = false;
                    }
                    // 从历史记录中移除
                    this.data.history.splice(index, 1);
                    return item;
                })
                .filter((item): item is HistoryItem => item !== null);

            if (itemsToArchive.length === 0) return false;

            // 初始化归档数组（如果不存在）
            if (!this.data.archivedHistory) {
                this.data.archivedHistory = [];
            }

            // 添加到归档
            this.data.archivedHistory.push(...itemsToArchive);

            // 保存两个存储位置的数据
            this.saveData(DOCK_STORAGE_NAME, this.data.history);
            this.saveData(ARCHIVE_STORAGE_NAME, this.data.archivedHistory);
            return true;
        } catch (error) {
            console.error('Batch archive failed:', error);
            return false;
        }
    }

    public async batchUnarchiveItems(timestamps: number[]): Promise<boolean> {
        try {
            if (!this.data.archivedHistory) return false;

            const itemsToUnarchive = timestamps
                .map(timestamp => {
                    const index = this.data.archivedHistory!.findIndex(item => item.timestamp === timestamp);
                    if (index === -1) return null;
                    const item = this.data.archivedHistory![index];
                    // 从归档中移除
                    this.data.archivedHistory!.splice(index, 1);
                    return item;
                })
                .filter((item): item is HistoryItem => item !== null);

            if (itemsToUnarchive.length === 0) return false;

            // 添加到历史记录
            this.data.history.unshift(...itemsToUnarchive);

            // 保存更改
            this.saveData(DOCK_STORAGE_NAME, this.data.history);
            this.saveData(ARCHIVE_STORAGE_NAME, this.data.archivedHistory);
            // 异步调用同步方法
            this.sync().catch(console.error);
            return true;
        } catch (error) {
            console.error('Batch unarchive failed:', error);
            return false;
        }
    }

    private async saveCurrentData(data: HistoryItem[]): Promise<void> {
        this.saveData(this.getStorageKey(), data);
    }

    public async batchUpdateTags(
        timestamps: number[],
        tags: string[]
    ): Promise<boolean> {
        try {
            const sourceData = this.getCurrentData();
            let updateCount = 0;

            timestamps.forEach(timestamp => {
                const item = sourceData.find(item => item.timestamp === timestamp);
                if (item) {
                    item.tags = [...tags];
                    updateCount++;
                }
            });

            if (updateCount > 0) {
                this.saveData(this.getStorageKey(), sourceData);
                return true;
            }
            return false;
        } catch (error) {
            console.error('批量更新标签失败:', error);
            return false;
        }
    }
} 