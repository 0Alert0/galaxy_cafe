// src/components/Report.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import './Report.css';

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
/** Convert Taiwan-local YYYY-MM-DD + HH:mm to a UTC instant (ms) */
function taiwanEpochMs(dateStr, timeStr) {
  const [Y, M, D] = dateStr.split('-').map(Number);
  const [h, m] = timeStr.split(':').map(Number);
  // Represent that Taiwan local time as UTC by subtracting 8 hours.
  return Date.UTC(Y, M - 1, D, (h ?? 0) - 8, m ?? 0, 0, 0);
}

export default function Reports() {
  const navigate = useNavigate();
  const [itemData, setItemData] = useState([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [monthlyExpense, setMonthlyExpense] = useState(0);

  useEffect(() => {
    const report = JSON.parse(localStorage.getItem('monthlyReport') || '[]');

    // 1) Build chart data, skipping any Expense entries
    const totals = {};
    report
      .filter(entry => entry.method !== 'Expense')
      .forEach(entry =>
        entry.items.forEach(i => {
          totals[i.name] = (totals[i.name] || 0) + Number(i.qty);
        })
      );
    setItemData(Object.entries(totals).map(([name, qty]) => ({ name, qty })));

    // 2) Total revenue (non-Expense)
    const revenue = report
      .filter(entry => entry.method !== 'Expense')
      .reduce((sum, e) => sum + (e.total || 0), 0);
    setMonthlyRevenue(revenue);

    // 3) Total expense (abs of negative totals)
    const expense = report
      .filter(entry => entry.method === 'Expense')
      .reduce((sum, e) => sum + Math.abs(e.total || 0), 0);
    setMonthlyExpense(expense);
  }, []);

  const exportMonthlyReportCSV = useCallback(() => {
    const report = JSON.parse(localStorage.getItem('monthlyReport') || '[]');
    if (!report.length) {
      return alert('本月報表為空，無法下載。');
    }

    // 1) aggregate per-item qty
    const itemTotals = {};
    report.forEach(entry => {
      entry.items.forEach(i => {
        itemTotals[i.name] = (itemTotals[i.name] || 0) + Number(i.qty);
      });
    });

    // 2) payment sums
    let cashSum = 0, lineSum = 0, expenseSum = 0;
    report.forEach(entry => {
      if (entry.method === 'Cash') cashSum += entry.total;
      else if (entry.method === 'LinePay') lineSum += entry.total;
      else if (entry.method === 'Expense') expenseSum += Math.abs(entry.total);
    });

    // 3) build CSV
    const BOM = '\uFEFF';
    let csv = BOM;
    csv += '項目,總數量\n';
    Object.entries(itemTotals).forEach(([name, qty]) => {
      csv += `"${name.replace(/"/g, '""')}",${qty}\n`;
    });
    csv += `\n現金總額,${cashSum}\n`;
    csv += `LinePay總額,${lineSum}\n`;
    csv += `月支出,${expenseSum}\n`;

    // 4) download (filename uses Taiwan date)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monthlyreport_${getTaiwanDateYYYYMMDD()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    // ───────────────────────────────────────────────────────────────
    // Preserve future reservations (based on TAIWAN time)
    const reservations = JSON.parse(localStorage.getItem('reservations') || '[]');
    const nowMs = Date.now(); // current UTC instant
    const futureReservations = reservations.filter(r => {
      if (!r?.date || !r?.time) return false;
      const t = taiwanEpochMs(
        r.date,
        r.time.length === 5 ? r.time : String(r.time).padStart(5, '0')
      );
      return t > nowMs && r.status !== 'Cancelled';
    });

    // clear storage
    localStorage.clear();
    sessionStorage.clear();

    // restore only the future reservations
    if (futureReservations.length) {
      localStorage.setItem('reservations', JSON.stringify(futureReservations));
    }
  }, []);

  return (
    <div className="reports-container">
      <h1>Monthly Summary</h1>

      <div className="summary-bar">
        <div>
          <h2>Total Revenue</h2>
          <p className="revenue-amount">${monthlyRevenue}</p>
        </div>

        <div>
          <h2>Total Expense</h2>
          <p className="expense-amount">-${monthlyExpense}</p>
        </div>
        <div>
          <button className="download-csv" onClick={exportMonthlyReportCSV}>
            Download CSV
          </button>
        </div>
      </div>

      <div className="chart-wrapper">
        <h2>Item Quantities Sold</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={itemData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="qty" fill="#28a745" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <footer className="to-footer">
        <button className="to-back" onClick={() => navigate('/')}>
          ← 回首頁
        </button>
      </footer>
    </div>
  );
}
