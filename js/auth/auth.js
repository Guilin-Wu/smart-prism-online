/* eslint-disable no-undef */
'use strict';

import { apiClient } from '../api/api.js';

/**
 * 认证管理模块
 * 为未来登录功能预留
 */
class AuthManager {
    constructor() {
        this.isAuthenticated = false;
        this.user = null;
        this.token = null;
    }

    /**
     * 初始化认证状态
     */
    init() {
        const token = localStorage.getItem('auth_token');
        const user = localStorage.getItem('auth_user');
        
        if (token && user) {
            this.token = token;
            this.user = JSON.parse(user);
            this.isAuthenticated = true;
        }
    }

    /**
     * 登录
     */
    async login(username, password) {
        try {
            const response = await apiClient.login(username, password);
            
            if (response.success && response.token) {
                this.token = response.token;
                this.user = response.user;
                this.isAuthenticated = true;
                
                localStorage.setItem('auth_token', this.token);
                localStorage.setItem('auth_user', JSON.stringify(this.user));
                
                return { success: true, user: this.user };
            } else {
                return { success: false, message: response.message || '登录失败' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: '网络错误，请检查服务器连接' };
        }
    }

    /**
     * 登出
     */
    async logout() {
        try {
            await apiClient.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.token = null;
            this.user = null;
            this.isAuthenticated = false;
            
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
        }
    }

    /**
     * 检查是否已登录
     */
    checkAuth() {
        return this.isAuthenticated;
    }

    /**
     * 获取当前用户
     */
    getCurrentUser() {
        return this.user;
    }
}

// 导出单例
export const authManager = new AuthManager();

