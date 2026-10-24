---
name: FluxVault
description: 以文件列表和清晰状态为中心的单管理员文件工作台
colors:
  accent: "#245fce"
  accent-hover: "#1d50b3"
  canvas: "#f7f9fc"
  surface: "#ffffff"
  sidebar: "#ebf1f8"
  detail: "#fcfdff"
  text: "#233249"
  muted: "#5b6b82"
  line: "#e2e8f0"
  control-line: "#dbe2ed"
  row-hover: "#f8faff"
  row-selected: "#f0f5fd"
  nav-text: "#52627b"
  nav-hover: "#e3eaf4"
  nav-selected: "#dce7f8"
  nav-selected-text: "#1e58bd"
  secondary-hover: "#f0f4fa"
  ghost-text: "#526984"
  ready: "#327763"
  ready-surface: "#eaf5ef"
  pending: "#94641a"
  pending-surface: "#fcf3de"
  deleting: "#944421"
  deleting-surface: "#fff0e7"
  neutral-state: "#586e8b"
  disabled-state: "#5b6b82"
  disabled-surface: "#eef0f4"
  danger: "#b43d3d"
  danger-hover: "#fff4f3"
  notice-surface: "#ecf2fd"
  notice-text: "#516c91"
  warning-surface: "#fff5e6"
  warning-text: "#88652b"
typography:
  headline:
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans CJK SC", sans-serif'
    fontSize: "26px"
    fontWeight: 650
    letterSpacing: "-0.5px"
  title:
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans CJK SC", sans-serif'
    fontSize: "18px"
    fontWeight: 650
  body:
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans CJK SC", sans-serif'
    fontSize: "14px"
    fontWeight: 400
  label:
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans CJK SC", sans-serif'
    fontSize: "12px"
    fontWeight: 400
  filename:
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans CJK SC", sans-serif'
    fontSize: "13px"
    fontWeight: 550
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace"
    fontSize: "12px"
    fontWeight: 400
rounded:
  badge: "4px"
  compact: "6px"
  control: "8px"
  table: "8px"
  workspace: "8px"
  dialog: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  control: "10px"
  compact: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "0 15px"
    height: "37px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.surface}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "0 15px"
    height: "37px"
  button-danger:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.danger}"
    rounded: "{rounded.control}"
    padding: "0 15px"
    height: "37px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ghost-text}"
    rounded: "{rounded.control}"
    padding: "0 8px"
    height: "30px"
  button-icon:
    rounded: "{rounded.compact}"
    width: "32px"
    height: "32px"
  search-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
    padding: "0 11px"
    height: "36px"
  nav-item:
    textColor: "{colors.nav-text}"
    rounded: "{rounded.control}"
    padding: "0 13px"
    height: "43px"
  nav-item-active:
    backgroundColor: "{colors.nav-selected}"
    textColor: "{colors.nav-selected-text}"
    rounded: "{rounded.control}"
    padding: "0 13px"
    height: "43px"
  badge-ready:
    backgroundColor: "{colors.ready-surface}"
    textColor: "{colors.ready}"
    rounded: "{rounded.badge}"
    padding: "3px 6px"
  badge-pending:
    backgroundColor: "{colors.pending-surface}"
    textColor: "{colors.pending}"
    rounded: "{rounded.badge}"
    padding: "3px 6px"
  badge-deleting:
    backgroundColor: "{colors.deleting-surface}"
    textColor: "{colors.deleting}"
    rounded: "{rounded.badge}"
    padding: "3px 6px"
  badge-disabled:
    backgroundColor: "{colors.disabled-surface}"
    textColor: "{colors.disabled-state}"
    rounded: "{rounded.badge}"
    padding: "3px 6px"
  file-tab:
    textColor: "{colors.muted}"
    padding: "0 0 13px"
  file-workspace:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.workspace}"
  form-dialog:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.dialog}"
    padding: "26px"
    width: "470px"
---

# Design System: FluxVault

## Overview

**Creative North Star: "清晰的文件工作台"**

界面以低饱和蓝灰、浅色内容面板和紧凑数据行建立秩序。文件名称、状态和允许执行的动作始终比装饰更醒目。系统无衬线字体承担界面文字，等宽字体承担标识与数值；细分隔线与浅色选中态使高密度信息仍可逐行扫描。

本文件记录已实现的 React 管理台，视觉方向承接用户批准的 HTML/CSS 原型，并包含用户要求的适度切换与点击反馈。精确值和交互以当前 React 源码为准；桌面、移动端及代表性状态已有本地浏览器检查和截图证据。用户批准的是原型，正式 React 的用户手工验收、真实 D1 与 Provider 验收仍不在这些证据的证明范围内。

