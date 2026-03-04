const $ = (sel) => document.querySelector(sel);

const VIEWS = ['view-login', 'view-no-listing', 'view-preview', 'view-success'];
const DASHBOARD_URL = 'https://trouve-ton-toit.vercel.app';

let extractedData = null;

function showView(id) {
  VIEWS.forEach(v => {
    $(`#${v}`).style.display = v === id ? 'block' : 'none';
  });
}

function showLoading(text = 'Chargement...') {
  $('#loading-text').textContent = text;
  $('#loading').style.display = 'flex';
}

function hideLoading() {
  $('#loading').style.display = 'none';
}

function formatPrice(price) {
  if (!price) return '—';
  return Number(price).toLocaleString('fr-FR') + ' €';
}

function renderPreview(data) {
  const photos = data.images || [];
  const photosEl = $('#preview-photos');
  photosEl.innerHTML = '';
  photos.slice(0, 6).forEach(url => {
    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Photo';
    img.onerror = () => img.remove();
    photosEl.appendChild(img);
  });

  $('#preview-title').textContent = data.title || 'Bien immobilier';
  $('#preview-price').textContent = formatPrice(data.price);
  $('#preview-city').textContent = [data.city, data.postal_code].filter(Boolean).join(' ') || '—';
  $('#preview-type').textContent = (data.property_type || '—').toUpperCase();
  $('#preview-surface').textContent = data.surface ? `${data.surface} m²` : '—';
  $('#preview-rooms').textContent = data.rooms || '—';

  if (data.bedrooms) {
    $('#row-bedrooms').style.display = 'flex';
    $('#preview-bedrooms').textContent = data.bedrooms;
  }

  if (data.energy_class) {
    $('#row-energy').style.display = 'flex';
    $('#preview-energy').textContent = data.energy_class;
  }

  const amenities = data.amenities || [];
  if (amenities.length > 0) {
    const el = $('#preview-amenities');
    el.style.display = 'flex';
    el.innerHTML = amenities.map(a => `<span class="amenity-badge">${a}</span>`).join('');
  }
}

// ── Initialization ──────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  showLoading('Vérification...');

  const authResp = await sendMessage({ type: 'CHECK_AUTH' });

  if (!authResp?.loggedIn) {
    hideLoading();
    showView('view-login');
    return;
  }

  $('#btn-logout').style.display = 'block';
  await tryExtract();
});

async function tryExtract() {
  showLoading('Extraction des données...');

  const resp = await sendMessage({ type: 'EXTRACT_DATA' });
  hideLoading();

  if (resp?.success && resp.data) {
    extractedData = resp.data;
    renderPreview(extractedData);
    showView('view-preview');
  } else {
    showView('view-no-listing');
  }
}

// ── Login ───────────────────────────────────

$('#form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('#email').value.trim();
  const password = $('#password').value;

  $('#login-error').style.display = 'none';
  $('#btn-login').disabled = true;
  $('#btn-login').textContent = 'Connexion...';

  const resp = await sendMessage({ type: 'SIGN_IN', email, password });

  if (resp?.success) {
    $('#btn-logout').style.display = 'block';
    await tryExtract();
  } else {
    $('#login-error').textContent = resp?.error || 'Identifiants incorrects';
    $('#login-error').style.display = 'block';
  }

  $('#btn-login').disabled = false;
  $('#btn-login').textContent = 'Se connecter';
});

// ── Save ────────────────────────────────────

$('#btn-save').addEventListener('click', async () => {
  if (!extractedData) return;

  $('#save-error').style.display = 'none';
  $('#btn-save').disabled = true;
  showLoading('Enregistrement du bien...');

  const resp = await sendMessage({ type: 'SAVE_LISTING', data: extractedData });
  hideLoading();

  if (resp?.success) {
    const listingId = resp.listing?.id;
    const dashUrl = listingId
      ? `${DASHBOARD_URL}/listings/${listingId}`
      : `${DASHBOARD_URL}/listings`;
    $('#link-dashboard').href = dashUrl;
    showView('view-success');
  } else {
    $('#save-error').textContent = resp?.error || 'Erreur lors de l\'enregistrement';
    $('#save-error').style.display = 'block';
    $('#btn-save').disabled = false;
  }
});

// ── Logout ──────────────────────────────────

$('#btn-logout').addEventListener('click', async () => {
  await sendMessage({ type: 'SIGN_OUT' });
  $('#btn-logout').style.display = 'none';
  extractedData = null;
  showView('view-login');
});

// ── New import ──────────────────────────────

$('#btn-new').addEventListener('click', async () => {
  extractedData = null;
  await tryExtract();
});

// ── Messaging helper ────────────────────────

function sendMessage(msg) {
  return new Promise(resolve => {
    chrome.runtime.sendMessage(msg, response => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      resolve(response);
    });
  });
}
