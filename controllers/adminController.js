const db = require('../db');
const fs = require('fs');

exports.dashboard = (req, res) => {
  db.query('SELECT * FROM menu', (err, results) => {
    if (err) throw err;
    res.render('admin', { menu: results });
  });
};

exports.addMenu = (req, res) => {
  const { nama, deskripsi, harga } = req.body;
  const foto = req.file.filename;
  db.query('INSERT INTO menu (nama,deskripsi,harga,foto) VALUES (?,?,?,?)',
    [nama, deskripsi, harga, foto], err => {
      if (err) throw err;
      res.redirect('/admin');
    });
};

exports.deleteMenu = (req, res) => {
  const id = req.params.id;
  db.query('SELECT foto FROM menu WHERE id=?', [id], (err, results) => {
    if (results.length > 0) {
      fs.unlinkSync('public/uploads/' + results[0].foto);
    }
    db.query('DELETE FROM menu WHERE id=?', [id], err2 => {
      if (err2) throw err2;
      res.redirect('/admin');
    });
  });
};
