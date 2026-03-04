/**
 * SeLoger extractor.
 *
 * Strategy:
 *   1. Try JSON-LD structured data (@type RealEstateListing / Product)
 *   2. Fallback to DOM selectors
 */

// eslint-disable-next-line no-var
var extractSeLoger = (function () {
  'use strict';

  function canHandle() {
    return location.hostname.includes('seloger.com');
  }

  function extract() {
    const fromJsonLd = tryJsonLd();
    if (fromJsonLd) return fromJsonLd;
    return tryDOM();
  }

  // ── JSON-LD approach ────────────────────────

  function tryJsonLd() {
    try {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of scripts) {
        const data = JSON.parse(script.textContent);
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          if (item['@type'] === 'RealEstateListing' || item['@type'] === 'Product' || item['@type'] === 'Residence') {
            return mapJsonLd(item);
          }
        }
      }
    } catch { /* fallback to DOM */ }
    return null;
  }

  function mapJsonLd(item) {
    const offer = item.offers || item.offer || {};
    const address = item.address || item.contentLocation?.address || {};

    const price = parseNum(offer.price || item.price);
    const images = [];
    if (item.image) {
      const imgs = Array.isArray(item.image) ? item.image : [item.image];
      imgs.forEach(i => {
        const url = typeof i === 'string' ? i : i.url || i.contentUrl;
        if (url) images.push(url);
      });
    }

    return {
      title: item.name || '',
      description: item.description || '',
      price,
      city: address.addressLocality || '',
      postal_code: address.postalCode || '',
      surface: parseNum(item.floorSize?.value),
      rooms: parseInt(item.numberOfRooms, 10) || null,
      bedrooms: parseInt(item.numberOfBedrooms, 10) || null,
      bathrooms: parseInt(item.numberOfBathroomsTotal, 10) || null,
      floor: null,
      property_type: guessType(item.name || '', null),
      transaction_type: (offer.businessFunction || '').toLowerCase().includes('location') ? 'location' : 'vente',
      energy_class: null,
      ges_class: null,
      amenities: [],
      images,
      source_url: location.href,
      latitude: null,
      longitude: null,
    };
  }

  // ── DOM fallback ────────────────────────────

  function tryDOM() {
    const title = textOf('[data-testid="sl.title"], h1, .detail-title');
    const priceText = textOf('[data-testid="sl.price"], .price, [class*="Price"]');
    const price = parseNum(priceText);
    const description = textOf('[data-testid="sl.description"], .detail-description, [class*="Description"]');

    const cityText = textOf('[data-testid="sl.location"], .detail-location, [class*="Location"]');
    const postal_code = (cityText.match(/\d{5}/) || [''])[0];
    const city = cityText.replace(/\d{5}/, '').replace(/,/g, '').trim();

    let rooms = null, surface = null, bedrooms = null, bathrooms = null;

    document.querySelectorAll('[class*="Criterion"], [class*="criterion"], [class*="tag"], .detail-tags li').forEach(el => {
      const text = el.textContent.toLowerCase();
      if (text.includes('pièce')) rooms = parseInt(text, 10) || rooms;
      if (text.includes('m²') || text.includes('m2')) surface = parseNum(text) || surface;
      if (text.includes('chambre')) bedrooms = parseInt(text, 10) || bedrooms;
      if (text.includes('salle')) bathrooms = parseInt(text, 10) || bathrooms;
    });

    const images = [];
    document.querySelectorAll('[class*="Gallery"] img, [class*="Carousel"] img, [class*="slider"] img').forEach(img => {
      const src = img.src || img.dataset.src;
      if (src && src.startsWith('http') && !src.includes('logo') && !src.includes('icon')) images.push(src);
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
      floor: null,
      property_type: guessType(title, rooms),
      transaction_type: location.href.includes('location') ? 'location' : 'vente',
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
