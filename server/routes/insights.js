function registerInsightsRoutes(app, deps = {}) {
  const { db, authMiddleware } = deps;

  // ---------- PHASE 7A: DAILY INSIGHTS ----------
  app.get('/api/insights/daily', authMiddleware, (req, res) => {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    const rows = db.prepare('SELECT totals_json FROM food_analysis_history WHERE user_id = ? AND analysis_date = ?').all(req.user.id, date);

    const totals = { calories:0, protein:0, carbohydrates:0, total_fat:0, dietary_fiber:0, sugar:0, saturated_fat:0, sodium:0, potassium:0, calcium:0, iron:0, vitamin_c:0, vitamin_a:0 };
    let count = 0;

    for (const r of rows) {
      try {
        const t = JSON.parse(r.totals_json);
        for (const k of Object.keys(totals)) {
          if (t[k] !== null && t[k] !== undefined) totals[k] += t[k];
        }
        count++;
      } catch (e) { /* skip malformed */ }
    }

    for (const k of Object.keys(totals)) totals[k] = Math.round(totals[k] * 1000) / 1000;

    res.json({ date, analysis_count: count, totals });
  });

  // ---------- PHASE 7B: WEEKLY INSIGHTS ----------
  app.get('/api/insights/weekly', authMiddleware, (req, res) => {
    const start = req.query.start || new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    const days = [];
    const startDate = new Date(start + 'T00:00:00');
    let totalCal = 0, totalProt = 0, daysWithData = 0;

    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);

      const rows = db.prepare('SELECT totals_json FROM food_analysis_history WHERE user_id = ? AND analysis_date = ?').all(req.user.id, dateStr);

      const totals = { calories: 0, protein: 0, carbohydrates: 0, total_fat: 0 };
      for (const r of rows) {
        try {
          const t = JSON.parse(r.totals_json);
          for (const k of Object.keys(totals)) {
            if (t[k] !== null && t[k] !== undefined) totals[k] += t[k];
          }
        } catch (e) { /* skip */ }
      }
      for (const k of Object.keys(totals)) totals[k] = Math.round(totals[k] * 1000) / 1000;

      days.push({ date: dateStr, ...totals });
      totalCal += totals.calories;
      totalProt += totals.protein;
      if (rows.length > 0) daysWithData++;
    }

    const avgCal = daysWithData > 0 ? Math.round((totalCal / daysWithData) * 100) / 100 : 0;
    const avgProt = daysWithData > 0 ? Math.round((totalProt / daysWithData) * 100) / 100 : 0;

    res.json({ start, days, weekly_average_calories: avgCal, weekly_average_protein: avgProt, days_with_data: daysWithData });
  });
}

module.exports = { registerInsightsRoutes };