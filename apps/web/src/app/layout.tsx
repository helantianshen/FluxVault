import { useSystem } from "../features/settings/queries";
import { FocusScope } from "@radix-ui/react-focus-scope";
import { lazy, Suspense, useState, useEffect } from "react";
import { NavLink, useLocation, Routes, Route, Navigate } from "react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Layers2,
  Files,
  Database,
  KeyRound,
  Settings2,
  Menu,
  ChevronRight,
  LogOut,
  FlaskConical,
  X,
} from "lucide-react";
import { useAuth } from "../features/auth/auth";
const FilesPage = lazy(() =>
  import("../features/files/files-page").then((module) => ({
    default: module.FilesPage,
  })),
);
const InstancesPage = lazy(() =>
  import("../features/instances/instances-page").then((module) => ({
    default: module.InstancesPage,
  })),
);
const KeysPage = lazy(() =>
  import("../features/keys/keys-page").then((module) => ({
    default: module.KeysPage,
  })),
);
const SettingsPage = lazy(() =>
  import("../features/settings/settings-page").then((module) => ({
    default: module.SettingsPage,
  })),
);
import { useMediaQuery } from "../lib/use-media-query";
import { LoadingState } from "../components/states";
const navigation = [
  { path: "/files", title: "文件", icon: Files },
  { path: "/instances", title: "存储实例", icon: Database },
  { path: "/keys", title: "API Key", icon: KeyRound },
  { path: "/settings", title: "系统设置", icon: Settings2 },
];
export function Layout() {
  const system = useSystem();
  const mode = system.data?.mode;
  const environment =
    mode === "d1"
      ? "D1 持久化环境"
      : mode === "mock"
        ? "本地 Mock 环境"
        : "正在读取环境";
  const [menu, setMenu] = useState(false);
  const narrow = useMediaQuery("(max-width: 760px)");
  useEffect(() => {
    if (!menu || !narrow) return;
    document.querySelector<HTMLAnchorElement>(".sidebar nav a")?.focus();
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(false);
        document.querySelector<HTMLButtonElement>(".mobile-menu")?.focus();
      }
    };
    document.addEventListener("keydown", dismiss);
    return () => {
      document.removeEventListener("keydown", dismiss);
      requestAnimationFrame(() =>
        document.querySelector<HTMLButtonElement>(".mobile-menu")?.focus(),
      );
    };
  }, [menu, narrow]);
  const { logout } = useAuth();
  const location = useLocation();
  const reduced = useReducedMotion();
  const title =
    navigation.find((item) => item.path === location.pathname)?.title ?? "文件";
  return (
    <div className="app-shell">
      <a href="#workspace" className="skip-link" inert={narrow && menu}>
        跳到工作区
      </a>
      {menu && (
        <button
          className="nav-backdrop"
          tabIndex={-1}
          aria-label="关闭导航"
          onClick={() => setMenu(false)}
        />
      )}
      <FocusScope
        asChild
        trapped={narrow && menu}
        loop={narrow && menu}
        onMountAutoFocus={(event) => event.preventDefault()}
        onUnmountAutoFocus={(event) => event.preventDefault()}
      >
        <aside
          className={`sidebar ${menu ? "is-open" : ""}`}
          aria-label="主导航"
          inert={narrow && !menu}
        >
          <NavLink to="/files" className="brand">
            <span className="brand-mark">
              <Layers2 />
            </span>
            FluxVault
          </NavLink>
          <div className="workspace-label">
            <span className="workspace-avatar">F</span>
            <span>
              默认工作空间<small>管理员控制台</small>
            </span>
          </div>
          <nav>
            {navigation.map(({ path, title, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                onClick={() => setMenu(false)}
                className={({ isActive }) =>
                  `nav-item ${isActive ? "active" : ""}`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="nav-indicator"
                        className="nav-indicator"
                        transition={{
                          duration: 0.22,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                      />
                    )}
                    <Icon />
                    {title}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="local-state">
              <span className="status-dot" />
              {environment}
              <small>
                {mode === "d1"
                  ? "元数据持久化到 Cloudflare D1"
                  : mode === "mock"
                    ? "数据在后端重启后清空"
                    : "以服务返回信息为准"}
              </small>
            </div>
            <div className="profile">
              <span className="avatar">A</span>
              <span>
                Administrator<small>系统管理员</small>
              </span>
              <button
                className="icon-button"
                aria-label="退出登录"
                onClick={logout}
              >
                <LogOut />
              </button>
            </div>
          </div>
        </aside>
      </FocusScope>
      <div className="main-shell">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label={menu ? "关闭导航" : "打开导航"}
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
          <div className="breadcrumb">
            工作空间
            <ChevronRight />
            <span>{title}</span>
          </div>
          <span className="prototype-label">
            <FlaskConical />
            {environment}
          </span>
        </header>
        <main id="workspace" tabIndex={-1} inert={narrow && menu}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: reduced ? 1 : 0.5, y: reduced ? 0 : 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: reduced ? 1 : 0 }}
              transition={{
                duration: reduced ? 0 : 0.16,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <Suspense fallback={<LoadingState />}>
                <Routes location={location}>
                  <Route path="/files" element={<FilesPage />} />
                  <Route path="/instances" element={<InstancesPage />} />
                  <Route path="/keys" element={<KeysPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="*" element={<Navigate to="/files" replace />} />
                </Routes>
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
        <footer className="app-footer" inert={narrow && menu}>
          <span>FluxVault</span>
          <span>统一文件管理 · 独立存储</span>
        </footer>
      </div>
    </div>
  );
}
