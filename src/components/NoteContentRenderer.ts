export class NoteContentRenderer {
    constructor(private i18n: any, private settingUtils: any) {}

    public renderNoteContent(item: { text: string, timestamp: number, tags?: string[] }) {
        const maxTextLength = this.settingUtils.get("maxTextLength") || 250;
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
                <div class="batch-checkbox fn__none" style="padding-top: 2px;">
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
} 