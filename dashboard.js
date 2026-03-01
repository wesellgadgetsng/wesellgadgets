// dashboard.js
import { supabase, getMyProfile } from './supabase-config.js';

// ─────────────────────────────────────────────────────────────
// XSS escaper
// ─────────────────────────────────────────────────────────────
function esc(val) {
  return String(val ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
    .replace(/'/g,'&#x27;');
}

// ─────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────
let currentProfile = null;
let allProducts    = [];
let newImageFiles  = [];
let existingImages = [];

// Login rate-limit (client-side guard)
let loginAttempts  = 0;
let loginLockUntil = 0;

// ─────────────────────────────────────────────────────────────
// DOM REFS
// ─────────────────────────────────────────────────────────────
const loginGate    = document.getElementById('loginGate');
const dashContent  = document.getElementById('dashContent');
const loginForm    = document.getElementById('loginForm');
const loginError   = document.getElementById('loginError');
const dashUserName = document.getElementById('dashUserName');
const dashUserRole = document.getElementById('dashUserRole');
const logoutBtn    = document.getElementById('logoutBtn');
const tabs         = document.querySelectorAll('.dash-tab');
const panels       = document.querySelectorAll('.dash-panel');
const dashGrid     = document.getElementById('dashProductGrid');
const productForm  = document.getElementById('productForm');
const formTitle    = document.getElementById('formTitle');
const editingId    = document.getElementById('editingProductId');
const submitBtn    = document.getElementById('submitProductBtn');
const cancelBtn    = document.getElementById('cancelEditBtn');
const formMsg      = document.getElementById('formMsg');
const imageInput   = document.getElementById('pImages');
const previewRow   = document.getElementById('imagePreviewRow');
const existingRow  = document.getElementById('existingImagesRow');
const dashSearch   = document.getElementById('dashSearch');
const dashCat      = document.getElementById('dashCatFilter');
const uploadZone   = document.getElementById('imageUploadZone');
const addUserBtn   = document.getElementById('addUserBtn');
const addUserModal = document.getElementById('addUserModal');
const closeModal   = document.getElementById('closeModalBtn');
const addUserForm  = document.getElementById('addUserForm');
const addUserMsg   = document.getElementById('addUserMsg');
const userTable    = document.getElementById('userTable');
const superOnly    = document.querySelectorAll('.super-only');
const regenIdBtn   = document.getElementById('regenIdBtn');
const customIdInput= document.getElementById('pCustomId');
const idPreview    = document.getElementById('productIdPreview');

// ─────────────────────────────────────────────────────────────
// AUTH — single source of truth via onAuthStateChange
// ─────────────────────────────────────────────────────────────
let authReady = false;

// Show an initializing spinner until auth state resolves
showInitializing();

supabase.auth.onAuthStateChange(async (event, session) => {
  // INITIAL_SESSION = first evaluation (may or may not have session)
  // SIGNED_IN       = user just logged in
  // SIGNED_OUT      = user signed out / token expired
  // TOKEN_REFRESHED = silent refresh — no UI change needed

  if (event === 'INITIAL_SESSION') {
    authReady = true;
    session ? await enterDashboard() : showLoginGate();
  } else if (event === 'SIGNED_IN') {
    if (authReady) await enterDashboard();
  } else if (event === 'SIGNED_OUT') {
    showLoginGate();
  }
});

function showInitializing() {
  loginGate.classList.add('hidden');
  dashContent.classList.add('hidden');
}

// ─────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.add('hidden');

  // ── Rate-limit check ────────────────────────────────────
  const now = Date.now();
  if (now < loginLockUntil) {
    const secs = Math.ceil((loginLockUntil - now) / 1000);
    showLoginError(`Too many failed attempts. Try again in ${secs}s.`);
    return;
  }

  // ── Input validation ─────────────────────────────────────
  const rawEmail = document.getElementById('loginEmail').value.trim();
  const password  = document.getElementById('loginPassword').value;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
    showLoginError('Please enter a valid email address.');
    return;
  }
  if (password.length < 6) {
    showLoginError('Password must be at least 6 characters.');
    return;
  }

  // ── Loading state ─────────────────────────────────────────
  const submitEl = loginForm.querySelector('button[type="submit"]');
  submitEl.disabled     = true;
  submitEl.textContent  = 'Signing in…';

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: rawEmail, password
    });

    if (error) {
      loginAttempts++;
      if (loginAttempts >= 5) {
        loginLockUntil = Date.now() + 30_000;
        loginAttempts  = 0;
        showLoginError('Too many failed attempts. Locked for 30 seconds.');
      } else {
        showLoginError(error.message);
      }
    } else {
      loginAttempts = 0;
      loginLockUntil = 0;
      // onAuthStateChange SIGNED_IN fires automatically — no need to call enterDashboard here
    }
  } catch (err) {
    showLoginError('Network error — please try again.');
  } finally {
    submitEl.disabled    = false;
    submitEl.textContent = 'Sign In';
  }
});

