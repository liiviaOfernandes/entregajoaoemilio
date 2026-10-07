const app = document.getElementById('app');
const C = window.JL_CONFIG;
let current = null;
let lightboxIndex = 0;
let visiblePhotos = C.gallery?.photosPerPage || 20;
const PHOTOS_STEP = C.gallery?.photosPerPage || 20;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const cssUrl = (url) => `url("${String(url || '').replace(/"/g, '%22')}")`;
const photos = (c) => Array.isArray(c.photos) ? c.photos : [];
const videosArr = (c) => Array.isArray(c.videos) ? c.videos : [];
const photoPath = (photo, full = false) => full ? (photo.full || photo.src || '') : (photo.src || photo.full || '');
const photoDownload = (photo) => photo.download || photo.full || photo.src || '';
const photoName = (photo, index) => photo.name || `Foto ${index + 1}`;

function login(){
  const first = C.clients[0] || {};
  document.documentElement.style.setProperty('--login-cover', cssUrl(first.cover));
  app.innerHTML = `<main class="login"><div class="login-art"></div><div class="login-box"><div class="card"><div class="eyebrow">${esc(C.brand.subtitle)}</div><h1>Sua história,<br><i>guardada.</i></h1><p>Entre com o e-mail e a senha enviados pela JL Fotografia para acessar sua entrega exclusiva.</p><form id="loginForm"><div class="field"><label for="email">E-mail</label><input id="email" type="email" autocomplete="email" required></div><div class="field"><label for="pass">Senha da galeria</label><input id="pass" type="password" autocomplete="current-password" required></div><div class="error" id="err"></div><button class="btn dark" type="submit" style="width:100%">Acessar minha galeria</button></form></div></div></main>`;
  document.getElementById('loginForm').addEventListener('submit', e => {
    e.preventDefault();
    const em = document.getElementById('email').value.trim().toLowerCase();
    const pw = document.getElementById('pass').value.trim();
    const c = C.clients.find(x => String(x.email || '').toLowerCase() === em && String(x.password || '') === pw);
    if(!c){ document.getElementById('err').textContent = 'E-mail ou senha não conferem.'; return; }
    sessionStorage.setItem('jl_client', c.id); show(c);
  });
}

function show(c){
  current = c;
  visiblePhotos = PHOTOS_STEP;
  document.documentElement.style.setProperty('--hero-cover', cssUrl(c.cover));
  document.documentElement.style.setProperty('--login-cover', cssUrl(c.cover));
  const photoCount = photos(c).length;
  const videoCount = videosArr(c).length;

  app.innerHTML = `<header class="top"><div class="logo">${esc(C.brand.name)}<small>${esc(C.brand.subtitle)}</small></div><button class="btn" id="logout">Sair</button></header>
  <section class="hero"><div class="hero-content"><div class="eyebrow">${esc(c.type)} · ${esc(c.date)}</div><h1>${esc(c.title)}</h1><p>${esc(c.message)}</p></div></section>
  <div class="bar"><div><b>${photoCount} ${photoCount===1?'fotografia':'fotografias'}</b><span class="meta">${videoCount ? ` · ${videoCount} vídeo(s)` : ''}</span></div><div class="actions"><button class="btn dark" id="openDrive">Abrir galeria completa no Drive</button></div></div>
  <section class="section" id="gallerySection"><div class="section-head"><div><div class="eyebrow">Sua galeria</div><h2>Momentos para sempre</h2></div><p>Toque em uma fotografia para ampliar. Você também pode favoritar ou baixar cada imagem individualmente.</p></div>${photoCount ? `<div class="grid" id="photoGrid"></div><div class="gallery-controls" id="galleryControls"></div>` : `<div class="empty">Nenhuma foto cadastrada nesta galeria.</div>`}</section>
  ${renderVideos(c)}
  <footer class="footer"><strong>JL Fotografia</strong><p>José & Lívia · Monte Carmelo — MG</p><p><a href="${esc(C.brand.instagram)}" target="_blank" rel="noopener">Instagram</a></p></footer>
  <div class="lightbox" id="lightbox"><button class="lb-btn lb-close" id="lbClose">×</button><button class="lb-btn lb-prev" id="lbPrev">‹</button><img id="big" alt="Fotografia ampliada"><button class="lb-btn lb-next" id="lbNext">›</button></div>
  <div class="download-modal" id="feedbackModal"><div class="feedback-card"><button class="modal-x" id="feedbackClose">×</button><div class="eyebrow">Enquanto suas memórias chegam até você</div><h2>Gostou da entrega?</h2><p>Conta pra gente como foi sua experiência com a JL Fotografia.</p><div class="stars" id="stars">${[1,2,3,4,5].map(n=>`<button class="star" data-star="${n}" aria-label="${n} estrelas">★</button>`).join('')}</div><textarea class="feedback-text" id="feedbackText" placeholder="Escreva aqui seu feedback..."></textarea><button class="btn dark" id="sendFeedback" style="width:100%">Enviar pelo WhatsApp</button><p class="feedback-note">Obrigada por confiar suas memórias à JL Fotografia.</p></div></div>
  <div class="toast" id="toast"></div>`;

  document.getElementById('logout').onclick = () => { sessionStorage.removeItem('jl_client'); login(); };
  document.getElementById('openDrive').onclick = () => { window.open(c.driveFolder, '_blank', 'noopener'); setTimeout(() => document.getElementById('feedbackModal').classList.add('show'), 600); };
  if(photoCount) renderPhotoBatch(c);
  document.getElementById('lbClose').onclick = closeLightbox;
  document.getElementById('lbPrev').onclick = () => moveLightbox(-1);
  document.getElementById('lbNext').onclick = () => moveLightbox(1);
  document.getElementById('feedbackClose').onclick = () => document.getElementById('feedbackModal').classList.remove('show');
  setupStars();
  document.getElementById('sendFeedback').onclick = () => sendFeedback(c);
}

