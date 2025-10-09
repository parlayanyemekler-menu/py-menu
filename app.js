// UTC kayması düzeltildi: tarihleri yerel olarak string ile işliyoruz.
const $ = (sel, el=document) => el.querySelector(sel);

const state = { year: 2025, month: 10, data: null };

// ---- Tarih yardımcıları (UTC kullanma!) ----
const pad = n => String(n).padStart(2,'0');
const iso = (y,m,d) => `${y}-${pad(m)}-${pad(d)}`; // saf string
const parseISO = s => { const [y,m,d] = s.split('-').map(Number); return {y,m,d}; };

function fmtDate(isoStr){
  const {y,m,d} = parseISO(isoStr);
  const dt = new Date(y, m-1, d); // yerel
  return dt.toLocaleDateString('tr-TR', { day:'2-digit', month:'long' });
}

// Haftaları Pazartesi başlangıçlı hesapla
function getWeeks(year, month){
  const first = new Date(year, month-1, 1);
  const last = new Date(year, month, 0);
  const offset = (first.getDay() + 6) % 7; // Pzt=0
  const days = [];
  for (let d=1; d<=last.getDate(); d++){
    const week = Math.floor((d-1 + offset)/7) + 1;
    days.push({ d, iso: iso(year, month, d), week });
  }
  return days;
}

async function loadData(){
  if (state.data) return state.data;
  const res = await fetch('data/menu-2025-10.json', {cache:'no-store'});
  state.data = await res.json();
  return state.data;
}

function renderHome(){
  document.getElementById('app').innerHTML = `
    <section class="grid auto-fill">
      <div class="card">
        <div class="kicker">Gezinme</div>
        <h1 class="h1">Aylık • Haftalık • Günlük</h1>
        <p class="p">Ekim 2025 menülerine aşağıdaki buton ve bağlantılardan ulaşabilirsiniz.</p>
        <div class="home-actions">
          <a class="btn" href="#/month/2025-10">Aylık Takvim</a>
          ${[1,2,3,4,5].map(w=>`<a class="btn" href="#/week/2025-10/${w}">${w}. Hafta</a>`).join('')}
        </div>
      </div>
      <div class="card">
        <div class="kicker">Kısayollar</div>
        <h2 class="h1">Gün Gün Ekim (1–31)</h2>
        <p class="p">Her gün için tıklanabilir bağlantılar aşağıdadır.</p>
        <div class="tags" id="day-links"></div>
      </div>
    </section>
  `;
  const lastDay = new Date(state.year, state.month, 0).getDate();
  const holder = document.getElementById('day-links');
  for (let d=1; d<=lastDay; d++){
    const a = document.createElement('a');
    a.className = 'tag';
    a.href = `#/day/${iso(state.year, state.month, d)}`;
    a.textContent = pad(d) + ' Ekim';
    holder.appendChild(a);
  }
}

async function renderMonth(year, month){
  const data = await loadData();
  const days = getWeeks(year, month);
  const dow = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];

  document.getElementById('app').innerHTML = `
    <section class="grid">
      <div class="card">
        <div class="kicker">Aylık Takvim</div>
        <h1 class="h1">Ekim ${year}</h1>
        <div class="calendar">
          <div class="grid cols-7" id="month-head"></div>
          <div class="grid cols-7" id="month-body"></div>
        </div>
      </div>
    </section>
  `;

  const head = document.getElementById('month-head');
  dow.forEach(d=>{
    const el = document.createElement('div');
    el.className = 'day-header';
    el.textContent = d;
    head.appendChild(el);
  });

  const body = document.getElementById('month-body');
  // İlk güne kadar boşluk (Pzt hizası)
  const first = new Date(year, month-1, 1);
  const padEmpty = (first.getDay()+6)%7;
  for (let i=0;i<padEmpty;i++) body.appendChild(document.createElement('div'));

  days.forEach(({d, iso:isoStr})=>{
    const cell = document.createElement('div');
    cell.className = 'cell';
    const meals = data[isoStr] || [];
    const mealHtml = meals.length ? meals.map(m=>`<div class=\"meal\">• ${m}</div>`).join('') : `<div class=\"meal\" style=\"color:var(--muted)\">Menü eklenmedi</div>`;
    cell.innerHTML = `
      <div class="date">
        <strong>${pad(d)} Eki</strong>
        <a href="#/day/${isoStr}" class="small">Gün ›</a>
      </div>
      ${mealHtml}
    `;
    body.appendChild(cell);
  });
}

