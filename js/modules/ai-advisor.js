// AI Advisor module (migrated from legacy script.js)
// 导出多个函数供主入口或其他模块调用。

export const AI_HISTORY_KEY = 'G_AI_History_Archive';

let currentAIController = null;
let G_AIChatHistory = [];
let G_CurrentHistoryId = null;

export function renderMarkdownWithMath(element, markdown) {
    const mathSegments = [];
    const protectedMarkdown = markdown.replace(
        /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\\ce\{[^\}]+\}|\$[^\$]+\$)/g,
        (match) => {
            const placeholder = `MATHBLOCK${mathSegments.length}END`;
            mathSegments.push(match);
            return placeholder;
        }
    );

    let html = (typeof marked !== 'undefined') ? marked.parse(protectedMarkdown) : protectedMarkdown;

    mathSegments.forEach((segment, index) => {
        html = html.replace(`MATHBLOCK${index}END`, () => segment);
    });

    element.innerHTML = html;

    if (window.renderMathInElement) {
        renderMathInElement(element, {
            delimiters: [
                { left: "$$", right: "$$", display: true },
                { left: "\\[", right: "\\]", display: true },
                { left: "$", right: "$", display: false },
                { left: "\\(", right: "\\)", display: false }
            ],
            throwOnError: false
        });
    }
}

export function saveToAIHistory(title, subTitle, existingId = null, customMainContent = null) {
    const contentDiv = document.getElementById('ai-content');
    const historyDiv = document.getElementById('ai-chat-history');

    let mainHtml = "";
    let chatHtml = "";
    if (customMainContent !== null && customMainContent !== undefined) {
        mainHtml = customMainContent;
        chatHtml = "";
    } else {
        mainHtml = contentDiv ? contentDiv.innerHTML : "";
        chatHtml = historyDiv ? historyDiv.innerHTML : "";
    }

    if (!mainHtml || mainHtml.trim().length < 5) return null;

    let history = JSON.parse(localStorage.getItem(AI_HISTORY_KEY) || "[]");
    let recordId = existingId;
    let oldRecord = null;
    let index = -1;
    if (existingId) {
        index = history.findIndex(r => r.id === existingId);
        if (index !== -1) oldRecord = history[index];
    }

    const record = {
        id: existingId || Date.now() + Math.random(),
        timestamp: new Date().toLocaleString(),
        title: title || (oldRecord ? oldRecord.title : "AI分析报告"),
        subTitle: subTitle || (oldRecord ? oldRecord.subTitle : "综合分析"),
        mainContent: mainHtml,
        chatContent: chatHtml
    };

    if (index !== -1) {
        history[index] = record;
        recordId = record.id;
    } else {
        history.unshift(record);
        recordId = record.id;
    }

    if (history.length > 200) history = history.slice(0, 200);
    localStorage.setItem(AI_HISTORY_KEY, JSON.stringify(history));

    if (document.getElementById('ai-history-list')) renderAIHistoryList();

    return recordId;
}

export function renderAIHistoryList() {
    const listContainer = document.getElementById('ai-history-list');
    const history = JSON.parse(localStorage.getItem(AI_HISTORY_KEY) || "[]");

    if (!listContainer) return;
    if (history.length === 0) {
        listContainer.innerHTML = `<p style="color: #999; text-align: center; margin-top: 40px;">暂无历史记录</p>`;
        return;
    }

    listContainer.innerHTML = history.map(item => `
        <div class="history-item" onclick="window.loadAIHistoryItem(${item.id})">
            <button class="history-delete-btn" onclick="window.deleteAIHistoryItem(event, ${item.id})">&times;</button>
            <h4>${item.title}</h4>
            <p>${item.subTitle}</p>
            <span class="history-date">${item.timestamp}</span>
        </div>
    `).join('');
}

export function loadAIHistoryItem(id) {
    const history = JSON.parse(localStorage.getItem(AI_HISTORY_KEY) || "[]");
    const item = history.find(r => r.id === id);
    if (!item) return;

    const contentDiv = document.getElementById('ai-content');
    contentDiv.innerHTML = item.mainContent || item.content || "";

    const historyDiv = document.getElementById('ai-chat-history');
    if (historyDiv) historyDiv.innerHTML = item.chatContent || "";

    G_CurrentHistoryId = item.id;
    const renderTarget = document.getElementById('ai-result-container');
    if (window.renderMathInElement) {
        renderMathInElement(renderTarget, {
            delimiters: [
                { left: "$$", right: "$$", display: true },
                { left: "\\[", right: "\\]", display: true },
                { left: "$", right: "$", display: false },
                { left: "\\(", right: "\\)", display: false }
            ],
            throwOnError: false
        });
    }

    reattachPrintHandlers();
    if (window.innerWidth < 1000) {
        const drawer = document.getElementById('ai-history-drawer');
        if (drawer) drawer.classList.remove('open');
    }
}

