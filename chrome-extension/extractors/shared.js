/**
 * Shared parsing utilities for real estate extractors.
 * Parses common patterns from page text when DOM selectors fail.
 */
(function () {
  'use strict';

  function decodeHtml(str) {
    if (!str || typeof str !== 'string') return str;
    return str
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  function parseSurface(text) {
    if (!text) return null;
    const re = /(\d{1,3}(?:[.,]\d+)?)\s*m\s*²|(\d{1,3}(?:[.,]\d+)?)\s*m2|(\d{1,3}(?:[.,]\d+)?)\s*m\b/gi;
    const nums = [];
    let match;
    while ((match = re.exec(text)) !== null) {
      const s = (match[1] || match[2] || match[3] || '').replace(',', '.');
      const n = parseFloat(s);
      if (n > 0 && n < 2000) nums.push(Math.round(n * 10) / 10);
    }
    return nums.length ? Math.min(...nums) : null;
  }

  function parseRooms(text) {
    if (!text) return null;
    const m = text.match(/(\d+)\s*pièces?/i);
    return m ? parseInt(m[1], 10) : null;
  }

  function parseBedrooms(text) {
    if (!text) return null;
    const m = text.match(/(\d+)\s*chambres?/i);
    return m ? parseInt(m[1], 10) : null;
  }

  function parsePostalCode(text) {
    if (!text) return null;
    const m = text.match(/\b(\d{5})\b/);
    return m ? m[1] : null;
  }

  function sanitizeCity(str) {
    if (!str || typeof str !== 'string') return str || '';
    let s = str
      .replace(/\+33\s*\d[\d\s.]{8,15}/g, '')
      .replace(/\+\d{1,3}\s*\d[\d\s.-]{6,20}/g, '')
      .replace(/0[1-9]\d{8}/g, '')
      .replace(/Voir\s*le\s*numéro/gi, '')
      .replace(/Appeler/gi, '')
      .replace(/Contacter/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    return s.length < 80 ? s : s.substring(0, 80).trim();
  }

  function parseCity(text) {
    if (!text) return '';
    if (text.includes('(')) {
      const m = text.match(/([A-Za-zÀ-ÿ0-9\s'-éè]+?)\s*\(\d{5}\)|([A-Za-zÀ-ÿ0-9\s'-éè]+?)\s*\([\d\s]+\)/i);
      if (m) {
        const city = (m[1] || m[2] || '').trim();
        if (city.length >= 2 && city.length < 60 && !city.includes('pièces') && !city.includes('m²')) return city;
      }
    }
    const afterM2 = text.match(/(?:\d{1,3}(?:[.,]\d+)?)\s*m\s*²\s+([A-Za-zÀ-ÿ0-9\s'-éè]+?)(?:\s*\(|\s+\d{5}|\s*$)/i);
    if (afterM2) {
      const city = afterM2[1].trim();
      if (city.length >= 2 && city.length < 50) return city;
    }
    const cityMatch = text.match(/(?:à|dans|,)\s*([A-Za-zÀ-ÿ0-9\s'-éè]+?)(?:\s*\(|\s+\d{5}|$)/i) ||
      text.match(/([A-Za-zÀ-ÿ0-9\s'-éè]{2,}?)\s*\(\d{5}\)/) ||
      text.match(/([A-Za-zÀ-ÿ0-9\s'-éè]{3,}?)(?:\s*\d{5}|$)/i);
    if (cityMatch) {
      const city = (cityMatch[1] || '').replace(/^\s*(?:à|dans|,)\s*/, '').trim();
      if (city.length >= 2 && city.length < 60 && !city.includes('pièces') && !city.includes('m²')) return city;
    }
    return '';
  }

  function parsePrice(text) {
    if (!text) return null;
    const m = text.replace(/\s/g, '').match(/(\d[\d\s]*)\s*€/);
    return m ? parseInt(m[1].replace(/\s/g, ''), 10) : null;
  }

  function getPageText() {
    const el = document.querySelector('main, [role="main"], #content, .content, article, .annonce, .listing-detail') || document.body;
    return (el?.innerText || document.body?.innerText || '').substring(0, 15000);
  }

  function fillFromText(base) {
    const text = getPageText();
    const title = base.title || textOf('h1') || '';
    const combined = title + '\n' + text;

    const filled = { ...base };
    if (!filled.surface) filled.surface = parseSurface(combined) || parseSurface(title);
    if (!filled.rooms) filled.rooms = parseRooms(combined) || parseRooms(title);
    if (!filled.bedrooms && parseBedrooms(combined)) filled.bedrooms = parseBedrooms(combined);
    if (!filled.postal_code) filled.postal_code = parsePostalCode(combined) || parsePostalCode(title);

    const parsedCity = parseCity(combined) || parseCity(title);
    if (parsedCity) filled.city = parsedCity;
    else if (filled.city && (filled.city.includes('pièces') || filled.city.includes('m²') || filled.city.length > 50)) {
      filled.city = '';
    }
    if (filled.city) filled.city = sanitizeCity(filled.city);

    if (!filled.price && parsePrice(combined)) filled.price = parsePrice(combined);
    if (!filled.floor && parseFloor(combined)) filled.floor = parseFloor(combined);
    if (!filled.bathrooms && parseBathrooms(combined)) filled.bathrooms = parseBathrooms(combined);
    if (!filled.energy_class && parseEnergyClass(combined)) filled.energy_class = parseEnergyClass(combined);
    if (!filled.ges_class && parseGesClass(combined)) filled.ges_class = parseGesClass(combined);
    const terrain = parseTerrain(combined) || parseTerrain(title);
    if (terrain && !filled.amenities_data?.terrain_sqm) {
      filled.amenities_data = { ...(filled.amenities_data || {}), terrain_sqm: terrain };
    }

    if (!filled.amenities?.length) {
      const am = [];
      const lower = combined.toLowerCase();
      const noAscenseur = /ascenseur\s*[:\s]*non|sans\s*ascenseur|pas\s*d['']ascenseur/i.test(combined);
      const hasAscenseur = /ascenseur\s*[:\s]*oui|avec\s*ascenseur|ascenseur\s*:\s*yes/i.test(combined);
      if (!noAscenseur && (lower.includes('parking') || lower.includes('garage'))) am.push('parking');
      if (lower.includes('balcon')) am.push('balcon');
      if (lower.includes('terrasse')) am.push('terrasse');
      if (lower.includes('jardin')) am.push('jardin');
      if (lower.includes('piscine')) am.push('piscine');
      if (lower.includes('cave')) am.push('cave');
      if (hasAscenseur && !noAscenseur) am.push('ascenseur');
      if (am.length) filled.amenities = am;
    }

    filled.property_type = guessType(filled.title || title, filled.rooms, filled.bedrooms);
    if (!filled.rooms && (filled.property_type === 'studio' || /studio|t1\b/i.test(filled.title || title))) filled.rooms = 1;
    if (filled.title) filled.title = decodeHtml(filled.title);
    if ((!filled.images || filled.images.length < 5) && collectImageUrls) {
      const collected = collectImageUrls(filled.images || []);
      filled.images = collected.length > 0 ? collected : (filled.images || []);
    }

    return filled;
  }

  function textOf(sel) {
    const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
    return el ? el.textContent.trim() : '';
  }

  function guessType(title, rooms, bedrooms) {
    const t = (title || '').toLowerCase();
    if (t.includes('maison') || t.includes('villa')) return 'maison';
    if (t.includes('terrain')) return 'terrain';
    if (t.includes('loft')) return 'loft';
    if (t.includes('studio')) return 'studio';
    const map = { 1: 'studio', 2: 't2', 3: 't3', 4: 't4', 5: 't5', 6: 't5' };
    return map[rooms] || (rooms ? 't' + Math.min(rooms, 5) : 't3');
  }

  function parseFloor(text) {
    if (!text) return null;
    const m = text.match(/(\d+)(?:er|e|ème|eme)?\s*étage|étage\s*(\d+)|(\d+)\s*étage/i);
    if (m) return parseInt(m[1] || m[2] || m[3], 10);
    return null;
  }

  function parseBathrooms(text) {
    if (!text) return null;
    const m = text.match(/(\d+)\s*salles?\s*(?:de\s*)?bain|salle\s*de\s*bain/i);
    return m ? parseInt(m[1] || '1', 10) : null;
  }

  function parseEnergyClass(text) {
    if (!text) return null;
    const m = text.match(/DPE\s*[:\s]*([A-G])|classe\s*[:\s]*([A-G])|([A-G])\s*(?:GES|DPE)/i);
    return m ? (m[1] || m[2] || m[3]).toUpperCase() : null;
  }

  function parseGesClass(text) {
    if (!text) return null;
    const m = text.match(/GES\s*[:\s]*([A-G])|([A-G])\s*GES/i);
    return m ? (m[1] || m[2]).toUpperCase() : null;
  }

  function parseTerrain(text) {
    if (!text) return null;
    const m = text.match(/(\d[\d\s]*)\s*m\s*[²2]\s*(?:de\s*)?terrain|terrain\s*(?:de\s*)?(\d[\d\s]*)\s*m\b/i);
    if (m) return parseInt((m[1] || m[2] || '').replace(/\s/g, ''), 10) || null;
    return null;
  }

  function collectImageUrls(existing) {
    const urls = new Set();
    const add = (url) => {
      if (!url || typeof url !== 'string') return;
      let u = url.trim();
      if (!u.startsWith('http') || u.includes('logo') || u.includes('avatar') || u.includes('tracking') || u.includes('analytics')) return;
      if (u.includes('profile-picture') || u.includes('profil')) return;
      if (u.includes('icon') && !u.match(/\/(photo|image|media|visual|annonce|property)\//i)) return;
      u = u.split('?')[0];
      if (u.length < 400) urls.add(u);
    };

    document.querySelectorAll('img').forEach(img => {
      add(img.src || img.currentSrc);
      add(img.dataset?.src || img.dataset?.lazySrc || img.dataset?.original || img.dataset?.url);
      add(img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('data-original'));
    });

    document.querySelectorAll('picture source, source[srcset]').forEach(s => {
      const srcset = s.srcset || s.getAttribute('data-srcset');
      if (srcset) srcset.split(',').forEach(part => {
        add(part.trim().split(/\s/)[0]);
      });
      add(s.src || s.getAttribute('data-src'));
    });

    document.querySelectorAll('[style*="background-image"]').forEach(el => {
      const m = (el.style.backgroundImage || '').match(/url\(["']?([^"')]+)["']?\)/);
      if (m) add(m[1]);
    });

    document.querySelectorAll('[data-src], [data-url], [data-image], [data-srcset]').forEach(el => {
      add(el.dataset?.src || el.dataset?.url || el.dataset?.image);
      const srcset = el.dataset?.srcset || el.getAttribute('data-srcset');
      if (srcset) srcset.split(',').forEach(part => add(part.trim().split(/\s/)[0]));
    });

    const html = document.documentElement?.innerHTML || '';
    const urlRe = /https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^\s"'<>]*)?/gi;
    let match;
    while ((match = urlRe.exec(html)) !== null) {
      const u = match[0];
      if (u.length < 300 && !u.includes('logo') && !u.includes('icon') && !u.includes('avatar')) add(u);
    }

    document.querySelectorAll('script').forEach(script => {
      try {
        const txt = script.textContent || '';
        if (txt.length < 500 || !txt.includes('http')) return;
        txt.matchAll(/"url"\s*:\s*"((?:https?:)?\/\/[^"]+\.(?:jpg|jpeg|png|webp|gif)[^"]*)"/gi).forEach(m => add(m[1]));
        txt.matchAll(/"src"\s*:\s*"((?:https?:)?\/\/[^"]+\.(?:jpg|jpeg|png|webp|gif)[^"]*)"/gi).forEach(m => add(m[1]));
        txt.matchAll(/"default_url"\s*:\s*"([^"]+)"/gi).forEach(m => add(m[1]));
        txt.matchAll(/"original_url"\s*:\s*"([^"]+)"/gi).forEach(m => add(m[1]));
        txt.matchAll(/"medium_url"\s*:\s*"([^"]+)"/gi).forEach(m => add(m[1]));
        txt.matchAll(/"small_url"\s*:\s*"([^"]+)"/gi).forEach(m => add(m[1]));
        txt.matchAll(/(https?:\/\/[a-zA-Z0-9.-]+\/(?:photo|image|media|visual|annonce|ads)\/[^\s"']+)/gi).forEach(m => add(m[1]));
        const arrMatch = txt.match(/"photos?"\s*:\s*\[([\s\S]*?)\]\s*[,}]|"images"\s*:\s*\[([\s\S]*?)\]\s*[,}]|"media"\s*:\s*\{[^}]*"urls?"\s*:\s*\[([\s\S]*?)\]/);
        if (arrMatch) {
          const arrStr = (arrMatch[1] || arrMatch[2] || arrMatch[3] || '');
          arrStr.match(/https?:\/\/[^\s"',\]}+]+/g)?.forEach(add);
        }
        // IAD: images.iadfrance.fr, iadfrance.fr/medias, property/broadcast
        txt.matchAll(/["'](https?:\/\/[^"']*(?:iadfrance\.fr\/medias|images\.iadfrance|images\.iad\.fr)\/[^"']*\.(?:jpg|jpeg|png|webp|gif)[^"']*)["']/gi).forEach(m => add(m[1]));
        txt.matchAll(/["'](https?:\/\/[^"']*\/property\/broadcast\/[^"']+)["']/gi).forEach(m => add(m[1]));
        // SeLoger, autres
        txt.matchAll(/["'](https?:\/\/[^"']*(?:seloger\.com|static\.seloger)[^"']*\.(?:jpg|jpeg|png|webp|gif)[^"']*)["']/gi).forEach(m => add(m[1]));
      } catch {}
    });

    existing.forEach(add);
    const arr = [...urls];
    return arr.length > 50 ? arr.slice(0, 50) : arr;
  }

  window.TTT_Parser = {
    parseSurface,
    parseRooms,
    parseBedrooms,
    parsePostalCode,
    parseCity,
    parsePrice,
    parseFloor,
    parseBathrooms,
    parseEnergyClass,
    parseGesClass,
    parseTerrain,
    getPageText,
    fillFromText,
    textOf,
    guessType,
    decodeHtml,
    collectImageUrls,
  };
})();
