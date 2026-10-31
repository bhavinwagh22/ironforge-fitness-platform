const path = require('path');

function registerPageRoutes(app, { authMiddleware, escapeHtml } = {}) {
  // Serve landing page at root URL
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'pages', 'gym-landing.html'));
  });

  app.get('/nutrition', authMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'pages', 'food-nutrition-analyzer.html'));
  });

  // ---------- PROTECTED DASHBOARD ----------
  app.get('/dashboard', authMiddleware, (req, res) => {
    const safeName = escapeHtml ? escapeHtml(req.user.name) : String(req.user.name).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
    const nonce = res.locals.nonce;
    res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Dashboard</title>
  <link rel="stylesheet" href="/css/gym-landing.css">
  <style>body{display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;}
  .box{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:40px;max-width:480px;}
  h1{font-family:'Bebas Neue',sans-serif;font-size:48px;margin-bottom:12px;}
  a{color:var(--accent);text-decoration:none;font-weight:600;}</style></head>
  <body><div class="box"><h1>WELCOME</h1><p style="color:var(--muted);margin-bottom:20px;">You are logged in as <strong style="color:var(--text)">${safeName}</strong></p>
  <a href="#" id="logout">Logout</a></div>
  <script nonce="${nonce}">
    document.getElementById('logout').addEventListener('click', async (e) => {
      e.preventDefault();
      await fetch('/api/logout', { method: 'POST', credentials: 'include' });
      window.location.href = '/pages/login.html';
    });
  </script></body></html>`);
  });
}

module.exports = { registerPageRoutes };