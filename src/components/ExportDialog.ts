import { Dialog, showMessage } from "siyuan";

export class ExportDialog {
    private i18n: any;
    
    constructor(i18n: any) {
        this.i18n = i18n;
    }

    public show(data: any, storageData: any, callback: (filteredData: any[], format: string) => void) {
        // 获取所有标签
        const allTags = Array.from(new Set(storageData?.history
            ?.flatMap(item => item.tags || []) || []));

        const dialog = new Dialog({
            title: this.i18n.note.export,
            content: this.getDialogContent(allTags),
            width: "520px",
        });

        this.setupDialogEvents(dialog, data, callback);
    }

    private getDialogContent(allTags: unknown[]): string {
        // 确保 allTags 是字符串数组
        const tags = allTags.filter(tag => typeof tag === 'string') as string[];
        
        return `
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
                                ${this.renderTags(tags)}
                            </div>
                        </div>
                        <div>
                            <div style="margin-bottom: 4px; font-size: 12px;">${this.i18n.note.exportFormat}</div>
                            <div class="fn__flex" style="gap: 8px;">
                                ${this.renderFormatOptions()}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="fn__flex-column" style="gap: 8px;">
                    ${this.renderCheckboxOptions()}
                </div>
            </div>
            <div class="b3-dialog__action">
                <button class="b3-button b3-button--cancel">${this.i18n.cancel}</button>
                <button class="b3-button b3-button--text" data-type="confirm">${this.i18n.note.export}</button>
            </div>`;
    }

    private renderTags(allTags: string[]): string {
        return allTags.map(tag => `
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
            </span>
        `).join('');
    }

    private renderFormatOptions(): string {
        return `
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
            </label>`;
    }

    private renderCheckboxOptions(): string {
        return `
            <label class="fn__flex" style="align-items: center; gap: 4px;">
                <input type="checkbox" class="b3-checkbox export-pinned-only">
                <span>${this.i18n.note.exportPinnedOnly}</span>
            </label>
            <label class="fn__flex" style="align-items: center; gap: 4px;">
                <input type="checkbox" class="b3-checkbox export-include-archived">
                <span>${this.i18n.note.exportIncludeArchived}</span>
            </label>`;
    }

    private setupDialogEvents(dialog: any, data: any, callback: (filteredData: any[], format: string) => void) {
        // 设置默认日期范围（最近一个月）
        const startDateInput = dialog.element.querySelector('.export-start-date') as HTMLInputElement;
        const endDateInput = dialog.element.querySelector('.export-end-date') as HTMLInputElement;
        const now = new Date();
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        startDateInput.value = oneMonthAgo.toISOString().split('T')[0];
        endDateInput.value = now.toISOString().split('T')[0];

        // 设置标签点击事件
        this.setupTagEvents(dialog);

        // 绑定按钮事件
        this.setupButtonEvents(dialog, data, callback);
    }

    private setupTagEvents(dialog: any) {
        const tagItems = dialog.element.querySelectorAll('.export-tag-item');
        tagItems.forEach((tag: Element) => {
            tag.addEventListener('click', () => {
                const isSelected = tag.getAttribute('data-selected') === 'true';
                tag.setAttribute('data-selected', (!isSelected).toString());
                
                // 使用类型断言来处理 style 属性
                const tagElement = tag as HTMLElement;
                if (!isSelected) {
                    tagElement.style.backgroundColor = 'var(--b3-theme-primary)';
                    tagElement.style.color = 'var(--b3-theme-on-primary)';
                    tagElement.style.border = '1px solid var(--b3-theme-primary)';
                } else {
                    tagElement.style.backgroundColor = 'var(--b3-theme-surface)';
                    tagElement.style.color = 'var(--b3-theme-on-surface)';
                    tagElement.style.border = '1px solid var(--b3-border-color)';
                }
            });
        });
    }

    private setupButtonEvents(dialog: any, data: any, callback: (filteredData: any[], format: string) => void) {
        const btns = dialog.element.querySelectorAll('.b3-button');
        btns[0].addEventListener('click', () => {
            dialog.destroy();
        });

        btns[1].addEventListener('click', () => {
            const filteredData = this.getFilteredData(dialog, data);
            if (filteredData.length === 0) {
                showMessage(this.i18n.note.noDataToExport);
                return;
            }

            const format = dialog.element.querySelector('input[name="export-format"]:checked').value;
            callback(filteredData, format);
            dialog.destroy();
        });
    }

    private getFilteredData(dialog: any, data: any): any[] {
        const startDate = new Date(dialog.element.querySelector('.export-start-date').value).getTime();
        const endDate = new Date(dialog.element.querySelector('.export-end-date').value).setHours(23, 59, 59, 999);
        const selectedTags = Array.from(dialog.element.querySelectorAll('.export-tag-item[data-selected="true"]'))
            .map(tag => (tag as Element).getAttribute('data-tag'))
            .filter(tag => tag !== null) as string[]; // 添加过滤，确保 tag 不为 null
        const pinnedOnly = (dialog.element.querySelector('.export-pinned-only') as HTMLInputElement).checked;
        const includeArchived = (dialog.element.querySelector('.export-include-archived') as HTMLInputElement).checked;

        let allData = [...data.history];
        if (includeArchived && data.archivedHistory) {
            allData = allData.concat(data.archivedHistory);
        }

        return allData.filter(item => {
            const matchDate = (!startDate || item.timestamp >= startDate) &&
                (!endDate || item.timestamp <= endDate);
            const matchTags = selectedTags.length === 0 ||
                selectedTags.some(tag => item.tags?.includes(tag));
            const matchPinned = !pinnedOnly || item.isPinned;
            return matchDate && matchTags && matchPinned;
        });
    }
} 