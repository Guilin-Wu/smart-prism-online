/* eslint-disable no-undef */
'use strict';

// 全局状态管理
export const State = {
    // 科目列表
    dynamicSubjectList: [],
    
    // 学生数据
    studentsData: [],
    compareData: [],
    
    // 统计数据
    statistics: {},
    compareStatistics: {},
    
    // 小题分析数据
    itemAnalysisData: {},
    itemAnalysisConfig: {},
    itemOutlierList: [],
    itemDetailSort: { key: 'deviation', direction: 'asc' },
    
    // 排序状态
    trendSort: { key: 'rank', direction: 'asc' },
    dashboardTableSort: { key: 'totalScore', direction: 'desc' },
    
    // AI 相关
    aiChatHistory: [],
    currentHistoryId: null,
    currentAIController: null,
    
    // UI 状态
    currentClassFilter: 'ALL',
    currentImportType: 'main',
    subjectConfigs: {},
    
    // 其他数据
    physicalData: {},
    currentSeatMap: null,
    goalBaselineData: null,
    goalOutcomeData: null,
    currentCollectionId: 'default',
    
    // DOM 元素缓存
    domElements: {
        fileUploader: null,
        fileUploaderCompare: null,
        navLinks: null,
        modulePanels: null,
        welcomeScreen: null,
        classFilterContainer: null,
        classFilterSelect: null,
        classFilterHr: null,
        modal: null,
        modalCloseBtn: null,
        modalSaveBtn: null,
        configSubjectsBtn: null,
        subjectConfigTableBody: null
    },
    
    // ECharts 实例
    echartsInstances: {},
    
    // 活动数据（筛选后）
    activeData: [],
    activeCompareData: []
};

// 默认科目列表
export const DEFAULT_SUBJECT_LIST = ['语文', '数学', '英语', '物理', '化学', '生物', '政治', '历史', '地理'];

// AI 历史存储 Key
export const AI_HISTORY_KEY = 'G_AIHistoryList';

// 兼容旧代码：将 State 同步到全局变量
// 这样旧代码可以继续使用 G_StudentsData 等全局变量
if (typeof window !== 'undefined') {
    // 创建全局变量的 getter/setter，与 State 同步
    Object.defineProperty(window, 'G_StudentsData', {
        get: () => State.studentsData,
        set: (val) => { State.studentsData = val; },
        configurable: true
    });
    
    Object.defineProperty(window, 'G_CompareData', {
        get: () => State.compareData,
        set: (val) => { State.compareData = val; },
        configurable: true
    });
    
    Object.defineProperty(window, 'G_DynamicSubjectList', {
        get: () => State.dynamicSubjectList,
        set: (val) => { State.dynamicSubjectList = val; },
        configurable: true
    });
    
    Object.defineProperty(window, 'G_Statistics', {
        get: () => State.statistics,
        set: (val) => { State.statistics = val; },
        configurable: true
    });
    
    Object.defineProperty(window, 'G_CompareStatistics', {
        get: () => State.compareStatistics,
        set: (val) => { State.compareStatistics = val; },
        configurable: true
    });
    
    Object.defineProperty(window, 'G_SubjectConfigs', {
        get: () => State.subjectConfigs,
        set: (val) => { State.subjectConfigs = val; },
        configurable: true
    });
    
    Object.defineProperty(window, 'G_CurrentClassFilter', {
        get: () => State.currentClassFilter,
        set: (val) => { State.currentClassFilter = val; },
        configurable: true
    });
    
    Object.defineProperty(window, 'G_CurrentImportType', {
        get: () => State.currentImportType,
        set: (val) => { State.currentImportType = val; },
        configurable: true
    });
    
    Object.defineProperty(window, 'G_DashboardTableSort', {
        get: () => State.dashboardTableSort,
        set: (val) => { State.dashboardTableSort = val; },
        configurable: true
    });
    
    Object.defineProperty(window, 'G_ItemAnalysisData', {
        get: () => State.itemAnalysisData,
        set: (val) => { State.itemAnalysisData = val; },
        configurable: true
    });
    
    Object.defineProperty(window, 'G_ItemAnalysisConfig', {
        get: () => State.itemAnalysisConfig,
        set: (val) => { State.itemAnalysisConfig = val; },
        configurable: true
    });
    
    Object.defineProperty(window, 'G_GoalBaselineData', {
        get: () => State.goalBaselineData,
        set: (val) => { State.goalBaselineData = val; },
        configurable: true
    });
    
    Object.defineProperty(window, 'G_GoalOutcomeData', {
        get: () => State.goalOutcomeData,
        set: (val) => { State.goalOutcomeData = val; },
        configurable: true
    });
    
    Object.defineProperty(window, 'G_CurrentCollectionId', {
        get: () => State.currentCollectionId,
        set: (val) => { State.currentCollectionId = val; },
        configurable: true
    });
    
    Object.defineProperty(window, 'G_PhysicalData', {
        get: () => State.physicalData,
        set: (val) => { State.physicalData = val; },
        configurable: true
    });
    
    Object.defineProperty(window, 'G_CurrentSeatMap', {
        get: () => State.currentSeatMap,
        set: (val) => { State.currentSeatMap = val; },
        configurable: true
    });
    
    Object.defineProperty(window, 'G_AIChatHistory', {
        get: () => State.aiChatHistory,
        set: (val) => { State.aiChatHistory = val; },
        configurable: true
    });
    
    Object.defineProperty(window, 'G_CurrentHistoryId', {
        get: () => State.currentHistoryId,
        set: (val) => { State.currentHistoryId = val; },
        configurable: true
    });
    
    Object.defineProperty(window, 'G_TrendSort', {
        get: () => State.trendSort,
        set: (val) => { State.trendSort = val; },
        configurable: true
    });
    
    Object.defineProperty(window, 'G_ItemOutlierList', {
        get: () => State.itemOutlierList,
        set: (val) => { State.itemOutlierList = val; },
        configurable: true
    });
    
    Object.defineProperty(window, 'G_ItemDetailSort', {
        get: () => State.itemDetailSort,
        set: (val) => { State.itemDetailSort = val; },
        configurable: true
    });
    
    // ECharts 实例
    if (!window.echartsInstances) {
        window.echartsInstances = State.echartsInstances;
    }
}

