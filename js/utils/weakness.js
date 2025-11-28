/* eslint-disable no-undef */
'use strict';

import { State } from '../config/state.js';

// 计算偏科分析数据（返回每个可分析学生的偏科信息）
export function calculateWeaknessData(students = [], stats = {}) {
    const subjectList = Array.isArray(State.dynamicSubjectList) ? State.dynamicSubjectList : [];

    const mean = (arr) => {
        if (!arr || arr.length === 0) return 0;
        const valid = arr.filter(v => typeof v === 'number' && !isNaN(v));
        if (valid.length === 0) return 0;
        return valid.reduce((s, v) => s + v, 0) / valid.length;
    };

    const stdDev = (arr, meanVal) => {
        if (!arr || arr.length < 2) return 0;
        const valid = arr.filter(v => typeof v === 'number' && !isNaN(v));
        if (valid.length < 2) return 0;
        const variance = valid.reduce((s, v) => s + Math.pow(v - meanVal, 2), 0) / valid.length;
        return Math.sqrt(variance);
    };

    const results = [];

    (students || []).forEach(student => {
        const zScores = [];
        const validSubjects = [];

        subjectList.forEach(subject => {
            const subjectStat = stats[subject];
            const score = student && student.scores ? student.scores[subject] : undefined;
            if (subjectStat && typeof subjectStat.stdDev === 'number' && subjectStat.stdDev > 0 && score !== null && score !== undefined) {
                const z = (score - (subjectStat.average || 0)) / subjectStat.stdDev;
                zScores.push(z);
                validSubjects.push(subject);
            }
        });

        if (zScores.length < 2) {
            // 数据不足，无法有效分析
            results.push(null);
            return;
        }

        const avgZ = mean(zScores);
        const sdZ = stdDev(zScores, avgZ);

        const subjectDeviations = zScores.map((z, i) => ({
            subject: validSubjects[i],
            zScore: parseFloat(z.toFixed(2)),
            deviation: parseFloat((z - avgZ).toFixed(2))
        }));

        results.push({
            student: student,
            avgZScore: parseFloat(avgZ.toFixed(2)),
            stdDevZScore: parseFloat(sdZ.toFixed(2)),
            subjectDeviations: subjectDeviations
        });
    });

    // 过滤掉无法分析的记录
    return results.filter(r => r !== null);
}

export default calculateWeaknessData;
