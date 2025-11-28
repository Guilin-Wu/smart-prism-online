/* eslint-disable no-undef */
'use strict';

/**
 * 应用核心管理
 * 处理数据分析和渲染流程
 */

import { State } from '../config/state.js';
import { calculateAllStatistics, calculateStandardScores } from '../utils/statistics.js';
import { renderModule } from './router.js';

/**
 * 运行分析并渲染
 * @param {Object} options - 配置选项
 */
export function runAnalysisAndRender(options = {}) {
    const {
        currentModule = null,
        classFilter = State.currentClassFilter,
        studentsData = State.studentsData,
        compareData = State.compareData,
        subjectList = State.dynamicSubjectList,
        subjectConfigs = State.subjectConfigs
    } = options;

    // 1. 获取当前要渲染的模块
    let targetModule = currentModule;
    if (!targetModule) {
        const currentModuleLink = document.querySelector('.nav-link.active');
        if (!currentModuleLink) return;
        targetModule = currentModuleLink.dataset.module;
    }

    // 2. 特殊模块处理（不需要数据）
    if (targetModule === 'multi-exam' || targetModule === 'item-analysis') {
        renderModule(targetModule, { activeData: [], activeCompareData: [] });
        return;
    }

    // 3. 数据检查
    if (!studentsData || studentsData.length === 0) {
        console.warn("runAnalysisAndRender: studentsData 为空，已退出。");
        return;
    }

    // 4. 根据班级筛选
    const classFilterSelect = document.getElementById('class-filter');
    const currentFilter = classFilterSelect ? classFilterSelect.value : classFilter;
    
    let activeData = studentsData;
    let activeCompareData = compareData || [];

    if (currentFilter !== 'ALL') {
        activeData = studentsData.filter(s => s.class === currentFilter);
        if (activeCompareData.length > 0) {
            activeCompareData = activeCompareData.filter(s => s.class === currentFilter);
        }
    }

    // 5. 重新计算统计数据
    const stats = calculateAllStatistics(activeData, subjectList, subjectConfigs);
    calculateStandardScores(activeData, stats, subjectList);
    
    let compareStats = {};
    if (activeCompareData.length > 0) {
        compareStats = calculateAllStatistics(activeCompareData, subjectList, subjectConfigs);
        calculateStandardScores(activeCompareData, compareStats, subjectList);
    }

    // 6. 更新全局状态
    State.statistics = stats;
    State.compareStatistics = compareStats;
    State.currentClassFilter = currentFilter;

    // 7. 渲染当前激活的模块
    renderModule(targetModule, {
        activeData,
        activeCompareData,
        stats,
        compareStats,
        currentFilter
    });
}

