/* eslint-disable no-undef */
'use strict';

import { State } from '../../config/state.js';

function initChart(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return null;

    if (State.echartsInstances[elementId]) {
        State.echartsInstances[elementId].dispose();
    }

    const chart = echarts.init(el);
    State.echartsInstances[elementId] = chart;
    return chart;
}

export function renderMultiExamLineChart(elementId, title, examNames, seriesData, inverseYAxis = false) {
    const chart = initChart(elementId);
    if (!chart) return;

    const option = {
        title: {
            text: title,
            left: 'center',
            textStyle: { fontSize: 16, fontWeight: 'normal' }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'line' }
        },
        legend: {
            top: 30,
            data: seriesData.map(s => s.name)
        },
        grid: { left: '5%', right: '5%', top: 80, bottom: 60 },
        xAxis: {
            type: 'category',
            data: examNames,
            boundaryGap: false,
            axisLabel: { interval: 0, rotate: examNames.length > 6 ? 30 : 0 }
        },
        yAxis: {
            type: 'value',
            inverse: inverseYAxis,
            name: inverseYAxis ? '排名 (数值越小越靠前)' : '分数',
            minInterval: 1
        },
        dataZoom: [
            { type: 'inside', xAxisIndex: 0 },
            { type: 'slider', xAxisIndex: 0, bottom: 10 }
        ],
        series: seriesData.map(series => ({
            ...series,
            type: 'line',
            smooth: true,
            connectNulls: true,
            symbol: 'circle',
            symbolSize: 6
        }))
    };

    chart.setOption(option);
}

export function renderSubjectRankChart(containerId, examNames, visibleExamData, studentId, checkedSubjects, rankType) {
    const subjectSeries = [];

    checkedSubjects.forEach(subject => {
        const classRankData = [];
        const gradeRankData = [];

        visibleExamData.forEach(exam => {
            const student = exam.students.find(s => String(s.id) === String(studentId));
            let validClassRank = null;
            let validGradeRank = null;

            if (student) {
                const score = student.scores[subject];
                if (typeof score === 'number' && !isNaN(score)) {
                    if (student.classRanks && student.classRanks[subject]) {
                        validClassRank = student.classRanks[subject];
                    }
                    if (student.gradeRanks && student.gradeRanks[subject]) {
                        validGradeRank = student.gradeRanks[subject];
                    }
                }
            }

            classRankData.push(validClassRank);
            gradeRankData.push(validGradeRank);
        });

        if (rankType === 'both' || rankType === 'class') {
            subjectSeries.push({
                name: `${subject}-班排`,
                data: classRankData
            });
        }
        if (rankType === 'both' || rankType === 'grade') {
            subjectSeries.push({
                name: `${subject}-年排`,
                data: gradeRankData
            });
        }
    });

    renderMultiExamLineChart(containerId, '', examNames, subjectSeries, true);
}