export function deleteAIHistoryItem(event, id) {
    event.stopPropagation();
    if (!confirm('确定删除这条记录吗？')) return;
    let history = JSON.parse(localStorage.getItem(AI_HISTORY_KEY) || "[]");
    history = history.filter(r => r.id !== id);
    localStorage.setItem(AI_HISTORY_KEY, JSON.stringify(history));
    renderAIHistoryList();
}

export function reattachPrintHandlers() {
    const printBtns = document.querySelectorAll('.ai-bubble-print-btn');
    printBtns.forEach(btn => {
        btn.onclick = function () {
            const bubble = this.parentElement;
            const userBubble = bubble.previousElementSibling;
            const userText = userBubble ? userBubble.innerText : "历史记录";

            const reasoningEl = bubble.querySelector('.ai-reasoning-content');
            const answerEl = bubble.querySelector('.ai-answer-content');

            const rText = reasoningEl ? reasoningEl.innerText : "";
            const aHtml = answerEl ? answerEl.innerHTML : "";

            printSingleChatTurn(userText, aHtml, rText);
        };
    });
}

export function printSingleChatTurn(userQuestion, aiAnswerHtml, aiReasoningText) {
    const studentSearch = document.getElementById('ai-student-search');
    const studentName = studentSearch ? studentSearch.dataset.selectedName || "学生" : "学生";
    const subjectEl = document.getElementById('ai-item-subject');
    const subject = subjectEl ? subjectEl.value || "综合" : "综合";

    let reasoningHtml = "";
    if (aiReasoningText && aiReasoningText.trim() !== "") {
        reasoningHtml = `\n            <div class="print-reasoning">\n                <h4>🧠 深度思考过程</h4>\n                <div class="reasoning-text">${aiReasoningText.replace(/\n/g, '<br>')}</div>\n            </div>\n        `;
    }

    const printHtml = `
        <html>
        <head>
            <title>深度追问记录 - ${studentName}</title>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
            <style>body{font-family:-apple-system,Segoe UI, sans-serif;padding:2cm;line-height:1.6;color:#333;} .header{border-bottom:2px solid #333;margin-bottom:30px;padding-bottom:10px;text-align:center;} .user-box{background:#e3f2fd;border:1px solid #bbdefb;padding:15px;border-radius:8px;margin-bottom:20px;color:#0d47a1;font-weight:bold;} .print-reasoning{margin:20px 0;padding:15px;background:#f9fafb;border-left:4px solid #999;} @media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}</style>
        </head>
        <body>
            <div class="header"><h2>深度追问记录</h2><p>对象：${studentName} | 科目：${subject} | 时间：${new Date().toLocaleString()}</p></div>
            <div class="user-box">${userQuestion}</div>
            <div class="ai-box">${reasoningHtml}<div class="ai-content">${aiAnswerHtml}</div></div>
        </body>
        </html>
    `;

    const win = window.open('', '_blank');
    win.document.write(printHtml);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 1000);
}

/**
 * 将当前批量结果保存到历史（对应 legacy 的 saveBatchToHistory）
 */
export function saveBatchToHistory() {
    if (!window.G_BatchResults || window.G_BatchResults.length === 0) {
        alert("当前没有可保存的生成结果！");
        return;
    }

    const btn = document.getElementById('ai-batch-save-btn');
    const originalText = btn ? btn.innerText : '保存中';
    if (btn) { btn.innerText = '⏳ 正在存档...'; btn.disabled = true; }

    const modeEl = document.getElementById('ai-mode-select');
    const modeText = modeEl ? modeEl.options[modeEl.selectedIndex].text : 'AI分析';

    let savedCount = 0;

    window.G_BatchResults.forEach(item => {
        const htmlContent = `<div class="ai-batch-saved markdown-body">${(typeof marked !== 'undefined') ? (typeof marked.parse === 'function' ? marked.parse(item.content) : marked(item.content)) : `<pre>${item.content}</pre>`}</div>`;
        saveToAIHistory(`${item.student.name} - ${modeText}`, `${item.grade} | ${item.subject} (批量)`, null, htmlContent);
        savedCount++;
    });

    setTimeout(() => {
        if (btn) btn.innerText = `✅ 已存 ${savedCount} 条`;
        if (typeof renderAIHistoryList === 'function') renderAIHistoryList();
        alert(`成功将 ${savedCount} 条分析报告保存到“历史记录”！`);
    }, 200);
}

/**
 * 兼容 legacy 的强制绑定函数（forceBatchSave）
 * 在 legacy 里用于确保按钮有 onclick 属性；这里实现为直接调用 saveBatchToHistory
 */
