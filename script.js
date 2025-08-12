// script.js — Unicleya SPA behaviour
(() => {
  /* Simple helper utils */
  const qs = s => document.querySelector(s);
  const qsa = s => Array.from(document.querySelectorAll(s));
  const $ = qs;

  // Elements
  const hamburgerBtn = $('#hamburgerBtn');
  const sideNav = $('#sideNav');
  const navClose = $('#navCloseBtn');
  const overlay = $('#overlay');
  const loginBtn = $('#loginBtn');
  const loginModal = $('#loginModal');
  const closeLogin = $('#closeLogin');
  const loginForm = $('#loginForm');
  const emailInput = $('#emailInput');
  const passwordInput = $('#passwordInput');
  const openSellFromLogin = $('#openSellFromLogin');
  const searchInput = $('#searchInput');
  const searchDropdown = $('#searchDropdown');
  const searchResults = $('#searchResults');
  const clearBtn = $('#clearBtn');
  const actionCards = qsa('.action-card');
  const proceedBtn = $('#proceedBtn');
  const actionText = $('.action-text');
  const pages = qsa('.page');
  const copyYear = $('#copyYear');

  copyYear.textContent = new Date().getFullYear();

  /* Mock inventory (you can replace with real API) */
  const sampleInventory = {
    mobiles: [
      {id:'m1', title:'iPhone 12 - 64GB', desc:'Good condition', price:14500},
      {id:'m2', title:'Samsung A32 - 128GB', desc:'Excellent', price:9999},
      {id:'m3', title:'OnePlus Nord CE', desc:'Good', price:11999}
    ],
    computers: [
      {id:'c1', title:'Dell Latitude E7470', desc:'i5/8GB/256SSD', price:8999},
      {id:'c2', title:'Lenovo ThinkPad T480', desc:'i5/16GB/512SSD', price:14999}
    ]
  };

  // LocalStorage helpers
  const storage = {
    get(k){ try{return JSON.parse(localStorage.getItem(k))}catch(e){return null} },
    set(k,v){ localStorage.setItem(k, JSON.stringify(v)); }
  };

  // Init stored cart & user
  if(!storage.get('unicleya_cart')) storage.set('unicleya_cart', []);
  if(!storage.get('unicleya_user')) storage.set('unicleya_user', null);

  /* Navigation (SPA) */
  function showRoute(route){
    pages.forEach(p => {
      if(p.id === `page-${route}`) {
        p.hidden = false;
        p.classList.add('active');
      } else {
        p.hidden = true;
        p.classList.remove('active');
      }
    });
    // set active nav item
    qsa('.nav-item').forEach(a => {
      a.classList.toggle('active', a.dataset.route === route);
    });
    // special-case: show home on unknown
    if(route === 'home') {
      window.location.hash = '';
    } else {
      window.location.hash = route;
    }
    // focus content for accessibility
    setTimeout(()=> $('#appMain').focus(), 200);
  }

  // wire nav links
  qsa('.nav-item').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const route = a.dataset.route;
      showRoute(route);
      closeMenu();
    });
  });

  // open/close menu
  function openMenu(){
    sideNav.classList.add('show');
    overlay.classList.add('show');
    document.body.classList.add('sidenav-open');
    hamburgerBtn.classList.add('active');
    hamburgerBtn.setAttribute('aria-expanded','true');
    sideNav.setAttribute('aria-hidden','false');
    overlay.hidden = false;
  }
  function closeMenu(){
    sideNav.classList.remove('show');
    overlay.classList.remove('show');
    hamburgerBtn.classList.remove('active');
    hamburgerBtn.setAttribute('aria-expanded','false');
    sideNav.setAttribute('aria-hidden','true');
    overlay.hidden = true;
    document.body.classList.remove('sidenav-open');
  }
  hamburgerBtn.addEventListener('click', ()=> {
    if(sideNav.classList.contains('show')) closeMenu(); else openMenu();
  });
  navClose.addEventListener('click', closeMenu);
  overlay.addEventListener('click', ()=> {
    closeMenu();
    closeLoginModal();
  });

  // login modal
  function openLoginModal(){
    loginModal.classList.add('show');
    loginModal.setAttribute('aria-hidden','false');
    overlay.classList.add('show');
    overlay.hidden = false;
    loginBtn.setAttribute('aria-expanded','true');
    emailInput.focus();
  }
  function closeLoginModal(){
    loginModal.classList.remove('show');
    loginModal.setAttribute('aria-hidden','true');
    overlay.classList.remove('show');
    overlay.hidden = true;
    loginBtn.setAttribute('aria-expanded','false');
  }
  loginBtn.addEventListener('click', openLoginModal);
  closeLogin.addEventListener('click', closeLoginModal);
  openSellFromLogin.addEventListener('click', (e) => {
    e.preventDefault();
    closeLoginModal();
    showRoute('sell-mobile');
  });

  // mock login (not secure — replace with real auth)
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    if(!email || password.length < 6){ alert('Please enter valid credentials (password >=6)'); return; }
    const user = {email, name: email.split('@')[0], loggedAt: Date.now()};
    storage.set('unicleya_user', user);
    closeLoginModal();
    renderAccount();
    alert('Logged in (demo).');
  });

  // show account area
  function renderAccount(){
    const user = storage.get('unicleya_user');
    const area = $('#accountArea');
    if(!area) return;
    if(user){
      area.innerHTML = `<p>Signed in as <strong>${user.name}</strong> (${user.email})</p>
        <p><button id="logoutBtn">Sign out</button></p>`;
      $('#logoutBtn').addEventListener('click', () => { storage.set('unicleya_user', null); renderAccount(); alert('Signed out'); });
    } else {
      area.innerHTML = `<p>You are not signed in.</p><p><button id="showLoginFromAcc">Sign in</button></p>`;
      $('#showLoginFromAcc').addEventListener('click', openLoginModal);
    }
  }

  renderAccount();

  // keyboard escape closes modals
  document.addEventListener('keydown', e => {
    if(e.key === 'Escape') { closeLoginModal(); closeMenu(); }
  });

  /* Action card selection & proceed */
  let selectedAction = null;
  function updateActionUI(){
    actionCards.forEach(card => card.classList.toggle('selected', card.dataset.action === selectedAction));
    actionText.textContent = selectedAction ? selectedAction.replace('-', ' ').replace(/\b\w/g, c=>c.toUpperCase()) : 'No action selected';
    actionText.classList.toggle('has-selection', !!selectedAction);
    proceedBtn.disabled = !selectedAction;
  }
  actionCards.forEach(card => {
    // click and keyboard activation
    card.addEventListener('click', () => {
      selectedAction = card.dataset.action;
      const radio = card.querySelector('input[type="radio"]');
      if(radio) radio.checked = true;
      updateActionUI();
    });
    card.addEventListener('keydown', e => {
      if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
    });
  });

  proceedBtn.addEventListener('click', () => {
    if(!selectedAction) return;
    // map action to route
    const map = {
      'buy-mobile':'buy-mobile',
      'sell-mobile':'sell-mobile',
      'buy-computer':'buy-computer',
      'sell-computer':'sell-computer'
    };
    const route = map[selectedAction] || 'home';
    showRoute(route);
    // reset selection optionally
    // selectedAction = null; updateActionUI();
  });

  /* SEARCH functionality (client-side) */
  const items = [...sampleInventory.mobiles, ...sampleInventory.computers].map(it => ({
    id: it.id,
    title: it.title,
    subtitle: it.desc,
    price: it.price
  }));

  function renderSearchResults(list){
    searchResults.innerHTML = '';
    if(!list.length) {
      searchResults.innerHTML = `<div style="padding:12px;color:#666">No results</div>`;
      return;
    }
    list.forEach(i => {
      const el = document.createElement('div');
      el.className = 'search-item';
      el.tabIndex = 0;
      el.innerHTML = `<div class="search-item-icon">🔎</div>
        <div class="search-item-content"><div class="search-item-title">${i.title}</div><div class="search-item-subtitle">${i.subtitle} • ₹${i.price}</div></div>`;
      el.addEventListener('click', () => {
        // navigate to buy page and highlight or open detail
        if(i.id.startsWith('m')) showRoute('buy-mobile'); else showRoute('buy-computer');
        searchDropdown.hidden = true;
        searchInput.value = '';
        clearBtn.hidden = true;
      });
      searchResults.appendChild(el);
    });
  }

  searchInput.addEventListener('input', e => {
    const v = e.target.value.trim().toLowerCase();
    if(!v) { searchDropdown.hidden = true; clearBtn.hidden = true; return; }
    clearBtn.hidden = false;
    const filtered = items.filter(it => (it.title + ' ' + it.subtitle).toLowerCase().includes(v));
    renderSearchResults(filtered);
    searchDropdown.hidden = false;
  });
  clearBtn.addEventListener('click', () => { searchInput.value=''; clearBtn.hidden=true; searchDropdown.hidden=true; searchInput.focus(); });

  // click outside to close dropdown
  document.addEventListener('click', e => {
    if(!e.target.closest('.search-wrapper')) { searchDropdown.hidden=true; }
  });

  /* Fill listings for buy pages */
  function renderListings(){
    const mobilesRoot = $('#listingsMobile');
    const compsRoot = $('#listingsComputer');
    mobilesRoot.innerHTML = '';
    compsRoot.innerHTML = '';

    sampleInventory.mobiles.forEach(m => {
      const div = document.createElement('div');
      div.className = 'card-listing';
      div.innerHTML = `<h4>${m.title}</h4><p>${m.desc}</p><p><strong>₹${m.price}</strong></p><div style="display:flex;gap:8px"><button data-id="${m.id}" class="addCart">Add to Cart</button></div>`;
      mobilesRoot.appendChild(div);
    });

    sampleInventory.computers.forEach(c => {
      const div = document.createElement('div');
      div.className = 'card-listing';
      div.innerHTML = `<h4>${c.title}</h4><p>${c.desc}</p><p><strong>₹${c.price}</strong></p><div style="display:flex;gap:8px"><button data-id="${c.id}" class="addCart">Add to Cart</button></div>`;
      compsRoot.appendChild(div);
    });

    qsa('.addCart').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const item = [...sampleInventory.mobiles, ...sampleInventory.computers].find(x => x.id === id);
        if(!item) return;
        const cart = storage.get('unicleya_cart') || [];
        cart.push(item);
        storage.set('unicleya_cart', cart);
        alert(`${item.title} added to cart (demo).`);
      });
    });
  }

  renderListings();

  /* SELL forms logic (simple demo with preview) */
  $('#sellMobileForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const model = fd.get('model'), cond = fd.get('condition'), price = fd.get('price');
    const photos = e.target.photos?.files || [];
    // show preview
    const out = $('#sellPreview');
    out.innerHTML = `<div style="background:#fff;padding:12px;border-radius:8px;border:1px solid #eee">
      <h4>Quote request submitted</h4>
      <p>Model: ${model}<br/>Condition: ${cond}<br/>Expect: ₹${price}</p>
    </div>`;
    // (in a real product you would send form data to the backend)
    e.target.reset();
    alert('Quote request saved (demo). We will contact you.');
  });

  $('#sellComputerForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Quote request saved (demo). We will contact you.');
    e.target.reset();
  });

  /* Contact form */
  $('#contactForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Thanks! We received your message (demo).');
    e.target.reset();
  });

  // routing from URL hash
  function routeFromHash(){
    const r = window.location.hash.replace('#','') || 'home';
    showRoute(r);
  }
  window.addEventListener('hashchange', routeFromHash);
  routeFromHash(); // initial

  // render account initially
  renderAccount();

  // initial accessibility & cleanup
  document.addEventListener('keydown', (e) => {
    if(e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault(); searchInput.focus();
    }
  });

})();
