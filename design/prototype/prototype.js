import { createIcons, icons } from "lucide";
import { files, instances, keys } from "./data.js";

const $ = (selector) => document.querySelector(selector);
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const icon = (name) => `<i data-lucide="${name}"></i>`;
const labels = { ready: "可用", pending: "待完成", deleting: "删除中" };
let page = "files";
let status = "all";
let selected = files[0].id;
let toastTimer;
const refreshIcons = () => createIcons({ icons });
function toast(message) {
  clearTimeout(toastTimer);
  $("#toast").textContent = message;
  $("#toast").hidden = false;
  toastTimer = setTimeout(() => {
    $("#toast").hidden = true;
  }, 3500);
}
function visibleFiles() {
  return files.filter((file) => {
    const instance = instances.find((item) => item.id === file.instance);
    return (
      file.name.toLowerCase().includes($("#search").value.toLowerCase()) &&
      ($("#provider-filter").value === "all" ||
        instance.provider === $("#provider-filter").value) &&
      ($("#visibility-filter").value === "all" ||
        file.visibility === $("#visibility-filter").value) &&
      (status === "all" || file.state !== "ready")
    );
  });
}
function renderFiles() {
  const visible = visibleFiles();
  $("#files-body").innerHTML = visible
    .map((file) => {
      const instance = instances.find((item) => item.id === file.instance);
      return `<tr class="${selected === file.id ? "selected" : ""}"><td><button class="filename-button" data-file="${file.id}" aria-label="查看 ${escape(file.name)} 详情"><span class="file-icon ${file.kind}">${icon(file.icon)}</span><span><span class="filename">${escape(file.name)}</span><span class="file-date">${file.date}</span></span></button></td><td><span class="provider-name">${icon(instance.icon)}${escape(instance.name)}</span></td><td><span class="badge ${file.state}">${labels[file.state]}</span></td><td class="mono">${file.size}</td><td class="visibility-cell"><span class="visibility">${icon(file.visibility === "private" ? "lock" : "globe")}${file.visibility === "private" ? "私有" : "公开"}</span></td></tr>`;
    })
    .join("");
  $("#empty-state").hidden = visible.length > 0;
  $("#results-count").textContent =
    `显示 ${visible.length} 个文件，共 ${files.length} 个`;
  $(".nav-count").textContent = files.length;
  $('[data-status="all"] span').textContent = files.length;
  $('[data-status="attention"] span').textContent = files.filter(
    (file) => file.state !== "ready",
  ).length;
  refreshIcons();
}
function renderDetail() {
  const file = files.find((item) => item.id === selected);
  if (!file) return;
  const instance = instances.find((item) => item.id === file.instance);
  const content = `<div class="detail-top"><span>文件详情</span><button class="icon-button" data-close-detail aria-label="关闭文件详情">${icon("x")}</button></div><div class="detail-hero"><span class="file-icon ${file.kind}">${icon(file.icon)}</span><h2>${escape(file.name)}</h2><span class="badge ${file.state}">${labels[file.state]}</span></div><dl class="detail-meta"><div><dt>文件 ID</dt><dd class="mono">${escape(file.id)}</dd></div><div><dt>存储实例</dt><dd>${escape(instance.name)}</dd></div><div><dt>存储源</dt><dd>${instance.label}</dd></div><div><dt>文件大小</dt><dd class="mono">${file.size}</dd></div><div><dt>可见性</dt><dd>${file.visibility === "private" ? "私有 · 需要授权" : "公开 · 可匿名下载"}</dd></div><div><dt>所有者</dt><dd>${escape(file.owner)}</dd></div></dl><div class="lifecycle"><h3>文件状态</h3><div class="timeline-item">${icon("circle-check")}<div>已创建文件记录<span>${file.date}</span></div></div><div class="timeline-item">${icon(file.state === "ready" ? "circle-check" : "circle-alert")}<div>${file.state === "ready" ? "上传完成，可供访问" : file.state === "pending" ? (file.active ? "正在上传，暂不可下载" : "上传未完成，等待排查") : "远端删除未完成"}<span>${file.state === "ready" ? "远端内容与元数据已确认" : "当前不可下载"}</span></div></div></div>${file.state !== "ready" && !file.active ? `<div class="detail-warning">${file.state === "pending" ? "模拟场景：上传已中断。核对远端文件后再处理，不能直接标记为可用。" : "模拟场景：远端服务暂时不可用，文件记录已保留。可重新执行删除。"}</div>` : ""}<div class="detail-actions"><button class="button secondary" data-download ${file.state !== "ready" ? "disabled" : ""}>${icon("download")}下载示例</button>${file.state === "pending" ? "" : `<button class="button ${file.state === "deleting" ? "danger" : "secondary"}" data-delete>${icon(file.state === "deleting" ? "rotate-cw" : "trash-2")}${file.state === "deleting" ? "重试删除" : "删除"}</button>`}</div><p class="detail-help">${instance.provider === "telegram" ? "Telegram 删除只移除文件记录，频道内的原始内容会保留。" : "删除时先移除远端内容，再清理文件记录。"}</p>`;
  document.querySelectorAll("[data-detail]").forEach((target) => {
    target.innerHTML = content;
  });
  refreshIcons();
}
function renderInstances() {
  $("#instances-body").innerHTML = instances
    .map(
      (item) =>
        `<tr><td><span class="filename">${escape(item.name)}</span><span class="file-date mono">${escape(item.id)}</span></td><td><span class="provider-name">${icon(item.icon)}${item.label}</span></td><td>${item.policy}</td><td class="mono">${escape(item.secret)}</td><td><span class="badge ready">已启用 · 模拟</span></td></tr>`,
    )
    .join("");
  refreshIcons();
}
function renderKeys() {
  $("#keys-body").innerHTML = keys
    .map(
      (key) =>
        `<tr><td><span class="filename">${escape(key.name)}</span></td><td class="mono">${escape(key.prefix)}</td><td>${escape(key.scopes)}</td><td>${escape(key.expiry)}</td><td><span class="badge ${key.state === "启用" ? "ready" : "disabled"}">${key.state}</span></td></tr>`,
    )
    .join("");
}
function navigate(next) {
  page = ["files", "instances", "keys", "settings"].includes(next)
    ? next
    : "files";
  const titles = {
    files: ["文件", "一个文件入口，连接你的所有存储。", "upload", "上传文件"],
    instances: [
      "存储实例",
      "把不同存储服务，接入同一个工作空间。",
      "plus",
      "添加实例",
    ],
    keys: ["API Key", "为每个调用方分配独立的访问权限。", "plus", "创建密钥"],
    settings: ["系统设置", "查看当前服务的运行与认证配置。"],
  };
  document.querySelectorAll(".page-view").forEach((view) => {
    view.hidden = view.id !== `${page}-view`;
  });
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.page === page);
    item.setAttribute(
      "aria-current",
      item.dataset.page === page ? "page" : "false",
    );
  });
  $("#page-title").textContent = titles[page][0];
  $("#breadcrumb-current").textContent = titles[page][0];
  $("#page-description").textContent = titles[page][1];
  $("#primary-action").hidden = page === "settings";
  if (page !== "settings")
    $("#primary-action").innerHTML =
      icon(titles[page][2]) + `<span>${titles[page][3]}</span>`;
  $("#sidebar").classList.remove("is-open");
  $("#menu-toggle").setAttribute("aria-expanded", "false");
  renderInstances();
  renderKeys();
  refreshIcons();
}
$("#files-body").addEventListener("click", (event) => {
  const button = event.target.closest("[data-file]");
  if (!button) return;
  selected = button.dataset.file;
  $("#desktop-detail").hidden = false;
  renderFiles();
  renderDetail();
  if (window.innerWidth <= 1050) $("#detail-dialog").showModal();
});
for (const selector of ["#search", "#provider-filter", "#visibility-filter"])
  $(selector).addEventListener(
    selector === "#search" ? "input" : "change",
    renderFiles,
  );