export function forceBatchSave(btnElement) {
    try {
        if (!window.G_BatchResults || window.G_BatchResults.length === 0) {
            alert('❌ 内存中没有数据！\n请先点击【批量生成】，等待任务完成后再存档。');
            return;
        }
        // 视觉反馈
        const originalText = btnElement ? btnElement.innerText : '';
        if (btnElement) { btnElement.innerText = '⏳ 写入中...'; btnElement.disabled = true; }

        setTimeout(() => {
            try {
                const AI_HISTORY_KEY = AI_HISTORY_KEY || 'G_AI_History_Archive';
                let history = JSON.parse(localStorage.getItem(AI_HISTORY_KEY) || '[]');
                let savedCount = 0;
                let modeText = 'AI分析';
                try { modeText = document.getElementById('ai-mode-select').selectedOptions[0].text; } catch (e) {}

                window.G_BatchResults.forEach((item) => {
                    const parseFn = (typeof marked !== 'undefined') ? (typeof marked.parse === 'function' ? marked.parse : marked) : (s => `<pre>${s}</pre>`);
                    const htmlContent = `<div class="ai-batch-saved markdown-body">${parseFn(item.content)}</div>`;
                    history.unshift({ id: Date.now() + Math.random(), timestamp: new Date().toLocaleString(), title: `${item.student.name} - ${modeText}`, subTitle: `${item.grade} | ${item.subject} (批量存档)`, mainContent: htmlContent, chatContent: '' });
                    savedCount++;
                });

                localStorage.setItem(AI_HISTORY_KEY, JSON.stringify(history));
                if (typeof renderAIHistoryList === 'function') renderAIHistoryList();
                alert(`🎉 存档成功！已将 ${savedCount} 条记录写入历史库。`);
            } catch (err) {
                console.error('保存过程出错:', err);
                alert('❌ 保存出错: ' + err.message);
            } finally {
                if (btnElement) { btnElement.innerText = originalText; btnElement.disabled = false; }
            }
        }, 100);
    } catch (e) {
        console.error(e);
        alert('保存失败');
    }
}

// Lightweight wrappers: prefer migrated implementation, otherwise fall back to legacy global functions.
/**
 * 生成 AI 提示词（迁移自 legacy script.js）
 */
