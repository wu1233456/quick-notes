import { fetchPost, fetchSyncPost } from "siyuan";
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

    constructor(plugin: any, historyService: HistoryService, i18n: any) {
        this.plugin = plugin;
        this.historyService = historyService;
        this.i18n = i18n;
    }

    private async pushMsg(msg: string) {
        fetchPost("/api/notification/pushMsg", { msg: msg });
    }

    private async pushErrMsg(msg: string) {
        fetchPost("/api/notification/pushErrMsg", { msg: msg });
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
            await this.pushErrMsg(`正重新登录，请重新再试`);
            return false;
        } else if (resData.code !== 0) {
            await this.pushErrMsg(`Server error! msg: ${resData.message}`);
        }
        return resData.code == 0;
    }

    private getConfig() {
        return {
            username: this.plugin.settingUtils.get("flomoUsername"),
            password: this.plugin.settingUtils.get("flomoPassword"),
            lastSyncTime: this.plugin.settingUtils.get("flomoLastSyncTime"),
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
            await this.pushErrMsg("用户名或密码为空，重新配置后再试");
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
                throw new Error(`同步失败，请重试：${resData.message}`);
            } else if (resData.code == -1) {
                throw new Error(`请检查用户名和密码，或手动更新accessToken后再试`);
            } else if (resData.code !== 0) {
                throw new Error(`Server error! msg: ${resData.message}`);
            } else {
                let newConfig = this.getConfig();
                newConfig.accessToken = resData.data["access_token"];
                await this.saveConfig(newConfig);
            }
            return true;
        } catch (error) {
            await this.pushErrMsg(error.toString());
            return false;
        }
    }

    private async getLatestMemos() {
        let allRecords = [];
        let config = this.getConfig();
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

                    // 过滤已删除的和已存在的记录
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
                await this.pushErrMsg("请检查错误：" + error)
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
            await this.pushErrMsg(error.toString())
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
        try {
            let memos = await this.getLatestMemos();
            if (memos.length == 0) {
                let nowTimeText = moment().format('YYYY-MM-DD HH:mm:ss');
                console.warn("暂无新数据-" + nowTimeText)
                return;
            }

            console.log("开始同步，共有", memos.length, "条数据");
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
                        timestamp: createdTimestamp // 添加时间戳
                    });
                    console.log("同步成功：", content.substring(0, 50) + "...");
                } catch (error) {
                    console.error("同步单条数据失败：", error);
                    await this.pushErrMsg(`同步单条数据失败：${error.toString()}`);
                    // 继续处理下一条
                    continue;
                }
            }

            // 记录同步时间
            let nowTimeText = moment().format('YYYY-MM-DD HH:mm:ss');
            let config = this.getConfig();
            config.lastSyncTime = nowTimeText;
            await this.saveConfig(config);

            await this.pushMsg(`同步完成，共同步 ${memos.length} 条数据`);
            return true;
        } catch (error) {
            console.error(error);
            await this.pushErrMsg(error.toString());
            return false;
        }
    }
} 