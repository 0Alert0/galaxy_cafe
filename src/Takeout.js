import React, { useState, useEffect} from 'react';
import { useNavigate } from 'react-router-dom';
import './takeout.css';

export default function TakeoutPage() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);

    // load take‑out orders
    useEffect(() => {
        const saved = JSON.parse(localStorage.getItem('takeoutOrders') || '[]');
        setOrders(saved);
    }, []);

    // navigate to detail
    const goToDetail = i =>
        navigate(`/orderdetail/${i}`, { state: { source: 'takeout' } });

    // remove from both localStorage + state
    const handleCloseOrder = i => {
        const saved = JSON.parse(localStorage.getItem('takeoutOrders') || '[]');
        saved.splice(i, 1);
        localStorage.setItem('takeoutOrders', JSON.stringify(saved));
        setOrders(saved);
    };
    

    return (
        <div className="takeout-page">
            <header className="to-header">
                <h1>外帶單</h1>
            </header>

            {orders.length > 0 ? (
                <div className="to-list">
                    {orders.map((o, i) => (
                        <div
                            key={i}
                            className={`to-card${o.paid ? ' paid' : ''}`}
                        >
                            <div className="to-card-header">
                                <h2>{o.tableId}</h2>
                                <span className="to-total">${o.total}</span>
                            </div>

                            <ul className="to-items">
                                {o.items.map((it, j) => (
                                    <li key={j}>
                                        <span className="name">{it.name}</span>
                                        <span className="qty">x{it.qty}</span>
                                        <span className="price">
                                            ${(it.price * it.qty)}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            <div className="to-card-footer">
                                <button
                                    className="to-checkout"
                                    onClick={() => goToDetail(i)}
                                    disabled={o.paid}
                                >
                                    {o.paid ? '已付款' : 'Checkout'}
                                </button>
                              
                                {o.paid && (
                                    <button
                                        className="to-close"
                                        onClick={() => handleCloseOrder(i)}
                                    >
                                        關單
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="to-none">沒有外帶單</p>
            )}

            <footer className="to-footer">
                <button className="to-back" onClick={() => navigate('/')}>
                    ← 回首頁
                </button>
            </footer>
        </div>
    );
}
