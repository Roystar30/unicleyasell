// ===== Core config =====
const API_BASE = 'https://unicleya-backend.onrender.com'; // Render backend

// ===== Shorthand =====
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

// ===== Elements (exist on some pages) =====
const progress = $('#progress');
const loader = $('#loader');
const listingsRoot = $('#listings');
const resultMeta = $('#resultMeta');
const searchInput = $('#searchInput');
const clearSearchBtn = $('#clearSearch');
const searchForm = $('#searchForm');
const suggestionsBox = $('#searchSuggestions');
const categoryWrap = $('#categoryChips');

const cartBtn = $('#cartBtn');
const cartCountEl = $('#cartCount');

const cartList = $('#cartList');
const cartFooter = $('#cartFooter');
const cartEmpty = $('#cartEmpty');
const cartTotalEl = $('#cartTotal');

const coItems = $('#coItems');
const coTotal = $('#coTotal');

const accountArea = $('#accountArea');

// Auth elements
const authModal = $('#authModal');
const loginStep1 = $('#loginFormStep1');
const loginStep2 = $('#loginFormStep2');
const loginBtn = $('#loginBtn');
const accountBtn = $('#accountBtn');
const authClose = $('#authClose');
const tabs = $$('.tab');
const loginError = $('#loginError');
const loginError2 = $('#loginError2');
const registerError = $('#registerError');
const whoLabel = $('#whoLabel');
const switchToRegister = $('#switchToRegister');
const registerForm = $('#registerForm');

// ===== State =====
let allProducts = [];
let activeCategory = 'all';
let searchText = '';
let cart = JSON.parse(localStorage.getItem('unicleya_cart') || '[]'); // [{id,qty,price,title,image}]
let recentSearches = JSON.parse(localStorage.getItem('unicleya_recent_searches') || '[]'); // [q1,q2,...]
let recentViews = JSON.parse(localStorage.getItem('unicleya_recent_views') || '[]'); // [{id,title,image}]

let pendingIdentifier = null;

// ===== Utilities =====
function showProgress(){ if(!progress) return; progress.style.width = '6%'; progress.style.transition='width .8s ease'; setTimeout(()=>progress.style.width='55%', 80); }
function hideProgress(){ if(!progress) return; progress.style.width = '0'; progress.style.transition='width .6s ease 0.2s'; }
function showLoader(){ if(loader){ loader.style.display = 'flex'; } }
function hideLoader(){ if(loader){ loader.style.display = 'none'; } }

function toast(msg){
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.position='fixed'; el.style.left='50%'; el.style.transform='translateX(-50%)'; el.style.bottom='28px';
  el.style.background='rgba(0,0,0,0.8)'; el.style.color='#fff'; el.style.padding='10px 16px'; el.style.borderRadius='10px'; el.style.zIndex=1200;
  document.body.appendChild(el); setTimeout(()=> el.remove(), 2000);
}

function debounce(fn, wait=250){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), wait); } }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#039;'}[m])); }

// ===== API Helper =====
async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem('unicleya_token');
  const headers = { ...(opts.headers || {}) };
  if (!(opts.body instanceof FormData)) headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...opts,
    headers,
  });
  if (!res.ok) {
    let msg = '';
    try { msg = await res.text(); } catch (e){}
    throw new Error(msg || res.statusText);
  }
  try { return await res.json(); } catch (e){ return {}; }
}

// ===== Routing (multi-page uses hrefs; SPA-safe helper kept for reuse) =====
function routeTo(id){
  $$('.page').forEach(p=>{ p.classList.remove('show'); p.style.display='none'; });
  const el = document.getElementById(id);
  if(el){ el.style.display='block'; el.classList.add('show'); window.scrollTo({top:0,behavior:'smooth'}); }
  if(id==='page-cart') renderCart();
  if(id==='page-checkout') renderCheckout();
  if(id==='page-account') renderAccount();
}

// ===== Products =====
async function loadProducts(){
  try{
    showProgress(); showLoader();
    const data = await apiFetch('/api/products');
    allProducts = Array.isArray(data) ? data : (data.products || []);
  }catch(err){
    console.error('Failed to load products', err);
    allProducts = [];
  }finally{
     hideLoader(); hideProgress(); renderListings(); 
    }
}

