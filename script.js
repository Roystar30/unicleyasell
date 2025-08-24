// ===== Core config =====
const API_BASE = 'https://unicleya-backend.onrender.com'; // Render backend

// ===== Shorthand =====
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

// ===== API Helper =====
async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem('unicleya_token');
  const headers = { ...(opts.headers || {}), 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...opts,
    headers,
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => 'Request failed');
    throw new Error(msg || res.statusText);
  }
  return res.json().catch(() => ({}));
}

// ===== State =====
let cart = JSON.parse(localStorage.getItem('unicleya_cart') || '[]');
let allProducts = [];

// ===== Cart =====
function persistCartLocal() {
  localStorage.setItem('unicleya_cart', JSON.stringify(cart));
  updateCartBadge();
}

// Sync with backend
async function syncCartBackend() {
  try {
    const user = getUser();
    if (!user) return; // skip if not signed in
    await apiFetch('/api/cart', {
      method: 'POST',
      body: JSON.stringify({ items: cart }),
    });
  } catch (err) {
    console.warn('Cart sync failed', err.message);
  }
}

function updateCartBadge() {
  const count = cart.reduce((a, c) => a + Number(c.qty || 0), 0);
  const el = $('#cartCount');
  if (el) el.textContent = String(count);
}

function addToCart(id) {
  const p = findProductById(id);
  if (!p) return toast('Item not found');
  const existing = cart.find((x) => x.id === id);
  if (existing) existing.qty += 1;
  else
    cart.push({
      id,
      qty: 1,
      price: Number(p.price) || 0,
      title: p.title || p.name || 'Item',
      image: p.image || (p.images && p.images[0]),
    });
  persistCartLocal();
  syncCartBackend();
  toast('Added to cart');
}

function removeFromCart(id) {
  cart = cart.filter((x) => x.id !== id);
  persistCartLocal();
  syncCartBackend();
  renderCart();
}

function setQty(id, qty) {
  const it = cart.find((x) => x.id === id);
  if (!it) return;
  it.qty = Math.max(1, qty | 0);
  persistCartLocal();
  syncCartBackend();
  renderCartTotals();
}

function clearCart() {
  cart = [];
  persistCartLocal();
  syncCartBackend();
  renderCart();
}

// ===== Orders =====
async function placeOrder() {
  if (cart.length === 0) return toast('Your cart is empty');

  const name = $('#coName').value.trim();
  const phone = $('#coPhone').value.trim();
  const email = $('#coEmail').value.trim();
  const address = $('#coAddress').value.trim();
  const payment = $('#coPayment').value;

  if (!name || !phone || !email || !address)
    return toast('Please fill all details');

  const order = {
    name,
    phone,
    email,
    address,
    payment,
    items: cart,
    totals: cartTotals(),
  };

  try {
    showLoader();
    const data = await apiFetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify(order),
    });
    $('#checkoutMsg').style.display = 'block';
    $('#checkoutMsg').textContent =
      data?.message || 'Order placed! We\'ll contact you shortly.';
    clearCart();
  } catch (err) {
    console.error(err);
    toast('Order failed: ' + err.message);
  } finally {
    hideLoader();
  }
}

// ===== User & Sync =====
function getUser() {
  return JSON.parse(localStorage.getItem('unicleya_user') || 'null');
}

async function syncCartFromBackend() {
  try {
    const user = getUser();
    if (!user) return;
    const data = await apiFetch('/api/cart');
    if (Array.isArray(data.items)) {
      cart = data.items;
      persistCartLocal();
    }
  } catch (err) {
    console.warn('Cart load failed', err.message);
  }
}

// ===== Init =====
(async function init() {
  updateCartBadge();
  await syncCartFromBackend();
  await loadProducts();
})();
