/* eslint-disable no-undef */
'use strict';

import { State } from '../config/state.js';
import { addSubjectRanksToData } from '../data/parser.js';
import { renderOverlappingHistogram, renderTrendCompositionChart, renderRankingSankey } from '../charts/trend-distribution.js';

/**
 * 模块七：成绩分布变动
 */
export function renderTrendDistribution(container, data) {
    const { activeData = [], activeCompareData = [], stats = {}, compareStats = {}, currentFilter = 'ALL' } = data;

    // 1. 检查数据
    if (!activeCompareData || activeCompareData.length === 0) {
        container.innerHTML = `<h2>模块七：成绩分布变动</h2><p>请先在侧边栏导入 "对比成绩" 数据。</p>`;
        return;
    }
    
    // 自动补全排名数据
    let compareData = [...activeCompareData];
    if (compareData.length > 0 && !compareData[0].gradeRanks) {
        compareData = addSubjectRanksToData(compareData, State.dynamicSubjectList);
        State.compareData = compareData;
    }

    // 2. 渲染 HTML
    container.innerHTML = `
        <h2>模块七：成绩分布变动 (当前筛选: ${currentFilter})</h2>

        <div class="main-card-wrapper" style="margin-bottom: 20px;">
            <div class="controls-bar chart-controls" style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                
                <div>
                    <label for="dist-subject-select">选择科目:</label>
                    <select id="dist-subject-select" class="sidebar-select" style="min-width: 120px;">
                        <option value="totalScore">总分</option>
                        ${State.dynamicSubjectList.map(s => `<option value="${s}">${s}</option>`).join('')}
                    </select>
                </div>

                <div>
                    <label>统计模式:</label>
                    <select id="dist-hist-mode" class="sidebar-select" style="width:auto; font-weight:bold; color:#20c997; border-color:#20c997;">
                        <option value="raw">📊 原始分</option>
                        <option value="tscore">⚖️ T分 (标准分)</option>
                    </select>
                </div>

                <div style="border-left: 1px solid #ddd; padding-left: 15px; display: flex; align-items: center; gap: 10px;">
                    <label for="dist-bin-size">分段间隔:</label>
                    <input type="number" id="dist-bin-size" class="sidebar-select" placeholder="自动" style="width: 70px;">
                    <button id="dist-redraw-btn" class="sidebar-button" style="padding: 6px 12px;">🔄 重绘</button>
                </div>
            </div>
            <div class="chart-container" id="dist-overlap-histogram-chart" style="height: 500px;"></div>
        </div>

        <div class="main-card-wrapper" style="margin-bottom: 20px;">
            <div class="controls-bar chart-controls" style="border-bottom: none; padding-bottom: 0; margin-bottom: 10px; flex-wrap: wrap; justify-content: space-between;">
                <div style="display:flex; align-items:center; gap:15px;">
                    <h4 style="margin: 0;">各科等级构成对比</h4>
                    <select id="dist-comp-mode" class="sidebar-select" style="width:auto; font-weight:bold; color:#007bff; border-color:#007bff;">
                        <option value="raw">📊 原始分模式</option>
                        <option value="tscore">⚖️ T分模式</option>
                    </select>
                </div>
                <button id="dist-export-composition-btn" class="sidebar-button" style="padding: 4px 12px; font-size: 0.85em; background-color: var(--color-green);">
                    📥 导出名单
                </button>
            </div>
            <p style="font-size: 0.8em; color: var(--text-muted); margin-top: -5px; margin-bottom: 10px;" id="dist-comp-desc">
                * 原始分模式：A(优秀线), B(良好线), C(及格线) | T分模式：A(T≥60), B(T≥50), C(T≥40)
            </p>
            <div class="chart-container" id="dist-composition-compare-chart" style="height: 450px;"></div>
        </div>

        <div class="main-card-wrapper">
            <div class="controls-bar chart-controls" style="border-bottom: none; padding-bottom: 0; margin-bottom: 10px;">
                <h4 style="margin: 0; margin-right: 20px;">排名分层流动图</h4>
                <label>分析对象:</label>
                <select id="dist-sankey-subject-select" class="sidebar-select" style="width: auto;">
                    <option value="totalScore">总分排名</option>
                    ${State.dynamicSubjectList.map(s => `<option value="${s}">${s}排名</option>`).join('')}
                </select>
            </div>
            <div class="chart-container" id="dist-sankey-chart" style="height: 600px;"></div>
        </div>
        
        <div class="main-card-wrapper" id="dist-sankey-results-wrapper" style="display: none; margin-top: 20px;">
            <h4 id="dist-sankey-results-title">学生列表</h4>
            <div class="table-container" id="dist-sankey-results-table"></div>
        </div>
    `;

    // 3. 数据预处理
    const mergedData = activeData.map(student => {
        const oldStudent = compareData.find(s => String(s.id) === String(student.id));
        if (!oldStudent) return null;
        return {
            ...student,
            oldTotalScore: oldStudent.totalScore,
            oldRank: oldStudent.rank,
            oldGradeRank: oldStudent.gradeRank || 0,
            oldScores: oldStudent.scores || {},
            oldTScores: oldStudent.tScores || {},
            oldClassRanks: oldStudent.classRanks || {},
            oldGradeRanks: oldStudent.gradeRanks || {}
        };
    }).filter(s => s !== null);

    // 4. 逻辑 A: 直方图
    const subjectSelect = document.getElementById('dist-subject-select');
    const histModeSelect = document.getElementById('dist-hist-mode');
    const binInput = document.getElementById('dist-bin-size');
    const redrawBtn = document.getElementById('dist-redraw-btn');

    const drawHistogram = () => {
        const subject = subjectSelect.value;
        const mode = histModeSelect.value;
        const binSize = parseFloat(binInput.value);
        renderOverlappingHistogram('dist-overlap-histogram-chart', activeData, compareData, subject, binSize, mode);
    };

    subjectSelect.addEventListener('change', () => { binInput.value = ''; drawHistogram(); });
    histModeSelect.addEventListener('change', () => { binInput.value = ''; drawHistogram(); });
    redrawBtn.addEventListener('click', drawHistogram);

    // 5. 逻辑 B: 等级对比图
    const compModeSelect = document.getElementById('dist-comp-mode');
    const exportBtn = document.getElementById('dist-export-composition-btn');
    const descText = document.getElementById('dist-comp-desc');

    const drawComposition = () => {
        const mode = compModeSelect.value;
        if (mode === 'raw') descText.innerText = '* 原始分模式：基于"科目配置"中的 优秀线(A)、良好线(B)、及格线(C) 进行统计。';
        else descText.innerText = '* T分模式 (标准分)：A (T≥60, 前16%), B (T≥50, 前50%), C (T≥40, 前84%), D (T<40)。消除试卷难度差异。';
        renderTrendCompositionChart('dist-composition-compare-chart', activeData, compareData, mode);
    };

    compModeSelect.addEventListener('change', drawComposition);

    // 导出逻辑
    const exportCompositionDetails = (data, mode = 'raw') => {
        if (typeof XLSX === 'undefined') {
            alert('导出功能需要 XLSX 库支持');
            return;
        }

        const exportData = [];
        const subjects = State.dynamicSubjectList;
        const label = mode === 'tscore' ? 'T分' : '原始分';

        exportData.push(["科目", "本次等级", "班级", "姓名", `本次${label}`, "上次等级", `上次${label}`, "变动情况"]);

        subjects.forEach(subject => {
            const config = State.subjectConfigs[subject] || {};

            const getLevel = (val) => {
                if (val === undefined || val === null || isNaN(val)) return '无数据';
                if (mode === 'tscore') {
                    if (val >= 60) return 'A (优秀)';
                    if (val >= 50) return 'B (良好)';
                    if (val >= 40) return 'C (及格)';
                    return 'D (不及格)';
                } else {
                    if (val >= config.excel) return 'A (优秀)';
                    if (val >= config.good) return 'B (良好)';
                    if (val >= config.pass) return 'C (及格)';
                    return 'D (不及格)';
                }
            };

            const levelVal = (l) => {
                if (l.startsWith('A')) return 4; if (l.startsWith('B')) return 3;
                if (l.startsWith('C')) return 2; if (l.startsWith('D')) return 1;
                return 0;
            };

            data.forEach(s => {
                let currVal, oldVal;
                if (mode === 'tscore') {
                    currVal = (s.tScores && s.tScores[subject]);
                    oldVal = (s.oldTScores && s.oldTScores[subject]);
                } else {
                    currVal = s.scores[subject];
                    oldVal = s.oldScores[subject];
                }

                const currLevel = getLevel(currVal);
                const oldLevel = getLevel(oldVal);

                let changeText = '-';
                const v1 = levelVal(currLevel);
                const v2 = levelVal(oldLevel);
                if (v1 > 0 && v2 > 0) {
                    if (v1 > v2) changeText = '⬆️ 升级';
                    else if (v1 < v2) changeText = '⬇️ 降级';
                    else changeText = '➡️ 保持';
                }

                if (v1 > 0 || v2 > 0) {
                    exportData.push([
                        subject,
                        currLevel,
                        s.class,
                        s.name,
                        currVal !== undefined && currVal !== null ? currVal.toFixed(1) : '-',
                        oldLevel,
                        oldVal !== undefined && oldVal !== null ? oldVal.toFixed(1) : '-',
                        changeText
                    ]);
                }
            });
            exportData.push([]);
        });

        const ws = XLSX.utils.aoa_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `${label}等级分布`);
        XLSX.writeFile(wb, `${label}等级变动名单_${new Date().toLocaleDateString()}.xlsx`);
    };

    exportBtn.addEventListener('click', () => {
        const mode = compModeSelect.value;
        exportCompositionDetails(mergedData, mode);
    });

    // 6. 桑基图逻辑
    const sankeySubjectSelect = document.getElementById('dist-sankey-subject-select');
    const total = activeData.length;

    const rankTiers = [
        { name: 'Top 10%', min: 1, max: Math.ceil(total * 0.1) },
        { name: '10%-30%', min: Math.ceil(total * 0.1) + 1, max: Math.ceil(total * 0.3) },
        { name: '30%-60%', min: Math.ceil(total * 0.3) + 1, max: Math.ceil(total * 0.6) },
        { name: 'Bottom 40%', min: Math.ceil(total * 0.6) + 1, max: total }
    ];

    const getRankCategory = (rank) => {
        for (const tier of rankTiers) {
            if (rank >= tier.min && rank <= tier.max) return tier.name;
        }
        return 'N/A';
    };

    let sankeyInstance = null;
    const drawSankey = () => {
        const subject = sankeySubjectSelect.value;
        sankeyInstance = renderRankingSankey('dist-sankey-chart', mergedData, rankTiers, getRankCategory, currentFilter, subject);
        bindSankeyEvents();
    };

    sankeySubjectSelect.addEventListener('change', drawSankey);

    // 绑定桑基图点击事件
    function bindSankeyEvents() {
        const resultsWrapper = document.getElementById('dist-sankey-results-wrapper');
        const resultsTitle = document.getElementById('dist-sankey-results-title');
        const resultsTable = document.getElementById('dist-sankey-results-table');

        if (sankeyInstance) {
            sankeyInstance.off('click');
            sankeyInstance.on('click', (params) => {
                const subject = sankeySubjectSelect.value;
                const isTotal = (subject === 'totalScore');
                const useGradeRank = (currentFilter === 'ALL');
                const { dataType, data } = params;

                const getRanks = (s) => {
                    if (isTotal) {
                        return {
                            old: useGradeRank ? s.oldGradeRank : s.oldRank,
                            new: useGradeRank ? s.gradeRank : s.rank,
                            oldScore: s.oldTotalScore,
                            newScore: s.totalScore
                        };
                    } else {
                        const oldRanks = useGradeRank ? (s.oldGradeRanks || {}) : (s.oldClassRanks || {});
                        const newRanks = useGradeRank ? (s.gradeRanks || {}) : (s.classRanks || {});
                        return {
                            old: oldRanks[subject] || 0,
                            new: newRanks[subject] || 0,
                            oldScore: (s.oldScores && s.oldScores[subject] !== undefined) ? s.oldScores[subject] : '-',
                            newScore: (s.scores && s.scores[subject] !== undefined) ? s.scores[subject] : '-'
                        };
                    }
                };

                let students = [];
                let title = '';

                if (dataType === 'link') {
                    title = `${data.source} → ${data.target} (${data.value}人)`;
                    const sourceTierName = data.source.replace('上次: ', '');
                    const targetTierName = data.target.replace('本次: ', '');
                    students = mergedData.filter(s => {
                        const r = getRanks(s);
                        return r.old > 0 && r.new > 0 &&
                            getRankCategory(r.old) === sourceTierName &&
                            getRankCategory(r.new) === targetTierName;
                    });
                } else if (dataType === 'node') {
                    title = `${params.name} (${params.value}人)`;
                    const nodeName = data.name.replace(/^(上次|本次): /, '');
                    const isOld = data.name.startsWith('上次:');
                    students = mergedData.filter(s => {
                        const r = getRanks(s);
                        const rankToCheck = isOld ? r.old : r.new;
                        return rankToCheck > 0 && getRankCategory(rankToCheck) === nodeName;
                    });
                }

                if (students.length > 0) {
                    resultsWrapper.style.display = 'block';
                    resultsTitle.innerText = `${title} - ${isTotal ? '总分' : subject}`;

                    const scoreLabel = isTotal ? '总分' : subject;
                    const rankLabel = useGradeRank ? '年排' : '班排';

                    resultsTable.innerHTML = `
                        <div class="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>姓名</th><th>班级</th>
                                        <th>上次分层</th> <th>本次分层</th>
                                        <th>本次${scoreLabel}</th><th>本次${rankLabel}</th>
                                        <th>上次${scoreLabel}</th><th>上次${rankLabel}</th>
                                    </tr>
                                </thead>
                                <tbody>
                        ${students.map(s => {
                        const r = getRanks(s);
                        const oldTierName = getRankCategory(r.old);
                        const newTierName = getRankCategory(r.new);
                        const tierOld = rankTiers.findIndex(t => t.name === oldTierName);
                        const tierNew = rankTiers.findIndex(t => t.name === newTierName);
                        let rowClass = '';
                        if (tierOld > tierNew) rowClass = 'progress';
                        else if (tierOld < tierNew) rowClass = 'regress';

                        return `
                                        <tr class="${rowClass}">
                                            <td>${s.name}</td><td>${s.class}</td>
                                            <td style="color: #888; font-size: 0.9em;">${oldTierName}</td>
                                            <td style="font-weight: bold;">${newTierName}</td>
                                            <td><strong>${r.newScore}</strong></td>
                                            <td>${r.new}</td>
                                            <td>${r.oldScore}</td>
                                            <td>${r.old}</td>
                                        </tr>`;
                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    `;
                    resultsWrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            });
        }
    }

    // 7. 初始绘制
    drawHistogram();
    drawComposition();
    drawSankey();
}