export async function generateAIPrompt(studentId, studentName, mode, qCount = 3, grade = "高三", targetSubject = "", targetClass = "ALL") {
    const prompts = JSON.parse(localStorage.getItem('G_AI_Prompts')) || window.DEFAULT_PROMPTS || {};
    const activeId = localStorage.getItem('G_AI_ActivePromptId') || 'default';
    const template = prompts[activeId] || prompts['default'] || { system: '', user: '' };

    let dataContextStr = "";
    let paperContextInfo = "";

    if (targetSubject && window.G_ItemAnalysisConfig && window.G_ItemAnalysisConfig[targetSubject]) {
        const fullText = window.G_ItemAnalysisConfig[targetSubject]['_full_paper_context_'];
        if (fullText && fullText.trim() !== "") {
            paperContextInfo = `\n=== 📄 附：本次考试完整试卷内容 ===\n${fullText.substring(0, 15000)}\n============================\n\n`;
        }
    }

    if (mode === 'teaching_guide') {
        if (!window.G_ItemAnalysisData || !window.G_ItemAnalysisData[targetSubject]) {
            return { system: template.system, user: "错误：没有找到该科目的小题数据，请先导入模块13。" };
        }

        const itemData = window.G_ItemAnalysisData[targetSubject];
        const itemConfig = window.G_ItemAnalysisConfig ? (window.G_ItemAnalysisConfig[targetSubject] || {}) : {};
        let targetStudents = itemData.students;
        let scopeName = "全年段";
        if (targetClass !== 'ALL') {
            targetStudents = itemData.students.filter(s => s.class === targetClass);
            scopeName = targetClass;
        }

        dataContextStr += `【分析范围】：${scopeName} (共${targetStudents.length}人)\n`;
        dataContextStr += `【分析任务】：请分析该群体的得分率数据，找出共性薄弱点。\n\n`;
        dataContextStr += `【详细得分率数据】：\n`;
        dataContextStr += `| 题号 | 知识点 | 本次得分率 | 满分 |\n|---|---|---|---|\n`;

        const appendRates = (qList, scoreKey, statsObj) => {
            qList.forEach(qName => {
                const gradeStat = statsObj[qName];
                if (!gradeStat) return;

                const config = itemConfig[qName] || {};
                const fullScore = config.fullScore || gradeStat.maxScore;
                const content = config.content || "未标记";

                if (fullScore > 0) {
                    let total = 0, count = 0;
                    targetStudents.forEach(s => {
                        const v = s[scoreKey][qName];
                        if (typeof v === 'number') { total += v; count++; }
                    });
                    const avg = count > 0 ? total / count : 0;
                    const ratio = (avg / fullScore * 100).toFixed(1);
                    dataContextStr += `| ${qName} | ${content} | ${ratio}% | ${fullScore} |\n`;
                }
            });
        };

        appendRates(itemData.minorQuestions, 'minorScores', itemData.minorStats);
        appendRates(itemData.majorQuestions, 'majorScores', itemData.majorStats);
    } else if (mode === 'item_diagnosis') {
        if (!window.G_ItemAnalysisData || !window.G_ItemAnalysisData[targetSubject]) {
            return { system: template.system, user: "错误：没有找到该科目的小题数据。" };
        }
        const itemData = window.G_ItemAnalysisData[targetSubject];
        const itemConfig = window.G_ItemAnalysisConfig ? (window.G_ItemAnalysisConfig[targetSubject] || {}) : {};

        let studentDetails = itemData.students.find(s => String(s.id) === String(studentId));
        if (!studentDetails) studentDetails = itemData.students.find(s => s.name === studentName);
        if (!studentDetails) {
            return { system: template.system, user: `错误：未在科目【${targetSubject}】中找到该学生数据。` };
        }

        dataContextStr += `【试卷总分】：${studentDetails.totalScore}\n`;
        dataContextStr += `【小题得分详情】(题号 | 知识点 | 得分/满分 | 班级均分 | 个人得分率)：\n`;

        const processQuestions = (qList, scoreObj, statsObj) => {
            qList.forEach(qName => {
                const score = scoreObj[qName];
                const stat = statsObj[qName];
                const config = itemConfig[qName] || {};
                const fullScore = config.fullScore || stat.maxScore;
                const content = config.content || "未标记";

                if (typeof score === 'number') {
                    const ratio = (fullScore > 0) ? (score / fullScore).toFixed(2) : 0;
                    dataContextStr += `- 题${qName} | ${content} | 得${score} (满${fullScore}) | 班均${stat.avg} | 率${ratio}\n`;
                }
            });
        };

        dataContextStr += `--- 客观题 ---\n`;
        processQuestions(itemData.minorQuestions, studentDetails.minorScores, itemData.minorStats);
        dataContextStr += `--- 主观题 ---\n`;
        processQuestions(itemData.majorQuestions, studentDetails.majorScores, itemData.majorStats);
    } else {
        const multiData = (await (window.loadMultiExamData ? window.loadMultiExamData() : [])) || [];
        const filtered = multiData.filter(e => !e.isHidden);
        dataContextStr += `【历史考试数据】：\n`;
        if (filtered.length === 0) dataContextStr += `(暂无历史数据)\n`;
        else {
            filtered.forEach(exam => {
                const s = exam.students.find(st => String(st.id) === String(studentId));
                if (s) {
                    dataContextStr += `- ${exam.label}: 总分${s.totalScore} (班排${s.rank}, 年排${s.gradeRank || '-'}); `;
                    const scores = [];
                    for (let k in s.scores) scores.push(`${k}:${s.scores[k]}`);
                    dataContextStr += scores.join(', ') + "\n";
                }
            });
        }

        const currentStudent = (window.G_StudentsData || []).find(s => String(s.id) === String(studentId));
        if (currentStudent) {
            dataContextStr += `\n【本次考试详情】：\n`;
            dataContextStr += `总分: ${currentStudent.totalScore}, 班排: ${currentStudent.rank}\n`;
            dataContextStr += `各科明细 (科目: 分数 | 班排 | 年排 | T分):\n`;

            (window.G_DynamicSubjectList || []).forEach(sub => {
                const score = currentStudent.scores[sub];
                if (score !== undefined) {
                    const cr = currentStudent.classRanks ? currentStudent.classRanks[sub] : '-';
                    const gr = currentStudent.gradeRanks ? currentStudent.gradeRanks[sub] : '-';
                    const tScore = (currentStudent.tScores && currentStudent.tScores[sub]) ? currentStudent.tScores[sub] : '-';
                    dataContextStr += `- ${sub}: ${score} | ${cr} | ${gr} | T:${tScore}\n`;
                }
            });
        }

        if (mode === 'question') {
            dataContextStr += `\n【特殊指令】：请针对该生最薄弱的学科，生成 ${qCount} 道适合 ${grade} 水平的练习题。`;
        }
    }

    const fullDataContext = paperContextInfo + dataContextStr;

    let finalUserPrompt = (template.user || "").replace(/{{name}}/g, studentName)
        .replace(/{{grade}}/g, grade)
        .replace(/{{subject}}/g, targetSubject || "综合")
        .replace(/{{score}}/g, "")
        .replace(/{{rank}}/g, "")
        .replace(/{{data_context}}/g, fullDataContext);

    return { system: template.system || '', user: finalUserPrompt };
}

