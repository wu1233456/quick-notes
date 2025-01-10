import { Plugin, Dialog, showMessage } from "siyuan";
import { HistoryService } from "./HistoryService";

export class ShareService {
    private plugin: Plugin;
    private historyService: HistoryService;

    constructor(plugin: Plugin, historyService: HistoryService) {
        this.plugin = plugin;
        this.historyService = historyService;
    }

    async generateShareImage(timestamp: number): Promise<void> {
        try {
            const note = this.historyService.getHistoryItem(timestamp);
            if (!note) {
                showMessage(this.plugin.i18n.note.noteNotFound);
                return;
            }

            // 创建一个临时的 div 来渲染 Markdown
            const tempDiv = document.createElement('div');
            let text = note.text;

            // 处理文本编码
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

            // 预处理文本，保留空行但限制连续空行的数量
            const preserveEmptyLines = (content: string) => {
                return content.replace(/\n{3,}/g, '\n\n');
            };

            const processedText = processImagePaths(text);
            const textWithEmptyLines = preserveEmptyLines(processedText);

            // 直接使用 Lute 渲染 Markdown
            const renderedHtml = window.Lute.New().Md2HTML(textWithEmptyLines);
            tempDiv.innerHTML = renderedHtml;

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

            // 获取处理后的纯文本（移除图片的 Markdown 格式）
            const renderedText = tempDiv.innerText;

            // 创建一个离屏 canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                showMessage(this.plugin.i18n.note.generateImageFailed);
                return;
            }

            // 设置画布宽度和基础参数
            canvas.width = 600;
            const topMargin = 20; // 上边距
            const bottomMargin = 60; // 下边距
            const sideMargin = 20; // 左右边距
            const contentPadding = 40; // 内容区域的内边距
            const titlePadding = 60; // 标题到上边框的距离
            const contentWidth = canvas.width - sideMargin * 2;

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

            // 计算内容总高度
            const lineHeight = 36; // 行高
            const headerHeight = 60; // 日期区域高度
            const footerHeight = 10; // 底部信息区域高度

            // 计算实际文本高度（根据换行后的实际行数）
            let actualTextHeight = 0;
            const contentLines = note.text.split('\n');
            contentLines.forEach((line) => {
                if (line.trim() === '') {
                    actualTextHeight += lineHeight;
                    return;
                }
                // 计算每行实际需要的行数
                const words = line.split('');
                let currentLine = '';
                let lineCount = 1;
                for (let i = 0; i < words.length; i++) {
                    const word = words[i];
                    const testLine = currentLine + word;
                    const metrics = ctx.measureText(testLine);
                    if (metrics.width > maxTextWidth && i > 0) {
                        lineCount++;
                        currentLine = word;
                    } else {
                        currentLine = testLine;
                    }
                }
                actualTextHeight += lineHeight * lineCount;
            });

            // 计算图片高度
            const images = Array.from(tempDiv.querySelectorAll('img'));
            const imageHeight = images.reduce((total, img) => {
                const aspectRatio = img.naturalWidth / img.naturalHeight;
                const width = Math.min(maxTextWidth, img.naturalWidth);
                const height = width / aspectRatio;
                return total + height + 20; // 20px 为图片间距
            }, 0);

            const tagsHeight = note.tags?.length ? 80 : 0;
            const totalContentHeight = headerHeight + actualTextHeight + imageHeight + tagsHeight + footerHeight;

            // 设置画布总高度（加上上下边距和内边距）
            canvas.height = totalContentHeight + contentPadding * 2 + topMargin + bottomMargin;

            // 设置背景色
            ctx.fillStyle = '#dc4446';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 绘制白色主体区域
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(sideMargin, topMargin, contentWidth, canvas.height - topMargin - bottomMargin);

            // 设置半圆参数
            const arcRadius = 10;
            const arcSpacing = 30;
            const arcCount = Math.floor(contentWidth / arcSpacing);
            
            // 绘制上边的红色下半圆
            ctx.fillStyle = '#dc4446';
            for (let i = 0; i < arcCount; i++) {
                const x = sideMargin + i * arcSpacing + arcSpacing/2;
                const y = topMargin;
                
                ctx.beginPath();
                ctx.arc(x, y, arcRadius, 0, Math.PI, false);
                ctx.fill();
            }

            // 绘制下边的红色上半圆
            for (let i = 0; i < arcCount; i++) {
                const x = sideMargin + i * arcSpacing + arcSpacing/2;
                const y = canvas.height - bottomMargin;
                
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
            ctx.fillText(date, canvas.width - sideMargin - contentPadding, topMargin + titlePadding);

            // 绘制标题（左上角，红色粗体）
            ctx.textAlign = 'left';
            ctx.font = 'bold 20px "PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif';
            ctx.fillText('小记一下', sideMargin + contentPadding, topMargin + titlePadding);

            // 绘制内容（黑色）
            ctx.fillStyle = '#333333';
            ctx.font = '24px "PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            
            // 逐行绘制文本和图片
            let currentY = topMargin + contentPadding + headerHeight;

            // 处理文本块
            const renderTextBlock = (text: string, font: string) => {
                ctx.font = font;
                const words = text.split('');
                let currentLine = '';
                for (let i = 0; i < words.length; i++) {
                    const word = words[i];
                    const testLine = currentLine + word;
                    const metrics = ctx.measureText(testLine);
                    if (metrics.width > maxTextWidth && i > 0) {
                        ctx.fillText(currentLine, sideMargin + contentPadding, currentY);
                        currentY += lineHeight;
                        currentLine = word;
                    } else {
                        currentLine = testLine;
                    }
                }
                if (currentLine) {
                    ctx.fillText(currentLine, sideMargin + contentPadding, currentY);
                    currentY += lineHeight;
                }
            };

            // 遍历渲染后的HTML节点
            Array.from(tempDiv.childNodes).forEach(node => {
                if (node.nodeType === Node.TEXT_NODE) {
                    if (node.textContent?.trim()) {
                        renderTextBlock(node.textContent, '24px "PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif');
                    }
                } else if (node instanceof HTMLElement) {
                    // 根据节点类型设置不同的样式
                    switch (node.tagName) {
                        case 'H1':
                            renderTextBlock(node.textContent || '', 'bold 32px "PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif');
                            break;
                        case 'H2':
                            renderTextBlock(node.textContent || '', 'bold 28px "PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif');
                            break;
                        case 'H3':
                            renderTextBlock(node.textContent || '', 'bold 26px "PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif');
                            break;
                        case 'P':
                            // 处理段落中的图片
                            const images = Array.from(node.querySelectorAll('img'));
                            if (images.length > 0) {
                                images.forEach(img => {
                                    const aspectRatio = img.naturalWidth / img.naturalHeight;
                                    const width = Math.min(maxTextWidth, img.naturalWidth);
                                    const height = width / aspectRatio;
                                    
                                    try {
                                        ctx.drawImage(
                                            img,
                                            sideMargin + contentPadding,
                                            currentY,
                                            width,
                                            height
                                        );
                                        currentY += height + 20; // 图片间距
                                    } catch (error) {
                                        console.error('绘制图片失败:', error);
                                    }
                                });
                            }
                            // 处理段落文本
                            if (node.textContent?.trim()) {
                                renderTextBlock(node.textContent, '24px "PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif');
                                currentY += lineHeight / 2; // 段落之间添加额外间距
                            }
                            break;
                        case 'IMG':
                            if (node instanceof HTMLImageElement) {
                                const aspectRatio = node.naturalWidth / node.naturalHeight;
                                const width = Math.min(maxTextWidth, node.naturalWidth);
                                const height = width / aspectRatio;
                                
                                try {
                                    ctx.drawImage(
                                        node,
                                        sideMargin + contentPadding,
                                        currentY,
                                        width,
                                        height
                                    );
                                    currentY += height + 20; // 图片间距
                                } catch (error) {
                                    console.error('绘制图片失败:', error);
                                }
                            }
                            break;
                        case 'STRONG':
                        case 'B':
                            renderTextBlock(node.textContent || '', 'bold 24px "PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif');
                            break;
                        case 'EM':
                        case 'I':
                            renderTextBlock(node.textContent || '', 'italic 24px "PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif');
                            break;
                        case 'CODE':
                            renderTextBlock(node.textContent || '', '24px monospace');
                            break;
                        case 'UL':
                        case 'OL':
                            Array.from(node.children).forEach((li, index) => {
                                const prefix = node.tagName === 'UL' ? '• ' : `${index + 1}. `;
                                renderTextBlock(prefix + (li.textContent || ''), '24px "PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif');
                            });
                            currentY += lineHeight / 2; // 列表后添加额外间距
                            break;
                    }
                }
            });

            // 绘制标签（红色椭圆背景）
            if (note.tags && note.tags.length > 0) {
                let tagX = sideMargin + contentPadding;
                const tagY = topMargin + contentPadding + headerHeight + actualTextHeight + imageHeight + 20;
                ctx.font = '16px "PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif';
                
                note.tags.forEach(tag => {
                    const tagText = '#' + tag;
                    const tagWidth = ctx.measureText(tagText).width + 20;
                    const tagHeight = 26;
                    const cornerRadius = 4; // 圆角半径
                    
                    if (tagX + tagWidth > canvas.width - sideMargin - contentPadding) return;
                    
                    // 绘制红色圆角矩形背景
                    ctx.fillStyle = '#dc4446';
                    ctx.beginPath();
                    ctx.moveTo(tagX + cornerRadius, tagY);
                    ctx.lineTo(tagX + tagWidth - cornerRadius, tagY);
                    ctx.quadraticCurveTo(tagX + tagWidth, tagY, tagX + tagWidth, tagY + cornerRadius);
                    ctx.lineTo(tagX + tagWidth, tagY + tagHeight - cornerRadius);
                    ctx.quadraticCurveTo(tagX + tagWidth, tagY + tagHeight, tagX + tagWidth - cornerRadius, tagY + tagHeight);
                    ctx.lineTo(tagX + cornerRadius, tagY + tagHeight);
                    ctx.quadraticCurveTo(tagX, tagY + tagHeight, tagX, tagY + tagHeight - cornerRadius);
                    ctx.lineTo(tagX, tagY + cornerRadius);
                    ctx.quadraticCurveTo(tagX, tagY, tagX + cornerRadius, tagY);
                    ctx.closePath();
                    ctx.fill();
                    
                    // 绘制白色标签文本
                    ctx.fillStyle = '#ffffff';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(tagText, tagX + tagWidth/2, tagY + tagHeight/2);
                    
                    tagX += tagWidth + 10;
                });
            }

            // 绘制底部文字（白色）
            ctx.fillStyle = '#ffffff';
            ctx.font = '20px "PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const bottomTextY = canvas.height - bottomMargin + arcRadius / 2 + 20;
            ctx.fillText('siyuan', canvas.width / 2, bottomTextY);

            // 创建预览对话框
            const dialog = new Dialog({
                title: this.plugin.i18n.note.sharePreview,
                content: `
                    <div class="fn__flex-column" style="padding: 16px; gap: 16px;">
                        <div class="image-preview" style="text-align: center;">
                            <img src="${canvas.toDataURL('image/png')}" style="max-width: 100%; height: auto; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
                        </div>
                        <div class="fn__flex" style="justify-content: center; gap: 16px;">
                            <button class="b3-button b3-button--outline copy-btn">
                                <svg class="b3-button__icon"><use xlink:href="#iconCopy"></use></svg>
                                ${this.plugin.i18n.note.copyImage}
                            </button>
                            <button class="b3-button download-btn">
                                <svg class="b3-button__icon"><use xlink:href="#iconDownload"></use></svg>
                                ${this.plugin.i18n.note.downloadImage}
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
                        showMessage(this.plugin.i18n.note.copySuccess);
                        dialog.destroy();
                    } catch (err) {
                        console.error('复制图片失败:', err);
                        showMessage(this.plugin.i18n.note.copyFailed);
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
                    showMessage(this.plugin.i18n.note.downloadSuccess);
                });
            }
        } catch (error) {
            console.error('生成分享图失败:', error);
            showMessage(this.plugin.i18n.note.shareFailed);
        }
    }
} 