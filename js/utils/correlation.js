/* eslint-disable no-undef */
'use strict';

/**
 * 相关性计算工具函数
 */

/**
 * 计算皮尔逊相关系数
 * @param {Array<number>} arrA - 数组A
 * @param {Array<number>} arrB - 数组B
 * @returns {number} 相关系数 (-1 到 1)
 */
export function calculateCorrelation(arrA, arrB) {
    if (!arrA || !arrB || arrA.length !== arrB.length || arrA.length < 2) {
        return 0;
    }

    const n = arrA.length;
    
    // 计算均值
    const meanA = arrA.reduce((sum, val) => sum + val, 0) / n;
    const meanB = arrB.reduce((sum, val) => sum + val, 0) / n;

    // 计算协方差和标准差
    let sumCov = 0;
    let sumVarA = 0;
    let sumVarB = 0;

    for (let i = 0; i < n; i++) {
        const diffA = arrA[i] - meanA;
        const diffB = arrB[i] - meanB;
        sumCov += diffA * diffB;
        sumVarA += diffA * diffA;
        sumVarB += diffB * diffB;
    }

    const stdA = Math.sqrt(sumVarA);
    const stdB = Math.sqrt(sumVarB);

    if (stdA === 0 || stdB === 0) {
        return 0;
    }

    return sumCov / (stdA * stdB);
}

