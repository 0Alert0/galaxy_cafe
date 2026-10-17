// src/TablePage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CustomDrinkModal from './CustomDrinkModal';
import ActivityCustomModal from './ActivityCustomModal';
import {
  MENU_CATEGORIES,
  MENU_ITEMS_BY_CATEGORY,
  CUSTOM_DRINK_CONFIG
} from './posConfig';
import './CustomDrinkModal.css';
import './TablePage.css';

export default function TablePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // load persisted cart (or empty)
  const [cart, setCart] = useState(() => {
    return JSON.parse(localStorage.getItem('cart') ?? '[]');
  });

  // persist cart whenever it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  // add a standard menu item
  const handleAdd = useCallback(item => {
    setCart(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) {
        return prev.map(i =>
          i.id === item.id
            ? { ...i, qty: Number(i.qty) + 1 }
            : i
        );
      } else {
        return [
          ...prev,
          { id: item.id, name: item.label, price: Number(item.price) || 0, qty: 1 }
        ];
      }
    });
  }, []);

  // add custom drink or custom activity returned from modal
  const addCustomToCart = useCallback((customItem) => {
    setCart(prev => {
      const idx = prev.findIndex(i => i.id === customItem.id);
      const next = [...prev];
      const qtyToAdd = Number(customItem.qty) || 1;
      const price = Number(customItem.price) || 0;
      if (idx >= 0) {
        next[idx] = { ...next[idx], qty: Number(next[idx].qty) + qtyToAdd };
      } else {
        next.push({
          id: customItem.id,
          name: customItem.name || customItem.label || '客製調酒',
          price,
          qty: qtyToAdd,
          options: customItem.options
        });
      }
      return next;
    });
  }, []);

  // change quantity manually
  const handleQtyChange = useCallback((itemId, newQty) => {
    const parsed = Math.max(1, Number(newQty) || 1);
    setCart(prev =>
      prev.map(i => (i.id === itemId ? { ...i, qty: parsed } : i))
    );
  }, []);

  const incrementQty = useCallback(itemId => {
    setCart(prev =>
      prev.map(i =>
        i.id === itemId
          ? { ...i, qty: Number(i.qty) + 1 }
          : i
      )
    );
  }, []);

  const decrementQty = useCallback(itemId => {
    setCart(prev =>
      prev.map(i => {
        if (i.id === itemId) {
          const next = Number(i.qty) - 1;
          return { ...i, qty: next > 1 ? next : 1 };
        }
        return i;
      })
    );
  }, []);

  // compute cart total
  const total = cart.reduce((sum, i) => {
    const q = Number(i.qty) || 0;
    return sum + (Number(i.price) || 0) * q;
  }, 0);

  const [selectedCat, setSelectedCat] = useState(MENU_CATEGORIES[0]);
  const menuItems = MENU_ITEMS_BY_CATEGORY[selectedCat] ?? [];

  // confirm → unpaid vs takeout
  const handleConfirm = useCallback(() => {
    if (cart.length === 0) {
      alert("至少選一個品項");
      return;
    }

    const newOrder = { tableId: id, items: cart, total };
    if (id === 'Take Out') {
      const takeouts = JSON.parse(localStorage.getItem('takeoutOrders') ?? '[]');
      takeouts.push(newOrder);
      localStorage.setItem('takeoutOrders', JSON.stringify(takeouts));
      navigate('/takeout');
    } else {
      const unpaid = JSON.parse(localStorage.getItem('unpaidOrders') ?? '[]');
      const updated = unpaid.filter(o => o.tableId !== id);
      updated.push(newOrder);
      localStorage.setItem('unpaidOrders', JSON.stringify(updated));
      navigate('/unpaid');
    }
    localStorage.removeItem('cart');
    setCart([]);
  }, [cart, id, navigate, total]);

  const goBack = useCallback(() => {
    setCart([]);
    localStorage.removeItem('cart');
    navigate('/');
  }, [navigate]);

  const handleRemove = useCallback(itemId => {
    setCart(prev => prev.filter(i => i.id !== itemId));
  }, []);

  const [customOpen, setCustomOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);

  return (
    <div className="tablepage">
      <aside className="sidebar">
        <ul className="cat-list">
          {MENU_CATEGORIES.map(cat => (
            <li
              key={cat}
              className={cat === selectedCat ? 'active' : undefined}
              onClick={() => setSelectedCat(cat)}
            >
              {cat}
            </li>
          ))}
        </ul>
      </aside>

      <main className="main">
        <section className="category-title">
          <h2>{selectedCat}</h2>
        </section>
        <section className="items-grid">
          {menuItems.map(item => (
            <button
              key={item.id}
              className={`item-btn${item.custom ? ' customize' : ''}`}
              onClick={() => {
                if (selectedCat === '活動' && item.id === '自訂') {
                  setActivityOpen(true);
                  return;
                }
                if (item.custom && selectedCat === '調酒') {
                  setCustomOpen(true);
                } else {
                  handleAdd(item);
                }
              }}
            >
              <span>{item.label}</span>
              {item.sub && <span className="sub">{item.sub}</span>}
            </button>
          ))}
        </section>
      </main>

      <aside className="cart">
        <div className="table-header">
          <div className="table-label">{id}</div>
        </div>

        <h3>物品清單</h3>
        <ul className="cart-list">
          {cart.map(it => (
            <li key={it.id}>
              <span className="name">{it.name}</span>
              <div className="qty-controls">
                <button onClick={() => decrementQty(it.id)}>-</button>
                <input
                  type="number"
                  className="qty-input"
                  min="1"
                  value={it.qty}
                  onChange={e =>
                    handleQtyChange(it.id, e.target.value)
                  }
                />
                <button onClick={() => incrementQty(it.id)}>＋</button>
              </div>
              <span className="price">${(it.price * it.qty)}</span>
              <button
                className="remove-item"
                onClick={() => handleRemove(it.id)}
              >
                ❌
              </button>
            </li>
          ))}
        </ul>

        <div className="cart-total">
          <span>總共金額: </span>
          <span>${total}</span>
        </div>

        <button className="checkout" onClick={handleConfirm}>
          確認
        </button>
        <button className="back-to-top" onClick={goBack}>
          ← 回首頁
        </button>
      </aside>

      <CustomDrinkModal
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        onAdd={(item) => {
          addCustomToCart(item);
          setCustomOpen(false);
        }}
        defaultPrice={CUSTOM_DRINK_CONFIG.defaultPrice}
      />

      <ActivityCustomModal
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
        onAdd={(item) => {
          addCustomToCart(item);
          setActivityOpen(false);
        }}
      />
    </div>
  );
}