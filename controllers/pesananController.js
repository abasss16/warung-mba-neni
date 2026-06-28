const db = require('../db');

exports.viewPesanan = (req, res) => {
  const userId = req.session.user.id;
  db.query('SELECT * FROM pesanan WHERE user_id=?', [userId], (err, results) => {
    if (err) throw err;
    res.render('pesanan', { pesanan: results });
  });
};

exports.checkout = (req, res) => {
  const userId = req.session.user.id;
  db.query('SELECT SUM(m.harga*k.jumlah) AS total FROM keranjang k JOIN menu m ON k.menu_id=m.id WHERE k.user_id=?',
    [userId], (err, results) => {
      if (err) throw err;
      const total = results[0].total;
      db.query('INSERT INTO pesanan (user_id,total) VALUES (?,?)', [userId, total], (err, result) => {
        if (err) throw err;
        db.query('INSERT INTO riwayat (pesanan_id,user_id) VALUES (?,?)', [result.insertId, userId]);
        db.query('DELETE FROM keranjang WHERE user_id=?', [userId]);
        res.redirect('/pesanan');
      });
    });
};
