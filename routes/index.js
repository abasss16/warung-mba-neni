const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  db.query('SELECT * FROM menu ORDER BY id DESC LIMIT 6', (err, menuPopuler) => {
    res.render('index', {
      session: req.session,
      menuPopuler: menuPopuler || []
    });
  });
});

module.exports = router;