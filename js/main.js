/* eslint-disable no-undef */
'use strict';

/**
 * 应用主入口文件
 * 初始化应用并绑定事件
 */

import { State } from './config/state.js';
import { CONFIG } from './config/config.js';
import { STORAGE_KEYS } from './config/constants.js';
import { loadDataFromStorage, saveDataToStorage, clearAllStorage } from './data/storage.js';
import { loadExcelData } from './data/parser.js';
import { addSubjectRanksToData } from './data/parser.js';
import { calculateAllStatistics, calculateStandardScores } from './utils/statistics.js';
import { populateClassFilter, initializeSubjectConfigs } from './utils/helpers.js';
import { runAnalysisAndRender } from './core/app.js';
import { registerModule, renderModule } from './core/router.js';

// 导入模块
import { renderDashboard } from './modules/dashboard.js';
import { renderStudent } from './modules/student.js';
import { renderPaper } from './modules/paper.js';
import { renderSingleSubject } from './modules/single-subject.js';
import { renderBoundary } from './modules/boundary.js';
import { renderHolisticBalance } from './modules/holistic.js';
import { renderTrend } from './modules/trend.js';
import { renderGroups } from './modules/groups.js';
import { renderCorrelation } from './modules/correlation.js';
import { renderWeakness } from './modules/weakness.js';
import { renderExamArrangement } from './modules/exam-arrangement.js';
import { renderStudyGroups } from './modules/study-groups.js';
import { renderHonorWall } from './modules/honor-wall.js';
import { renderCommentGenerator } from './modules/comment-gen.js';
import { renderWeaknessWorkbook } from './modules/weakness-workbook.js';
import { renderMultiExam } from './modules/multi-exam/index.js';
import { renderItemAnalysis } from './modules/item-analysis/index.js';
import { renderGoalSetting } from './modules/goal-setting/index.js';
import { renderAIAdvisor } from './modules/ai-advisor.js';
import * as AIAdvisor from './modules/ai-advisor.js';
import { renderTrendDistribution } from './modules/trend-distribution.js';

// 导入图表函数（导出到全局供旧代码使用）
import * as ChartsCommon from './charts/common.js';
import * as ChartsDashboard from './charts/dashboard.js';
import * as ChartsStudent from './charts/student.js';
import * as ChartsPaper from './charts/paper.js';
import * as ChartsSingleSubject from './charts/single-subject.js';
import * as ChartsGroups from './charts/groups.js';
import * as ChartsCorrelation from './charts/correlation.js';
import * as ChartsWeakness from './charts/weakness.js';

// 导入工具函数
import { calculateCorrelation } from './utils/correlation.js';
import { calculateWeaknessData } from './utils/weakness.js';

// DOM 元素引用
let fileUploader, fileUploaderCompare, navLinks, modulePanels, welcomeScreen;
let classFilterContainer, classFilterSelect, classFilterHr;
let modal, modalCloseBtn, modalSaveBtn, configSubjectsBtn, subjectConfigTableBody;
let echartsInstances = {};

/**
 * 初始化应用
 */
async function init() {
    // 绑定 DOM 元素
    fileUploader = document.getElementById('file-uploader');
    fileUploaderCompare = document.getElementById('file-uploader-compare');
    navLinks = document.querySelectorAll('.nav-link');
    modulePanels = document.querySelectorAll('.module-panel');
    welcomeScreen = document.getElementById('welcome-screen');

    classFilterContainer = document.getElementById('class-filter-container');
    classFilterSelect = document.getElementById('class-filter');
    classFilterHr = document.getElementById('class-filter-hr');

    modal = document.getElementById('subject-config-modal');
    modalCloseBtn = document.getElementById('modal-close-btn');
    modalSaveBtn = document.getElementById('modal-save-btn');
    configSubjectsBtn = document.getElementById('config-subjects-btn');
    subjectConfigTableBody = document.getElementById('subject-config-table')?.getElementsByTagName('tbody')[0];

    // 初始化 UI
    initializeUI();
    
    // 初始化科目配置
    if (State.dynamicSubjectList.length === 0) {
        State.dynamicSubjectList = [...CONFIG.DEFAULT_SUBJECT_LIST];
    }
    State.subjectConfigs = initializeSubjectConfigs(State.dynamicSubjectList);

    // 加载数据
    try {
        await loadInitialData();
    } catch (error) {
        console.error('加载初始数据失败:', error);
    }

    // 注册模块
    registerModule('dashboard', renderDashboard);
    registerModule('student', renderStudent);
    registerModule('paper', renderPaper);
    registerModule('single-subject', renderSingleSubject);
    registerModule('boundary', renderBoundary);
    registerModule('holistic', renderHolisticBalance);
    registerModule('trend', renderTrend);
    registerModule('groups', renderGroups);
    registerModule('correlation', renderCorrelation);
    registerModule('weakness', renderWeakness);
    registerModule('exam-arrangement', renderExamArrangement);
    registerModule('study-groups', renderStudyGroups);
    registerModule('honor', renderHonorWall);
    registerModule('comment-gen', renderCommentGenerator);
    registerModule('weakness-workbook', renderWeaknessWorkbook);
    registerModule('multi-exam', renderMultiExam);
    registerModule('item-analysis', renderItemAnalysis);
    registerModule('goal-setting', renderGoalSetting);
    registerModule('ai-advisor', renderAIAdvisor);
    registerModule('trend-distribution', renderTrendDistribution);

    // 绑定事件
    bindEvents();
}

