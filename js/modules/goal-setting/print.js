/* eslint-disable no-undef */
'use strict';

/**
 * 打印目标规划书
 * 1. 修复文件名显示 (从 IndexedDB 读取)
 * 2. 修复 NaN 问题 (正确读取 totalDeficit)
 */
export async function startGoalPrintJob(student, targetScore, targetRank, strategy) {
    // 1. [修复] 异步获取正确的文件名
    let examName = await localforage.getItem('G_MainFileName');
    if (!examName) examName = localStorage.getItem('G_MainFileName') || '本次考试';

    // 2. 排序策略数据
    const sortedDetails = [...strategy.details].sort((a, b) => b.gain - a.gain);

    // 3. [修复] 计算总缺口描述 (防止 NaN)
    // 如果 totalDeficit 未定义，则重新计算：目标 - 当前
    let gap = strategy.totalDeficit;
    if (gap === undefined || gap === null) {
        const currentTotal = (strategy.mode === 'single') ? (student.scores[strategy.subject] || 0) : student.totalScore;
        gap = targetScore - currentTotal;
    }

    const gapHtml = gap > 0.1 // 使用 0.1 容错
        ? `<span style="color:#dc3545; font-weight:bold;">还需提升 ${gap.toFixed(1)} 分</span>`
        : `<span style="color:#28a745; font-weight:bold;">当前已达成目标 (溢出 ${Math.abs(gap).toFixed(1)} 分)</span>`;

    // 4. 构建打印 HTML (保持原有样式)
    const printHtml = `
    <html>
    <head>
        <title>学业目标规划书 - ${student.name}</title>
        <style>
            body { font-family: "Segoe UI", "Microsoft YaHei", sans-serif; padding: 30px; color: #333; line-height: 1.5; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; letter-spacing: 2px; }
            .header p { margin: 5px 0 0; color: #666; font-size: 14px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #eee; }
            .info-item { display: flex; flex-direction: column; }
            .info-label { font-size: 12px; color: #666; margin-bottom: 4px; }
            .info-value { font-size: 18px; font-weight: bold; color: #333; }
            .highlight { color: #6f42c1; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th, td { border: 1px solid #999; padding: 10px; text-align: center; font-size: 14px; }
            th { background-color: #f0f0f0; font-weight: bold; color: #333; }
            tr:nth-child(even) { background-color: #fcfcfc; }
            .gain-cell { background-color: #f3e5f5; font-weight: bold; color: #6f42c1; font-size: 16px; }
            .footer-signatures { margin-top: 50px; display: flex; justify-content: space-between; page-break-inside: avoid; }
            .sign-box { width: 30%; border-top: 1px solid #333; padding-top: 10px; text-align: center; }
            .sign-label { display: block; margin-bottom: 40px; font-weight: bold; }
            .motto { text-align: center; font-style: italic; color: #666; margin-top: 40px; font-size: 14px; }
            @media print {
                @page { size: A4 portrait; margin: 1.5cm; }
                body { -webkit-print-color-adjust: exact; }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🎯 个人学业目标规划书</h1>
            <p>数据来源：${examName} | 生成时间：${new Date().toLocaleDateString()}</p>
        </div>

        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">学生姓名 / 考号</span>
                <span class="info-value">${student.name} <span style="font-size:0.8em; font-weight:normal;">(${student.id})</span></span>
            </div>
            <div class="info-item">
                <span class="info-label">当前班级</span>
                <span class="info-value">${student.class}</span>
            </div>
            <div class="info-item">
                <span class="info-label">当前总分 / 年排</span>
                <span class="info-value">${student.totalScore} 分 / ${student.gradeRank} 名</span>
            </div>
            <div class="info-item">
                <span class="info-label">🎯 目标设定</span>
                <span class="info-value highlight">${targetScore.toFixed(0)} 分 / ${targetRank === '-' ? '-' : '前 ' + targetRank} 名</span>
            </div>
        </div>

        <div style="text-align: center; margin-bottom: 20px; font-size: 16px;">
            差距分析：${gapHtml}
        </div>

        <h3>📊 智能提分策略拆解</h3>
        <table>
            <thead>
                <tr>
                    <th>学科</th>
                    <th>当前分数</th>
                    <th>目标增量 (+)</th>
                    <th>目标分数</th>
                    <th>提分策略建议</th>
                    <th>剩余空间</th>
                </tr>
            </thead>
            <tbody>
                ${sortedDetails.map(d => `
                    <tr>
                        <td style="font-weight:bold;">${d.subject}</td>
                        <td>${d.current}</td>
                        <td class="gain-cell">+${d.gain.toFixed(1)}</td>
                        <td><strong>${d.target.toFixed(1)}</strong></td>
                        <td style="text-align:left; padding-left:15px;">${d.difficultyText}</td>
                        <td style="color:#888;">${(d.room - d.gain).toFixed(1)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <p style="font-size:13px; color:#666;">* <strong>计算逻辑：</strong>系统依据各科当前分数、年级满分空间及学科难度系数，自动将总目标分合理分配至各学科。</p>

        <div class="footer-signatures">
            <div class="sign-box"><span class="sign-label">学生承诺</span>(签字)</div>
            <div class="sign-box"><span class="sign-label">家长知情</span>(签字)</div>
            <div class="sign-box"><span class="sign-label">班主任/导师</span>(签字)</div>
        </div>

        <div class="motto">"目标不是为了预测未来，而是为了指导今天的行动。"</div>

    </body>
    </html>
    `;

    const win = window.open('', '_blank');
    win.document.write(printHtml);
    win.document.close();

    setTimeout(() => {
        win.focus();
        win.print();
    }, 500);
}

/**
 * 打印规划详情单 (含来源信息)
 */
export function startDetailPrintJob(plan, actualStudent, baseTotal, actualTotal, baseName, outName) {
    const st = plan.strategy;
    const isCompare = !!actualStudent;

    // 1. 构建表格行
    const rows = st.details.map(d => {
        let compareCells = '';
        if (isCompare) {
            const act = actualStudent.scores[d.subject] || 0;
            const diff = act - d.target;
            const color = diff >= 0 ? 'green' : 'red';
            const icon = diff >= 0 ? '✅' : '❌';
            compareCells = `
                <td style="background-color:#fff8e1; font-weight:bold;">${act}</td>
                <td style="background-color:#fff8e1; color:${color};">${icon} ${diff > 0 ? '+' : ''}${diff.toFixed(1)}</td>
            `;
        }

        return `
            <tr>
                <td>${d.subject}</td>
                <td>${d.current}</td>
                <td style="font-weight:bold;">${d.target.toFixed(1)}</td>
                <td>+${d.gain.toFixed(1)}</td>
                ${compareCells}
                <td style="text-align:left; padding-left:10px;">${d.difficultyText}</td>
            </tr>
        `;
    }).join('');

    // 2. 构建总结 HTML
    let summaryHtml = `
        <div class="info-box">
            <span>基准总分: <strong>${baseTotal.toFixed(1)}</strong></span>
            <span>目标总分: <strong style="color:#6f42c1;">${st.targetScoreCalculated.toFixed(1)}</strong></span>
            <span>计划提升: <strong>+${(st.targetScoreCalculated - baseTotal).toFixed(1)}</strong></span>
        </div>
    `;

    if (isCompare) {
        const diffTotal = actualTotal - st.targetScoreCalculated;
        const statusText = diffTotal >= 0 ? '🎉 达成目标' : '⚠️ 未达成';
        const statusColor = diffTotal >= 0 ? 'green' : 'red';
        summaryHtml += `
            <div class="info-box" style="border-color: #fd7e14; background-color: #fffbf0; margin-top:10px;">
                <span>实际总分: <strong style="font-size:1.2em; color:#fd7e14;">${actualTotal}</strong></span>
                <span style="color:${statusColor}; font-weight:bold;">${statusText} (${diffTotal > 0 ? '+' : ''}${diffTotal.toFixed(1)})</span>
            </div>
        `;
    }

    // 来源信息行
    const sourceHtml = `
        <div class="source-line">
            <span>📋 规划基准：${baseName}</span>
            ${outName ? ` | <span>📈 复盘依据：${outName}</span>` : ''}
        </div>
    `;

    // 3. 完整 HTML
    const html = `
    <html>
    <head>
        <title>规划详情 - ${plan.studentName}</title>
        <style>
            body { font-family: "Segoe UI", sans-serif; padding: 2cm; color: #333; }
            h2 { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 5px; }
            .meta { text-align: center; color: #666; margin-bottom: 20px; font-size: 0.9em; }
            .source-line { text-align: center; font-size: 0.85em; color: #555; background: #eee; padding: 5px; border-radius: 4px; margin-bottom: 25px; }
            
            .info-box { 
                display: flex; justify-content: space-around; padding: 15px; 
                background: #f8f9fa; border: 1px solid #eee; border-radius: 8px; 
            }
            
            table { width: 100%; border-collapse: collapse; margin-top: 30px; }
            th, td { border: 1px solid #ccc; padding: 10px; text-align: center; font-size: 0.95em; }
            th { background-color: #f0f0f0; }
            
            @media print {
                @page { size: A4 portrait; }
                body { -webkit-print-color-adjust: exact; }
            }
        </style>
    </head>
    <body>
        <h2>🎯 个人学业规划详情单</h2>
        <div class="meta">
            学生：<strong>${plan.studentName}</strong> | 
            规划名称：${plan.name} | 
            创建时间：${plan.createDate}
        </div>

        ${sourceHtml}

        ${summaryHtml}

        <h3>📚 科目详情分解</h3>
        <table>
            <thead>
                <tr>
                    <th>科目</th><th>基准分</th><th>目标分</th><th>计划增量</th>
                    ${isCompare ? '<th>实际分</th><th>达成差值</th>' : ''}
                    <th>策略建议</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
        
        <div style="margin-top: 40px; text-align: center; color: #999; font-size: 0.8em;">
            * 报表生成时间：${new Date().toLocaleString()}
        </div>
    </body>
    </html>
    `;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 500);
}