function productToCard(p){
  const price = typeof p.price === 'number' ? `₹${p.price}` : (p.price || '—');
  const title = p.title || p.name || 'Untitled';
  const desc = p.desc || p.description || '';
  const id = p._id || p.id || '';
  const image = p.image || (p.images && p.images[0]) || 'https://placehold.co/300x300/png?text=No+Image';

  const specs = [p.ram, p.storage, p.processor, p.condition].filter(Boolean).slice(0,4);

  return `
    <div class="product-card" data-id="${escapeHtml(id)}">
      <div class="product-media"><img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" loading="lazy"></div>
      <div class="product-body">
        <h4 class="product-title" title="${escapeHtml(title)}">${escapeHtml(title)}</h4>
        <p class="product-desc">${escapeHtml(desc)}</p>
        <div class="specs">
          ${specs.map(s=>`<span class="spec">${escapeHtml(s)}</span>`).join('')}
        </div>
      </div>
      <div class="product-actions">
        <div class="price">${price}</div>
        <button class="btn primary" data-action="add" data-id="${escapeHtml(id)}">Add to Cart</button>
        <button class="btn ghost" data-action="buy" data-id="${escapeHtml(id)}">Buy Now</button>
      </div>
    </div>`;
}

function getFiltered(){
  const q = searchText.trim().toLowerCase();
  return allProducts.filter(p => {
    const inCat = activeCategory==='all' || (p.category||'').toLowerCase()===activeCategory;
    const text = `${p.title||''} ${p.desc||p.description||''}`.toLowerCase();
    const inSearch = !q || text.includes(q);
    return inCat && inSearch;
  });
}

function renderListings(){
  if(!listingsRoot || !resultMeta) return;
  const items = getFiltered();
  resultMeta.textContent = items.length ? `${items.length} item(s)` : 'No results';
  listingsRoot.innerHTML = items.map(productToCard).join('');

  // Wire actions
  $$('#listings [data-action="add"]').forEach(btn=>{
    btn.addEventListener('click', ()=> addToCart(btn.dataset.id));
  });
  $$('#listings [data-action="buy"]').forEach(btn=>{
    btn.addEventListener('click', ()=> { addToCart(btn.dataset.id); window.location.href='checkout.html'; });
  });
  
  // recent views capture (save first 10)
  $$('#listings .product-card').forEach(card=>{
    card.addEventListener('click', ()=>{
      const id = card.dataset.id;
      const p = findProductById(id) || {};
      const entry = { id, title: p.title || p.name || 'Item', image: p.image || (p.images && p.images[0]) || '' };
      recentViews = [entry, ...recentViews.filter(e=>e.id!==id)].slice(0,10);
      localStorage.setItem('unicleya_recent_views', JSON.stringify(recentViews));
    }, { once:true });
  });
}

// ===== Cart (local + backend sync) =====
function persistCart(){ localStorage.setItem('unicleya_cart', JSON.stringify(cart)); updateCartBadge(); }
function updateCartBadge(){ if(!cartCountEl) return; const count = cart.reduce((a,c)=>a + Number(c.qty||0), 0); cartCountEl.textContent = String(count); }

function findProductById(id){ return allProducts.find(p => (p._id||p.id||'')===id) || {}; }

async function syncCartBackend(){
  try {
    const user = getUser();
    if(!user) return;
    await apiFetch('/api/cart', { method:'POST', body: JSON.stringify({ items: cart }) });
  } catch(err){ console.warn('Cart sync failed', err.message); }
}

async function loadCartFromBackend(){
  try {
    const user = getUser();
    if(!user) return;
    const data = await apiFetch('/api/cart');
    if(Array.isArray(data.items)) {
      cart = data.items;
      persistCart();
    }
  } catch(err){ console.warn('Cart load failed', err.message); }
}

function addToCart(id){
  const p = findProductById(id);
  if(!p){ toast('Item not found'); return; }
  const existing = cart.find(x => x.id===id);
  if(existing){ existing.qty += 1; }
  else{
    cart.push({ id, qty:1, price: Number(p.price)||0, title: p.title||p.name||'Item', image: p.image || (p.images && p.images[0])});
  }
  persistCart(); syncCartBackend(); toast('Added to cart');
}

function removeFromCart(id){ cart = cart.filter(x=>x.id!==id); persistCart(); syncCartBackend(); renderCart(); }
function setQty(id, qty){ const it = cart.find(x=>x.id===id); if(!it) return; it.qty = Math.max(1, qty|0); persistCart(); syncCartBackend(); renderCartTotals(); }

function formatCurrency(n){ if(isNaN(n)) return '₹0'; return `₹${Number(n).toLocaleString('en-IN')}`; }

