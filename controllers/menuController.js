const db = require('../db');

exports.getMenu = (req, res) => {
  db.query('SELECT * FROM menu ORDER BY kategori, nama', (err, menu) => {
    res.render('menu', {
      session: req.session,
      menu: menu || []
    });
  });
};