/**
 * runAIAnalysis - 迁移自 legacy script.js
 */
export async function runAIAnalysis(apiKey, studentId, studentName, mode, model, qCount, grade, targetSubject, targetClass) {
    const resultContainer = document.getElementById('ai-result-container');
    const loadingDiv = document.getElementById('ai-loading');
    const contentDiv = document.getElementById('ai-content');
    const chatHistoryDiv = document.getElementById('ai-chat-history');

    const inputArea = document.getElementById('ai-followup-input-area');
    const floatingStopBtn = document.getElementById('ai-floating-stop-btn');
    const sendBtn = document.getElementById('ai-send-btn');

    if (typeof marked === 'undefined') { alert("错误：marked.js 未加载！"); return; }

    resultContainer.style.display = 'block';
    if (chatHistoryDiv) chatHistoryDiv.innerHTML = '';
    if (inputArea) inputArea.style.display = 'flex';
    if (sendBtn) { sendBtn.disabled = true; sendBtn.innerText = '生成中...'; }
    if (floatingStopBtn) floatingStopBtn.style.display = 'flex';

    contentDiv.innerHTML = `
        <div id="ai-response-wrapper">
            <details id="current-reasoning-box" class="ai-reasoning-box" style="display:none;" open>
                <summary><span>🧠 深度思考过程 (点击切换)</span></summary>
                <div id="current-reasoning-text" class="ai-reasoning-content"></div>
            </details>
            <div id="current-answer-text" class="typing-cursor" style="min-height: 50px;"></div>
        </div>
    `;

    const reasoningBox = document.getElementById('current-reasoning-box');
    const reasoningTextEl = document.getElementById('current-reasoning-text');
    const answerTextEl = document.getElementById('current-answer-text');

    loadingDiv.style.display = 'block';

    G_CurrentHistoryId = null;

    if (currentAIController) currentAIController.abort();
    currentAIController = new AbortController();

    let fullReasoning = "";
    let fullContent = "";

    const handleStop = () => {
        if (currentAIController) {
            currentAIController.abort();
            currentAIController = null;

            if (floatingStopBtn) floatingStopBtn.style.display = 'none';
            if (sendBtn) { sendBtn.disabled = false; sendBtn.innerText = '发送'; }

            answerTextEl.classList.remove('typing-cursor');
            answerTextEl.innerHTML += `<br><br><em style="color: #dc3545;">(用户手动停止了生成)</em>`;

            if (fullContent && fullContent.length > 0) {
                const modeEl = document.getElementById('ai-mode-select');
                const modeText = modeEl ? modeEl.selectedOptions[0].text : "AI分析";
                let historyTitle = `${studentName} - ${modeText}`;
                if (mode === 'teaching_guide') historyTitle = `教学指导 - ${targetSubject}`;

                saveToAIHistory(historyTitle, `${grade} | ${targetSubject}`, G_CurrentHistoryId);
            }
        }
    };

    if (floatingStopBtn) floatingStopBtn.onclick = handleStop;

    try {
        const promptData = await generateAIPrompt(studentId, studentName, mode, qCount, grade, targetSubject, targetClass);
        if (promptData.user && (promptData.user.startsWith('错误：') || promptData.user.startsWith('系统错误：'))) {
            throw new Error(promptData.user);
        }

        const temp = (model === 'deepseek-reasoner') ? 0.6 : 0.7;
        G_AIChatHistory = [ { role: 'system', content: promptData.system }, { role: 'user', content: promptData.user } ];

        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({ model: model, messages: G_AIChatHistory, temperature: temp, stream: true }),
            signal: currentAIController.signal
        });

        if (!response.ok) {
            const errJson = await response.json().catch(() => ({}));
            throw new Error(errJson.error?.message || `API 请求失败: ${response.status}`);
        }

        loadingDiv.style.display = 'none';
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');

        let lastRenderTime = 0;
        const RENDER_INTERVAL = 100;

        let isUserAtBottom = true;
        const checkScroll = () => {
            const el = document.documentElement;
            isUserAtBottom = (el.scrollHeight - el.scrollTop - el.clientHeight) <= 100;
        };
        window.addEventListener('scroll', checkScroll);

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed === 'data: [DONE]') continue;
                if (trimmed.startsWith('data: ')) {
                    try {
                        const json = JSON.parse(trimmed.slice(6));
                        const delta = json.choices[0].delta;
                        if (delta.reasoning_content) {
                            if (fullReasoning === "") reasoningBox.style.display = 'block';
                            fullReasoning += delta.reasoning_content;
                            reasoningTextEl.textContent = fullReasoning;
                        }
                        if (delta.content) {
                            fullContent += delta.content;
                            const now = Date.now();
                            if (now - lastRenderTime > RENDER_INTERVAL) {
                                renderMarkdownWithMath(answerTextEl, fullContent);
                                lastRenderTime = now;
                                if (isUserAtBottom) window.scrollTo({ top: document.body.scrollHeight, behavior: 'auto' });
                            }
                        }
                    } catch (e) { }
                }
            }
        }

        window.removeEventListener('scroll', checkScroll);
        renderMarkdownWithMath(answerTextEl, fullContent);
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });

        G_AIChatHistory.push({ role: 'assistant', content: fullContent });

        const modeEl = document.getElementById('ai-mode-select');
        const modeText = modeEl ? modeEl.selectedOptions[0].text : 'AI分析';
        let historyTitle = `${studentName} - ${modeText}`;
        if (mode === 'teaching_guide') historyTitle = `教学指导 - ${targetSubject}`;

        const newId = saveToAIHistory(historyTitle, `${grade} | ${targetSubject}`, G_CurrentHistoryId);
        G_CurrentHistoryId = newId;

    } catch (err) {
        loadingDiv.style.display = 'none';
        if (err.name === 'AbortError') {
            answerTextEl.classList.remove('typing-cursor');
        } else {
            answerTextEl.innerHTML = `<div style="padding:20px;background-color:#fff5f5;border-left:5px solid #dc3545;color:#721c24;"><h3>⚠️ 出错了</h3><p>${err.message}</p></div>`;
        }
    } finally {
        answerTextEl.classList.remove('typing-cursor');
        if (floatingStopBtn) floatingStopBtn.style.display = 'none';
        if (sendBtn) { sendBtn.disabled = false; sendBtn.innerText = '发送'; }
        currentAIController = null;
    }
}

