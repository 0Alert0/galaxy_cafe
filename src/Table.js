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
            </aside>
        </div>
    );
}
