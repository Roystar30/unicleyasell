// ===== Core config =====
const API_BASE = 'https://unicleya-backend.onrender.com'; // Render backend

// ===== Shorthand =====
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

// ===== Elements =====
const progress = $('#progress');
const loader = $('#loader');
const listingsRoot = $('#listings');
const resultMeta = $('#resultMeta');
const searchInput = $('#searchInput');
const clearSearchBtn = $('#clearSearch');
const searchForm = $('#searchForm');
const searchBtn = $('#doSearch');
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

// Pages
const pageHome = $('#page-home');
const pageCart = $('#page-cart');
const pageCheckout = $('#page-checkout');
const pageAccount = $('#page-account');

// ===== State =====
let allProducts = [];
let activeCategory = 'all';
let searchText = '';
let cart = JSON.parse(localStorage.getItem('unicleya_cart') || '[]'); // [{id,qty,price,title,image}]
let recentSearches = JSON.parse(localStorage.getItem('unicleya_recent_searches') || '[]'); // [q1,q2,...]
let recentViews = JSON.parse(localStorage.getItem('unicleya_recent_views') || '[]'); // [{id,title,image}]

let pendingIdentifier = null;

// ===== Utilities =====
function showProgress(){ progress.style.width = '6%'; progress.style.transition='width .8s ease'; setTimeout(()=>progress.style.width='55%', 80); }
function hideProgress(){ progress.style.width = '0'; progress.style.transition='width .6s ease 0.2s'; }
function showLoader(){ loader.style.display = 'flex'; }
function hideLoader(){ loader.style.display = 'none'; }

function toast(msg){
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.position='fixed'; el.style.left='50%'; el.style.transform='translateX(-50%)'; el.style.bottom='28px';
  el.style.background='rgba(0,0,0,0.8)'; el.style.color='#fff'; el.style.padding='10px 16px'; el.style.borderRadius='10px'; el.style.zIndex=1200;
  document.body.appendChild(el); setTimeout(()=> el.remove(), 2000);
}

function debounce(fn, wait=250){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), wait); } }

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#039;'}[m])); }

function routeTo(id){
  $$('.page').forEach(p=>{ p.classList.remove('show'); p.style.display='none'; });
  const el = document.getElementById(id);
  if(el){ el.style.display='block'; el.classList.add('show'); window.scrollTo({top:0,behavior:'smooth'}); }
  // update side nav active
  $$('.nav-item').forEach(n=> n.classList.toggle('active', n.dataset.route === id.replace('page-','')));
  if(id==='page-cart') renderCart();
  if(id==='page-checkout') renderCheckout();
  if(id==='page-account') renderAccount();
}

