import { fetchPost, showMessage } from "siyuan";
import { Md5 } from "ts-md5";
import moment from "moment";
import { HistoryService } from "./HistoryService";

const FLOMO_STORAGE_NAME = "flomo-sync-config";
const FLOMO_ASSETS_DIR = "assets/flomo";
const USG = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36 Edg/116.0.1938.76";

export class FlomoService {
    private plugin: any;
    private historyService: HistoryService;
    private i18n: any;
    private autoSyncTimer: NodeJS.Timeout | null = null;

    constructor(plugin: any, historyService: HistoryService, i18n: any) {
        this.plugin = plugin;
        this.historyService = historyService;
        this.i18n = i18n;
        this.initAutoSync();
    }

    public initAutoSync() {
        // 检查是否启用了自动同步
        const isAutoSyncEnabled = this.plugin.settingUtils.get("flomoAutoSync");
        if (isAutoSyncEnabled) {
            console.log("准备开始同步啦")
            this.startAutoSync();
        }
    }

    // 处理设置变化
    public handleSettingChanged() {
        const isAutoSyncEnabled = this.plugin.settingUtils.get("flomoAutoSync");
        const syncInterval = this.plugin.settingUtils.get("flomoSyncInterval");
        
        if (isAutoSyncEnabled) {
            // 如果开启了自动同步，重新启动定时器
            this.startAutoSync();
        } else {
            // 如果关闭了自动同步，停止定时器
            this.stopAutoSync();
        }
    }

    private startAutoSync() {
        // 先停止现有的定时器
        this.stopAutoSync();
        
        // 获取同步间隔时间（秒）
        const syncInterval = this.plugin.settingUtils.get("flomoSyncInterval") || 60;
        
        // 启动新的定时器
        this.autoSyncTimer = setInterval(async () => {
            const isFlomoEnabled = this.plugin.settingUtils.get("flomoEnabled");
            const isAutoSyncEnabled = this.plugin.settingUtils.get("flomoAutoSync");
            
            if (isFlomoEnabled && isAutoSyncEnabled) {
                console.log(this.i18n.note.flomoSync.autoSyncStart);
                const count = await this.sync();
                if (count == 0) {
                    this.plugin.renderDockHistory();
                }
            }
        }, syncInterval * 1000);
    }

    public stopAutoSync() {
        if (this.autoSyncTimer) {
            clearInterval(this.autoSyncTimer);
            this.autoSyncTimer = null;
        }
    }

    private createSign2(param: any) {
        //from flomo web
        const SECRET = 'dbbc3dd73364b4084c3a69346e0ce2b2'
        const sortParam = {};
        Object.keys(param).sort().forEach(function(key) {
            sortParam[key] = param[key];
        });

        let paramString = ''
        for (let key in sortParam) {
            let value = sortParam[key]
            if (typeof value === 'undefined' || (!value && value !== 0)) continue

            if (Array.isArray(value)) {
                value.sort(function (a, b) {
                    return a && b ? a.toString().localeCompare(b.toString()) : 0
                })

                for (let index in value) {
                    let v = value[index]
                    paramString += key + '[]=' + v + '&'
                }
            } else {
                paramString += key + '=' + value + '&'
            }
        }
        paramString = paramString.substring(0, paramString.length - 1)
        let sign = new Md5().appendStr(paramString + SECRET).end();
        return sign
    }

    private async check_authorization_and_reconnect(resData: any) {
        if (resData.code == -10) {
            await this.connect();
            showMessage(this.i18n.note.flomoSync.retryLogin);
            return false;
        } else if (resData.code !== 0) {
            showMessage(this.i18n.note.flomoSync.serverError.replace('${message}', resData.message));
        }
        return resData.code == 0;
    }

    private getConfig() {
        const lastSyncTime = this.plugin.settingUtils.get("flomoLastSyncTime") || moment().startOf('day').format('YYYY-MM-DD HH:mm:ss');
        return {
            username: this.plugin.settingUtils.get("flomoUsername"),
            password: this.plugin.settingUtils.get("flomoPassword"),
            lastSyncTime: lastSyncTime,
            accessToken: this.plugin.settingUtils.get("flomoAccessToken")
        };
    }

    private async saveConfig(config: any) {
        await this.plugin.settingUtils.set("flomoUsername", config.username);
        await this.plugin.settingUtils.set("flomoPassword", config.password);
        await this.plugin.settingUtils.set("flomoLastSyncTime", config.lastSyncTime);
        await this.plugin.settingUtils.set("flomoAccessToken", config.accessToken);
    }

