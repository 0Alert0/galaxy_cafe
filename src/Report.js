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
    const [itemData, setItemData] = useState([]);
    const [monthlyRevenue, setMonthlyRevenue] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        // fetch all daily reports
        const report = JSON.parse(localStorage.getItem('monthlyReport') || '[]');

        // aggregate quantities per item
        const totals = {};
        report.forEach(entry => {
            entry.items.forEach(item => {
                totals[item.name] = (totals[item.name] || 0) + Number(item.qty);
            });
        });

        // transform into array for recharts
        const data = Object.entries(totals).map(([name, qty]) => ({ name, qty }));
        setItemData(data);

        // compute total revenue for the month
        const revenue = report.reduce((sum, entry) => sum + (entry.total || 0), 0);
        setMonthlyRevenue(revenue);
    }, []);

    return (
        <div className="reports-container">
            <h1>Monthly Summary</h1>
            <div className="summary-bar">
                <h2>Total Revenue</h2>
                <p className="revenue-amount">${monthlyRevenue}</p>
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