async function renderWeek(year, month, weekNo){
  const data = await loadData();
  const days = getWeeks(year, month).filter(x=>x.week===weekNo);
  document.getElementById('app').innerHTML = `
    <section class="card">
      <div class="kicker">Haftalık Takvim</div>
      <h1 class="h1">${weekNo}. Hafta — Ekim ${year}</h1>
      <div class="week-nav">
        ${[1,2,3,4,5].map(w=>`<a class="${w===weekNo?'active':''}" href="#/week/${year}-${pad(month)}/${w}">${w}. Hafta</a>`).join('')}
      </div>
      <div class="grid auto-fill" id="week-cards"></div>
    </section>
  `;
  const holder = document.getElementById('week-cards');
  days.forEach(({iso:isoStr})=>{
    const meals = data[isoStr] || [];
    const html = `
      <article class="card">
        <div class="kicker">${fmtDate(isoStr)}</div>
        <h2 class="h1">Günlük Menü</h2>
        <ul class="meal-list">
          ${meals.length ? meals.map(m=>`<li>${m}</li>`).join('') : `<li style="color:var(--muted)">Menü eklenmedi</li>`}
        </ul>
        <div style="margin-top:8px"><a class="btn" href="#/day/${isoStr}">Günü Aç</a></div>
      </article>
    `;
    const el = document.createElement('div');
    el.innerHTML = html;
    holder.appendChild(el.firstElementChild);
  });
}

async function renderDay(isoStr){
  const data = await loadData();
  const meals = data[isoStr] || [];
  document.getElementById('app').innerHTML = `
    <section class="grid">
      <div class="card">
        <div class="kicker">${fmtDate(isoStr)}</div>
        <h1 class="h1">Günlük Menü</h1>
        <ul class="meal-list">
          ${meals.length ? meals.map(m=>`<li>${m}</li>`).join('') : `<li style="color:var(--muted)">Menü eklenmedi</li>`}
        </ul>
        <div class="home-actions">
          <a class="btn" href="#/week/2025-10/${getWeekOfDate(isoStr)}">Haftaya Dön</a>
          <a class="btn" href="#/month/2025-10">Aylığa Dön</a>
        </div>
      </div>
    </section>
  `;
}

function getWeekOfDate(isoStr){
  const {y,m,d} = parseISO(isoStr);
  const first = new Date(y, m-1, 1);
  const offset = (first.getDay()+6)%7;
  return Math.floor((d-1 + offset)/7) + 1;
}

// Router
function router(){
  const hash = location.hash || '#/';
  const parts = hash.slice(2).split('/');
  if (hash === '#/' || parts[0] === '') return renderHome();
  if (parts[0] === 'month'){ const [y,m] = parts[1].split('-').map(Number); return renderMonth(y,m); }
  if (parts[0] === 'week'){ const [ym,w] = [parts[1], parts[2]]; const [y,m] = ym.split('-').map(Number); return renderWeek(y,m, Number(w||1)); }
  if (parts[0] === 'day'){ const isoStr = parts[1]; return renderDay(isoStr); }
  renderHome();
}
window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', router);


