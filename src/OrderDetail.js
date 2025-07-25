// src/components/OrderDetail.js
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import './OrderDetail.css';

export default function OrderDetail() {
    const { orderIndex } = useParams();
    const navigate = useNavigate();
    const { state } = useLocation();

    // Determine whether we're coming from the takeout list or the unpaid list
    const source = state?.source === 'takeout' ? 'takeout' : 'unpaid';

    // If this view was reached via a "split" action, pull in the splitItems and original index
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
        if (splitItems.length > 0) {
            // If splitItems were passed in state, use those
            loaded = { ...list[idx], items: splitItems, total: splitItems.reduce((sum, i) => sum + (i.price * i.qty), 0) };
        } else {
            loaded = list[idx];
        }

        if (!loaded) {
            // If no order found, bounce back
            return navigate(source === 'takeout' ? '/takeout' : '/unpaid');
        }
        setOrder(loaded);
    }, [orderIndex, navigate, source, splitItems]);

    // ─── Guard for loading ─────────────────────────────────────────
    if (!order) return null;

    // ─── Destructure & compute ─────────────────────────────────────
    const { tableId, guests, items, total } = order;
    const discountNum = Number(discount) || 0;
    const discountedTotal = Math.max(0, total - discountNum);
    const customNum = Number(customAmount);
    const finalTotal = customAmount !== "" ? customNum : discountedTotal; // else use the computed discounted price

    // ─── Handlers ─────────────────────────────────────────────────
    function goBack() {
        navigate(source === 'takeout' ? '/takeout' : '/unpaid');
    }

    function handleConfirmPayment() {
        // 1) Log the sale
        const salesLog = JSON.parse(localStorage.getItem('salesLog') || '[]');
        salesLog.push({
            tableId,
            guests,
            items,
            total: finalTotal,
            discount: discountNum,
            customAmount: customNum,
            cardNumber,
            method,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('salesLog', JSON.stringify(salesLog));

        const dailyReport = JSON.parse(localStorage.getItem('dailyreport') || '[]');
        const d = new Date();
        const pad2 = n => String(n).padStart(2, '0');
        const now =
            `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ` +
            `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
        dailyReport.push({
            timestamp: now,
            tableId,
            guests,                    // ISO string timestamp
            items: items.map(i => ({          // copy id/name/qty
                id: i.id,
                name: i.name,
                qty: i.qty
            })),
            total: finalTotal,                // final total paid
            method,                           // 'Cash' or 'LinePay'
            cardNumber,
            discount: discountNum,
            customAmount: customNum
            // if any, else ''
        });
        localStorage.setItem('dailyreport', JSON.stringify(dailyReport));

        const monthly = JSON.parse(localStorage.getItem('monthlyReport') || '[]');
        monthly.push({
            timestamp: now,
            tableId,
            guests,
            items: items.map(i => ({ id: i.id, name: i.name, qty: i.qty })),
            total: finalTotal,
            method,
            cardNumber,
            discount: discountNum,
            customAmount: customNum
        });
        localStorage.setItem('monthlyReport', JSON.stringify(monthly));

        if (source === 'unpaid') {
            // Remove from unpaidOrders
            const unpaid = JSON.parse(localStorage.getItem('unpaidOrders') || '[]');
            if (splitItems.length > 0) {
                // We did a split: subtract splitItems from the original order
                const orig = unpaid[orderIndex];
                const remaining = orig.items
                    .map(origIt => {
                        const splitIt = splitItems.find(s => s.id === origIt.id);
                        if (!splitIt) return origIt;
                        const qtyLeft = origIt.qty - splitIt.qty;
                        return qtyLeft > 0
                            ? { ...origIt, qty: qtyLeft }
                            : null;
                    })
                    .filter(Boolean);

                // update the original order’s items & total
                orig.items = remaining;
                orig.total = remaining.reduce((sum, it) => sum + it.price * it.qty, 0);
                unpaid[orderIndex] = orig;
            } else {
                // Full checkout: remove entire order
                unpaid.splice(orderIndex, 1);
            }

            localStorage.setItem('unpaidOrders', JSON.stringify(unpaid));
            navigate('/unpaid');
        } else {
            // Mark takeout as paid
            const takeouts = JSON.parse(localStorage.getItem('takeoutOrders') || '[]');
            takeouts[orderIndex].paid = true;
            localStorage.setItem('takeoutOrders', JSON.stringify(takeouts));
            navigate('/takeout');
        }
    }

    return (
        <div className="order-detail">
            <header className="od-header">
                <h1>桌號: {tableId}</h1>
                <p>人數: {guests}</p>
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
                            disabled={customNum > 0}
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