/**
 * 加载初始数据
 */
async function loadInitialData() {
    const stored = await loadDataFromStorage();
    
    if (!stored.studentsData) {
        console.log("📭 本地存储为空，等待用户导入...");
        return;
    }

    // 处理数据类型（兼容性）
    State.studentsData = typeof stored.studentsData === 'string' 
        ? JSON.parse(stored.studentsData) 
        : stored.studentsData;

    if (stored.compareData) {
        State.compareData = typeof stored.compareData === 'string'
            ? JSON.parse(stored.compareData)
            : stored.compareData;
    }

    // 重建科目列表
    if (State.studentsData.length > 0) {
        const allSubjects = new Set();
        State.studentsData.forEach(student => {
            if (student.scores) {
                Object.keys(student.scores).forEach(subject => allSubjects.add(subject));
            }
        });
        if (allSubjects.size > 0) {
            State.dynamicSubjectList = Array.from(allSubjects);
        }
    }

    // 加载配置
    if (stored.configs) {
        State.subjectConfigs = stored.configs;
    } else {
        State.subjectConfigs = initializeSubjectConfigs(State.dynamicSubjectList);
    }

    // 确保所有科目都有配置
    State.dynamicSubjectList.forEach(subject => {
        if (!State.subjectConfigs[subject]) {
            const isY_S_W = ['语文', '数学', '英语'].includes(subject);
            State.subjectConfigs[subject] = {
                full: isY_S_W ? 150 : 100,
                excel: isY_S_W ? 120 : 85,
                good: isY_S_W ? 105 : 75,
                pass: isY_S_W ? 90 : 60,
                low: isY_S_W ? 45 : 30,
                isAssigned: false
            };
        }
    });

    // 更新 UI
    populateClassFilter(State.studentsData, classFilterSelect);
    if (welcomeScreen) welcomeScreen.style.display = 'none';
    
    const compareBtn = document.getElementById('import-compare-btn');
    if (compareBtn) compareBtn.classList.remove('disabled');
    
    navLinks.forEach(l => l.classList.remove('disabled'));
    if (classFilterContainer) classFilterContainer.style.display = 'block';
    if (classFilterHr) classFilterHr.style.display = 'block';

    if (stored.mainFile) {
        const mainBtn = document.getElementById('import-main-btn');
        if (mainBtn) mainBtn.innerHTML = `✅ ${stored.mainFile} (已加载)`;
    }
    if (stored.compareFile && compareBtn) {
        compareBtn.innerHTML = `✅ ${stored.compareFile} (已加载)`;
    }

    // 运行分析
    runAnalysisAndRender();
}

/**
 * 初始化 UI
 */
function initializeUI() {
    const compareBtn = document.getElementById('import-compare-btn');
    if (compareBtn) compareBtn.classList.add('disabled');
    
    navLinks.forEach(link => {
        const module = link.getAttribute('data-module');
        if (module === 'multi-exam' || module === 'item-analysis') {
            link.classList.remove('disabled');
        } else if (!link.classList.contains('active')) {
            link.classList.add('disabled');
        }
    });
}

/**
 * 处理文件数据
 */
