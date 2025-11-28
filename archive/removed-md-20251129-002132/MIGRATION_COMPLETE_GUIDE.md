# 完整迁移指南

## 迁移策略

由于 `script.js` 有 22000+ 行代码，完整迁移需要系统化方法。

### 步骤 1: 全局变量替换映射

在迁移函数时，需要将以下全局变量替换为 `State` 对象：

| 旧全局变量 | 新 State 属性 | 说明 |
|-----------|--------------|------|
| `G_StudentsData` | `State.studentsData` | 学生数据 |
| `G_CompareData` | `State.compareData` | 对比数据 |
| `G_DynamicSubjectList` | `State.dynamicSubjectList` | 科目列表 |
| `G_SubjectConfigs` | `State.subjectConfigs` | 科目配置 |
| `G_CurrentClassFilter` | `State.currentClassFilter` | 当前班级筛选 |
| `G_Statistics` | `State.statistics` | 统计数据 |
| `G_CompareStatistics` | `State.compareStatistics` | 对比统计数据 |
| `G_DashboardTableSort` | `State.dashboardTableSort` | Dashboard 表格排序 |
| `G_TrendSort` | `State.trendSort` | 趋势模块排序 |
| `G_ItemAnalysisData` | `State.itemAnalysisData` | 小题分析数据 |
| `G_ItemAnalysisConfig` | `State.itemAnalysisConfig` | 小题分析配置 |
| `G_ItemOutlierList` | `State.itemOutlierList` | 小题异常值列表 |
| `G_ItemDetailSort` | `State.itemDetailSort` | 小题详情排序 |
| `G_GoalBaselineData` | `State.goalBaselineData` | 目标基准数据 |
| `G_GoalOutcomeData` | `State.goalOutcomeData` | 目标结果数据 |
| `G_PhysicalData` | `State.physicalData` | 身高性别数据 |
| `G_CurrentSeatMap` | `State.currentSeatMap` | 当前座位图 |
| `G_AIChatHistory` | `State.aiChatHistory` | AI 聊天历史 |
| `G_CurrentHistoryId` | `State.currentHistoryId` | 当前历史ID |

### 步骤 2: 函数签名更新

旧函数签名：
```javascript
function renderDashboard(container, stats, activeData) {
    // 使用 G_StudentsData, G_DynamicSubjectList 等
}
```

新函数签名：
```javascript
export function renderDashboard(container, data) {
    const { activeData = [], stats = {}, currentFilter = 'ALL' } = data;
    // 使用 State.studentsData, State.dynamicSubjectList 等
}
```

### 步骤 3: 导入依赖

每个模块文件需要导入：
```javascript
import { State } from '../config/state.js';
import { calculateAllStatistics } from '../utils/statistics.js';
// 其他需要的工具函数和图表函数
```

### 步骤 4: 迁移顺序

1. ✅ **已完成**: Dashboard (部分)
2. ⏳ **进行中**: Student, Paper, Single-Subject
3. 📋 **待迁移**: Trend, Groups, Correlation, Weakness, Boundary, Holistic
4. 📋 **复杂模块**: Multi-Exam, Item-Analysis, Goal-Setting, AI-Advisor, Trend-Distribution
5. 📋 **辅助模块**: Exam-Arrangement, Study-Groups, Comment-Gen, Weakness-Workbook, Honor-Wall

### 步骤 5: 测试检查清单

迁移每个模块后，检查：
- [ ] 所有全局变量已替换为 State
- [ ] 所有依赖函数已正确导入
- [ ] 函数签名已更新
- [ ] 事件监听器正确绑定
- [ ] 图表渲染正常
- [ ] 数据筛选功能正常
- [ ] 打印功能正常（如果有）

### 步骤 6: 更新 index.html

迁移完成后，更新 `index.html`：
```html
<!-- 移除 -->
<script src="script.js"></script>

<!-- 保留 -->
<script type="module" src="js/main.js"></script>
```

## 自动化工具

使用 `scripts/migrate-modules.js` 辅助提取函数代码。

## 注意事项

1. **ECharts 实例管理**: 使用 `State.echartsInstances` 或 `window.echartsInstances`
2. **DOM 元素缓存**: 避免在模块中缓存 DOM，每次渲染时重新获取
3. **事件监听器**: 确保在模块卸载时清理事件监听器
4. **异步操作**: 确保所有异步操作正确处理

