import { Info } from "lucide-react";
import { useSystem } from "./queries";
import { LoadingState, ErrorState } from "../../components/states";
import { API_URL } from "../../api/client";
import { errorMessage, formatBytes } from "../../lib/utils";
export function SettingsPage() {
  const query = useSystem();
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>系统设置</h1>
          <p>查看当前服务的运行与认证配置。</p>
        </div>
      </div>
      {query.isPending ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState
          message={errorMessage(query.error)}
          retry={() => {
            void query.refetch();
          }}
        />
      ) : (
        <section className="settings">
          <h2>运行环境</h2>
          <dl className="settings-list">
            <div>
              <dt>当前模式</dt>
              <dd>
                <span className="badge neutral">
                  {query.data.mode === "d1" ? "D1 持久化" : "Mock 演示"}
                </span>
              </dd>
            </div>
            <div>
              <dt>后端实现</dt>
              <dd>
                {query.data.backend === "go"
                  ? "Go Native"
                  : "TypeScript Worker"}
                <small>版本 {query.data.version}</small>
              </dd>
            </div>
            <div>
              <dt>数据库</dt>
              <dd>
                {query.data.database === "d1"
                  ? "Cloudflare D1"
                  : "进程内模拟数据"}
                <small>
                  {query.data.database === "d1"
                    ? "元数据已持久化，文件正文由存储实例管理"
                    : "尚未连接 Cloudflare D1，重启后清空"}
                </small>
              </dd>
            </div>
            <div>
              <dt>管理员登录</dt>
              <dd>
                12 小时有效<small>Token 仅保存在内存，刷新后重新登录</small>
              </dd>
            </div>
            <div>
              <dt>文件上传上限</dt>
              <dd>
                {formatBytes(query.data.max_file_bytes)} / 文件
                <small>
                  {query.data.max_total_bytes === null
                    ? "应用不限制总量，实际容量由存储 Provider 决定"
                    : `对象存储总量 ${formatBytes(query.data.max_total_bytes)}，不代表真实 Provider 限制`}
                </small>
              </dd>
            </div>
            <div>
              <dt>凭据管理</dt>
              <dd>环境变量 / Cloudflare Secret</dd>
            </div>
            <div>
              <dt>管理 API 地址</dt>
              <dd className="mono break-all">{API_URL}</dd>
            </div>
          </dl>
          <div className="inline-note">
            <Info />
            运行配置由部署环境管理，此页面只展示配置状态。
          </div>
        </section>
      )}
    </>
  );
}
