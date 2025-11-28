/* eslint-disable no-undef */
'use strict';

/**
 * Groups 模块专用图表函数
 */

import { State } from '../config/state.js';
import { calculateAllStatistics } from '../utils/statistics.js';

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
 * 渲染筛选结果班级构成饼图
 * @param {string} elementId - DOM 元素 ID
 * @param {Array} filteredStudents - 筛选后的学生数据
 */
export function renderGroupClassPie(elementId, filteredStudents) {
    const myChart = getChartInstance(elementId);
    if (!myChart) return;

    // 统计班级
    const classCounts = {};
    filteredStudents.forEach(student => {
        classCounts[student.class] = (classCounts[student.class] || 0) + 1;
    });

    // 转换为 ECharts 数据
    const pieData = Object.keys(classCounts).map(className => {
        return {
            value: classCounts[className],
            name: className
        };
    }).sort((a, b) => b.value - a.value);

    const option = {
        title: {
            text: '筛选群体的班级构成',
            left: 'center',
            textStyle: { fontSize: 16, fontWeight: 'normal' }
        },
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c}人 ({d}%)'
        },
        legend: {
            orient: 'vertical',
            left: 'left',
            top: 'middle',
            type: 'scroll',
            data: pieData.map(d => d.name)
        },
        series: [{
            name: '班级',
            type: 'pie',
            radius: ['40%', '70%'],
            center: ['65%', '55%'],
            data: pieData,
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowOffsetX: 0,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
            },
            label: {
                show: true,
                formatter: '{c}人',
                position: 'outside'
            }
        }]
    };

    myChart.setOption(option);
}

/**
 * 渲染群体能力雷达图
 * @param {string} elementId - DOM 元素 ID
 * @param {Array} filteredStudents - 筛选后的学生数据
 * @param {Object} totalStats - 全体统计数据
 */
export function renderGroupRadarChart(elementId, filteredStudents, totalStats) {
    const myChart = getChartInstance(elementId);
    if (!myChart) return;

    // 重新计算筛选群体的统计数据
    const groupStats = calculateAllStatistics(filteredStudents, State.dynamicSubjectList, State.subjectConfigs);

    // 准备雷达图指示器
    const indicators = State.dynamicSubjectList.map(subject => {
        return { name: subject, max: 1.0 };
    });

    // 获取筛选群体的得分率
    const groupData = State.dynamicSubjectList.map(subject => {
        const stats = groupStats[subject];
        if (stats && stats.difficulty !== undefined) return stats.difficulty;
        if (stats && State.subjectConfigs[subject]) {
            return stats.average / State.subjectConfigs[subject].full;
        }
        return 0;
    });

    // 获取全体平均的得分率
    const totalData = State.dynamicSubjectList.map(subject => {
        const stats = totalStats[subject];
        if (stats && stats.difficulty !== undefined) return stats.difficulty;
        if (stats && State.subjectConfigs[subject]) {
            return stats.average / State.subjectConfigs[subject].full;
        }
        return 0;
    });

    const option = {
        title: {
            text: '群体能力 vs 全体平均',
            subtext: '(指标: 得分率/难度)',
            left: 'center',
            textStyle: { fontSize: 16, fontWeight: 'normal' }
        },
        tooltip: { trigger: 'item' },
        legend: {
            data: ['筛选群体', '全体平均'],
            bottom: 10
        },
        radar: {
            indicator: indicators,
            radius: '65%',
            splitArea: {
                areaStyle: {
                    color: ['rgba(250,250,250,0.3)', 'rgba(200,200,200,0.3)']
                }
            }
        },
        series: [{
            name: '群体 vs 全体',
            type: 'radar',
            data: [
                {
                    value: groupData,
                    name: '筛选群体',
                    areaStyle: { opacity: 0.4, color: '#28a745' },
                    itemStyle: { color: '#28a745' },
                    lineStyle: { color: '#28a745' }
                },
                {
                    value: totalData,
                    name: '全体平均',
                    areaStyle: { opacity: 0.2, color: '#007bff' },
                    itemStyle: { color: '#007bff' },
                    lineStyle: { color: '#007bff' }
                }
            ]
        }]
    };

    myChart.setOption(option);
}

