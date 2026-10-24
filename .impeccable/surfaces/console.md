# 管理控制台原型

Mode: Operate

## Direction contract

THESIS：用户直接进入文件工作区，通过实例、状态、可见性筛选和右侧详情完成管理；不添加与当前任务无关的营销区块。

OWN-WORLD：用户选择 RustFS Console 类管理布局。浅色内容面板配低饱和蓝灰导航区域，蓝色标识主要动作，绿色和琥珀色仅表达文件状态。系统无衬线字体、等宽标识、紧凑数据行、细分隔线。

STORY：先读文件名称与状态，按条件定位文件，再查看归属、实例、生命周期和允许的动作。mock 提示始终可见。

FIRST VIEWPORT：左侧 224px 导航，中间自适应文件表格，顶部标题和上传操作，其下筛选栏；选中后右侧显示 284px 详情（1600px 起为 320px，窄桌面为 250px）。移动端导航折叠，详情使用可关闭的全高抽屉。

FORM：已由用户明确选择文件列表与右侧详情，seed: none (user-pinned)。签名交互为选中文件时连贯显示 pending → ready 或 deleting 的生命周期说明，动作可用性跟随状态。

FINISH：unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## 本轮边界

原型仅用于演示与视觉确认，不调用生产业务。2026-10-18 用户已批准该原型作为 React 实现依据，并要求适当增加切换、点击等动效。

React 管理台已对接本地 mock API，保留文件中心布局、详情、实例管理和密钥展示一次的交互；使用轻量切换、点击、弹窗动效并尊重减少动态效果偏好。桌面、移动端及代表性交互已通过 Playwright 检查和实际截图查看。真实 D1/Provider 接入与正式 React 的用户手工审查不在这些检查的证明范围内。
