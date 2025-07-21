// src/components/TablePage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './TablePage.css';

export default function TablePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [guests, setGuests] = useState('1');

  // load persisted cart (or empty)
  const [cart, setCart] = useState(() => {
    return JSON.parse(localStorage.getItem('cart') ?? '[]');
  });

  // persist cart whenever it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  // add an item only once per click
  const handleAdd = useCallback(item => {
    setCart(prev =>
      prev.some(i => i.id === item.id)
        ? prev
        : [...prev, { id: item.id, name: item.label, price: item.price ?? 0, qty: 1 }]
    );
  }, []);

  // change quantity manually
  const handleQtyChange = useCallback((itemId, newQty) => {
    setCart(prev =>
      prev.map(i => (i.id === itemId ? { ...i, qty: newQty } : i))
    );
  }, []);

  // compute cart total
  const total = cart.reduce((sum, i) => {
    const q = Number(i.qty) || 0;
    return sum + (i.price ?? 0) * q;
  }, 0);

  // your categories & menu data
  const categories = [
    'Coffee',
    'Tea / Juice / Non-Caffeine',
    'Cocktails',
    'Beers',
    'Brunch / Toast',
    'Dessert / Fried Food',
    'Royalty Card'
  ];
  const itemsByCategory = {
    Coffee: [
      { id: 'coldbrewcoffee', label: '冰滴咖啡', sub: 'Cold brew coffee (每日限量 Limited)', price: 150 },
      { id: 'americano', label: '美式咖啡', sub: 'Americano', price: 80 },
      { id: 'espresso', label: '義式咖啡', sub: 'Espresso', price: 80 },
      { id: 'latte', label: '拿鐵', sub: 'Latte', price: 120 },
      { id: 'cappuccino', label: '卡布奇諾', sub: 'Cappuccino', price: 130 },
      { id: 'vanilla-latte', label: '香草拿鐵', sub: 'Vanilla Latte', price: 140 },
      { id: 'sea-salt-caramel', label: '海鹽焦糖', sub: 'Sea Salt Caramel', price: 140 },
      { id: 'caramel-macchiato', label: '焦糖瑪奇朵', sub: 'Caramel Macchiato', price: 140 },
      { id: 'matcha-macchiato', label: '抹茶瑪奇朵', sub: 'Matcha Macchiato', price: 140 },
      { id: 'matcha-latte', label: '抹茶咖啡', sub: 'Matcha Latte', price: 140 },
      { id: 'espresso-romano', label: '西西里咖啡', sub: 'Espresso Romano', price: 140 },
      { id: 'blue-mt-coffee', label: '(手沖) 藍山咖啡', sub: '(Pour Over) Blue Mt. coffee', price: 150 },
      { id: 'su-xing-coffee', label: '(手沖) 蘇幸咖啡', sub: '(Pour Over) Su Xing coffee', price: 180 }

    ],
    'Tea / Juice / Non-Caffeine': [
      { id: 'iced-green-tea', label: '(冰) 綠茶', sub: '(Iced) Green Tea', price: 80 },
      { id: 'iced-black-tea', label: '(冰) 紅茶', sub: '(Iced) Black Tea', price: 80 },
      { id: 'iced-oolong-tea', label: '(冰) 烏龍茶', sub: '(Iced) Oolong Tea', price: 80 },
      { id: 'iced-four-season-tea', label: '(冰) 四季春茶', sub: '(Iced) Four Season Tea', price: 80 },
      { id: 'hot-jhinhsuan-tea', label: '(熱) 金萱茶', sub: '(Hot) Jhinhsuan Tea', price: 150 },
      { id: 'hot-black-tea', label: '(熱) 韻香紅茶', sub: '(Hot) Black Tea', price: 150 },
      { id: 'hot-osmanthus-oolong-tea', label: '(熱) 桂花烏龍', sub: '(Hot) Osmanthus Oolong Tea', price: 150 },
      { id: 'yuzu-oolong-tea', label: '柚子烏龍', sub: 'Yuzu Oolong Tea', price: 100 },
      { id: 'peach-oolong-tea', label: '蜜桃烏龍', sub: 'Peach Oolong Tea', price: 100 },
      { id: 'passion-fruit-green-tea', label: '百香綠茶', sub: 'Passion Fruit Green Tea', price: 100 },
      { id: 'milk-tea', label: '鮮奶茶', sub: 'Milk Tea', price: 100 },
      { id: 'fruit-tea', label: '水果茶', sub: 'Fruit Tea', price: 150 },
      { id: 'juice', label: '果汁', sub: 'Juice', price: 80 },
      { id: 'flavored-sparkling-water', label: '風味氣泡飲', sub: 'Flavored Sparkling Water', price: 100 },
      { id: 'seasonal-fresh-juice', label: '季節新鮮果汁', sub: 'Seasonal Fresh Juice', price: 150 }
    ],
    Cocktails: [
      { id: 'white-russian', label: '白俄羅斯', sub: 'White Russian', price: 350 },
      { id: 'yogurt-bubble', label: '優格泡泡', sub: 'Yogurt Bubble', price: 350 },
      { id: 'lemon-cocktail', label: '溫柔鄉', sub: 'Lemon Cocktail', price: 350 },
      { id: 'mango-tea-wine', label: '芒果茶酒', sub: 'Mango Tea Wine', price: 350 },
      { id: 'peach-tea-wine', label: '水蜜桃茶酒', sub: 'Peach Tea Wine', price: 350 },
      { id: 'apple-tea-wine', label: '蘋果茶酒', sub: 'Apple Tea Wine', price: 350 },
      { id: 'yuzu-tea-wine', label: '柚子茶酒', sub: 'Yuzu Tea Wine', price: 350 },
      { id: 'cranberry-tea-wine', label: '蔓越莓茶酒', sub: 'Cranberry Tea Wine', price: 350 },
      { id: 'first-love', label: '(初戀) 草莓奶酒', sub: 'First Love', price: 350 },
      { id: 'hello-melon', label: '(哈囉，密瓜!) 哈密瓜奶酒', sub: 'Hello, Melon!', price: 350 },
      { id: 'grape-milk-wine', label: '葡萄奶酒', sub: 'Grape Milk Wine', price: 350 },
      { id: 'lichi-milk-wine', label: '荔枝奶酒', sub: 'Lichi Milk Wine', price: 350 },
      { id: 'tipsy-milk-tea', label: '(大人鮮奶茶) 焙茶奶酒', sub: 'Tipsy Milk Tea', price: 350 },
      { id: 'shot', label: 'Shot', sub: '(買二送一)', price: 100 },
      { id: 'rum-coke', label: 'Rum & Coke', sub: '', price: 300 },
      { id: 'gin-tonic', label: 'Gin & Tonic', sub: '', price: 300 },
      { id: 'vodka-coke', label: 'Vodka & Coke', sub: '', price: 300 },
      { id: 'custom-cocktail', label: '客製化', sub: 'Customize', price: 350, custom: true }
    ],
    Beers: [
      { id: 'budweiser', label: '百威', sub: 'Budweiser', price: 100 },
      { id: 'san-miguel', label: '生力', sub: 'San Miguel', price: 130 },
      { id: 'corona', label: '可樂娜', sub: 'Corona', price: 150 },
      { id: 'baller-larger', label: '伯樂', sub: 'Baller Larger', price: 250 },
      { id: 'qianlima-ipa', label: '千里馬', sub: 'Qianlima IPA', price: 250 },
      { id: 'white-beer', label: '白帥帥', sub: 'White Beer', price: 250 },
      { id: 'black-beer', label: '黑嚕嚕', sub: 'Black Beer', price: 250 }
    ],
    'Brunch / Toast': [
      { id: 'galaxy-brunch', label: '星翼早午餐', sub: 'Galaxy Brunch', price: 250 },
      { id: 'galaxy-pizza', label: '星翼披薩', sub: 'Galaxy Pizza', price: 150 },
      { id: 'hot-pressed-sandwich', label: '熱壓吐司 (2份)', sub: 'Hot Pressed Sandwich (2 servings)', price: 150 },
      { id: 'original-thick-slice', label: '原味厚片', sub: 'Original (附奶油 / Butter)', price: 60 },
      { id: 'peanuts-thick-slice', label: '花生厚片', sub: 'Peanuts', price: 80 },
      { id: 'chocolate-thick-slice', label: '巧克力厚片', sub: 'Chocolate', price: 80 },
      { id: 'milk-crumble-thick-slice', label: '奶酥厚片', sub: 'Milk Crumble', price: 80 },
      { id: 'garlic-thick-slice', label: '香蒜厚片', sub: 'Garlic', price: 80 },
      { id: 'matcha-thick-slice', label: '抹茶奶酥厚片', sub: 'Matcha', price: 80 },
      { id: 'two-flavors-thick-slice', label: '雙拼厚片', sub: '2 Flavors', price: 100 }

    ],
    'Dessert / Fried Food': [
      { id: 'brownie-cake', label: '布朗尼蛋糕', sub: 'Brownie Cake', price: 130 },
      { id: 'basque-cheesecake', label: '巴斯克乳酪蛋糕', sub: 'Basque Cheesecake', price: 130 },
      { id: 'crepe-cake', label: '千層蛋糕', sub: 'Crepe Cake', price: 130 },
      { id: 'waffle-with-maple-syrup', label: '楓糖鬆餅', sub: 'Waffle with Maple Syrup', price: 140 },
      { id: 'matcha-waffle', label: '抹茶鬆餅', sub: 'Matcha Waffle', price: 160 },
      { id: 'waffle-with-fruit', label: '水果鬆餅', sub: 'Waffle with Fruit', price: 200 },
      { id: 'hash-browns', label: '薯餅 (2塊)', sub: 'Hash Browns (2 pcs)', price: 70 },
      { id: 'french-fries', label: '薯條', sub: 'French Fries', price: 120 }
    ],
    'Royalty Card': [
      { id: '800', label: '寄杯卡 800', sub: '', price: 800 },
      { id: '1200', label: '寄杯卡 1200', sub: '', price: 1200 },
      { id: '1400', label: '寄杯卡 1400', sub: '', price: 1400 },
      { id: '1500', label: '寄杯卡 1500', sub: '', price: 1500 },

    ]
  };
  const [selectedCat, setSelectedCat] = useState(categories[0]);
  const menuItems = itemsByCategory[selectedCat] ?? [];

  // confirm → unpaid vs takeout
  const handleConfirm = useCallback(() => {
    // guard: require at least one item
    if (cart.length === 0) {
      alert("至少選一個品項");
      return;
    }

    const newOrder = { tableId: id, guests, items: cart, total };
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
  }, [cart, guests, id, navigate, total]);


  const goBack = useCallback(() => {
    // clear the cart in state and storage
    setCart([]);
    localStorage.removeItem('cart');
    // then navigate home
    navigate('/');
  }, [navigate, setCart]);
  const handleRemove = useCallback(itemId => {
    setCart(prev => prev.filter(i => i.id !== itemId));
  }, []);

  return (
    <div className="tablepage">
      <aside className="sidebar">
        <ul className="cat-list">
          {categories.map(cat => (
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
              onClick={() => handleAdd(item)}
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
          <div className="party-size">
            <label>
              人數:
              <input
                type="number"
                min="1"
                value={guests}
                onChange={e => setGuests(e.target.value)}
              />
            </label>
          </div>
        </div>

        <h3>物品清單</h3>
        <ul className="cart-list">
          {cart.map(it => (
            <li key={it.id}>
              <span className="name">{it.name}</span>
              <input
                type="number"
                className="qty-input"
                min="1"
                value={it.qty}
                onChange={e => handleQtyChange(it.id, e.target.value)}
              />
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
    </div>
  );
}
