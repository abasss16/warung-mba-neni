const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  try {
    const { data, error } = await db
      .from('keranjang')
      .select('id, user_id, menu_id, jumlah, menu:menu_id (nama, harga, foto)')
      .eq('user_id', req.session.user.id);
      
    if (error) throw error;
    
    const keranjang = (data || []).map(item => ({
      id: item.id,
      user_id: item.user_id,
      menu_id: item.menu_id,
      jumlah: item.jumlah,
      nama: item.menu ? item.menu.nama : '',
      harga: item.menu ? item.menu.harga : 0,
      foto: item.menu ? item.menu.foto : ''
    }));
    
    res.render('keranjang', { session: req.session, keranjang: keranjang });
  } catch (err) {
    console.error('Get keranjang error:', err);
    res.render('keranjang', { session: req.session, keranjang: [] });
  }
});

router.post('/add', async (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  const { menu_id, jumlah } = req.body;
  const menuIdInt = parseInt(menu_id);
  const count = parseInt(jumlah || 1);
  
  try {
    const { data: existing } = await db
      .from('keranjang')
      .select('*')
      .eq('user_id', req.session.user.id)
      .eq('menu_id', menuIdInt);
      
    if (existing && existing.length > 0) {
      await db
        .from('keranjang')
        .update({ jumlah: existing[0].jumlah + count })
        .eq('id', existing[0].id);
    } else {
      await db
        .from('keranjang')
        .insert([{ user_id: req.session.user.id, menu_id: menuIdInt, jumlah: count }]);
    }
  } catch (err) {
    console.error('Add to cart error:', err);
  }
  res.redirect('/keranjang');
});

router.post('/update/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const aksi = req.body.aksi;
  try {
    const { data: item } = await db
      .from('keranjang')
      .select('jumlah')
      .eq('id', id);
      
    if (item && item.length > 0) {
      let newJumlah = item[0].jumlah;
      if (aksi === 'tambah') {
        newJumlah += 1;
      } else if (newJumlah > 1) {
        newJumlah -= 1;
      }
      await db
        .from('keranjang')
        .update({ jumlah: newJumlah })
        .eq('id', id);
    }
  } catch (err) {
    console.error('Update cart error:', err);
  }
  res.redirect('/keranjang');
});

router.post('/delete/:id', async (req, res) => {
  try {
    await db
      .from('keranjang')
      .delete()
      .eq('id', parseInt(req.params.id));
  } catch (err) {
    console.error('Delete cart item error:', err);
  }
  res.redirect('/keranjang');
});

module.exports = router;