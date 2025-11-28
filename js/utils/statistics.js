/* eslint-disable no-undef */
'use strict';

/**
 * 统计计算模块
 * 包含所有统计相关的计算函数
 */

/**
 * 计算所有统计数据
 * @param {Array<Object>} studentsData - 学生数据数组
 * @param {Array<string>} subjectList - 科目列表
 * @param {Object} subjectConfigs - 科目配置
 * @returns {Object} 统计数据对象
 */
export function calculateAllStatistics(studentsData, subjectList, subjectConfigs) {
    if (!studentsData || studentsData.length === 0) return {};

    const stats = {};
    let totalFull = 0, totalPass = 0, totalExcel = 0, totalGood = 0;

    subjectList.forEach(subjectName => {
        const config = subjectConfigs[subjectName];
        if (!config) return;

        const subjectScores = studentsData
            .map(s => s.scores[subjectName])
            .filter(score => typeof score === 'number' && !isNaN(score))
            .sort((a, b) => a - b);

        stats[subjectName] = calculateStatsForScores(
            subjectScores,
            config.full,
            config.pass,
            config.excel,
            config.good,
            config.superExcel || (config.full * 0.9),
            config.low || (config.full * 0.3)
        );
        stats[subjectName].name = subjectName;

        totalFull += config.full;
        totalPass += config.pass;
        totalExcel += config.excel;
        totalGood += config.good;
    });

    // 统计总分
    const totalScores = studentsData
        .map(s => s.totalScore)
        .filter(score => typeof score === 'number' && !isNaN(score))
        .sort((a, b) => a - b);

    stats['totalScore'] = calculateStatsForScores(totalScores, totalFull, totalPass, totalExcel, totalGood);
    stats['totalScore'].name = '总分';

    return stats;
}

/**
 * 计算标准分 (Z-Score / T-Score)
 * @param {Array<Object>} students - 学生数据数组
 * @param {Object} stats - 统计数据对象
 * @param {Array<string>} subjectList - 科目列表
 */
export function calculateStandardScores(students, stats, subjectList) {
    students.forEach(student => {
        student.tScores = {};
        student.zScores = {};

        subjectList.forEach(subject => {
            const stat = stats[subject];
            const score = student.scores[subject];

            if (stat && stat.stdDev > 0 && typeof score === 'number') {
                const z = (score - stat.average) / stat.stdDev;
                const t = 50 + (10 * z);

                student.zScores[subject] = parseFloat(z.toFixed(2));
                student.tScores[subject] = parseFloat(t.toFixed(1));
            } else {
                student.zScores[subject] = 0;
                student.tScores[subject] = 50;
            }
        });
    });
}

/**
 * 计算单个分数数组的统计值
 * @param {Array<number>} scores - 分数数组（已排序）
 * @param {number} fullMark - 满分
 * @param {number} passLine - 及格线
 * @param {number} excellentLine - 优秀线
 * @param {number} goodLine - 良好线
 * @param {number} superExcelLine - 特优线
 * @param {number} lowLine - 低分线
 * @returns {Object} 统计结果对象
 */