function showLoginError(msg) {
  loginError.textContent = msg;
  loginError.classList.remove('hidden');
}

logoutBtn.addEventListener('click', () => supabase.auth.signOut());

// ─────────────────────────────────────────────────────────────
// ENTER / EXIT DASHBOARD
// ─────────────────────────────────────────────────────────────
async function enterDashboard() {
  currentProfile = await getMyProfile();

  if (!currentProfile || !currentProfile.is_active) {
    await supabase.auth.signOut();
    if (currentProfile) alert('Your account has been disabled.');
    return;
  }

  loginGate.classList.add('hidden');
  dashContent.classList.remove('hidden');
  logoutBtn.classList.remove('hidden');

  dashUserName.textContent = currentProfile.full_name || currentProfile.email;
  dashUserRole.textContent = currentProfile.role === 'super_admin'
    ? '⭐ Super Admin' : '🔑 Admin';
  dashUserRole.className   = `role-badge ${currentProfile.role}`;

  if (currentProfile.role === 'super_admin') {
    superOnly.forEach(el => el.classList.remove('hidden'));
  }

  await loadProducts();
}

function showLoginGate() {
  loginGate.classList.remove('hidden');
  dashContent.classList.add('hidden');
  logoutBtn.classList.add('hidden');
  currentProfile = null;
}

// ─────────────────────────────────────────────────────────────
// TAB SWITCHING
// ─────────────────────────────────────────────────────────────
tabs.forEach(tab => tab.addEventListener('click', () => {
  const t = tab.dataset.tab;
  tabs.forEach(x => x.classList.remove('active'));
  tab.classList.add('active');
  panels.forEach(p => p.classList.toggle('hidden', p.id !== `tab-${t}`));
  if (t === 'users')    loadUsers();
  if (t === 'products') loadProducts();
}));

function switchTab(name) {
  tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  panels.forEach(p => p.classList.toggle('hidden', p.id !== `tab-${name}`));
}

// ─────────────────────────────────────────────────────────────
// PRODUCT ID GENERATOR
// ─────────────────────────────────────────────────────────────
function generateProductId(name, category) {
  const codes = {
    phone:'P', laptop:'L', tablet:'T',
    desktop:'D', gaming:'G', accessory:'A', other:'O'
  };
  const cat  = (codes[category] || 'X');
  const br   = (document.getElementById('pBrand').value || name || '')
                 .replace(/[^a-zA-Z0-9]/g, '').slice(0,3).toUpperCase();
  const mdl  = (name || '').replace(/[^a-zA-Z0-9]/g, '').slice(3,7).toUpperCase();
  const now  = new Date();
  const d    = String(now.getDate()).padStart(2,'0');
  const m    = String(now.getMonth()+1).padStart(2,'0');
  const y    = now.getFullYear();
  const seq  = String(Math.floor(Math.random()*90+10));
  return `${cat}${br}${mdl}-${d}${m}${y}-${seq}`;
}