**Key Characteristics:**

- 蓝灰导航、白色工作区和单一蓝色主动作。
- 文件列表承担浏览任务，详情面板解释选中记录和生命周期。
- 状态同时使用文字与颜色，非 ready 文件不能通过外观暗示可下载。
- 细边界、小圆角和克制的遮罩层级。
- 交互反馈短促，减少动态效果偏好具有优先权。

依据：[PRODUCT.md](PRODUCT.md)、[控制台 surface brief](.impeccable/surfaces/console.md)、[React 样式](apps/web/src/styles.css)、[布局](apps/web/src/app/layout.tsx)、[Dialog](apps/web/src/components/ui/dialog.tsx)、[文件界面](apps/web/src/features/files/)、[Key 状态](apps/web/src/features/keys/key-presentation.tsx)与[验证记录](docs/specs/verification.md)。已查看 [.impeccable/review](.impeccable/review/) 中的 react-desktop.png、react-mobile.png、react-empty.png、react-pending.png、react-upload-error.png、react-uploading.png、react-instances.png、react-keys.png、react-keys-expired.png、react-settings.png，以及三个 react-mobile-*-viewport.png。它们来自连接本地 mock API 的 React 界面。界面使用 Lucide SVG 图标，没有照片或生成式位图资产。

本轮独立 React 复核针对清除筛选、过期 Key 色彩、移动导航焦点和禁用状态对比度的四项问题，整改复验均为 resolved，remaining clear，disposition ship；此结论仅覆盖这四项。验证记录中的单次自动设计检测为零发现，也不代表全面可访问性认证或正式用户验收。

## Colors

蓝色负责主动作和选中关系，蓝灰中性色负责导航、文字与层级。前置 token 是精确色值的来源，以下名称说明使用位置。

sidecar 的 tonalRamp 是工具预览从现有颜色推导的八级色带；应用没有使用这些合成色阶，正式可复用色值以前置 token 为准。

### Primary

- **动作蓝**（accent）：上传、主要提交动作、选中页签、焦点和输入光标；悬停使用 accent-hover。
- **导航选中色**（nav-selected / nav-selected-text）：用浅底与深蓝文字标记当前位置，不把整条导航做成实色主按钮。

### Neutral

- **冷白画布**（canvas / surface / detail）：区分页面底、文件工作区和右侧详情。
- **蓝灰导航**（sidebar / nav-text）：保持导航可见，但不与文件内容争夺对比度。
- **正文与次级文字**（text / muted）：名称与主要信息使用较深颜色，元数据、帮助和时间使用次级文字。
- **细边界**（line / control-line）：区分内容区域与输入控件。行悬停与选中分别使用 row-hover、row-selected。

### Semantic states

- ready 使用绿色文字和浅绿底；pending 使用琥珀色文字和浅琥珀底；deleting 使用橙褐文字和浅橙底。
- 中性和不可用状态分别使用 neutral-state、disabled-state；API Key 的已禁用、已撤销、已过期统一使用灰色不可用标签，仅启用且未到期的 Key 使用绿色。disabled-state 与 disabled-surface 的实测对比度为 4.76:1，标签不叠加禁用按钮的透明度。
- 危险动作使用 danger；ghost-text 用于行内轻量操作。mock 提示使用浅蓝底，待排查说明使用 warning-surface 和 warning-text。文件类型图标保留浅蓝、浅绿和浅紫配色，它们不代表生命周期状态。

**The State Truth Rule.** 状态色必须与状态文字、生命周期说明和动作可用性一致。pending 本身不等于中断；上传请求进度与待确认记录分别表达，过期 Key 不显示绿色可用状态。

## Typography

**Body Font:** 系统无衬线字体栈，含 Segoe UI 与 Noto Sans CJK SC 回退。不加载额外展示字体。

**Label/Mono Font:** 系统等宽字体栈，用于文件 ID、Key 前缀和大小；时间与数值使用等宽数字。

### Hierarchy

- **Headline**：页面标题；桌面使用 headline token，移动端为 24px。
- **Title**：通用区块标题；普通对话框标题为 20px、行高 1.5，窄屏保持该尺寸；抽屉的“文件详情”标题为 13px，列表页面的次级介绍标题为 16px。
- **Body**：根字号使用 body token；界面多数表格、控件和说明落在 label 级别，普通段落行高为 1.65。
- **Filename**：文件名称使用 filename token；表内单行省略，详情内允许断行。桌面详情名称为 13px、行高 1.5；抽屉详情名称为 18px。
- **Label**：表头、状态、控件和辅助说明以 label token 为基础；表头为 500，按钮和名称强调为 550，激活导航与标题为 650。
- **紧凑标识**：详情复制区的文件 ID 与实例表副行 ID 为 10px；权限代码标签和抽屉描述为 11px。这些是具体组件的密度处理，不作为普通说明文字的默认字号。

