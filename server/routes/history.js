function registerHistoryRoutes(app, deps = {}) {
  const { db, authMiddleware } = deps;

  app.get('/api/history', authMiddleware, (req, res) => {
    const rows = db.prepare('SELECT id, analysis_date, items_json, totals_json, created_at FROM food_analysis_history WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    const parsed = rows.map(r => ({
      id: r.id,
      analysis_date: r.analysis_date,
      items: JSON.parse(r.items_json),
      totals: JSON.parse(r.totals_json),
      created_at: r.created_at
    }));
    res.json({ history: parsed });
  });

  app.post('/api/history', authMiddleware, (req, res) => {
    const { analysis_date, items, totals } = req.body || {};
    if (!analysis_date || !items || !totals) return res.status(400).json({ error: 'Missing required fields' });
    const info = db.prepare('INSERT INTO food_analysis_history (user_id, analysis_date, items_json, totals_json) VALUES (?, ?, ?, ?)').run(req.user.id, analysis_date, JSON.stringify(items), JSON.stringify(totals));
    res.json({ ok: true, id: info.lastInsertRowid });
  });

  app.delete('/api/history/:id', authMiddleware, (req, res) => {
    const info = db.prepare('DELETE FROM food_analysis_history WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  });
}

module.exports = { registerHistoryRoutes };