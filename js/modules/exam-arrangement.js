/* eslint-disable no-undef */
'use strict';

/**
 * 模块十五：考场座位编排 & 考号生成
 */

import { State } from '../config/state.js';

/**
 * 渲染 ExamArrangement 模块
 */
export function renderExamArrangement(container, data) {
    const studentsSource = State.studentsData || [];
    const studentCount = studentsSource.length;

    container.innerHTML = `
        <h2>🧘 模块十五：考场座位编排 & 考号生成</h2>
        
        <div class="main-card-wrapper" style="border-left: 5px solid var(--color-cyan); margin-bottom: 20px; padding-bottom: 30px;">
            <h4 style="margin-top:0; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px;">🛠️ 编排配置参数</h4>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 25px; align-items: end;">
                <div>
                    <label style="display:block; margin-bottom:8px; font-weight:600; color:#333;">1. 考生排序策略:</label>
                    <select id="exam-sort-strategy" class="sidebar-select" style="font-weight:bold; color:var(--primary-color); width:100%; padding: 10px;">
                        <option value="random">🎲 完全随机打乱</option>
                        <option value="class_balanced">⚖️ 班级均衡 (分层穿插)</option>
                        <option value="score_desc">🏆 按总分高到低</option>
                        <option value="score_asc">📉 按总分低到高</option>
                    </select>
                </div>

                <div>
                    <label style="display:block; margin-bottom:8px; font-weight:600; color:#333;">2. 单场人数:</label>
                    <input type="number" id="exam-room-capacity" class="sidebar-select" value="40" min="1" style="width:100%; padding: 10px;">
                </div>

                <div>
                    <label style="display:block; margin-bottom:8px; font-weight:600; color:#333;">3. 座位列数:</label>
                    <input type="number" id="exam-room-columns" class="sidebar-select" value="5" min="1" style="width:100%; padding: 10px;">
                </div>

                <div>
                    <label style="display:block; margin-bottom:8px; font-weight:600; color:#333;">4. 座位填充模式:</label>
                    <select id="exam-seat-pattern" class="sidebar-select" style="width:100%; padding: 10px;">
                        <option value="z_shape">➡️ 横向 Z 型</option>
                        <option value="s_shape">🐍 横向 S 型</option>
                        <option value="z_shape_v">⬇️ 竖向 Z 型</option>
                        <option value="s_shape_v">🧬 竖向 S 型</option>
                    </select>
                </div>

                <div>
                    <label style="display:block; margin-bottom:8px; font-weight:600; color:#333;">5. 考号生成:</label>
                    <select id="exam-id-mode" class="sidebar-select" style="width:100%; padding: 10px;">
                        <option value="use_existing">保持现有</option>
                        <option value="auto_generate">自动生成</option>
                    </select>
                </div>
                
                <div>
                    <label style="display:block; margin-bottom:8px; font-weight:600; color:#666;">前缀 (可选):</label>
                    <input type="text" id="exam-id-prefix" class="sidebar-select" placeholder="例: 2025H1" style="width:100%; padding: 10px;">
                </div>
            </div>
            
            <div style="margin-top: 30px; text-align: right; border-top: 1px solid #eee; padding-top: 20px;">
                <span style="color: #666; margin-right: 20px; font-size: 1.1em;">待编排学生总数: <strong style="color: var(--primary-color); font-size: 1.2em;">${studentCount}</strong> 人</span>
                <button id="exam-generate-btn" class="sidebar-button" style="background-color: var(--color-cyan); padding: 10px 25px; font-size: 1em;">⚙️ 开始编排</button>
            </div>
        </div>

        <div id="exam-result-area" style="display: none;">
            <div class="main-card-wrapper">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h3 style="margin:0;">📋 编排结果预览</h3>
                    <button id="exam-export-btn" class="sidebar-button" style="background-color: var(--color-green);">📥 导出座位表</button>
                </div>
                <div id="exam-room-tabs" style="display:flex; gap:5px; overflow-x:auto; padding-bottom:10px; margin-bottom:10px; border-bottom:1px solid #eee;"></div>
                <div id="exam-room-preview" style="min-height: 300px;"></div>
            </div>
        </div>
    `;

    let generatedRooms = [];

    // 绑定生成按钮
    document.getElementById('exam-generate-btn').addEventListener('click', () => {
        const config = {
            sort: document.getElementById('exam-sort-strategy').value,
            capacity: parseInt(document.getElementById('exam-room-capacity').value) || 30,
            cols: parseInt(document.getElementById('exam-room-columns').value) || 8,
            pattern: document.getElementById('exam-seat-pattern').value,
            idMode: document.getElementById('exam-id-mode').value,
            idPrefix: document.getElementById('exam-id-prefix').value.trim()
        };

        generatedRooms = calculateExamArrangement(studentsSource, config);
        renderExamPreview(generatedRooms, config.cols);
    });

    // 绑定导出按钮
    document.getElementById('exam-export-btn').addEventListener('click', () => {
        if (generatedRooms.length > 0) {
            alert('导出功能需要 xlsx 库支持，请使用原版 script.js 中的导出功能');
        } else {
            alert("请先生成编排方案！");
        }
    });
}