**The Identifier Rule.** 标识和数值可以等宽，中文说明保持系统无衬线。长文件名在列表中省略，在详情中提供可换行的完整文本。

## Layout

控制台的具体构图由 surface brief 约束：侧栏、弹性文件工作区和右详情构成桌面布局。常规侧栏宽 224px，顶栏高 66px，滚动时吸顶并使用半透明白底与背景模糊；主区内边距为上 34px、水平 36px、下 24px。文件工作区最小高度为 535px，表头高 43px、文件行高 66px，右详情宽 284px、内边距 18px 20px。文件列表可独立横向滚动，横向滚动条为细样式浅蓝灰色。

| 视口条件    | React 的实际变化                                                                                                                                           |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 至少 1600px | 主区内边距 38px 44px；详情宽 320px；文件行高 71px；工作区最小高度 575px。                                                                                  |
| 1251–1599px | 采用上述常规桌面尺寸。                                                                                                                                     |
| 至多 1250px | 侧栏宽 190px；主区内边距 28px 24px；详情宽 250px、内边距 16px；隐藏可见性列。                                                                              |
| 至多 1050px | 隐藏内嵌详情，点击文件打开右侧抽屉；恢复可见性列；工作区最小高度 530px。                                                                                   |
| 至多 760px  | 页面改为单列；顶栏高 57px；侧栏从左侧展开；主区内边距 25px 16px。搜索独占一行，筛选与刷新排在下一行。文件表仅保留名称和状态，行高 68px；其他属性进入详情。 |

详情抽屉宽 350px、最大宽度为视口、占满 100dvh，贴右侧且无圆角。常规内边距为 26px，窄屏为 22px。表单对话框宽 470px，最大宽度为视口减 28px，最大高度为 90dvh。窄屏弹窗按钮最小高度为 38px。存储实例与 API Key 表在移动端保留 650px 最小表宽并允许横向滚动；其行内按钮窄屏高 32px。设置页最大宽 750px，字段布局由 200px 标签列变为窄屏的 110px。

spacing token 提取已复用的间距值，不表示整个界面使用单一等比刻度。文件列表最小高度为 480px，表格密度、控件尺寸和详情可读性优先于机械套用间距比例。

## Elevation & Depth

常驻内容用浅色面和细线分层，不给每一行或每一块内容添加浮起效果。文件工作区与实例/密钥表仅带 1px 级别的极淡投影用于与画布区分；主按钮仅有轻微阴影，悬停时轻微抬升；顶栏与对话框遮罩使用半透明加背景模糊。Radix 对话框和移动导航通过遮罩及阴影表达遮挡关系。toast 使用 Sonner 的状态样式，不沿用原型的自定义深蓝浮层。

### Shadow Vocabulary

- **主按钮**：0 2px 3px #1d4a8d10。
- **对话框**：0 20px 80px #17212b30；遮罩为 #22344966。
- **移动导航**：8px 0 30px #22334410；顶栏以下的遮罩为 #24354944。

**The Quiet Surface Rule.** 常驻表格与详情依靠背景和分隔线形成层级；明显阴影留给覆盖当前工作区的临时界面。

## Shapes

圆角按组件职责分级：状态标签紧凑，控件略柔和，工作区连续，对话框更宽松；对应 badge、compact、control、table、workspace、dialog token。列表行没有独立卡片外轮廓，依靠细分隔线串成连续表格。主要边框为 1px，上传区使用虚线边框；头像和状态圆点使用圆形。

图标采用 Lucide 描边 SVG。通用图标为 18px、描边 1.7；按钮内常为 16px，元数据与状态辅助图标为 12–15px。文件类型图标放在小尺寸浅色底座中，不依赖位图。

## Components

### Buttons

主按钮为动作蓝实底和白字；次按钮为白底细边框；危险按钮为白底红褐字与浅红边框；ghost 为透明底的紧凑行内操作。React Button 提供 default、secondary、danger、ghost 四种 variant。常规高度、内边距和圆角见 component token。详情内的按钮高 32px、水平内边距 8px，移动页标题动作高 35px；窄屏 Dialog 内最小按钮高度为 38px。

