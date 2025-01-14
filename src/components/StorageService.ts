import { getFile, putFile } from '../api';
import { Plugin } from "siyuan";

export interface StorageData<T> {
    history: T[];
}

export class StorageService {
    private basePath: string = 'data/public/quicknotes';
    private plugin: Plugin;

    constructor(plugin: Plugin) {
        this.plugin = plugin;
        // 确保目录存在
        this.ensureDirectory();
    }

    private async ensureDirectory() {
        try {
            await putFile(this.basePath, true, null);
        } catch (error) {
            console.error('Failed to create directory:', error);
        }
    }

    private getFilePath(filename: string): string {
        return `${this.basePath}/${filename}.json`;
    }

    public async saveData<T>(filename: string, data: StorageData<T>): Promise<void> {
        try {
            const filePath = this.getFilePath(filename);
            const jsonData = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });
            await putFile(filePath, false, blob);
        } catch (error) {
            console.error('Failed to save data:', error);
            throw error;
        }
    }

    public async loadData<T>(filename: string): Promise<StorageData<T> | null> {
        try {
            const filePath = this.getFilePath(filename);
            const response = await getFile(filePath);
            if (!response || response.code === 404) {
                return null;
            }
            // response.data 是实际的文件内容
            return response.data;
        } catch (error) {
            console.error('Failed to load data:', error);
            return null;
        }
    }

    public async migrateDataIfNeeded<T>(filename: string): Promise<StorageData<T> | null> {
        // 尝试从新位置加载数据
        const newData = await this.loadData<T>(filename);
        if (newData) {
            return newData;
        }

        try {
            // 尝试从旧位置加载数据
            const oldData = await this.plugin.loadData(filename);
            if (oldData && oldData.history) {
                // 将旧数据保存到新位置
                await this.saveData<T>(filename, oldData);
                return oldData;
            }
        } catch (error) {
            console.error('Migration failed:', error);
        }

        return null;
    }
} 