import { adaptHotkey } from "../libs/utils";

interface EditorTemplateOptions {
    text?: string;
    i18n: any;
    placeholder?: string;
}

export class EditorService {
    private i18n: any;

    constructor(i18n: any) {
        this.i18n = i18n;
    }

    public getEditorTemplate(options: EditorTemplateOptions) {
        const { text = '', i18n = this.i18n, placeholder = i18n.note.placeholder } = options;

        return `
            <div style="border: 1px solid var(--b3-border-color); border-radius: 8px; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1); overflow: hidden; height: 100%; display: flex; flex-direction: column;">
                <textarea class="fn__flex-1" 
                    placeholder="${placeholder}"
                    style="width: 100%; 
                    min-height: 160px; 
                    flex: 1;
                    resize: none; 
                    padding: 12px; 
                    background-color: var(--b3-theme-background);
                    color: var(--b3-theme-on-background);
                    border: none;
                    box-sizing: border-box;"
                    onkeydown="if((event.metaKey || event.ctrlKey) && event.key === 'Enter') { 
                        event.preventDefault(); 
                        this.closest('.b3-dialog__content')?.querySelector('[data-type=\\'save\\']')?.click(); 
                    } else if((event.metaKey || event.ctrlKey) && event.key === 'z') {
                        event.preventDefault();
                        if(event.shiftKey) {
                            document.execCommand('redo');
                        } else {
                            document.execCommand('undo');
                        }
                    }"
                >${text}</textarea>
                <div style="border-top: 1px solid var(--b3-border-color); padding: 8px 12px; flex-shrink: 0;">
                    <div class="tags-list" style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; min-height: 0;"></div>
                    <div class="fn__flex" style="justify-content: space-between; align-items: center;">
                        <div class="fn__flex" style="gap: 8px;">
                            <button class="b3-button b3-button--text add-tag-btn b3-tooltips b3-tooltips__n" 
                                style="padding: 4px;" 
                                aria-label="${adaptHotkey('⌘K')}">
                                <svg class="b3-button__icon" style="height: 16px; width: 16px;">
                                    <use xlink:href="#iconTags"></use>
                                </svg>
                            </button>
                            <button class="b3-button b3-button--text upload-image-btn b3-tooltips b3-tooltips__n" style="padding: 4px;" aria-label="${i18n.note.uploadImage}">
                                <svg class="b3-button__icon" style="height: 16px; width: 16px;"><use xlink:href="#iconImage"></use></svg>
                            </button>
                            <input type="file" class="fn__none image-upload-input" accept="image/*" multiple>
                        </div>
                        <button class="b3-button b3-button--text b3-tooltips b3-tooltips__n fn__flex fn__flex-center main_save_btn" data-type="save" aria-label="${adaptHotkey('⌘Enter')}" style="padding: 4px 8px; gap: 4px;">
                            <span>${i18n.note.save}</span>
                        </button>
                    </div>
                </div>
            </div>`;
    }
} 