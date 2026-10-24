# 重组后的代码链路审查

日期：2026-10-23，Asia/Shanghai。用户要求继续审查代码链路；本轮仅审查和定向复现，未修改业务源码。

## 覆盖与结论

检查 Go/Worker 启动与显式组装、Public/Admin 认证链、API Key scope/所有权/撤销终态、文件 pending/ready/deleting 流程、内存引用约束、Provider SDK 分派/目标绑定/下载流、前端查询/上传/下载/删除交互。没有发现重组造成的认证链断裂或接口漏挂；确认以下两处既有缺陷，均已复现并在重组前备份中找到原有代码。

### P2：Go 下载流错误被当作完整下载

位置：`apps/server-go/internal/modules/file/handler.go:166-171`。

Handler 忽略 io.CopyBuffer 的读取错误，未以记录的文件长度校验或声明响应完整性。上游在输出部分字节后失败，Handler 正常返回，net/http 可以按部分响应计算 Content-Length；前端 ApiClient.download 只检查 HTTP 成功再读取 Blob，因此无法识别损坏内容。

使用 Go overlay 注入临时测试，不修改项目测试文件。测试使用实际 file.Service / Handler 和内存 Repository，注入会先返回 3 字节、随后返回错误的 ObjectStore 下载流。元数据长度为 8 字节；真实 httptest HTTP 连接得到 status=200、Content-Length=3、received=3、client_read_error=nil。

建议：保留流式响应，检查复制结果与期望长度；让中途失败成为客户端可观察的传输失败，不在响应已提交后追加 JSON 错误。

复现命令：

```bash
cd apps/server-go
env -u FLUXVAULT_S3_TEST_CONFIG go test -overlay=/tmp/fluxvault-chain-review-6kn_ocp7/overlay.json ./internal/modules/file -run '^TestReview' -count=1 -v
```

测试 PASS 表示已确认当前缺陷，并不表示下载完整性通过。

### P2：删除分页末项后留在无法翻回的空页

位置：`apps/web/src/features/files/files-page.tsx:250-256`；关联删除回调位于 `file-details.tsx:33-37` 和 `files-page.tsx:58-62`。

删除后只刷新列表和关闭详情，没有校正 offset。21 条匹配文件、每页 20 条时，在第 2 页删除最后一条后仍请求 offset=20；total 变成 20，又使分页控件隐藏。结果页面显示 0 条，共 20 条，却没有上一页按钮。

使用 Playwright CLI 在本轮隔离启动的 Go mock 和 Vite 服务上验证：创建 21 条 review-* 文件、搜索、切换第二页、经 UI 确认删除唯一文件。实际 DOM：rows=0、previousButtons=0、nextButtons=0，页脚为“显示 0 个文件，共 20 个”，空状态可见。未替换后端响应。

建议：总数变化后把 offset 校正到有效页，或删除成功后回到首页；只要 offset>0，至少保留返回上一页的入口。

## 复现材料与收尾

临时材料：`/tmp/fluxvault-chain-review-6kn_ocp7/`，含 overlay、Go 故障测试、隔离服务脚本、浏览器脚本与源码哈希清单。隔离服务仅监听自动分配的回环端口，使用临时演示凭据；没有连接真实 Provider、读取真实配置或写入既有演示服务。

命名浏览器会话 fluxvault-chain-review 已关闭，隔离 supervisor 收到 SIGTERM 并由现有 localServices 工具清理自己创建的服务和状态目录。既有进程不受影响。未重复运行上一轮全量构建与测试，也未宣称视觉、D1、生产或真实 Provider 验收。

## 后续修复

用户随后授权修复上述两项，已完成最小改动及回归，见 [修复记录](2026-10-23-chain-fixes.md)。本页保留修复前审查证据。
