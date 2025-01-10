/**
 * 根据操作系统调整快捷键显示
 * @param hotkey 快捷键字符串
 * @returns 调整后的快捷键字符串
 */
export function adaptHotkey(hotkey: string): string {
    const isMac = /Mac/.test(navigator.platform);
    if (!isMac) {
        return hotkey.replace('⌘', 'Ctrl');
    }
    return hotkey;
} 