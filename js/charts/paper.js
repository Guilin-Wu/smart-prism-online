/* eslint-disable no-undef */
'use strict';

/**
 * Paper 模块专用图表函数
 */

import { State } from '../config/state.js';
import { renderSubjectComparisonBarChart } from './common.js';

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
 * 渲染难度-区分度散点图
 * @param {string} elementId - DOM 元素 ID
 * @param {Object} stats - 统计数据
 */
export function renderDifficultyScatter(elementId, stats) {
    const myChart = getChartInstance(elementId);
    if (!myChart) return;

    const data = State.dynamicSubjectList.map(subject => {
        const subjectStats = stats[subject];
        const config = State.subjectConfigs[subject] || {};
        const full = config.full || 100;
        
        if (!subjectStats) return null;
        
        const difficulty = subjectStats.average / full; // 难度系数
        const discrimination = subjectStats.stdDev || 0; // 区分度（标准差）
        const weight = full; // 气泡大小（满分）
        
        return {
            name: subject,
            value: [difficulty, discrimination, weight],
            itemStyle: {
                color: difficulty >= 0.6 && discrimination >= 20 ? '#28a745' : // 黄金区
                       difficulty < 0.6 && discrimination >= 20 ? '#fd7e14' : // 胜负手
                       difficulty < 0.6 && discrimination < 20 ? '#dc3545' : // 无效难
                       '#007bff' // 福利局
            }
        };
    }).filter(d => d !== null);

    const option = {
        title: {
            text: '难度 (X) vs 区分度 (Y)',
            left: 'center',
            textStyle: { fontSize: 16, fontWeight: 'normal' }
        },
        tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(255,255,255,0.9)',
            formatter: (params) => {
                const data = params.data;
                return `<strong>${data.value[3]}</strong><br/>` +
                    `难度系数: <strong>${data.value[0]}</strong> (越右越简单)<br/>` +
                    `区分度: <strong>${data.value[1]}</strong> (越上越拉分)`;
            }
        },
        grid: { left: '10%', right: '10%', bottom: '15%', top: '15%' },
        xAxis: {
            type: 'value',
            name: '难度 (简单 →)',
            nameLocation: 'end',
            min: 0,
            max: 1.0,
            splitLine: { show: false }
        },
        yAxis: {
            type: 'value',
            name: '区分度 (拉分 ↑)',
            nameLocation: 'end',
            splitLine: { show: false }
        },
        series: [{
            name: '科目',
            type: 'scatter',
            data: scatterData,
            symbolSize: (data) => data[2],
            label: {
                show: true,
                formatter: (param) => param.data.name,
                position: 'top',
                color: '#333',
                fontWeight: 'bold'
            },
            markLine: {
                silent: true,
                symbol: 'none',
                lineStyle: {
                    type: 'dashed',
                    color: '#999',
                    width: 1.5
                },
                label: {
                    show: true,
                    position: 'end',
                    formatter: '{b}: {c}'
                },
                data: [
                    {
                        type: 'average',
                        valueDim: 'x',
                        name: '平均难度',
                        label: { position: 'start', formatter: '平均难度\n{c}' }
                    },
                    {
                        type: 'average',
                        valueDim: 'y',
                        name: '平均区分度',
                        label: { position: 'end', formatter: '平均区分度 {c}' }
                    }
                ]
            }
        }],
        toolbox: {
            show: true,
            feature: {
                saveAsImage: { show: true, title: '保存' }
            }
        }
    };

    myChart.setOption(option);
}

