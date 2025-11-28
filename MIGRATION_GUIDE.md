# 代码迁移指南

## 📋 概述

本指南帮助您将现有的 `script.js` (22019行) 和 `style.css` (1809行) 逐步迁移到新的模块化结构。

## 🎯 迁移策略

### 原则
1. **渐进式迁移** - 不影响现有功能
2. **模块化拆分** - 按功能划分
3. **保持兼容** - 迁移过程中保持旧代码可用

## 📝 CSS 迁移步骤

### 步骤1: 拆分 style.css

将 `style.css` 按以下规则拆分：

#### `css/base.css`
包含：
- body, html 基础样式
- 通用类（.app-container, h2, h3等）
- 基础布局

#### `css/sidebar.css`
包含：
- `.sidebar` 相关样式
- `.sidebar-header`
- `.nav-link`
- `.sidebar-button`
- `.sidebar-select`

#### `css/modules.css`
包含：
- `.module-panel`
- `.main-card-wrapper`
- `.kpi-grid`, `.kpi-card`
- 各模块特定样式

#### `css/charts.css`
包含：
- `.chart-container`
- 图表相关样式

#### `css/print.css`
包含：
- `@media print` 规则
- 打印相关样式

#### `css/themes.css`
包含：
- `[data-theme="dark"]` 规则
- 主题切换样式

### 步骤2: 更新引用

在 `index.html` 中：
```html
<!-- 旧 -->
<link rel="stylesheet" href="style.css">

<!-- 新 -->
<link rel="stylesheet" href="css/main.css">
```

## 📝 JavaScript 迁移步骤

### 阶段1: 提取配置和状态

✅ **已完成**
- `js/config/config.js` - 配置
- `js/config/constants.js` - 常量
- `js/config/state.js` - 状态管理

### 阶段2: 提取数据层

创建 `js/data/storage.js`:
```javascript
// 从 script.js 提取所有 localforage 相关函数
// - loadDataFromStorage()
// - saveDataToStorage()
// - 其他存储操作
```

创建 `js/data/parser.js`:
```javascript
// 从 script.js 提取 Excel 解析函数
// - loadExcelData()
// - 数据处理函数
```

### 阶段3: 提取工具函数

创建 `js/utils/statistics.js`:
```javascript
// 统计计算函数
// - calculateAllStatistics()
// - calculateStandardScores()
// - calculateStatsForScores()
// - 其他统计函数
```

创建 `js/utils/helpers.js`:
```javascript
// 通用工具函数
// - 格式化函数
// - 验证函数
// - 其他辅助函数
```

### 阶段4: 提取模块

为每个模块创建独立文件，例如 `js/modules/dashboard.js`:
```javascript
import { State } from '../config/state.js';
import { calculateAllStatistics } from '../utils/statistics.js';

export function renderDashboard(container, stats, activeData) {
    // 从 script.js 复制 renderDashboard 函数
}
```

### 阶段5: 提取图表函数

创建 `js/charts/common.js`:
```javascript
// 通用图表函数
// - renderHistogram()
// - renderAverageRadar()
// - 其他通用图表
```

### 阶段6: 创建主入口

创建 `js/main.js`:
```javascript
import { State } from './config/state.js';
import { renderDashboard } from './modules/dashboard.js';
// ... 导入其他模块

// DOMContentLoaded 事件处理
// 事件绑定
// 初始化逻辑
```

### 步骤7: 更新 HTML

在 `index.html` 中：
```html
<!-- 使用 ES6 模块 -->
<script type="module" src="js/main.js"></script>
```

**注意**: ES6 模块需要服务器环境，不能直接用 `file://` 协议打开。

## 🛠️ 使用构建工具（推荐）

### 选项1: Vite（推荐）

1. 安装 Vite:
```bash
npm init -y
npm install -D vite
```

2. 创建 `vite.config.js`:
```javascript
export default {
    server: {
        port: 3000
    }
}
```

3. 更新 `package.json`:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  }
}
```

4. 运行:
```bash
npm run dev
```

### 选项2: 原生 ES6 模块

使用 Python 简单服务器：
```bash
# Python 3
python -m http.server 8000

# 然后访问 http://localhost:8000
```

## ✅ 迁移检查清单

### CSS
- [ ] 拆分 style.css 到各个模块文件
- [ ] 更新 css/main.css 导入
- [ ] 测试所有页面样式正常
- [ ] 测试暗黑模式
- [ ] 测试打印样式

### JavaScript
- [ ] 提取配置和状态
- [ ] 提取数据层（storage, parser）
- [ ] 提取工具函数（statistics, helpers）
- [ ] 提取各功能模块
- [ ] 提取图表函数
- [ ] 创建主入口文件
- [ ] 测试所有功能正常

### 测试
- [ ] 数据导入功能
- [ ] 各模块渲染
- [ ] 图表显示
- [ ] 数据存储
- [ ] AI功能（如果使用）
- [ ] 打印功能

## 🐛 常见问题

### Q: ES6 模块报错 "Cannot use import statement outside a module"
A: 需要在 script 标签添加 `type="module"`，或使用构建工具。

### Q: 模块导入路径错误
A: 确保使用相对路径，如 `./config/state.js` 而不是 `/config/state.js`

### Q: 功能不工作
A: 检查控制台错误，确保所有依赖都已导入

## 📚 参考

- [ES6 模块文档](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Modules)
- [Vite 文档](https://vitejs.dev/)
- 项目结构说明: `STRUCTURE.md`