async function handleFileData(event, type) {
    const file = event.target.files[0];
    if (!file) return;

    const label = type === 'main' 
        ? document.getElementById('import-main-btn')
        : document.getElementById('import-compare-btn');
    const statusLabel = label || event.target.previousElementSibling;
    if (statusLabel) statusLabel.innerHTML = "🔄 正在解析...";

    try {
        // 解析文件
        const { processedData, dynamicSubjectList } = await loadExcelData(file);

        // 预处理
        if (type === 'main') {
            State.dynamicSubjectList = dynamicSubjectList;
            State.subjectConfigs = initializeSubjectConfigs(dynamicSubjectList);
            await saveDataToStorage(STORAGE_KEYS.SUBJECT_CONFIGS, State.subjectConfigs);
        }

        const rankedData = addSubjectRanksToData(processedData, State.dynamicSubjectList);

        // 保存数据
        const key = type === 'main' ? STORAGE_KEYS.STUDENTS_DATA : STORAGE_KEYS.COMPARE_DATA;
        const fileKey = type === 'main' ? STORAGE_KEYS.MAIN_FILE_NAME : STORAGE_KEYS.COMPARE_FILE_NAME;

        if (type === 'main') {
            State.studentsData = rankedData;
        } else {
            State.compareData = rankedData;
        }

        await saveDataToStorage(key, rankedData);
        await saveDataToStorage(fileKey, file.name);

        // 更新 UI
        if (type === 'main') {
            populateClassFilter(State.studentsData, classFilterSelect);
            if (welcomeScreen) welcomeScreen.style.display = 'none';
            const compareBtn = document.getElementById('import-compare-btn');
            if (compareBtn) compareBtn.classList.remove('disabled');
            navLinks.forEach(l => l.classList.remove('disabled'));
            if (classFilterContainer) classFilterContainer.style.display = 'block';
            if (classFilterHr) classFilterHr.style.display = 'block';
        }

        if (statusLabel) statusLabel.innerHTML = `✅ ${file.name} (已加载)`;
        event.target.value = '';

        // 运行分析
        runAnalysisAndRender();

    } catch (err) {
        console.error(err);
        if (statusLabel) statusLabel.innerHTML = `❌ 失败`;
        alert(`保存失败：${err.message}`);
        event.target.value = '';
    }
}

/**
 * 绑定事件
 */
function bindEvents() {
    // 文件上传
    if (fileUploader) {
        fileUploader.addEventListener('change', (event) => handleFileData(event, 'main'));
    }
    if (fileUploaderCompare) {
        fileUploaderCompare.addEventListener('change', (event) => handleFileData(event, 'compare'));
    }

    // 兼容：点击左侧的 label 元素也应打开对应的隐藏 input
    const importMainLabel = document.getElementById('import-main-btn');
    if (importMainLabel && fileUploader) {
        importMainLabel.addEventListener('click', () => fileUploader.click());
    }
    const importCompareLabel = document.getElementById('import-compare-btn');
    if (importCompareLabel && fileUploaderCompare) {
        importCompareLabel.addEventListener('click', () => fileUploaderCompare.click());
    }

    // 导航切换
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetModule = link.getAttribute('data-module');
            
            if (targetModule !== 'multi-exam' && targetModule !== 'item-analysis' && link.classList.contains('disabled')) {
                alert('请先导入本次成绩数据！');
                return;
            }

            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            runAnalysisAndRender();
        });
    });

    // 班级筛选
    if (classFilterSelect) {
        classFilterSelect.addEventListener('change', () => {
            State.currentClassFilter = classFilterSelect.value;
            runAnalysisAndRender();
        });
    }

    // 窗口大小变化
    window.addEventListener('resize', () => {
        for (const key in echartsInstances) {
            if (echartsInstances[key]) {
                echartsInstances[key].resize();
            }
        }
    });

    // 主题切换
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
        const currentTheme = localStorage.getItem(STORAGE_KEYS.APP_THEME) || 'light';
        if (currentTheme === 'dark') {
            document.body.setAttribute('data-theme', 'dark');
        }

        themeBtn.addEventListener('click', () => {
            const isDark = document.body.getAttribute('data-theme') === 'dark';
            if (isDark) {
                document.body.removeAttribute('data-theme');
                localStorage.setItem(STORAGE_KEYS.APP_THEME, 'light');
            } else {
                document.body.setAttribute('data-theme', 'dark');
                localStorage.setItem(STORAGE_KEYS.APP_THEME, 'dark');
            }
            runAnalysisAndRender();
        });
    }

    // 清除所有数据
    const clearAllBtn = document.getElementById('clear-all-data-btn');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', async () => {
            if (confirm("⚠️ 高能预警\n\n您确定要清除所有已导入的\"本次成绩\"和\"对比成绩\"吗？\n此操作不可恢复！\n\n(注意：此操作【不会】清除\"数据管理中心\"中的历史存档)")) {
                const originalText = clearAllBtn.innerHTML;
                clearAllBtn.innerText = "🧹 正在强力清理...";
                clearAllBtn.disabled = true;

                try {
                    await clearAllStorage();
                    alert("✅ 数据已彻底清除，系统即将重启。");
                    location.reload();
                } catch (err) {
                    console.error("清除失败:", err);
                    alert("❌ 清除过程中出现错误，请尝试手动清除浏览器缓存。");
                    clearAllBtn.innerText = originalText;
                    clearAllBtn.disabled = false;
                }
            }
        });
    }
}

