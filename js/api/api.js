/* eslint-disable no-undef */
'use strict';

import { CONFIG } from '../config/config.js';

/**
 * API 客户端 - 为未来服务器连接预留
 */
class ApiClient {
    constructor() {
        this.baseURL = CONFIG.API.baseURL || '';
        this.timeout = CONFIG.API.timeout;
    }

    /**
     * 通用请求方法
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...this.getAuthHeaders(),
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, config);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    /**
     * 获取认证头
     */
    getAuthHeaders() {
        const token = localStorage.getItem('auth_token');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    /**
     * 登录
     */
    async login(username, password) {
        return this.request(CONFIG.API.endpoints.login, {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    }

    /**
     * 登出
     */
    async logout() {
        return this.request(CONFIG.API.endpoints.logout, {
            method: 'POST'
        });
    }

    /**
     * 上传数据
     */
    async uploadData(data) {
        return this.request(CONFIG.API.endpoints.upload, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * 保存数据
     */
    async saveData(key, data) {
        return this.request(CONFIG.API.endpoints.save, {
            method: 'POST',
            body: JSON.stringify({ key, data })
        });
    }

    /**
     * 加载数据
     */
    async loadData(key) {
        return this.request(`${CONFIG.API.endpoints.load}/${key}`, {
            method: 'GET'
        });
    }
}

// 导出单例
export const apiClient = new ApiClient();

