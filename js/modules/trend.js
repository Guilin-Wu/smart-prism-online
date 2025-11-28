/* eslint-disable no-undef */
'use strict';

/**
 * 模块十一：成绩趋势对比 (含班级增值评价)
 */

import { State } from '../config/state.js';

/**
 * 渲染班级增值评价散点图
 */
function renderClassValueAddedChart(elementId, data, subjectName, subTitle = "") {
    const chartDom = document.getElementById(elementId);
    if (!chartDom) return;

    if (State.echartsInstances[elementId]) State.echartsInstances[elementId].dispose();
    const myChart = echarts.init(chartDom);
    State.echartsInstances[elementId] = myChart;

    if (!data || data.length === 0) {
        chartDom.innerHTML = `<div style="display:flex;justify-content:center;align-items:center;height:100%;color:#999;">暂无有效增值数据</div>`;
        return;
    }

    const xValues = data.map(d => d.x);
    const minX = Math.floor(Math.min(...xValues) * 0.9);
    const maxX = Math.ceil(Math.max(...xValues) * 1.1);

    const seriesData = data.map(item => ({
        name: item.name,
        value: [item.x, item.y, item.count],
        itemStyle: { 
            shadowBlur: item.isHighlight ? 20 : 0, 
            shadowColor: 'rgba(0,0,0,0.5)',
            opacity: item.isHighlight ? 1 : 0.2, 
            borderColor: item.isHighlight ? '#000' : null,
            borderWidth: item.isHighlight ? 1 : 0
        },
        label: {
            show: true,
            formatter: '{b}',
            position: 'top',
            color: item.isHighlight ? '#333' : '#ccc',
            fontWeight: item.isHighlight ? 'bold' : 'normal'
        }
    }));

    const option = {
        title: {
            text: `${subjectName} - 班级增值四象限 (全校视角)`,
            subtext: subTitle,
            left: 'center',
            textStyle: { fontSize: 16, fontWeight: 'normal' },
            subtextStyle: { color: '#f56c6c' }
        },
        tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(255,255,255,0.95)',
            formatter: (params) => {
                if (params.componentType !== 'series') return;
                const d = params.data;
                const entryRank = parseFloat(d.value[0]).toFixed(1);
                const progress = parseFloat(d.value[1]).toFixed(1);
                return `<strong>${d.name}</strong><br/>` +
                       `上次平均年排: ${entryRank}<br/>` +
                       `平均进步名次: <strong style="color:${progress > 0 ? '#28a745' : '#dc3545'}">${progress > 0 ? '+' : ''}${progress}</strong><br/>` +
                       `有效人数: ${d.value[2]}`;
            }
        },
        grid: { left: '10%', right: '10%', bottom: '15%', top: '20%' },
        xAxis: {
            type: 'value',
            name: '上次平均年排 (越右生源越差)',
            nameLocation: 'middle',
            nameGap: 30,
            min: minX,
            max: maxX,
            splitLine: { show: false }
        },
        yAxis: {
            type: 'value',
            name: '平均进步名次 (越上进步越大)',
            nameLocation: 'middle',
            nameGap: 40,
            splitLine: { show: false }
        },
        series: [{
            type: 'scatter',
            data: seriesData,
            symbolSize: 20,
            markLine: {
                silent: true,
                symbol: 'none',
                lineStyle: { type: 'dashed', color: '#999' },
                data: [{ yAxis: 0 }]
            }
        }]
    };

    myChart.setOption(option);
}

/**
 * 渲染个体排名变化柱状图
 */
function renderRankChangeBarChart(elementId, students, sortType, subject) {
    const chartDom = document.getElementById(elementId);
    if (!chartDom) return;

    if (State.echartsInstances[elementId]) State.echartsInstances[elementId].dispose();
    const myChart = echarts.init(chartDom);
    State.echartsInstances[elementId] = myChart;

    const isTotal = subject === 'totalScore';
    
    let chartData = students.filter(s => s.oldFound).map(s => {
        let diff;
        if (isTotal) {
            diff = s.gradeRankDiff;
        } else {
            if (s.gradeRanks && s.gradeRanks[subject] && s.oldGradeRanks && s.oldGradeRanks[subject]) {
                diff = s.oldGradeRanks[subject] - s.gradeRanks[subject];
            } else {
                diff = null;
            }
        }
        return { name: s.name, value: diff };
    }).filter(d => d.value !== null);

    // 排序
    if (sortType === 'rankDiff_desc' || sortType === 'gradeRankDiff_desc') {
        chartData.sort((a, b) => b.value - a.value);
    } else {
        chartData.sort((a, b) => a.name.localeCompare(b.name));
    }

    chartData = chartData.slice(0, 50); // 限制显示数量

    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' }
        },
        grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
        xAxis: {
            type: 'category',
            data: chartData.map(d => d.name),
            axisLabel: { rotate: 45, interval: 0, fontSize: 10 }
        },
        yAxis: {
            type: 'value',
            name: '排名变化 (正=进步)'
        },
        series: [{
            type: 'bar',
            data: chartData.map(d => ({
                value: d.value,
                itemStyle: {
                    color: d.value > 0 ? '#28a745' : d.value < 0 ? '#dc3545' : '#6c757d'
                }
            })),
            label: {
                show: chartData.length <= 30,
                position: 'top',
                formatter: '{c}'
            }
        }]
    };

    myChart.setOption(option);
}

