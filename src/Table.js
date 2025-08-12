// src/components/Table.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './Table.css';
import MikoLogo from './Miko.PNG';

const VALID_USER = 'admin';
const VALID_PASS = '1234';
const ALLOWED_PUBLIC_IP = '119.15.214.56';

// ─── Taiwan time helpers ─────────────────────────────────────────
function getTaiwanDateYYYYMMDD() {
    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const tw = new Date(utcMs + 8 * 60 * 60000); // UTC+8
    const y = tw.getFullYear();
    const m = String(tw.getMonth() + 1).padStart(2, '0');
    const d = String(tw.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
function getTaiwanTimestamp() {
    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const tw = new Date(utcMs + 8 * 60 * 60000);
    const pad2 = (n) => String(n).padStart(2, '0');
    const y = tw.getFullYear();
    const m = pad2(tw.getMonth() + 1);
    const d = pad2(tw.getDate());
    const h = pad2(tw.getHours());
    const mi = pad2(tw.getMinutes());
    const s = pad2(tw.getSeconds());
    return `${y}-${m}-${d} ${h}:${mi}:${s}`;
}

function taiwanEpochMs(dateStr, timeStr) {
    const [Y, M, D] = dateStr.split('-').map(Number);
    const [h, m] = timeStr.split(':').map(Number);
    // represent TW local time as UTC by subtracting 8 hours
    return Date.UTC(Y, M - 1, D, (h ?? 0) - 8, m ?? 0, 0, 0);
}
function getTaiwanNowMs() {
    const now = new Date();
    return now.getTime() + now.getTimezoneOffset() * 60000 + 8 * 60 * 60000;
}

export default function Table() {
    const navigate = useNavigate();
    const goReports = () => navigate('/report');

    // ─── State ────────────────────────────────────────────────────
    const [dailyTotal, setDailyTotal] = useState(0);
    const [publicIp, setPublicIp] = useState(null);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [clockedInAt, setClockedInAt] = useState(() => localStorage.getItem('clockedInAt'));
    const [unpaidTables, setUnpaidTables] = useState([]);
    const [takeoutCount, setTakeoutCount] = useState(0);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalUser, setModalUser] = useState('');
    const [modalPass, setModalPass] = useState('');
    const [modalError, setModalError] = useState('');
    const [expenseModalVisible, setExpenseModalVisible] = useState(false);
    const [expenseItemName, setExpenseItemName] = useState('');
    const [expenseAmount, setExpenseAmount] = useState('');
    const [todayReservations, setTodayReservations] = useState(0);
    const [todayRsvs, setTodayRsvs] = useState([]);
    const [dueSoonTables, setDueSoonTables] = useState(new Set());

    // ─── Init (sales total, IP, unpaid tables) ─────────────────────
    useEffect(() => {
        // compute today's sales total
        const report = JSON.parse(localStorage.getItem('dailyreport') ?? '[]');
        const sum = report
            .filter(r => r.method === 'Cash' || r.method === 'LinePay')
            .reduce((acc, r) => acc + (r.total ?? 0), 0);
        setDailyTotal(sum);

        // fetch public IP
        fetch('https://api.ipify.org?format=json')
            .then(r => r.json())
            .then(({ ip }) => setPublicIp(ip))
            .catch(() => setPublicIp(null));

        // load unpaid table IDs
        const unpaid = JSON.parse(localStorage.getItem('unpaidOrders') ?? '[]').map(o => o.tableId);
        setUnpaidTables(unpaid);

        // takeouts
        const takeouts = JSON.parse(localStorage.getItem('takeoutOrders') ?? '[]');
        setTakeoutCount(takeouts.length);

        // reservations (badge)
        const rsv = JSON.parse(localStorage.getItem('reservations') || '[]');
        const today = getTaiwanDateYYYYMMDD();
        const count = rsv.filter(r => r.date === today && r.status === 'Booked').length;
        setTodayReservations(count);

        // left list
        const load = () => {
            const all = JSON.parse(localStorage.getItem('reservations') || '[]');
            const t = getTaiwanDateYYYYMMDD();
            const list = all
                .filter(r => r.date === t && r.status === 'Booked')
                .sort((a, b) => a.time.localeCompare(b.time));
            setTodayRsvs(list);
            // also refresh badge
            setTodayReservations(list.length);
        };
        load();

        // live update if other pages modify reservations
        const onStorage = (e) => { if (e.key === 'reservations') load(); };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);

    }, []);

    // 2) Recompute “due soon” tables every minute (separate effect)
    useEffect(() => {
        const computeDueSoon = () => {
            const all = JSON.parse(localStorage.getItem('reservations') || '[]');
            const today = getTaiwanDateYYYYMMDD();
            const nowMs = getTaiwanNowMs();
            const THIRTY_MIN = 30 * 60 * 1000;

            const ids = new Set();
            all
                .filter(r => r.status === 'Booked' && r.date === today && r.tableId)
                .forEach(r => {
                    const start = taiwanEpochMs(r.date, r.time);
                    const diff = start - nowMs;
                    if (diff >= 0 && diff <= THIRTY_MIN) ids.add(r.tableId);
                });

            setDueSoonTables(ids);
        };

        computeDueSoon();                       // run once immediately
        const t = setInterval(computeDueSoon, 60 * 1000);
        return () => clearInterval(t);
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
            return alert(`Clock-in only allowed from office network (your IP: ${publicIp})`);
        }
        const now = getTaiwanTimestamp();          // <<< Taiwan time
        setClockedInAt(now);
        localStorage.setItem('clockedInAt', now);
    }, [username, password, publicIp]);

    // small factory to render a table-button
    const renderBtn = (id, shapeClass = 'shape square light') => (
        <button
            key={id}
            className={`${shapeClass}${isUnpaid(id) ? ' unpaid' : ''}${dueSoonTables.has(id) ? ' due-soon' : ''}`}
            onClick={() => handleClick(id)}
        >
            {id}
        </button>
    );


    // show summary: total qty, total cash & line-pay
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
        const time = localStorage.getItem('clockedInAt') || '';
        if (report.length === 0) {
            return alert('今日日報尚無紀錄，無法下載。');
        }

        // 1) compute summary
        const itemTotals = {};
        let cashSum = 0, lineSum = 0;
        report.forEach(r => {
            r.items.forEach(i => {
                itemTotals[i.name] = (itemTotals[i.name] || 0) + Number(i.qty);
            });
            if (r.method === 'Cash') cashSum += r.total;
            else if (r.method === 'LinePay') lineSum += r.total;
        });

        let expenseSum = 0;
        report.forEach(r => {
            if (r.total < 0) expenseSum += -r.total;
        });

        // — build CSV
        const BOM = "\uFEFF";
        let csv = BOM;
        csv += '打卡時間\n';
        csv += time + "\n";
        csv += '項目,總數量\n';
        Object.entries(itemTotals).forEach(([name, qty]) => {
            csv += `"${name.replace(/"/g, '""')}",${qty}\n`;
        });
        csv += `\n現金總額,${cashSum}\n`;
        csv += `LinePay總額,${lineSum}\n`;
        csv += `今日支出,${expenseSum}\n\n`;

        const headers = ['timestamp', 'tableId', 'total', 'method', 'cardNumber', 'discount', 'customAmount', 'itemName', 'qty'];
        csv += headers.join(',') + '\n';
        const txnCols = headers.length - 2;

        report.forEach(r => {
            r.items.forEach((i, idx) => {
                const row = [];
                if (idx === 0) {
                    row.push(
                        `"${r.timestamp.replace(/"/g, '""')}"`,
                        `"${r.tableId}"`,
                        r.total,
                        `"${r.method}"`,
                        `"${(r.cardNumber || '').replace(/"/g, '""')}"`,
                        r.discount ?? '',
                        r.customAmount ?? ''
                    );
                } else {
                    for (let j = 0; j < txnCols; j++) row.push('');
                }
                row.push(`"${i.name}"`, i.qty);
                csv += row.join(',') + '\n';
            });
        });

        // — download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const firstOrderDate = report.length > 0
            ? report[0].timestamp.split(' ')[0]
            : getTaiwanDateYYYYMMDD();                 // <<< Taiwan date fallback
        a.download = `${firstOrderDate}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        setModalVisible(false);
        const monthly = localStorage.getItem('monthlyReport');

        // clear everything
        localStorage.clear();
        sessionStorage.clear();

        // put monthlyReport back
        if (monthly !== null) {
            localStorage.setItem('monthlyReport', monthly);
        }
    }, []);

    const onEndOfDayClick = () => {
        const report = JSON.parse(localStorage.getItem('dailyreport') || '[]');
        if (report.length === 0) {
            return alert('今日日報尚無紀錄，無法下載。');
        }
        setModalError('');
        setModalUser('');
        setModalPass('');
        setModalVisible(true);
    };

    const openExpenseModal = () => {
        setExpenseItemName('');
        setExpenseAmount('');
        setExpenseModalVisible(true);
    };

    const handleConfirmExpense = () => {
        const cost = Number(expenseAmount);
        if (!expenseItemName.trim() || isNaN(cost) || cost <= 0) {
            return alert('請輸入正確的項目名稱與金額');
        }

        // build a negative‐total record with Taiwan timestamp
        const now = getTaiwanTimestamp();            // <<< Taiwan time
        const entry = {
            timestamp: now,
            tableId: '',
            items: [{ id: '', name: expenseItemName, qty: 1 }],
            total: -cost,
            method: 'Expense',
            cardNumber: '',
            discount: 0,
            customAmount: 0
        };

        const daily = JSON.parse(localStorage.getItem('dailyreport') || '[]');
        daily.push(entry);
        localStorage.setItem('dailyreport', JSON.stringify(daily));

        const monthly = JSON.parse(localStorage.getItem('monthlyReport') || '[]');
        monthly.push(entry);
        localStorage.setItem('monthlyReport', JSON.stringify(monthly));

        setExpenseModalVisible(false);
        alert(`已記錄支出：${expenseItemName} –${cost}`);
    };

    return (
        <div className="table">
            {todayRsvs.length > 0 && (
                <aside className="left-rsv">
                    <h4>今日訂桌</h4>
                    <ul>
                        {todayRsvs.map(r => (
                            <li key={r.id}>
                                <div className="rsv-main">
                                    <span className="time">{r.time}</span>
                                    <span className="table">{r.tableId || '未指定'}</span>
                                </div>
                                {r.notes && r.notes.trim() !== '' && (
                                    <div className="rsv-notes">{r.notes}</div>
                                )}
                            </li>
                        ))}
                    </ul>
                </aside>
            )}

            <main className="main">
                <div className="a-top-group">
                    <button
                        className="shape square light"
                        onClick={() => handleClick('Take Out')}
                    >
                        外帶
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
                        <div className="b-bottom-group">
                            {['B10', 'B11', 'B12'].map(id => renderBtn(id))}
                        </div>
                    </div>
                </div>

                <div className="container3">
                    <div className="a-bottom-group">
                        {renderBtn('A7', 'shape vrectangle light')}
                        {renderBtn('A5', 'shape vrectangle light')}
                        {renderBtn('A6', 'shape circle light')}
                        {renderBtn('A4', 'shape vrectangle light')}
                        {renderBtn('A3', 'shape vrectangle light')}
                    </div>
                </div>
            </main>

            <aside className="right-sidebar">
                <button onClick={goTo('/unpaid')}>未付款桌號
                    {unpaidTables.length > 0 && <span className="badge">{unpaidTables.length}</span>}
                </button>

                <button onClick={goTo('/takeout')}>外帶
                    {takeoutCount > 0 && <span className="badge">{takeoutCount}</span>}
                </button>

                <button onClick={goTo('/reservations')}>訂位
                    {todayReservations > 0 && <span className="badge">{todayReservations}</span>}
                </button>

                <div className="daily-sales">今日總額: ${dailyTotal}</div>

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
                    className="expense-button"
                    onClick={openExpenseModal}
                    style={{ marginTop: '0.5rem', padding: '0.5rem 1rem' }}
                >
                    支出
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
                    onClick={onEndOfDayClick}
                    style={{ marginTop: '0.5rem', padding: '0.5rem 1rem' }}
                >
                    結單
                </button>
                <button
                    className="analysis"
                    onClick={goReports}
                    style={{ marginTop: '0.5rem', padding: '0.5rem 1rem' }}
                >
                    月報
                </button>

                <img src={MikoLogo} alt="Miko Logo" className="miko-logo" />
            </aside>

            {expenseModalVisible && (
                <div className="modal-overlay">
                    <div className="login-modal">
                        <h2>記錄支出</h2>
                        <input
                            type="text"
                            placeholder="項目名稱"
                            value={expenseItemName}
                            onChange={e => setExpenseItemName(e.target.value)}
                        />
                        <input
                            type="number"
                            placeholder="金額"
                            value={expenseAmount}
                            onChange={e => setExpenseAmount(e.target.value)}
                        />
                        <div className="modal-actions">
                            <button onClick={() => setExpenseModalVisible(false)}>取消</button>
                            <button onClick={handleConfirmExpense}>確認</button>
                        </div>
                    </div>
                </div>
            )}

            {modalVisible && (
                <div className="modal-overlay">
                    <div className="login-modal">
                        <h2>請輸入管理員認證</h2>
                        <input
                            type="text"
                            placeholder="Username"
                            value={modalUser}
                            onChange={e => setModalUser(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="Password"
                            value={modalPass}
                            onChange={e => setModalPass(e.target.value)}
                        />
                        {modalError && <div className="modal-error">{modalError}</div>}
                        <div className="modal-actions">
                            <button onClick={() => setModalVisible(false)}>取消</button>
                            <button onClick={() => {
                                if (modalUser !== VALID_USER) {
                                    setModalError('使用者錯誤');
                                } else if (modalPass !== VALID_PASS) {
                                    setModalError('密碼錯誤');
                                } else {
                                    exportDailyReportCSV();
                                }
                            }}>
                                確認下載
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