    private async connect() {
        let config = this.getConfig();
        if (!config.username || !config.password) {
            showMessage(this.i18n.note.flomoSync.emptyAccount);
            return false;
        }
        let timestamp = Math.floor(Date.now() / 1000).toFixed();
        let url = "https://flomoapp.com/api/v1/user/login_by_email"
        let data = {
            "api_key": "flomo_web",
            "app_version": "2.0",
            "email": config.username,
            "password": config.password,
            "timestamp": timestamp,
            "webp": "1",
        }
        data["sign"] = this.createSign2(data);
        try {
            let response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.accessToken}`,
                    'Content-Type': 'application/json',
                    'User-Agent': USG
                },
                body: JSON.stringify(data)
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const resData = await response.json();
            if (resData.code == -10) {
                throw new Error(this.i18n.note.flomoSync.retryLogin);
            } else if (resData.code == -1) {
                throw new Error(this.i18n.note.flomoSync.loginFailed);
            } else if (resData.code !== 0) {
                throw new Error(this.i18n.note.flomoSync.serverError.replace('${message}', resData.message));
            } else {
                let newConfig = this.getConfig();
                newConfig.accessToken = resData.data["access_token"];
                await this.saveConfig(newConfig);
            }
            return true;
        } catch (error) {
            showMessage(error.toString());
            return false;
        }
    }

    private async getLatestMemos() {
        let allRecords = [];
        let config = this.getConfig();
        if (config.username == "" || config.password == "") {
            showMessage(this.i18n.note.flomoSync.emptyAccount);
            return [];
        }
        let lastSyncTime = config.lastSyncTime;

        const LIMIT = "200";
        let today = new Date();
        let latest_updated = moment(lastSyncTime, 'YYYY-MM-DD HH:mm:ss').toDate()
            || moment(today, 'YYYY-MM-DD 00:00:00').toDate();
        let latest_updated_at_timestamp;
        let latest_slug = "";
        
        // 获取已有记录的创建时间列表
        const existingRecords = this.historyService.getCurrentData();
        const existingTimestamps = new Set(existingRecords.map(record => record.timestamp));
        while (true) {
            try {
                latest_updated_at_timestamp = (Math.floor(latest_updated.getTime()) / 1000).toString();
                let ts = Math.floor(Date.now() / 1000).toString();
                console.log("上次更新时间")
                console.log(latest_updated)
                let param = {
                    api_key: "flomo_web",
                    app_version: "2.0",
                    latest_slug: latest_slug,
                    latest_updated_at: latest_updated_at_timestamp,
                    limit: LIMIT,
                    timestamp: ts,
                    tz: "8:0",
                    webp: "1"
                }
                param["sign"] = this.createSign2(param);
                let url = new URL("https://flomoapp.com/api/v1/memo/updated");
                url.search = new URLSearchParams(param).toString();

                let response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${config.accessToken}`,
                        'Content-Type': 'application/json',
                        'User-Agent': USG
                    },
                })
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                
                if (await this.check_authorization_and_reconnect(data)) {
                    let records = data["data"];
                    console.log("records")
                    console.log(records)
                    let noMore = records.length < LIMIT;
                    if (records.length == 0) {
                        break
                    }
                    latest_updated = moment(records[records.length - 1]["updated_at"], 'YYYY-MM-DD HH:mm:ss').toDate()
                    latest_slug = records[records.length - 1]["slug"]

                    // 过滤已删除
                    console.log(lastSyncTime)
                    const newRecords = records.filter(record => {
                        if (record["deleted_at"]) return false;
                        
                        const recordTimestamp = moment(record.created_at, 'YYYY-MM-DD HH:mm:ss').valueOf();
                        // 只保留上次同步时间之后的，且不在已有记录中的
                        return recordTimestamp > moment(lastSyncTime, 'YYYY-MM-DD HH:mm:ss').valueOf() 
                            && !existingTimestamps.has(recordTimestamp);
                    });
                    console.log("newRecords")
                    console.log(newRecords)
                    allRecords = allRecords.concat(newRecords);

                    if (noMore) { //没有更多了
                        break
                    }
                } else {
                    throw new Error(`flomo登录校验失败`);
                }

            } catch (error) {
                // await this.pushErrMsg("请检查错误：" + error)
                throw new Error(`${error}`);
            }
        }

        // 按创建时间排序
        allRecords.sort((a, b) => {
            return moment(a.created_at).valueOf() - moment(b.created_at).valueOf();
        });

        return allRecords;
    }

    private async downloadImgs(imgs: any[]) {
        try {
            await Promise.all(imgs.map(async img => {
                let imgName = img["name"];
                if (!(imgName.endsWith(".png") || imgName.endsWith(".png") || imgName.endsWith(".gif"))) {
                    imgName = imgName + '.png'
                }

                let imgPath = "data/" + FLOMO_ASSETS_DIR + "/" + img["id"] + "_" + imgName;
                let imgRespon = await fetch(img["url"]);
                let fileBlob = await imgRespon.blob();
                await this.addFile(imgPath, fileBlob);
            }));
            return true;
        } catch (error) {
            showMessage(error.toString())
            return false;
        }
    }

    private async addFile(f: string, file: Blob) {
        const fd = new FormData();
        fd.append('path', f);
        fd.append('isDir', 'false');
        fd.append('file', file);
        return await fetch('/api/file/putFile', {
            method: 'POST',
            body: fd
        });
    }

    private convertHtmlToMarkdown(html: string): string {
        // 转换有序列表
        html = html.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, content) => {
            return content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (m, item, index) => {
                return `1. ${item.trim()}\n`;
            });
        });

        // 转换无序列表
        html = html.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, content) => {
            return content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (m, item) => {
                return `- ${item.trim()}\n`;
            });
        });

        // 转换加粗
        html = html.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**');
        html = html.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**');

        // 转换斜体
        html = html.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*');
        html = html.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*');

        // 转换链接
        html = html.replace(/<a[^>]*href=["'](.*?)["'][^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');

        // 转换换行
        html = html.replace(/<br\s*\/?>/gi, '\n');
        html = html.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n');

        // 转换代码块
        html = html.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, '```\n$1\n```');
        html = html.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');

        // 删除其他HTML标签
        html = html.replace(/<[^>]+>/g, '');

        // 修复可能的多余空行
        html = html.replace(/\n\s*\n\s*\n/g, '\n\n');
        html = html.trim();

        return html;
    }

    public async sync() {
        // 添加检查
        const isFlomoEnabled = this.plugin.settingUtils.get("flomoEnabled");
        if (!isFlomoEnabled) {
            showMessage(this.i18n.note.flomoSync.needEnable);
            return 0;
        }

        try {
            let memos = await this.getLatestMemos();
            if (memos.length == 0) {
                let nowTimeText = moment().format('YYYY-MM-DD HH:mm:ss');
                console.log(this.i18n.note.flomoSync.noNewData);
                // 自动同步时不显示提示消息
                if (!this.autoSyncTimer) {
                    showMessage(this.i18n.note.flomoSync.noNewData);
                }
                return;
            }

            console.log(this.i18n.note.flomoSync.syncStart.replace('${count}', memos.length.toString()));
            // 处理每条记录
            for(let memo of memos) {
                try {
                    // 转换 HTML 到 Markdown
                    let content = this.convertHtmlToMarkdown(memo.content);
                    let files = memo.files || [];
                    
                    // 处理图片
                    if (files.length > 0) {
                        const success = await this.downloadImgs(files);
                        if (success) {
                            files.forEach(img => {
                                let imgName = img["name"];
                                if (!(imgName.endsWith(".png") || imgName.endsWith(".png") || imgName.endsWith(".gif"))) {
                                    imgName = imgName + '.png'
                                }
                                let imgMd = "![" + img["name"] + "](" + FLOMO_ASSETS_DIR + "/" + img["id"] + "_" + imgName + ") ";
                                content += imgMd
                            });
                        }
                    }

                    // 获取创建时间的时间戳
                    const createdTimestamp = moment(memo.created_at, 'YYYY-MM-DD HH:mm:ss').valueOf();

                    // 保存到历史记录，包含时间戳
                    await this.historyService.saveContent({
                        text: content,
                        tags: memo.tags || [],
                        timestamp: createdTimestamp
                    });
                    this.plugin.renderDockHistory();
                    console.log("同步成功：", content.substring(0, 50) + "...");
                } catch (error) {
                    console.error(this.i18n.note.flomoSync.syncSingleFailed, error);
                    showMessage(`${this.i18n.note.flomoSync.syncSingleFailed}：${error.toString()}`);
                    continue;
                }
            }

            // 记录同步时间
            let nowTimeText = moment().format('YYYY-MM-DD HH:mm:ss');
            let config = this.getConfig();
            config.lastSyncTime = nowTimeText;
            await this.saveConfig(config);
            showMessage(this.i18n.note.flomoSync.syncSuccess.replace('${count}', memos.length.toString()));
            return memos.length;
        } catch (error) {
            console.error(error);
            // await this.pushErrMsg(this.i18n.note.flomoSync.checkError.replace('${error}', error.toString()));
            return 0;
        }
    }
} 