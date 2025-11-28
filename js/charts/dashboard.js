/* eslint-disable no-undef */
'use strict';

/**
 * Dashboard 模块专用图表函数
 */

import { State } from '../config/state.js';
import { calculateAllStatistics } from '../utils/statistics.js';
import { renderHistogram, renderAverageRadar, renderSubjectBoxPlot, renderCorrelationScatterPlot, renderStackedBar, renderSubjectComparisonBarChart } from './common.js';

// 获取或创建 ECharts 实例
function getChartInstance(elementId) {
    if (!window.echartsInstances) {
        window.echartsInstances = State.echartsInstances;
    }
    
    const chartDom = document.getElementById(elementId);
    if (!chartDom) return null;

    if (window.echartsInstances[elementId]) {
        window.echartsInstances[elementId].dispose();
    }
    
    const myChart = echarts.init(chartDom);
    window.echartsInstances[elementId] = myChart;
    State.echartsInstances[elementId] = myChart;
    
    return myChart;
}

/**
 * 计算班级对比数据
 * @param {string} metric - 指标名称
 * @param {string} subject - 科目名称
 * @returns {Array} 班级对比数据
 */
function calculateClassComparison(metric, subject) {
    const allStudents = State.studentsData;
    const classSet = new Set(allStudents.map(s => s.class));
    const classes = Array.from(classSet).sort();

    return classes.map(cls => {
        const classStudents = allStudents.filter(s => s.class === cls);
        const classStats = calculateAllStatistics(classStudents, State.dynamicSubjectList, State.subjectConfigs);
        
        let value = 0;
        if (subject === 'totalScore') {
            value = classStats.totalScore?.[metric] || 0;
        } else {
            value = classStats[subject]?.[metric] || 0;
        }

        return {
            name: cls,
            value: value
        };
    });
}

/**
 * 渲染班级对比图
 * @param {string} elementId - DOM 元素 ID
 * @param {Array} data - 对比数据
 * @param {string} title - 图表标题
 */
export function renderClassComparisonChart(elementId, data, title) {
    const myChart = getChartInstance(elementId);
    if (!myChart) return;

    const labels = data.map(d => d.name);
    const values = data.map(d => d.value);

    let maxValue = -Infinity;
    let minValue = Infinity;
    const validValues = values.filter(v => v > 0);
    if (validValues.length > 0) {
        minValue = Math.min(...validValues);
    } else {
        minValue = 0;
    }
    maxValue = Math.max(...values);

    const seriesData = values.map(value => {
        let color;
        if (value === maxValue && maxValue !== 0) {
            color = '#28a745';
        } else if (value === minValue && minValue !== maxValue) {
            color = '#dc3545';
        } else {
            color = '#007bff';
        }
        return {
            value: value,
            itemStyle: { color: color }
        };
    });

    const option = {
        title: { text: title, left: 'center' },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: (params) => {
                const p = params[0];
                return `${p.name}<br/>${title}: <strong>${parseFloat(p.value).toFixed(2)}</strong>`;
            }
        },
        grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
        xAxis: {
            type: 'category',
            data: labels,
            axisLabel: { rotate: 30 }
        },
        yAxis: {
            type: 'value'
        },
        series: [{
            name: title,
            type: 'bar',
            data: seriesData,
            label: {
                show: true,
                position: 'top',
                formatter: (params) => parseFloat(params.value).toFixed(2)
            }
        }]
    };

    myChart.setOption(option);
}

/**
 * 渲染贡献度分析图
 * @param {string} elementId - DOM 元素 ID
 * @param {Array<string>} subjects - 科目列表
 * @param {Array<number>} data - 贡献度数据
 * @param {string} totalDiff - 总差值
 */
