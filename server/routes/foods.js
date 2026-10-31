function registerFoodRoutes(app, deps = {}) {
  const { db, authMiddleware } = deps;
  const USDA_API_KEY = process.env.USDA_API_KEY || '';
  const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1';

  app.get('/api/foods/search', authMiddleware, async (req, res) => {
    let q = (req.query.q || '').trim();
    if (!q) return res.json({ results: [], source: 'none' });

    // Spelling normalization for Indian foods
    const aliases = {
      'panner': 'paneer', 'paneerh': 'paneer', 'pannir': 'paneer',
      'rotty': 'roti', 'chappati': 'roti', 'chapathi': 'roti',
      'daal': 'dal', 'dhal': 'dal',
      'dahi': 'curd', 'yoghurt': 'curd',
      'chawal': 'rice', 'bhaat': 'rice',
      'aloo': 'potato', 'pyaz': 'onion', 'tamatar': 'tomato',
      'murgh': 'chicken', 'anda': 'egg', 'machli': 'fish'
    };
    let nq = q.toLowerCase();
    for (const [k,v] of Object.entries(aliases)) nq = nq.replace(new RegExp('\\b' + k + '\\b','g'), v);
    q = nq;

    // 1. Local IFCT/seeded data (prioritize Indian)
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const where = terms.map(() => 'LOWER(food_name) LIKE ?').join(' AND ');
    const params = terms.map(t => `%${t}%`);
    const local = terms.length
      ? db.prepare(`SELECT id, food_name, category, raw_or_cooked, calories, protein, carbohydrates, total_fat, dietary_fiber, data_source, source_reference_id FROM foods WHERE ${where} ORDER BY CASE WHEN data_source LIKE '%IFCT%' THEN 0 WHEN data_source LIKE '%USDA%' THEN 1 ELSE 2 END, food_name LIMIT 20`).all(...params)
      : db.prepare(`SELECT id, food_name, category, raw_or_cooked, calories, protein, carbohydrates, total_fat, dietary_fiber, data_source, source_reference_id FROM foods ORDER BY CASE WHEN data_source LIKE '%IFCT%' THEN 0 ELSE 1 END, food_name LIMIT 20`).all();

    // 2. USDA FoodData Central (if API key present)
    let usda = [];
    if (USDA_API_KEY) {
      try {
        const url = `${USDA_BASE}/foods/search?query=${encodeURIComponent(q)}&pageSize=10&api_key=${USDA_API_KEY}`;
        const r = await fetch(url);
        if (r.ok) {
          const data = await r.json();
          usda = (data.foods || []).map(f => ({
            id: null,
            food_name: f.description,
            category: f.foodCategory || 'USDA',
            raw_or_cooked: /raw/i.test(f.description) ? 'raw' : (/cooked/i.test(f.description) ? 'cooked' : 'unknown'),
            calories: (f.foodNutrients || []).find(n => /energy/i.test(n.nutrientName))?.value ?? null,
            protein: (f.foodNutrients || []).find(n => /^protein$/i.test(n.nutrientName))?.value ?? null,
            carbohydrates: (f.foodNutrients || []).find(n => /carbohydrate/i.test(n.nutrientName))?.value ?? null,
            total_fat: (f.foodNutrients || []).find(n => /total lipid|fat/i.test(n.nutrientName))?.value ?? null,
            dietary_fiber: (f.foodNutrients || []).find(n => /fiber/i.test(n.nutrientName))?.value ?? null,
            data_source: 'USDA FoodData Central',
            source_reference_id: String(f.fdcId),
            ambiguous: (f.description || '').toLowerCase().includes(q.toLowerCase()) === false
          }));
        }
      } catch (e) {
        console.error('USDA fetch error:', e.message);
      }
    }

    // Merge: local first, then USDA (dedup by name)
    const seen = new Set(local.map(f => f.food_name.toLowerCase()));
    const merged = [...local, ...usda.filter(u => !seen.has((u.food_name||'').toLowerCase()))];

    if (merged.length === 0) {
      return res.json({ results: [], source: 'none', message: 'Nutrition data unavailable' });
    }
    res.json({ results: merged, source: USDA_API_KEY ? 'local+usda' : 'local' });
  });

  app.get('/api/foods/:id', authMiddleware, (req, res) => {
    const row = db.prepare('SELECT * FROM foods WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Food not found', message: 'Nutrition data unavailable' });
    res.json({ food: row });
  });
}

module.exports = { registerFoodRoutes };