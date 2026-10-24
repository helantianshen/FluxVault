import { useState, useDeferredValue, useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Upload,
  Search,
  RefreshCw,
  X,
  Lock,
  Globe,
  ArrowDownWideNarrow,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";
import { Select } from "../../components/ui/select";
import { LoadingState, ErrorState, EmptyState } from "../../components/states";
import { useMediaQuery } from "../../lib/use-media-query";
import { useFiles } from "./queries";
import { useInstances } from "../instances/queries";
import { FileDetails } from "./file-details";
import { FileIcon, FileBadge } from "./file-presentation";
import { ProviderLabel } from "../instances/instance-presentation";
import { UploadDialog } from "./upload-dialog";
import { errorMessage, formatBytes, formatTime } from "../../lib/utils";
import type { VaultFile } from "../../api/types";
export function FilesPage() {
  const [search, setSearch] = useState("");
  const query = useDeferredValue(search);
  const [state, setState] = useState("");
  const [instanceID, setInstanceID] = useState("");
  const [visibility, setVisibility] = useState("");
  const [offset, setOffset] = useState(0);
  const [selectedID, setSelectedID] = useState<string | null>(null);
  const [detailClosed, setDetailClosed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [noticeHidden, setNoticeHidden] = useState(
    () => sessionStorage.getItem("fluxvault.mock-notice") === "dismissed",
  );
  const searchRef = useRef<HTMLInputElement>(null);
  const mobile = useMediaQuery("(max-width: 1050px)");
  const reduced = useReducedMotion();
  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      )
        return;
      if (event.key !== "/") return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, select, textarea, [contenteditable]")) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"]'))
        return;
      event.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);
  const params = new URLSearchParams({ limit: "20", offset: String(offset) });
  if (query) params.set("q", query);
  if (state) params.set("state", state);
  if (instanceID) params.set("instance_id", instanceID);
  if (visibility) params.set("visibility", visibility);
  const result = useFiles(params);
  const total = result.data?.total;
  useEffect(() => {
    if (!result.isSuccess || result.isFetching || total === undefined) return;
    // 删除或刷新后仅校正越界页，保留仍然有效的当前页。
    const lastOffset = Math.max(0, Math.ceil(total / 20) - 1) * 20;
    setOffset((current) => Math.min(current, lastOffset));
  }, [total, result.isSuccess, result.isFetching]);
  const instances = useInstances();
  const selected =
    result.data?.items.find((file) => file.id === selectedID) ??
    (!detailClosed ? result.data?.items[0] : undefined);
  const choose = (file: VaultFile) => {
    setSelectedID(file.id);
    setDetailClosed(false);
    if (mobile) setMobileOpen(true);
  };
  const instance = instances.data?.items.find(
    (item) => item.id === selected?.instance_id,
  );
  const closeDetail = () => {
    setDetailClosed(true);
    setSelectedID(null);
    setMobileOpen(false);
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>文件</h1>
          <p>一个文件入口，连接你的所有存储。</p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Upload />
          上传文件
        </Button>
      </div>
      {!noticeHidden && (
        <div className="demo-notice">
          <Info />
          <span>当前使用 Mock 存储。文件和记录会在后端重启后清空。</span>
          <span className="notice-tag">MOCK</span>
          <button
            type="button"
            className="icon-button notice-dismiss"
            aria-label="关闭 Mock 提示"
            onClick={() => {
              setNoticeHidden(true);
              sessionStorage.setItem("fluxvault.mock-notice", "dismissed");
            }}
          >
            <X />
          </button>
        </div>
      )}
      <div className="file-tabs" role="group" aria-label="文件状态筛选">
        {[
          ["", "全部文件"],
          ["pending", "待完成"],
          ["deleting", "删除中"],
        ].map(([value, title]) => (
          <button
            key={value}
            className={`file-tab ${state === value ? "selected" : ""}`}
            aria-pressed={state === value}
            onClick={() => {
              setState(value);
              setOffset(0);
            }}
          >
            {state === value && (
              <motion.span
                layoutId="file-tab-underline"
                className="tab-underline"
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              />
            )}
            {title}
            {state === value && result.data && <span>{result.data.total}</span>}
          </button>
        ))}
      </div>
      <div className="toolbar">
        <label className="search-field">
          <Search />
          <input
            ref={searchRef}
            aria-label="搜索文件名称"
            placeholder="搜索文件名称…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setOffset(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape" && search) {
                setSearch("");
                setOffset(0);
              }
            }}
          />
          {search ? (
            <button
              type="button"
              className="icon-button search-clear"
              aria-label="清除搜索"
              onClick={() => {
                setSearch("");
                setOffset(0);
                searchRef.current?.focus();
              }}
            >
              <X />
            </button>
          ) : (
            <kbd aria-hidden="true">/</kbd>
          )}
        </label>
        <Select
          label="按存储实例筛选"
          value={instanceID}
          onValueChange={(value) => {
            setInstanceID(value);
            setOffset(0);
          }}
          items={[
            { value: "", label: "全部存储实例" },
            ...(instances.data?.items.map((i) => ({
              value: i.id,
              label: i.name,
            })) ?? []),
          ]}
        />
        <Select
          label="按可见性筛选"
          value={visibility}
          onValueChange={(value) => {
            setVisibility(value);
            setOffset(0);
          }}
          items={[
            { value: "", label: "全部可见性" },
            { value: "private", label: "私有" },
            { value: "public", label: "公开" },
          ]}
        />
        <button
          className="icon-button"
          aria-label="刷新列表"
          disabled={result.isFetching}
          onClick={() => {
            void result.refetch();
          }}
        >
          <RefreshCw className={result.isFetching ? "refreshing" : ""} />
        </button>
      </div>
      {result.isPending ? (
        <LoadingState />
      ) : result.error ? (
        <ErrorState
          message={errorMessage(result.error)}
          retry={() => {
            void result.refetch();
          }}
        />
      ) : (
        <div
          className={`file-workspace ${result.isPlaceholderData ? "is-refetching" : ""}`}
        >
          <div className="file-list">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>文件名称</th>
                    <th>存储实例</th>
                    <th>状态</th>
                    <th>大小</th>
                    <th className="visibility-column">可见性</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.items.map((file) => (
                    <tr
                      key={file.id}
                      className={selected?.id === file.id ? "selected" : ""}
                    >
                      <td>
                        <button
                          className="filename-button"
                          aria-label={`查看 ${file.name} 详情`}
                          onClick={() => choose(file)}
                        >
                          <FileIcon file={file} />
                          <span>
                            <span className="filename" title={file.name}>
                              {file.name}
                            </span>
                            <span className="file-date">
                              {formatTime(file.created_at)}
                            </span>
                          </span>
                        </button>
                      </td>
                      <td>
                        <ProviderLabel
                          instance={instances.data?.items.find(
                            (i) => i.id === file.instance_id,
                          )}
                        />
                      </td>
                      <td>
                        <FileBadge file={file} />
                      </td>
                      <td className="mono">{formatBytes(file.size)}</td>
                      <td className="visibility-cell">
                        <span className="visibility">
                          {file.visibility === "private" ? <Lock /> : <Globe />}
                          {file.visibility === "private" ? "私有" : "公开"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {result.data.items.length === 0 && (
              <EmptyState
                title="没有匹配的文件"
                action={
                  search || instanceID || visibility || state ? (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSearch("");
                        setState("");
                        setInstanceID("");
                        setVisibility("");
                        setOffset(0);
                      }}
                    >
                      清除筛选
                    </Button>
                  ) : undefined
                }
                description={
                  search || instanceID || visibility || state
                    ? "尝试其他条件，或清除筛选。"
                    : "点击上传文件，开始使用统一文件管理。"
                }
              />
            )}
            <div className="table-footer">
              <span>
                显示 {result.data.items.length} 个文件，共 {result.data.total}{" "}
                个
              </span>
              {result.data.total > 20 ? (
                <div className="pagination">
                  <button
                    aria-label="上一页"
                    className="icon-button"
                    disabled={offset === 0}
                    onClick={() => setOffset(Math.max(0, offset - 20))}
                  >
                    <ChevronLeft />
                  </button>
                  <span>{Math.floor(offset / 20) + 1}</span>
                  <button
                    aria-label="下一页"
                    className="icon-button"
                    disabled={offset + 20 >= result.data.total}
                    onClick={() => setOffset(offset + 20)}
                  >
                    <ChevronRight />
                  </button>
                </div>
              ) : (
                <span>
                  按上传时间排序
                  <ArrowDownWideNarrow />
                </span>
              )}
            </div>
          </div>
          <AnimatePresence initial={false} mode="wait">
            {selected && !detailClosed && !mobile && (
              <motion.aside
                key="detail-panel"
                className="detail-panel"
                aria-label="文件详情"
                initial={{ opacity: reduced ? 1 : 0.5, x: reduced ? 0 : 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.18 }}
              >
                <div className="detail-top">
                  <span>文件详情</span>
                  <button
                    className="icon-button"
                    aria-label="关闭文件详情"
                    onClick={closeDetail}
                  >
                    <X />
                  </button>
                </div>
                <motion.div
                  key={selected.id}
                  initial={{ opacity: reduced ? 1 : 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: reduced ? 0 : 0.16 }}
                >
                  <FileDetails
                    file={selected}
                    instance={instance}
                    onDeleted={closeDetail}
                  />
                </motion.div>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      )}
      {mobile && selected && (
        <Dialog
          open={mobileOpen}
          onOpenChange={setMobileOpen}
          title="文件详情"
          description="文件元数据与可用操作"
          className="drawer-content"
        >
          <FileDetails
            file={selected}
            instance={instance}
            onDeleted={closeDetail}
          />
        </Dialog>
      )}
      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={(file) => {
          setSearch("");
          setState("");
          setInstanceID("");
          setVisibility("");
          setOffset(0);
          setSelectedID(file.id);
          setDetailClosed(false);
        }}
      />
    </>
  );
}
