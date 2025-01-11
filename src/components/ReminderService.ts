import { Dialog, showMessage, getFrontend } from "siyuan";

interface ReminderData {
    timestamp: number;
    reminderTime: number;
    text: string;
    isCompleted: boolean;
    snoozeCount?: number;
}

export class ReminderService {
    private static STORAGE_KEY = "quicknote-reminders";
    private reminders: ReminderData[] = [];
    private checkInterval: number | null = null;
    private i18n: any;
    private plugin: any;
    private frontend: string;

    private constructor(i18n: any, plugin: any) {
        this.i18n = i18n;
        this.plugin = plugin;
        this.frontend = getFrontend();
    }

    public static async create(i18n: any, plugin: any): Promise<ReminderService> {
        const service = new ReminderService(i18n, plugin);
        await service.loadReminders();
        service.startCheckingReminders();
        return service;
    }

    // 加载保存的提醒
    private async loadReminders() {
        try {
            const stored = await this.plugin.loadData(ReminderService.STORAGE_KEY);
            this.reminders = stored || [];
            // 清理过期的已完成提醒
            this.cleanupCompletedReminders();
        } catch (error) {
            console.error('Error loading reminders:', error);
            this.reminders = [];
        }
    }

    // 保存提醒到插件数据
    private async saveReminders() {
        try {
            // console.log('Saving reminders:', this.reminders);
            await this.plugin.saveData(ReminderService.STORAGE_KEY, this.reminders);
            // console.log('Reminders saved successfully');
        } catch (error) {
            console.error('Error saving reminders:', error);
        }
    }

    // 清理已完成的过期提醒
    private async cleanupCompletedReminders() {
        const now = Date.now();
        this.reminders = this.reminders.filter(reminder => 
            !reminder.isCompleted || reminder.reminderTime > now - 24 * 60 * 60 * 1000
        );
        await this.saveReminders();
    }

