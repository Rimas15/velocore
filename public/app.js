// Адреса «бекенду» — туди сайт шле запити за товарами та улюбленими (як телефонний номер сервера).
const API = 'https://stereo-mashed-rectified.ngrok-free.dev';

// Список усіх велосипедів, які прийшли з сервера (порожній на старті, потім заповнюється).
let products = [];
// Список того, що користувач позначив сердечком — улюблені товари.
let favorites = [];
// Яка категорія зараз обрана у фільтрах: «усі» або конкретна (наприклад, гірські).
let activeCategory = 'all';
// Текст, який людина ввела в рядок пошуку (щоб шукати по назві чи бренду).
let searchQuery = '';

// Завантажує з сервера повний каталог товарів і кладе його в змінну products.
async function fetchProducts() {
  // Відповідь сервера ще «в упаковці»; наступний рядок перетворює її на список товарів.
  const res = await fetch(`${API}/products`);
  products = await res.json();
}

// Завантажує з сервера список улюблених і кладе його в змінну favorites.
async function fetchFavorites() {
  // Те саме для улюблених: спочатку «упаковка» від сервера, потім список у памʼяті.
  const res = await fetch(`${API}/favorites`);
  favorites = await res.json();
}

// Перевіряє: чи є товар з таким номером (id) серед улюблених. Повертає так чи ні.
function isFav(id) {
  return favorites.some(f => String(f.productId) === String(id));
}

// Натискання на серце: додає товар до улюблених або прибирає звідти, і оновлює екран.
async function toggleFavorite(productId, event) {
  if (event) event.stopPropagation();

  // Чи вже є цей товар у списку улюблених (якщо так — будемо прибирати, якщо ні — додавати).
  const existing = favorites.find(f => String(f.productId) === String(productId));
  // Повні дані товару з каталогу — потрібні, щоб показати назву в повідомленні.
  const product = products.find(p => String(p.id) === String(productId));

  if (existing) {
    await fetch(`${API}/favorites/${existing.id}`, { method: 'DELETE' });
    favorites = favorites.filter(f => String(f.productId) !== String(productId));
    showToast(`${product.name} видалено з улюблених`);
  } else {
    // Просимо сервер зберегти нове «улюблене» і отримуємо відповідь.
    const res = await fetch(`${API}/favorites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId })
    });
    // Новий запис про улюблене (зазвичай з власним номером у базі).
    const newFav = await res.json();
    favorites.push(newFav);
    showToast(`${product.name} додано до улюблених`);
  }

  updateFavBadge();
  renderProducts();
  renderFavPanel();
}

// Оновлює маленьку цифру біля іконки улюблених — скільки їх зараз.
function updateFavBadge() {
  document.getElementById('fav-badge').textContent = favorites.length;
}

// Бере повний список товарів і залишає тільки ті, що підходять під фільтр і пошук.
function getFilteredProducts() {
  return products.filter(p => {
    // Чи підходить товар під обрану категорію (або обрано «усі»).
    const matchCat = activeCategory === 'all' || p.category === activeCategory;
    // Чи збігається назва або бренд з тим, що ввели в пошук.
    const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery) || p.brand.toLowerCase().includes(searchQuery);
    return matchCat && matchSearch;
  });
}

// Малює на сторінці сітку карток товарів (або показує «нічого не знайдено»).
function renderProducts() {
  // Контейнер на сторінці, куди вставляються картки велосипедів.
  const grid = document.getElementById('products-grid');
  // Блок «нічого не знайдено» — показуємо або ховаємо залежно від результату.
  const empty = document.getElementById('empty-state');
  // Товари вже після фільтра й пошуку — саме їх малюємо.
  const filtered = getFilteredProducts();

  if (!filtered.length) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  grid.innerHTML = filtered.map(p => {
    // Чи цей товар у улюблених — щоб правильно пофарбувати серце на картці.
    const fav = isFav(p.id);
    return `
      <div class="product-card" data-id="${p.id}">
        <div class="product-img-wrap">
          <img src="${p.image}" alt="${p.name}" loading="lazy">
          ${p.badge ? `<div class="product-badge">${p.badge}</div>` : ''}
          <button class="btn-fav-card ${fav ? 'active' : ''}" data-id="${p.id}" aria-label="Улюблені">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="${fav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>
        <div class="product-body">
          <div class="product-brand">${p.brand}</div>
          <div class="product-name">${p.name}</div>
          <div class="product-meta">
            <div class="product-price">$${p.price.toLocaleString()}</div>
            <div class="product-rating"><span>★</span>${p.rating} (${p.reviews})</div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', e => {
      if (!e.target.closest('.btn-fav-card')) {
        openModal(parseInt(card.dataset.id));
      }
    });
  });

  grid.querySelectorAll('.btn-fav-card').forEach(btn => {
    btn.addEventListener('click', e => toggleFavorite(parseInt(btn.dataset.id), e));
  });
}