/**
 * 渲染 Trend 模块
 */
export function renderTrend(container, data) {
    const { activeData = [], activeCompareData = [], currentFilter = 'ALL' } = data;

    if (!activeCompareData || activeCompareData.length === 0) {
        container.innerHTML = `<h2>模块十一：成绩趋势对比 (当前筛选: ${currentFilter})</h2><p style="padding:20px; color:#999;">请先在侧边栏导入 "对比成绩" 数据。</p>`;
        return;
    }

    // 数据预处理：合并新旧数据
    const mergedData = activeData.map(student => {
        const oldStudent = activeCompareData.find(s => String(s.id) === String(student.id));
        
        let rankDiff = null, gradeRankDiff = null, scoreDiff = null;

        if (oldStudent) {
            if (student.totalScore !== null && oldStudent.totalScore !== null) {
                scoreDiff = parseFloat((student.totalScore - oldStudent.totalScore).toFixed(2));
            }
            if (student.rank !== null && oldStudent.rank !== null) {
                rankDiff = oldStudent.rank - student.rank;
            }
            if (student.gradeRank !== null && oldStudent.gradeRank !== null) {
                gradeRankDiff = oldStudent.gradeRank - student.gradeRank;
            }
        }

        return {
            ...student,
            oldFound: !!oldStudent,
            oldTotalScore: oldStudent ? oldStudent.totalScore : null,
            oldRank: oldStudent ? oldStudent.rank : null,
            oldGradeRank: oldStudent ? oldStudent.gradeRank : null,
            scoreDiff, rankDiff, gradeRankDiff,
            oldScores: oldStudent ? (oldStudent.scores || {}) : {},
            oldClassRanks: oldStudent ? (oldStudent.classRanks || {}) : {},
            oldGradeRanks: oldStudent ? (oldStudent.gradeRanks || {}) : {}
        };
    });

    // 渲染 HTML
    container.innerHTML = `
        <h2>模块十一：成绩趋势对比 (当前筛选: ${currentFilter})</h2>

        <div class="controls-bar chart-controls" style="flex-wrap: wrap; margin-bottom: 20px;">
            <label for="trend-subject-select" style="font-weight:bold;">分析对象:</label>
            <select id="trend-subject-select" class="sidebar-select" style="min-width: 120px; margin-right: 15px; color: #6f42c1; font-weight: bold;">
                <option value="totalScore">总分</option>
                ${State.dynamicSubjectList.map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>

            <label for="trend-class-filter">班级:</label>
            <select id="trend-class-filter" class="sidebar-select" style="min-width: 120px;">
                <option value="ALL">-- 全体年段 --</option>
                ${[...new Set(activeData.map(s => s.class))].sort().map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
        </div>

        <div class="main-card-wrapper" style="margin-bottom: 20px; border-left: 5px solid #fd7e14;">
            <h4 style="margin: 0 0 10px 0; color: #fd7e14;">📊 班级增值评价 (Value-Added)</h4>
            <p style="font-size: 0.9em; color: #666; margin-bottom: 10px;">
                <strong>"低进高出"即为增值。</strong><br>
                X轴：上次排名；Y轴：增值幅度。
            </p>
            <div class="chart-container" id="trend-class-value-added-chart" style="height: 450px;"></div>
        </div>

        <div class="main-card-wrapper" style="margin-bottom: 20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <h4 style="margin:0;">学生个体进退步详情</h4>
                <div style="display:flex; align-items:center;">
                    <label for="trend-sort-filter" style="margin-right:5px; font-size:0.9em;">排序:</label>
                    <select id="trend-sort-filter" class="sidebar-select" style="width: 160px;">
                        <option value="name">按姓名</option>
                        <option value="rankDiff_desc">按 班排进步 (大到小)</option>
                        <option value="gradeRankDiff_desc" selected>按 年排进步 (大到小)</option>
                    </select>
                </div>
            </div>
            <div class="chart-container" id="trend-rank-change-bar-chart" style="height: 350px;"></div>
        </div>

        <div class="main-card-wrapper">
            <div class="controls-bar" style="background: transparent; box-shadow: none; padding: 0 0 15px 0;">
                <label for="trend-search">搜索:</label>
                <input type="text" id="trend-search" placeholder="姓名/考号..." class="sidebar-select" style="width:150px;">
                <span id="trend-table-status" style="font-size:0.85em; color:#20c997; font-weight:bold; margin-left:auto;">* 联动显示总分</span>
            </div>

            <div class="table-container" style="max-height: 600px; overflow-y: auto;">
                <table>
                    <thead id="trend-table-header">
                        <tr>
                            <th data-sort-key="id" style="cursor:pointer;">考号 ⇅</th>
                            <th data-sort-key="name" style="cursor:pointer;">姓名 ⇅</th>
                            <th data-sort-key="currentVal" style="cursor:pointer;" id="th-trend-score">总分 ⇅</th>
                            <th data-sort-key="diffVal" style="cursor:pointer;">分差 ⇅</th>
                            <th data-sort-key="currentCR" style="cursor:pointer;" id="th-trend-cr">班排 ⇅</th>
                            <th data-sort-key="diffCR" style="cursor:pointer;">班排变 ⇅</th>
                            <th data-sort-key="currentGR" style="cursor:pointer;" id="th-trend-gr">年排 ⇅</th>
                            <th data-sort-key="diffGR" style="cursor:pointer;">年排变 ⇅</th>
                        </tr>
                    </thead>
                    <tbody id="trend-table-body"></tbody>
                </table>
            </div>
        </div>
    `;

    // 获取显示数据
    const getDisplayData = () => {
        const subject = document.getElementById('trend-subject-select').value;
        const isTotal = subject === 'totalScore';

        return mergedData.map(s => {
            let currentVal, oldVal, currentCR, oldCR, currentGR, oldGR;
            
            if (isTotal) {
                currentVal = s.totalScore; oldVal = s.oldTotalScore;
                currentCR = s.rank; oldCR = s.oldRank;
                currentGR = s.gradeRank; oldGR = s.oldGradeRank;
            } else {
                currentVal = s.scores[subject]; oldVal = s.oldScores[subject];
                currentCR = s.classRanks ? s.classRanks[subject] : null;
                oldCR = s.oldClassRanks ? s.oldClassRanks[subject] : null;
                currentGR = s.gradeRanks ? s.gradeRanks[subject] : null;
                oldGR = s.oldGradeRanks ? s.oldGradeRanks[subject] : null;
            }

            let diffVal = (currentVal !== null && oldVal !== null) ? (currentVal - oldVal) : null;
            let diffCR = (currentCR !== null && oldCR !== null) ? (oldCR - currentCR) : null; 
            let diffGR = (currentGR !== null && oldGR !== null) ? (oldGR - currentGR) : null;

            return {
                raw: s, id: s.id, name: s.name, class: s.class,
                currentVal, oldVal, diffVal,
                currentCR, oldCR, diffCR,
                currentGR, oldGR, diffGR,
                validGradeChange: (currentGR !== null && oldGR !== null)
            };
        });
    };

    // 绘制增值评价图
    const drawValueAddedChart = () => {
        const subject = document.getElementById('trend-subject-select').value;
        const subjectLabel = (subject === 'totalScore') ? '总分' : subject;
        const currentFilterClass = document.getElementById('trend-class-filter').value;

        const globalClassMap = {};
        
        State.studentsData.forEach(s => {
            const oldS = State.compareData.find(o => String(o.id) === String(s.id));
            if (!globalClassMap[s.class]) globalClassMap[s.class] = { name: s.class, sumOldRank: 0, sumChange: 0, count: 0 };
            
            let oldR = null, newR = null;
            if (subject === 'totalScore') {
                if (s.gradeRank && oldS && oldS.gradeRank) { oldR = oldS.gradeRank; newR = s.gradeRank; }
            } else {
                if (s.gradeRanks && s.gradeRanks[subject] && oldS && oldS.gradeRanks && oldS.gradeRanks[subject]) {
                    oldR = oldS.gradeRanks[subject];
                    newR = s.gradeRanks[subject];
                }
            }

            if (oldR !== null && newR !== null) {
                globalClassMap[s.class].sumOldRank += oldR;
                globalClassMap[s.class].sumChange += (oldR - newR);
                globalClassMap[s.class].count++;
            }
        });

        const chartData = [];
        const allClasses = [...new Set(State.studentsData.map(s => s.class))].sort();
        
        allClasses.forEach(cls => {
            const c = globalClassMap[cls];
            if (c && c.count > 0) {
                const jitterX = (Math.random() - 0.5) * 0.1;
                const jitterY = (Math.random() - 0.5) * 0.1;

                chartData.push({
                    name: cls,
                    x: parseFloat((c.sumOldRank / c.count).toFixed(1)) + jitterX,
                    y: parseFloat((c.sumChange / c.count).toFixed(1)) + jitterY,
                    count: c.count,
                    isHighlight: (currentFilterClass === 'ALL' || currentFilterClass === cls)
                });
            }
        });

        renderClassValueAddedChart('trend-class-value-added-chart', chartData, subjectLabel, "");
    };

    // 渲染表格
    const drawTable = () => {
        const subject = document.getElementById('trend-subject-select').value;
        const subjectLabel = (subject === 'totalScore') ? '总分' : subject;
        const searchTerm = document.getElementById('trend-search').value.toLowerCase();
        const selectedClass = document.getElementById('trend-class-filter').value;

        document.getElementById('th-trend-score').innerText = `${subjectLabel} ⇅`;
        document.getElementById('th-trend-cr').innerText = `${subjectLabel}班排 ⇅`;
        document.getElementById('th-trend-gr').innerText = `${subjectLabel}年排 ⇅`;
        document.getElementById('trend-table-status').innerText = `* 已联动显示"${subjectLabel}"数据`;

        let tableData = getDisplayData();

        tableData = tableData.filter(item => {
            if (selectedClass !== 'ALL' && item.class !== selectedClass) return false;
            if (searchTerm && !item.name.toLowerCase().includes(searchTerm) && !String(item.id).includes(searchTerm)) return false;
            return true;
        });

        const { key, direction } = State.trendSort; 
        tableData.sort((a, b) => {
            let valA = a[key], valB = b[key];
            if (valA == null) valA = direction === 'asc' ? 99999 : -99999;
            if (valB == null) valB = direction === 'asc' ? 99999 : -99999;
            if (typeof valA === 'string') return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            return direction === 'asc' ? valA - valB : valB - valA;
        });

        const tbody = document.getElementById('trend-table-body');
        if (tableData.length === 0) { 
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:#999;">无数据</td></tr>`; 
            return; 
        }

        tbody.innerHTML = tableData.map(row => {
            const formatDiff = (val) => {
                if (val == null) return '<span style="color:#ccc">-</span>';
                if (val === 0) return `<span style="color:#999;">0</span>`;
                if (val > 0) return `<span class="progress">▲ ${val}</span>`;
                return `<span class="regress">▼ ${Math.abs(val)}</span>`;
            };
            const formatScoreDiff = (val) => {
                if (val == null) return '<span style="color:#ccc">-</span>';
                if (val === 0) return `<span style="color:#999;">0</span>`;
                if (val > 0) return `<span class="progress">▲ +${val.toFixed(1)}</span>`;
                return `<span class="regress">▼ ${val.toFixed(1)}</span>`;
            };

            return `
                <tr>
                    <td>${row.id}</td><td><strong>${row.name}</strong></td>
                    <td><strong>${row.currentVal ?? '-'}</strong> <span style="font-size:0.8em; color:#999;">(前:${row.oldVal ?? '-'})</span></td>
                    <td>${formatScoreDiff(row.diffVal)}</td>
                    <td><strong>${row.currentCR ?? '-'}</strong></td><td>${formatDiff(row.diffCR)}</td>
                    <td>${row.currentGR ?? '-'}</td><td>${formatDiff(row.diffGR)}</td>
                </tr>
            `;
        }).join('');
    };

    // 绘制图表
    const drawCharts = () => {
        const classFilter = document.getElementById('trend-class-filter').value;
        const sortFilter = document.getElementById('trend-sort-filter').value;
        const subject = document.getElementById('trend-subject-select').value;
        
        let chartSource = mergedData;
        if (classFilter !== 'ALL') chartSource = mergedData.filter(s => s.class === classFilter);
        
        renderRankChangeBarChart('trend-rank-change-bar-chart', chartSource, sortFilter, subject);
    };

    // 绑定事件
    const refreshAll = () => { drawValueAddedChart(); drawCharts(); drawTable(); };

    document.getElementById('trend-subject-select').addEventListener('change', refreshAll);
    document.getElementById('trend-class-filter').addEventListener('change', refreshAll);
    document.getElementById('trend-sort-filter').addEventListener('change', drawCharts);
    document.getElementById('trend-search').addEventListener('input', drawTable);

    document.getElementById('trend-table-header').addEventListener('click', (e) => {
        const th = e.target.closest('th[data-sort-key]');
        if (!th) return;
        const newKey = th.dataset.sortKey;
        if (newKey === State.trendSort.key) State.trendSort.direction = (State.trendSort.direction === 'asc') ? 'desc' : 'asc';
        else { State.trendSort.key = newKey; State.trendSort.direction = ['diffVal','diffCR','diffGR'].includes(newKey) ? 'desc' : 'asc'; }
        
        document.getElementById('trend-table-header').querySelectorAll('th').forEach(h => h.style.color = '');
        th.style.color = '#007bff';
        drawTable();
    });

    // 初始化
    State.trendSort = { key: 'diffGR', direction: 'desc' };
    setTimeout(refreshAll, 100);
}