// ===== Products =====
async function loadProducts(){
  try{
    showProgress(); showLoader();
    const res = await fetch(`${API_BASE}/api/products`, { credentials:'include' });
    const data = await res.json();
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
  const items = getFiltered();
  resultMeta.textContent = items.length ? `${items.length} item(s)` : 'No results';
  listingsRoot.innerHTML = items.map(productToCard).join('');

  // Wire actions
  $$('#listings [data-action="add"]').forEach(btn=>{
    btn.addEventListener('click', ()=> addToCart(btn.dataset.id));
  });
  $$('#listings [data-action="buy"]').forEach(btn=>{
    btn.addEventListener('click', ()=> { addToCart(btn.dataset.id); routeTo('page-checkout'); });
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

// ===== Cart =====
function persistCart(){ localStorage.setItem('unicleya_cart', JSON.stringify(cart)); updateCartBadge(); }
function updateCartBadge(){ const count = cart.reduce((a,c)=>a + Number(c.qty||0), 0); cartCountEl.textContent = String(count); }

function findProductById(id){ return allProducts.find(p => (p._id||p.id||'')===id); }

function addToCart(id){
  const p = findProductById(id);
  if(!p){ toast('Item not found'); return; }
  const existing = cart.find(x => x.id===id);
  if(existing){ existing.qty += 1; }
  else{
    cart.push({ id, qty:1, price: Number(p.price)||0, title: p.title||p.name||'Item', image: p.image || (p.images && p.images[0])});
  }
  persistCart(); toast('Added to cart');
}

function removeFromCart(id){ cart = cart.filter(x=>x.id!==id); persistCart(); renderCart(); }
function setQty(id, qty){ const it = cart.find(x=>x.id===id); if(!it) return; it.qty = Math.max(1, qty|0); persistCart(); renderCartTotals(); }

function formatCurrency(n){ if(isNaN(n)) return '₹0'; return `₹${n.toLocaleString('en-IN')}`; }

function renderCart(){
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
  const shipping = subtotal>0 ? 199 : 0; // flat for demo
  const total = subtotal + shipping;
  return { subtotal, shipping, total };
}

function renderCartTotals(){
  const { total } = cartTotals();
  cartTotalEl.textContent = formatCurrency(total);
  updateCartBadge();
}

// ===== Checkout =====
function renderCheckout(){
  const { subtotal, shipping, total } = cartTotals();
  coTotal.textContent = formatCurrency(total);
  coItems.innerHTML = cart.map(c=>{
    const p = findProductById(c.id) || {};
    const title = escapeHtml(c.title || p.title || 'Item');
    return `<div>×${c.qty} — ${title}</div>`;
  }).join('') +
  `<div style="margin-top:8px">Subtotal: ${formatCurrency(subtotal)} • Shipping: ${formatCurrency(shipping)}</div>`;
}

async function placeOrder(){
  if(cart.length===0){ toast('Your cart is empty'); return; }
  const name = $('#coName').value.trim();
  const phone = $('#coPhone').value.trim();
  const email = $('#coEmail').value.trim();
  const address = $('#coAddress').value.trim();
  const payment = $('#coPayment').value;
  if(!name || !phone || !email || !address){ toast('Please fill all details'); return; }

  const order = { name, phone, email, address, payment, items: cart, totals: cartTotals() };

  try{
    showLoader();
    const res = await fetch(`${API_BASE}/api/orders`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(order) });
    const data = await res.json().catch(()=>({}));
    $('#checkoutMsg').style.display='block';
    $('#checkoutMsg').textContent = data?.message || 'Order placed! We\'ll contact you shortly.';
    cart = []; persistCart(); updateCartBadge();
  }catch(err){ console.error(err); toast('Could not place order right now'); }
  finally{ hideLoader(); }
}

// ===== Search (with history + suggestions) =====
function saveRecentSearch(q){
  q = (q||'').trim();
  if(!q) return;
  recentSearches = [q, ...recentSearches.filter(s=>s.toLowerCase()!==q.toLowerCase())].slice(0,10);
  localStorage.setItem('unicleya_recent_searches', JSON.stringify(recentSearches));

  // If logged in, also sync to user-namespaced key
  const user = getUser();
  if(user){
    const key = `unicleya_recent_searches:${user.email || user.name || 'user'}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const merged = [q, ...existing.filter(s=>s.toLowerCase()!==q.toLowerCase())].slice(0,20);
    localStorage.setItem(key, JSON.stringify(merged));
  }
}

function renderSuggestions(){
  const q = searchText.trim().toLowerCase();
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

const onSearchInput = debounce((e)=>{
  searchText = e.target.value;
  $('#clearSearch').classList.toggle('show', !!searchText);
  renderSuggestions();
}, 120);
searchInput.addEventListener('input', onSearchInput);

searchForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  searchText = searchInput.value.trim();
  saveRecentSearch(searchText);
  renderListings();
  suggestionsBox.classList.remove('show');
});
clearSearchBtn.addEventListener('click', ()=>{ searchText=''; searchInput.value=''; clearSearchBtn.classList.remove('show'); renderListings(); suggestionsBox.classList.remove('show'); });

// ===== Category chips =====
categoryWrap.addEventListener('click', (e)=>{
  const chip = e.target.closest('.chip');
  if(!chip) return;
  $$('.chip').forEach(c=>c.classList.remove('selected'));
  chip.classList.add('selected');
  activeCategory = chip.dataset.cat || 'all';
  renderListings();
});

// ---------- Auth Modal (2-step) ----------
function openAuth(){
  authModal.style.display='flex';
  setTimeout(()=> authModal.classList.add('show'), 10);
  // reset to step1
  loginStep1.style.display='block';
  loginStep2.style.display='none';
  loginError.style.display='none';
  loginError2.style.display='none';
}
function closeAuth(){
  authModal.classList.remove('show');
  setTimeout(()=> authModal.style.display='none', 180);
}
loginBtn.addEventListener('click', openAuth);
authClose.addEventListener('click', closeAuth);
// outside click
authModal.addEventListener('click', (e)=>{ if(e.target === authModal) closeAuth(); });
document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeAuth(); });

tabs.forEach(t => t.addEventListener('click', ()=>{
  tabs.forEach(x=>x.classList.remove('active'));
  t.classList.add('active');
  const tab = t.dataset.tab;
  const isLogin = tab==='login';
  loginStep1.style.display = isLogin ? 'block' : 'none';
  loginStep2.style.display = 'none';
  registerForm.style.display = isLogin ? 'none' : 'block';
  loginError.style.display = 'none';
  loginError2.style.display = 'none';
}));

$('#toLogin')?.addEventListener('click', ()=> tabs[0].click());
switchToRegister?.addEventListener('click', (e)=>{ e.preventDefault(); tabs[1].click(); });

// Step1 submit
loginStep1.addEventListener('submit', (e)=>{
  e.preventDefault();
  const fd = new FormData(loginStep1);
  pendingIdentifier = (fd.get('identifier')||'').trim();
  if(!pendingIdentifier){ loginError.textContent='Enter email or mobile'; loginError.style.display='block'; return; }
  loginError.style.display='none';
  // Move to step2; backend existence check can be added here if available
  whoLabel.textContent = pendingIdentifier;
  loginStep1.style.display='none';
  loginStep2.style.display='block';
});

// Step2 submit (actual login)
loginStep2.addEventListener('submit', async (e)=>{
  e.preventDefault();
  loginError2.style.display='none';
  const btn = $('#loginSubmit');
  btn.disabled = true;
  try{
    const fd = new FormData(loginStep2);
    const password = fd.get('password');
    const payload = { email: pendingIdentifier, password };
    const res = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
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
    }else{
      loginError2.textContent = data?.message || 'Login failed';
      loginError2.style.display='block';
    }
  }catch(err){
    console.error(err);
    loginError2.textContent = 'Network error. Try again.';
    loginError2.style.display='block';
  }finally{
    btn.disabled = false;
  }
});

// Register submit (calls backend if available)
registerForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  registerError.style.display='none';
  const btn = $('#registerSubmit');
  btn.disabled = true;
  try{
    const fd = new FormData(registerForm);
    const name = fd.get('name');
    const email = fd.get('email');
    const mobile = fd.get('phone');
    const password = fd.get('password');
    const confirm = fd.get('confirm');
    if(password !== confirm){
      registerError.textContent = 'Passwords do not match';
      registerError.style.display='block';
      return;
    }
    const res = await fetch(`${API_BASE}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ name, email, mobile, password })
    });
    const data = await res.json();
    if(data && (data.success || data.user)){
      if(data.token) localStorage.setItem('unicleya_token', data.token);
      localStorage.setItem('unicleya_user', JSON.stringify(data.user || { name, email }));
      renderAccount();
      closeAuth();
      toast('Account created');
      updateHeaderAuthUI();
    }else{
      registerError.textContent = data?.message || 'Registration failed';
      registerError.style.display='block';
    }
  }catch(err){
    console.error(err);
    registerError.textContent = 'Network error. Try again.';
    registerError.style.display='block';
  }finally{
    btn.disabled = false;
  }
});