document.querySelectorAll("[data-status]").forEach((button) =>
  button.addEventListener("click", () => {
    status = button.dataset.status;
    document
      .querySelectorAll("[data-status]")
      .forEach((item) => item.classList.toggle("selected", item === button));
    renderFiles();
  }),
);
$("#reset-filters").addEventListener("click", () => {
  $("#search").value = "";
  $("#provider-filter").value = "all";
  $("#visibility-filter").value = "all";
  status = "all";
  $('[data-status="all"]').click();
});
$("#refresh").addEventListener("click", () => {
  renderFiles();
  toast("演示列表已刷新");
});
$("#menu-toggle").addEventListener("click", () => {
  const open = $("#sidebar").classList.toggle("is-open");
  $("#menu-toggle").setAttribute("aria-expanded", String(open));
});
window.addEventListener("hashchange", () => navigate(location.hash.slice(1)));
document.addEventListener("keydown", (event) => {
  if (
    event.key === "/" &&
    !["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName) &&
    !document.querySelector("dialog[open]") &&
    page === "files"
  ) {
    event.preventDefault();
    $("#search").focus();
  }
});
document.addEventListener("click", (event) => {
  if (event.target.closest("[data-close]"))
    event.target.closest("dialog").close();
  if (event.target.closest("[data-close-detail]")) {
    if ($("#detail-dialog").open) $("#detail-dialog").close();
    else $("#desktop-detail").hidden = true;
  }
  if (event.target.closest("[data-download]")) {
    const file = files.find((item) => item.id === selected);
    const url = URL.createObjectURL(
      new Blob(
        [
          `FluxVault prototype: ${file.name}\nThis is demonstration content, not the original file.`,
        ],
        { type: "text/plain" },
      ),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "prototype-example.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("已下载示例文本；原型未连接真实文件");
  }
  if (event.target.closest("[data-delete]")) {
    const file = files.find((item) => item.id === selected);
    if (!window.confirm(`仅在原型中删除 ${file.name}？此操作不影响真实存储。`))
      return;
    files.splice(files.indexOf(file), 1);
    selected = files[0]?.id;
    if ($("#detail-dialog").open) $("#detail-dialog").close();
    renderFiles();
    if (selected) renderDetail();
    else $("#desktop-detail").hidden = true;
    toast("演示文件记录已移除");
  }
});
$("#primary-action").addEventListener("click", () => {
  if (page === "files") {
    $("#upload-form").reset();
    $("#selected-file-label").textContent = "选择文件，或拖放到这里";
    $("#upload-error").hidden = true;
    $("#upload-dialog").showModal();
    return;
  }
  $("#create-form").reset();
  $("#created-secret").hidden = true;
  $("#created-secret").textContent = "";
  $("#create-submit").hidden = false;
  $("#create-title").textContent =
    page === "keys" ? "创建 API Key" : "添加存储实例";
  $("#create-description").textContent =
    page === "keys"
      ? "演示密钥只展示一次，不可用于真实 API。"
      : "连接信息仅保存在本次原型会话。";
  $("#create-extra").innerHTML =
    page === "keys"
      ? '<label class="field-label" for="key-scopes">权限</label><select id="key-scopes"><option value="read">只读</option><option value="upload · read">上传与读取</option><option value="upload · read · delete">上传、读取与删除</option></select>'
      : '<label class="field-label" for="instance-provider">存储源</label><select id="instance-provider"><option value="s3">S3 兼容</option><option value="telegram">Telegram</option><option value="github">GitHub Releases（公开）</option></select><label class="field-label" for="secret-ref">Secret 引用</label><input id="secret-ref" pattern="[A-Z][A-Z0-9_]*" placeholder="例如 S3_ARCHIVE" required/>';
  $("#create-dialog").showModal();
});
$("#file-input").addEventListener("change", () => {
  $("#selected-file-label").textContent =
    $("#file-input").files[0]?.name || "选择文件，或拖放到这里";
});
$("#upload-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = $("#file-input").files[0];
  const visibility = new FormData(event.target).get("visibility");
  const instance = $("#upload-instance").value;
  if (instance === "gh-release" && visibility === "private") {
    $("#upload-error").textContent =
      "公开 GitHub 仓库不能承载私有文件。请选择其他实例，或将可见性设为公开。";
    $("#upload-error").hidden = false;
    return;
  }
  const file = {
    id: `file_${crypto.randomUUID().slice(0, 8)}`,
    name: input.name,
    kind: "document",
    icon: "file",
    size: `${(input.size / 1024).toFixed(1)} KB`,
    instance,
    visibility,
    state: "pending",
    active: true,
    date: "刚刚",
    owner: "系统管理员",
    type: input.type || "application/octet-stream",
  };
  files.unshift(file);
  selected = file.id;
  $("#upload-dialog").close();
  $("#desktop-detail").hidden = false;
  renderFiles();
  renderDetail();
  toast("正在演示上传状态变化…");
  setTimeout(() => {
    file.state = "ready";
    file.active = false;
    renderFiles();
    renderDetail();
    toast("演示上传完成，未发送到真实存储");
  }, 1100);
});
$("#create-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = $("#create-name").value.trim();
  if (!name) return;
  if (page === "keys") {
    const secret = `demo_${crypto.randomUUID().replaceAll("-", "")}`;
    keys.unshift({
      name,
      prefix: secret.slice(0, 12) + "…",
      scopes: $("#key-scopes").value,
      expiry: "永不过期",
      state: "启用",
    });
    $("#created-secret").innerHTML =
      `请保存这次生成的演示密钥。关闭后无法再次查看。<code>${secret}</code>该密钥不具备真实 API 权限。`;
    $("#created-secret").hidden = false;
    $("#create-submit").hidden = true;
    renderKeys();
  } else {
    const provider = $("#instance-provider").value;
    instances.push({
      id: `instance_${crypto.randomUUID().slice(0, 8)}`,
      name,
      provider,
      label: { s3: "S3 兼容", telegram: "Telegram", github: "GitHub Releases" }[
        provider
      ],
      icon: { s3: "database", telegram: "send", github: "git-branch" }[
        provider
      ],
      policy: provider === "github" ? "仅限公开" : "支持私有",
      secret: $("#secret-ref").value,
      enabled: true,
    });
    renderInstances();
    $("#create-dialog").close();
    toast("已添加演示实例，尚未连接真实服务");
  }
});
$("#create-dialog").addEventListener("close", () => {
  $("#created-secret").textContent = "";
});
renderFiles();
renderDetail();
navigate(location.hash.slice(1));
