const db = require('../db');

exports.viewKeranjang = (req, res) => {
  const userId = req.session.user.id;
  db.query('SELECT k.id, m.nama, m.harga, k.jumlah FROM keranjang k JOIN menu m ON k.menu_id=m.id WHERE k.user_id=?',
    [userId], (err, results) => {
      if (err) throw err;
      res.render('keranjang', { keranjang: results });
    });
};

exports.addKeranjang = (req, res) => {
  const { menu_id, jumlah } = req.body;
  const userId = req.session.user.id;
  db.query('INSERT INTO keranjang (user_id,menu_id,jumlah) VALUES (?,?,?)',
    [userId, menu_id, jumlah], err => {
      if (err) throw err;
      res.redirect('/keranjang');
    });
};

exports.deleteKeranjang = (req, res) => {
  db.query('DELETE FROM keranjang WHERE id=?', [req.params.id], err => {
    if (err) throw err;
    res.redirect('/keranjang');
  });
};
