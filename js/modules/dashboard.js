/* eslint-disable no-undef */
'use strict';

/**
 * 模块一：整体成绩分析 (Dashboard)
 */

import { State } from '../config/state.js';
import { calculateAllStatistics } from '../utils/statistics.js';
import { renderHistogram, renderAverageRadar, renderSubjectBoxPlot, renderCorrelationScatterPlot, renderStackedBar } from '../charts/common.js';
import { renderClassComparisonChart, renderContributionChart, renderScoreCurve, calculateClassComparison } from '../charts/dashboard.js';

/**
 * 渲染 Dashboard 模块
 * @param {HTMLElement} container - 容器元素
 * @param {Object} data - 数据对象 { activeData, activeCompareData, stats, compareStats, currentFilter }
 */
export function renderDashboard(container, data) {
    const { activeData = [], stats = {}, currentFilter = 'ALL' } = data;
    const totalStats = stats.totalScore || {};

    // 计算基础 KPI
    const totalStudentCount = activeData.length;
    const participantCount = totalStats.count || 0;
    const missingCount = totalStudentCount - participantCount;

    // 动态表格状态
    let currentSelectedSubjects = [...State.dynamicSubjectList];

    // 构建 HTML 结构
    container.innerHTML = `
        <h2>模块一：整体成绩分析 (当前筛选: ${currentFilter})</h2>
        
        <div class="kpi-grid">
            <div class="kpi-card"><h3>总人数</h3><div class="value">${totalStudentCount}</div></div>
            <div class="kpi-card"><h3>考试人数</h3><div class="value">${participantCount}</div></div>
            <div class="kpi-card"><h3>缺考人数</h3><div class="value">${missingCount}</div></div>
            <div class="kpi-card"><h3>原始总分均分</h3><div class="value">${totalStats.average || 0}</div></div>
            <div class="kpi-card"><h3>原始总分最高</h3><div class="value">${totalStats.max || 0}</div></div>
            <div class="kpi-card"><h3>原始总分最低</h3><div class="value">${totalStats.min || 0}</div></div>
            <div class="kpi-card"><h3>总分中位数</h3><div class="value">${totalStats.median || 0}</div></div>
            <div class="kpi-card"><h3>总分优秀率 (%)</h3><div class="value">${totalStats.excellentRate || 0}</div></div>
            <div class="kpi-card"><h3>总分良好率 (%)</h3><div class="value">${totalStats.goodRate || 0}</div></div>
            <div class="kpi-card"><h3>总分及格率 (%)</h3><div class="value">${totalStats.passRate || 0}</div></div>
            <div class="kpi-card"><h3>总分不及格率 (%)</h3><div class="value">${totalStats.failRate || 0}</div></div>
            <div class="kpi-card"><h3>总分标准差</h3><div class="value">${totalStats.stdDev || 0}</div></div>
        </div>

        <div class="main-card-wrapper" style="margin-bottom: 20px; border-left: 5px solid #20c997;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; border-bottom:1px solid #eee; padding-bottom:10px; margin-bottom:15px;">
                <h3 style="margin:0; color:#333;">📈 成绩分段人数分布 (曲线图)</h3>
                <div class="controls-bar" style="background:transparent; box-shadow:none; padding:0; margin:0; align-items:center;">
                    <label>科目:</label>
                    <select id="curve-subject-select" class="sidebar-select" style="width:auto; min-width:100px;">
                        <option value="totalScore">总分</option>
                        <option value="ALL_SUBJECTS" style="color:#6f42c1; font-weight:bold;">📌 全科对比 (All)</option>
                        ${State.dynamicSubjectList.map(s => `<option value="${s}">${s}</option>`).join('')}
                    </select>
                    
                    <div style="display:flex; align-items:center; margin-left:15px;">
                        <input type="checkbox" id="curve-compare-class" style="margin-right:5px; cursor:pointer;">
                        <label for="curve-compare-class" style="cursor:pointer; user-select:none; font-weight:bold; color:#007bff;">对比各班</label>
                    </div>

                    <label style="margin-left:15px;">分段间隔:</label>
                    <input type="number" id="curve-bin-size" value="50" style="width:60px; text-align:center;" class="sidebar-select">
                    <button id="btn-update-curve" class="sidebar-button" style="margin-left:10px; padding:5px 15px; background-color:#20c997;">确定</button>
                </div>
            </div>
            <div class="chart-container" id="score-distribution-curve" style="height: 400px;"></div>
            <div id="curve-analysis-text" style="background:#f8f9fa; padding:15px; border-radius:6px; margin-top:10px; color:#555; font-size:0.95em; line-height:1.6;"></div>
        </div>

        <div class="main-card-wrapper" style="margin-bottom: 20px;">
            <h3>全科统计表</h3>
            <div class="table-container" style="max-height: 400px;">
                <table>
                    <thead>
                        <tr>
                            <th>科目</th><th>考试人数</th><th>平均分</th><th>最高分</th><th>中位数</th><th>优秀率 (%)</th><th>良好率 (%)</th><th>及格率 (%)</th><th>标准差</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="total-score-row">
                            <td><strong>${stats.totalScore?.name || '总分'}</strong></td>
                            <td>${stats.totalScore?.count || 0}</td><td>${stats.totalScore?.average || 0}</td><td>${stats.totalScore?.max || 0}</td><td>${stats.totalScore?.median || 0}</td>
                            <td>${stats.totalScore?.excellentRate || 0}</td><td>${stats.totalScore?.goodRate || 0}</td><td>${stats.totalScore?.passRate || 0}</td><td>${stats.totalScore?.stdDev || 0}</td>
                        </tr>
                        ${State.dynamicSubjectList.map(subject => stats[subject]).filter(s => s).map(s => `
                            <tr>
                                <td><strong>${s.name}</strong></td>
                                <td>${s.count}</td><td>${s.average}</td><td>${s.max}</td><td>${s.median}</td>
                                <td>${s.excellentRate}</td><td>${s.goodRate || 0}</td><td>${s.passRate}</td><td>${s.stdDev || 0}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="dashboard-chart-grid-2x2">
            <div class="main-card-wrapper"><div class="controls-bar chart-controls"><h4 style="margin:0;">全科分数分布箱形图</h4></div><div class="chart-container" id="subject-boxplot-chart" style="height: 350px;"></div></div>
            <div class="main-card-wrapper"><div class="controls-bar chart-controls"><label>科目:</label><select id="class-compare-subject" class="sidebar-select" style="min-width: 100px;"><option value="totalScore">总分</option>${State.dynamicSubjectList.map(s => `<option value="${s}">${s}</option>`).join('')}</select><label>指标:</label><select id="class-compare-metric" class="sidebar-select" style="min-width: 120px;"><option value="average">平均分</option><option value="passRate">及格率 (%)</option><option value="stdDev">标准差</option><option value="max">最高分</option><option value="median">中位数</option></select></div><div class="chart-container" id="class-compare-chart" style="height: 350px;"></div></div>
            <div class="main-card-wrapper"><div class="chart-container" id="radar-chart" style="height: 400px;"></div></div>
            
            <div class="main-card-wrapper"><div class="controls-bar chart-controls"><label>分段:</label><input type="number" id="histogram-bin-size" value="30" style="width: 60px;"><button id="histogram-redraw-btn" class="sidebar-button" style="width: auto;">重绘</button></div><div class="chart-container" id="histogram-chart" style="height: 350px;"></div></div>
            
            <div class="main-card-wrapper"><div class="controls-bar chart-controls"><label>X轴:</label><select id="scatter-x-subject" class="sidebar-select">${State.dynamicSubjectList.map(s => `<option value="${s}">${s}</option>`).join('')}</select><label>Y轴:</label><select id="scatter-y-subject" class="sidebar-select">${State.dynamicSubjectList.map((s, i) => `<option value="${s}" ${i === 1 ? 'selected' : ''}>${s}</option>`).join('')}</select></div><div class="chart-container" id="correlation-scatter-chart" style="height: 350px;"></div></div>
            <div class="main-card-wrapper"><div class="controls-bar chart-controls"><h4 style="margin:0;">各科 A/B/C/D 构成</h4></div><div class="chart-container" id="stacked-bar-chart" style="height: 350px;"></div></div>
            <div class="main-card-wrapper" style="grid-column: span 2;"><div class="controls-bar chart-controls"><h4 style="margin:0;">贡献度分析</h4></div><div class="chart-container" id="contribution-chart" style="height: 400px;"></div></div>
        </div>

        <div class="main-card-wrapper" style="margin-top: 20px; min-height: 500px;">
            <style>
                #dashboard-full-table th:nth-child(1), #dashboard-full-table td:nth-child(1) { position: sticky; left: 0; z-index: 2; background-color: #fff; width: 90px; }
                #dashboard-full-table th:nth-child(2), #dashboard-full-table td:nth-child(2) { position: sticky; left: 90px; z-index: 2; background-color: #fff; width: 90px; }
                #dashboard-full-table th:nth-child(3), #dashboard-full-table td:nth-child(3) { position: sticky; left: 180px; z-index: 2; background-color: #fff; width: 110px; border-right: 2px solid #dcdfe6 !important; box-shadow: 2px 0 5px -2px rgba(0,0,0,0.1); }
                #dashboard-full-table thead th:nth-child(1), #dashboard-full-table thead th:nth-child(2), #dashboard-full-table thead th:nth-child(3) { z-index: 5; background-color: #f8f9fa; }
                .subject-dropdown-content { display: none; position: absolute; background-color: #fff; min-width: 200px; box-shadow: 0 8px 16px rgba(0,0,0,0.2); z-index: 10; padding: 10px; border-radius: 4px; border: 1px solid #eee; top: 100%; left: 0; }
                .subject-dropdown-content.show { display: block; }
                .subject-checkbox-item { display: block; margin: 5px 0; cursor: pointer; }
            </style>

            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap: 15px; margin-bottom:15px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
                <div style="display:flex; flex-direction:column;">
                    <h3 style="margin:0; white-space: nowrap;">📋 动态成绩明细表</h3>
                    <span style="font-size:0.8em; color:#e6a23c; margin-top:4px;">⚡️ 勾选科目后，总分与排名将实时重算</span>
                </div>
                
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="position: relative;">
                        <button id="btn-toggle-subjects" class="sidebar-button" style="background-color:#6f42c1; padding: 6px 15px; font-size: 0.9em;">📚 选择科目 ▼</button>
                        <div id="subject-dropdown" class="subject-dropdown-content">
                            <div style="border-bottom:1px solid #eee; padding-bottom:5px; margin-bottom:5px; display:flex; justify-content:space-between;">
                                <span style="font-weight:bold; font-size:0.9em;">参与计算的科目:</span>
                                <a href="#" id="btn-all-subjects" style="font-size:0.8em; color:#007bff;">全选</a>
                            </div>
                            <div id="subject-checkbox-list" style="max-height:200px; overflow-y:auto;"></div>
                        </div>
                    </div>
                    <button id="btn-print-dynamic-table" class="sidebar-button" style="background-color:#17a2b8; padding: 6px 15px; font-size: 0.9em;">🖨️ 打印清单</button>
                    <div style="display:flex; align-items:center; gap:10px; background-color: #f8f9fa; padding: 6px 15px; border-radius: 20px; border: 1px solid #e9ecef;">
                        <span style="font-size:1.1em;">🔍</span>
                        <select id="dashboard-table-filter" class="sidebar-select" style="width:auto; min-width:130px; padding: 4px 8px; height: 34px; margin:0;">
                            <option value="ALL">-- 全部班级 --</option>
                        </select>
                        <input type="text" id="dashboard-table-search" placeholder="输入姓名或考号..." class="sidebar-select" style="width: 160px; padding: 4px 8px; height: 34px; margin:0;">
                    </div>
                </div>
            </div>
            
            <div class="table-container" style="max-height: 600px; overflow-y: auto; border: 1px solid #eee;">
                <table id="dashboard-full-table" style="border-collapse: separate; border-spacing: 0;">
                    <thead id="dashboard-table-head"></thead>
                    <tbody id="dashboard-full-tbody"></tbody>
                </table>
            </div>
            <div style="margin-top:8px; font-size:0.85em; color:#999; text-align:right;">
                * 向右滑动表格可固定身份列。显示格式：<b>分数 (年排)</b>。<span style="color:#dc3545;">红色</span>代表不及格。
            </div>
        </div>
    `;

    // ============================================
    // 定义绘图辅助函数
    // ============================================

    // (1) 直方图函数
    const drawHistogram = () => {
        if (totalStats.scores && totalStats.scores.length > 0) {
            const fullScore = State.dynamicSubjectList.reduce((sum, key) => sum + (State.subjectConfigs[key]?.full || 0), 0);
            const binSize = parseInt(document.getElementById('histogram-bin-size').value) || 30;
            renderHistogram('histogram-chart', activeData, 'totalScore', fullScore, `总分分数段直方图 (分段=${binSize})`, binSize);
        }
    };

    // (2) 曲线图函数
    const updateCurveChart = () => {
        const subject = document.getElementById('curve-subject-select').value;
        const binSize = parseInt(document.getElementById('curve-bin-size').value) || 50;
        const isClassCompare = document.getElementById('curve-compare-class').checked;

        // 如果是对比各班模式，使用所有数据；否则使用筛选数据
        const sourceData = isClassCompare ? State.studentsData : activeData;

        renderScoreCurve('score-distribution-curve', sourceData, subject, binSize, isClassCompare);
    };
    
    // 绑定 checkbox 的 change 事件
    const compareCb = document.getElementById('curve-compare-class');
    if(compareCb) {
        compareCb.addEventListener('change', updateCurveChart);
    }

    // (3) 班级对比图函数
    const updateClassChart = () => {
        const classCompareSel = document.getElementById('class-compare-subject');
        const classMetricSel = document.getElementById('class-compare-metric');
        if (!classCompareSel || currentFilter !== 'ALL') return;
        
        const d = calculateClassComparison(classMetricSel.value, classCompareSel.value);
        let subName = classCompareSel.value === 'totalScore' ? '总分' : classCompareSel.value;
        let metName = classMetricSel.options[classMetricSel.selectedIndex].text;
        renderClassComparisonChart('class-compare-chart', d, `各班级 - ${subName} ${metName} 对比`);
    };

    // (4) 散点图函数
    const updateScat = () => {
        const scatX = document.getElementById('scatter-x-subject');
        const scatY = document.getElementById('scatter-y-subject');
        if (scatX && scatY) {
            renderCorrelationScatterPlot('correlation-scatter-chart', activeData, scatX.value, scatY.value);
        }
    };

    // (5) 贡献度图函数
    const drawContribution = () => {
        if (currentFilter === 'ALL') {
            const contributionEl = document.getElementById('contribution-chart');
            if (contributionEl) {
                contributionEl.innerHTML = `<p style="text-align:center; padding-top:50px; color:#999;">请选择具体班级以查看贡献度分析。</p>`;
            }
            return;
        }
        const globalStats = calculateAllStatistics(State.studentsData, State.dynamicSubjectList, State.subjectConfigs); 
        const subjects = State.dynamicSubjectList;
        const contributionData = subjects.map(sub => {
            const classAvg = stats[sub] ? stats[sub].average : 0;
            const gradeAvg = globalStats[sub] ? globalStats[sub].average : 0;
            return parseFloat((classAvg - gradeAvg).toFixed(2));
        });
        const totalDiff = contributionData.reduce((a, b) => a + b, 0).toFixed(2);
        renderContributionChart('contribution-chart', subjects, contributionData, totalDiff);
    };

    // ============================================
    // 绑定事件
    // ============================================
    
    // 曲线图
    const curveBinInput = document.getElementById('curve-bin-size');
    const curveSubjectSelect = document.getElementById('curve-subject-select');
    document.getElementById('btn-update-curve').addEventListener('click', updateCurveChart);
    curveSubjectSelect.addEventListener('change', () => {
        if (curveSubjectSelect.value === 'totalScore') curveBinInput.value = 50;
        else curveBinInput.value = 10;
        updateCurveChart();
    });

    // 直方图
    document.getElementById('histogram-redraw-btn').addEventListener('click', drawHistogram);

    // 班级对比
    const classCompareSel = document.getElementById('class-compare-subject');
    const classMetricSel = document.getElementById('class-compare-metric');
    if(classCompareSel) {
        classCompareSel.addEventListener('change', updateClassChart);
        classMetricSel.addEventListener('change', updateClassChart);
    }

    // 散点图
    const scatX = document.getElementById('scatter-x-subject');
    const scatY = document.getElementById('scatter-y-subject');
    if(scatX) {
        scatX.addEventListener('change', updateScat);
        scatY.addEventListener('change', updateScat);
    }

    // ============================================
    // 动态表格逻辑实现
    // ============================================
    const initDynamicTable = () => {
        const dropdownBtn = document.getElementById('btn-toggle-subjects');
        const dropdownContent = document.getElementById('subject-dropdown');
        const checkboxList = document.getElementById('subject-checkbox-list');
        const btnAll = document.getElementById('btn-all-subjects');
        const filterSelect = document.getElementById('dashboard-table-filter');
        const searchInput = document.getElementById('dashboard-table-search');
        const tableHead = document.getElementById('dashboard-table-head');
        const tableBody = document.getElementById('dashboard-full-tbody');

        // A. 填充 Checkbox
        checkboxList.innerHTML = State.dynamicSubjectList.map(sub => `
            <label class="subject-checkbox-item">
                <input type="checkbox" value="${sub}" checked> ${sub}
            </label>
        `).join('');

        // B. 填充班级筛选
        const allClassSet = new Set(State.studentsData.map(s => s.class));
        const allClasses = Array.from(allClassSet).sort();
        filterSelect.innerHTML = `<option value="ALL">-- 全部班级 --</option>` + allClasses.map(c => `<option value="${c}">${c}</option>`).join('');
        if (currentFilter !== 'ALL') filterSelect.value = currentFilter;

        // --- 核心渲染函数 ---
        const renderDynamicData = () => {
            const dynamicData = State.studentsData.map(s => {
                let dynamicTotal = 0;
                let hasScore = false;
                currentSelectedSubjects.forEach(sub => {
                    const score = s.scores[sub];
                    if (typeof score === 'number') { dynamicTotal += score; hasScore = true; }
                });
                if (!hasScore) dynamicTotal = -1;
                return { raw: s, id: s.id, name: s.name, class: s.class, dynamicTotal: parseFloat(dynamicTotal.toFixed(2)), dynamicRank: 0 };
            });

            dynamicData.sort((a, b) => b.dynamicTotal - a.dynamicTotal);
            dynamicData.forEach((item, index) => {
                item.dynamicRank = (item.dynamicTotal >= 0) ? (index + 1) : '-';
                if (item.dynamicTotal < 0) item.dynamicTotal = 0;
            });

            const filterClass = filterSelect.value;
            const searchText = searchInput.value.toLowerCase().trim();
            let displayList = dynamicData.filter(item => {
                if (filterClass !== 'ALL' && item.class !== filterClass) return false;
                if (searchText && !item.name.includes(searchText) && !String(item.id).includes(searchText)) return false;
                return true;
            });

            const { key, direction } = State.dashboardTableSort;
            displayList.sort((a, b) => {
                let valA, valB;
                if (key === 'dynamicTotal' || key === 'dynamicRank') {
                    valA = a[key]; valB = b[key];
                    if (valA === '-') valA = -9999; if (valB === '-') valB = -9999;
                } else if (key.startsWith('scores.')) {
                    const sub = key.split('.')[1];
                    valA = a.raw.scores[sub] ?? -Infinity;
                    valB = b.raw.scores[sub] ?? -Infinity;
                } else { valA = a[key]; valB = b[key]; }
                if (typeof valA === 'string') return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                return direction === 'asc' ? valA - valB : valB - valA;
            });

            let theadHtml = `<tr><th data-sort="id" style="cursor:pointer;">学号 ⇅</th><th data-sort="name" style="cursor:pointer;">姓名 ⇅</th><th data-sort="class" style="cursor:pointer;">班级 ⇅</th>`;
            currentSelectedSubjects.forEach(sub => { theadHtml += `<th data-sort="scores.${sub}" style="cursor:pointer; min-width:80px;">${sub} ⇅</th>`; });
            theadHtml += `<th data-sort="dynamicTotal" style="cursor:pointer; background-color:#e8f0fe; min-width:90px; border-left:2px solid #eee;">自定义总分 ⇅</th><th data-sort="dynamicRank" style="cursor:pointer; background-color:#e8f0fe; min-width:80px;">  排名 ⇅</th></tr>`;
            tableHead.innerHTML = theadHtml;

            const limit = 500;
            const renderList = displayList.slice(0, limit);

            if (renderList.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="${5 + currentSelectedSubjects.length}" style="text-align:center; padding:20px; color:#999;">无数据</td></tr>`;
                return;
            }

            tableBody.innerHTML = renderList.map(item => {
                let row = `<tr><td>${item.id}</td><td style="font-weight:bold;">${item.name}</td><td>${item.class}</td>`;
                currentSelectedSubjects.forEach(sub => {
                    const score = item.raw.scores[sub];
                    const val = score !== undefined ? score : '-';
                    const rank = (item.raw.gradeRanks && item.raw.gradeRanks[sub]) ? item.raw.gradeRanks[sub] : '-';
                    const passLine = (State.subjectConfigs[sub] && State.subjectConfigs[sub].pass) ? State.subjectConfigs[sub].pass : 60;
                    const style = (typeof score === 'number' && score < passLine) ? 'color:#dc3545; font-weight:bold;' : '';
                    row += `<td style="${style}">${val} <span style="font-size:0.8em; color:#999; font-weight:normal;">(${rank})</span></td>`;
                });
                row += `<td style="font-weight:bold; color:#6f42c1; background-color:#f8faff; border-left:2px solid #eee;">${item.dynamicTotal}</td><td style="font-weight:bold; color:#6f42c1; background-color:#f8faff;">${item.dynamicRank}</td></tr>`;
                return row;
            }).join('');

            if (displayList.length > limit) tableBody.innerHTML += `<tr><td colspan="100" style="text-align:center; color:#999;">(仅显示前 ${limit} 条，请使用筛选缩小范围)</td></tr>`;
        };

        // 打印功能
        document.getElementById('btn-print-dynamic-table').addEventListener('click', () => {
            // 1. 基础计算：算总分、算年排
            const dynamicData = State.studentsData.map(s => {
                let dynamicTotal = 0;
                let hasScore = false;
                currentSelectedSubjects.forEach(sub => {
                    const score = s.scores[sub];
                    if (typeof score === 'number') { dynamicTotal += score; hasScore = true; }
                });
                if (!hasScore) dynamicTotal = -1;
                return { raw: s, dynamicTotal: parseFloat(dynamicTotal.toFixed(2)) };
            });
            
            // 全校排序 -> 得到年级排名
            dynamicData.sort((a, b) => b.dynamicTotal - a.dynamicTotal);
            dynamicData.forEach((item, index) => { 
                item.dynamicRank = (item.dynamicTotal >= 0) ? (index + 1) : '-'; 
            });

            // 2. 进阶计算：算班级排名
            const classGroups = {};
            dynamicData.forEach(item => {
                const cls = item.raw.class;
                if (!classGroups[cls]) classGroups[cls] = [];
                classGroups[cls].push(item);
            });
            Object.values(classGroups).forEach(group => {
                group.sort((a, b) => b.dynamicTotal - a.dynamicTotal);
                group.forEach((item, idx) => {
                    item.dynamicClassRank = (item.dynamicTotal >= 0) ? (idx + 1) : '-';
                });
            });

            // 3. 筛选
            const filterClass = filterSelect.value;
            const searchText = searchInput.value.toLowerCase().trim();
            const printList = dynamicData.filter(item => {
                if (filterClass !== 'ALL' && item.raw.class !== filterClass) return false;
                if (searchText && !item.raw.name.includes(searchText) && !String(item.raw.id).includes(searchText)) return false;
                return true;
            });

            if (printList.length === 0) { alert("当前列表为空"); return; }
            if (printList.length > 300 && !confirm(`即将打印 ${printList.length} 条数据，确认？`)) return;

            // 4. 生成 HTML
            let rowsHtml = '';
            printList.forEach((item, index) => {
                const s = item.raw;
                let scoresHtml = '';
                
                currentSelectedSubjects.forEach(sub => {
                    const score = s.scores[sub] !== undefined ? s.scores[sub] : '-';
                    const rank = (s.gradeRanks && s.gradeRanks[sub]) ? s.gradeRanks[sub] : '-';
                    const passLine = (State.subjectConfigs[sub] && State.subjectConfigs[sub].pass) ? State.subjectConfigs[sub].pass : 60;
                    const colorStyle = (typeof s.scores[sub] === 'number' && s.scores[sub] < passLine) ? 'color:#dc3545;' : '';

                    scoresHtml += `
                        <div class="score-item">
                            <span class="subject-name">${sub}</span>
                            <span class="score-val" style="${colorStyle}">
                                ${score} <span style="font-size:0.8em; color:#999; font-weight:normal;">(${rank})</span>
                            </span>
                        </div>`;
                });

                rowsHtml += `
                    <div class="student-row">
                        <div class="student-info">
                            <div style="display:flex; flex-direction:column; gap:2px; margin-right:5px;">
                                <span class="rank-badge" style="background:#555;" title="年级排名">年${item.dynamicRank}</span>
                                <span class="rank-badge" style="background:#17a2b8;" title="班级排名">班${item.dynamicClassRank}</span>
                            </div>
                            <div style="display:flex; flex-direction:column;">
                                <span class="name">${s.name}</span>
                                <span class="class">${s.class}</span>
                            </div>
                        </div>
                        <div class="scores-grid">${scoresHtml}</div>
                        <div class="total-info">
                            <span>总分: <strong>${item.dynamicTotal >= 0 ? item.dynamicTotal : '-'}</strong></span>
                        </div>
                    </div>
                `;
                
                if (index < printList.length - 1) {
                    rowsHtml += `<div class="spacer"></div><div class="dashed-line"></div><div class="spacer"></div>`;
                }
            });

            const printHtml = `
                <html>
                <head>
                    <title>成绩清单</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; color: #333; }
                        h2 { text-align: center; margin-bottom: 10px; }
                        
                        .student-row { display: flex; align-items: center; justify-content: space-between; padding: 5px 0; }
                        
                        .student-info { width: 180px; display: flex; align-items: center; gap: 8px; border-right: 1px solid #eee; padding-right: 10px; }
                        
                        .rank-badge { 
                            color: white; padding: 1px 4px; border-radius: 3px; 
                            min-width: 35px; text-align: center; font-size: 0.8em; font-weight: bold; 
                        }
                        .name { font-weight: bold; font-size: 1.1em; } 
                        .class { color: #666; font-size: 0.85em; }
                        
                        .scores-grid { display: flex; flex-wrap: wrap; gap: 8px; flex: 1; padding: 0 15px; }
                        .score-item { border: 1px solid #eee; padding: 2px 6px; font-size: 0.9em; background: #f9f9f9; border-radius: 3px; }
                        .subject-name { color: #888; margin-right: 3px; }
                        .score-val { font-weight: bold; }
                        
                        .total-info { width: 120px; text-align: right; color: #6f42c1; font-size: 1.1em; }
                        
                        .dashed-line { border-bottom: 1px dashed #ccc; width: 100%; }
                        .spacer { height: 8px; }
                        
                        @media print { 
                            .rank-badge { -webkit-print-color-adjust: exact; } 
                            .score-item { -webkit-print-color-adjust: exact; }
                        }
                    </style>
                </head>
                <body>
                    <h2>📄 动态成绩清单</h2>
                    <p style="text-align:center;color:#666;font-size:0.9em; margin-bottom:20px;">
                        包含科目：${currentSelectedSubjects.join('、')}
                    </p>
                    ${rowsHtml}
                </body>
                </html>
            `;
            
            const win = window.open('', '_blank');
            win.document.write(printHtml);
            win.document.close();
            setTimeout(() => { win.focus(); win.print(); }, 500);
        });

        // --- 事件绑定 ---
        const triggerUpdate = () => {
            const cbs = checkboxList.querySelectorAll('input:checked');
            currentSelectedSubjects = Array.from(cbs).map(cb => cb.value);
            dropdownBtn.innerText = `📚 选择科目 (${currentSelectedSubjects.length}) ▼`;
            renderDynamicData();
        };
        checkboxList.addEventListener('change', triggerUpdate);
        btnAll.addEventListener('click', (e) => {
            e.preventDefault();
            const cbs = checkboxList.querySelectorAll('input');
            const allChecked = Array.from(cbs).every(cb => cb.checked);
            cbs.forEach(cb => cb.checked = !allChecked);
            triggerUpdate();
        });
        dropdownBtn.addEventListener('click', (e) => { e.stopPropagation(); dropdownContent.classList.toggle('show'); });
        document.addEventListener('click', (e) => { if (!dropdownBtn.contains(e.target) && !dropdownContent.contains(e.target)) dropdownContent.classList.remove('show'); });
        filterSelect.addEventListener('change', renderDynamicData);
        searchInput.addEventListener('input', renderDynamicData);
        tableHead.addEventListener('click', (e) => {
            const th = e.target.closest('th'); if (!th) return;
            const sortKey = th.dataset.sort;
            if (sortKey) {
                if (State.dashboardTableSort.key === sortKey) State.dashboardTableSort.direction = State.dashboardTableSort.direction === 'asc' ? 'desc' : 'asc';
                else { State.dashboardTableSort.key = sortKey; State.dashboardTableSort.direction = 'desc'; }
                renderDynamicData();
            }
        });

        renderDynamicData();
    };

    // 初始执行
    updateCurveChart();
    drawHistogram();
    updateClassChart();
    updateScat();
    drawContribution();
    renderAverageRadar('radar-chart', stats);
    renderSubjectBoxPlot('subject-boxplot-chart', stats, activeData);
    renderStackedBar('stacked-bar-chart', stats, State.subjectConfigs);
    
    initDynamicTable();
}

