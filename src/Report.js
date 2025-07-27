// src/components/Report.js
import React, { useState, useEffect } from 'react';
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

    // 2) Compute total revenue (non‑Expense)
    const revenue = report
      .filter(entry => entry.method !== 'Expense')
      .reduce((sum, e) => sum + (e.total || 0), 0);
    setMonthlyRevenue(revenue);

    // 3) Compute total expense (sum of absolute values of negative totals)
    const expense = report
      .filter(entry => entry.method === 'Expense')
      .reduce((sum, e) => sum + Math.abs(e.total || 0), 0);
    setMonthlyExpense(expense);
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
