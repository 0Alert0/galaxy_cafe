// src/CustomDrinkModal.js
import React, { useEffect, useMemo, useState } from 'react';
import './CustomDrinkModal.css';

/**
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - onAdd: (item) => void   // item: { id, name, price, qty, options? }
 *  - defaultPrice?: number
 */
export default function CustomDrinkModal({ open, onClose, onAdd, defaultPrice = 0 }) {
    const strengths = ['淡', '正常', '濃'];
    const tastes = ['偏酸', '偏甜'];
    const categories = ['茶酒', '奶酒', '果汁', '氣泡飲', '其他'];
    const mains = [
        '草莓', '葡萄', '芭樂', '芒果', '百香果', '哈密瓜', '香蕉', '蘋果', '養樂多',
        '焙茶', '檸檬紅茶', '百香綠茶', '柚子烏龍', '新鮮果汁特調'
    ];

    const [strength, setStrength] = useState(strengths[1]); // 正常
    const [taste, setTaste] = useState(tastes[0]);    // 偏酸
    const [category, setCategory] = useState(categories[0]);
    const [main, setMain] = useState(mains[0]);
    const [qty, setQty] = useState(1);
    const [price, setPrice] = useState(defaultPrice);

    // Close on ESC
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    // ✅ include all referenced values in deps
    const id = useMemo(
        () => `custom-drink|酒感=${strength}|口感=${taste}|類別=${category}|主調=${main}`,
        [strength, taste, category, main]
    );

    // ✅ include all referenced values in deps
    const name = useMemo(
        () => `客製調酒（酒感: ${strength}｜口感: ${taste}｜類別: ${category}｜主調: ${main}）`,
        [strength, taste, category, main]
    );

    if (!open) return null;

    const clampQty = (n) => Math.max(1, Number.isFinite(+n) ? Math.floor(+n) : 1);
    const normPrice = (n) => Math.max(0, Number.isFinite(+n) ? +n : defaultPrice);

    const handleAdd = () => {
        const item = {
            id,
            name,
            price: normPrice(price),
            qty: clampQty(qty),
            options: { strength, taste, category, main }, // optional, safe to keep
        };
        onAdd?.(item);
    };

    return (
        <div className="cdm-backdrop" role="dialog" aria-modal="true" aria-labelledby="cdm-title" onClick={onClose}>
            <div className="cdm-card" onClick={(e) => e.stopPropagation()}>
                <div className="cdm-header">
                    <h3 id="cdm-title">客製化調酒</h3>
                    <button className="cdm-close" onClick={onClose} aria-label="關閉">✕</button>
                </div>

                <div className="cdm-body">
                    <section>
                        <label className="cdm-label">酒感</label>
                        <div className="cdm-group">
                            {strengths.map((s) => (
                                <button key={s} type="button"
                                    className={`cdm-chip ${strength === s ? 'active' : ''}`}
                                    onClick={() => setStrength(s)}>{s}</button>
                            ))}
                        </div>
                    </section>

                    <section>
                        <label className="cdm-label">口感</label>
                        <div className="cdm-group">
                            {tastes.map((t) => (
                                <button key={t} type="button"
                                    className={`cdm-chip ${taste === t ? 'active' : ''}`}
                                    onClick={() => setTaste(t)}>{t}</button>
                            ))}
                        </div>
                    </section>

                    <section>
                        <label className="cdm-label">類別</label>
                        <div className="cdm-group">
                            {categories.map((c) => (
                                <button key={c} type="button"
                                    className={`cdm-chip ${category === c ? 'active' : ''}`}
                                    onClick={() => setCategory(c)}>{c}</button>
                            ))}
                        </div>
                    </section>

                    <section>
                        <label className="cdm-label">主調</label>
                        <div className="cdm-grid">
                            {mains.map((m) => (
                                <button key={m} type="button"
                                    className={`cdm-chip ${main === m ? 'active' : ''}`}
                                    onClick={() => setMain(m)}>{m}</button>
                            ))}
                        </div>
                    </section>

                    <section className="cdm-row">
                        <div>
                            <label className="cdm-label" htmlFor="cdm-qty">數量</label>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <button type="button" className="cdm-chip" onClick={() => setQty((q) => clampQty(q - 1))}>−</button>
                                <input id="cdm-qty" type="number" min={1} value={qty}
                                    onChange={(e) => setQty(clampQty(e.target.value))} className="cdm-input" />
                                <button type="button" className="cdm-chip" onClick={() => setQty((q) => clampQty(q + 1))}>＋</button>
                            </div>
                        </div>

                        <div>
                            <label className="cdm-label" htmlFor="cdm-price">價格（可選）</label>
                            <input id="cdm-price" type="number" min={0} step={1} value={price}
                                onChange={(e) => setPrice(e.target.value)} className="cdm-input" />
                            <p className="cdm-hint">未填則預設 {defaultPrice}</p>
                        </div>
                    </section>

                    <div className="cdm-preview">
                        <div className="cdm-preview-title">預覽</div>
                        <div className="cdm-preview-line">{name}</div>
                        <div className="cdm-preview-line">數量：{clampQty(qty)}　單價：{normPrice(price)}</div>
                    </div>
                </div>

                <div className="cdm-footer">
                    <button className="cdm-btn ghost" type="button" onClick={onClose}>取消</button>
                    <button className="cdm-btn primary" type="button" onClick={handleAdd}>加入</button>
                </div>
            </div>
        </div>
    );
}
