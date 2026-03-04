/**
 * IAD France extractor.
 *
 * Strategy: DOM-based extraction from the property detail page.
 */

// eslint-disable-next-line no-var
var extractIAD = (function () {
  'use strict';

  function canHandle() {
    return location.hostname.includes('iadfrance.fr') || location.hostname.includes('iad.fr');
  }

  function extract() {
    const fromJsonLd = tryJsonLd();
    if (fromJsonLd) return fromJsonLd;
    return tryDOM();
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
      property_type: guessType(item.name || '', null),
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
    const title = textOf('h1, [class*="title"], [class*="Title"]');
    const priceText = textOf('[class*="price"], [class*="Price"], .annonce-price');
    const price = parseNum(priceText);
    const description = textOf('[class*="description"], [class*="Description"], .annonce-text');

    const locationText = textOf('[class*="location"], [class*="Location"], .annonce-location');
    const postal_code = (locationText.match(/\d{5}/) || [''])[0];
    const city = locationText.replace(/\d{5}/, '').replace(/[(),-]/g, '').trim();

    let rooms = null, surface = null, bedrooms = null, bathrooms = null, floor = null;

    document.querySelectorAll('[class*="detail"] li, [class*="feature"] li, [class*="criteria"] li, .annonce-features li').forEach(el => {
      const text = el.textContent.toLowerCase();
      if (text.includes('pièce')) rooms = parseInt(text, 10) || rooms;
      if (text.includes('m²') || text.includes('m2')) surface = parseNum(text) || surface;
      if (text.includes('chambre')) bedrooms = parseInt(text, 10) || bedrooms;
      if (text.includes('salle')) bathrooms = parseInt(text, 10) || bathrooms;
      if (text.includes('étage') || text.includes('etage')) floor = parseInt(text, 10) || floor;
    });

    let energy_class = null;
    const dpeEl = document.querySelector('[class*="dpe"] .active, [class*="energy"] .active, [class*="Dpe"]');
    if (dpeEl) {
      const letter = dpeEl.textContent.trim().toUpperCase();
      if (/^[A-G]$/.test(letter)) energy_class = letter;
    }

    const images = [];
    document.querySelectorAll('[class*="gallery"] img, [class*="Gallery"] img, [class*="slider"] img, [class*="Slider"] img, .swiper img').forEach(img => {
      const src = img.src || img.dataset.src;
      if (src && src.startsWith('http') && !src.includes('logo') && !src.includes('icon')) images.push(src);
    });

    const amenities = [];
    document.querySelectorAll('[class*="detail"] li, [class*="feature"] li, [class*="equipment"] li').forEach(el => {
      const text = el.textContent.toLowerCase();
      if (text.includes('parking') || text.includes('garage')) amenities.push('parking');
      if (text.includes('balcon')) amenities.push('balcon');
      if (text.includes('terrasse')) amenities.push('terrasse');
      if (text.includes('jardin')) amenities.push('jardin');
      if (text.includes('cave')) amenities.push('cave');
      if (text.includes('ascenseur')) amenities.push('ascenseur');
    });

    return {
      title,
      description,
      price,
      city,
      postal_code,
      surface,
      rooms,
      bedrooms,
      bathrooms,
      floor,
      property_type: guessType(title, rooms),
      transaction_type: location.href.includes('location') ? 'location' : 'vente',
      energy_class,
      ges_class: null,
      amenities: [...new Set(amenities)],
      images: [...new Set(images)],
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
    const n = parseInt(String(str).replace(/[^\d]/g, ''), 10);
    return isNaN(n) ? null : n;
  }

  function guessType(title, rooms) {
    const t = (title || '').toLowerCase();
    if (t.includes('maison') || t.includes('villa')) return 'maison';
    if (t.includes('terrain')) return 'terrain';
    if (t.includes('loft')) return 'loft';
    const map = { 1: 'studio', 2: 't2', 3: 't3', 4: 't4', 5: 't5' };
    return map[rooms] || 't3';
  }

  return { canHandle, extract };
})();
