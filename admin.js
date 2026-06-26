(function () {
  'use strict';

  const SITE_URL = 'https://rodion2643.github.io/kwt-service1/';
  const cfg = window.KWT_LISTINGS_CONFIG || {};
  const SESSION_KEY = 'kwt_admin_pw';

  const TYPE_PREFIX = {
    'Самокат': 'Электросамокат',
    'Велосипед': 'Электровелосипед',
    'Скутер': 'Электроскутер',
    'Трицикл': 'Электротрицикл',
  };

  const loginPanel = document.getElementById('login-panel');
  const app = document.getElementById('app');
  const loginForm = document.getElementById('login-form');
  const loginMsg = document.getElementById('login-msg');
  const addForm = document.getElementById('add-form');
  const addMsg = document.getElementById('add-msg');
  const saleListEl = document.getElementById('listings-sale');
  const usedListEl = document.getElementById('listings-used');
  const configWarn = document.getElementById('config-warn');
  const scriptWarn = document.getElementById('script-warn');
  const photoInput = document.getElementById('photo-input');
  const photoPreview = document.getElementById('photo-preview');
  const photoEmpty = document.getElementById('photo-empty');
  const submitBtn = document.getElementById('submit-btn');
  const cancelEditBtn = document.getElementById('cancel-edit');
  const editIdInput = document.getElementById('edit-id');
  const formTitle = document.getElementById('form-title');
  const categorySelect = document.getElementById('field-category');
  const categoryTabs = document.getElementById('category-tabs');

  let editImageUrl = '';

  function siteBase() {
    return (cfg.siteUrl || SITE_URL).replace(/\/?$/, '/');
  }

  function apiUrl() {
    return cfg.apiUrl || '';
  }

  function getPassword() {
    return sessionStorage.getItem(SESSION_KEY) || '';
  }

  function setPassword(pw) {
    if (pw) sessionStorage.setItem(SESSION_KEY, pw);
    else sessionStorage.removeItem(SESSION_KEY);
  }

  function showMsg(el, text, type) {
    if (!el) return;
    el.textContent = text;
    el.className = 'msg' + (type ? ' ' + type : '');
  }

  function checkConfig() {
    const ok = !!apiUrl();
    if (configWarn) configWarn.hidden = ok;
    const btn = loginPanel?.querySelector('button[type=submit]');
    if (btn) btn.disabled = !ok;
  }

  async function api(body) {
    if (!apiUrl()) throw new Error('Сайт не подключён.');
    const res = await fetch(apiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  function showApp(show) {
    loginPanel.hidden = show;
    app.hidden = !show;
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function siteAsset(path) {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    return siteBase() + path.replace(/^\.\//, '').replace(/^\//, '');
  }

  function imgUrl(item) {
    const raw = item.image || '';
    if (!raw) return '';
    if (/drive\.google\.com/i.test(raw)) {
      const m = raw.match(/[?&]id=([^&]+)/) || raw.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w400`;
    }
    return siteAsset(raw);
  }

  function staticCatalog(category) {
    if (typeof KWT === 'undefined') return [];
    if (category === 'used') return Array.isArray(KWT.catalog) ? KWT.catalog : [];
    return Array.isArray(KWT.saleCatalog) ? KWT.saleCatalog : [];
  }

  function staticCounts() {
    return {
      sale: staticCatalog('sale').length,
      used: staticCatalog('used').length,
    };
  }

  function buildListing(fd) {
    const type = fd.get('type')?.toString() || 'Самокат';
    const category = fd.get('category')?.toString() || 'sale';
    const model = fd.get('model')?.toString().trim();
    const prefix = TYPE_PREFIX[type] || 'Электротранспорт';
    const name = model.toLowerCase().startsWith(prefix.toLowerCase().slice(0, 8))
      ? model
      : `${prefix} ${model}`;

    const priceRaw = fd.get('price')?.toString().replace(/\s/g, '').trim() || '';
    const digits = priceRaw.replace(/\D/g, '');
    if (!digits) throw new Error('Укажите цену');
    const price = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' Br';

    const specs = [];
    const power = fd.get('power')?.toString().trim();
    const speed = fd.get('speed')?.toString().trim();
    const range = fd.get('range')?.toString().trim();
    const battery = fd.get('battery')?.toString().trim();
    const extra = fd.get('extra')?.toString().trim();

    if (power) specs.push(`Мощность двигателя: ${power} W`);
    if (speed) specs.push(`Макс скорость: ${speed} км/ч`);
    if (range) specs.push(`Пробег: до ${range} км`);
    if (battery) specs.push(`Ёмкость батареи: ${battery} Ah`);
    if (extra) specs.push(extra);

    return { name, type, price, specs, category };
  }

  function parseSpecsToForm(specs) {
    const out = { power: '', speed: '', range: '', battery: '', extra: '' };
    const extras = [];
    (specs || []).forEach(s => {
      let m = s.match(/Мощность[^:]*:\s*(\d+)/i);
      if (m) { out.power = m[1]; return; }
      m = s.match(/скорост[^:]*:\s*(\d+)/i);
      if (m) { out.speed = m[1]; return; }
      m = s.match(/Пробег[^:]*:\s*(\d+)/i);
      if (m) { out.range = m[1]; return; }
      m = s.match(/батаре[^:]*:\s*([\d.]+)/i);
      if (m) { out.battery = m[1]; return; }
      extras.push(s);
    });
    out.extra = extras.join('; ');
    return out;
  }

  function itemCategory(item) {
    if (item.category === 'used' || item.badge === 'Б/У') return 'used';
    return 'sale';
  }

  function mergeVisibleList(remoteItems, hiddenIds, category) {
    const hidden = new Set(hiddenIds || []);
    const remoteActive = (remoteItems || []).filter(i => i.active !== false && itemCategory(i) === category);
    const remoteIds = new Set(remoteActive.map(i => i.id));
    const staticItems = staticCatalog(category)
      .filter(i => !hidden.has(i.id) && !remoteIds.has(i.id))
      .map(i => ({ ...i, source: 'site' }));

    const remoteMapped = remoteActive.map(i => ({
      ...i,
      source: String(i.id).startsWith('adm-') ? 'new' : 'edited',
    }));

    return [...remoteMapped, ...staticItems];
  }

  async function loadListings() {
    if (!saleListEl && !usedListEl) return;
    if (saleListEl) saleListEl.innerHTML = '<p class="muted">Загрузка…</p>';
    if (usedListEl) usedListEl.innerHTML = '<p class="muted">Загрузка…</p>';

    let remoteItems = [];
    let hiddenIds = [];
    let apiNote = '';

    try {
      const data = await api({ action: 'list', password: getPassword() });
      if (data.ok) {
        remoteItems = data.items || [];
        hiddenIds = data.hidden || [];
        if (scriptWarn) scriptWarn.hidden = Array.isArray(data.hidden);
      } else {
        apiNote = data.error || 'Ошибка загрузки из Google';
      }
    } catch (e) {
      apiNote = e.message || 'Нет связи с Google';
    }

    const saleItems = mergeVisibleList(remoteItems, hiddenIds, 'sale');
    const usedItems = mergeVisibleList(remoteItems, hiddenIds, 'used');

    renderList(saleListEl, saleItems, 'продаже');
    renderList(usedListEl, usedItems, 'Б/У');

    if (apiNote && scriptWarn) {
      scriptWarn.hidden = false;
      scriptWarn.querySelector('p').innerHTML =
        `<strong>Внимание:</strong> ${esc(apiNote)}. Ниже — объявления с сайта.`;
    }

    updateListCounts(saleItems.length, usedItems.length);
  }

  function updateListCounts(saleN, usedN) {
    const saleCount = document.getElementById('sale-count-label');
    const usedCount = document.getElementById('used-count-label');
    if (saleCount) saleCount.textContent = `${saleN} поз.`;
    if (usedCount) usedCount.textContent = `${usedN} поз.`;
  }

  function renderList(listEl, items, label) {
    if (!listEl) return;
    if (!items.length) {
      listEl.innerHTML = `<p class="muted">Нет позиций в ${label}.</p>`;
      return;
    }
    listEl.innerHTML = items.map(item => {
      const tag = item.source === 'site' ? 'на сайте' : item.source === 'edited' ? 'изменено' : 'новое';
      return `
      <article class="list-item">
        <img src="${esc(imgUrl(item))}" alt="" loading="lazy" onerror="this.style.opacity=0.3">
        <div>
          <span class="list-item__tag">${tag}</span>
          <h3>${esc(item.name)}</h3>
          <span class="list-item__price">${esc(item.price)}</span>
        </div>
        <div class="list-item__actions">
          <button type="button" class="btn btn--ghost btn--sm" data-edit="${esc(item.id)}">Изменить</button>
          <button type="button" class="btn btn--danger btn--sm" data-remove="${esc(item.id)}">Снять</button>
        </div>
      </article>`;
    }).join('');

    listEl.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => startEdit(btn.dataset.edit));
    });
    listEl.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => removeListing(btn.dataset.remove));
    });
  }

  function findStaticItem(id) {
    return staticCatalog('sale').find(i => i.id === id)
      || staticCatalog('used').find(i => i.id === id)
      || null;
  }

  function setCategory(cat) {
    if (categorySelect) categorySelect.value = cat;
    categoryTabs?.querySelectorAll('[data-cat]').forEach(btn => {
      btn.classList.toggle('category-tab--active', btn.dataset.cat === cat);
    });
    formTitle.textContent = cat === 'used' ? 'Новое объявление Б/У' : 'Новое объявление — продажа';
    submitBtn.textContent = cat === 'used' ? '✓ Опубликовать в Б/У' : '✓ Опубликовать в продажу';
  }

  async function startEdit(id) {
    let item = null;
    try {
      const data = await api({ action: 'list', password: getPassword() });
      item = (data.items || []).find(i => i.id === id && i.active !== false);
    } catch { /* static only */ }
    if (!item) item = findStaticItem(id);
    if (!item) return;

    editIdInput.value = id;
    editImageUrl = imgUrl(item);
    formTitle.textContent = 'Редактировать объявление';
    submitBtn.textContent = '✓ Сохранить изменения';
    cancelEditBtn.hidden = false;
    photoInput.required = false;

    setCategory(itemCategory(item) === 'used' ? 'used' : 'sale');
    addForm.elements.type.value = item.type || 'Самокат';
    addForm.elements.model.value = item.name || '';
    addForm.elements.price.value = (item.price || '').replace(/\s*Br/i, '').trim();

    const parsed = parseSpecsToForm(item.specs);
    addForm.elements.power.value = parsed.power;
    addForm.elements.speed.value = parsed.speed;
    addForm.elements.range.value = parsed.range;
    addForm.elements.battery.value = parsed.battery;
    addForm.elements.extra.value = parsed.extra;

    if (editImageUrl) {
      photoPreview.src = editImageUrl;
      photoPreview.hidden = false;
      photoEmpty.hidden = true;
    }

    document.getElementById('add-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function resetForm() {
    editIdInput.value = '';
    editImageUrl = '';
    cancelEditBtn.hidden = true;
    photoInput.required = true;
    addForm.reset();
    setCategory('sale');
    photoPreview.hidden = true;
    photoEmpty.hidden = false;
    photoPreview.src = '';
  }

  function initSiteLink() {
    const url = siteBase();
    const link = document.getElementById('site-home');
    if (!link) return;
    link.href = url;
    link.target = '_top';
    link.rel = 'noopener noreferrer';
    link.addEventListener('click', e => {
      e.preventDefault();
      window.top.location.assign(url);
    });
  }

  async function removeListing(id) {
    if (!confirm('Убрать с сайта?')) return;
    const pw = getPassword();
    try {
      let data = await api({ action: 'remove', password: pw, id });
      if (!data.ok) data = await api({ action: 'hide', password: pw, id });
      if (!data.ok) data = await api({ action: 'delete', password: pw, id });
      if (!data.ok) throw new Error('Не удалось снять. Обновите Google-скрипт.');
      if (editIdInput.value === id) resetForm();
      loadListings();
    } catch (e) {
      alert(e.message || 'Ошибка удаления');
    }
  }

  async function compressPhoto(file) {
    const maxW = 1400;
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxW / bitmap.width);
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    return canvas.toDataURL('image/jpeg', 0.82);
  }

  photoInput?.addEventListener('change', () => {
    const file = photoInput.files?.[0];
    if (!file) return;
    photoPreview.src = URL.createObjectURL(file);
    photoPreview.hidden = false;
    photoEmpty.hidden = true;
    editImageUrl = '';
  });

  cancelEditBtn?.addEventListener('click', () => {
    resetForm();
    showMsg(addMsg, '');
  });

  categoryTabs?.addEventListener('click', e => {
    const btn = e.target.closest('[data-cat]');
    if (!btn) return;
    setCategory(btn.dataset.cat);
    document.getElementById('add-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  categorySelect?.addEventListener('change', () => setCategory(categorySelect.value));

  loginForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const pw = document.getElementById('login-password').value;
    showMsg(loginMsg, 'Проверка…');
    try {
      const data = await api({ action: 'list', password: pw });
      if (!data.ok) throw new Error(data.error || 'Неверный пароль');
      setPassword(pw);
      showApp(true);
      showMsg(loginMsg, '');
      loadListings();
    } catch (err) {
      showMsg(loginMsg, err.message, 'err');
    }
  });

  addForm?.addEventListener('submit', async e => {
    e.preventDefault();
    submitBtn.disabled = true;
    const isEdit = !!editIdInput.value;

    try {
      const fd = new FormData(addForm);
      const listing = buildListing(fd);
      const photo = fd.get('photo');

      const payload = {
        password: getPassword(),
        name: listing.name,
        price: listing.price,
        type: listing.type,
        specs: listing.specs,
        category: listing.category,
        badge: listing.category === 'used' ? 'Б/У' : 'продажа',
      };

      if (photo instanceof File && photo.size) {
        showMsg(addMsg, 'Загружаем фото…');
        payload.imageBase64 = await compressPhoto(photo);
        payload.imageName = 'photo.jpg';
      } else if (isEdit && editImageUrl) {
        const base = siteBase();
        payload.image = editImageUrl.startsWith(base)
          ? editImageUrl.slice(base.length)
          : editImageUrl;
      } else if (!isEdit) {
        throw new Error('Добавьте фото');
      }

      showMsg(addMsg, isEdit ? 'Сохраняем…' : 'Публикуем…');
      payload.action = isEdit ? 'update' : 'add';
      if (isEdit) payload.id = editIdInput.value;

      const data = await api(payload);
      if (!data.ok) throw new Error(data.error || 'Ошибка');

      showMsg(addMsg, '✓ Готово! Обновите сайт (Ctrl+F5).', 'ok');
      resetForm();
      loadListings();
    } catch (err) {
      showMsg(addMsg, err.message, 'err');
    } finally {
      submitBtn.disabled = false;
    }
  });

  document.getElementById('logout-btn')?.addEventListener('click', () => {
    setPassword('');
    showApp(false);
    document.getElementById('login-password').value = '';
  });

  function initLoginHint() {
    const hint = document.getElementById('login-hint');
    if (!hint) return;
    const c = staticCounts();
    hint.textContent = `После входа — все объявления с сайта: ${c.sale} в продаже, ${c.used} в Б/У.`;
  }

  checkConfig();
  initSiteLink();
  initLoginHint();
  setCategory('sale');

  if (getPassword() && apiUrl()) {
    showApp(true);
    loadListings();
  }
})();
