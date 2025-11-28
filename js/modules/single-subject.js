/* eslint-disable no-undef */
'use strict';

/**
 * 模块四：单科成绩分析
 */

import { State } from '../config/state.js';
import { renderHistogram } from '../charts/common.js';
import { calculateClassComparison } from '../charts/dashboard.js';
import { renderClassComparisonChart } from '../charts/dashboard.js';
import { renderSingleSubjectClassBoxplot, renderSingleSubjectQuadrant, renderSingleSubjectPie } from '../charts/single-subject.js';

/**
 * 渲染 Single-Subject 模块
 * @param {HTMLElement} container - 容器元素
 * @param {Object} data - 数据对象 { activeData, activeCompareData, stats, compareStats, currentFilter }
 */
export function renderSingleSubject(container, data) {
    const { activeData = [], stats = {}, currentFilter = 'ALL' } = data;

    // 渲染基础HTML
    container.innerHTML = `
        <h2>模块四：单科成绩分析 (当前筛选: ${currentFilter})</h2>

        <div class="main-card-wrapper" style="margin-bottom: 20px;">
            <div class="controls-bar chart-controls">
                <label for="ss-subject-select">选择科目:</label>
                <select id="ss-subject-select" class="sidebar-select">
                    ${State.dynamicSubjectList.map((s, i) => `<option value="${s}" ${i === 0 ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
            </div>
        </div>

        <div id="ss-kpi-grid" class="kpi-grid" style="margin-bottom: 20px;"></div>

        <div class="dashboard-chart-grid-2x2">
            <div class="main-card-wrapper">
                <h4 style="margin:0;">分数段直方图</h4>
                <div class="chart-container" id="ss-histogram-chart" style="height: 350px;"></div>
            </div>

            <div class="main-card-wrapper">
                <div class="controls-bar chart-controls">
                    <label for="ss-class-compare-metric">对比指标:</label>
                    <select id="ss-class-compare-metric" class="sidebar-select" style="min-width: 120px;">
                        <option value="average">平均分</option>
                        <option value="passRate">及格率 (%)</option>
                        <option value="excellentRate">优秀率 (%)</option>
                        <option value="stdDev">标准差</option>
                        <option value="max">最高分</option>
                    </select>
                </div>
                <div class="chart-container" id="ss-class-compare-chart" style="height: 350px;"></div>
            </div>
        </div>

        <div class="dashboard-chart-grid-2x2" style="margin-top: 20px;">
            <div class="main-card-wrapper">
                <h4 style="margin:0;">📦 各班分化程度对比 (箱形图)</h4>
                <p style="font-size:0.8em; color:#999; margin:5px 0;">* 箱体越长表示班级内部分化越严重；圆点为异常高/低分。</p>
                <div class="chart-container" id="ss-class-boxplot" style="height: 400px;"></div>
            </div>
            <div class="main-card-wrapper">
                <h4 style="margin:0;">🎯 班级教学质量诊断 (四象限)</h4>
                <p style="font-size:0.8em; color:#999; margin:5px 0;">* X轴:及格率, Y轴:平均分。十字线为年级平均水平。</p>
                <div class="chart-container" id="ss-class-quadrant" style="height: 400px;"></div>
            </div>
        </div>

        <div class="dashboard-chart-grid-2x2" style="margin-top: 20px;">
            <div class="main-card-wrapper">
                <h4 style="margin:0;">A/B/C/D 等级构成</h4>
                <div class="chart-container" id="ss-abcd-pie-chart" style="height: 400px;"></div>
            </div>
            <div class="main-card-wrapper" style="display:flex; flex-direction:column; gap:10px;">
                <div style="flex:1; display:flex; flex-direction:column;">
                    <h4 style="margin:0;">本科目 Top 10</h4>
                    <div class="table-container" id="ss-top10-table" style="flex:1; overflow-y:auto;"></div>
                </div>
                <div style="flex:1; display:flex; flex-direction:column; border-top:1px dashed #eee; padding-top:10px;">
                    <h4 style="margin:0;">本科目 Bottom 10</h4>
                    <div class="table-container" id="ss-bottom10-table" style="flex:1; overflow-y:auto;"></div>
                </div>
            </div>
        </div>
    `;

    // 内部辅助函数：用于渲染所有图表和表格
    const drawAnalysis = () => {
        const subjectName = document.getElementById('ss-subject-select').value;
        if (!subjectName) return;

        const subjectStats = stats[subjectName] || {};
        const config = State.subjectConfigs[subjectName] || {};
        const fullScore = config.full || 100;

        // 渲染KPIs
        const kpiContainer = document.getElementById('ss-kpi-grid');
        kpiContainer.innerHTML = `
            <div class="kpi-card"><h3>平均分</h3><div class="value">${subjectStats.average || 0}</div></div>
            <div class="kpi-card"><h3>最高分</h3><div class="value">${subjectStats.max || 0}</div></div>
            <div class="kpi-card"><h3>最低分</h3><div class="value">${subjectStats.min || 0}</div></div>
            <div class="kpi-card"><h3>优秀率 (%)</h3><div class="value">${subjectStats.excellentRate || 0}</div></div>
            <div class="kpi-card"><h3>良好率 (%)</h3><div class="value">${subjectStats.goodRate || 0}</div></div>
            <div class="kpi-card"><h3>及格率 (%)</h3><div class="value">${subjectStats.passRate || 0}</div></div>
            <div class="kpi-card"><h3>不及格率 (%)</h3><div class="value">${subjectStats.failRate || 0}</div></div>
            <div class="kpi-card"><h3>标准差</h3><div class="value">${subjectStats.stdDev || 0}</div></div>
        `;

        // 渲染直方图
        if (renderHistogram) {
            renderHistogram(
                'ss-histogram-chart',
                activeData,
                subjectName,
                fullScore,
                `${subjectName} 分数段直方图`,
                Math.round(fullScore / 15)
            );
        }

        // 渲染班级对比图
        const metricSelect = document.getElementById('ss-class-compare-metric');
        const drawClassCompareChart = () => {
            const metric = metricSelect.value;
            const chartEl = document.getElementById('ss-class-compare-chart');

            if (currentFilter !== 'ALL') {
                chartEl.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding-top: 50px;">请在侧边栏选择 "全体年段" 以查看班级对比。</p>`;
                return;
            }

            const classData = calculateClassComparison(metric, subjectName);
            let metricName = metricSelect.options[metricSelect.selectedIndex].text;
            if (renderClassComparisonChart) {
                renderClassComparisonChart('ss-class-compare-chart', classData, `各班级 - ${subjectName} ${metricName}`);
            }
        };

        if (metricSelect) {
            metricSelect.addEventListener('change', drawClassCompareChart);
            drawClassCompareChart();
        }

        // 渲染饼图
        if (renderSingleSubjectPie) {
            renderSingleSubjectPie('ss-abcd-pie-chart', subjectStats);
        }

        // 渲染 Top/Bottom 表格
        const sortedStudents = [...activeData]
            .filter(s => s.scores[subjectName] !== null && s.scores[subjectName] !== undefined)
            .sort((a, b) => (b.scores[subjectName]) - (a.scores[subjectName]));

        const top10 = sortedStudents.slice(0, 10);
        const bottom10 = sortedStudents.slice(-10).reverse();

        const createTable = (data, rankType) => {
            let rankHeader = rankType === 'top' ? '排名' : '倒数';
            if (data.length === 0) return '<p style="text-align: center; color: var(--text-muted); padding-top: 20px;">无数据</p>';

            return `
                <table>
                    <thead>
                        <tr>
                            <th>${rankHeader}</th>
                            <th>姓名</th>
                            <th>分数</th>
                            <th>班排(总分)</th>
                            <th>年排(单科)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map((s, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${s.name}</td>
                                <td><strong>${s.scores[subjectName]}</strong></td>
                                <td>${s.rank || '-'}</td>
                                <td>${(s.gradeRanks && s.gradeRanks[subjectName]) ? s.gradeRanks[subjectName] : '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        };

        const top10Table = document.getElementById('ss-top10-table');
        const bottom10Table = document.getElementById('ss-bottom10-table');
        if (top10Table) top10Table.innerHTML = createTable(top10, 'top');
        if (bottom10Table) bottom10Table.innerHTML = createTable(bottom10, 'bottom');

        // 只有在"全体"模式下才显示班级对比
        const boxplotDiv = document.getElementById('ss-class-boxplot');
        const quadrantDiv = document.getElementById('ss-class-quadrant');

        if (currentFilter === 'ALL') {
            if (renderSingleSubjectClassBoxplot) {
                renderSingleSubjectClassBoxplot('ss-class-boxplot', activeData, subjectName);
            }
            if (renderSingleSubjectQuadrant) {
                renderSingleSubjectQuadrant('ss-class-quadrant', activeData, subjectName, subjectStats);
            }
        } else {
            if (boxplotDiv) boxplotDiv.innerHTML = `<p style="text-align:center; color:#ccc; padding-top:100px;">请选择"全体年段"以查看班级对比分析</p>`;
            if (quadrantDiv) quadrantDiv.innerHTML = `<p style="text-align:center; color:#ccc; padding-top:100px;">请选择"全体年段"以查看班级对比分析</p>`;
        }
    };

    // 绑定主事件
    const subjectSelect = document.getElementById('ss-subject-select');
    if (subjectSelect) {
        subjectSelect.addEventListener('change', drawAnalysis);
    }

    // 初始绘制
    setTimeout(() => {
        drawAnalysis();
    }, 100);
}