function renderCart(){
  if(!cartList || !cartFooter || !cartEmpty) return;
  cartList.innerHTML = '';
  if(cart.length===0){ cartEmpty.style.display='block'; cartFooter.style.display='none'; return; }
  cartEmpty.style.display='none'; cartFooter.style.display='flex';

  cart.forEach(item=>{
    const p = findProductById(item.id) || {};
    const title = escapeHtml(item.title || p.title || 'Item');
    const image = escapeHtml(item.image || p.image || 'https://placehold.co/100x100/png');
    const price = Number(item.price || p.price || 0);
    const row = document.createElement('div');
    row.className = 'cart-row';
    row.innerHTML = `
      <div class="cart-thumb"><img src="${image}" alt="${title}"></div>
      <div class="cart-info">
        <div style="font-weight:700">${title}</div>
        <div class="row-price">${formatCurrency(price)}</div>
      </div>
      <div class="qty">
        <button aria-label="Decrease">−</button>
        <input type="number" min="1" value="${item.qty}">
        <button aria-label="Increase">+</button>
      </div>
      <button class="btn ghost" data-remove>Remove</button>
    `;
    const [minus, input, plus] = row.querySelectorAll('.qty button, .qty input');
    minus.addEventListener('click', ()=> setQty(item.id, Number(input.value)-1));
    plus.addEventListener('click', ()=> setQty(item.id, Number(input.value)+1));
    input.addEventListener('change', ()=> setQty(item.id, Number(input.value)));
    row.querySelector('[data-remove]').addEventListener('click', ()=> removeFromCart(item.id));
    cartList.appendChild(row);
  });
  renderCartTotals();
}

function cartTotals(){
  const subtotal = cart.reduce((a,c)=> a + (Number(c.price)||0) * (Number(c.qty)||0), 0);
  const shipping = subtotal>0 ? 199 : 0;
  const total = subtotal + shipping;
  return { subtotal, shipping, total };
}

function renderCartTotals(){
  if(!cartTotalEl) return;
  const { subtotal, shipping, total } = cartTotals();
  cartTotalEl.textContent = `${formatCurrency(total)} (Subtotal: ${formatCurrency(subtotal)} + Shipping: ${formatCurrency(shipping)})`;
  updateCartBadge();
}


// ===== Checkout =====

function renderCheckout(){
  if(!coItems || !coTotal) return;
  const { subtotal, shipping, total } = cartTotals();
  coTotal.textContent = formatCurrency(total);
  coItems.innerHTML = cart.map(c=>{
    const p = findProductById(c.id) || {};
    const title = escapeHtml(c.title || p.title || 'Item');
    return `<div>×${c.qty} — ${title}</div>`;
  }).join('') +
  `<div style="margin-top:8px">Subtotal: ${formatCurrency(subtotal)} • Shipping: ${formatCurrency(shipping)}</div>`;
}