// Mobile dropdown toggle
window.addEventListener('DOMContentLoaded', () => {
  const dd = document.querySelector('.dropdown');
  if (dd){
    const btn = dd.querySelector('button');
    btn?.addEventListener('click', (e) => {
      e.preventDefault();
      dd.classList.toggle('open');
      const m = dd.querySelector('.dropdown-menu');
      if (m) m.style.display = dd.classList.contains('open') ? 'block' : 'none';
    });
    // close on outside click
    document.addEventListener('click', (ev) => {
      if (!dd.contains(ev.target)) {
        dd.classList.remove('open');
        const m = dd.querySelector('.dropdown-menu');
        if (m) m.style.display = 'none';
      }
    });
  }
});
// NEW: Günlük tek görsel yolu (Ekim = 10)
function dayImagePath(isoStr){
  // "2025-10-01" → d = 1  → //py-menu/images/daily/1_10.png
  const parts = isoStr.split('-'); 
  const d = Number(parts[2]);
  const m = Number(parts[1]); // istersen genellemek için kullan
  return `/py-menu/images/daily/${d}_10.png`;
}
async function renderDay(isoStr){
  const data = await loadData();
  const meals = data[isoStr] || [];
  const dayImg = dayImagePath(isoStr);

  document.getElementById('app').innerHTML = `
    <section class="grid">
      <div class="card">
        <div class="kicker">${fmtDate(isoStr)}</div>
        <h1 class="h1">Günlük Menü</h1>

        <!-- NEW: Gün görseli (sadece günlükte) -->
        <div class="day-hero">
          <img src="${dayImg}" alt="${isoStr} gün görseli" loading="lazy"
               onerror="this.closest('.day-hero').style.display='none'">
        </div>

        <ul class="meal-list">
          ${meals.length 
            ? meals.map(m=>`<li>${m}</li>`).join('')
            : `<li style="color:var(--muted)">Menü eklenmedi</li>`}
        </ul>

        <div class="home-actions" style="margin-top:12px">
          <a class="btn" href="#/week/2025-10/${getWeekOfDate(isoStr)}">Haftaya Dön</a>
          <a class="btn" href="#/month/2025-10">Aylığa Dön</a>
        </div>
      </div>
    </section>
  `;

  ensureDayHeroStyles();
}

// NEW: mobil odaklı stil
function ensureDayHeroStyles(){
  if (document.getElementById('day-hero-styles')) return;
  const s = document.createElement('style');
  s.id = 'day-hero-styles';
  s.textContent = `
    /* GÜNLÜK SAYFA HERO GÖRSELİ — MOBİL + WEB UYUMLU */
.day-hero{
  margin: 10px 0 14px;
}
.day-hero picture, 
.day-hero img{
  display: block;
  width: 100%;
}

/* Küçük ekranlar: tam genişlik, yüksekliği ferah tut (ekranın %70’i) */
@media (max-width: 520px){
  .day-hero img{
    max-height: 70vh;
    height: auto;
    object-fit: cover;
    border-radius: 12px;
    border: 1px solid #eee;
  }
}

/* Tablet: kart genişliğine göre dengeli yükseklik */
@media (min-width: 521px) and (max-width: 1024px){
  .day-hero img{
    max-height: 520px;
    width: 100%;
    height: auto;
    object-fit: cover;
    border-radius: 14px;
    border: 1px solid #eee;
    box-shadow: 0 8px 24px rgba(0,0,0,.06);
  }
}

/* Masaüstü ve üstü: geniş ama taşmayan, orantılı kırpma */
@media (min-width: 1025px){
  .day-hero{
    /* kart içerikleri merkezliyse hoş durur; yoksa kaldırabilirsin */
  }
  .day-hero img{
    max-height: 620px;       /* büyük ekranlara yakışan tavan */
    width: 100%;
    height: auto;
    object-fit: cover;       /* görsel farklı oranlarda olsa da estetik */
    border-radius: 16px;
    border: 1px solid #eee;
    box-shadow: 0 10px 28px rgba(0,0,0,.07);
  }
}

  `;
  document.head.appendChild(s);
}


