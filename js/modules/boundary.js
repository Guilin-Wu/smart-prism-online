/* eslint-disable no-undef */
'use strict';

/**
 * 模块五：临界生分析
 */

import { State } from '../config/state.js';

/**
 * 渲染临界生短板科目频次图
 */
function renderBoundaryBottleneckChart(elementId, students) {
    const chartDom = document.getElementById(elementId);
    if (!chartDom) return;
    if (State.echartsInstances[elementId]) State.echartsInstances[elementId].dispose();
    const myChart = echarts.init(chartDom);
    State.echartsInstances[elementId] = myChart;

    // 统计各科不及格人次
    const subjectFailCount = {};
    State.dynamicSubjectList.forEach(sub => subjectFailCount[sub] = 0);

    students.forEach(s => {
        State.dynamicSubjectList.forEach(sub => {
            const passLine = State.subjectConfigs[sub]?.pass || 60;
            if ((s.scores[sub] || 0) < passLine) {
                subjectFailCount[sub]++;
            }
        });
    });

    const data = Object.entries(subjectFailCount)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    const option = {
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
        xAxis: {
            type: 'category',
            data: data.map(d => d.name),
            axisLabel: { rotate: 30, interval: 0 }
        },
        yAxis: { type: 'value', name: '不及格人次' },
        series: [{
            type: 'bar',
            data: data.map(d => d.value),
            itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: '#ff6b6b' },
                    { offset: 1, color: '#ee5a24' }
                ])
            },
            label: { show: true, position: 'top' }
        }]
    };

    myChart.setOption(option);
}

/**
 * 渲染临界分差散点图
 */
function renderBoundaryGapChart(elementId, students, lineTypeLabel) {
    const chartDom = document.getElementById(elementId);
    if (!chartDom) return;
    if (State.echartsInstances[elementId]) State.echartsInstances[elementId].dispose();
    const myChart = echarts.init(chartDom);
    State.echartsInstances[elementId] = myChart;

    // 计算每个学生距离目标线的差距
    const scatterData = students.map((s, idx) => {
        // 简化：使用总分及格线作为目标
        const targetLine = State.dynamicSubjectList.reduce((sum, sub) => {
            return sum + (State.subjectConfigs[sub]?.pass || 60);
        }, 0);
        const gap = s.totalScore - targetLine;
        return {
            name: s.name,
            value: [idx, gap],
            itemStyle: { color: gap >= 0 ? '#28a745' : '#dc3545' }
        };
    });

    const option = {
        tooltip: {
            trigger: 'item',
            formatter: (params) => `${params.data.name}<br/>距${lineTypeLabel}: ${params.data.value[1].toFixed(1)}分`
        },
        grid: { left: '10%', right: '10%', bottom: '15%', top: '15%' },
        xAxis: {
            type: 'value',
            name: '学生序号',
            splitLine: { show: false }
        },
        yAxis: {
            type: 'value',
            name: `距${lineTypeLabel}差距`,
            splitLine: { show: true }
        },
        series: [{
            type: 'scatter',
            data: scatterData,
            symbolSize: 8,
            markLine: {
                silent: true,
                symbol: 'none',
                lineStyle: { type: 'solid', color: '#ff0000', width: 2 },
                data: [{ yAxis: 0 }],
                label: { formatter: lineTypeLabel }
            }
        }]
    };

    myChart.setOption(option);
}

/**
 * 渲染学生详情
 */