async function placeOrder(method, paymentData = {}) {
  try {
    const order = {
      items: cart,
      total: cartTotals().total,
      customer: {
        name: $("#coName")?.value || "Guest",
        email: $("#coEmail")?.value || "guest@example.com",
        phone: $("#coPhone")?.value || "",
        address: $("#coAddress")?.value || "",
      },
      payment: {
        method,
        ...paymentData
      }
    };

    const res = await fetch(`${API_BASE}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order),
    });

    const data = await res.json();
    if (data.success) {
      toast("Order placed successfully!");
     cart = [];
persistCart();
      window.location.href = "account.html"; // redirect to account/orders page
    } else {
      toast("Order failed: " + data.error);
    }
  } catch (err) {
    console.error("Order error:", err);
    toast("Something went wrong placing order");
  }
  finally{ 
  hideLoader(); 
  }
}

  // ==== Razorpay Checkout ====

async function startRazorpayCheckout() {
  if (!cart || cart.length === 0) {
    alert("Your cart is empty");
    return;
  }

  const { total } = cartTotals();
  const amount = total * 100; // convert to paise

  // 1. Create Razorpay order from backend
  const orderResponse = await fetch(`${API_BASE}/payments/create-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount })
  });

  const orderData = await orderResponse.json();
  if (!orderData.success) {
    alert("Failed to create order");
    return;
  }

  // 2. Razorpay options
  const options = {
    key: "rzp_test_1234567890abcdef", // replace later with live
    amount: orderData.order.amount,
    currency: orderData.order.currency,
    order_id: orderData.order.id,
    name: "Unicleya",
    description: "Order Payment",
    handler: async function (response) {
      // 3. Send payment details back to backend for verification + save order
      const verifyResponse = await fetch(`${API_BASE}/payments/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_signature: response.razorpay_signature,
          cart,
          total
        })
      });

      const verifyData = await verifyResponse.json();
      if (verifyData.success) {
        alert("Payment successful ✅");
       cart = [];
        persistCart(); // clear cart
        window.location.href = "account.html"; // redirect to orders page
      } else {
        alert("Payment verification failed ❌");
      }
    },
    prefill: {
      name: document.querySelector("#coName")?.value || "Guest",
      email: document.querySelector("#coEmail")?.value || "guest@example.com",
      contact: document.querySelector("#coPhone")?.value || ""
    },
    theme: { color: "#3399cc" }
  };

  const rzp = new Razorpay(options);
  rzp.open();
}
// ===== Search (with history + suggestions) =====
function saveRecentSearch(q){
  q = (q||'').trim();
  if(!q) return;
  recentSearches = [q, ...recentSearches.filter(s=>s.toLowerCase()!==q.toLowerCase())].slice(0,10);
  localStorage.setItem('unicleya_recent_searches', JSON.stringify(recentSearches));

  const user = getUser();
  if(user){
    const key = `unicleya_recent_searches:${user.email || user.name || 'user'}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const merged = [q, ...existing.filter(s=>s.toLowerCase()!==q.toLowerCase())].slice(0,20);
    localStorage.setItem(key, JSON.stringify(merged));
  }
}

function renderSuggestions(){
  if(!suggestionsBox || !searchInput) return;
  const q = (searchText||'').trim().toLowerCase();
  const pool = recentSearches;
  let items = pool.filter(s=> !q || s.toLowerCase().includes(q)).slice(0,8);
  if(!items.length){ suggestionsBox.classList.remove('show'); return; }
  suggestionsBox.innerHTML = items.map(s=>`<div class="sug" role="option">${escapeHtml(s)}</div>`).join('');
  suggestionsBox.classList.add('show');
  $$('.sug').forEach(el=> el.addEventListener('click', ()=>{
    searchInput.value = el.textContent;
    searchText = el.textContent;
    saveRecentSearch(searchText);
    suggestionsBox.classList.remove('show');
    renderListings();
  }));
}

// ===== Auth Modal (2-step) =====
function openAuth(){
  closeAccountPopup();
  if(!authModal) return;
  authModal.style.display='flex';
  requestAnimationFrame(()=> authModal.classList.add('show'));
  // setTimeout(()=> authModal.classList.add('show'), 10);
  if(loginStep1){ loginStep1.style.display='block'; }
  if(loginStep2){ loginStep2.style.display='none'; }
  if(loginError){ loginError.style.display='none'; }
  if(loginError2){ loginError2.style.display='none'; }
}
function closeAuth(){
  if(!authModal) return;
  authModal.classList.remove('show');
  setTimeout(()=> authModal.style.display='none', 180);
}

function getUser(){
  return JSON.parse(localStorage.getItem('unicleya_user')||'null');
}

function updateHeaderAuthUI(){
  const user = getUser();
  if(user){
    const lb = $('#loginBtn');
    if(lb) lb.style.display='none';
    if(accountBtn) accountBtn.textContent = 'Account';
  }else{
    const lb = $('#loginBtn');
    if(lb) lb.style.display='inline-block';
    if(accountBtn) accountBtn.textContent = 'Account';
  }
}

// Toggle Account Popup
function toggleAccountPopup(show) {
  const accountPopup = document.getElementById("accountPopup");
    if (!accountPopup) return;
  // const authModal = document.getElementById("authModal");

  if (show) {
    // Always close auth when opening account (Safari-safe)
    closeAuth();
    accountPopup.style.display = "flex";
    accountPopup.classList.add("show");
    renderAccount();
  } else {
    closeAccountPopup();
  }
}


// --- Helpers (add near your other utils) ---
function closeAccountPopup() {
  const accountPopup = document.getElementById("accountPopup");
  if (!accountPopup) return;
  accountPopup.classList.remove("show");
  accountPopup.style.display = "none";
}

// Render account
function renderAccount(){
  if(!accountArea) return;
  const user = getUser();
  if(user){
    accountArea.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
        <div>
          <div style="font-weight:800">${escapeHtml(user.name || user.email || 'User')}</div>
          <div class="small">${escapeHtml(user.email || '')}</div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="ghost" id="deleteAccount">Delete account</button>
          <button class="ghost" id="signout">Sign out</button>
        </div>
      </div>`;
    $('#signout')?.addEventListener('click', ()=>{
      localStorage.removeItem('unicleya_user');
      localStorage.removeItem('unicleya_token');
      renderAccount();
      updateHeaderAuthUI();
      toast('Signed out');
    });
    $('#deleteAccount')?.addEventListener('click', async ()=>{
      localStorage.removeItem('unicleya_user');
      localStorage.removeItem('unicleya_token');
      renderAccount();
      updateHeaderAuthUI();
      toast('Account deleted (local)');
    });
  }else{
    accountArea.innerHTML = `<div class="small">You are not signed in.</div>
      <div style="margin-top:8px"><button class="btn" id="openAuthFromAcc">Sign in / Register</button></div>`;

$('#openAuthFromAcc')?.addEventListener('click', (e) => {
  e.preventDefault();
  closeAccountPopup(); // close "My Account" first (works reliably in Safari)
  openAuth();          // then open the Sign in/Register modal
});

  }
}

// ===== Event wiring (only if elements exist) =====
if(loginBtn) loginBtn.addEventListener('click', openAuth);
if(authClose) authClose.addEventListener('click', closeAuth);
if(authModal) authModal.addEventListener('click', (e)=>{ if(e.target === authModal) closeAuth(); });
document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeAuth(); });

if(tabs.length){
  tabs.forEach(t => t.addEventListener('click', ()=>{
    tabs.forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    const tab = t.dataset.tab;
    const isLogin = tab==='login';
    if(loginStep1) loginStep1.style.display = isLogin ? 'block' : 'none';
    if(loginStep2) loginStep2.style.display = 'none';
    if(registerForm) registerForm.style.display = isLogin ? 'none' : 'block';
    if(loginError) loginError.style.display = 'none';
    if(loginError2) loginError2.style.display = 'none';
  }));
}
$('#toLogin')?.addEventListener('click', ()=> tabs[0]?.click());
switchToRegister?.addEventListener('click', (e)=>{ e.preventDefault(); tabs[1]?.click(); });

// Step1 submit
loginStep1?.addEventListener('submit', (e)=>{
  e.preventDefault();
  const fd = new FormData(loginStep1);
  pendingIdentifier = (fd.get('identifier')||'').trim();
  if(!pendingIdentifier){ if(loginError){ loginError.textContent='Enter email or mobile'; loginError.style.display='block'; } return; }
  if(loginError) loginError.style.display='none';
  if(whoLabel) whoLabel.textContent = pendingIdentifier;
  if(loginStep1) loginStep1.style.display='none';
  if(loginStep2) loginStep2.style.display='block';
});

// Step2 submit (actual login)
loginStep2?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  if(loginError2) loginError2.style.display='none';
  const btn = $('#loginSubmit');
  if(btn) btn.disabled = true;
  try{
    const fd = new FormData(loginStep2);
    const password = fd.get('password');
    const payload = { email: pendingIdentifier, password };
    const data = await apiFetch('/api/login', { method: 'POST', body: JSON.stringify(payload) });
    if(data && (data.success || data.user)){
      if(data.token) localStorage.setItem('unicleya_token', data.token);
      localStorage.setItem('unicleya_user', JSON.stringify(data.user || { email: pendingIdentifier }));
      // merge anonymous recent searches into user-scoped
      const key = `unicleya_recent_searches:${(data.user && (data.user.email||data.user.name)) || pendingIdentifier}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const merged = [...recentSearches, ...existing].reduce((acc, s)=> acc.includes(s)?acc:[...acc,s], []).slice(0,20);
      localStorage.setItem(key, JSON.stringify(merged));
      renderAccount();
      closeAuth();
      toast('Signed in');
      updateHeaderAuthUI();
      await loadCartFromBackend();
    }else{
      if(loginError2){ loginError2.textContent = data?.message || 'Login failed'; loginError2.style.display='block'; }
    }
  }catch(err){
    console.error(err);
    if(loginError2){ loginError2.textContent = 'Network error. Try again.'; loginError2.style.display='block'; }
  }finally{
    if(btn) btn.disabled = false;
  }
});

