# 前端组件迁移进度

## 已完成 ✅

### 核心架构
- ✅ Next.js 项目结构
- ✅ React Context 状态管理 (`contexts/AppContext.jsx`)
- ✅ 共享布局组件 (`components/Layout.jsx`)
- ✅ 认证系统集成

### 页面
- ✅ 登录页面 (`pages/auth/login.jsx`)
- ✅ 注册页面 (`pages/auth/register.jsx`)
- ✅ 首页 (`pages/index.jsx`)
- ✅ 数据上传页面 (`pages/upload.jsx`)
- ✅ Dashboard 页面 (`pages/dashboard.jsx`)

### API 路由
- ✅ 认证 API (`/api/auth/*`)
- ✅ 考试数据 API (`/api/exams/*`)
- ✅ 统计数据 API (`/api/exams/[id]/statistics`)

### 工具函数
- ✅ 统计计算函数 (`lib/utils/statistics.js`)
- ✅ 数据库连接 (`lib/db.js`)
- ✅ 认证工具 (`lib/auth.js`)
- ✅ 邮件发送 (`lib/email.js`)

### 图表组件
- ✅ BoxPlotChart (`components/charts/BoxPlotChart.jsx`)
- ✅ RadarChart (`components/charts/RadarChart.jsx`)
- ✅ HistogramChart (`components/charts/HistogramChart.jsx`)

## 进行中 🚧

- 🚧 迁移更多工具函数
- 🚧 完善 Dashboard 功能

## 待迁移 📋

### 模块页面
- [ ] 学生个体报告 (`pages/student.jsx`)
- [ ] 试卷科目分析 (`pages/paper.jsx`)
- [ ] 单科成绩分析 (`pages/single-subject.jsx`)
- [ ] 临界生分析 (`pages/boundary.jsx`)
- [ ] 全科均衡分析 (`pages/holistic.jsx`)
- [ ] 成绩分布变动 (`pages/trend-distribution.jsx`)
- [ ] 学生分层筛选 (`pages/groups.jsx`)
- [ ] 学科关联矩阵 (`pages/correlation.jsx`)
- [ ] 偏科诊断分析 (`pages/weakness.jsx`)
- [ ] 成绩趋势对比 (`pages/trend.jsx`)
- [ ] 学科小题分析 (`pages/item-analysis.jsx`)
- [ ] AI 智能分析 (`pages/ai-advisor.jsx`)
- [ ] 目标与规划 (`pages/goal-setting.jsx`)
- [ ] 考场编排 (`pages/exam-arrangement.jsx`)
- [ ] 智能互助分组 (`pages/study-groups.jsx`)
- [ ] 评语生成助手 (`pages/comment-gen.jsx`)
- [ ] 错题攻坚本 (`pages/weakness-workbook.jsx`)
- [ ] 荣誉中心 (`pages/honor.jsx`)
- [ ] 数据管理中心 (`pages/multi-exam.jsx`)

### 图表组件
- [ ] ScatterPlotChart
- [ ] BarChart
- [ ] LineChart
- [ ] HeatmapChart
- [ ] NetworkChart
- [ ] PieChart

### 工具函数
- [ ] 相关性计算 (`lib/utils/correlation.js`)
- [ ] 弱点分析 (`lib/utils/weakness.js`)
- [ ] 辅助函数 (`lib/utils/helpers.js`)

## 迁移策略

1. **优先迁移核心功能**
   - Dashboard ✅
   - 数据上传 ✅
   - 基础图表 ✅

2. **逐步迁移其他模块**
   - 按使用频率和依赖关系迁移
   - 保持功能完整性

3. **代码重构**
   - 将原有的 ES6 模块转换为 React 组件
   - 使用 React Hooks 管理状态
   - 使用 Context API 共享全局状态

## 注意事项

- 保持与原有功能的兼容性
- 确保数据格式一致
- 测试每个迁移的模块
- 优化性能和用户体验
