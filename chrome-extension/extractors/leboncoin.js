/**
 * LeBonCoin extractor.
 *
 * Strategy:
 *   1. Try __NEXT_DATA__ JSON embedded by Next.js (most reliable)
 *   2. Fallback to DOM selectors
 */

// eslint-disable-next-line no-var
var extractLeBonCoin = (function () {
  'use strict';

  function canHandle() {
    return location.hostname.includes('leboncoin.fr') && location.pathname.startsWith('/ad/');
  }

  function extract() {
    const fromNext = tryNextData();
    if (fromNext) return fromNext;
    return tryDOM();
  }

  // ── __NEXT_DATA__ approach ──────────────────

  function tryNextData() {
    try {
      const script = document.querySelector('script#__NEXT_DATA__');
      if (!script) return null;
      const json = JSON.parse(script.textContent);
      const ad = findAd(json);
      if (!ad) return null;
      return mapNextAd(ad);
    } catch {
      return null;
    }
  }

  function findAd(json) {
    // Navigate through typical Next.js page props structures
    const props = json?.props?.pageProps;
    if (!props) return null;

    if (props.ad) return props.ad;
    if (props.initialProps?.ad) return props.initialProps.ad;

    // Apollo / dehydrated state - walk all keys looking for an object with "list_id" or "subject"
    const str = JSON.stringify(props);
    if (str.includes('"list_id"') || str.includes('"subject"')) {
      return deepFindAd(props);
    }
    return null;
  }

  function deepFindAd(obj) {
    if (!obj || typeof obj !== 'object') return null;
    if (obj.list_id && obj.subject) return obj;
    for (const v of Object.values(obj)) {
      const found = deepFindAd(v);
      if (found) return found;
    }
    return null;
  }

  function mapNextAd(ad) {
    const attrs = ad.attributes || {};
    const attrMap = {};
    if (Array.isArray(attrs)) {
      attrs.forEach(a => { attrMap[(a.key || '').toLowerCase()] = a.value ?? a.value_label ?? ''; });
    } else {
      Object.assign(attrMap, attrs);
    }

    const price = ad.price?.[0] ?? ad.price ?? parseNum(attrMap.price);
    const rooms = parseInt(attrMap.rooms || attrMap.piece || '0', 10) || null;
    const surface = parseNum(attrMap.square || attrMap.surface || attrMap.carrez);
    const bedrooms = parseInt(attrMap.bedrooms || '0', 10) || null;
    const bathrooms = parseInt(attrMap.bathrooms || attrMap.salle_de_bain || '0', 10) || null;
    const floor = parseInt(attrMap.floor || attrMap.etage || '', 10) || null;

    const cat = (ad.category_name || ad.categoryName || '').toLowerCase();
    const isMaison = cat.includes('maison') || cat.includes('villa');
    const isTerrain = cat.includes('terrain');
    const isLoft = cat.includes('loft');
    const typeMap = { 1: 'studio', 2: 't2', 3: 't3', 4: 't4', 5: 't5' };
    const property_type = isTerrain ? 'terrain' : isLoft ? 'loft' : isMaison ? 'maison' : (typeMap[rooms] || 't3');

    const transaction_type = cat.includes('location') ? 'location' : 'vente';

    let images = [];
    if (ad.images?.urls) images = ad.images.urls;
    else if (ad.images?.urls_large) images = ad.images.urls_large;
    else if (Array.isArray(ad.images)) images = ad.images;
    if (ad.media?.images?.urls) images = ad.media.images.urls;

    let dpe = attrMap.energy_rate || attrMap.dpe || null;
    let ges = attrMap.ges || null;
    if (dpe && /^[A-G]$/i.test(dpe)) dpe = dpe.toUpperCase(); else dpe = null;
    if (ges && /^[A-G]$/i.test(ges)) ges = ges.toUpperCase(); else ges = null;

    const amenities = [];
    const hasKey = (keys) => keys.some(k => attrMap[k] != null && attrMap[k] !== '' && attrMap[k] !== '0');
    if (hasKey(['parking', 'garage'])) amenities.push('parking');
    if (hasKey(['balcon', 'balcony'])) amenities.push('balcon');
    if (hasKey(['terrasse', 'terrace'])) amenities.push('terrasse');
    if (hasKey(['jardin', 'garden'])) amenities.push('jardin');
    if (hasKey(['cave', 'cellar'])) amenities.push('cave');
    if (hasKey(['ascenseur', 'elevator', 'lift'])) amenities.push('ascenseur');

    return {
      title: ad.subject || ad.title || '',
      description: ad.body || ad.description || '',
      price: price || null,
      city: ad.location?.city || '',
      postal_code: ad.location?.zipcode || ad.location?.postal_code || '',
      surface,
      rooms,
      bedrooms,
      bathrooms,
      floor,
      property_type,
      transaction_type,
      energy_class: dpe,
      ges_class: ges,
      amenities,
      images: images.filter(u => typeof u === 'string'),
      source_url: location.href,
      latitude: ad.location?.lat ?? null,
      longitude: ad.location?.lng ?? null,
    };
  }

  // ── DOM fallback ────────────────────────────

  function tryDOM() {
    const title = textOf('[data-qa-id="adview_title"]') || textOf('h1');
    const priceText = textOf('[data-qa-id="adview_price"]') || textOf('[class*="Price"]');
    const price = parseNum(priceText);

    const descEl = document.querySelector('[data-qa-id="adview_description_container"]');
    const description = descEl ? descEl.innerText.trim() : '';

    const cityEl = textOf('[data-qa-id="adview_location_informations"]') || '';
    const cityParts = cityEl.split(/\s+/);
    const postal_code = cityParts.find(p => /^\d{5}$/.test(p)) || '';
    const city = cityParts.filter(p => !/^\d{5}$/.test(p)).join(' ').trim();

    const criteriaEls = document.querySelectorAll('[data-qa-id="criteria_item"]');
    let rooms = null, surface = null, bedrooms = null;
    criteriaEls.forEach(el => {
      const label = (el.querySelector('[data-qa-id="criteria_item_label"]')?.textContent || '').toLowerCase();
      const value = el.querySelector('[data-qa-id="criteria_item_value"]')?.textContent || '';
      if (label.includes('pièce')) rooms = parseInt(value, 10) || null;
      if (label.includes('surface') || label.includes('m²')) surface = parseNum(value);
      if (label.includes('chambre')) bedrooms = parseInt(value, 10) || null;
    });

    const images = [];
    document.querySelectorAll('[data-qa-id="adview_gallery"] img, [class*="Gallery"] img').forEach(img => {
      const src = img.src || img.dataset.src;
      if (src && src.startsWith('http') && !src.includes('logo')) images.push(src);
    });

    const typeMap = { 1: 'studio', 2: 't2', 3: 't3', 4: 't4', 5: 't5' };
    const titleLow = (title || '').toLowerCase();
    const property_type = titleLow.includes('maison') ? 'maison' :
      titleLow.includes('terrain') ? 'terrain' :
      titleLow.includes('loft') ? 'loft' :
      (typeMap[rooms] || 't3');

    const transaction_type = location.pathname.includes('location') ? 'location' : 'vente';

    return {
      title,
      description,
      price,
      city,
      postal_code,
      surface,
      rooms,
      bedrooms,
      bathrooms: null,
      floor: null,
      property_type,
      transaction_type,
      energy_class: null,
      ges_class: null,
      amenities: [],
      images: [...new Set(images)],
      source_url: location.href,
      latitude: null,
      longitude: null,
    };
  }

  // ── Utilities ───────────────────────────────

  function textOf(sel) {
    const el = document.querySelector(sel);
    return el ? el.textContent.trim() : '';
  }

  function parseNum(str) {
    if (str == null) return null;
    const n = parseInt(String(str).replace(/[^\d]/g, ''), 10);
    return isNaN(n) ? null : n;
  }

  return { canHandle, extract };
})();
