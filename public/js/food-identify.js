// Food Identification Module for IronForge Food Nutrition Analyzer
// Frontend-only. Parses free-text meal descriptions into structured food items.
// Does NOT calculate nutrition. Does NOT invent food matches.

(function (global) {
  if (typeof module !== 'undefined' && module.exports) module.exports = global.FoodIdentify;
  'use strict';

  // Known Indian + common food names (lowercase) used for matching & normalization.
  // Each entry: canonical name, aliases, raw/cooked hint, ambiguous flag
  const FOOD_DB = [
    { canonical: 'paneer', aliases: ['paneer', 'cottage cheese'], rawCooked: 'raw', ambiguous: false },
    { canonical: 'roti / chapati', aliases: ['roti', 'chapati', 'chapatti', 'phulka'], rawCooked: 'cooked', ambiguous: false },
    { canonical: 'dal (moong)', aliases: ['dal', 'daal', 'dhal', 'lentil', 'lentils'], rawCooked: 'cooked', ambiguous: true },
    { canonical: 'rice (cooked, white)', aliases: ['rice', 'chawal', 'bhaat'], rawCooked: 'cooked', ambiguous: true },
    { canonical: 'rice (raw, white)', aliases: ['raw rice', 'uncooked rice'], rawCooked: 'raw', ambiguous: false },
    { canonical: 'egg (whole, boiled)', aliases: ['egg', 'eggs', 'anda', 'boiled egg'], rawCooked: 'cooked', ambiguous: true },
    { canonical: 'egg (raw, whole)', aliases: ['raw egg', 'anda raw'], rawCooked: 'raw', ambiguous: false },
    { canonical: 'milk', aliases: ['milk', 'doodh', 'whole milk'], rawCooked: 'raw', ambiguous: false },
    { canonical: 'curd / dahi', aliases: ['curd', 'dahi', 'yogurt', 'yoghurt'], rawCooked: 'raw', ambiguous: false },
    { canonical: 'chicken breast (cooked)', aliases: ['chicken', 'chicken breast', 'murgh'], rawCooked: 'cooked', ambiguous: true },
    { canonical: 'oats', aliases: ['oats', 'oatmeal', 'jai'], rawCooked: 'raw', ambiguous: false },
    { canonical: 'banana', aliases: ['banana', 'kela'], rawCooked: 'raw', ambiguous: false },
    { canonical: 'potato (boiled)', aliases: ['potato', 'aloo', 'aloo boiled'], rawCooked: 'cooked', ambiguous: true },
    { canonical: 'onion', aliases: ['onion', 'pyaz', 'pyaaz'], rawCooked: 'raw', ambiguous: false },
    { canonical: 'tomato', aliases: ['tomato', 'tamatar'], rawCooked: 'raw', ambiguous: false },
    { canonical: 'peanuts', aliases: ['peanut', 'peanuts', 'mungfali', 'groundnut'], rawCooked: 'raw', ambiguous: true },
    { canonical: 'soya chunks', aliases: ['soya', 'soya chunks', 'soy chunks', 'nutrela'], rawCooked: 'raw', ambiguous: false },
    { canonical: 'rajma (cooked)', aliases: ['rajma', 'kidney bean', 'kidney beans'], rawCooked: 'cooked', ambiguous: false },
    { canonical: 'chole (cooked)', aliases: ['chole', 'chana', 'chickpea', 'chickpeas'], rawCooked: 'cooked', ambiguous: false },
    { canonical: 'fish (rohu, cooked)', aliases: ['fish', 'machli', 'rohu'], rawCooked: 'cooked', ambiguous: true },
  ];

  const UNITS = ['g', 'gm', 'gms', 'gram', 'grams', 'kg', 'kgs', 'kilogram', 'kilograms',
    'ml', 'milliliter', 'milliliters', 'l', 'liter', 'liters', 'litre', 'litres',
    'cup', 'cups', 'tbsp', 'tablespoon', 'tablespoons', 'tsp', 'teaspoon', 'teaspoons',
    'piece', 'pieces', 'pc', 'pcs', 'bowl', 'bowls', 'plate', 'plates', 'roti', 'rotis',
    'slice', 'slices', 'serving', 'servings'];

  const RAW_COOKED_KEYWORDS = {
    raw: ['raw', 'uncooked', 'fresh'],
    cooked: ['cooked', 'boiled', 'fried', 'grilled', 'roasted', 'steamed', 'baked', 'sauteed', 'tawa']
  };

  function normalize(str) { return str.toLowerCase().trim().replace(/\s+/g, ' '); }

  function splitItems(text) {
    // Split on commas, 'and', '&', ';'
    return text.split(/,|\band\b|&|;/i).map(s => s.trim()).filter(Boolean);
  }

  function parseQuantityUnit(segment) {
    // Match leading number + optional unit
    const m = segment.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?\s*(.*)$/);
    if (!m) return { quantity: null, unit: null, rest: segment };
    const qty = parseFloat(m[1]);
    let unit = m[2] ? m[2].toLowerCase() : null;
    let rest = m[3].trim();
    // If the "unit" token is actually a known food name, treat it as food text, not a unit
    const isFoodWord = FOOD_DB.some(f => f.aliases.includes(unit));
    if (unit && (isFoodWord || !UNITS.includes(unit))) {
      rest = (unit + ' ' + rest).trim();
      unit = null;
    }
    if (unit === null) unit = 'g';
    // Default unit handling: if a countable food has no unit, assume 'piece' for countable items
    if (unit === null && qty && !rest.match(/g|ml|kg|l/i)) {
      // leave null; caller may infer
    }
    // Handle case where unit word is actually the food itself (e.g. "2 roti")
    if (!rest && unit && FOOD_DB.some(f => f.aliases.includes(unit))) {
      rest = unit;
      unit = 'piece';
    }
    return { quantity: qty, unit: unit || 'g', rest };
  }

  function detectRawCooked(segment, foodName) {
    const low = (segment + ' ' + foodName).toLowerCase();
    for (const kw of RAW_COOKED_KEYWORDS.raw) if (low.includes(kw)) return 'raw';
    for (const kw of RAW_COOKED_KEYWORDS.cooked) if (low.includes(kw)) return 'cooked';
    return null; // unknown
  }

  function matchFood(name) {
    const n = normalize(name);
    const matches = [];
    for (const f of FOOD_DB) {
      for (const alias of f.aliases) {
        if (n === alias || n.includes(alias) || alias.includes(n)) {
          // avoid duplicate canonical
          if (!matches.find(m => m.canonical === f.canonical)) {
            matches.push(f);
          }
          break;
        }
      }
    }
    return matches;
  }

  function identify(text) {
    const segments = splitItems(text);
    const items = [];
    for (const seg of segments) {
      const parsed = parseQuantityUnit(seg);
      const foodName = parsed.rest;
      const matches = matchFood(foodName);
      const rcDetected = detectRawCooked(seg, foodName);

      let status = 'identified';
      let candidates = matches.map(m => m.canonical);
      let ambiguous = false;
      let needsConfirmation = false;

      if (matches.length === 0) {
        status = 'unknown';
        needsConfirmation = true;
      } else if (matches.length > 1) {
        status = 'ambiguous';
        ambiguous = true;
        needsConfirmation = true;
      } else {
        // single match but may be ambiguous by definition or raw/cooked unclear
        if (matches[0].ambiguous) { ambiguous = true; needsConfirmation = true; status = 'needs_confirmation'; }
        if (rcDetected === null && matches[0].rawCooked) {
          // food has raw/cooked variants but text didn't specify
          // keep as identified but note
        }
      }

      const rawCooked = rcDetected || (matches.length === 1 ? matches[0].rawCooked : null);

      items.push({
        original_text: seg,
        quantity: parsed.quantity,
        unit: parsed.unit,
        food_text: foodName,
        candidates: candidates,
        selected_food: matches.length === 1 ? matches[0].canonical : null,
        raw_or_cooked: rawCooked,
        raw_cooked_detected: rcDetected !== null,
        ambiguous: ambiguous,
        needs_confirmation: needsConfirmation,
        status: status
      });
    }
    return { input: text, items: items, total_items: items.length };
  }

  global.FoodIdentify = { identify, FOOD_DB, UNITS };
})(window);