// Register submit
registerForm?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  if(registerError) registerError.style.display='none';
  const btn = $('#registerSubmit');
  if(btn) btn.disabled = true;
  try{
    const fd = new FormData(registerForm);
    const name = fd.get('name');
    const email = fd.get('email');
    const mobile = fd.get('phone');
    const password = fd.get('password');
    const confirm = fd.get('confirm');
    if(password !== confirm){
      if(registerError){ registerError.textContent = 'Passwords do not match'; registerError.style.display='block'; }
      return;
    }
    const data = await apiFetch('/api/register', { method:'POST', body: JSON.stringify({ name, email, mobile, password }) });
    if(data && (data.success || data.user)){
      if(data.token) localStorage.setItem('unicleya_token', data.token);
      localStorage.setItem('unicleya_user', JSON.stringify(data.user || { name, email }));
      renderAccount();
      closeAuth();
      toast('Account created');
      updateHeaderAuthUI();
      await syncCartBackend(); // push guest cart
    }else{
      if(registerError){ registerError.textContent = data?.message || 'Registration failed'; registerError.style.display='block'; }
    }
  }catch(err){
    console.error(err);
    if(registerError){ registerError.textContent = 'Network error. Try again.'; registerError.style.display='block'; }
  }finally{
    if(btn) btn.disabled = false;
  }
});

