/* eslint-disable no-undef */
'use strict';

// 全局配置
export const CONFIG = {
    // LocalForage 配置
    localforage: {
        name: 'SmartPrismDB',
        storeName: 'app_data',
        description: '存储学生成绩、小题分析及考试归档数据'
    },
    
    // 默认科目列表
    DEFAULT_SUBJECT_LIST: ['语文', '数学', '英语', '物理', '化学', '生物', '政治', '历史', '地理'],
    
    // API 配置 (为未来服务器连接预留)
    API: {
        baseURL: '', // 将在环境配置中设置
        timeout: 30000,
        endpoints: {
            login: '/api/auth/login',
            logout: '/api/auth/logout',
            upload: '/api/data/upload',
            save: '/api/data/save',
            load: '/api/data/load'
        }
    }
};

// 初始化 LocalForage
localforage.config(CONFIG.localforage);