function autoFillId() {
  if (editingId.value) return; // don't overwrite on edit
  const name = document.getElementById('pName').value.trim();
  const cat  = document.getElementById('pCategory').value;
  if (name && cat) {
    const id = generateProductId(name, cat);
    customIdInput.value = id;
    idPreview.textContent = id;
    idPreview.style.display = 'block';
  }
}

document.getElementById('pName')?.addEventListener('blur',   autoFillId);
document.getElementById('pCategory')?.addEventListener('change', autoFillId);
regenIdBtn?.addEventListener('click', () => {
  const name = document.getElementById('pName').value.trim();
  const cat  = document.getElementById('pCategory').value;
  if (!name || !cat) { alert('Fill in Name and Category first.'); return; }
  const id = generateProductId(name, cat);
  customIdInput.value = id;
  idPreview.textContent = id;
  idPreview.style.display = 'block';
});

// ─────────────────────────────────────────────────────────────
// LOAD PRODUCTS
// ─────────────────────────────────────────────────────────────
async function loadProducts() {
  dashGrid.innerHTML = '<p class="loading-msg">Loading…</p>';
  let q = supabase.from('products')
    .select('*, product_images(id, public_url, is_primary, sort_order, storage_path)')
    .order('post_date', { ascending: false });

  if (currentProfile.role !== 'super_admin')
    q = q.eq('created_by', currentProfile.id);

  const { data, error } = await q;
  if (error) { dashGrid.innerHTML = `<p class="error-msg">${esc(error.message)}</p>`; return; }
  allProducts = data;
  renderProductGrid(data);
}

function renderProductGrid(products) {
  const search = dashSearch.value.toLowerCase();
  const cat    = dashCat.value;
  const list   = products.filter(p =>
    (!search || p.name?.toLowerCase().includes(search)
              || (p.specs||'').toLowerCase().includes(search)) &&
    (!cat    || p.category === cat)
  );

  if (!list.length) {
    dashGrid.innerHTML = '<p class="empty-msg">No products found.</p>';
    return;
  }

  dashGrid.innerHTML = list.map(p => {
    const img    = p.product_images?.find(i => i.is_primary) || p.product_images?.[0];
    const thumb  = img?.public_url || 'media/placeholder.png';
    const canEdit = currentProfile.role === 'super_admin'
                  || p.created_by === currentProfile.id;
    return `
    <div class="dash-product-card glass-card" data-id="${esc(p.id)}">
      <img src="${esc(thumb)}" alt="${esc(p.name)}" class="dash-thumb" loading="lazy"
           onerror="this.src='media/placeholder.png'">
      <div class="dash-card-info">
        <span class="dash-cat-badge">${esc(p.category||'')}</span>
        <h4>${esc(p.name)}</h4>
        ${p.custom_product_id ? `<code class="dash-pid">${esc(p.custom_product_id)}</code>` : ''}
        <p class="dash-price">₦ ${Number(p.price).toLocaleString()}</p>
        <p class="dash-condition">${esc(p.condition||'')} · qty: ${p.quantity}</p>
        <span class="pub-badge ${p.is_published ? 'published' : 'draft'}">
          ${p.is_published ? '✅ Published' : '📝 Draft'}
        </span>
      </div>
      <div class="dash-card-actions">
        ${canEdit ? `
          <button class="btn-sm btn-edit"   data-id="${esc(p.id)}">Edit</button>
          <button class="btn-sm btn-delete" data-id="${esc(p.id)}">Delete</button>
          <button class="btn-sm btn-toggle" data-id="${esc(p.id)}"
                  data-published="${p.is_published}">
            ${p.is_published ? 'Unpublish' : 'Publish'}
          </button>` : '<span style="opacity:.4;font-size:11px">No edit access</span>'}
      </div>
    </div>`;
  }).join('');

  dashGrid.querySelectorAll('.btn-edit')
    .forEach(b => b.addEventListener('click', () => startEdit(b.dataset.id)));
  dashGrid.querySelectorAll('.btn-delete')
    .forEach(b => b.addEventListener('click', () => deleteProduct(b.dataset.id)));
  dashGrid.querySelectorAll('.btn-toggle')
    .forEach(b => b.addEventListener('click', () =>
      togglePublish(b.dataset.id, b.dataset.published === 'true')));
}

