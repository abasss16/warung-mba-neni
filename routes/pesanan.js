const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  try {
    const { data: pesanan, error } = await db
      .from('pesanan')
      .select('*')
      .eq('user_id', req.session.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.render('pesanan', { session: req.session, pesanan: pesanan || [] });
  } catch (err) {
    console.error('Get pesanan error:', err);
    res.render('pesanan', { session: req.session, pesanan: [] });
  }
});

router.post('/checkout', async function(req, res) {
  if (!req.session.user) return res.redirect('/auth/login');

  const uid = req.session.user.id;
  const catatan = req.body.catatan || null;
  const payment = req.body.payment || 'cash';

  try {
    // 1. Calculate total from keranjang joined with menu
    const { data: cartItems, error: cartError } = await db
      .from('keranjang')
      .select('jumlah, menu:menu_id (harga)')
      .eq('user_id', uid);

    if (cartError || !cartItems || cartItems.length === 0) {
      return res.redirect('/keranjang');
    }

    const total = cartItems.reduce((sum, item) => {
      const harga = item.menu ? item.menu.harga : 0;
      return sum + (harga * item.jumlah);
    }, 0);

    if (total <= 0) {
      return res.redirect('/keranjang');
    }

    // 2. Insert into pesanan
    const { data: newOrder, error: orderError } = await db
      .from('pesanan')
      .insert([{ 
        user_id: uid, 
        total: total, 
        status: 'pending', 
        catatan: catatan, 
        payment: payment 
      }])
      .select();

    if (orderError || !newOrder || newOrder.length === 0) {
      console.error('Insert order error:', orderError);
      return res.redirect('/keranjang');
    }

    const orderId = newOrder[0].id;

    // 3. Insert into riwayat
    const { error: historyError } = await db
      .from('riwayat')
      .insert([{ pesanan_id: orderId, user_id: uid }]);

    if (historyError) {
      console.error('History insert error:', historyError);
    }

    // 4. Delete from keranjang
    const { error: deleteError } = await db
      .from('keranjang')
      .delete()
      .eq('user_id', uid);

    if (deleteError) {
      console.error('Delete cart error:', deleteError);
    }

    res.redirect('/pesanan');
  } catch (err) {
    console.error('Checkout error:', err);
    res.redirect('/keranjang');
  }
});

module.exports = router;