// ===== Nav & overlay =====
const hamburger = $('#hamburger');
const sideNav = $('#sideNav');
const overlay = $('#overlay');
const closeNav = $('#closeNav');
hamburger?.addEventListener('click', ()=>{ hamburger.classList.toggle('active'); sideNav?.classList.toggle('show'); overlay?.classList.toggle('show'); });
closeNav?.addEventListener('click', ()=>{ hamburger?.classList.remove('active'); sideNav?.classList.remove('show'); overlay?.classList.remove('show'); });
overlay?.addEventListener('click', ()=>{ hamburger?.classList.remove('active'); sideNav?.classList.remove('show'); overlay?.classList.remove('show'); });

cartBtn?.addEventListener('click', ()=> window.location.href='cart.html');
accountBtn?.addEventListener('click', ()=> toggleAccountPopup(true));

// Always close Account before opening Auth
loginBtn?.addEventListener('click', (e)=> { 
  e.preventDefault(); 
  closeAccountPopup(); 
  openAuth(); 
});

//checkout page payment logic


// Cart footer buttons
$('#clearCartBtn')?.addEventListener('click', ()=>{ cart=[]; persistCart(); renderCart(); });
$('#toCheckoutBtn')?.addEventListener('click', ()=> window.location.href='checkout.html');

// Checkout buttons
$('#backToCart')?.addEventListener('click', ()=> window.location.href='cart.html');
$("#placeOrderBtn")?.addEventListener("click", startRazorpayCheckout);

// Home logo
$('#homeLogo')?.addEventListener('click', ()=> window.location.href='index.html');
$('#homeLogo')?.addEventListener('keydown', (e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); window.location.href='index.html'; } });

// Search input
if(searchInput){
  const onSearchInput = debounce((e)=>{
    searchText = e.target.value;
    $('#clearSearch')?.classList.toggle('show', !!searchText);
    renderSuggestions();
  }, 120);
  searchInput.addEventListener('input', onSearchInput);
}
searchForm?.addEventListener('submit', (e)=>{
  e.preventDefault();
  searchText = searchInput?.value?.trim() || '';
  saveRecentSearch(searchText);
  renderListings();
  suggestionsBox?.classList.remove('show');
});
clearSearchBtn?.addEventListener('click', ()=>{ searchText=''; if(searchInput) searchInput.value=''; clearSearchBtn.classList.remove('show'); renderListings(); suggestionsBox?.classList.remove('show'); });

// Category chips
categoryWrap?.addEventListener('click', (e)=>{
  const chip = e.target.closest('.chip');
  if(!chip) return;
  $$('.chip').forEach(c=>c.classList.remove('selected'));
  chip.classList.add('selected');
  activeCategory = chip.dataset.cat || 'all';
  renderListings();
});

// ===== Init =====
(function init(){
  const y = new Date().getFullYear();
  const yearEl = document.getElementById('year'); if(yearEl) yearEl.textContent = y;
  const yearEl2 = document.getElementById('year2'); if(yearEl2) yearEl2.textContent = y;
  updateHeaderAuthUI();
  renderAccount();
  updateCartBadge();
  // Only load products on home page
  if($('#listings')) loadProducts();
  // Load cart UI if on cart page
  if($('#cartList')) renderCart();
  // Load checkout summary
  if($('#coItems')) renderCheckout();
  // Try to fetch server cart if logged in
  loadCartFromBackend();
})();
