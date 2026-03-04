/**
 * IAD France extractor.
 *
 * Strategy: DOM + fallback parsing from page text (title often contains "X pièces Y m² Ville")
 */

// eslint-disable-next-line no-var
var extractIAD = (function () {
  'use strict';

  const P = window.TTT_Parser;

  function canHandle() {
    const host = location.hostname;
    const path = location.pathname || '';
    if (!host.includes('iadfrance') && !host.includes('iad.fr')) return false;
    return path.includes('/annonce') || path.includes('/ad/') || path.startsWith('/annonces/');
  }

  function extract() {
    let data = tryNextData();
    if (!data) data = tryJsonLd();
    if (!data) data = tryDOM();
    if (data && P?.fillFromText) return P.fillFromText(data);
    return data;
  }

  function tryNextData() {
    try {
      const s = document.querySelector('script#__NEXT_DATA__') || document.querySelector('script#__NUXT_DATA__');
      if (!s) return null;
      const json = JSON.parse(s.textContent);
      const listing = findIadListing(json);
      if (!listing) return null;
      return mapIadListing(listing);
    } catch { return null; }
  }

  function findIadListing(obj, depth = 0) {
    if (depth > 15 || !obj || typeof obj !== 'object') return null;
    const o = obj;
    const hasPrice = o.price != null || (o.offers && o.offers.price);
    const hasSurface = o.surface != null || o.floorSize != null || (o.characteristics && (o.characteristics.surface || o.characteristics.living_area));
    const hasImages = Array.isArray(o.images) && o.images.length > 0 || o.image || (o.media && (o.media.images || o.media.photos));
    if ((hasPrice || hasSurface) && (hasImages || o.title || o.name)) return o;
    const keys = ['props', 'pageProps', 'data', 'ad', 'listing', 'property', 'annonce', 'initialProps'];
    for (const k of keys) {
      const found = findIadListing(o[k], depth + 1);
      if (found) return found;
    }
    if (o.props) return findIadListing(o.props.pageProps || o.props, depth + 1);
    for (const v of Object.values(o)) {
      if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
        const found = findIadListing(v, depth + 1);
        if (found) return found;
      }
    }
    return null;
  }

  function mapIadListing(l) {
    const offer = l.offers || {};
    const price = parseNum(offer.price || l.price);
    const chars = l.characteristics || l.characteristics_data || {};
    const surface = parseNum(chars.surface || chars.living_area || chars.floor_size || l.floorSize?.value);
    const rooms = parseInt(chars.rooms || chars.pieces || l.numberOfRooms || chars.number_of_rooms, 10) || null;
    const bedrooms = parseInt(chars.bedrooms || chars.chambres || l.numberOfBedrooms || chars.number_of_bedrooms, 10) || null;
    const address = l.address || l.location || {};
    const city = address.city || address.addressLocality || address.locality || '';
    const postal_code = address.postalCode || address.postal_code || address.zip || '';

    let images = [];
    if (Array.isArray(l.images)) {
      images = l.images.map(i => typeof i === 'string' ? i : (i?.url || i?.src || i?.default_url || i?.original_url)).filter(Boolean);
    } else if (l.image) {
      const arr = Array.isArray(l.image) ? l.image : [l.image];
      images = arr.map(i => typeof i === 'string' ? i : (i?.url || i?.contentUrl)).filter(Boolean);
    } else if (l.media?.images) {
      images = (l.media.images.urls || l.media.images || []).map(i => typeof i === 'string' ? i : i?.url).filter(Boolean);
    } else if (l.photos?.length) {
      images = l.photos.map(p => p.url || p.src || p.original_url).filter(Boolean);
    }

    const terrain = parseNum(chars.terrain) || parseNum(chars.land_area) || (chars.terrain_sqm);
    return {
      title: l.title || l.name || '',
      description: l.description || '',
      price,
      city: city || '',
      postal_code: postal_code || '',
      surface,
      rooms,
      bedrooms,
      bathrooms: parseInt(chars.bathrooms || chars.salles_de_bain, 10) || null,
      floor: parseInt(chars.floor || chars.etage, 10) || null,
      property_type: (P && P.guessType) ? P.guessType(l.title || l.name || '', rooms, bedrooms) : guessType(l.title || '', rooms),
      transaction_type: (l.transaction_type || l.type || '').toLowerCase().includes('location') ? 'location' : 'vente',
      energy_class: null,
      ges_class: null,
      amenities: [],
      images,
      amenities_data: terrain ? { terrain_sqm: terrain } : undefined,
      source_url: location.href,
      latitude: null,
      longitude: null,
    };
  }

  function tryJsonLd() {
    try {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of scripts) {
        const data = JSON.parse(script.textContent);
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          if (item['@type'] === 'Product' || item['@type'] === 'RealEstateListing') {
            return mapJsonLd(item);
          }
        }
      }
    } catch { /* fallback */ }
    return null;
  }

  function mapJsonLd(item) {
    const offer = item.offers || {};
    const address = item.address || {};
    const images = [];
    if (item.image) {
      const arr = Array.isArray(item.image) ? item.image : [item.image];
      arr.forEach(i => {
        const url = typeof i === 'string' ? i : i.url || i.contentUrl;
        if (url) images.push(url);
      });
    }
    return {
      title: item.name || '',
      description: item.description || '',
      price: parseNum(offer.price || item.price),
      city: address.addressLocality || '',
      postal_code: address.postalCode || '',
      surface: parseNum(item.floorSize?.value),
      rooms: parseInt(item.numberOfRooms, 10) || null,
      bedrooms: parseInt(item.numberOfBedrooms, 10) || null,
      bathrooms: null,
      floor: null,
      property_type: (P && P.guessType) ? P.guessType(item.name || '', null, null) : guessType(item.name || '', null),
      transaction_type: location.href.includes('location') ? 'location' : 'vente',
      energy_class: null,
      ges_class: null,
      amenities: [],
      images,
      source_url: location.href,
      latitude: null,
      longitude: null,
    };
  }

  function tryDOM() {
    const title = textOf('h1, [class*="title"], [class*="Title"], [data-testid="title"]');
    const priceText = textOf('[class*="price"], [class*="Price"], .annonce-price, [data-testid="price"]') ||
      textOf('[class*="Price"]') || textOf('[class*="amount"]');
    const price = parseNum(priceText) || (P && P.parsePrice && P.parsePrice((P.getPageText ? P.getPageText() : '') + ' ' + title));
    const description = textOf('[class*="description"], [class*="Description"], .annonce-text');

    const locationText = textOf('[class*="location"], [class*="Location"], .annonce-location, [class*="address"], [class*="city"], [class*="City"]') || '';
    const postal_code = (locationText.match(/\d{5}/) || [null])[0] || null;
    let city = (locationText
      .replace(/\+33\s*\d[\d\s.]{8,15}/g, '')
      .replace(/Voir\s*le\s*numéro|Appeler/gi, '')
      .replace(/\d{5}/g, ' ')
      .replace(/[()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim());
    if (city.includes('pièces') || city.includes('m²') || city.length > 50) city = '';

    let rooms = null, surface = null, bedrooms = null, bathrooms = null, floor = null;

    const criteriaSel = '[class*="detail"] li, [class*="feature"] li, [class*="criteria"] li, [class*="characteristic"] li, [class*="tag"] li, [class*="Tag"] li, [class*="Badge"] li, [class*="Criterion"], [class*="criterion"], .annonce-features li, [data-testid*="criteria"]';
    document.querySelectorAll(criteriaSel).forEach(el => {
      const text = el.textContent || '';
      const lower = text.toLowerCase();
      if (lower.includes('pièce')) {
        const n = parseInt(text.replace(/[^\d]/g, '').substring(0, 2), 10);
        if (!isNaN(n)) rooms = n;
      }
      if (lower.includes('m²') || lower.includes('m2')) {
        const m = text.match(/(\d{1,3}(?:[.,]\d+)?)\s*m/i);
        if (m) {
          const n = parseFloat(m[1].replace(',', '.'));
          if (n > 0 && n < 2000) surface = n;
        }
      }
      if (lower.includes('chambre')) {
        const n = parseInt(text.replace(/[^\d]/g, '').substring(0, 2), 10);
        if (!isNaN(n)) bedrooms = n;
      }
      if (lower.includes('salle') && lower.includes('bain')) {
        const n = parseInt(text.replace(/[^\d]/g, '').substring(0, 2), 10);
        if (!isNaN(n)) bathrooms = n;
      }
      if (lower.includes('étage') || lower.includes('etage')) {
        const n = parseInt(text.replace(/[^\d]/g, '').substring(0, 2), 10);
        if (!isNaN(n)) floor = n;
      }
    });

    const pageText = P ? P.getPageText() : (document.body?.innerText || '');
    const fullText = title + ' ' + pageText;
    if (P) {
      if (!rooms) rooms = P.parseRooms(fullText) || P.parseRooms(title);
      if (!surface) surface = P.parseSurface(fullText) || P.parseSurface(title);
      if (!bedrooms) bedrooms = P.parseBedrooms(fullText) || P.parseBedrooms(title);
      if (!city && P.parseCity(title)) city = P.parseCity(title);
    }
    let terrainSqm = null;
    document.querySelectorAll('[class*="feature"], [class*="characteristic"], [class*="info"], [class*="stat"], [class*="criteria"], [class*="detail"]').forEach(el => {
      const t = el.textContent || '';
      const mCh = t.match(/(\d+)\s*chambres?/i);
      if (mCh && !bedrooms) bedrooms = parseInt(mCh[1], 10);
      const mPc = t.match(/(\d+)\s*pièces?/i);
      if (mPc && !rooms) rooms = parseInt(mPc[1], 10);
      const mS = t.match(/(\d{1,3}(?:[.,]\d+)?)\s*m\s*²/i);
      if (mS && !surface && !t.toLowerCase().includes('terrain')) surface = parseFloat(mS[1].replace(',', '.')) || surface;
      if (t.toLowerCase().includes('terrain')) {
        const mT = t.match(/(\d[\d\s]*)\s*m\s*²|(\d[\d\s]*)\s*m\s*2|terrain[^\d]*(\d+)/i);
        if (mT) {
          const val = parseInt((mT[1] || mT[2] || mT[3] || '').replace(/\s/g, ''), 10);
          if (val > 0 && val < 100000) terrainSqm = val;
        }
      }
    });

    let energy_class = null;
    const dpeEl = document.querySelector('[class*="dpe"] .active, [class*="energy"] .active, [class*="Dpe"], [class*="DPE"]');
    if (dpeEl) {
      const letter = (dpeEl.textContent || '').trim().toUpperCase();
      if (/^[A-G]$/.test(letter)) energy_class = letter;
    }

    const images = [];
    const imgSelectors = '[class*="gallery"] img, [class*="Gallery"] img, [class*="slider"] img, [class*="Slider"] img, [class*="carousel"] img, [class*="photo"] img, [class*="Photo"] img, .swiper img, [class*="media"] img, [class*="Media"] img, [class*="Image"] img, [data-testid*="gallery"] img, [data-testid*="photo"] img';
    document.querySelectorAll(imgSelectors).forEach(img => {
      const src = img.src || img.currentSrc || img.dataset?.src || img.dataset?.lazySrc || img.getAttribute('data-src');
      if (src && src.startsWith('http') && !src.includes('logo') && !src.includes('icon')) images.push(src);
    });
    document.querySelectorAll('picture source[srcset], picture source[data-srcset]').forEach(s => {
      const srcset = s.srcset || s.getAttribute('data-srcset');
      if (srcset) srcset.split(',').forEach(part => {
        const u = part.trim().split(/\s/)[0];
        if (u && u.startsWith('http')) images.push(u);
      });
    });
    document.querySelectorAll('a[href*="photo"], a[href*="image"], [class*="thumb"] img').forEach(img => {
      const src = img.src || img.href || img.dataset?.src;
      if (src && src.startsWith('http') && !src.includes('logo')) images.push(src);
    });
    if (images.length === 0 && P?.collectImageUrls) images.push(...P.collectImageUrls([]));

    const amenities = [];
    let elevator = null;
    document.querySelectorAll(criteriaSel).forEach(el => {
      const text = el.textContent.toLowerCase();
      const fullText = el.textContent || '';
      if (text.includes('parking') || text.includes('garage')) amenities.push('parking');
      if (text.includes('balcon')) amenities.push('balcon');
      if (text.includes('terrasse')) amenities.push('terrasse');
      if (text.includes('jardin')) amenities.push('jardin');
      if (text.includes('piscine')) amenities.push('piscine');
      if (text.includes('cave')) amenities.push('cave');
      if (/ascenseur\s*[:\s]*oui|avec\s*ascenseur/i.test(fullText)) {
        elevator = true;
        if (!amenities.includes('ascenseur')) amenities.push('ascenseur');
      } else if (/ascenseur\s*[:\s]*non|sans\s*ascenseur/i.test(fullText)) {
        elevator = false;
      }
    });

    const type = (P && P.guessType) ? P.guessType(title, rooms, bedrooms) : guessType(title, rooms);
    return {
      title,
      description,
      price,
      city: city || '',
      postal_code: postal_code || '',
      surface,
      rooms,
      bedrooms,
      bathrooms,
      floor,
      property_type: type,
      transaction_type: location.href.includes('location') ? 'location' : 'vente',
      energy_class,
      ges_class: null,
      amenities: [...new Set(amenities)],
      elevator,
      parking: amenities.includes('parking'),
      balcony: amenities.includes('balcon'),
      garden: amenities.includes('jardin'),
      cellar: amenities.includes('cave'),
      images: [...new Set(images)],
      amenities_data: (() => {
        const t = terrainSqm || P?.parseTerrain?.(fullText) || P?.parseTerrain?.(pageText);
        return t ? { terrain_sqm: t } : undefined;
      })(),
      source_url: location.href,
      latitude: null,
      longitude: null,
    };
  }

  function textOf(sel) {
    const el = document.querySelector(sel);
    return el ? el.textContent.trim() : '';
  }

  function parseNum(str) {
    if (str == null) return null;
    const n = parseInt(String(str).replace(/[^\d]/g, '').substring(0, 8), 10);
    return isNaN(n) ? null : n;
  }

  function guessType(title, rooms) {
    const t = (title || '').toLowerCase();
    if (t.includes('maison') || t.includes('villa')) return 'maison';
    if (t.includes('terrain')) return 'terrain';
    if (t.includes('loft')) return 'loft';
    const map = { 1: 'studio', 2: 't2', 3: 't3', 4: 't4', 5: 't5' };
    return map[rooms] || (rooms ? 't' + Math.min(rooms, 5) : 'maison');
  }

  return { canHandle, extract };
})();
