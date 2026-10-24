# RustFS S3 实例联调

日期：2026-10-21 Asia/Shanghai。

用户授权：仅测试提供的 RustFS S3 实例，桶 fluxvault-test。验证 Go 和 Worker 真实适配器的上传、下载字节一致性及删除，仅操作本轮唯一前缀下的对象；不测试 GitHub/TG，不启用产品真实入口，不修改 bucket 权限或其他对象。

环境：本地 Linux x86_64、Bash、Go 1.27.1、Node 24.20.0；项目 /home/helan/own/FluxVault。当前 HTTP 端点匿名 HEAD 返回 403。region 尚未提供，先使用现有示例 us-east-1，通过签名请求验证。

凭据只在项目外受限临时文件和进程内使用，不记录到此文件、源码或日志。测试脚本必须默认不运行真实操作；临时 workerd 不部署。

状态：完成。Go 和本地 workerd 均真实上传/下载 65,537 字节并逐字节核对通过，PUT/GET/DELETE/GET 分别返回 200/200/204/404；us-east-1 可用。两个本轮对象当前均不可读取，未核查桶历史版本。

保留显式 opt-in 联调入口：Go live_s3_test.go、Worker test-support/live-s3.worker.ts、scripts/test-s3-live-worker.mjs，默认不会连接外部账户。默认 mock 及业务适配器未改动。

Go Provider 测试与 vet、Worker typecheck/lint、新文件格式检查通过。临时凭据文件已删除，项目扫描未发现 Secret 原文。未做 D1/生产部署/GitHub/TG/负载验收。详细对象键、结果和边界见 docs/specs/verification.md 本日 S3 章节。
