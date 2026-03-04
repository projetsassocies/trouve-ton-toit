/**
 * SeLoger extractor.
 *
 * Strategy: JSON-LD + DOM + fallback parsing from page text.
 */

// eslint-disable-next-line no-var
var extractSeLoger = (function () {
  'use strict';

  const P = window.TTT_Parser;

  function canHandle() {
    return location.hostname.includes('seloger.com');
  }

  function extract() {
    let data = tryJsonLd();
    if (!data) data = tryDOM();
    if (data && P?.fillFromText) return P.fillFromText(data);
    return data;
  }

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
    } catch { /* fallback */ }
    return null;
  }

  function mapJsonLd(item) {
    const offer = item.offers || item.offer || {};
    const address = item.address || item.contentLocation?.address || {};
    const rooms = parseInt(item.numberOfRooms, 10) || null;
    const bedrooms = parseInt(item.numberOfBedrooms, 10) || null;
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
      rooms,
      bedrooms,
      bathrooms: parseInt(item.numberOfBathroomsTotal, 10) || null,
      floor: null,
      property_type: (P && P.guessType) ? P.guessType(item.name || '', rooms, bedrooms) : guessType(item.name || '', rooms),
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

  function tryDOM() {
    const title = textOf('[data-testid="sl.title"], h1, .detail-title, [class*="title"]');
    const priceText = textOf('[data-testid="sl.price"], .price, [class*="Price"], [class*="price"]');
    const price = parseNum(priceText);
    const description = textOf('[data-testid="sl.description"], .detail-description, [class*="Description"]');

    const locationText = textOf('[data-testid="sl.location"], .detail-location, [class*="Location"], [class*="address"]') || title;
    const postal_code = (locationText.match(/\d{5}/) || [null])[0] || null;
    let city = locationText.replace(/\d{5}/g, '').replace(/[(),]/g, ' ').replace(/\s+/g, ' ').trim();
    if (city.length > 60) city = city.substring(0, 50);

    let rooms = null, surface = null, bedrooms = null, bathrooms = null;

    const criteriaSel = '[data-testid*="criteria"], [class*="Criterion"], [class*="criterion"], [class*="tag"] li, .detail-tags li, [class*="feature"] li';
    document.querySelectorAll(criteriaSel).forEach(el => {
      const text = (el.textContent || '').trim();
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
    });

    const pageText = P ? P.getPageText() : document.body?.innerText || '';
    const combined = title + ' ' + locationText + ' ' + pageText;
    if (P) {
      if (!rooms) rooms = P.parseRooms(combined) || P.parseRooms(title);
      if (!surface) surface = P.parseSurface(combined) || P.parseSurface(title);
      if (!bedrooms) bedrooms = P.parseBedrooms(combined) || P.parseBedrooms(title);
      if (!city) city = P.parseCity(locationText) || P.parseCity(title);
    }

    const images = [];
    document.querySelectorAll('[class*="Gallery"] img, [class*="Carousel"] img, [class*="slider"] img, [class*="Slider"] img, [class*="Photo"] img, [data-testid*="gallery"] img, [data-testid*="photo"] img').forEach(img => {
      const src = img.src || img.currentSrc || img.dataset?.src || img.dataset?.lazySrc || img.getAttribute('data-src');
      if (src && src.startsWith('http') && !src.includes('logo') && !src.includes('icon')) images.push(src);
    });
    document.querySelectorAll('picture source[srcset]').forEach(s => {
      (s.srcset || '').split(',').forEach(part => {
        const u = part.trim().split(/\s/)[0];
        if (u && u.startsWith('http')) images.push(u);
      });
    });
    if (images.length === 0 && P?.collectImageUrls) images.push(...P.collectImageUrls([]));

    const amenities = [];
    let elevator = null;
    document.querySelectorAll(criteriaSel).forEach(el => {
      const full = el.textContent || '';
      if (/ascenseur\s*[:\s]*oui|avec\s*ascenseur|ascenseur\s*:\s*yes/i.test(full)) {
        elevator = true;
        amenities.push('ascenseur');
      } else if (/ascenseur\s*[:\s]*non|sans\s*ascenseur/i.test(full)) {
        elevator = false;
      }
      const t = full.toLowerCase();
      if (t.includes('parking') || t.includes('garage')) amenities.push('parking');
      if (t.includes('balcon')) amenities.push('balcon');
      if (t.includes('terrasse')) amenities.push('terrasse');
      if (t.includes('jardin')) amenities.push('jardin');
      if (t.includes('cave')) amenities.push('cave');
      if (t.includes('piscine')) amenities.push('piscine');
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
      floor: null,
      property_type: type,
      transaction_type: location.href.includes('location') ? 'location' : 'vente',
      energy_class: null,
      ges_class: null,
      amenities: [...new Set(amenities)],
      elevator,
      parking: amenities.includes('parking'),
      balcony: amenities.includes('balcon'),
      garden: amenities.includes('jardin'),
      cellar: amenities.includes('cave'),
      images: [...new Set(images)],
      source_url: location.href,
      latitude: null,
      longitude: null,
    };
  }

  function textOf(sel) {
    const el = document.querySelector(sel);
    return el ? el.textContent.trim().replace(/\s+/g, ' ') : '';
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
    if (t.includes('studio')) return 'studio';
    const map = { 1: 'studio', 2: 't2', 3: 't3', 4: 't4', 5: 't5' };
    return map[rooms] || (rooms ? 't' + Math.min(rooms, 5) : 't3');
  }

  return { canHandle, extract };
})();