function getUser(){
  return JSON.parse(localStorage.getItem('unicleya_user')||'null');
}

function updateHeaderAuthUI(){
  const user = getUser();
  if(user){
    $('#loginBtn').style.display='none';
    $('#accountBtn').textContent = 'Account';
  }else{
    $('#loginBtn').style.display='inline-block';
    $('#accountBtn').textContent = 'Account';
  }
}

// Render account
function renderAccount(){
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
    $('#signout').addEventListener('click', ()=>{
      localStorage.removeItem('unicleya_user');
      localStorage.removeItem('unicleya_token');
      renderAccount();
      updateHeaderAuthUI();
      toast('Signed out');
    });
    $('#deleteAccount').addEventListener('click', async ()=>{
      // optional: call backend to delete account if endpoint exists
      localStorage.removeItem('unicleya_user');
      localStorage.removeItem('unicleya_token');
      renderAccount();
      updateHeaderAuthUI();
      toast('Account deleted (local)');
    });
  }else{
    accountArea.innerHTML = `<div class="small">You are not signed in.</div>
      <div style="margin-top:8px"><button class="btn" id="openAuthFromAcc">Sign in / Register</button></div>`;
    $('#openAuthFromAcc')?.addEventListener('click', openAuth);
  }
}

// ===== Nav & overlay =====
const hamburger = $('#hamburger');
const sideNav = $('#sideNav');
const overlay = $('#overlay');
const closeNav = $('#closeNav');
hamburger.addEventListener('click', ()=>{ hamburger.classList.toggle('active'); sideNav.classList.toggle('show'); overlay.classList.toggle('show'); });
closeNav.addEventListener('click', ()=>{ hamburger.classList.remove('active'); sideNav.classList.remove('show'); overlay.classList.remove('show'); });
overlay.addEventListener('click', ()=>{ hamburger.classList.remove('active'); sideNav.classList.remove('show'); overlay.classList.remove('show'); });

// Side nav routing
$$('.nav-item').forEach(link=> link.addEventListener('click', ()=>{
  const route = link.dataset.route;
  if(route){ closeNav.click(); routeTo('page-' + route); }
}));

// Header buttons
cartBtn.addEventListener('click', ()=> routeTo('page-cart'));
accountBtn.addEventListener('click', ()=> routeTo('page-account'));
loginBtn.addEventListener('click', openAuth); // removed old toast

// Cart footer buttons
$('#clearCartBtn').addEventListener('click', ()=>{ cart=[]; persistCart(); renderCart(); });
$('#toCheckoutBtn').addEventListener('click', ()=> routeTo('page-checkout'));

// Checkout buttons
$('#backToCart').addEventListener('click', ()=> routeTo('page-cart'));
$('#placeOrderBtn').addEventListener('click', placeOrder);

// Home logo
$('#homeLogo').addEventListener('click', ()=> routeTo('page-home'));
$('#homeLogo').addEventListener('keydown', (e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); routeTo('page-home'); } });

// ===== Init =====
(function init(){
  const y = new Date().getFullYear();
  const yearEl = document.getElementById('year'); if(yearEl) yearEl.textContent = y;
  updateHeaderAuthUI();
  renderAccount();
  updateCartBadge();
  loadProducts();
})();