dashSearch.addEventListener('input',  () => renderProductGrid(allProducts));
dashCat.addEventListener('change',    () => renderProductGrid(allProducts));

// ─────────────────────────────────────────────────────────────
// IMAGE UPLOAD ZONE
// ─────────────────────────────────────────────────────────────
uploadZone.addEventListener('click', () => imageInput.click());

['dragenter','dragover','dragleave','drop'].forEach(ev =>
  uploadZone.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); }));
['dragenter','dragover'].forEach(ev =>
  uploadZone.addEventListener(ev, () => uploadZone.classList.add('drag-active')));
['dragleave','drop'].forEach(ev =>
  uploadZone.addEventListener(ev, () => uploadZone.classList.remove('drag-active')));

uploadZone.addEventListener('drop', e => {
  const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/'));
  if (files.length) addImages(files);
});

document.addEventListener('paste', e => {
  const files = [...(e.clipboardData?.items||[])]
    .filter(i => i.type.startsWith('image/')).map(i => i.getAsFile());
  if (files.length) addImages(files);
});

imageInput.addEventListener('change', () => {
  addImages([...imageInput.files].filter(f => f.type.startsWith('image/')));
});

function addImages(files) {
  newImageFiles = [...newImageFiles, ...files].slice(0, 6);
  renderPreviews();
}

function renderPreviews() {
  previewRow.innerHTML = newImageFiles.map((f, i) => {
    const url = URL.createObjectURL(f);
    return `<div class="preview-thumb">
      <img src="${url}" alt="img ${i+1}">
      <span class="remove-img" data-idx="${i}">✕</span>
      ${i === 0 ? '<span class="primary-badge">Primary</span>' : ''}
    </div>`;
  }).join('');
  previewRow.querySelectorAll('.remove-img').forEach(btn =>
    btn.addEventListener('click', () => {
      newImageFiles.splice(+btn.dataset.idx, 1);
      renderPreviews();
    }));
}

