export class ExportService {
    private i18n: any;

    constructor(i18n: any) {
        this.i18n = i18n;
    }

    public exportData(data: Array<{ text: string, timestamp: number, isPinned?: boolean, tags?: string[] }>, format: string) {
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

            this.downloadFile(content, filename, mimeType);
            return true;
        } catch (error) {
            console.error('Export failed:', error);
            return false;
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

    private downloadFile(content: string, filename: string, mimeType: string) {
        const blob = new Blob(['\ufeff' + content], { type: mimeType });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
} 