按钮悬停改变背景或边框，按压不再使用位移或缩放，仅保留颜色与阴影的平滑过渡。禁用按钮保留标签、透明度为 0.55，并使用不可用光标。图标按钮常为 32px 方形，移动刷新按钮为 36px 方形，详情 ID 复制按钮为 20px 方形。所有可聚焦控件保留清晰焦点，通用焦点为动作蓝 2px 外轮廓、偏移 3px。

### Inputs / Fields

搜索是白底细边框的组合控件，左侧搜索图标、最大宽 320px；移动端占满一行。输入为空时右侧显示“/”快捷键提示，在非输入焦点下按“/”可直接聚焦搜索；已输入时提示替换为一键清除按钮，Esc 也会清空当前搜索。聚焦时组合容器出现浅蓝 2px 外轮廓，边框变深。选择框高 36px，表单内输入与选择框高 38px。下拉选择使用 Radix Select 的定制样式替代原生弹层：白底圆角面板、细边框与投影、选中项为蓝色文字加对勾、悬停/方向键高亮为浅蓝底，支持键盘方向键与 Esc；文本输入和单选保留原生语义。文件筛选针对具体存储实例与可见性。

上传区用浅底、虚线轮廓和居中图标提示可选择文件；悬停与焦点改变背景和边框，拖放文件悬停时变为实线蓝色边框并以浅蓝底与内侧描边强调。选择或拖入后显示名称与大小，未选择时显示当前 mock 单文件上限。可见性选项以整行单选结构呈现，默认私有，选中项用浅蓝底与蓝色边界强化关联。错误说明就近出现；实例不支持私有文件、超出上传上限等错误不依赖 toast 代替字段反馈。

### Navigation / Tabs

侧栏导航使用图标与文字，当前项同时改变底色、文字和字重，NavLink 提供 aria-current。移动菜单按钮维护展开状态，侧栏从左侧进入。窄屏导航打开后聚焦首个导航项，FocusScope 使 Tab/Shift+Tab 留在侧栏；工作区、页脚与跳转链接进入 inert，关闭的侧栏也为 inert。Escape 或关闭导航后焦点返回菜单按钮。

文件状态筛选为“全部文件”“待完成”“删除中”三个按钮，以 aria-pressed、下划线和文字颜色表达选中，仅当前项显示返回总数的低对比计数。搜索、状态、实例或可见性变化时回到首个分页位置。筛选或页签切换时表格保留上一份数据平滑替换（React Query 的 keepPreviousData），取数期间表区轻微降低透明度，仅首次加载显示骨架屏。

### Tables / File details

文件行以名称和上传时间建立主次；悬停与选中分别使用两档浅蓝底。名称按钮打开详情，详情同时包含完整名称、状态、可复制标识、存储归属、可见性、所有者、生命周期和允许动作。移动端隐藏的属性仍能在抽屉中读取。超过 20 条时出现上一页、当前页与下一页控件。

状态标签包含圆点与文字，不单靠颜色传递意义。文件记录的 pending 显示“上传尚未确认”，就近说明需要核对远端状态；仅存在 last_error 时显示后端错误代码，不推断上传已经中断。上传请求进行中由上传对话框独立显示“正在上传并确认文件，请稍候…”及一条不定进度条，提交按钮内切换为 spinner，禁用重复提交、取消和相关字段，完成后更新列表。ready 才启用下载；pending 不提供将文件直接标成可用的动作；deleting 提供重试删除。

有筛选且无匹配记录时使用图标、简短说明和“清除筛选”动作；该动作一次清空搜索、状态、实例、可见性并重置分页。无筛选的空列表提示上传。存储实例、API Key 沿用连续表格和行内操作；本系统没有独立的通用数据卡片组件。

### Dialogs / Feedback

上传、实例编辑、创建 Key 与移动详情使用 Radix Dialog；删除、轮换、撤销等确认使用 Radix AlertDialog。标题区、内容区、带上边界的底部操作区有明确顺序，普通 Dialog 保留标题、描述与可见关闭按钮。Key 原文只在创建或轮换后的结果弹窗显示一次，提供复制与“已保存，关闭”动作，关闭后移除；绿色结果底不表示后续可以再次读取原文。

顶栏持续标注 Mock 环境，侧栏解释后端重启后清空数据（状态点为琥珀色呼吸圆点），文件页另有浅蓝提示条，可关闭且本次会话内不再出现。toast 使用 Sonner，右下角显示状态色通知并提供关闭按钮；应用没有指定固定停留时长。React 上传与下载调用本地 mock API，不使用原型的“模拟上传”或“下载示例”动作；这仍不代表真实存储已连接。