// Відкриває велике вікно з деталями одного товару (фото, опис, характеристики).
function openModal(id) {
  // Один велосипед за номером, який відкрили з картки.
  const p = products.find(prod => String(prod.id) === String(id));
  if (!p) return;

  // Чи він уже в улюблених — для вигляду кнопки в вікні.
  const fav = isFav(id);
  // Список пар «назва характеристики — значення» для таблиці в модалці.
  const specEntries = Object.entries(p.specs);

  document.getElementById('modal-content').innerHTML = `
    <div class="modal-inner">
      <div class="modal-img">
        <img src="${p.image}" alt="${p.name}">
      </div>
      <div class="modal-body">
        <div class="modal-brand">${p.brand}</div>
        <div class="modal-name">${p.name}</div>
        <div class="modal-price">$${p.price.toLocaleString()}</div>
        <p class="modal-desc">${p.description}</p>
        <div class="modal-specs">
          ${specEntries.map(([k, v]) => `
            <div class="spec-item">
              <div class="spec-key">${k}</div>
              <div class="spec-val">${v}</div>
            </div>
          `).join('')}
        </div>
        <div class="modal-actions">
          <button class="btn-fav-modal ${fav ? 'active' : ''}" data-id="${id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="${fav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            ${fav ? 'В улюблених' : 'В улюблені'}
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';

  document.querySelector('.btn-fav-modal').addEventListener('click', async (e) => {
    await toggleFavorite(parseInt(e.currentTarget.dataset.id), null);
    // Після зміни ще раз дивимось, чи товар лишився в улюблених.
    const newFav = isFav(id);
    // Кнопка «серце», по якій клікнули.
    const btn = e.currentTarget;
    btn.classList.toggle('active', newFav);
    // Малюнок серця всередині кнопки — міняємо заливку кольором або порожньо.
    const svg = btn.querySelector('svg');
    svg.setAttribute('fill', newFav ? 'currentColor' : 'none');
    btn.childNodes[btn.childNodes.length - 1].textContent = newFav ? ' В улюблених' : ' В улюблені';
  });
}

// Закриває вікно з деталями товару.
function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

// Малює бічну панель зі списком улюблених (або текст «порожньо»).
function renderFavPanel() {
  // Елемент списку в бічній панелі — сюди вставляємо рядки улюблених.
  const list = document.getElementById('fav-list');

  if (!favorites.length) {
    list.innerHTML = `
      <div class="fav-empty">
        <div class="fav-empty-icon">♡</div>
        <p>Улюблені порожні</p>
      </div>
    `;
    return;
  }

  list.innerHTML = favorites.map(f => {
    // Повний товар за номером з улюбленого запису — щоб показати фото й ціну.
    const p = products.find(prod => String(prod.id) === String(f.productId));
    if (!p) return '';
    return `
      <div class="fav-item">
        <img class="fav-item-img" src="${p.image}" alt="${p.name}">
        <div class="fav-item-body">
          <div class="fav-item-brand">${p.brand}</div>
          <div class="fav-item-name">${p.name}</div>
          <div class="fav-item-price">$${p.price.toLocaleString()}</div>
        </div>
        <button class="btn-remove-fav" data-id="${p.id}" aria-label="Видалити">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.btn-remove-fav').forEach(btn => {
    btn.addEventListener('click', () => toggleFavorite(parseInt(btn.dataset.id), null));
  });
}

// Відкриває панель улюблених з боку екрана.
function openFavPanel() {
  document.getElementById('fav-panel').classList.add('open');
  document.getElementById('fav-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

// Закриває панель улюблених.
function closeFavPanel() {
  document.getElementById('fav-panel').classList.remove('open');
  document.getElementById('fav-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

// Показує коротке повідомлення знизу (наприклад «додано до улюблених»), потім само зникає.
function showToast(msg) {
  // Невеликий рядок тексту внизу екрана для підказок.
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// Підключає кнопки категорій: при натисканні змінюється фільтр і перемальовуються товари.
function initFilters() {
  document.getElementById('filters').addEventListener('click', e => {
    // Кнопка категорії, по якій клікнули (якщо клік мимо кнопки — нічого не робимо).
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeCategory = btn.dataset.cat;
    renderProducts();
  });
}

// Підключає поле пошуку: друк оновлює список; Enter — плавно прокручує до блоку каталогу.
function initSearch() {
  const input = document.getElementById('search-input');
  input.addEventListener('input', e => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderProducts();
  });
  input.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    document.getElementById('catalog').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

// Підключає закриття вікна товару (хрестик, клік поза вікном, клавіша Escape).
function initModal() {
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal();
      closeFavPanel();
    }
  });
}

// Підключає кнопку «улюблені», закриття панелі та затемнення позаду.
function initFavPanel() {
  document.getElementById('btn-fav').addEventListener('click', openFavPanel);
  document.getElementById('fav-panel-close').addEventListener('click', closeFavPanel);
  document.getElementById('fav-overlay').addEventListener('click', closeFavPanel);
}

// Підключає форму підписки на розсилку: не відправляє на сервер, лише показує подяку.
function initNewsletter() {
  document.getElementById('newsletter-form').addEventListener('submit', e => {
    e.preventDefault();
    // Що ввели в поле електронної пошти.
    const email = document.getElementById('nl-email').value;
    showToast(`Дякуємо! ${email} підписано на розсилку`);
    e.target.reset();
  });
}

// Старт програми: спочатку тягне дані з сервера, потім малює все і вмикає кнопки/поля.
async function init() {
  await Promise.all([fetchProducts(), fetchFavorites()]);
  renderProducts();
  updateFavBadge();
  renderFavPanel();
  initFilters();
  initSearch();
  initModal();
  initFavPanel();
  initNewsletter();
}

// Запускає підготовку сторінки одразу після завантаження цього файлу.
init();
