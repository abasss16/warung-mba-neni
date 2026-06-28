const express = require('express');
const router = express.Router();
const multer = require('multer');
const db = require('../db');

function adminOnly(req, res, next) {
  if (req.session.user && req.session.user.role === 'admin') return next();
  res.redirect('/auth/login');
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.get('/', adminOnly, async function(req, res) {
  try {
    const [menungguRes, diprosesRes, selesaiRes, selesaiOrdersRes, menuRes, recentOrdersRes] = await Promise.all([
      db.from('pesanan').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      db.from('pesanan').select('*', { count: 'exact', head: true }).eq('status', 'proses'),
      db.from('pesanan').select('*', { count: 'exact', head: true }).eq('status', 'selesai'),
      db.from('pesanan').select('total').eq('status', 'selesai'),
      db.from('menu').select('*').order('id', { ascending: false }),
      db.from('pesanan').select('*, users (nama)').order('created_at', { ascending: false }).limit(10)
    ]);

    const stats = {
      menunggu: menungguRes.count || 0,
      diproses: diprosesRes.count || 0,
      selesai: selesaiRes.count || 0,
      pendapatan: (selesaiOrdersRes.data || []).reduce((sum, o) => sum + (o.total || 0), 0)
    };

    const recentOrders = (recentOrdersRes.data || []).map(o => ({
      id: o.id,
      user_id: o.user_id,
      total: o.total,
      status: o.status,
      created_at: o.created_at,
      user_nama: o.users ? o.users.nama : 'User'
    }));

    res.render('admin', {
      session: req.session,
      stats: stats,
      menu: menuRes.data || [],
      recentOrders: recentOrders
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    res.status(500).send('Database error');
  }
});

router.post('/menu/add', adminOnly, upload.single('foto'), async function(req, res) {
  try {
    let foto = null;

    if (req.file) {
      const fileName = Date.now() + '-' + req.file.originalname;

      const { error: uploadError } = await db.storage
        .from('menu')
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false
        });

      if (uploadError) throw uploadError;

      foto = fileName;
    }

    const { error } = await db
      .from('menu')
      .insert([{
        nama: req.body.nama,
        deskripsi: req.body.deskripsi,
        harga: parseFloat(req.body.harga || 0),
        kategori: req.body.kategori,
        foto: foto
      }]);

    if (error) throw error;

  } catch (err) {
    console.error('Add menu error:', err);
  }

  res.redirect('/admin');
});

router.post('/menu/edit', adminOnly, upload.single('foto'), async function(req, res) {
  const id = parseInt(req.body.id);

  try {
    const { data: oldMenu, error: oldError } = await db
      .from('menu')
      .select('foto')
      .eq('id', id)
      .single();

    if (oldError) throw oldError;

    let updateData = {
      nama: req.body.nama,
      deskripsi: req.body.deskripsi,
      harga: parseFloat(req.body.harga || 0),
      kategori: req.body.kategori
    };

    if (req.file) {

      // hapus gambar lama dari bucket
      if (oldMenu?.foto) {
        await db.storage
          .from('menu')
          .remove([oldMenu.foto]);
      }

      // upload gambar baru
      const fileName =
        Date.now() + '-' + req.file.originalname;

      const { error: uploadError } = await db.storage
        .from('menu')
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false
        });

      if (uploadError) throw uploadError;

      updateData.foto = fileName;
    }

    const { error } = await db
      .from('menu')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;

  } catch (err) {
    console.error('Edit menu error:', err);
  }

  res.redirect('/admin');
});

router.post('/menu/delete/:id', adminOnly, async function(req, res) {
  var id = parseInt(req.params.id);
  try {
    const { data: menuItems } = await db
      .from('menu')
      .select('foto')
      .eq('id', id);
    if (menuItems && menuItems[0] && menuItems[0].foto) {
      await db.storage
        .from('menu')
        .remove([menuItems[0].foto]);
    }
    const { error } = await db
      .from('menu')
      .delete()
      .eq('id', id);
    res.json({ success: !error });
  } catch (err) {
    console.error('Delete menu error:', err);
    res.json({ success: false });
  }
});

router.post('/pesanan/status', adminOnly, async function(req, res) {
  try {
    const { error } = await db
      .from('pesanan')
      .update({ status: req.body.status })
      .eq('id', parseInt(req.body.id));
    res.json({ success: !error });
  } catch (err) {
    console.error('Update status error:', err);
    res.json({ success: false });
  }
});

module.exports = router;