export function calculateStatsForScores(scores, fullMark, passLine, excellentLine, goodLine, superExcelLine, lowLine) {
    const count = scores.length;

    if (superExcelLine === undefined) superExcelLine = fullMark * 0.9;
    if (lowLine === undefined) lowLine = passLine * 0.5;

    if (count === 0) {
        return {
            average: 0, max: 0, min: 0, median: 0,
            passRate: 0, excellentRate: 0, goodRate: 0, failRate: 0,
            superRate: 0, lowRate: 0,
            count: 0, variance: 0, stdDev: 0, difficulty: 0,
            scores: []
        };
    }

    const total = scores.reduce((acc, score) => acc + score, 0);
    const average = total / count;
    const max = scores[count - 1];
    const min = scores[0];

    const mid = Math.floor(count / 2);
    const median = count % 2 === 0 ? (scores[mid - 1] + scores[mid]) / 2 : scores[mid];

    const variance = scores.reduce((acc, score) => acc + Math.pow(score - average, 2), 0) / count;
    const stdDev = Math.sqrt(variance);
    const difficulty = fullMark > 0 ? parseFloat((average / fullMark).toFixed(2)) : 0;

    const passCount = scores.filter(s => s >= passLine).length;
    const excellentCount = scores.filter(s => s >= excellentLine).length;
    const goodCount = scores.filter(s => s >= goodLine).length;
    const superCount = scores.filter(s => s >= superExcelLine).length;
    const lowCount = scores.filter(s => s < lowLine).length;

    return {
        count: count,
        average: parseFloat(average.toFixed(2)),
        max: max,
        min: min,
        median: parseFloat(median.toFixed(2)),
        stdDev: parseFloat(stdDev.toFixed(2)),
        variance: parseFloat(variance.toFixed(2)),
        difficulty: difficulty,
        passRate: parseFloat(((passCount / count) * 100).toFixed(2)),
        excellentRate: parseFloat(((excellentCount / count) * 100).toFixed(2)),
        goodRate: parseFloat(((goodCount / count) * 100).toFixed(2)),
        failRate: parseFloat((((count - passCount) / count) * 100).toFixed(2)),
        superRate: parseFloat(((superCount / count) * 100).toFixed(2)),
        lowRate: parseFloat(((lowCount / count) * 100).toFixed(2)),
        scores: scores
    };
}

/**
 * 高考赋分制预估 (简易版 - 21等级赋分)
 * @param {number} rank - 排名
 * @param {number} totalCount - 总人数
 * @returns {number} 赋分
 */
export function calculateAssignedScore(rank, totalCount) {
    if (!totalCount) return 0;
    const percentage = (rank / totalCount) * 100;

    if (percentage <= 1) return 100;
    if (percentage <= 3) return 97;
    if (percentage <= 6) return 94;
    if (percentage <= 10) return 91;
    if (percentage <= 15) return 88;
    if (percentage <= 21) return 85;
    if (percentage <= 28) return 82;
    if (percentage <= 36) return 79;
    if (percentage <= 45) return 76;
    if (percentage <= 55) return 73;
    if (percentage <= 66) return 70;
    if (percentage <= 78) return 67;
    if (percentage <= 91) return 64;
    if (percentage <= 97) return 61;
    if (percentage <= 99) return 58;
    return 40;
}

/**
 * 福建省高考赋分算法 (3+1+2模式)
 * @param {number} studentScore - 学生分数
 * @param {Array<number>} allScores - 所有分数数组
 * @returns {number|string} 赋分结果
 */
export function calculateFujianAssignedScore(studentScore, allScores) {
    const validScores = allScores.filter(s => typeof s === 'number' && !isNaN(s)).sort((a, b) => b - a);
    const total = validScores.length;

    if (total === 0 || typeof studentScore !== 'number') return 'N/A';

    const idxA = Math.floor(total * 0.15);
    const idxB = Math.floor(total * (0.15 + 0.35));
    const idxC = Math.floor(total * (0.50 + 0.35));
    const idxD = Math.floor(total * (0.85 + 0.13));

    const myRankIdx = validScores.indexOf(studentScore);

    let T1, T2, Y1, Y2;
    let subset = [];

    if (myRankIdx < idxA) {
        T2 = 100; T1 = 86;
        subset = validScores.slice(0, idxA);
    } else if (myRankIdx < idxB) {
        T2 = 85; T1 = 71;
        subset = validScores.slice(idxA, idxB);
    } else if (myRankIdx < idxC) {
        T2 = 70; T1 = 56;
        subset = validScores.slice(idxB, idxC);
    } else if (myRankIdx < idxD) {
        T2 = 55; T1 = 41;
        subset = validScores.slice(idxC, idxD);
    } else {
        T2 = 40; T1 = 30;
        subset = validScores.slice(idxD);
    }

    if (subset.length === 0) return studentScore;
    Y2 = subset[0];
    Y1 = subset[subset.length - 1];

    if (Y2 === Y1) return T2;

    const assignedScore = ((studentScore - Y1) / (Y2 - Y1)) * (T2 - T1) + T1;
    return Math.round(assignedScore);
}