// 导出到全局，供旧代码兼容使用
window.State = State;
window.runAnalysisAndRender = runAnalysisAndRender;

// 兼容旧代码：导出常用函数到全局
window.loadExcelData = loadExcelData;
window.addSubjectRanksToData = (data) => addSubjectRanksToData(data, State.dynamicSubjectList);
window.calculateAllStatistics = (data) => calculateAllStatistics(data, State.dynamicSubjectList, State.subjectConfigs);
window.calculateStandardScores = (students, stats) => calculateStandardScores(students, stats, State.dynamicSubjectList);
window.populateClassFilter = (students, select) => populateClassFilter(students, select || classFilterSelect);
window.initializeSubjectConfigs = () => {
    State.subjectConfigs = initializeSubjectConfigs(State.dynamicSubjectList);
};

// 导出图表函数到全局（供旧代码使用）
window.renderHistogram = ChartsCommon.renderHistogram;
window.renderAverageRadar = ChartsCommon.renderAverageRadar;
window.renderSubjectBoxPlot = ChartsCommon.renderSubjectBoxPlot;
window.renderCorrelationScatterPlot = ChartsCommon.renderCorrelationScatterPlot;
window.renderStackedBar = ChartsCommon.renderStackedBar;
window.renderSubjectComparisonBarChart = ChartsCommon.renderSubjectComparisonBarChart;
window.renderClassComparisonChart = ChartsDashboard.renderClassComparisonChart;
window.renderContributionChart = ChartsDashboard.renderContributionChart;
window.renderScoreCurve = ChartsDashboard.renderScoreCurve;
window.calculateClassComparison = ChartsDashboard.calculateClassComparison;
window.renderStudentRadar = ChartsStudent.renderStudentRadar;
window.renderDifficultyScatter = ChartsPaper.renderDifficultyScatter;
window.renderSingleSubjectClassBoxplot = ChartsSingleSubject.renderSingleSubjectClassBoxplot;
window.renderSingleSubjectQuadrant = ChartsSingleSubject.renderSingleSubjectQuadrant;
window.renderSingleSubjectPie = ChartsSingleSubject.renderSingleSubjectPie;
window.renderGroupClassPie = ChartsGroups.renderGroupClassPie;
window.renderGroupRadarChart = ChartsGroups.renderGroupRadarChart;
window.renderCorrelationHeatmapV2 = ChartsCorrelation.renderCorrelationHeatmapV2;
window.renderCorrelationNetwork = ChartsCorrelation.renderCorrelationNetwork;
window.renderSubjectCentrality = ChartsCorrelation.renderSubjectCentrality;
window.renderWeaknessScatter = ChartsWeakness.renderWeaknessScatter;
window.calculateCorrelation = calculateCorrelation;
window.calculateWeaknessData = calculateWeaknessData;

// AI 模块兼容性导出（短期 shim）
window.initAIModule = window.initAIModule || AIAdvisor.initAIModule;
window.generateAIPrompt = window.generateAIPrompt || AIAdvisor.generateAIPrompt;
window.runAIAnalysis = window.runAIAnalysis || AIAdvisor.runAIAnalysis;
window.sendAIFollowUp = window.sendAIFollowUp || AIAdvisor.sendAIFollowUp;
window.saveToAIHistory = window.saveToAIHistory || AIAdvisor.saveToAIHistory;
window.loadAIHistoryItem = window.loadAIHistoryItem || AIAdvisor.loadAIHistoryItem;
window.deleteAIHistoryItem = window.deleteAIHistoryItem || AIAdvisor.deleteAIHistoryItem;
window.renderMarkdownWithMath = window.renderMarkdownWithMath || AIAdvisor.renderMarkdownWithMath;
window.printSingleChatTurn = window.printSingleChatTurn || AIAdvisor.printSingleChatTurn;
window.reattachPrintHandlers = window.reattachPrintHandlers || AIAdvisor.reattachPrintHandlers;
window.AI_HISTORY_KEY = window.AI_HISTORY_KEY || AIAdvisor.AI_HISTORY_KEY;
window.saveBatchToHistory = window.saveBatchToHistory || AIAdvisor.saveBatchToHistory;
window.forceBatchSave = window.forceBatchSave || AIAdvisor.forceBatchSave;

// 启动应用
// 注意：由于 script.js 也有 DOMContentLoaded，这里只导出函数供全局使用
// 实际初始化由 script.js 完成

// 检测是否需要独立初始化（当 script.js 不存在时）
if (typeof window.SCRIPT_JS_LOADED === 'undefined') {
    // script.js 未加载，使用 main.js 初始化
    document.addEventListener('DOMContentLoaded', () => {
        init().catch(console.error);
    });
}

// 导出 init 函数供测试使用
window.initModularApp = init;

