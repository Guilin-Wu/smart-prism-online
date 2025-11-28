/* eslint-disable no-undef */
'use strict';

/**
 * Student 模块专用图表函数
 */

import { State } from '../config/state.js';

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
 * 渲染学生个体 vs 年级平均雷达图
 * @param {string} elementId - DOM 元素 ID
 * @param {Object} student - 学生数据
 * @param {Object} stats - 统计数据
 */
export function renderStudentRadar(elementId, student, stats) {
    const myChart = getChartInstance(elementId);
    if (!myChart) return;

    // 准备雷达图指示器 (使用得分率，max设为100)
    const indicators = State.dynamicSubjectList.map(subject => {
        return { name: subject, max: 100 };
    });

    // 计算学生得分率
    const studentData = State.dynamicSubjectList.map(subject => {
        const score = student.scores[subject] || 0;
        const full = State.subjectConfigs[subject]?.full;
        if (!full || full === 0) return 0;
        return parseFloat(((score / full) * 100).toFixed(1));
    });

    // 计算年级平均得分率
    const averageData = State.dynamicSubjectList.map(subject => {
        const avgScore = stats[subject]?.average || 0;
        const full = State.subjectConfigs[subject]?.full;
        if (!full || full === 0) return 0;
        return parseFloat(((avgScore / full) * 100).toFixed(1));
    });

    const option = {
        title: {
            text: '学生 vs 年级平均 (得分率 %)',
            left: 'center',
            textStyle: { fontSize: 16, fontWeight: 'normal' }
        },
        tooltip: {
            trigger: 'item',
            formatter: (params) => {
                let s = `<strong>${params.name}</strong><br/>`;
                const studentColor = '#28a745';
                const averageColor = '#007bff';
                if (params.seriesName === '学生 vs 年级平均') {
                    s += `<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:${studentColor};"></span> 学生: ${studentData[params.dataIndex]}%<br/>`;
                    s += `<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:${averageColor};"></span> 年级平均: ${averageData[params.dataIndex]}%`;
                } else if (params.seriesName === '学生') {
                    s += `<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:${studentColor};"></span> ${params.name}: ${params.value}%`;
                } else if (params.seriesName === '年级平均') {
                    s += `<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:${averageColor};"></span> ${params.name}: ${params.value}%`;
                }
                return s;
            }
        },
        legend: {
            data: ['学生', '年级平均'],
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
            name: '学生 vs 年级平均',
            type: 'radar',
            itemStyle: {
                color: '#28a745'
            },
            lineStyle: {
                color: '#28a745'
            },
            data: [
                {
                    value: studentData,
                    name: '学生',
                    areaStyle: {
                        opacity: 0.4,
                        color: '#28a745'
                    },
                    itemStyle: { color: '#28a745' },
                    lineStyle: { color: '#28a745' }
                },
                {
                    value: averageData,
                    name: '年级平均',
                    areaStyle: {
                        opacity: 0.2,
                        color: '#007bff'
                    },
                    itemStyle: { color: '#007bff' },
                    lineStyle: { color: '#007bff' }
                }
            ]
        }],
        toolbox: {
            show: true,
            feature: {
                saveAsImage: { show: true, title: '保存为图片' }
            }
        }
    };
    
    myChart.setOption(option);
}

