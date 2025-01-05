export function initMardownStyle(){
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