function renderVideos(c){
  const videos = videosArr(c);
  if(!videos.length) return '';
  return `<section class="film-section"><div class="section-head"><div><div class="eyebrow">Filmes da entrega</div><h2>Reviva esse momento</h2></div><p>Os vídeos estão hospedados no Google Drive para manter o site leve e funcionar bem no GitHub Pages.</p></div><div class="film-list">${videos.map((v,i)=>`<article class="film-card"><div class="film-media"><iframe src="${esc(v.preview)}" allow="autoplay; fullscreen" allowfullscreen loading="lazy"></iframe></div><div class="film-copy"><div class="eyebrow">Vídeo ${i+1}</div><h3>${esc(v.title)}</h3><p>${esc(v.description || 'Assista com calma e guarde esse momento para sempre.')}</p><div class="film-actions"><a class="btn dark" href="${esc(v.view || v.preview)}" target="_blank" rel="noopener">Abrir no Drive</a><a class="btn soft" href="${esc(v.download || v.view || v.preview)}" target="_blank" rel="noopener">Baixar vídeo</a></div></div></article>`).join('')}</div></section>`;
}

function renderPhotoBatch(c){
  const grid = document.getElementById('photoGrid');
  const controls = document.getElementById('galleryControls');
  if(!grid || !controls) return;
  const fav = JSON.parse(localStorage.getItem(`jl_fav_${c.id}`) || '[]');
  const all = photos(c);
  const shown = all.slice(0, visiblePhotos);
  grid.innerHTML = shown.map((photo,i)=>`<div class="photo"><img src="${esc(photoPath(photo))}" alt="${esc(c.title)} — ${esc(photoName(photo,i))}" data-view="${i}" loading="lazy"><div class="photo-tools"><button class="round ${fav.includes(i)?'on':''}" data-fav="${i}" aria-label="Favoritar">♡</button><a class="round" href="${esc(photoDownload(photo))}" target="_blank" rel="noopener" aria-label="Baixar foto">↓</a></div></div>`).join('');
  controls.innerHTML = `${visiblePhotos < all.length ? `<button class="btn dark" id="loadMore">Ver mais fotos <span>+${Math.min(PHOTOS_STEP,all.length-visiblePhotos)}</span></button>` : `<span class="all-seen">Você chegou ao final da galeria 🤎</span>`}<button class="btn soft" id="backTop">↑ Voltar ao topo</button>`;
  document.querySelectorAll('[data-view]').forEach(el => el.onclick = () => openLightbox(+el.dataset.view));
  document.querySelectorAll('[data-fav]').forEach(btn => btn.onclick = () => toggleFav(c,btn));
  document.getElementById('loadMore')?.addEventListener('click',()=>{ visiblePhotos=Math.min(visiblePhotos+PHOTOS_STEP,all.length); renderPhotoBatch(c); });
  document.getElementById('backTop').onclick=()=>window.scrollTo({top:0,behavior:'smooth'});
}

function setupStars(){
  const stars = [...document.querySelectorAll('.star')];
  stars.forEach(s => s.onclick = () => {
    const rating = +s.dataset.star;
    document.getElementById('stars').dataset.rating = rating;
    stars.forEach(x => x.classList.toggle('active', +x.dataset.star <= rating));
  });
}
function sendFeedback(c){
  const rating = +(document.getElementById('stars').dataset.rating || 0);
  const feedback = document.getElementById('feedbackText').value.trim();
  if(!rating && !feedback){ toast('Escolha as estrelas ou escreva seu feedback 🤎'); return; }
  const stars = rating ? '⭐'.repeat(rating) : 'Não informada';
  const msg = `Olá, Lívia e José! 🤎\n\nAcabei de acessar minha galeria de ${c.type} — ${c.title}.\n\nMinha avaliação: ${stars}\n\nFeedback:\n${feedback || 'Amei receber minhas fotos!'}\n\nObrigada(o) por registrarem esse momento!`;
  window.open(`https://wa.me/${C.brand.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
}
function toggleFav(c,b){
  const i = +b.dataset.fav;
  let a = JSON.parse(localStorage.getItem(`jl_fav_${c.id}`) || '[]');
  a = a.includes(i) ? a.filter(n => n !== i) : [...a,i];
  localStorage.setItem(`jl_fav_${c.id}`, JSON.stringify(a));
  b.classList.toggle('on');
}
function openLightbox(i){ lightboxIndex=i; document.getElementById('big').src=photoPath(photos(current)[i],true); document.getElementById('lightbox').classList.add('show'); }
function closeLightbox(){ document.getElementById('lightbox').classList.remove('show'); }
function moveLightbox(d){ const all=photos(current); if(!all.length)return; lightboxIndex=(lightboxIndex+d+all.length)%all.length; document.getElementById('big').src=photoPath(all[lightboxIndex],true); }
function toast(msg){ const t=document.getElementById('toast'); if(!t)return; t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2200); }
document.addEventListener('keydown', e => { if(!document.getElementById('lightbox')?.classList.contains('show'))return; if(e.key==='Escape')closeLightbox(); if(e.key==='ArrowLeft')moveLightbox(-1); if(e.key==='ArrowRight')moveLightbox(1); });

const saved = sessionStorage.getItem('jl_client');
const found = C.clients.find(c => c.id === saved);
found ? show(found) : login();
