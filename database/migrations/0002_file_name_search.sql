-- 应用层写入 Unicode 小写名称，避免 SQLite lower 仅处理 ASCII 导致搜索语义变化
-- 对已有数据必须先按应用的 Unicode 小写规则回填；启动检查会拒绝尚未回填的库
ALTER TABLE files ADD COLUMN name_search TEXT NOT NULL DEFAULT '';
