// src/components/Reservations.js
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Reservations.css';

export default function ReservationsPage() {
    const navigate = useNavigate();

    // Load all reservations from localStorage
    const [list, setList] = useState(() =>
        JSON.parse(localStorage.getItem('reservations') || '[]')
    );

    // New-reservation modal + form
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({
        name: '',
        phone: '',
        partySize: 1,
        tableId: '',
        date: '',
        time: '',
        notes: '',
    });

    // Filter by date (defaults to today)
    const [filterDate, setFilterDate] = useState(
        new Date().toISOString().slice(0, 10)
    );

    // Keep in sync if another tab/page updates localStorage
    useEffect(() => {
        const onStorage = (e) => {
            if (e.key === 'reservations') {
                setList(JSON.parse(e.newValue || '[]'));
            }
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    // Save helper
    const save = (next) => {
        localStorage.setItem('reservations', JSON.stringify(next));
        setList(next);
    };

    // Computed list for the selected day
    const dayList = useMemo(
        () =>
            list
                .filter((r) => r.date === filterDate)
                .sort((a, b) => a.time.localeCompare(b.time)),
        [list, filterDate]
    );

    // Add a new reservation
    const addReservation = () => {
        if (!form.name.trim() || !form.date || !form.time) {
            alert('請輸入姓名、日期與時間');
            return;
        }

        // Conflict check (90 min block) if table chosen
        if (form.tableId) {
            const blockMs = 90 * 60 * 1000;
            const tNew = new Date(`${form.date}T${form.time}:00`).getTime();
            const clash = list.some(
                (r) =>
                    r.status === 'Booked' &&
                    r.tableId === form.tableId &&
                    r.date === form.date &&
                    Math.abs(new Date(`${r.date}T${r.time}:00`).getTime() - tNew) <
                    blockMs
            );
            if (clash) {
                alert('該桌於該時段已有訂位');
                return;
            }
        }

        const r = {
            id: 'rsv_' + Math.random().toString(36).slice(2, 9),
            name: form.name.trim(),
            phone: form.phone.trim(),
            partySize: Number(form.partySize) || 1,
            tableId: form.tableId || '',
            date: form.date,
            time: form.time,
            notes: form.notes || '',
            status: 'Booked', // Booked | Seated | Completed | No-show | Cancelled
            createdAt: new Date().toISOString(),
        };

        save([...list, r]);
        setShowModal(false);
        setForm({
            name: '',
            phone: '',
            partySize: 1,
            tableId: '',
            date: '',
            time: '',
            notes: '',
        });
    };

    // Status helpers
    const setStatus = (id, status) => {
        const next = list.map((r) => (r.id === id ? { ...r, status } : r));
        save(next);
    };

    const checkIn = (r) => {
        // Mark as seated
        setStatus(r.id, 'Seated');

        // Optional: prefill guests on TablePage
        // sessionStorage.setItem('pendingGuests', String(r.partySize));

        // Go to table (fallback A1)
        const target = r.tableId || 'A1';
        navigate(`/TablePage/${target}`);
    };

    // Manual remove with the “×” button
    const handleRemoveReservation = (id) => {
        const next = list.filter((r) => r.id !== id);
        save(next);
    };

    return (
        <div className="rsv-page">
            <header className="rsv-header">
                <h1>訂位</h1>
                <div className="rsv-controls">
                    <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                    />
                    <button onClick={() => setShowModal(true)}>新增訂位</button>
                    <button onClick={() => navigate('/')}>← 回首頁</button>
                </div>
            </header>

            {dayList.length ? (
                <ul className="rsv-list">
                    {dayList.map((r) => (
                        <li
                            key={r.id}
                            className={`rsv-card status-${r.status.toLowerCase()}`}
                            style={{ position: 'relative' }}
                        >
                            {/* small X close button */}
                            <button
                                className="rsv-close"
                                onClick={() => handleRemoveReservation(r.id)}
                                aria-label="移除訂位"
                                title="移除訂位"
                                style={{
                                    position: 'absolute',
                                    top: 8,
                                    right: 10,
                                    background: 'transparent',
                                    border: 'none',
                                    fontSize: '1.1rem',
                                    lineHeight: 1,
                                    cursor: 'pointer',
                                    color: '#999',
                                }}
                            >
                                ×
                            </button>

                            <div className="row">
                                <strong>{r.time}</strong>
                                <span>
                                    {r.name}（{r.partySize}人）
                                </span>
                            </div>
                            <div className="row sub">
                                <span>桌號: {r.tableId || '未指定'}</span>
                                <span>電話: {r.phone || '—'}</span>
                            </div>
                            {r.notes && <div className="notes">備註：{r.notes}</div>}

                            <div className="actions">
                                {r.status === 'Booked' ? (
                                    <>
                                        <button onClick={() => checkIn(r)}>帶位</button>
                                        <button onClick={() => setStatus(r.id, 'Cancelled')}>
                                            取消
                                        </button>
                                        <button onClick={() => setStatus(r.id, 'No-show')}>
                                            未到
                                        </button>
                                    </>
                                ) : (
                                    <span className="pill">{r.status}</span>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="none">本日尚無訂位</p>
            )}

            {showModal && (
                <div className="rsv-overlay">
                    <div className="rsv-modal">
                        <h2>新增訂位</h2>
                        <div className="grid">
                            <input
                                placeholder="姓名"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                            />
                            <input
                                placeholder="電話"
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            />
                            <input
                                type="number"
                                min="1"
                                placeholder="人數"
                                value={form.partySize}
                                onChange={(e) =>
                                    setForm({ ...form, partySize: e.target.value })
                                }
                            />
                            <input
                                type="date"
                                value={form.date}
                                onChange={(e) => setForm({ ...form, date: e.target.value })}
                            />
                            <input
                                type="time"
                                value={form.time}
                                onChange={(e) => setForm({ ...form, time: e.target.value })}
                            />
                            <select
                                value={form.tableId}
                                onChange={(e) => setForm({ ...form, tableId: e.target.value })}
                            >
                                <option value="">未指定桌</option>
                                {[
                                    'A1',
                                    'A2',
                                    'A3',
                                    'A4',
                                    'A5',
                                    'A6',
                                    'B1',
                                    'B2',
                                    'B3',
                                    'B4',
                                    'B5',
                                    'B6',
                                    'B7',
                                    'B8',
                                    'B9',
                                    'B10',
                                    'B11',
                                    'B12',
                                    'C1',
                                    'C2',
                                    'C3',
                                    'C4',
                                    'C5',
                                    'Take Out',
                                ].map((t) => (
                                    <option key={t} value={t}>
                                        {t}
                                    </option>
                                ))}
                            </select>
                            <input
                                placeholder="備註"
                                value={form.notes}
                                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            />
                        </div>
                        <div className="modal-actions">
                            <button onClick={() => setShowModal(false)}>取消</button>
                            <button onClick={addReservation}>確認</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