/**
 * 发送追问并处理流式返回（迁移自 legacy）
 */
export async function sendAIFollowUp() {
    const input = document.getElementById('ai-user-input');
    const chatHistoryDiv = document.getElementById('ai-chat-history');
    const apiKey = localStorage.getItem('G_DeepSeekKey');
    const model = document.getElementById('ai-model-select').value;

    const floatingStopBtn = document.getElementById('ai-floating-stop-btn');
    const sendBtn = document.getElementById('ai-send-btn');

    const userText = input.value.trim();
    if (!userText) return;

    input.value = '';
    const userBubble = document.createElement('div');
    userBubble.style.cssText = "background: #e3f2fd; padding: 10px 15px; border-radius: 15px 15px 0 15px; margin: 10px 0 10px auto; max-width: 80%; color: #333; text-align: right; align-self: flex-end; width: fit-content;";
    userBubble.innerText = userText;
    chatHistoryDiv.appendChild(userBubble);

    const aiBubble = document.createElement('div');
    aiBubble.style.cssText = "background: #f8f9fa; padding: 15px; border-radius: 0 15px 15px 15px; margin: 10px 0; border: 1px solid #eee; min-height: 40px; position: relative;";
    aiBubble.innerHTML = `\n        <button class="ai-bubble-print-btn" title="单独打印此条对话">🖨️</button>\n        <details class="ai-reasoning-box" style="display:none;" open>\n            <summary><span>🧠 深度思考过程 (追问)</span></summary>\n            <div class="ai-reasoning-content"></div>\n        </details>\n        <div class="ai-answer-content typing-cursor"></div>\n    `;
    chatHistoryDiv.appendChild(aiBubble);

    const printBtn = aiBubble.querySelector('.ai-bubble-print-btn');
    const reasoningBox = aiBubble.querySelector('details');
    const reasoningContentEl = aiBubble.querySelector('.ai-reasoning-content');
    const answerContentEl = aiBubble.querySelector('.ai-answer-content');

    printBtn.onclick = () => {
        const currentReasoning = reasoningContentEl.innerText;
        const currentAnswer = answerContentEl.innerHTML;
        printSingleChatTurn(userText, currentAnswer, currentReasoning);
    };

    if (floatingStopBtn) floatingStopBtn.style.display = 'flex';
    if (sendBtn) { sendBtn.disabled = true; sendBtn.innerText = '生成中...'; }

    G_AIChatHistory.push({ role: 'user', content: userText });

    if (currentAIController) currentAIController.abort();
    currentAIController = new AbortController();

    const handleStop = () => {
        if (currentAIController) {
            currentAIController.abort();
            currentAIController = null;
            if (floatingStopBtn) floatingStopBtn.style.display = 'none';
            if (sendBtn) { sendBtn.disabled = false; sendBtn.innerText = '发送'; }
            answerContentEl.classList.remove('typing-cursor');
            answerContentEl.innerHTML += `<br><em style="color: #dc3545;">(已停止)</em>`;
            if (G_CurrentHistoryId) saveToAIHistory(null, null, G_CurrentHistoryId);
        }
    };

    if (floatingStopBtn) floatingStopBtn.onclick = handleStop;

    let fullReasoning = "";
    let fullContent = "";

    try {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({ model: model, messages: G_AIChatHistory, temperature: 0.6, stream: true }),
            signal: currentAIController.signal
        });

        if (!response.ok) throw new Error('API 请求失败');

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('data: ')) {
                    try {
                        const json = JSON.parse(trimmed.slice(6));
                        const delta = json.choices[0].delta;
                        if (delta.reasoning_content) {
                            if (fullReasoning === "") reasoningBox.style.display = 'block';
                            fullReasoning += delta.reasoning_content;
                            reasoningContentEl.textContent = fullReasoning;
                        }
                        if (delta.content) {
                            fullContent += delta.content;
                            requestAnimationFrame(() => { renderMarkdownWithMath(answerContentEl, fullContent); });
                        }
                    } catch (e) { }
                }
            }
        }

        G_AIChatHistory.push({ role: 'assistant', content: fullContent });
        if (G_CurrentHistoryId) { saveToAIHistory(null, null, G_CurrentHistoryId); }

    } catch (err) {
        if (err.name !== 'AbortError') {
            answerContentEl.innerHTML += `<div style="color: red; margin-top:10px;">❌ 出错: ${err.message}</div>`;
        }
    } finally {
        answerContentEl.classList.remove('typing-cursor');
        if (floatingStopBtn) floatingStopBtn.style.display = 'none';
        if (sendBtn) { sendBtn.disabled = false; sendBtn.innerText = '发送'; }
        currentAIController = null;
    }
}