// ─────────────────────────────────────────────────────────────
// SAVE PRODUCT
// ─────────────────────────────────────────────────────────────
productForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving…';
  showFormMsg('', false);

  const isEdit  = !!editingId.value;
  const keywords = (document.getElementById('pKeywords').value || '')
    .split(',').map(k => k.trim().toLowerCase()).filter(Boolean);

  const productData = {
    name:              document.getElementById('pName').value.trim(),
    category:          document.getElementById('pCategory').value,
    condition:         document.getElementById('pCondition').value,
    price:             parseFloat(document.getElementById('pPrice').value),
    quantity:          parseInt(document.getElementById('pQty').value) || 0,
    specs:             document.getElementById('pSpecs').value.trim(),
    keywords,
    whatsapp_link:     document.getElementById('pWhatsapp').value.trim(),
    is_published:      document.getElementById('pPublished').checked,
    // new fields
    brand:             document.getElementById('pBrand').value.trim(),
    ram:               document.getElementById('pRam').value.trim(),
    processor:         document.getElementById('pProcessor').value.trim(),
    storage:           document.getElementById('pStorage').value.trim(),
    screen_size:       document.getElementById('pScreenSize').value.trim(),
    operating_system:  document.getElementById('pOs').value.trim(),
    supplier:          document.getElementById('pSupplier').value.trim(),
    video_url:         document.getElementById('pVideoUrl').value.trim() || null,
    custom_product_id: document.getElementById('pCustomId').value.trim() || null,
  };

  try {
    let productId = editingId.value;

    if (isEdit) {
      const { error } = await supabase.from('products')
        .update(productData).eq('id', productId);
      if (error) throw error;
    } else {
      productData.created_by = currentProfile.id;
      const { data, error } = await supabase.from('products')
        .insert(productData).select().single();
      if (error) throw error;
      productId = data.id;
    }

    // Upload new images
    for (let i = 0; i < newImageFiles.length; i++) {
      const file = newImageFiles[i];
      const ext  = file.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g,'');
      const path = `${currentProfile.id}/${productId}/${Date.now()}-${i}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('product-images').upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage
        .from('product-images').getPublicUrl(path);

      await supabase.from('product_images').insert({
        product_id:   productId,
        storage_path: path,
        public_url:   urlData.publicUrl,
        is_primary:   i === 0 && existingImages.length === 0,
        sort_order:   existingImages.length + i,
      });
    }

    showFormMsg(`✅ Product ${isEdit ? 'updated' : 'created'} successfully!`, true);
    resetForm();
    await loadProducts();
    switchTab('products');

  } catch (err) {
    showFormMsg(`❌ ${err.message}`, false);
  } finally {
    submitBtn.disabled    = false;
    submitBtn.textContent = editingId.value ? 'Update Product' : 'Save Product';
  }
});

// ─────────────────────────────────────────────────────────────
// EDIT
// ─────────────────────────────────────────────────────────────
async function startEdit(id) {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;

  switchTab('add-product');
  formTitle.textContent = 'Edit Product';
  editingId.value       = id;
  cancelBtn.classList.remove('hidden');
  submitBtn.textContent = 'Update Product';

  document.getElementById('pName').value         = p.name || '';
  document.getElementById('pCategory').value     = p.category || '';
  document.getElementById('pCondition').value    = p.condition || '';
  document.getElementById('pPrice').value        = p.price || '';
  document.getElementById('pQty').value          = p.quantity || '';
  document.getElementById('pSpecs').value        = p.specs || '';
  document.getElementById('pKeywords').value     = (p.keywords||[]).join(', ');
  document.getElementById('pWhatsapp').value     = p.whatsapp_link || '';
  document.getElementById('pPublished').checked  = p.is_published;
  document.getElementById('pBrand').value        = p.brand || '';
  document.getElementById('pRam').value          = p.ram || '';
  document.getElementById('pProcessor').value    = p.processor || '';
  document.getElementById('pStorage').value      = p.storage || '';
  document.getElementById('pScreenSize').value   = p.screen_size || '';
  document.getElementById('pOs').value           = p.operating_system || '';
  document.getElementById('pSupplier').value     = p.supplier || '';
  document.getElementById('pVideoUrl').value     = p.video_url || '';
  document.getElementById('pCustomId').value     = p.custom_product_id || '';

  if (p.custom_product_id) {
    idPreview.textContent  = p.custom_product_id;
    idPreview.style.display = 'block';
  }

  existingImages = p.product_images || [];
  existingRow.innerHTML = existingImages.map((img, i) => `
    <div class="preview-thumb" data-img-id="${esc(img.id)}">
      <img src="${esc(img.public_url)}" alt="img ${i+1}"
           onerror="this.src='media/placeholder.png'">
      ${img.is_primary ? '<span class="primary-badge">Primary</span>' : ''}
      <span class="remove-existing" data-img-id="${esc(img.id)}">✕</span>
    </div>`
  ).join('');

  existingRow.querySelectorAll('.remove-existing').forEach(btn =>
    btn.addEventListener('click', () => removeExistingImage(btn.dataset.imgId)));
}

async function removeExistingImage(imgId) {
  const img = existingImages.find(i => i.id === imgId);
  if (!img) return;
  await supabase.storage.from('product-images').remove([img.storage_path]);
  await supabase.from('product_images').delete().eq('id', imgId);
  existingImages = existingImages.filter(i => i.id !== imgId);
  document.querySelector(`[data-img-id="${imgId}"]`)?.remove();
}

cancelBtn.addEventListener('click', resetForm);

function resetForm() {
  productForm.reset();
  editingId.value        = '';
  newImageFiles          = [];
  existingImages         = [];
  previewRow.innerHTML   = '';
  existingRow.innerHTML  = '';
  formTitle.textContent  = 'Add New Product';
  submitBtn.textContent  = 'Save Product';
  cancelBtn.classList.add('hidden');
  idPreview.style.display = 'none';
  showFormMsg('', false);
}

// ─────────────────────────────────────────────────────────────
// DELETE / TOGGLE PUBLISH
// ─────────────────────────────────────────────────────────────
async function deleteProduct(id) {
  if (!confirm('Delete this product permanently?')) return;
  const p = allProducts.find(x => x.id === id);
  if (p?.product_images?.length) {
    const paths = p.product_images.map(i => i.storage_path).filter(Boolean);
    if (paths.length) await supabase.storage.from('product-images').remove(paths);
  }
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) { alert(error.message); return; }
  await loadProducts();
}

async function togglePublish(id, current) {
  await supabase.from('products').update({ is_published: !current }).eq('id', id);
  await loadProducts();
}

// ─────────────────────────────────────────────────────────────
// USER MANAGEMENT
// ─────────────────────────────────────────────────────────────
addUserBtn?.addEventListener('click', () => addUserModal.classList.remove('hidden'));
closeModal?.addEventListener('click', () => addUserModal.classList.add('hidden'));

addUserForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (currentProfile?.role !== 'super_admin') { alert('Unauthorized'); return; }
  addUserMsg.classList.add('hidden');

  const { data, error } = await supabase.functions.invoke('create-user', {
    body: {
      email:     document.getElementById('newUserEmail').value.trim(),
      password:  document.getElementById('newUserPassword').value,
      full_name: document.getElementById('newUserName').value.trim(),
      role:      document.getElementById('newUserRole').value,
    }
  });

  if (error || data?.error) {
    addUserMsg.textContent = error?.message || data.error;
    addUserMsg.style.color = '#ff6b6b';
    addUserMsg.classList.remove('hidden');
    return;
  }
  addUserMsg.textContent  = '✅ User created!';
  addUserMsg.style.color  = '#00d4a7';
  addUserMsg.classList.remove('hidden');
  addUserForm.reset();
  loadUsers();
});

async function loadUsers() {
  userTable.innerHTML = '<p class="loading-msg">Loading users…</p>';
  const { data, error } = await supabase.from('profiles').select('*').order('created_at');
  if (error) { userTable.innerHTML = `<p class="error-msg">${esc(error.message)}</p>`; return; }

  userTable.innerHTML = `
    <table class="user-list-table">
      <thead>
        <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr>
      </thead>
      <tbody>
        ${data.map(u => `
          <tr>
            <td>${esc(u.full_name||'—')}</td>
            <td>${esc(u.email)}</td>
            <td><span class="role-badge ${esc(u.role)}">${esc(u.role)}</span></td>
            <td><span class="${u.is_active ? 'active-dot':'inactive-dot'}">
              ${u.is_active ? 'Active':'Disabled'}
            </span></td>
            <td>${u.id !== currentProfile?.id ? `
              <button class="btn-sm btn-deactivate"
                data-uid="${esc(u.id)}" data-active="${u.is_active}">
                ${u.is_active ? 'Disable':'Enable'}
              </button>` : '—'}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;

  userTable.querySelectorAll('.btn-deactivate').forEach(btn =>
    btn.addEventListener('click', async () => {
      const active = btn.dataset.active === 'true';
      await supabase.from('profiles')
        .update({ is_active: !active }).eq('id', btn.dataset.uid);
      loadUsers();
    }));
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function showFormMsg(msg, success) {
  formMsg.textContent = msg;
  formMsg.style.color = success ? '#00d4a7' : '#ff6b6b';
  formMsg.classList.toggle('hidden', !msg);
}