    // 开始检查提醒
    private startCheckingReminders() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }

        this.checkInterval = window.setInterval(async () => {
            const now = Date.now();
            let needsSave = false;
            this.reminders.forEach(reminder => {
                if (!reminder.isCompleted && reminder.reminderTime <= now) {
                    this.showReminderNotification(reminder);
                    reminder.isCompleted = true;
                    needsSave = true;
                }
            });
            if (needsSave) {
                await this.saveReminders();
            }
        }, 30000); // 每30秒检查一次
    }

    // 显示提醒通知
    private showReminderNotification(reminder: ReminderData) {
        if (this.frontend === 'browser-desktop' || this.frontend === 'browser-mobile') {
            // 网页端直接显示对话框
            this.showReminderDialog(reminder);
        } else {
            const { Notification } = require('@electron/remote');
            // 桌面端使用系统通知
            const notification = new Notification({
                title: this.i18n.note.reminder,
                body: reminder.text,
                silent: false,
                timeoutType: 'default'
            });

            // 点击通知时显示详细对话框
            notification.on('click', () => {
                this.showReminderDialog(reminder);
            });

            // 关闭通知时标记为完成
            notification.on('close', async () => {
                await this.handleReminderComplete(reminder);
            });

            // 显示通知
            notification.show();
        }
    }

    // 显示提醒详细对话框
    private showReminderDialog(reminder: ReminderData) {
        // 创建提醒对话框
        const dialog = new Dialog({
            title: this.i18n.note.reminder,
            content: `<div class="b3-dialog__content">
                <div style="margin-bottom: 8px; font-weight: bold;">${this.i18n.note.content}:</div>
                <div style="margin-bottom: 16px; color: var(--b3-theme-on-surface);">${reminder.text}</div>
                <div class="fn__flex" style="align-items: center;">
                    <label style="margin-right: 8px;">${this.i18n.note.snooze}:</label>
                    <select class="b3-select fn__flex-1 snooze-select">
                        <option value="0" selected>${this.i18n.note.noSnooze}</option>
                        <option value="10">${this.i18n.note.snooze10Min}</option>
                        <option value="30">${this.i18n.note.snooze30Min}</option>
                        <option value="60">${this.i18n.note.snooze1Hour}</option>
                    </select>
                </div>
            </div>`,
            width: "400px"
        });

        // 添加确认和取消按钮
        const btns = document.createElement("div");
        btns.className = "fn__flex b3-dialog__action";
        btns.innerHTML = `
            <button class="b3-button b3-button--cancel">${this.i18n.note.close}</button>
            <div class="fn__space"></div>
            <button class="b3-button b3-button--text">${this.i18n.note.confirm}</button>
        `;
        dialog.element.querySelector('.b3-dialog__content').appendChild(btns);

        // 绑定按钮事件
        btns.querySelector('.b3-button--cancel').addEventListener('click', async () => {
            dialog.destroy();
            await this.handleReminderComplete(reminder);
        });

        btns.querySelector('.b3-button--text').addEventListener('click', async () => {
            const snoozeSelect = dialog.element.querySelector('.snooze-select') as HTMLSelectElement;
            const snoozeMinutes = parseInt(snoozeSelect.value);
            
            if (snoozeMinutes > 0) {
                // 设置延迟提醒
                const newReminderTime = Date.now() + snoozeMinutes * 60 * 1000;
                const index = this.reminders.findIndex(r => r.timestamp === reminder.timestamp);
                if (index !== -1) {
                    this.reminders[index].reminderTime = newReminderTime;
                    this.reminders[index].isCompleted = false;
                    this.reminders[index].snoozeCount = (this.reminders[index].snoozeCount || 0) + 1;
                    this.saveReminders();
                    showMessage(this.i18n.note.snoozeSet.replace('${minutes}', snoozeMinutes.toString()));
                }
            } else {
                // 不设置延迟提醒,直接完成
                await this.handleReminderComplete(reminder);
            }
            dialog.destroy();
        });
    }

    // 处理提醒完成
    private async handleReminderComplete(reminder: ReminderData) {
        const index = this.reminders.findIndex(r => r.timestamp === reminder.timestamp);
        if (index !== -1) {
            this.reminders[index].isCompleted = true;
            await this.saveReminders();
            
            // 发布提醒完成事件,用于更新历史记录显示
            const event = new CustomEvent('reminder-completed', {
                detail: {
                    timestamp: reminder.timestamp,
                    snoozeCount: reminder.snoozeCount || 0
                }
            });
            window.dispatchEvent(event);
        }
    }

    // 设置提醒
    public async setReminder(timestamp: number, text: string) {
        return new Promise<boolean>((resolve) => {
            const dialog = new Dialog({
                title: this.i18n.note.setReminder,
                content: `<div class="b3-dialog__content">
                    <div class="fn__flex" style="margin-bottom: 16px;">
                        <div style="margin-right: 8px;">${this.i18n.note.reminderTime}:</div>
                        <input type="datetime-local" class="b3-text-field fn__flex-1 reminder-time-input">
                    </div>
                </div>`,
                width: "400px",
                height: "180px"
            });

            // 设置默认时间为当前时间后15分钟
            const defaultTime = new Date(Date.now() + 15 * 60 * 1000);
            const timeInput = dialog.element.querySelector('.reminder-time-input') as HTMLInputElement;
            // 转换为当地时间格式
            const year = defaultTime.getFullYear();
            const month = String(defaultTime.getMonth() + 1).padStart(2, '0');
            const day = String(defaultTime.getDate()).padStart(2, '0');
            const hours = String(defaultTime.getHours()).padStart(2, '0');
            const minutes = String(defaultTime.getMinutes()).padStart(2, '0');
            timeInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;

            // 添加确认和取消按钮
            const btns = document.createElement("div");
            btns.className = "fn__flex b3-dialog__action";
            btns.innerHTML = `
                <button class="b3-button b3-button--cancel">${this.i18n.note.cancel}</button>
                <div class="fn__space"></div>
                <button class="b3-button b3-button--text">${this.i18n.note.confirm}</button>
            `;
            dialog.element.querySelector('.b3-dialog__content').appendChild(btns);

            // 绑定按钮事件
            btns.querySelector('.b3-button--cancel').addEventListener('click', () => {
                dialog.destroy();
                resolve(false);
            });

            btns.querySelector('.b3-button--text').addEventListener('click', async () => {
                const reminderTime = new Date(timeInput.value).getTime();
                if (reminderTime <= Date.now()) {
                    showMessage(this.i18n.note.invalidReminderTime);
                    return;
                }

                this.reminders.push({
                    timestamp,
                    reminderTime,
                    text,
                    isCompleted: false
                });

                dialog.destroy();
                await this.saveReminders();
                showMessage(this.i18n.note.reminderSet);
                resolve(true);
            });
        });
    }

    // 修改提醒时间
    public async updateReminderTime(timestamp: number) {
        const reminder = this.getReminder(timestamp);
        if (!reminder) return false;

        return new Promise<boolean>((resolve) => {
            const dialog = new Dialog({
                title: this.i18n.note.updateReminder,
                content: `<div class="b3-dialog__content">
                    <div class="fn__flex" style="margin-bottom: 16px;">
                        <div style="margin-right: 8px;">${this.i18n.note.reminderTime}:</div>
                        <input type="datetime-local" class="b3-text-field fn__flex-1 reminder-time-input">
                    </div>
                </div>`,
                width: "400px",
                height: "180px"
            });

            // 设置当前提醒时间
            const timeInput = dialog.element.querySelector('.reminder-time-input') as HTMLInputElement;
            const currentDate = new Date(reminder.reminderTime);
            // 转换为当地时间格式
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const day = String(currentDate.getDate()).padStart(2, '0');
            const hours = String(currentDate.getHours()).padStart(2, '0');
            const minutes = String(currentDate.getMinutes()).padStart(2, '0');
            timeInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;

            // 添加确认和取消按钮
            const btns = document.createElement("div");
            btns.className = "fn__flex b3-dialog__action";
            btns.innerHTML = `
                <button class="b3-button b3-button--cancel">${this.i18n.note.cancel}</button>
                <div class="fn__space"></div>
                <button class="b3-button b3-button--text clear-reminder">${this.i18n.note.clearReminder}</button>
                <div class="fn__space"></div>
                <button class="b3-button b3-button--text save-reminder">${this.i18n.note.confirm}</button>
            `;
            dialog.element.querySelector('.b3-dialog__content').appendChild(btns);

            // 绑定按钮事件
            btns.querySelector('.b3-button--cancel').addEventListener('click', () => {
                dialog.destroy();
                resolve(false);
            });

            btns.querySelector('.clear-reminder').addEventListener('click', async () => {
                await this.deleteReminder(timestamp);
                this.plugin.renderDockHistory();
                dialog.destroy();
                showMessage(this.i18n.note.reminderCleared);
                resolve(false);
            });

            btns.querySelector('.save-reminder').addEventListener('click', async () => {
                const newReminderTime = new Date(timeInput.value).getTime();
                if (newReminderTime <= Date.now()) {
                    showMessage(this.i18n.note.invalidReminderTime);
                    return;
                }

                // 更新提醒时间
                const index = this.reminders.findIndex(r => r.timestamp === timestamp);
                if (index !== -1) {
                    this.reminders[index].reminderTime = newReminderTime;
                    this.reminders[index].isCompleted = false; // 重置完成状态
                    await this.saveReminders();
                    showMessage(this.i18n.note.reminderUpdated);
                }

                dialog.destroy();
                resolve(true);
            });
        });
    }

    // 获取特定小记的提醒（返回完整的提醒信息）
    public getReminder(timestamp: number): ReminderData | null {
        return this.reminders.find(r => r.timestamp === timestamp && !r.isCompleted) || null;
    }

    // 删除提醒
    public async deleteReminder(timestamp: number) {
        this.reminders = this.reminders.filter(r => r.timestamp !== timestamp);
        await this.saveReminders();
    }

    // 清理资源
    public destroy() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
} 