// 初始化 AI 模块（迁移自 legacy）
export async function initAIModule() {
    try {
        // prompt manager and history UI assumed to be implemented in DOM
        if (typeof initPromptManager === 'function') initPromptManager();
        if (typeof renderAIHistoryList === 'function') renderAIHistoryList();

        const apiKeyInput = document.getElementById('ai-api-key');
        const saveKeyBtn = document.getElementById('ai-save-key-btn');
        const analyzeBtn = document.getElementById('ai-analyze-btn');
        const searchInput = document.getElementById('ai-student-search');
        const modeSelect = document.getElementById('ai-mode-select');
        const itemSubjectWrapper = document.getElementById('ai-item-subject-wrapper');
        const itemSubjectSelect = document.getElementById('ai-item-subject');
        const itemClassWrapper = document.getElementById('ai-item-class-wrapper');
        const itemClassSelect = document.getElementById('ai-item-class');
        const studentSearchContainer = document.querySelector('.search-combobox');
        const qCountWrapper = document.getElementById('ai-q-count-wrapper');

        if (analyzeBtn && !document.getElementById('ai-batch-btn')) {
            // keep minimal batch UI binding if needed; heavy UI construction omitted here
        }

        const savedKey = localStorage.getItem('G_DeepSeekKey');
        if (savedKey && apiKeyInput) { apiKeyInput.value = savedKey; const ks = document.getElementById('ai-key-status'); if (ks) ks.style.display = 'inline'; }

        const sendFollowUpBtn = document.getElementById('ai-send-btn');
        if (sendFollowUpBtn) sendFollowUpBtn.addEventListener('click', sendAIFollowUp);

        const printReportBtn = document.getElementById('ai-print-btn');
        if (printReportBtn) printReportBtn.addEventListener('click', () => { if (typeof window.printAIReport === 'function') window.printAIReport(); });

        const printRangeBtn = document.getElementById('ai-print-range-btn');
        if (printRangeBtn) {
            printRangeBtn.addEventListener('click', () => {
                const input = prompt("请输入要打印的对话轮次 (例如 '1' 或 '1-3'):", "1");
                if (input && typeof window.printRangeReport === 'function') window.printRangeReport(input);
            });
        }

        if (saveKeyBtn && apiKeyInput) {
            saveKeyBtn.addEventListener('click', () => {
                const key = apiKeyInput.value.trim();
                if (key.startsWith('sk-')) { localStorage.setItem('G_DeepSeekKey', key); const ks = document.getElementById('ai-key-status'); if (ks) ks.style.display = 'inline'; alert('API Key 已保存！'); }
                else alert('请输入有效的 DeepSeek API Key');
            });
        }

        // simplified change handler
        if (modeSelect) {
            modeSelect.addEventListener('change', async () => {
                const val = modeSelect.value;
                if (qCountWrapper) qCountWrapper.style.display = (val === 'question') ? 'inline-flex' : 'none';
            });
        }

        const copyBtn = document.getElementById('ai-copy-btn');
        if (copyBtn) copyBtn.addEventListener('click', () => { const content = document.getElementById('ai-content').innerText; navigator.clipboard.writeText(content).then(() => alert('内容已复制')); });

        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => {
                const studentId = searchInput?.dataset?.selectedId || "";
                const studentName = searchInput?.dataset?.selectedName || "全体同学";
                const mode = document.getElementById('ai-mode-select').value;
                const model = document.getElementById('ai-model-select').value;
                const qCount = document.getElementById('ai-q-count').value;
                const grade = document.getElementById('ai-grade-select').value;
                let targetSubject = document.getElementById('ai-item-subject').value;
                if (mode !== 'item_diagnosis' && mode !== 'teaching_guide') targetSubject = "";
                const targetClass = document.getElementById('ai-item-class').value || 'ALL';
                const apiKey = localStorage.getItem('G_DeepSeekKey');

                if (!apiKey) { alert('请先设置 DeepSeek API Key'); return; }

                if (mode === 'teaching_guide' || mode === 'item_diagnosis') {
                    if (!targetSubject) { alert("请选择一个科目！"); return; }
                    if (!window.G_ItemAnalysisData) { alert("无法读取数据，请先去模块13导入！"); return; }
                    if (!window.G_ItemAnalysisData[targetSubject]) { alert(`找不到科目【${targetSubject}】的数据。`); return; }
                    if (mode === 'item_diagnosis' && !studentId) { alert('请先选择一名学生'); return; }
                } else {
                    if (!studentId) { alert('请先选择一名学生'); return; }
                }

                runAIAnalysis(apiKey, studentId, studentName, mode, model, qCount, grade, targetSubject, targetClass);
            });
        }

        if (typeof initStudentSearchLogic === 'function') initStudentSearchLogic();
    } catch (err) {
        console.error('initAIModule error', err);
    }
}

