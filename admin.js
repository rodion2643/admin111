(function () {
  'use strict';

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
  const listEl = document.getElementById('listings-list');
  const configWarn = document.getElementById('config-warn');
  const photoInput = document.getElementById('photo-input');
  const photoPreview = document.getElementById('photo-preview');
  const photoEmpty = document.getElementById('photo-empty');
  const submitBtn = document.getElementById('submit-btn');
  const cancelEditBtn = document.getElementById('cancel-edit');
  const editIdInput = document.getElementById('edit-id');
  const formTitle = document.getElementById('form-title');

  let editImageUrl = '';

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

  function imgUrl(item) {
    const raw = item.image || '';
    if (!raw) return '';
    if (/drive\.google\.com/i.test(raw)) {
      const m = raw.match(/[?&]id=([^&]+)/) || raw.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w400`;
    }
    if (/^https?:\/\//i.test(raw)) return raw;
    return '../' + raw.replace(/^\.\//, '');
  }

  function buildListing(fd) {
    const type = fd.get('type')?.toString() || 'Самокат';
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

    return { name, type, price, specs };
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

  function mergeVisibleList(remoteItems, hiddenIds) {
    const hidden = new Set(hiddenIds || []);
    const remoteActive = (remoteItems || []).filter(i => i.active);
    const remoteIds = new Set(remoteActive.map(i => i.id));
    const staticItems = ((window.KWT && KWT.saleCatalog) || [])
      .filter(i => !hidden.has(i.id) && !remoteIds.has(i.id))
      .map(i => ({ ...i, source: 'site' }));

    const remoteMapped = remoteActive.map(i => ({
      ...i,
      source: String(i.id).startsWith('adm-') ? 'new' : 'edited',
    }));

    return [...remoteMapped, ...staticItems];
  }

  async function loadListings() {
    if (!listEl) return;
    listEl.innerHTML = '<p class="muted">Загрузка…</p>';
    try {
      const data = await api({ action: 'list', password: getPassword() });
      if (!data.ok) throw new Error(data.error || 'Ошибка');
      const items = mergeVisibleList(data.items, data.hidden);
      renderList(items);
    } catch (e) {
      listEl.innerHTML = `<p class="msg err">${esc(e.message)}</p>`;
    }
  }

  function renderList(items) {
    if (!items.length) {
      listEl.innerHTML = '<p class="muted">Нет объявлений на сайте.</p>';
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

  function findItemById(id) {
    const staticItem = ((KWT && KWT.saleCatalog) || []).find(i => i.id === id);
    return staticItem || null;
  }

  async function startEdit(id) {
    const data = await api({ action: 'list', password: getPassword() });
    let item = (data.items || []).find(i => i.id === id && i.active);
    if (!item) item = findItemById(id);
    if (!item) return;

    editIdInput.value = id;
    editImageUrl = imgUrl(item);
    formTitle.textContent = 'Редактировать объявление';
    submitBtn.textContent = '✓ Сохранить изменения';
    cancelEditBtn.hidden = false;
    photoInput.required = false;

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

    addForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function resetForm() {
    editIdInput.value = '';
    editImageUrl = '';
    formTitle.textContent = 'Новое объявление';
    submitBtn.textContent = '✓ Опубликовать на сайте';
    cancelEditBtn.hidden = true;
    photoInput.required = true;
    addForm.reset();
    photoPreview.hidden = true;
    photoEmpty.hidden = false;
    photoPreview.src = '';
  }

  function initSiteLink() {
    const link = document.getElementById('site-home');
    if (!link) return;
    const path = location.pathname.replace(/\/admin(\/.*)?$/i, '/');
    link.href = path.includes('github.io') ? path : (path || '../');
  }

  async function removeListing(id) {
    if (!confirm('Убрать объявление с сайта?')) return;
    try {
      let data = await api({ action: 'remove', password: getPassword(), id });
      if (!data.ok && /unknown|неизвест/i.test(String(data.error))) {
        data = await api({ action: 'delete', password: getPassword(), id });
      }
      if (!data.ok) {
        throw new Error(data.error || 'Не удалось снять. Обновите Google скрипт: upgradeOnce → Новая версия → Развернуть');
      }
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
      };

      if (photo instanceof File && photo.size) {
        showMsg(addMsg, 'Загружаем фото…');
        payload.imageBase64 = await compressPhoto(photo);
        payload.imageName = 'photo.jpg';
      } else if (isEdit && editImageUrl) {
        payload.image = editImageUrl.startsWith('../') ? editImageUrl.slice(3) : editImageUrl;
      } else if (!isEdit) {
        throw new Error('Добавьте фото');
      }

      showMsg(addMsg, isEdit ? 'Сохраняем…' : 'Публикуем…');

      if (isEdit) {
        payload.action = 'update';
        payload.id = editIdInput.value;
      } else {
        payload.action = 'add';
      }

      const data = await api(payload);
      if (!data.ok) throw new Error(data.error || 'Ошибка');

      showMsg(addMsg, '✓ Готово! Обновите сайт.', 'ok');
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

  checkConfig();
  initSiteLink();
  if (getPassword() && apiUrl()) {
    showApp(true);
    loadListings();
  }
})();
