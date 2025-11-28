/* eslint-disable no-undef */
'use strict';

/**
 * 模块六：全科均衡分析
 */

import { State } from '../config/state.js';

/**
 * 渲染不及格科目数量分布图
 */
function renderFailureCountChart(elementId, failureData) {
    const chartDom = document.getElementById(elementId);
    if (!chartDom) return null;
    if (State.echartsInstances[elementId]) State.echartsInstances[elementId].dispose();
    const myChart = echarts.init(chartDom);
    State.echartsInstances[elementId] = myChart;

    const maxCount = Math.max(...Object.keys(failureData).map(k => parseInt(k)));
    const categories = [];
    const values = [];
    
    for (let i = 0; i <= maxCount; i++) {
        categories.push(`${i} 科`);
        values.push(failureData[i] ? failureData[i].length : 0);
    }

    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: (params) => {
                const p = params[0];
                return `${p.name}<br/>人数: <strong>${p.value}</strong> 人<br/><span style="font-size:0.8em;color:#aaa;">(点击查看名单)</span>`;
            }
        },
        grid: { left: '3%', right: '4%', bottom: '10%', top: '10%', containLabel: true },
        xAxis: { type: 'category', data: categories },
        yAxis: { type: 'value', name: '人数' },
        series: [{
            type: 'bar',
            data: values,
            itemStyle: {
                color: (params) => {
                    const colors = ['#28a745', '#ffc107', '#fd7e14', '#dc3545', '#6f42c1', '#343a40'];
                    return colors[Math.min(params.dataIndex, colors.length - 1)];
                },
                borderRadius: [4, 4, 0, 0]
            },
            label: { show: true, position: 'top' },
            cursor: 'pointer'
        }]
    };

    myChart.setOption(option);
    return myChart;
}

/**
 * 渲染最短板科目归因图
 */
function renderHolisticShortestPlankChart(elementId, students) {
    const chartDom = document.getElementById(elementId);
    if (!chartDom) return;
    if (State.echartsInstances[elementId]) State.echartsInstances[elementId].dispose();
    const myChart = echarts.init(chartDom);
    State.echartsInstances[elementId] = myChart;

    // 准备数据
    const plankMap = {};
    State.dynamicSubjectList.forEach(sub => plankMap[sub] = { count: 0, students: [] });

    // 遍历学生，找出每个人的"最短板"
    students.forEach(s => {
        let minRate = 2.0;
        let worstSub = null;

        State.dynamicSubjectList.forEach(sub => {
            const score = s.scores[sub];
            const config = State.subjectConfigs[sub];
            const full = config ? config.full : 100;
            
            if (typeof score === 'number' && full > 0) {
                const rate = score / full;
                if (rate < minRate) {
                    minRate = rate;
                    worstSub = sub;
                }
            }
        });

        if (worstSub && plankMap[worstSub]) {
            plankMap[worstSub].count++;
            plankMap[worstSub].students.push(s);
        }
    });

    const data = Object.keys(plankMap)
        .map(sub => ({ name: sub, value: plankMap[sub].count, studentList: plankMap[sub].students }))
        .sort((a, b) => b.value - a.value);

    const option = {
        tooltip: { 
            trigger: 'item', 
            formatter: (params) => `${params.marker} <strong>${params.name}</strong><br/>人数：${params.value} 人`
        },
        grid: { left: '3%', right: '4%', bottom: '10%', top: '10%', containLabel: true },
        xAxis: { 
            type: 'category', 
            data: data.map(d => d.name),
            axisLabel: { rotate: 30, interval: 0 }
        },
        yAxis: { type: 'value', name: '人数' },
        series: [{
            name: '短板人数',
            type: 'bar',
            data: data,
            itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: '#ff9f43' },
                    { offset: 1, color: '#ee5253' }
                ]),
                borderRadius: [4, 4, 0, 0]
            },
            label: { show: true, position: 'top' }
        }]
    };

    myChart.setOption(option);
}

/**
 * 渲染综合实力 vs 均衡度散点图
 */