function renderBoundaryStudentDetail(containerElement, student) {
    const subjectData = State.dynamicSubjectList.map(subject => {
        const score = student.scores[subject] || 0;
        const config = State.subjectConfigs[subject] || {};
        const full = config.full || 100;
        const pass = config.pass || 60;
        
        return {
            subject,
            score,
            full,
            pass,
            rate: ((score / full) * 100).toFixed(1),
            isPassed: score >= pass
        };
    });

    containerElement.innerHTML = `
        <h4 style="margin:0 0 15px 0; color:#6f42c1;">📋 ${student.name} 各科成绩详情</h4>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>科目</th>
                        <th>得分</th>
                        <th>满分</th>
                        <th>得分率</th>
                        <th>状态</th>
                    </tr>
                </thead>
                <tbody>
                    ${subjectData.map(d => `
                        <tr>
                            <td>${d.subject}</td>
                            <td><strong>${d.score}</strong></td>
                            <td>${d.full}</td>
                            <td>${d.rate}%</td>
                            <td style="color: ${d.isPassed ? '#28a745' : '#dc3545'};">
                                ${d.isPassed ? '✓ 及格' : '✗ 不及格'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * 渲染 Boundary 模块
 */
export function renderBoundary(container, data) {
    const { activeData = [], stats = {}, currentFilter = 'ALL' } = data;

    container.innerHTML = `
        <h2>模块五：临界生分析 (当前筛选: ${currentFilter})</h2>
        <p style="margin-top: -20px; margin-bottom: 20px; color: var(--text-muted);">
            快速定位"差一点"就能上一个台阶的学生。
        </p>

        <div class="main-card-wrapper" style="margin-bottom: 20px;">
            <h4>自定义临界线筛选</h4>
            <div class="controls-bar" style="background: transparent; box-shadow: none; padding: 0; flex-wrap: wrap;">
                <label>科目:</label>
                <select id="boundary-subject" class="sidebar-select">
                    <option value="totalScore">总分</option>
                    ${State.dynamicSubjectList.map(s => `<option value="${s}">${s}</option>`).join('')}
                </select>
                <label>分数线:</label>
                <select id="boundary-line-type" class="sidebar-select">
                    <option value="excel">优秀线</option>
                    <option value="good">良好线</option>
                    <option value="pass">及格线</option>
                    <option value="average">平均分</option>
                </select>
                <label>范围 (±):</label>
                <input type="number" id="boundary-range" value="5" style="width: 60px;">
                <button id="boundary-filter-btn" class="sidebar-button">筛选</button>
            </div>
        </div>

        <div class="main-card-wrapper" style="margin-bottom: 20px;">
            <h4>快捷预设筛选</h4>
            <div class="shortcut-btn-group" style="border-top: none; padding-top: 0;">
                <button class="shortcut-btn" data-preset="high_potential">高分短板生</button>
                <button class="shortcut-btn" data-preset="pass_potential">及格短板生</button>
                <button class="shortcut-btn" data-preset="holistic_pass">全科及格生</button>
                <button class="shortcut-btn" data-preset="holistic_excel">全科优秀生</button>
                <button class="shortcut-btn" data-preset="multi_fail">多科不及格生 (>=3科)</button>
            </div>
        </div>

        <div id="boundary-charts-area" style="display: none;">
            <div class="dashboard-chart-grid-2x2" style="margin-bottom: 20px;">
                <div class="main-card-wrapper">
                    <h4 style="margin:0;">📉 临界生"短板科目"频次统计</h4>
                    <div class="chart-container" id="boundary-bottleneck-chart" style="height: 350px;"></div>
                </div>
                <div class="main-card-wrapper">
                    <h4 style="margin:0;">🎯 临界分差散点图</h4>
                    <div class="chart-container" id="boundary-gap-chart" style="height: 350px;"></div>
                </div>
            </div>
        </div>

        <div class="main-card-wrapper" id="boundary-results-wrapper" style="display: none;">
            <h4 id="boundary-results-title">筛选结果</h4>
            <div class="table-container" id="boundary-results-table"></div>
            <div id="boundary-detail-container" style="margin-top: 20px; display: none; border-top: 1px solid var(--border-color); padding-top: 20px;"></div>
        </div>
    `;

    const resultsWrapper = document.getElementById('boundary-results-wrapper');
    const resultsTitle = document.getElementById('boundary-results-title');
    const resultsTable = document.getElementById('boundary-results-table');
    const detailContainer = document.getElementById('boundary-detail-container');

    // 渲染结果表格
    const renderResultTable = (title, students, targetSubject, lineTypeLabel) => {
        resultsTitle.innerText = title;
        resultsWrapper.style.display = 'block';
        
        document.getElementById('boundary-charts-area').style.display = 'block';
        
        setTimeout(() => {
            renderBoundaryBottleneckChart('boundary-bottleneck-chart', students);
            renderBoundaryGapChart('boundary-gap-chart', students, lineTypeLabel || '及格线');
        }, 100);

        if (!students || students.length === 0) {
            resultsTable.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 20px;">未找到符合条件的学生。</p>`;
            return;
        }

        const isSubject = targetSubject && targetSubject !== 'totalScore';
        let targetHeaderTitle = isSubject ? `<th>${targetSubject} 分数</th>` : '';

        resultsTable.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>姓名</th>
                        <th>班级</th>
                        <th>总分</th>
                        <th>班排</th>
                        ${targetHeaderTitle}
                    </tr>
                </thead>
                <tbody>
                    ${students.map(s => `
                    <tr data-id="${s.id}">
                        <td data-action="show-detail" style="cursor: pointer; color: var(--primary-color); font-weight: 600;">${s.name}</td>
                        <td>${s.class}</td>
                        <td>${s.totalScore}</td>
                        <td>${s.rank}</td>
                        ${isSubject ? `<td><strong>${s.scores[targetSubject] || 'N/A'}</strong></td>` : ''}
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    };

    // 获取总分线
    const getTotalLine = (lineType) => {
        return State.dynamicSubjectList.reduce((sum, key) => sum + (State.subjectConfigs[key]?.[lineType] || 0), 0);
    };

    // 自定义筛选
    document.getElementById('boundary-filter-btn').addEventListener('click', () => {
        const subject = document.getElementById('boundary-subject').value;
        const lineType = document.getElementById('boundary-line-type').value;
        const range = parseFloat(document.getElementById('boundary-range').value) || 0;

        let threshold = 0;
        if (lineType === 'average') {
            threshold = subject === 'totalScore' ? (stats.totalScore?.average || 0) : (stats[subject]?.average || 0);
        } else {
            threshold = subject === 'totalScore' ? getTotalLine(lineType) : (State.subjectConfigs[subject]?.[lineType] || 0);
        }

        const min = threshold - range;
        const max = threshold + range;

        const filteredStudents = activeData.filter(s => {
            const score = (subject === 'totalScore') ? s.totalScore : s.scores[subject];
            return score >= min && score <= max;
        });

        const lineLabel = document.getElementById('boundary-line-type').options[document.getElementById('boundary-line-type').selectedIndex].text;
        renderResultTable(`"${subject}" 在 "${lineLabel}" (${threshold.toFixed(0)}分) ± ${range}分 的学生 (${filteredStudents.length}人)`, filteredStudents, subject, lineLabel);
    });

    // 预设筛选
    document.querySelectorAll('.shortcut-btn[data-preset]').forEach(btn => {
        btn.addEventListener('click', () => {
            const preset = btn.dataset.preset;
            let title = '';
            let filteredStudents = [];

            const totalPassLine = getTotalLine('pass');
            const totalExcelLine = getTotalLine('excel');

            if (preset === 'holistic_pass') {
                title = '全科及格生';
                filteredStudents = activeData.filter(s => {
                    return State.dynamicSubjectList.every(subject => {
                        const passLine = State.subjectConfigs[subject]?.pass || 0;
                        return (s.scores[subject] || 0) >= passLine;
                    });
                });
            } else if (preset === 'pass_potential' || preset === 'high_potential') {
                const minTotal = (preset === 'pass_potential') ? totalPassLine : totalExcelLine;
                title = (preset === 'pass_potential') ? '及格短板生' : '高分短板生';

                filteredStudents = activeData.filter(s => {
                    if (s.totalScore < minTotal) return false;
                    let failCount = 0;
                    State.dynamicSubjectList.forEach(subject => {
                        const passLine = State.subjectConfigs[subject]?.pass || 0;
                        if ((s.scores[subject] || 0) < passLine) failCount++;
                    });
                    return failCount === 1;
                });
            } else if (preset === 'holistic_excel') {
                title = '全科优秀生';
                filteredStudents = activeData.filter(s => {
                    return State.dynamicSubjectList.every(subject => {
                        const excelLine = State.subjectConfigs[subject]?.excel || 0;
                        return (s.scores[subject] || 0) >= excelLine;
                    });
                });
            } else if (preset === 'multi_fail') {
                title = '多科不及格生 (>=3科)';
                filteredStudents = activeData.filter(s => {
                    let failCount = 0;
                    State.dynamicSubjectList.forEach(subject => {
                        const passLine = State.subjectConfigs[subject]?.pass || 0;
                        if ((s.scores[subject] ?? 0) < passLine) failCount++;
                    });
                    return failCount >= 3;
                });
            }

            let lineLabel = preset.includes('high') || preset.includes('excel') ? '优秀线' : '及格线';
            renderResultTable(`${title} (${filteredStudents.length}人)`, filteredStudents, null, lineLabel);
        });
    });

    // 点击学生查看详情
    resultsTable.addEventListener('click', (e) => {
        const cell = e.target.closest('td[data-action="show-detail"]');
        const row = e.target.closest('tr[data-id]');
        if (!cell || !row) return;

        const studentId = row.dataset.id;
        const student = activeData.find(s => String(s.id) === String(studentId));

        if (student) {
            renderBoundaryStudentDetail(detailContainer, student);
            detailContainer.style.display = 'block';
        }
    });
}

