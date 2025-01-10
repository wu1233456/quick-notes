import { showMessage } from "siyuan";
import { upload } from "../api";

export interface ImageUploadOptions {
    container: HTMLElement;
    i18n: any;
    onImageUploaded?: (imageLinks: string) => void;
}

export class ImageService {
    private i18n: any;

    constructor(i18n: any) {
        this.i18n = i18n;
    }

    public setupImageUpload(options: ImageUploadOptions) {
        const { container, i18n = this.i18n, onImageUploaded } = options;
        const uploadBtn = container.querySelector('.upload-image-btn');
        const uploadInput = container.querySelector('.image-upload-input') as HTMLInputElement;
        const textarea = container.querySelector('textarea') as HTMLTextAreaElement;

        if (uploadBtn && uploadInput && textarea) {
            // 处理图片上传
            const handleImageUpload = async (files: File[]) => {
                if (files.length === 0) return;

                try {
                    // 上传图片
                    const result = await upload("/assets/", files);
                    if (result.succMap) {
                        // 构建 Markdown 图片语法
                        const imageLinks = Object.entries(result.succMap)
                            .map(([filename, url]) => `![${filename}](${url as string})`)
                            .join('\n');

                        if (onImageUploaded) {
                            onImageUploaded(imageLinks);
                        } else {
                            // 获取光标位置
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            const text = textarea.value;

                            // 在光标位置插入图片链接
                            textarea.value = text.substring(0, start) + imageLinks + text.substring(end);

                            // 更新光标位置
                            const newPosition = start + imageLinks.length;
                            textarea.setSelectionRange(newPosition, newPosition);
                            textarea.focus();
                        }
                    }
                } catch (error) {
                    console.error('Upload failed:', error);
                    showMessage(i18n.note.uploadFailed);
                }
            };

            // 点击上传按钮处理
            uploadBtn.addEventListener('click', () => {
                uploadInput.click();
            });

            // 文件选择处理
            uploadInput.addEventListener('change', async () => {
                const files = Array.from(uploadInput.files || []);
                await handleImageUpload(files);
                // 清空 input，允许重复上传相同文件
                uploadInput.value = '';
            });

            // 添加粘贴事件处理
            textarea.addEventListener('paste', async (e: ClipboardEvent) => {
                const items = Array.from(e.clipboardData?.items || []);
                const imageFiles = items
                    .filter(item => item.type.startsWith('image/'))
                    .map(item => {
                        const file = item.getAsFile();
                        if (file) {
                            // 使用当前时间戳和原始文件类型作为文件名
                            const timestamp = new Date().getTime();
                            const ext = file.name?.split('.').pop() || file.type.split('/')[1] || 'png';
                            return new File([file], `pasted_image_${timestamp}.${ext}`, {
                                type: file.type
                            });
                        }
                        return null;
                    })
                    .filter((file): file is File => file !== null);

                if (imageFiles.length > 0) {
                    e.preventDefault(); // 阻止默认粘贴行为
                    await handleImageUpload(imageFiles);
                }
            });
        }
    }
} 