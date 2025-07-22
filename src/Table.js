// src/components/Table.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './Table.css';

const VALID_USER = 'admin';
const VALID_PASS = '1234';
const ALLOWED_PUBLIC_IP = '182.234.211.104';

export default function Table() {
    const navigate = useNavigate();

    // ─── State ────────────────────────────────────────────────────
    const [dailyTotal, setDailyTotal] = useState(0);
    const [publicIp, setPublicIp] = useState(null);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [clockedInAt, setClockedInAt] = useState(() => localStorage.getItem('clockedInAt'));
    const [unpaidTables, setUnpaidTables] = useState([]);
    const [takeoutCount, setTakeoutCount] = useState(0);

    // ─── Init (sales total, IP, unpaid tables) ─────────────────────
    useEffect(() => {
        // compute today's sales total
        const log = JSON.parse(localStorage.getItem('salesLog') ?? '[]');
        const today = new Date().toDateString();
        const sum = log
            .filter(s => new Date(s.timestamp).toDateString() === today)
            .reduce((a, s) => a + (s.total ?? 0), 0);
        setDailyTotal(sum);

        // fetch public IP
        fetch('https://api.ipify.org?format=json')
            .then(r => r.json())
            .then(({ ip }) => setPublicIp(ip))
            .catch(() => setPublicIp(null));

        // load unpaid table IDs
        const unpaid = JSON.parse(localStorage.getItem('unpaidOrders') ?? '[]')
            .map(o => o.tableId);
        setUnpaidTables(unpaid);
        const takeouts = JSON.parse(localStorage.getItem('takeoutOrders') ?? '[]');
        setTakeoutCount(takeouts.length);
    }, []);

    // ─── Helpers ──────────────────────────────────────────────────
    const isUnpaid = useCallback(id => unpaidTables.includes(id), [unpaidTables]);
    const goTo = useCallback(path => () => navigate(path), [navigate]);
    const handleClick = useCallback(id => navigate(`/TablePage/${id}`), [navigate]);
    const clearAll = useCallback(() => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
    }, []);

    const tryClockIn = useCallback(() => {
        if (username !== VALID_USER || password !== VALID_PASS) {
            return alert('Invalid credentials');
        }
        if (!publicIp) {
            return alert('Unable to verify network. Try again shortly.');
        }
        if (publicIp !== ALLOWED_PUBLIC_IP) {
            return alert(`Clock‑in only allowed from office network (your IP: ${publicIp})`);
        }
        const now = new Date().toLocaleTimeString();
        setClockedInAt(now);
        localStorage.setItem('clockedInAt', now);
    }, [username, password, publicIp]);

    // small factory to render a table-button
    const renderBtn = (id, shapeClass = 'shape square light') => (
        <button
            key={id}
            className={`${shapeClass}${isUnpaid(id) ? ' unpaid' : ''}`}
            onClick={() => handleClick(id)}
        >
            {id}
        </button>
    );

    // show summary: total qty, total cash & line‑pay
    const showDailySummary = useCallback(() => {
        const report = JSON.parse(localStorage.getItem('dailyreport') || '[]');
        if (report.length === 0) {
            return alert('今日日報尚無紀錄。');
        }

        // 1) Aggregate per-item qty
        const itemTotals = {};
        report.forEach(r => {
            r.items.forEach(i => {
                itemTotals[i.name] = (itemTotals[i.name] || 0) + Number(i.qty);
            });
        });

        // 2) Sum cash vs LinePay totals
        let cashSum = 0, lineSum = 0;
        report.forEach(r => {
            if (r.method === 'Cash') cashSum += r.total;
            else if (r.method === 'LinePay') lineSum += r.total;
        });

        // 3) Build message
        const itemsMsg = Object.entries(itemTotals)
            .map(([name, qty]) => `${name} *${qty}`)
            .join('\n');

        const msg =
            `今日日報\n\n` +
            `項目總數量:\n${itemsMsg}\n\n` +
            `現金總額: $${cashSum}\n` +
            `LinePay 總額: $${lineSum}`;

        alert(msg);
    }, []);
    const exportDailyReportCSV = useCallback(() => {
        const report = JSON.parse(localStorage.getItem('dailyreport') || '[]');
        if (report.length === 0) {
            return alert('今日日報尚無紀錄，無法下載。');
        }
        const user = window.prompt('請輸入用戶名以確認結單:');
        if (user !== VALID_USER) {
            return alert('用戶名錯誤，已取消。');
        }
        const pass = window.prompt('請輸入密碼:');
        if (pass !== VALID_PASS) {
            return alert('密碼錯誤，已取消。');
        }

        const itemTotals = {};
        let cashSum = 0, lineSum = 0;
        report.forEach(r => {
            // aggregate item qty
            r.items.forEach(i => {
                itemTotals[i.name] = (itemTotals[i.name] || 0) + Number(i.qty);
            });
            // aggregate payment totals
            if (r.method === 'Cash') cashSum += r.total;
            else if (r.method === 'LinePay') lineSum += r.total;
        });

        // 1) UTF‑8 BOM
        const BOM = "\uFEFF";
        let csvfile = BOM;

        // 2a) prepend a human‑readable “今日日報” summary block
        csvfile += '項目,總數量\n';
        Object.entries(itemTotals).forEach(([name, qty]) => {
            csvfile += `"${name.replace(/"/g, '""')}",${qty}\n`;
        });
        csvfile += `\n現金總額,${cashSum}\n`;
        csvfile += `LinePay總額,${lineSum}\n\n`;

        // 2) CSV header
        const headers = [
            'timestamp',
            'method',
            'cardNumber',
            'total',
            'itemName',
            'qty',
        ];
        csvfile += headers.join(',') + '\n';

        // 3) Rows
        report.forEach(r => {
            r.items.forEach(i => {
                const row = [
                    // wrap each text field in quotes, doubling any inner quotes
                    `"${r.timestamp}"`,
                    `"${r.method}"`,
                    `"${(r.cardNumber || '').replace(/"/g, '""')}"`,
                    r.total,
                    `"${i.name.replace(/"/g, '""')}"`,
                    i.qty
                ];
                csvfile += row.join(',') + '\n';
            });
        });

        // 4) Download
        const blob = new Blob([csvfile], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dailyreport_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
    }, []);

    return (
        <div className="table">
            <main className="main">
                <div className="a-top-group">
                    <button
                        className="shape square light"
                        onClick={() => handleClick('Take Out')}
                    >
                        Take out
                    </button>
                    {renderBtn('A1', 'shape hrectangle light')}
                    {renderBtn('A2', 'shape vrectangle light')}
                </div>

                <div className="container1">
                    <div className="c-group">
                        {['C1', 'C2', 'C3', 'C4', 'C5'].map(id => renderBtn(id, 'shape circle'))}
                    </div>
                    <div className="container2">
                        <div className="b-top-group">
                            {['B4', 'B3', 'B2', 'B1'].map(id => renderBtn(id))}
                        </div>
                        <div className="b-mid-group">
                            {['B5', 'B6', 'B7', 'B8', 'B9'].map(id => renderBtn(id))}
                        </div>
                    </div>
                </div>

                <div className="container3">
                    <div className="A5">{renderBtn('A5', 'shape vrectangle light')}</div>
                    <div className="b-bottom-group">
                        {['B10', 'B11', 'B12'].map(id => renderBtn(id))}
                    </div>
                </div>

                <div className="a-bottom-group">
                    {renderBtn('A6', 'shape circle light')}
                    {renderBtn('A4', 'shape vrectangle light')}
                    {renderBtn('A3', 'shape vrectangle light')}
                </div>
            </main>

            <aside className="right-sidebar">
                {/*<h4>Quick Views</h4>*/}
                <button onClick={goTo('/unpaid')}>未付款桌號
                    {unpaidTables.length > 0 && <span className="badge">{unpaidTables.length}</span>}
                </button>

                <button onClick={goTo('/takeout')}>外帶
                    {takeoutCount > 0 && <span className="badge">{takeoutCount}</span>}
                </button>
                {/* <button onClick={() => { }}>Reserved</button> */}

                <div className="daily-sales">
                    今日總額: ${dailyTotal}
                </div>

                {clockedInAt && (
                    <div style={{ margin: '0.5rem 0', fontWeight: 'bold' }}>
                        打卡時間: {clockedInAt}
                    </div>
                )}

                <form
                    className="clockin-form"
                    onSubmit={e => { e.preventDefault(); tryClockIn(); }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}
                >
                    <input
                        placeholder="Username"
                        value={username}
                        disabled={!!clockedInAt}
                        onChange={e => setUsername(e.target.value)}
                        autoComplete="off"
                        style={{ padding: '0.5rem' }}
                    />
                    <input
                        placeholder="Password"
                        value={password}
                        disabled={!!clockedInAt}
                        onChange={e => setPassword(e.target.value)}
                        autoComplete="off"
                        style={{ padding: '0.5rem' }}
                    />
                    <button
                        type="submit"
                        disabled={!!clockedInAt}
                        style={{
                            padding: '0.5rem',
                            background: clockedInAt ? '#ccc' : '#000',
                            color: '#fff',
                            cursor: clockedInAt ? 'not-allowed' : 'pointer'
                        }}
                    >
                        打卡
                    </button>
                </form>

                <button
                    className="clear-storage-button"
                    onClick={clearAll}
                    style={{ marginTop: '1rem', padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                >
                    Clear All Storage
                </button>

                <button
                    className="show-summary-button"
                    onClick={showDailySummary}
                    style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                >
                    今日日報
                </button>
                <button
                    className="export-csv-button"
                    onClick={exportDailyReportCSV}
                    style={{ marginTop: '0.5rem', padding: '0.5rem 1rem' }}
                >
                    結單
                </button>
            </aside>
        </div>
    );
}
