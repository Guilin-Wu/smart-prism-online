/* eslint-disable no-undef */
'use strict';

/**
 * 通用工具函数
 */

/**
 * 填充班级筛选下拉框
 * @param {Array<Object>} students - 学生数据数组
 * @param {HTMLElement} selectElement - 下拉框元素
 */
export function populateClassFilter(students, selectElement) {
    if (!students || students.length === 0) return;
    
    const classes = [...new Set(students.map(s => s.class))].sort();
    let html = `<option value="ALL">-- 全体年段 --</option>`;
    html += classes.map(c => `<option value="${c}">${c}</option>`).join('');
    
    if (selectElement) {
        selectElement.innerHTML = html;
    }
    
    return classes;
}

/**
 * 初始化科目配置
 * @param {Array<string>} subjectList - 科目列表
 * @returns {Object} 科目配置对象
 */
export function initializeSubjectConfigs(subjectList) {
    const configs = {};
    
    subjectList.forEach(subject => {
        const isY_S_W = ['语文', '数学', '英语'].includes(subject);
        configs[subject] = {
            full: isY_S_W ? 150 : 100,
            superExcel: isY_S_W ? 135 : 90,
            excel: isY_S_W ? 120 : 85,
            good: isY_S_W ? 105 : 75,
            pass: isY_S_W ? 90 : 60,
            low: isY_S_W ? 45 : 30,
            isAssigned: false
        };
    });
    
    return configs;
}

/**
 * 格式化数字
 * @param {number} num - 数字
 * @param {number} decimals - 小数位数
 * @returns {string} 格式化后的字符串
 */
export function formatNumber(num, decimals = 2) {
    if (num === null || num === undefined || isNaN(num)) return '0';
    return parseFloat(num).toFixed(decimals);
}

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 节流函数
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 时间限制（毫秒）
 * @returns {Function} 节流后的函数
 */
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * 深拷贝对象
 * @param {*} obj - 要拷贝的对象
 * @returns {*} 拷贝后的对象
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

