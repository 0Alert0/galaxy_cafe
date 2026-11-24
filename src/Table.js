// src/Table.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { STORE_SETTINGS, STAFF_MEMBERS } from './posConfig';
import './Table.css';
import MikoLogo from './Miko.PNG';

// 放在 Table.js 頂部（import 下方）
const ALL_TABLES = [
    'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7',
    'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'B10', 'B11', 'B12',
    'C1', 'C2', 'C3', 'C4', 'C5'
];

const ROUND_CN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
function formatRoundLabel(num) {
    return num >= 1 && num <= 10 ? `第${ROUND_CN[num]}次訂單` : `第${num}次訂單`;
}
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
    const [selectedStaff, setSelectedStaff] = useState(STAFF_MEMBERS[0]?.name || '');
    const [staffPin, setStaffPin] = useState('');
    const [clockedInStaff, setClockedInStaff] = useState(() => {
        return JSON.parse(localStorage.getItem('clockedInStaff') || '[]');
    });

    const [unpaidTables, setUnpaidTables] = useState([]);
    const [takeoutCount, setTakeoutCount] = useState(0);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalUser, setModalUser] = useState('');
    const [modalPass, setModalPass] = useState('');
    const [modalError, setModalError] = useState('');
    const [expenseModalVisible, setExpenseModalVisible] = useState(false);
    const [expenseItemName, setExpenseItemName] = useState('');
    const [expenseAmount, setExpenseAmount] = useState('');
    const [summaryModalVisible, setSummaryModalVisible] = useState(false);
    const [summaryData, setSummaryData] = useState({
        items: [],
        cashSum: 0,
        lineSum: 0,
        expenseSum: 0,
        records: [],
    });
    const [todayReservations, setTodayReservations] = useState(0);
    const [todayRsvs, setTodayRsvs] = useState([]);
    const [dueSoonTables, setDueSoonTables] = useState(new Set());
    const [quickPayTableId, setQuickPayTableId] = useState(null);
    const [showSplit, setShowSplit] = useState(false);
    const [splitQtys, setSplitQtys] = useState({});

    // ─── 換桌相關 State ────────────────────────────────────────────
    const [showMove, setShowMove] = useState(false);
    const [targetTable, setTargetTable] = useState('');

    // 取得目前可換入的空桌清單
    const availableTables = ALL_TABLES.filter(t => !unpaidTables.includes(t));

    const openMoveForTable = useCallback(() => {
        const emptyTables = ALL_TABLES.filter(t => !unpaidTables.includes(t));
        if (emptyTables.length === 0) {
            return alert('目前沒有空桌可以更換！');
        }
        setShowSplit(false); // 若原本有開分開付則先收合
        setTargetTable(emptyTables[0]);
        setShowMove(true);
    }, [unpaidTables]);

    const confirmMoveTable = useCallback((fromTableId) => {
        if (!targetTable) return alert('請選擇目標桌號');

        // 防呆：若目標桌位 30 分鐘內有訂位，先提醒店員
        if (dueSoonTables.has(targetTable)) {
            const ok = window.confirm(`提醒：${targetTable} 桌在 30 分鐘內有訂位，確定要換過去嗎？`);
            if (!ok) return;
        }

        // 1. 更新 localStorage 的 unpaidOrders
        const allOrders = JSON.parse(localStorage.getItem('unpaidOrders') || '[]');
        const updatedOrders = allOrders.map(o =>
            o.tableId === fromTableId ? { ...o, tableId: targetTable } : o
        );
        localStorage.setItem('unpaidOrders', JSON.stringify(updatedOrders));

        // 2. 更新畫面上的未付款紅底狀態
        setUnpaidTables(updatedOrders.map(o => o.tableId));

        // 3. 同步更新今日已帶位 (Seated) 的訂位桌號（若有）
        const today = getTaiwanDateYYYYMMDD();
        const allRsvs = JSON.parse(localStorage.getItem('reservations') || '[]');
        const updatedRsvs = allRsvs.map(r =>
            r.date === today && r.status === 'Seated' && r.tableId === fromTableId
                ? { ...r, tableId: targetTable }
                : r
        );
        localStorage.setItem('reservations', JSON.stringify(updatedRsvs));

        // 4. 重置並關閉彈窗
        setShowMove(false);
        setQuickPayTableId(null);
        alert(`已將 ${fromTableId} 換至 ${targetTable}`);
    }, [targetTable, dueSoonTables]);

    // ─── Init (sales total, IP, unpaid tables) ─────────────────────
    useEffect(() => {
        const report = JSON.parse(localStorage.getItem('dailyreport') ?? '[]');
        const sum = report
            .filter(r => r.method === 'Cash' || r.method === 'LinePay')
            .reduce((acc, r) => acc + (r.total ?? 0), 0);
        setDailyTotal(sum);

        fetch('https://api.ipify.org?format=json')
            .then(r => r.json())
            .then(({ ip }) => setPublicIp(ip))
            .catch(() => setPublicIp(null));

        const unpaid = JSON.parse(localStorage.getItem('unpaidOrders') ?? '[]').map(o => o.tableId);
        setUnpaidTables(unpaid);

        const takeouts = JSON.parse(localStorage.getItem('takeoutOrders') ?? '[]');
        setTakeoutCount(takeouts.length);

        const load = () => {
            const all = JSON.parse(localStorage.getItem('reservations') || '[]');
            const t = getTaiwanDateYYYYMMDD();
            const list = all
                .filter(r => r.date === t && r.status === 'Booked')
                .sort((a, b) => a.time.localeCompare(b.time));
            setTodayRsvs(list);
            setTodayReservations(list.length);
        };
        load();

        const onStorage = (e) => { if (e.key === 'reservations') load(); };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

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

        computeDueSoon();
        const t = setInterval(computeDueSoon, 60 * 1000);
        return () => clearInterval(t);
    }, []);

    const getUnpaidOrderByTableId = useCallback((tableId) => {
        const all = JSON.parse(localStorage.getItem('unpaidOrders') || '[]');
        const index = all.findIndex(o => o.tableId === tableId);
        const order = index >= 0 ? all[index] : null;
        return { all, index, order };
    }, []);

    const checkoutForTable = useCallback((tableId) => {
        const { index } = getUnpaidOrderByTableId(tableId);
        if (index < 0) return;
        setQuickPayTableId(null);
        navigate(`/orderdetail/${index}`, { state: { source: 'unpaid' } });
    }, [getUnpaidOrderByTableId, navigate]);

    const modifyOrderForTable = useCallback((tableId) => {
        const { order } = getUnpaidOrderByTableId(tableId);
        if (!order) return;
        localStorage.setItem('cart', JSON.stringify(order.items));
        setQuickPayTableId(null);
        navigate(`/tablePage/${order.tableId}`);
    }, [getUnpaidOrderByTableId, navigate]);

    const openSplitForTable = useCallback((tableId) => {
        const { order } = getUnpaidOrderByTableId(tableId);
        if (!order) return;
        const zeroed = {};
        order.items.forEach(it => { zeroed[it.id] = 0; });
        setSplitQtys(zeroed);
        setShowSplit(true);
    }, [getUnpaidOrderByTableId]);

    const changeSplitQty = useCallback((tableId, itemId, v) => {
        const { order } = getUnpaidOrderByTableId(tableId);
        const max = order?.items.find(it => it.id === itemId)?.qty ?? 0;
        const val = Math.max(0, Math.min(Number(v) || 0, max));
        setSplitQtys(q => ({ ...q, [itemId]: val }));
    }, [getUnpaidOrderByTableId]);

    const confirmSplitForTable = useCallback((tableId) => {
        const { index, order } = getUnpaidOrderByTableId(tableId);
        if (!order) return;

        const splitItems = [];
        order.items.forEach(it => {
            const s = parseInt(splitQtys[it.id], 10) || 0;
            if (s > 0) splitItems.push({ ...it, qty: s });
        });

        if (splitItems.length === 0) {
            alert('至少選擇一項');
            return;
        }

        setShowSplit(false);
        setQuickPayTableId(null);

        navigate(`/orderdetail/${index}`, {
            state: {
                source: 'unpaid',
                splitItems,
                guests: order.guests,
                tableId: order.tableId,
            },
        });
    }, [getUnpaidOrderByTableId, splitQtys, navigate]);

    const isUnpaid = useCallback(id => unpaidTables.includes(id), [unpaidTables]);
    const goTo = useCallback(path => () => navigate(path), [navigate]);
    const handleClick = useCallback((id) => {
        if (unpaidTables.includes(id)) {
            setQuickPayTableId(id);
            setShowMove(false);
            setShowSplit(false);
        } else {
            navigate(`/tablePage/${id}`);
        }
    }, [navigate, unpaidTables]);

    // ─── 上班打卡 ─────────────────────────────────────────────────
    const tryClockIn = useCallback(() => {
        const staffObj = STAFF_MEMBERS.find(s => s.name === selectedStaff);
        if (!staffObj || staffObj.pin !== staffPin) {
            return alert('密碼錯誤 (請輸入正確的6位數PIN碼)');
        }
        if (!publicIp) {
            return alert('無法驗證網路，請稍後再試。');
        }
        if (publicIp !== STORE_SETTINGS.allowedPublicIp) {
            return alert(`打卡僅限店內網路 (你的IP: ${publicIp})`);
        }

        const existing = clockedInStaff.find(s => s.name === selectedStaff);
        if (existing && existing.clockIn) {
            return alert(`${selectedStaff} 今天已經打過上班卡了！`);
        }

        const now = getTaiwanTimestamp();
        const filtered = clockedInStaff.filter(s => s.name !== selectedStaff);
        const updatedList = [...filtered, { name: selectedStaff, clockIn: now, clockOut: '' }];

        setClockedInStaff(updatedList);
        localStorage.setItem('clockedInStaff', JSON.stringify(updatedList));
        setStaffPin('');
        alert(`${selectedStaff} 上班打卡成功！`);
    }, [selectedStaff, staffPin, publicIp, clockedInStaff]);

    // ─── 下班打卡 ─────────────────────────────────────────────────
    const tryClockOut = useCallback(() => {
        const staffObj = STAFF_MEMBERS.find(s => s.name === selectedStaff);
        if (!staffObj || staffObj.pin !== staffPin) {
            return alert('密碼錯誤 (請輸入正確的6位數PIN碼)');
        }

        const existing = clockedInStaff.find(s => s.name === selectedStaff);
        if (!existing || !existing.clockIn) {
            return alert(`${selectedStaff} 還沒打過上班卡，無法下班打卡！`);
        }
        if (existing.clockOut) {
            return alert(`${selectedStaff} 今天已經打過下班卡了！`);
        }

        const now = getTaiwanTimestamp();
        const updatedList = clockedInStaff.map(s =>
            s.name === selectedStaff ? { ...s, clockOut: now } : s
        );

        setClockedInStaff(updatedList);
        localStorage.setItem('clockedInStaff', JSON.stringify(updatedList));
        setStaffPin('');
        alert(`${selectedStaff} 下班打卡成功！`);
    }, [selectedStaff, staffPin, clockedInStaff]);

    const renderBtn = (id, shapeClass = 'shape square light') => (
        <button
            key={id}
            className={`${shapeClass}${isUnpaid(id) ? ' unpaid' : ''}${dueSoonTables.has(id) ? ' due-soon' : ''}`}
            onClick={() => handleClick(id)}
        >
            {id}
        </button>
    );

    const showDailySummary = useCallback(() => {
        const report = JSON.parse(localStorage.getItem('dailyreport') || '[]');
        if (report.length === 0) {
            return alert('今日日報尚無紀錄。');
        }

        const itemTotals = {};
        let cashSum = 0;
        let lineSum = 0;
        let expenseSum = 0;

        report.forEach(r => {
            if (r.method === 'Expense' || r.total < 0) {
                expenseSum += Math.abs(Number(r.total) || 0);
            } else {
                if (r.method === 'Cash') cashSum += Number(r.total) || 0;
                else if (r.method === 'LinePay') lineSum += Number(r.total) || 0;

                (r.items || []).forEach(i => {
                    itemTotals[i.name] = (itemTotals[i.name] || 0) + Number(i.qty);
                });
            }
        });

        setSummaryData({
            items: Object.entries(itemTotals),
            cashSum,
            lineSum,
            expenseSum,
            records: report,
        });
        setSummaryModalVisible(true);
    }, []);

    const exportDailyReportCSV = useCallback(() => {
        const report = JSON.parse(localStorage.getItem('dailyreport') || '[]');
        const staffList = JSON.parse(localStorage.getItem('clockedInStaff') || '[]');

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

        const BOM = "\uFEFF";
        let csv = BOM;

        csv += '打卡人員紀錄 (姓名, 上班時間, 下班時間)\n';
        if (staffList.length > 0) {
            staffList.forEach(s => {
                csv += `"${s.name}","${s.clockIn || ''}","${s.clockOut || '未打下班卡'}"\n`;
            });
        } else {
            csv += '無打卡紀錄\n';
        }
        csv += '\n';

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

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const firstOrderDate = report.length > 0
            ? report[0].timestamp.split(' ')[0]
            : getTaiwanDateYYYYMMDD();
        a.download = `${firstOrderDate}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        setModalVisible(false);

        localStorage.removeItem('dailyreport');
        localStorage.removeItem('clockedInStaff');
        localStorage.removeItem('takeoutOrders');
        sessionStorage.clear();

        setDailyTotal(0);
        setClockedInStaff([]);
        setTakeoutCount(0);
    }, []);

    const onEndOfDayClick = () => {
        // 1. 檢查是否有未付款內用桌
        if (unpaidTables.length > 0) {
            return alert(`尚有未付款桌號（${unpaidTables.join(', ')}），請完成結帳後再進行結單！`);
        }

        // 2. （可選）檢查是否有未付款外帶單
        const takeouts = JSON.parse(localStorage.getItem('takeoutOrders') || '[]');
        const hasUnpaidTakeout = takeouts.some(o => !o.paid);
        if (hasUnpaidTakeout) {
            return alert('尚有外帶訂單尚未付款，請完成結帳後再進行結單！');
        }

        // 全部付清才開啟管理員結單彈窗
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

        const now = getTaiwanTimestamp();
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
                                    <span className="rsv-table-name">{r.tableId || '未指定'}</span>
                                </div>
                                {/* 新增：訂位姓名與人數 */}
                                <div className="rsv-guest-info">
                                    <span className="rsv-name">{r.name}</span>
                                    <span className="rsv-party-size">({r.partySize}人)</span>
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
                        <div className="a-bottom-left">
                            {renderBtn('A6', 'shape hrectangle light')}
                            {renderBtn('A7', 'shape hrectangle light')}
                        </div>
                        <div className="a-bottom-right">
                            {renderBtn('A3', 'shape hrectangle light')}
                            {renderBtn('A4', 'shape hrectangle light')}
                            {renderBtn('A5', 'shape hrectangle light')}
                        </div>
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

                {/* 員工打卡機 Panel */}
                <div className="clockin-panel">
                    <div className="clockin-title">員工打卡機</div>
                    {/*<div className="clockin-alert-text">下班打卡</div>*/}


                    {clockedInStaff.length > 0 && (
                        <div className="clockin-status-list">
                            {clockedInStaff.map(s => (
                                <div key={s.name}>
                                    <b>{s.name}</b>: 上({s.clockIn ? s.clockIn.slice(11, 16) : '-'}) 下({s.clockOut ? s.clockOut.slice(11, 16) : '未下班'})
                                </div>
                            ))}
                        </div>
                    )}

                    <form
                        onSubmit={e => { e.preventDefault(); }}
                        className="clockin-form"
                    >
                        <select
                            value={selectedStaff}
                            onChange={e => setSelectedStaff(e.target.value)}
                            className="clockin-select"
                        >
                            {STAFF_MEMBERS.map(s => (
                                <option key={s.name} value={s.name}>{s.name}</option>
                            ))}
                        </select>

                        <input
                            type="password"
                            maxLength="6"
                            placeholder="輸入6位數PIN"
                            value={staffPin}
                            onChange={e => setStaffPin(e.target.value)}
                            className="clockin-input"
                        />

                        <div className="clockin-actions">
                            <button
                                type="button"
                                onClick={tryClockIn}
                                className="clockin-btn-in"
                            >
                                上班
                            </button>
                            <button
                                type="button"
                                onClick={tryClockOut}
                                className="clockin-btn-out"
                            >
                                下班
                            </button>
                        </div>



                    </form>
                </div>

                <button
                    className="expense-button"
                    onClick={openExpenseModal}
                >
                    支出
                </button>

                <button
                    className="show-summary-button"
                    onClick={showDailySummary}
                >
                    今日日報
                </button>
                <button
                    className="export-csv-button"
                    onClick={onEndOfDayClick}
                >
                    結單
                </button>
                <button
                    className="analysis"
                    onClick={goReports}
                >
                    月報
                </button>

                <img src={MikoLogo} alt="Miko Logo" className="miko-logo" />
            </aside>

            {quickPayTableId && (() => {
                const { order } = getUnpaidOrderByTableId(quickPayTableId);
                if (!order) return null;

                const items = Array.isArray(order.items) ? order.items : [];
                const total = items.reduce(
                    (s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0),
                    0
                );

                return (
                    <div className="modal-overlay" onClick={() => { setQuickPayTableId(null); setShowSplit(false); setShowMove(false); }}>
                        <div className="quickpay-card" onClick={(e) => e.stopPropagation()}>
                            <div className="quickpay-header">
                                <h3>{quickPayTableId}</h3>
                                <button
                                    className="qp-close"
                                    onClick={() => { setQuickPayTableId(null); setShowSplit(false);; setShowMove(false); }}
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="quickpay-body">
                                {(() => {
                                    const rounds =
                                        Array.isArray(order.rounds) && order.rounds.length > 0
                                            ? order.rounds
                                            : [{ round: 1, items }];

                                    return (
                                        <div className="qp-rounds-container">
                                            {rounds.map((r, rIdx) => (
                                                <div key={r.round ?? rIdx} className="qp-round-group">
                                                    <div className="qp-round-title">
                                                        {formatRoundLabel(r.round || rIdx + 1)}
                                                    </div>
                                                    <ul className="qp-items">
                                                        {(r.items || []).map(it => {
                                                            const q = Number(it.qty) || 0;
                                                            return (
                                                                <li key={`${r.round}-${it.id}`} className="qp-item">
                                                                    <div className="qp-item-name">{it.name}</div>
                                                                    <div className="qp-item-meta">x{q}</div>
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}

                                <div className="qp-row qp-total"><strong>總共金額：</strong>${total}</div>
                            </div>

                            <div className="quickpay-actions">
                                <button className="qp-pay" onClick={() => checkoutForTable(quickPayTableId)}>付款</button>
                                <button className="qp-edit" onClick={() => modifyOrderForTable(quickPayTableId)}>更改訂單</button>
                                <button className="qp-split" onClick={() => { setShowMove(false); openSplitForTable(quickPayTableId); }}>分開付</button>
                                <button className="qp-move" onClick={openMoveForTable}>換桌</button>
                            </div>

                            {showMove && (
                                <div className="split-area">
                                    <h4>更換桌位（{quickPayTableId} → 選擇空桌）</h4>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', margin: '0.75rem 0' }}>
                                        <select
                                            className="clockin-select"
                                            style={{ fontSize: '1.1rem', padding: '0.5rem' }}
                                            value={targetTable}
                                            onChange={(e) => setTargetTable(e.target.value)}
                                        >
                                            {availableTables.map(t => (
                                                <option key={t} value={t}>
                                                    {t}{dueSoonTables.has(t) ? ' (即將有訂位)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="modal-actions">
                                        <button onClick={() => setShowMove(false)}>取消</button>
                                        <button onClick={() => confirmMoveTable(quickPayTableId)}>確認換桌</button>
                                    </div>
                                </div>
                            )}

                            {showSplit && (
                                <div className="split-area">
                                    <h4>分開付</h4>
                                    <ul className="split-list">
                                        {items.map(it => (
                                            <li key={it.id}>
                                                <span>{it.name}（最多{it.qty}）</span>
                                                <div className="split-qty-group">
                                                    <button
                                                        className="split-btn minus"
                                                        onClick={() => changeSplitQty(quickPayTableId, it.id, (splitQtys[it.id] || 0) - 1)}
                                                        disabled={(splitQtys[it.id] || 0) <= 0}
                                                    >–</button>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={it.qty}
                                                        value={splitQtys[it.id] ?? 0}
                                                        onChange={e => changeSplitQty(quickPayTableId, it.id, Number(e.target.value))}
                                                    />
                                                    <button
                                                        className="split-btn plus"
                                                        onClick={() => changeSplitQty(quickPayTableId, it.id, (splitQtys[it.id] || 0) + 1)}
                                                        disabled={(splitQtys[it.id] || 0) >= it.qty}
                                                    >＋</button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="modal-actions">
                                        <button onClick={() => setShowSplit(false)}>取消</button>
                                        <button onClick={() => confirmSplitForTable(quickPayTableId)}>確認分開付</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}

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

            {summaryModalVisible && (
                <div className="modal-overlay" onClick={() => setSummaryModalVisible(false)}>
                    <div className="summary-modal" onClick={e => e.stopPropagation()}>
                        <div className="summary-modal-header">
                            <h2>今日日報</h2>
                            <button className="qp-close" onClick={() => setSummaryModalVisible(false)}>✕</button>
                        </div>

                        <div className="summary-totals-grid">
                            <div className="summary-stat">
                                <span>現金總額</span>
                                <strong>${summaryData.cashSum}</strong>
                            </div>
                            <div className="summary-stat">
                                <span>LinePay 總額</span>
                                <strong>${summaryData.lineSum}</strong>
                            </div>
                            <div className="summary-stat expense">
                                <span>今日支出</span>
                                <strong>-${summaryData.expenseSum}</strong>
                            </div>
                        </div>

                        <div className="summary-section">
                            <h4>項目總數量</h4>
                            <div className="summary-item-tags">
                                {summaryData.items.map(([name, qty]) => (
                                    <span key={name} className="summary-tag">
                                        {name} <b>*{qty}</b>
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="summary-section">
                            <h4>交易明細</h4>
                            <div className="summary-table-wrap">
                                <table className="summary-table">
                                    <thead>
                                        <tr>
                                            <th>桌號/時間</th>
                                            <th>品項 (itemName)</th>
                                            <th>數量 (qty)</th>
                                            <th>折扣</th>
                                            <th>寄杯卡號</th>
                                            <th>客製化金額</th>
                                            <th>實收/付款</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {summaryData.records.map((r, rIdx) => {
                                            const items = r.items || [];
                                            const isExpense = r.method === 'Expense' || r.total < 0;
                                            return items.map((it, iIdx) => (
                                                <tr key={`${rIdx}-${iIdx}`} className={isExpense ? 'is-expense' : ''}>
                                                    <td>
                                                        {iIdx === 0 ? (
                                                            <>
                                                                <div><b>{isExpense ? '支出' : (r.tableId || '-')}</b></div>
                                                                <small>{r.timestamp?.slice(11, 16) || ''}</small>
                                                            </>
                                                        ) : ''}
                                                    </td>
                                                    <td>{it.name}</td>
                                                    <td>{it.qty}</td>
                                                    <td>{iIdx === 0 && !isExpense ? `$${Number(r.discount) || 0}` : ''}</td>
                                                    <td>{iIdx === 0 && !isExpense ? (r.cardNumber || '-') : ''}</td>
                                                    <td>{iIdx === 0 && !isExpense ? `$${Number(r.customAmount) || 0}` : ''}</td>
                                                    <td>
                                                        {iIdx === 0 ? (
                                                            <>
                                                                <div><b>{r.total < 0 ? `-$${Math.abs(r.total)}` : `$${r.total}`}</b></div>
                                                                <small>{r.method}</small>
                                                            </>
                                                        ) : ''}
                                                    </td>
                                                </tr>
                                            ));
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button onClick={() => setSummaryModalVisible(false)}>關閉</button>
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
                            type="password"
                            placeholder="Password"
                            value={modalPass}
                            onChange={e => setModalPass(e.target.value)}
                        />
                        {modalError && <div className="modal-error">{modalError}</div>}
                        <div className="modal-actions">
                            <button onClick={() => setModalVisible(false)}>取消</button>
                            <button onClick={() => {
                                if (modalUser !== STORE_SETTINGS.validUser) {
                                    setModalError('使用者錯誤');
                                } else if (modalPass !== STORE_SETTINGS.validPass) {
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