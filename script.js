// Core config
const API_BASE = 'https://unicleya-backend.onrender.com';

// Elements
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

const progress = $('#progress');
const loader = $('#loader');
const listingsRoot = $('#listings');
const resultMeta = $('#resultMeta');
const searchInput = $('#searchInput');
const clearSearchBtn = $('#clearSearch');
const categoryWrap = $('#categoryChips');

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
const pageAccount = $('#page-account');
const accountArea = $('#accountArea');

// State
let allProducts = [];
let activeCategory = 'all';
let searchText = '';

// ---------- Utilities ----------
function showProgress() {
  progress.style.width = '6%';
  progress.style.transition = 'width .8s ease';
  setTimeout(() => (progress.style.width = '50%'), 100);
}
function hideProgress() {
  progress.style.width = '0';
  progress.style.transition = 'width .6s ease 0.2s';
}
function showLoader(){ loader.style.display = 'flex'; }
function hideLoader(){ loader.style.display = 'none'; }

function debounce(fn, wait = 250) {
  let t; 
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

// ---------- Navigation ----------
function showPage(id){
  $$('.page').forEach(p=>{
    if(p.id===id){ p.style.display='block'; p.classList.add('show'); }
    else { p.style.display='none'; p.classList.remove('show'); }
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
$('#homeLogo').addEventListener('click', ()=> showPage('page-home'));
$('#homeLogo').addEventListener('keydown', (e)=>{ if(e.key==='Enter' || e.key===' ') { e.preventDefault(); showPage('page-home'); } });

accountBtn.addEventListener('click', ()=> showPage('page-account'));

// ---------- Products ----------
async function loadProducts(){
  try{
    showProgress(); showLoader();
    const res = await fetch(`${API_BASE}/api/products`, { credentials: 'include' });
    const data = await res.json();
    allProducts = Array.isArray(data) ? data : (data.products || []);
  }catch(err){
    console.error('Failed to load products', err);
    allProducts = [];
  }finally{
    renderListings();
    hideLoader(); hideProgress();
  }
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

// ---------- Search ----------
const onSearch = debounce((e)=>{
  searchText = e.target.value;
  $('#searchWrap').classList.toggle('has-text', !!searchText);
  renderListings();
}, 200);
searchInput.addEventListener('input', onSearch);
searchInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); } });
clearSearchBtn.addEventListener('click', ()=>{ searchText=''; searchInput.value=''; $('#searchWrap').classList.remove('has-text'); renderListings(); });

// ---------- Category chips ----------
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

// ---------- Init ----------
(function init(){
  document.getElementById('year').textContent = new Date().getFullYear();
  renderAccount();
  loadProducts();
})();
