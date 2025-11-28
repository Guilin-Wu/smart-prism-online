/* eslint-disable no-undef */
'use strict';

/**
 * 路由管理器
 * 处理模块切换和渲染
 */

// 模块渲染器映射（将在main.js中注册）
const moduleRenderers = {};

/**
 * 注册模块渲染器
 * @param {string} moduleName - 模块名称
 * @param {Function} renderer - 渲染函数
 */
export function registerModule(moduleName, renderer) {
    moduleRenderers[moduleName] = renderer;
}

/**
 * 渲染模块
 * @param {string} moduleName - 模块名称
 * @param {Object} data - 数据对象 { activeData, activeCompareData, stats, compareStats, currentFilter }
 */
export function renderModule(moduleName, data = {}) {
    const { activeData = [], activeCompareData = [], stats = {}, compareStats = {}, currentFilter = 'ALL' } = data;
    
    // 隐藏欢迎屏幕
    const welcomeScreen = document.getElementById('welcome-screen');
    if (welcomeScreen) welcomeScreen.style.display = 'none';

    // 隐藏所有模块面板
    const modulePanels = document.querySelectorAll('.module-panel');
    modulePanels.forEach(p => p.style.display = 'none');

    // 显示目标模块
    const container = document.getElementById(`module-${moduleName}`);
    if (!container) {
        console.warn(`模块容器不存在: module-${moduleName}`);
        return;
    }
    container.style.display = 'block';

    // 调用对应的渲染器
    const renderer = moduleRenderers[moduleName];
    if (renderer) {
        try {
            renderer(container, { activeData, activeCompareData, stats, compareStats, currentFilter });
        } catch (error) {
            console.error(`渲染模块 ${moduleName} 时出错:`, error);
        }
    } else {
        console.warn(`未找到模块渲染器: ${moduleName}`);
    }
}

/**
 * 获取当前激活的模块
 * @returns {string|null} 模块名称
 */
export function getCurrentModule() {
    const activeLink = document.querySelector('.nav-link.active');
    if (activeLink) {
        return activeLink.getAttribute('data-module');
    }
    return null;
}

