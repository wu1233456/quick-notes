
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

/**
 * 获取思源笔记的同步配置
 * @returns Promise<boolean> 是否开启了同步
 */
export async function getSyncEnabled(): Promise<boolean> {
    try {
        const response = await fetch('/api/system/getConf', {
            method: 'POST',
        });
        const result = await response.json();
        if (result.code === 0 && result.data) {
            return result.data.sync?.enabled === true;
        }
        return false;
    } catch (error) {
        console.error('获取同步配置失败:', error);
        return false;
    }
} 