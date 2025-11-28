/* eslint-disable no-undef */
'use strict';

/**
 * Correlation 模块专用图表函数
 */

import { State } from '../config/state.js';
import { calculateCorrelation } from '../utils/correlation.js';

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
 * 渲染相关系数热力图
 * @param {string} elementId - DOM 元素 ID
 * @param {Array<string>} subjects - 科目列表
 * @param {Array<Array<number>>} matrix - 相关系数矩阵
 */
export function renderCorrelationHeatmapV2(elementId, subjects, matrix) {
    const myChart = getChartInstance(elementId);
    if (!myChart) return;

    // 转换为 ECharts 格式 [x, y, value]
    const data = [];
    for (let i = 0; i < subjects.length; i++) {
        for (let j = 0; j < subjects.length; j++) {
            data.push([i, j, matrix[i][j]]);
        }
    }

    const option = {
        tooltip: {
            position: 'top',
            formatter: (p) => `${subjects[p.data[0]]} vs ${subjects[p.data[1]]}<br/>相关系数: <strong>${p.data[2]}</strong>`
        },
        grid: { height: '80%', top: '5%' },
        xAxis: { 
            type: 'category', 
            data: subjects, 
            splitArea: { show: true }, 
            axisLabel: { rotate: 30 } 
        },
        yAxis: { 
            type: 'category', 
            data: subjects, 
            splitArea: { show: true } 
        },
        visualMap: {
            min: -0.2, 
            max: 1,
            calculable: true,
            orient: 'horizontal',
            left: 'center', 
            bottom: 0,
            inRange: { color: ['#f5f5f5', '#e0f3f8', '#4575b4'] }
        },
        series: [{
            name: '相关系数',
            type: 'heatmap',
            data: data,
            label: { show: true, color: '#333' },
            itemStyle: {
                borderColor: '#fff',
                borderWidth: 1
            }
        }]
    };

    myChart.setOption(option);
}

/**
 * 渲染学科引力网络图
 * @param {string} elementId - DOM 元素 ID
 * @param {Array<string>} subjects - 科目列表
 * @param {Array<Object>} links - 连线数据 [{ source, target, value, lineStyle }]
 */
export function renderCorrelationNetwork(elementId, subjects, links) {
    const myChart = getChartInstance(elementId);
    if (!myChart) return;

    // 构建节点
    const nodes = subjects.map((sub, idx) => ({
        name: sub,
        symbolSize: 30,
        itemStyle: {
            color: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4'][idx % 8]
        },
        label: { show: true, fontSize: 11 }
    }));

    const option = {
        tooltip: { formatter: '{b}' },
        series: [{
            type: 'graph',
            layout: 'force',
            data: nodes,
            links: links,
            roam: true,
            label: { position: 'right', formatter: '{b}' },
            force: {
                repulsion: 400,
                edgeLength: [50, 200]
            },
            lineStyle: {
                color: 'source',
                curveness: 0.1
            },
            emphasis: {
                focus: 'adjacency',
                lineStyle: { width: 5 }
            }
        }]
    };

    myChart.setOption(option);
}

/**
 * 渲染学科核心影响力排行
 * @param {string} elementId - DOM 元素 ID
 * @param {Array<Object>} centralityData - 核心度数据 [{ name, totalR, count }]
 */
export function renderSubjectCentrality(elementId, centralityData) {
    const myChart = getChartInstance(elementId);
    if (!myChart) return;

    // 计算平均值并排序
    const data = centralityData.map(item => ({
        name: item.name,
        value: item.count > 0 ? parseFloat((item.totalR / item.count).toFixed(3)) : 0
    })).sort((a, b) => a.value - b.value);

    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: '{b}<br/>平均相关系数: {c}'
        },
        grid: { left: '3%', right: '4%', bottom: '3%', top: '5%', containLabel: true },
        xAxis: { type: 'value', name: '平均相关系数' },
        yAxis: { type: 'category', data: data.map(d => d.name) },
        series: [{
            type: 'bar',
            data: data.map(d => d.value),
            label: { show: true, position: 'right' },
            itemStyle: {
                color: (p) => {
                    const rank = data.length - 1 - p.dataIndex;
                    if (rank < 3) return '#d35400';
                    return '#87cefa';
                },
                borderRadius: [0, 4, 4, 0]
            },
            barWidth: '60%'
        }]
    };

    myChart.setOption(option);
}

