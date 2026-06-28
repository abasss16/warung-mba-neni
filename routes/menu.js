const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const { data: menu, error } = await db
      .from('menu')
      .select('*')
      .order('kategori')
      .order('nama');

    if (error) throw error;

    const BUCKET_URL =
      'https://ysjrfjrnquvyrvztzmtp.supabase.co/storage/v1/object/public/menu';

    menu.forEach(item => {
      item.foto_url = `${BUCKET_URL}/${item.foto}`;
    });

    res.render('menu', {
      session: req.session,
      menu: menu || []
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Database error');
  }
});

module.exports = router;