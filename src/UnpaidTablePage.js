// src/UnpaidTablePage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './UnpaidTablePage.css';

export default function UnpaidTablePage() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    // for splitting
    const [splitIndex, setSplitIndex] = useState(null);
    const [splitQtys, setSplitQtys] = useState({});

    useEffect(() => {
        const saved = JSON.parse(localStorage.getItem('unpaidOrders') ?? '[]');
        setOrders(saved);
    }, []);

    const viewDetails = useCallback(order => {
        const msg = order.items
            .map(it => `• ${it.name} x${it.qty}`)
            .join('\n');
        alert(msg);
    }, []);

    const modifyOrder = useCallback(order => {
        localStorage.setItem('cart', JSON.stringify(order.items));
        navigate(`/tablePage/${order.tableId}`);
    }, [navigate]);

    const checkout = useCallback(idx => {
        navigate(`/orderdetail/${idx}`, { state: { source: 'unpaid' } });
    }, [navigate]);

    const goBack = useCallback(() => {
        navigate('/');
    }, [navigate]);

    const openSplit = i => {
        setSplitIndex(i);
        // initialize splitQtys to zeros
        const zeroed = {};
        orders[i].items.forEach(it => { zeroed[it.id] = 0; });
        setSplitQtys(zeroed);
    };

    // change one split quantity
    const changeSplitQty = (itemId, v) => {
        const max = orders[splitIndex]?.items.find(it => it.id === itemId)?.qty ?? 0;
        const val = Math.max(0, Math.min(Number(v) || 0, max));
        setSplitQtys(q => ({
            ...q,
            [itemId]: val
        }));
    };

    // confirm split (OrderDetail will subtract items only when payment is confirmed)
    const confirmSplit = () => {
        const orderToEdit = orders[splitIndex];
        if (!orderToEdit) return;

        const splitItems = [];
        orderToEdit.items.forEach(it => {
            const s = parseInt(splitQtys[it.id], 10) || 0;
            if (s > 0) {
                splitItems.push({ ...it, qty: s });
            }
        });

        if (splitItems.length === 0) {
            return alert('至少選擇一項');
        }

        const idx = splitIndex;
        setSplitIndex(null);

        // navigate to detail for the split-off items
        navigate(`/orderdetail/${idx}`, {
            state: {
                source: 'unpaid',
                splitItems,
                guests: orderToEdit.guests,
                tableId: orderToEdit.tableId
            }
        });
    };

    return (
        <div className="unpaid-page">
            <h1>未付款桌號</h1>

            {orders.length > 0 ? (
                <div className="orders-list">
                    {orders.map((o, i) => (
                        <div key={i} className="order-card">
                            <button
                                className="info-btn"
                                onClick={() => viewDetails(o)}
                                title="View details"
                            >
                                i
                            </button>

                            <h2>{o.tableId}</h2>
                            <p><strong>人數:</strong> {o.guests}</p>
                            <p><strong>總共金額:</strong> ${o.total}</p>

                            <button
                                className="view-btn"
                                onClick={() => checkout(i)}
                            >
                                付款
                            </button>
                            <button
                                className="modify-btn"
                                onClick={() => modifyOrder(o)}
                            >
                                更改訂單
                            </button>
                            <button className="split-btn" onClick={() => openSplit(i)}>
                                分開付
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="none">無未付款桌號</p>
            )}

            <button
                className="back-btn"
                onClick={goBack}
            >
                ← 回首頁
            </button>

            {/* Split Modal */}
            {splitIndex !== null && orders[splitIndex] && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h2>{orders[splitIndex].tableId}</h2>
                        <ul className="split-list">
                            {orders[splitIndex].items.map(it => (
                                <li key={it.id}>
                                    <span>{it.name} (最多{it.qty})</span>
                                    <div className="split-qty-group">
                                        <button
                                            className="split-btn minus"
                                            onClick={() =>
                                                changeSplitQty(it.id, (splitQtys[it.id] || 0) - 1)
                                            }
                                            disabled={(splitQtys[it.id] || 0) <= 0}
                                        >
                                            –
                                        </button>
                                        <input
                                            type="number"
                                            min="0"
                                            max={it.qty}
                                            value={splitQtys[it.id] ?? 0}
                                            onChange={e => changeSplitQty(it.id, Number(e.target.value))}
                                        />
                                        <button
                                            className="split-btn plus"
                                            onClick={() =>
                                                changeSplitQty(it.id, (splitQtys[it.id] || 0) + 1)
                                            }
                                            disabled={(splitQtys[it.id] || 0) >= it.qty}
                                        >
                                            ＋
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                        <div className="modal-actions">
                            <button onClick={() => setSplitIndex(null)}>取消</button>
                            <button onClick={confirmSplit}>確認分開付</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}