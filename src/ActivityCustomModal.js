// ===== File: src/components/ActivityCustomModal.jsx =====
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './ActivityCustomModal.css';

/**
 * ActivityCustomModal — 專用於「活動｜自訂金額」的彈窗
 * - 完全與頁面樣式解耦：所有 CSS 都在 ActivityCustomModal.css 且以 .activity-modal-root 作為 scope
 * - 不會覆蓋任何既有按鈕 / 文字樣式
 */
export default function ActivityCustomModal({
    open,
    onClose,
    onAdd,
    defaultName = '',
    defaultPrice = '',
}) {
    const [name, setName] = useState(defaultName);
    const [price, setPrice] = useState(defaultPrice);
    const [qty, setQty] = useState(1);

    // reset when opened
    useEffect(() => {
        if (open) {
            setName(defaultName);
            setPrice(defaultPrice);
            setQty(1);
        }
    }, [open, defaultName, defaultPrice]);

    if (!open) return null;

    const handleSubmit = (e) => {
        e?.preventDefault?.();
        const p = Number(price);
        const q = Math.max(1, Number(qty || 1));

        if (!String(name).trim()) {
            alert('請輸入項目名稱');
            return;
        }
        if (!Number.isFinite(p) || p < 0) {
            alert('金額需為非負數字');
            return;
        }

        onAdd({
            id: `activity-${name}-${p}-${Date.now()}`,
            name: String(name).trim(),
            price: p,
            qty: q,
        });
    };

    const stop = (e) => e.stopPropagation();

    return createPortal(
        <div
            className="activity-modal-root"
            role="dialog"
            aria-modal="true"
            onClick={onClose}
            onKeyDown={(e) => { if (e.key === 'Escape') onClose?.(); }}
        >
            <div className="activity-modal" onClick={stop}>
                <h3 className="activity-modal__title">活動｜自訂金額</h3>
                <form onSubmit={handleSubmit} className="activity-modal__form">
                    <label className="activity-modal__field">
                        <span className="activity-modal__label">項目名稱</span>
                        <input
                            className="activity-modal__input"
                            autoFocus
                            type="text"
                            placeholder="例如：活動票券、場地費、週邊商品…"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </label>

                    <label className="activity-modal__field">
                        <span className="activity-modal__label">金額（NTD）</span>
                        <input
                            className="activity-modal__input"
                            type="number"
                            inputMode="decimal"
                            min={0}
                            placeholder="請輸入金額"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                        />
                    </label>

                    <label className="activity-modal__field">
                        <span className="activity-modal__label">數量</span>
                        <input
                            className="activity-modal__input"
                            type="number"
                            min={1}
                            value={qty}
                            onChange={(e) => setQty(e.target.value)}
                        />
                    </label>

                    <div className="activity-modal__actions">
                        <button type="button" className="activity-modal__btn" onClick={onClose}>取消</button>
                        <button type="submit" className="activity-modal__btn activity-modal__btn--primary">加入</button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}



