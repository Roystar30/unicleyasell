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

    const pageHome = $('#page-home');
    const pageCart = $('#page-cart');
    const pageCheckout = $('#page-checkout');
    const pageAccount = $('#page-account');

    const cartBtn = $('#cartBtn');
    const cartCountEl = $('#cartCount');

    const cartList = $('#cartList');
    const cartFooter = $('#cartFooter');
    const cartEmpty = $('#cartEmpty');
    const cartTotalEl = $('#cartTotal');

    const coItems = $('#coItems');
    const coTotal = $('#coTotal');

    const accountArea = $('#accountArea');

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
        // graceful demo fallback
        allProducts = [
          { id:'demo1', title:'iPhone 12', description:'Refurbished • 128GB • Excellent', price:28000, category:'mobiles', image:'https://images.unsplash.com/photo-1603899122775-f7131b04384a?q=80&w=800&auto=format&fit=crop' },
          { id:'demo2', title:'Dell Inspiron 15', description:'Core i5 • 8GB • 512GB SSD', price:32000, category:'computers', image:'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800&auto=format&fit=crop' },
          { id:'demo3', title:'Sony WH-1000XM3', description:'Noise Cancelling • 30h battery', price:6500, category:'accessories', image:'https://images.unsplash.com/photo-1518447432257-2b1e0b3b8c18?q=80&w=800&auto=format&fit=crop' },
        ];
      }finally{ hideLoader(); hideProgress(); renderListings(); }
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
      listingsRoot.innerHTML = items.map(productToCard).join('');

      // wire buttons
      $$('#listings [data-action="add"]').forEach(btn => {
        btn.addEventListener('click', ()=> addToCart(btn.dataset.id));
      });
      $$('#listings [data-action="view"]').forEach(btn => {
        btn.addEventListener('click', ()=> toast('Details coming soon'));
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

    // Account render (simple local preview)
    function renderAccount(){
      const user = JSON.parse(localStorage.getItem('unicleya_user')||'null');
      if(user){
        accountArea.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div>
              <div style="font-weight:800">${escapeHtml(user.name || user.email || 'User')}</div>
              <div style="color:var(--muted)">${escapeHtml(user.email || '')}</div>
            </div>
            <div><button class="pill" id="signout">Sign out</button></div>
          </div>`;
        $('#signout').addEventListener('click', ()=>{ localStorage.removeItem('unicleya_user'); localStorage.removeItem('unicleya_token'); renderAccount(); toast('Signed out'); });
      }else{
        accountArea.innerHTML = `<div style="color:var(--muted)">You are not signed in.</div>`;
      }
    }

    // ===== Init =====
    (function init(){
      document.getElementById('year').textContent = new Date().getFullYear();
      document.getElementById('year2').textContent = new Date().getFullYear();
      renderAccount();
      updateCartBadge();
      loadProducts();
    })();