sidecar 中保留的组件片段均为静态视觉示例，只提供 HTML/CSS 的悬停、焦点、按压及原生输入状态，不连接 API、不执行导航或文件操作，也不模拟 Radix 的焦点管理。

### Motion

用户要求的切换与点击反馈已实现在 React。CSS 的标准缓动为 cubic-bezier(0.16,1,0.3,1)，页面切换使用相同曲线；桌面详情采用 Motion 自身默认缓动，源码没有为它另设曲线。

| 对象           | 当前实现                                                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 通用按钮       | 背景、边框、阴影 160ms，无按压位移；主按钮悬停附加轻微阴影抬升；输入和选择框保留 180ms 的颜色与边框过渡。                    |
| 导航与状态筛选 | 导航颜色与背景 180ms、无按压位移；当前导航项左侧有 3px 蓝色指示条，切换时经 Motion layoutId 沿侧栏滑动 220ms。筛选按钮颜色与边框 160ms，选中下划线以 layoutId 滑动 220ms。 |
| 文件行         | 背景过渡 160ms；表格行插入时逐行错落淡入（纯 opacity，180ms，行间 20ms 延迟，至多 12 行）。选中行首列带 3px 内嵌蓝色强调条。   |
| 页面切换       | 160ms，入场 opacity 0.5 → 1、y 5px → 0；退出淡出，AnimatePresence 依次切换。登录页与工作台之间以 140ms 交叉淡入切换。         |
| 登录页         | 品牌、面板与页脚以 70ms 间隔错落入场（240–260ms）；登录失败时错误提示水平抖动一次约 320ms。                                    |
| 桌面详情切换   | 面板出现/移除 180ms，入场 opacity 0.5 → 1、x 8px → 0，退出淡出；更换选中文件时仅内容区以 160ms 纯淡入替换。                    |
| 对话框与遮罩   | 内容入场 220ms，由 opacity 0、偏下位置与 scale(0.98) 进入中心；内容退出 140ms。遮罩入场 180ms、退出 140ms，并带 2px 背景模糊。退出采用 ease-in。 |
| 下拉选择       | 面板展开 160ms 纯淡入、收起 120ms 淡出 ease-in，无位移缩放；触发器箭头随展开旋转 180°。                                       |
| 详情抽屉       | 入场 220ms，从右侧 translateX(100%) 进入；退出 160ms ease-in。                                                                 |
| 移动导航       | 200ms，从 translateX(-100%) 展开至 0。                                                                                        |
| 等待反馈       | 骨架流动 1600ms、刷新图标旋转 800ms、上传状态圆点呼吸 1000ms、按钮内 13px spinner 700ms、上传不定进度条 1200ms；均只用于等待状态。侧栏 Mock 状态点以琥珀色 2400ms 呼吸，pending/deleting 徽标圆点 1600ms 呼吸。 |
| 空状态         | 空与错误状态纯淡入 300ms，图标置于浅色圆形底座。                                                                               |

MotionConfig 设置 reducedMotion="user"，页面与详情组件读取 useReducedMotion 并把过渡时长设为 0。CSS 的 prefers-reduced-motion 同时关闭动画和过渡，滚动使用 auto。浏览器已定向检查普通与减少动态效果模式，结论范围见验证记录。

## Do's and Don'ts

### Do:

- **Do** 保留蓝灰导航、浅色工作区和蓝色主动作的层级。
- **Do** 让文件名称、状态、可执行动作和完整详情在各视口保持可获得。
- **Do** 同步状态文字、状态色、警告与动作可用性，区分上传请求进度、待确认记录与后端错误。
- **Do** 为键盘焦点提供可见轮廓，并保留减少动态效果偏好。
- **Do** 保留移动导航焦点约束、关闭后的焦点恢复，以及空结果的一键清除筛选。
- **Do** 以当前 React 源码和截图核对新增界面，保持用户批准原型的视觉方向。

### Don't:

- **Don't** 将文件表格替换为无依据的卡片总览或营销区块。
- **Don't** 仅依据 pending 状态展示“上传已中断”，或让不可用文件看起来可下载。
- **Don't** 把独立的文件类型图标配色当成状态成功信号。
- **Don't** 把过期、禁用或撤销的 Key 显示为绿色可用状态。
- **Don't** 隐藏 mock 边界，或将本地浏览器检查与定向复核当成真实服务或正式用户验收。
- **Don't** 为每个常驻区域增加大阴影、装饰性渐变或独立浮层。
