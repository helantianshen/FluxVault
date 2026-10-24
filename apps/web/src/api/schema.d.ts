/** 此文件由 OpenAPI 契约自动生成，禁止手动编辑 */
export interface paths {
    "/admin/v1/files": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 分页列出文件
         * @description 管理员可以列出所有文件。按创建时间倒序，同时间按 ID 倒序。参数不能重复或使用未声明字段
         */
        get: operations["adminListFiles"];
        put?: never;
        /**
         * 代理上传文件
         * @description 请求体为文件原始字节，Content-Type 表示媒体类型。先建立 pending，上传成功后 ready。失败返回 error.file_id 供管理员排查。此阶段 mock 单文件最多 8 MiB，总量 32 MiB；不表示生产全局限制。private 为默认值；不支持私有的实例拒绝 private。Public 入口需要 upload scope
         */
        post: operations["adminUploadFile"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/v1/files/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 读取文件记录
         * @description 可查看 pending、ready、deleting 和安全错误代码
         */
        get: operations["adminGetFile"];
        put?: never;
        post?: never;
        /**
         * 删除文件或重试删除
         * @description Public 需要 delete scope 且拥有该文件。pending 不允许删除，须人工排查。先进入 deleting，Telegram 只移除元数据，其他实例先删除远端再清理元数据。失败保留 deleting 与定位信息，可重复 DELETE 重试
         */
        delete: operations["adminDeleteFile"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/v1/files/{id}/content": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 下载文件内容
         * @description 只有 ready 可下载。public 可匿名下载；private 需要所属 Key 的 read scope 或 Admin 入口的管理员 JWT。无权访问 private 返回 404。有 Authorization 时无效令牌仍返回 401。mock 的 auto 使用 proxy，direct 明确返回 422；不签发虚假预签名 URL。响应不缓存，不支持 Range 或断点续传
         */
        get: operations["adminDownloadFile"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/v1/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 管理员登录
         * @description mock 管理员在进程启动时由环境配置初始化；D1 管理员仅在空表中首次初始化，之后复用已保存的摘要，无公开注册或初始化端点。共享的进程级保护最多每分钟 10 次登录尝试，不是生产分布式限流。Token 仅保存在前端内存，退出或刷新清除本地 Token
         */
        post: operations["adminLogin"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/v1/system": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 查看运行环境 */
        get: operations["adminGetSystem"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/v1/instances": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 列出存储实例 */
        get: operations["adminListInstances"];
        put?: never;
        /** 添加存储实例 */
        post: operations["adminCreateInstance"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/v1/instances/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * 删除没有关联文件的实例
         * @description 被任意状态文件引用时返回 409
         */
        delete: operations["adminDeleteInstance"];
        options?: never;
        head?: never;
        /**
         * 修改实例名称或启用状态
         * @description 禁用只拒绝新上传；已存在文件仍可读取与删除。Provider 与私有访问能力不可修改，避免已有文件发生可见性变化
         */
        patch: operations["adminUpdateInstance"];
        trace?: never;
    };
    "/admin/v1/keys": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 列出 API Key 安全信息 */
        get: operations["adminListKeys"];
        put?: never;
        /** 创建 API Key */
        post: operations["adminCreateKey"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/v1/keys/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * 启用、禁用或永久撤销密钥
         * @description revoked 为永久终态；不删除 Key ID 及其文件归属。disabled 可恢复。变更在后续请求认证时生效
         */
        patch: operations["adminSetKeyStatus"];
        trace?: never;
    };
    "/admin/v1/keys/{id}/rotate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 轮换 API Key
         * @description 保持 Key ID 与状态，立即替换密钥哈希；旧密钥失效，不提供过渡期。已撤销的 Key 不允许轮换
         */
        post: operations["adminRotateKey"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        Error: {
            error: {
                code: string;
                message: string;
                file_id?: string;
            };
        };
        File: {
            /** Format: uuid */
            id: string;
            /** @description UTF-8 最多 255 字节，不含路径分隔符或控制字符。 */
            name: string;
            content_type: string;
            size: number;
            instance_id: string;
            owner_id: string;
            /** @enum {string} */
            visibility: "private" | "public";
            /** @enum {string} */
            state: "pending" | "ready" | "deleting";
            /** @description 安全错误代码；空字符串表示没有记录错误。 */
            last_error: string;
            /** Format: date-time */
            created_at: string;
            /** Format: date-time */
            updated_at: string;
        };
        FilePage: {
            items: components["schemas"]["File"][];
            total: number;
            limit: number;
            offset: number;
        };
        LoginInput: {
            username: string;
            /** Format: password */
            password: string;
        };
        LoginResult: {
            access_token: string;
            /** @constant */
            token_type: "Bearer";
            /** Format: date-time */
            expires_at: string;
        };
        System: {
            /** @enum {string} */
            mode: "mock" | "d1";
            /** @enum {string} */
            backend: "go" | "worker-ts";
            version: string;
            /** @constant */
            max_file_bytes: 8388608;
            /**
             * @description mock 总量限制；d1 模式为 null，实际容量由 Provider 决定
             * @enum {integer|null}
             */
            max_total_bytes: 33554432 | null;
            /** @enum {string} */
            database: "memory" | "d1";
            real_providers: boolean;
        };
        Instance: {
            id: string;
            name: string;
            /** @enum {string} */
            provider: "s3" | "telegram" | "github";
            private_supported: boolean;
            secret_ref: string;
            enabled: boolean;
            /** Format: date-time */
            created_at: string;
        };
        InstanceList: {
            items: components["schemas"]["Instance"][];
        };
        CreateInstance: {
            name: string;
            /** @enum {string} */
            provider: "s3" | "telegram" | "github";
            /** @description 实例是否具备真实私有访问能力。mock 仅模拟此策略，真实接入时必须核验上游权限。 */
            private_supported: boolean;
            secret_ref: string;
        };
        UpdateInstance: {
            name?: string;
            enabled?: boolean;
        };
        APIKey: {
            /** Format: uuid */
            id: string;
            name: string;
            prefix: string;
            scopes: ("upload" | "read" | "delete")[];
            /** @enum {string} */
            status: "enabled" | "disabled" | "revoked";
            expires_at: string | null;
            /** Format: date-time */
            created_at: string;
        };
        KeyList: {
            items: components["schemas"]["APIKey"][];
        };
        CreateKey: {
            name: string;
            scopes: ("upload" | "read" | "delete")[];
            /**
             * @description 默认永不过期；指定时必须晚于当前时间
             * @default null
             */
            expires_at: string | null;
        };
        KeySecret: {
            api_key: components["schemas"]["APIKey"];
            /** @description 仅本次响应展示。不可记录日志或在前端持久保存。 */
            secret: string;
        };
        UpdateKey: {
            /** @enum {string} */
            status: "enabled" | "disabled" | "revoked";
        };
    };
    responses: {
        /** @description 请求失败。error.code 是稳定机器代码，error.message 是可本地化说明。上传或删除失败时可包含 file_id 供排查。状态码包括 400、401、403、404、409、413、422、429、500、502、503，具体语义见操作说明。 */
        Error: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
    };
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    adminListFiles: {
        parameters: {
            query?: {
                /** @description 文件名包含搜索，最多 50 UTF-8 字节。 */
                q?: string;
                /** @description state */
                state?: "pending" | "ready" | "deleting";
                /** @description visibility */
                visibility?: "private" | "public";
                /** @description instance_id */
                instance_id?: string;
                /** @description limit */
                limit?: number;
                /** @description offset */
                offset?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 成功 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FilePage"];
                };
            };
            default: components["responses"]["Error"];
        };
    };
    adminUploadFile: {
        parameters: {
            query: {
                /** @description 文件名 */
                name: string;
                /** @description 目标存储实例 */
                instance_id: string;
                /** @description visibility */
                visibility?: "private" | "public";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "*/*": string;
            };
        };
        responses: {
            /** @description 内容与元数据均已就绪 */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["File"];
                };
            };
            default: components["responses"]["Error"];
        };
    };
    adminGetFile: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 稳定资源 ID。 */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 成功 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["File"];
                };
            };
            default: components["responses"]["Error"];
        };
    };
    adminDeleteFile: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 稳定资源 ID。 */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 删除完成，无响应体 */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            default: components["responses"]["Error"];
        };
    };
    adminDownloadFile: {
        parameters: {
            query?: {
                /** @description mode */
                mode?: "auto" | "proxy" | "direct";
            };
            header?: never;
            path: {
                /** @description 稳定资源 ID。 */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 流式文件内容，Content-Disposition 为 attachment。 */
            200: {
                headers: {
                    /** @description 浏览器以附件处理，文件名经过编码。 */
                    "Content-Disposition"?: string;
                    "Cache-Control"?: "no-store";
                    [name: string]: unknown;
                };
                content: {
                    "*/*": string;
                };
            };
            default: components["responses"]["Error"];
        };
    };
    adminLogin: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LoginInput"];
            };
        };
        responses: {
            /** @description 成功 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LoginResult"];
                };
            };
            default: components["responses"]["Error"];
        };
    };
    adminGetSystem: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 成功 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["System"];
                };
            };
            default: components["responses"]["Error"];
        };
    };
    adminListInstances: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 成功 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InstanceList"];
                };
            };
            default: components["responses"]["Error"];
        };
    };
    adminCreateInstance: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateInstance"];
            };
        };
        responses: {
            /** @description 成功 */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Instance"];
                };
            };
            default: components["responses"]["Error"];
        };
    };
    adminDeleteInstance: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 稳定资源 ID。 */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 已删除 */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            default: components["responses"]["Error"];
        };
    };
    adminUpdateInstance: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 稳定资源 ID。 */
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateInstance"];
            };
        };
        responses: {
            /** @description 成功 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Instance"];
                };
            };
            default: components["responses"]["Error"];
        };
    };
    adminListKeys: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 成功 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["KeyList"];
                };
            };
            default: components["responses"]["Error"];
        };
    };
    adminCreateKey: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateKey"];
            };
        };
        responses: {
            /** @description 成功 */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["KeySecret"];
                };
            };
            default: components["responses"]["Error"];
        };
    };
    adminSetKeyStatus: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 稳定资源 ID。 */
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateKey"];
            };
        };
        responses: {
            /** @description 成功 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["APIKey"];
                };
            };
            default: components["responses"]["Error"];
        };
    };
    adminRotateKey: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description 稳定资源 ID。 */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 成功 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["KeySecret"];
                };
            };
            default: components["responses"]["Error"];
        };
    };
}
