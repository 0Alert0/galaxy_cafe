// src/components/Reservations.js
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Reservations.css';

const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'));
const MINUTES_5 = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

function splitTime(t = '') {
  const [hh = '09', mm = '00'] = t.split(':');
  return { hh, mm };
}

// --- Taiwan time helpers ---
function getTaiwanDateYYYYMMDD() {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const tw = new Date(utcMs + 8 * 60 * 60000); // UTC+8
  const y = tw.getFullYear();
  const m = String(tw.getMonth() + 1).padStart(2, '0');
  const d = String(tw.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Convert Taiwan local YYYY-MM-DD + HH:mm to UTC epoch ms */
function taiwanEpochMs(dateStr, timeStr) {
  const [Y, M, D] = dateStr.split('-').map(Number);
  const [h, m] = timeStr.split(':').map(Number);
  return Date.UTC(Y, M - 1, D, (h ?? 0) - 8, m ?? 0, 0, 0);
}


/** Pretty date like 2025/08/12（二） — correct weekday */
function formatDisplayDate(dateStr) {
  const [Y, M, D] = dateStr.split('-').map(Number);
  // Use UTC midnight for that calendar date; no timezone shift.
  const d = new Date(Date.UTC(Y, M - 1, D, 0, 0, 0, 0));
  const wd = '日一二三四五六'[d.getUTCDay()];
  return `${Y}/${String(M).padStart(2, '0')}/${String(D).padStart(2, '0')}（${wd}）`;
}


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
    date: getTaiwanDateYYYYMMDD(), // default to today (Taiwan)
    time: '09:00',
    notes: '',
  });

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

  // All reservations grouped by date, each group sorted by time (Taiwan)
  const { orderedDates, byDate } = useMemo(() => {
    const sorted = [...list].sort((a, b) => {
      const ta = taiwanEpochMs(a.date, a.time);
      const tb = taiwanEpochMs(b.date, b.time);
      if (ta !== tb) return ta - tb;
      return (a.createdAt || '') > (b.createdAt || '') ? 1 : -1;
    });

    const map = {};
    sorted.forEach((r) => {
      (map[r.date] ||= []).push(r);
    });

    const dates = Object.keys(map).sort(
      (da, db) => taiwanEpochMs(da, '00:00') - taiwanEpochMs(db, '00:00')
    );

    return { orderedDates: dates, byDate: map };
  }, [list]);

  // Add a new reservation
  const addReservation = () => {
    if (!form.name.trim() || !form.date || !form.time) {
      alert('請輸入姓名、日期與時間');
      return;
    }
    if (!/^\d{10}$/.test(form.phone.trim())) {
      alert('請輸入正確的10位數字電話號碼');
      return;
    }

    // Conflict check (90 min) if table chosen
    if (form.tableId) {
      const blockMs = 90 * 60 * 1000;
      const tNew = taiwanEpochMs(form.date, form.time);
      const clash = list.some(
        (r) =>
          r.status === 'Booked' &&
          r.tableId === form.tableId &&
          r.date === form.date &&
          Math.abs(taiwanEpochMs(r.date, r.time) - tNew) < blockMs
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
      date: getTaiwanDateYYYYMMDD(),
      time: '09:00',
      notes: '',
    });
  };

  // Status helpers
  const setStatus = (id, status) => {
    const next = list.map((r) => (r.id === id ? { ...r, status } : r));
    save(next);
  };

  // 帶位：always mark Seated; if table is set, open that table; else go home
  const checkIn = (r) => {
    setStatus(r.id, 'Seated');
    if (r.tableId) {
      navigate(`/TablePage/${r.tableId}`);
    } else {
      navigate('/');
    }
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
          <button onClick={() => setShowModal(true)}>新增訂位</button>
          <button onClick={() => navigate('/')}>← 回首頁</button>
        </div>
      </header>

      {orderedDates.length ? (
        orderedDates.map((date) => (
          <section key={date} className="rsv-day">
            <h2 className="rsv-day-title">{formatDisplayDate(date)}</h2>
            <ul className="rsv-list">
              {byDate[date].map((r) => (
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
                        <button onClick={() => setStatus(r.id, 'Cancelled')}>取消</button>
                        <button onClick={() => setStatus(r.id, 'No-show')}>未到</button>
                      </>
                    ) : (
                      <span className="pill">{r.status}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      ) : (
        <p className="none">目前尚無任何訂位</p>
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
                onChange={(e) => setForm({ ...form, partySize: e.target.value })}
              />
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />

              {/* 5-minute time selectors */}
              <div className="time-5-selects" style={{ display: 'flex', gap: '0.5rem' }}>
                <select
                  value={splitTime(form.time).hh}
                  onChange={(e) => {
                    const hh = e.target.value;
                    const mm = splitTime(form.time).mm;
                    setForm({ ...form, time: `${hh}:${mm}` });
                  }}
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>

                <select
                  value={splitTime(form.time).mm}
                  onChange={(e) => {
                    const mm = e.target.value;
                    const hh = splitTime(form.time).hh;
                    setForm({ ...form, time: `${hh}:${mm}` });
                  }}
                >
                  {MINUTES_5.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

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
                  'A7',
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