export function renderContributionChart(elementId, subjects, data, totalDiff) {
    const myChart = getChartInstance(elementId);
    if (!myChart) return;

    const seriesData = data.map((value, idx) => {
        let color = value >= 0 ? '#28a745' : '#dc3545';
        return {
            value: value,
            itemStyle: { color: color }
        };
    });

    const option = {
        title: {
            text: '各科贡献度分析',
            subtext: `总差值: ${totalDiff}`,
            left: 'center'
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: (params) => {
                const p = params[0];
                const sign = p.value >= 0 ? '+' : '';
                return `${p.name}<br/>贡献度: <strong>${sign}${parseFloat(p.value).toFixed(2)}</strong>`;
            }
        },
        grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
        xAxis: {
            type: 'category',
            data: subjects,
            axisLabel: { rotate: 30 }
        },
        yAxis: {
            type: 'value',
            name: '贡献度',
            axisLine: { lineStyle: { color: '#999' } },
            splitLine: { lineStyle: { color: '#eee' } }
        },
        series: [{
            name: '贡献度',
            type: 'bar',
            data: seriesData,
            label: {
                show: true,
                position: p => p.value >= 0 ? 'top' : 'bottom',
                formatter: (params) => {
                    const sign = params.value >= 0 ? '+' : '';
                    return `${sign}${parseFloat(params.value).toFixed(2)}`;
                }
            },
            markLine: {
                data: [{ yAxis: 0, lineStyle: { color: '#999', type: 'dashed' } }]
            }
        }]
    };

    myChart.setOption(option);
}

/**
 * 渲染成绩曲线图
 * @param {string} elementId - DOM 元素 ID
 * @param {Array} students - 学生数据
 * @param {string} subject - 科目（'totalScore' 或科目名或 'ALL_SUBJECTS'）
 * @param {number} binSize - 分段大小
 * @param {boolean} isClassCompare - 是否班级对比
 */
export function renderScoreCurve(elementId, students, subject, binSize, isClassCompare = false) {
    const myChart = getChartInstance(elementId);
    if (!myChart) return;

    // 如果是全科对比模式
    if (subject === 'ALL_SUBJECTS') {
        const subjects = State.dynamicSubjectList;
        const series = [];
        const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'];

        subjects.forEach((sub, idx) => {
            const config = State.subjectConfigs[sub] || {};
            const fullScore = config.full || 100;
            const effectiveBinSize = binSize > 0 ? binSize : 10;
            
            const scores = students
                .map(s => s.scores[sub])
                .filter(s => typeof s === 'number' && !isNaN(s));
            
            if (scores.length === 0) return;

            const minScore = Math.min(...scores);
            const maxScore = Math.max(...scores);
            const startBin = Math.floor(minScore / effectiveBinSize) * effectiveBinSize;
            const endBinLimit = Math.min(Math.ceil((maxScore + 0.01) / effectiveBinSize) * effectiveBinSize, fullScore);

            const labels = [];
            for (let i = startBin; i < endBinLimit; i += effectiveBinSize) {
                const end = Math.min(i + effectiveBinSize, fullScore);
                labels.push(`${i}-${end}`);
            }

            const bins = new Array(labels.length).fill(0);
            scores.forEach(score => {
                if (score < startBin) return;
                let binIndex = Math.floor((score - startBin) / effectiveBinSize);
                if (binIndex >= labels.length) binIndex = labels.length - 1;
                bins[binIndex]++;
            });

            series.push({
                name: sub,
                type: 'line',
                smooth: 0.3,
                symbol: 'circle',
                symbolSize: 4,
                data: bins,
                itemStyle: { color: colors[idx % colors.length] },
                lineStyle: { width: 2 }
            });
        });

        const option = {
            title: { text: '全科成绩分布对比', left: 'center' },
            tooltip: { trigger: 'axis' },
            legend: { data: subjects, top: 30, type: 'scroll' },
            grid: { left: '3%', right: '4%', bottom: '20%', top: '15%', containLabel: true },
            xAxis: {
                type: 'category',
                data: labels.length > 0 ? labels : ['无数据'],
                name: '分数段',
                axisLabel: { interval: 'auto', rotate: 30 }
            },
            yAxis: { type: 'value', name: '人数' },
            series: series
        };

        myChart.setOption(option);
        return;
    }

    // 单科模式 - 使用 renderHistogram
    const fullScore = subject === 'totalScore' 
        ? State.dynamicSubjectList.reduce((sum, sub) => sum + (State.subjectConfigs[sub]?.full || 0), 0)
        : (State.subjectConfigs[subject]?.full || 100);
    
    renderHistogram(elementId, students, subject, fullScore, `${subject === 'totalScore' ? '总分' : subject} 成绩分布`, binSize, isClassCompare);
}

// 导出计算函数供外部使用
export { calculateClassComparison };