// 渲染 AI 模块的入口，供 router/main.js 注册使用
export function renderAIAdvisor(container) {
    // 如果已有迁移后的渲染函数（例如 legacy 或其他模块提供），优先调用
    if (typeof window._legacy_renderAIAdvisor === 'function') {
        try { window._legacy_renderAIAdvisor(container); return; } catch (e) { console.error(e); }
    }

    // 简单占位：如果页面上有 ai-advisor 的 DOM 容器，则显示提示
    const el = container || document.getElementById('module-ai-advisor');
    if (el) {
        el.innerHTML = `<div style="padding:20px;color:#666;">AI 模块已迁移（轻量占位）。若需完整功能，请确保 AI 模块已完全迁移。</div>`;
    }
}
/* eslint-disable no-undef */
'use strict';

import { State } from '../config/state.js';

/**
 * 模块十二：AI 智能分析顾问
 * AI 模块的 HTML 结构已经在 index.html 中定义
 * 此函数确保初始化函数被正确调用
 */
export function renderAIAdvisor(container) {
    // 将 State 中的 AI 历史与当前会话 ID 预先同步到旧全局，供 script.js 使用
    if (Array.isArray(State.aiChatHistory) && State.aiChatHistory.length > 0) {
        window.G_AIChatHistory = State.aiChatHistory;
    }
    if (State.currentHistoryId) {
        window.G_CurrentHistoryId = State.currentHistoryId;
    }

    const initOnce = () => {
        if (container.dataset.initialized) return;
        container.dataset.initialized = 'true';

        const maybePromise = window.initAIModule();
        if (maybePromise && typeof maybePromise.then === 'function') {
            maybePromise
                .then(() => {
                    // 初始化完成后，将最新的 AI 历史状态回写到 State
                    if (Array.isArray(window.G_AIChatHistory)) {
                        State.aiChatHistory = window.G_AIChatHistory;
                    }
                    if (window.G_CurrentHistoryId) {
                        State.currentHistoryId = window.G_CurrentHistoryId;
                    }
                })
                .catch(err => {
                    console.error('AI 模块初始化失败:', err);
                });
        }
    };

    // AI 模块的 HTML 已经在 index.html 中定义，这里只需要确保初始化函数被调用
    if (typeof window.initAIModule === 'function') {
        initOnce();
    } else {
        // 如果 initAIModule 还未加载，等待一下再试
        setTimeout(() => {
            if (typeof window.initAIModule === 'function') {
                initOnce();
            } else {
                console.warn('AI 模块初始化函数未找到');
            }
        }, 100);
    }
}

