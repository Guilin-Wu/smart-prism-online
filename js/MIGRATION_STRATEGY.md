# JavaScript 迁移策略

## 📊 当前状态

- **总代码量**: 22019行
- **已迁移**: 约 3500行（核心模块）
- **待迁移**: 约 18519行

## 🎯 迁移策略

### 方案1：渐进式迁移（推荐）

**优点**：
- 不影响现有功能
- 可以逐步测试
- 风险低

**步骤**：
1. 保持 `script.js` 继续运行
2. 逐步提取模块到新结构
3. 在新模块中调用旧函数（兼容层）
4. 逐步替换旧函数调用
5. 最终移除旧代码

### 方案2：完整迁移

**优点**：
- 结构清晰
- 完全模块化

**缺点**：
- 需要大量时间
- 风险较高
- 需要完整测试

## 📝 建议的迁移顺序

1. ✅ **核心模块**（已完成）
   - config, state, constants
   - data/storage, data/parser
   - utils/statistics, utils/helpers
   - core/router, core/app

2. ⏳ **图表函数**（优先）
   - 提取到 `js/charts/`
   - 被多个模块使用

3. ⏳ **功能模块**（按使用频率）
   - dashboard（最常用）
   - student
   - paper
   - ... 其他模块

4. ⏳ **主入口**
   - 整合所有模块
   - 更新 HTML

## 🔄 兼容层方案

在迁移过程中，可以创建兼容层：

```javascript
// js/compat/legacy.js
// 导出旧函数供新模块使用
export { 
    renderDashboard as legacyRenderDashboard,
    renderStudent as legacyRenderStudent,
    // ...
} from '../../script.js';
```

## ⚠️ 注意事项

1. **ES6模块需要构建工具**
   - 使用 Vite 或 Webpack
   - 或使用服务器环境

2. **全局变量**
   - 旧代码使用全局变量（G_StudentsData等）
   - 新代码使用 State 对象
   - 需要同步机制

3. **函数依赖**
   - 很多函数相互依赖
   - 需要仔细梳理依赖关系

## 🛠️ 推荐工具

- **Vite**: 快速开发服务器
- **ESBuild**: 快速打包
- **Rollup**: 生产环境打包

