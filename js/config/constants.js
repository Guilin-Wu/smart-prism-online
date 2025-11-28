/* eslint-disable no-undef */
'use strict';

// 模块定义
export const ALL_MODULE_DEFINITIONS = [
    { id: 'dashboard', name: '📈 整体成绩分析' },
    { id: 'student', name: '👩‍🎓 学生个体报告' },
    { id: 'paper', name: '📝 试卷科目分析' },
    { id: 'single-subject', name: '🎯 单科成绩分析' },
    { id: 'boundary', name: '📊 临界生分析' },
    { id: 'holistic', name: '⚖️ 全科均衡分析' },
    { id: 'trend-distribution', name: '🌊 成绩分布变动' },
    { id: 'groups', name: '🎯 学生分层筛选' },
    { id: 'correlation', name: '🌡️ 学科关联矩阵' },
    { id: 'weakness', name: '📉 偏科诊断分析' },
    { id: 'trend', name: '🚀 成绩趋势对比' },
    { id: 'item-analysis', name: '🔬 学科小题分析' },
    { id: 'ai-advisor', name: '🤖 AI 智能分析' },
    { id: 'goal-setting', name: '🎯 目标与规划' },
    { id: 'exam-arrangement', name: '🧘 考场编排' },
    { id: 'study-groups', name: '🧩 智能互助分组' },
    { id: 'comment-gen', name: '✍️ 评语生成助手' },
    { id: 'weakness-workbook', name: '📝 错题攻坚本' }
];

// 存储键名
export const STORAGE_KEYS = {
    STUDENTS_DATA: 'G_StudentsData',
    COMPARE_DATA: 'G_CompareData',
    MAIN_FILE_NAME: 'G_MainFileName',
    COMPARE_FILE_NAME: 'G_CompareFileName',
    SUBJECT_CONFIGS: 'G_SubjectConfigs',
    ITEM_ANALYSIS_DATA: 'G_ItemAnalysisData',
    ITEM_ANALYSIS_CONFIG: 'G_ItemAnalysisConfig',
    AI_HISTORY: 'G_AI_History_Archive',
    MULTI_EXAM_COLLECTIONS: 'G_MultiExam_Collections_V2',
    APP_THEME: 'app_theme'
};