function renderHolisticScatterChart(elementId, students, totalStats) {
    const chartDom = document.getElementById(elementId);
    if (!chartDom) return;
    if (State.echartsInstances[elementId]) State.echartsInstances[elementId].dispose();
    const myChart = echarts.init(chartDom);
    State.echartsInstances[elementId] = myChart;

    // 计算标准差
    const calcStdDev = (arr) => {
        if (arr.length === 0) return 0;
        const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
        const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
        return Math.sqrt(variance);
    };

    // 准备散点数据
    const scatterData = [];
    let maxStdDev = 0;

    students.forEach(s => {
        if (typeof s.totalScore !== 'number') return;

        const rates = [];
        State.dynamicSubjectList.forEach(sub => {
            const score = s.scores[sub];
            const config = State.subjectConfigs[sub];
            const full = config ? config.full : 100;
            if (typeof score === 'number' && full > 0) {
                rates.push(score / full);
            }
        });

        if (rates.length === 0) return;

        const stdDev = calcStdDev(rates);
        maxStdDev = Math.max(maxStdDev, stdDev);

        scatterData.push({
            name: s.name,
            value: [s.totalScore, stdDev * 100],
            studentData: s
        });
    });

    const avgTotal = totalStats?.totalScore?.average || 0;
    const avgStdDev = scatterData.reduce((sum, d) => sum + d.value[1], 0) / scatterData.length || 0;

    const option = {
        tooltip: {
            trigger: 'item',
            formatter: (params) => {
                return `<strong>${params.data.name}</strong><br/>` +
                       `总分: ${params.value[0]}<br/>` +
                       `偏科系数: ${params.value[1].toFixed(1)}%`;
            }
        },
        grid: { left: '10%', right: '10%', bottom: '15%', top: '10%' },
        xAxis: {
            type: 'value',
            name: '总分 (综合实力)',
            nameLocation: 'middle',
            nameGap: 30
        },
        yAxis: {
            type: 'value',
            name: '偏科系数 (越低越均衡)',
            nameLocation: 'middle',
            nameGap: 40
        },
        series: [{
            type: 'scatter',
            data: scatterData,
            symbolSize: 8,
            itemStyle: {
                color: (params) => {
                    const x = params.value[0];
                    const y = params.value[1];
                    if (x >= avgTotal && y <= avgStdDev) return '#28a745'; // 六边形战士
                    if (x >= avgTotal && y > avgStdDev) return '#fd7e14'; // 跛脚学霸
                    if (x < avgTotal && y <= avgStdDev) return '#17a2b8'; // 均衡但弱
                    return '#dc3545'; // 弱且偏科
                }
            },
            markLine: {
                silent: true,
                symbol: 'none',
                lineStyle: { type: 'dashed', color: '#999' },
                data: [
                    { xAxis: avgTotal, name: '平均总分' },
                    { yAxis: avgStdDev, name: '平均偏科系数' }
                ]
            }
        }]
    };

    myChart.setOption(option);
}

/**
 * 渲染 Holistic 模块
 */
export function renderHolisticBalance(container, data) {
    const { activeData = [], stats = {}, currentFilter = 'ALL' } = data;

    container.innerHTML = `
        <h2>模块六：全科均衡分析 (当前筛选: ${currentFilter})</h2>
        <p style="margin-top: -20px; margin-bottom: 20px; color: var(--text-muted);">
            分析学生群体的"短板"数量及学科均衡度。
        </p>

        <div class="main-card-wrapper" style="margin-bottom: 20px;">
            <h4 style="margin:0;">📉 不及格科目数量分布</h4>
            <p style="font-size:0.8em; color:#999; margin:5px 0;">* 点击柱子可查看具体学生名单。</p>
            <div class="chart-container" id="holistic-failure-count-chart" style="height: 400px;"></div>
        </div>

        <div class="dashboard-chart-grid-2x2" style="margin-bottom: 20px;">
            <div class="main-card-wrapper">
                <h4 style="margin:0;">🪵 "最短板"科目归因分布</h4>
                <p style="font-size:0.8em; color:#999; margin:5px 0;">* 统计有多少学生的"全科最差一门"是该科目。</p>
                <div class="chart-container" id="holistic-shortest-plank-chart" style="height: 350px;"></div>
            </div>
            <div class="main-card-wrapper">
                <h4 style="margin:0;">⚖️ 综合实力 vs 均衡度 矩阵</h4>
                <p style="font-size:0.8em; color:#999; margin:5px 0;">* Y轴越低越均衡。右下角为"六边形战士"。</p>
                <div class="chart-container" id="holistic-scatter-chart" style="height: 350px;"></div>
            </div>
        </div>

        <div class="main-card-wrapper" id="holistic-results-wrapper" style="display: none;">
            <h4 id="holistic-results-title">学生列表</h4>
            <div class="table-container" id="holistic-results-table"></div>
        </div>
    `;

    // 计算不及格科目数
    const failureData = {};
    activeData.forEach(student => {
        let count = 0;
        State.dynamicSubjectList.forEach(subject => {
            const passLine = State.subjectConfigs[subject]?.pass || 0;
            if ((student.scores[subject] ?? 0) < passLine) count++;
        });

        if (!failureData[count]) failureData[count] = [];
        failureData[count].push(student);
    });

    // 渲染图表
    const chartInstance = renderFailureCountChart('holistic-failure-count-chart', failureData);

    // 绑定图表点击事件
    const resultsWrapper = document.getElementById('holistic-results-wrapper');
    const resultsTitle = document.getElementById('holistic-results-title');
    const resultsTable = document.getElementById('holistic-results-table');

    if (chartInstance) {
        chartInstance.on('click', (params) => {
            const failCountText = params.name;
            const countKey = failCountText.split(' ')[0];
            const students = failureData[countKey];

            if (!students || students.length === 0) return;

            resultsWrapper.style.display = 'block';
            resultsTitle.innerText = `不及格 ${failCountText} 的学生 (${students.length}人)`;

            resultsTable.innerHTML = `
                <table>
                    <thead>
                        <tr>
                            <th>姓名</th>
                            <th>班级</th>
                            <th>总分</th>
                            <th>班排</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${students.map(s => `
                        <tr>
                            <td>${s.name}</td>
                            <td>${s.class}</td>
                            <td>${s.totalScore}</td>
                            <td>${s.rank}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        });
    }

    setTimeout(() => {
        renderHolisticShortestPlankChart('holistic-shortest-plank-chart', activeData);
        renderHolisticScatterChart('holistic-scatter-chart', activeData, stats);
    }, 100);
}

