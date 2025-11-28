/* eslint-disable no-undef */
'use strict';

export function startMultiTablePrintJob(title, tableHtml) {
    const html = `
        <html>
        <head>
            <title>${title}</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                    margin: 2cm;
                    color: #333;
                }
                h2 { text-align: center; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; font-size: 0.85em; }
                th, td { border: 1px solid #999; padding: 8px; text-align: center; }
                th { background-color: #f0f0f0; font-weight: bold; }
                @media print {
                    @page { size: A4 landscape; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            </style>
        </head>
        <body>
            <h2>${title}</h2>
            ${tableHtml}
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('请允许浏览器弹出打印窗口后重试。');
        return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
        printWindow.focus();
        printWindow.print();
    }, 500);
}

