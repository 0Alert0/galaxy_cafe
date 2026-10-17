// src/OrderDetail.js
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import './OrderDetail.css';

// Taiwan Time Helper (UTC+8)
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

export default function OrderDetail() {
    const { orderIndex } = useParams();
    const navigate = useNavigate();
    const { state } = useLocation();

    // Determine whether we're coming from the takeout list or the unpaid list
    const source = state?.source === 'takeout' ? 'takeout' : 'unpaid';

    // If this view was reached via a "split" action, pull in the splitItems
    const splitItems = useMemo(
        () => state?.splitItems ?? [],
        [state?.splitItems]
    );

    // ─── State Hooks ───────────────────────────────────────────────
    const [order, setOrder] = useState(null);
    const [discount, setDiscount] = useState('');
    const [customAmount, setCustomAmount] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [method, setMethod] = useState('Cash');

    // ─── Load the specific order (or split subset) ─────────────────
    useEffect(() => {
        const storageKey = source === 'takeout' ? 'takeoutOrders' : 'unpaidOrders';
        const list = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
        const idx = Number(orderIndex);

        let loaded;
        if (splitItems.length > 0 && list[idx]) {
            // If splitItems were passed in state, display only the split items & their subtotal
            loaded = {
                ...list[idx],
                items: splitItems,
                total: splitItems.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.qty) || 0), 0)
            };
        } else {
            loaded = list[idx];
        }

        if (!loaded) {
            return navigate(source === 'takeout' ? '/takeout' : '/unpaid');
        }
        setOrder(loaded);
    }, [orderIndex, navigate, source, splitItems]);

    // ─── Guard for loading ─────────────────────────────────────────
    if (!order) return null;

    // ─── Destructure & compute ─────────────────────────────────────
    const { tableId, items, total } = order;
    const discountNum = Number(discount) || 0;
    const discountedTotal = Math.max(0, total - discountNum);
    const customNum = Number(customAmount);
    const finalTotal = customAmount !== "" ? customNum : discountedTotal;

    // ─── Handlers ─────────────────────────────────────────────────
    function goBack() {
        navigate(source === 'takeout' ? '/takeout' : '/unpaid');
    }

    function handleConfirmPayment() {
        const now = getTaiwanTimestamp();
        const idx = Number(orderIndex);

        const reportEntry = {
            timestamp: now,
            tableId,
            items: items.map(i => ({
                id: i.id,
                name: i.name,
                qty: Number(i.qty) || 0
            })),
            total: finalTotal,
            method,
            cardNumber,
            discount: discountNum,
            customAmount: customAmount !== "" ? customNum : 0
        };

        const dailyReport = JSON.parse(localStorage.getItem('dailyreport') || '[]');
        dailyReport.push(reportEntry);
        localStorage.setItem('dailyreport', JSON.stringify(dailyReport));

        const monthly = JSON.parse(localStorage.getItem('monthlyReport') || '[]');
        monthly.push(reportEntry);
        localStorage.setItem('monthlyReport', JSON.stringify(monthly));

        if (source === 'unpaid') {
            const unpaid = JSON.parse(localStorage.getItem('unpaidOrders') || '[]');
            const orig = unpaid[idx];

            if (orig) {
                if (splitItems.length > 0) {
                    // Subtract splitItems from the original order only upon confirmed payment
                    const remaining = orig.items
                        .map(origIt => {
                            const splitIt = splitItems.find(s => s.id === origIt.id);
                            if (!splitIt) return origIt;
                            const qtyLeft = (Number(origIt.qty) || 0) - (Number(splitIt.qty) || 0);
                            return qtyLeft > 0
                                ? { ...origIt, qty: qtyLeft }
                                : null;
                        })
                        .filter(Boolean);

                    if (remaining.length === 0) {
                        // All items on the table have now been paid
                        unpaid.splice(idx, 1);
                    } else {
                        orig.items = remaining;
                        orig.total = remaining.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);
                        unpaid[idx] = orig;
                    }
                } else {
                    // Full checkout: remove entire order
                    unpaid.splice(idx, 1);
                }
                localStorage.setItem('unpaidOrders', JSON.stringify(unpaid));
            }
            navigate('/');
        } else {
            // Mark takeout as paid
            const takeouts = JSON.parse(localStorage.getItem('takeoutOrders') || '[]');
            if (takeouts[idx]) {
                takeouts[idx].paid = true;
                localStorage.setItem('takeoutOrders', JSON.stringify(takeouts));
            }
            navigate('/');
        }
    }

    return (
        <div className="order-detail">
            <header className="od-header">
                <h1>桌號: {tableId}</h1>
            </header>

            <header className="od-header">
                <h1>支付選項</h1>
                <div className="od-methods">
                    {['Cash', 'LinePay'].map(m => (
                        <button
                            key={m}
                            className={method === m ? 'selected' : ''}
                            onClick={() => setMethod(m)}
                        >
                            {m === 'Cash' ? '現金' : 'Line Pay'}
                        </button>
                    ))}
                </div>
            </header>

            <section className="od-items">
                <h2 className="items-title">物品清單</h2>
                <ul>
                    {items.map((it, i) => (
                        <li key={i}>
                            <span className="name">{it.name}</span>
                            <span className="qty">x{it.qty}</span>
                            <span className="price">${(it.qty * it.price)}</span>
                        </li>
                    ))}
                </ul>
            </section>

            <section className="od-summary">
                <div>總金額: ${finalTotal}</div>
                <div>折扣: ${discountNum}</div>
                <div className="discount-input">
                    <label>
                        折扣:&nbsp;
                        <input
                            type="number"
                            value={discount}
                            onChange={e => setDiscount(e.target.value)}
                            placeholder=""
                            disabled={customAmount !== "" && customNum >= 0}
                        />
                    </label>
                </div>
                <div className="custom-input">
                    <label>
                        客製化:&nbsp;
                        <input
                            type="number"
                            value={customAmount}
                            onChange={e => setCustomAmount(e.target.value)}
                            placeholder=""
                        />
                    </label>
                </div>
                <div className="card-input">
                    <label>
                        寄杯卡號:&nbsp;
                        <input
                            type="text"
                            value={cardNumber}
                            onChange={e => setCardNumber(e.target.value)}
                            placeholder="輸入卡號"
                        />
                    </label>
                </div>
            </section>

            <footer className="od-footer">
                <button className="back" onClick={goBack}>
                    ← 上一頁
                </button>
                <button className="confirm" onClick={handleConfirmPayment}>
                    確認付款
                </button>
            </footer>
        </div>
    );
}