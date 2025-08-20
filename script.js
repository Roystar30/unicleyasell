// ===== Core config =====
    const API_BASE = 'https://unicleya-backend.onrender.com'; // your Render backend

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
    const loginForm = $('#loginForm');
    const registerForm = $('#registerForm');
    const loginBtn = $('#loginBtn');
    const accountBtn = $('#accountBtn');
    const authClose = $('#authClose');
    const tabs = $$('.tab');
    const loginError = $('#loginError');
    const registerError = $('#registerError');
    
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
        <div class="product-card">
          <div class="product-media"><img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" loading="lazy"></div>
          <div class="product-body">
            <h4 class="product-title">${escapeHtml(title)}</h4>
            <p class="product-desc">${escapeHtml(desc)}</p>
            <div class="specs">
              ${specs.map(s=>`<span class="spec">${escapeHtml(s)}</span>`).join('')}
            </div>
          </div>
          <div class="product-actions">
            <div class="price">${price}</div>
            <button class="btn primary" data-action="add" data-id="${escapeHtml(id)}">Add to Cart</button>
            <button class="btn ghost" data-action="view" data-id="${escapeHtml(id)}">Details</button>
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
  listingsRoot.innerHTML = items.map(it => {
    const price = typeof it.price === 'number' ? `₹${it.price}` : (it.price || '—');
    const desc = it.desc || it.description || '';
    const title = it.title || it.name || 'Untitled';
    const id = it._id || it.id || '';
    return `
      <div class="listing">
        <h4>${escapeHtml(title)}</h4>
        <p>${escapeHtml(desc)}</p>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px">
          <div style="color:var(--accent);font-weight:800">${price}</div>
          <div style="display:flex;gap:8px">
            <button class="btn" data-id="${id}" data-action="add">Add</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
  // wire buttons (no demo cart; stub only)
  $$('#listings [data-action="add"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      toast('Added to cart');
      btn.disabled = true;
      setTimeout(()=>{ btn.disabled=false; }, 800);
    });
  });
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
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

    // ===== Search =====
    const onSearch = debounce((e)=>{
      searchText = e.target.value;
      $('#clearSearch').classList.toggle('show', !!searchText);
      renderListings();
    }, 200);
    searchInput.addEventListener('input', onSearch);
    searchInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); } });
    clearSearchBtn.addEventListener('click', ()=>{ searchText=''; searchInput.value=''; clearSearchBtn.classList.remove('show'); renderListings(); });

    // ===== Category chips =====
    categoryWrap.addEventListener('click', (e)=>{
      const chip = e.target.closest('.chip');
      if(!chip) return;
      $$('.chip').forEach(c=>c.classList.remove('selected'));
      chip.classList.add('selected');
      activeCategory = chip.dataset.cat || 'all';
      renderListings();
    });

    // ---------- Auth Modal ----------
function openAuth(){
  authModal.style.display='flex';
  setTimeout(()=> authModal.classList.add('show'), 10);
}
function closeAuth(){
  authModal.classList.remove('show');
  setTimeout(()=> authModal.style.display='none', 180);
}
loginBtn.addEventListener('click', openAuth);
authClose.addEventListener('click', closeAuth);
// close on outside click
authModal.addEventListener('click', (e)=>{
  if(e.target === authModal) closeAuth();
});
document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeAuth(); });

tabs.forEach(t => t.addEventListener('click', ()=>{
  tabs.forEach(x=>x.classList.remove('active'));
  t.classList.add('active');
  const tab = t.dataset.tab;
  const loginOn = tab==='login';
  loginForm.style.display = loginOn ? 'block' : 'none';
  registerForm.style.display = loginOn ? 'none' : 'block';
  loginError.style.display = 'none';
  registerError.style.display = 'none';
}));

$('#toRegister').addEventListener('click', ()=> tabs[1].click());
$('#toLogin').addEventListener('click', ()=> tabs[0].click());

function toast(msg){
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.position='fixed';
  el.style.left='50%';
  el.style.transform='translateX(-50%)';
  el.style.bottom='28px';
  el.style.background='rgba(0,0,0,0.6)';
  el.style.color='var(--soft)';
  el.style.padding='10px 16px';
  el.style.borderRadius='10px';
  el.style.zIndex=120;
  document.body.appendChild(el);
  setTimeout(()=> el.remove(), 2200);
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
      closeNav.click();
      routeTo('page-' + route);
    }));

    // Header buttons
    cartBtn.addEventListener('click', ()=> routeTo('page-cart'));
    $('#accountBtn').addEventListener('click', ()=> routeTo('page-account'));
    $('#loginBtn').addEventListener('click', ()=> toast('Auth modal can be wired here'));

    // Cart footer buttons
    $('#clearCartBtn').addEventListener('click', ()=>{ cart=[]; persistCart(); renderCart(); });
    $('#toCheckoutBtn').addEventListener('click', ()=> routeTo('page-checkout'));

    // Checkout buttons
    $('#backToCart').addEventListener('click', ()=> routeTo('page-cart'));
    $('#placeOrderBtn').addEventListener('click', placeOrder);

    // Home logo
    $('#homeLogo').addEventListener('click', ()=> routeTo('page-home'));
    $('#homeLogo').addEventListener('keydown', (e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); routeTo('page-home'); } });

   // Render account
function renderAccount(){
  const user = JSON.parse(localStorage.getItem('unicleya_user')||'null');
  if(user){
    accountArea.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-weight:800">${escapeHtml(user.name || user.email || 'User')}</div>
          <div class="small">${escapeHtml(user.email || '')}</div>
        </div>
        <div><button class="ghost" id="signout">Sign out</button></div>
      </div>`;
    $('#signout').addEventListener('click', ()=>{
      localStorage.removeItem('unicleya_user');
      localStorage.removeItem('unicleya_token');
      renderAccount();
      toast('Signed out');
    });
  }else{
    accountArea.innerHTML = `<div style="color:var(--muted)">You are not signed in.</div>
      <div style="margin-top:8px"><button class="btn" id="openAuthFromAcc">Sign in / Register</button></div>`;
    $('#openAuthFromAcc')?.addEventListener('click', openAuth);
  }
}
// Login submit
loginForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  loginError.style.display='none';
  const btn = $('#loginSubmit');
  btn.disabled = true;
  try{
    const fd = new FormData(loginForm);
    const payload = { email: fd.get('email'), password: fd.get('password') };
    const res = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if(data && (data.success || data.user)){
      if(data.token) localStorage.setItem('unicleya_token', data.token);
      localStorage.setItem('unicleya_user', JSON.stringify(data.user || { email: payload.email }));
      renderAccount();
      closeAuth();
      toast('Signed in');
    }else{
      loginError.textContent = data?.message || 'Login failed';
      loginError.style.display='block';
    }
  }catch(err){
    console.error(err);
    loginError.textContent = 'Network error. Try again.';
    loginError.style.display='block';
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

    // ===== Init =====
    (function init(){
      document.getElementById('year').textContent = new Date().getFullYear();
      document.getElementById('year2').textContent = new Date().getFullYear();
      renderAccount();
      updateCartBadge();
      loadProducts();
    })();
