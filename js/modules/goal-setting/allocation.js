/* eslint-disable no-undef */
'use strict';

import { State } from '../../config/state.js';

/**
 * 辅助：生成简单的评语
 */
export function getDifficultyText(room, current, ceiling) {
    const ratio = current / ceiling;
    if (ratio > 0.90) return "保持优势 (冲满分)";
    if (ratio > 0.80) return "重点突破 (冲优秀)";
    if (ratio < 0.60) return "基础补强 (抓及格)";
    return "稳步提升";
}

/**
 * [核心算法] 智能分配提分额度
 * 逻辑：
 * 1. 总缺口 = 目标分 - 当前分
 * 2. 计算每科的"提分潜力权重" (Weight):
 * - 因子 A (空间): 满分 (或年级最高分) - 学生当前分。 空间越大，权重越大。
 * - 因子 B (难度): 难度系数 (Average / Full)。 越简单(系数大)，通常越容易提分？
 * 或者反过来：标准差越大，说明越容易拉开分差。
 * 这里采用：权重 = (年级最高分 - 个人分) * (该科标准差 / 满分)
 * (解释：不仅要看还有多少分没拿，还要看这个科目大家的分数是否拉得很开。如果标准差大，说明努力一下容易变动)
 */
export function calculateSmartAllocation(student, targetTotal, allStudents, stats) {
    const currentTotal = student.totalScore;
    const totalDeficit = targetTotal - currentTotal;

    const result = {
        details: [],
        totalDeficit: totalDeficit
    };

    if (totalDeficit <= 0) return result; // 已经达到目标

    let totalWeight = 0;
    const subjectWeights = [];

    const subjectList = State.dynamicSubjectList || window.G_DynamicSubjectList || [];
    const subjectConfigs = State.subjectConfigs || window.G_SubjectConfigs || {};

    subjectList.forEach(subject => {
        const sStat = stats[subject];
        const currentScore = student.scores[subject] || 0;

        // 1. 确定该科目的"天花板" (使用年级最高分比较合理，或者满分)
        // 使用配置的满分更稳妥，或者取两者较小值防止异常数据
        const configFull = subjectConfigs[subject] ? subjectConfigs[subject].full : 100;
        const maxScore = sStat ? sStat.max : configFull;
        const ceiling = Math.min(configFull, maxScore);

        // 2. 计算提升空间 (Room to Grow)
        let room = ceiling - currentScore;
        if (room < 0) room = 0;

        // 3. 计算权重 (Heuristic)
        // 权重 = 空间 * (1 + 难度系数). 越简单的科目(难度系数高)，在有空间的情况下，越好拿分。
        // 或者：权重 = 空间 * 归一化的标准差。
        // 这里用简单模型：空间 * (该科平均分/满分)。 平均分高说明题目相对容易，补分容易。
        const difficulty = sStat ? (sStat.average / configFull) : 0.6;
        const weight = room * difficulty; // 简单粗暴但有效

        if (weight > 0) {
            subjectWeights.push({ subject, weight, room, currentScore, ceiling });
            totalWeight += weight;
        } else {
            subjectWeights.push({ subject, weight: 0, room, currentScore, ceiling });
        }
    });

    // 4. 分配分数
    subjectWeights.forEach(item => {
        let suggestedGain = 0;
        if (totalWeight > 0) {
            suggestedGain = (item.weight / totalWeight) * totalDeficit;
        }

        // 5. 修正边界：不能超过空间 (虽然权重逻辑已考虑，但按比例分配可能溢出)
        if (suggestedGain > item.room) suggestedGain = item.room;

        result.details.push({
            subject: item.subject,
            current: item.currentScore,
            target: item.currentScore + suggestedGain,
            gain: suggestedGain,
            room: item.room,
            difficultyText: getDifficultyText(item.room, item.currentScore, item.ceiling) // 获取评语
        });
    });

    return result;
}

