/* eslint-disable no-undef */
'use strict';

import { STORAGE_KEYS } from '../config/constants.js';

/**
 * 数据存储管理模块
 * 处理所有本地存储操作（localforage）
 */

/**
 * 从 IndexedDB 加载数据
 */
export async function loadDataFromStorage() {
    console.log("🚀 系统启动：正在连接 IndexedDB 加载数据...");

    try {
        // 并行读取所有数据
        const [
            storedData,
            storedCompareData,
            storedConfigs,
            storedMainFile,
            storedCompareFile,
            storedItemData,
            storedItemConfig,
            storedItemFile
        ] = await Promise.all([
            localforage.getItem(STORAGE_KEYS.STUDENTS_DATA),
            localforage.getItem(STORAGE_KEYS.COMPARE_DATA),
            localforage.getItem(STORAGE_KEYS.SUBJECT_CONFIGS),
            localforage.getItem(STORAGE_KEYS.MAIN_FILE_NAME),
            localforage.getItem(STORAGE_KEYS.COMPARE_FILE_NAME),
            localforage.getItem(STORAGE_KEYS.ITEM_ANALYSIS_DATA),
            localforage.getItem(STORAGE_KEYS.ITEM_ANALYSIS_CONFIG),
            localforage.getItem('G_ItemAnalysisFileName')
        ]);

        return {
            studentsData: storedData,
            compareData: storedCompareData,
            configs: storedConfigs,
            mainFile: storedMainFile,
            compareFile: storedCompareFile,
            itemData: storedItemData,
            itemConfig: storedItemConfig,
            itemFile: storedItemFile
        };
    } catch (err) {
        console.error("❌ IndexedDB 读取失败:", err);
        throw err;
    }
}

/**
 * 保存数据到 IndexedDB
 */
export async function saveDataToStorage(key, data) {
    try {
        await localforage.setItem(key, data);
        // 验证保存
        const check = await localforage.getItem(key);
        if (!check) {
            throw new Error("数据写入验证失败");
        }
        return true;
    } catch (err) {
        console.warn("直接保存失败，尝试转换为 JSON 字符串保存...", err);
        // 降级方案：转字符串存
        await localforage.setItem(key, JSON.stringify(data));
        return true;
    }
}

/**
 * 清除所有数据
 */
export async function clearAllStorage() {
    const keysToRemove = [
        STORAGE_KEYS.STUDENTS_DATA,
        STORAGE_KEYS.COMPARE_DATA,
        STORAGE_KEYS.MAIN_FILE_NAME,
        STORAGE_KEYS.COMPARE_FILE_NAME,
        STORAGE_KEYS.SUBJECT_CONFIGS,
        STORAGE_KEYS.ITEM_ANALYSIS_DATA,
        STORAGE_KEYS.ITEM_ANALYSIS_CONFIG,
        'G_ItemAnalysisFileName'
    ];

    await Promise.all(keysToRemove.map(key => localforage.removeItem(key)));
}

