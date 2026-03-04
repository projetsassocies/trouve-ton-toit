/**
 * PAP.fr extractor.
 *
 * Strategy: DOM + fallback parsing from page text.
 * PAP format: "X pièces / Y chambre / Z m²", "Ville (code)"
 */

// eslint-disable-next-line no-var
var extractPAP = (function () {
  'use strict';

  const P = window.TTT_Parser;

  function canHandle() {
    return location.hostname.includes('pap.fr');
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
          if (item['@type'] === 'Product' || item['@type'] === 'RealEstateListing' || item['@type'] === 'Offer') {
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
    const rooms = parseInt(item.numberOfRooms, 10) || null;
    const bedrooms = parseInt(item.numberOfBedrooms, 10) || null;
    return {
      title: item.name || '',
      description: item.description || '',
      price: parseNum(offer.price || item.price),
      city: address.addressLocality || '',
      postal_code: address.postalCode || '',
      surface: parseNum(item.floorSize?.value),
      rooms,
      bedrooms,
      bathrooms: null,
      floor: null,
      property_type: (P && P.guessType) ? P.guessType(item.name || '', rooms, bedrooms) : guessType(item.name || '', rooms),
      transaction_type: location.href.includes('location') ? 'location' : 'vente',
      energy_class: null,
      ges_class: null,
      amenities: [],
      images: extractImagesFromJsonLd(item),
      source_url: location.href,
      latitude: null,
      longitude: null,
    };
  }

  function extractImagesFromJsonLd(item) {
    const imgs = [];
    if (item.image) {
      const arr = Array.isArray(item.image) ? item.image : [item.image];
      arr.forEach(i => {
        const url = typeof i === 'string' ? i : i.url || i.contentUrl;
        if (url) imgs.push(url);
      });
    }
    return imgs;
  }

  function tryDOM() {
    const title = textOf('h1, .item-title, [class*="Title"], .ad-title, [class*="annonce-title"]');
    const priceText = textOf('.item-price, [class*="price"], [class*="Price"], .ad-price');
    const price = parseNum(priceText);
    const description = textOf('.item-description, [class*="description"], [class*="Description"], .ad-description');

    const locationSel = '.item-geoloc, [class*="Location"], [class*="location"], .ad-location, [class*="geoloc"]';
    let locationText = textOf(locationSel) || textOf('h2') || title;

    const postal_code = (locationText.match(/\d{5}/) || [null])[0] || null;
    let city = locationText.replace(/\d{5}/g, '').replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
    if (city.length > 60) city = city.substring(0, 50);

    let rooms = null, surface = null, bedrooms = null, bathrooms = null, floor = null;

    document.querySelectorAll('.item-tags li, .item-features li, [class*="feature"] li, [class*="tag"] li, [class*="criteria"] li, .ad-features li').forEach(el => {
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
      if (lower.includes('étage') || lower.includes('etage')) {
        const n = parseInt(text.replace(/[^\d]/g, '').substring(0, 2), 10);
        if (!isNaN(n)) floor = n;
      }
    });

    const summaryText = textOf('.ad-summary, .item-summary, [class*="summary"]') || document.body.innerText;
    const combined = title + ' ' + locationText + ' ' + summaryText;
    if (P) {
      if (!rooms) rooms = P.parseRooms(combined) || P.parseRooms(title);
      if (!surface) surface = P.parseSurface(combined) || P.parseSurface(title);
      if (!bedrooms) bedrooms = P.parseBedrooms(combined) || P.parseBedrooms(title);
      if (!city) city = P.parseCity(locationText) || P.parseCity(title) || P.parseCity(combined);
    }

    const images = [];
    document.querySelectorAll('.owl-carousel img, .item-gallery img, [class*="Gallery"] img, [class*="Slider"] img, [class*="carousel"] img, [class*="photo"] img, .ad-gallery img, [class*="annonce"] img').forEach(img => {
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
    if (images.length === 0 && P?.collectImageUrls) images.push(...P.collectImageUrls([]));

    const amenities = [];
    let elevator = null;
    document.querySelectorAll('.item-tags li, .item-features li, [class*="feature"] li').forEach(el => {
      const text = el.textContent.toLowerCase();
      const full = el.textContent || '';
      if (text.includes('parking') || text.includes('garage')) amenities.push('parking');
      if (text.includes('balcon')) amenities.push('balcon');
      if (text.includes('terrasse')) amenities.push('terrasse');
      if (text.includes('jardin')) amenities.push('jardin');
      if (text.includes('cave')) amenities.push('cave');
      if (/ascenseur\s*[:\s]*oui|avec\s*ascenseur|ascenseur\s*:\s*yes/i.test(full)) {
        elevator = true;
        amenities.push('ascenseur');
      } else if (/ascenseur\s*[:\s]*non|sans\s*ascenseur/i.test(full)) {
        elevator = false;
      }
    });

    let energy_class = null, ges_class = null;
    document.querySelectorAll('[class*="dpe"], [class*="DPE"], [class*="energy"], [class*="ges"]').forEach(el => {
      const letter = (el.textContent || '').trim().toUpperCase();
      if (/^[A-G]$/.test(letter)) {
        if (el.className?.toLowerCase().includes('ges')) ges_class = letter; else energy_class = letter;
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
      ges_class,
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