/**
 * 计算考场编排
 */
function calculateExamArrangement(students, config) {
    let sortedStudents = [];

    // 排序策略
    if (config.sort === 'class_balanced') {
        const classMap = {};
        students.forEach(s => {
            if (!classMap[s.class]) classMap[s.class] = [];
            classMap[s.class].push(s);
        });
        const queues = Object.keys(classMap).sort().map(cls => {
            return classMap[cls].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
        });
        let hasStudent = true, i = 0;
        while (hasStudent) {
            hasStudent = false;
            for (let q of queues) {
                if (i < q.length) { sortedStudents.push(q[i]); hasStudent = true; }
            }
            i++;
        }
    } else if (config.sort === 'score_desc') {
        sortedStudents = [...students].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
    } else if (config.sort === 'score_asc') {
        sortedStudents = [...students].sort((a, b) => (a.totalScore || 0) - (b.totalScore || 0));
    } else {
        sortedStudents = [...students].sort(() => Math.random() - 0.5);
    }

    // 考场切分
    const rooms = [];
    let currentIdx = 0, roomNum = 1;
    const maxRows = Math.ceil(config.capacity / config.cols);

    while (currentIdx < sortedStudents.length) {
        const endIdx = Math.min(currentIdx + config.capacity, sortedStudents.length);
        const roomStudents = sortedStudents.slice(currentIdx, endIdx).map((student, idx) => {
            const seatNo = idx + 1;
            let examId = student.id;
            if (config.idMode === 'auto_generate') {
                examId = `${config.idPrefix}${String(roomNum).padStart(2, '0')}${String(seatNo).padStart(2, '0')}`;
            }

            let row = 0, col = 0;
            switch (config.pattern) {
                case 's_shape':
                    row = Math.floor(idx / config.cols);
                    col = idx % config.cols;
                    if (row % 2 !== 0) col = config.cols - 1 - col;
                    break;
                case 'z_shape_v':
                    col = Math.floor(idx / maxRows);
                    row = idx % maxRows;
                    break;
                case 's_shape_v':
                    col = Math.floor(idx / maxRows);
                    let rem = idx % maxRows;
                    row = col % 2 === 0 ? rem : maxRows - 1 - rem;
                    break;
                default:
                    row = Math.floor(idx / config.cols);
                    col = idx % config.cols;
            }

            return { ...student, tempExamId: examId, roomNum, seatNo, gridRow: row, gridCol: col };
        });

        rooms.push({ id: roomNum, name: `第 ${roomNum} 考场`, students: roomStudents });
        currentIdx += config.capacity;
        roomNum++;
    }

    return rooms;
}

/**
 * 渲染考场预览
 */
function renderExamPreview(rooms, cols) {
    const resultArea = document.getElementById('exam-result-area');
    const tabContainer = document.getElementById('exam-room-tabs');
    const previewContainer = document.getElementById('exam-room-preview');

    resultArea.style.display = 'block';

    // 渲染标签页
    tabContainer.innerHTML = rooms.map((room, idx) => `
        <button class="room-tab ${idx === 0 ? 'active' : ''}" data-room-idx="${idx}" 
            style="padding:8px 15px; border:1px solid #ddd; border-radius:4px; cursor:pointer; 
            ${idx === 0 ? 'background:#007bff; color:white;' : 'background:white;'}">
            ${room.name} (${room.students.length}人)
        </button>
    `).join('');

    // 渲染座位图
    const renderRoom = (roomIdx) => {
        const room = rooms[roomIdx];
        const maxRow = Math.max(...room.students.map(s => s.gridRow)) + 1;

        let html = `<div style="text-align:center; margin-bottom:15px;"><strong>${room.name}</strong> - 共 ${room.students.length} 人</div>`;
        html += `<div style="display:grid; grid-template-columns:repeat(${cols}, 1fr); gap:10px; max-width:800px; margin:0 auto;">`;

        for (let r = 0; r < maxRow; r++) {
            for (let c = 0; c < cols; c++) {
                const student = room.students.find(s => s.gridRow === r && s.gridCol === c);
                if (student) {
                    html += `<div style="padding:10px; background:#e3f2fd; border:1px solid #90caf9; border-radius:4px; text-align:center;">
                        <div style="font-weight:bold;">${student.name}</div>
                        <div style="font-size:0.8em; color:#666;">${student.tempExamId}</div>
                        <div style="font-size:0.75em; color:#999;">${student.class}</div>
                    </div>`;
                } else {
                    html += `<div style="padding:10px; background:#f5f5f5; border:1px dashed #ddd; border-radius:4px;"></div>`;
                }
            }
        }
        html += '</div>';
        previewContainer.innerHTML = html;
    };

    renderRoom(0);

    // 标签页切换
    tabContainer.querySelectorAll('.room-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            tabContainer.querySelectorAll('.room-tab').forEach(b => {
                b.style.background = 'white';
                b.style.color = '#333';
            });
            btn.style.background = '#007bff';
            btn.style.color = 'white';
            renderRoom(parseInt(btn.dataset.roomIdx));
        });
    });
}

