const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

// JWT Secret Key
const JWT_SECRET = process.env.JWT_SECRET || 'bu-neni-jwt-secret-key-12345';

// API Auth Middleware
function apiAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  let token = null;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized. Token tidak ditemukan.' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Unauthorized. Token tidak valid atau kadaluwarsa.' });
  }
}

// ========== AUTH API ==========

// POST /api/auth/register
router.post('/auth/register', async (req, res) => {
  const { nama, email, password, konfirmasi } = req.body;
  
  if (!nama || !email || !password) {
    return res.status(400).json({ success: false, error: 'Nama, email, dan password wajib diisi.' });
  }
  if (password !== konfirmasi) {
    return res.status(400).json({ success: false, error: 'Password dan konfirmasi password tidak cocok.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, error: 'Password minimal 6 karakter.' });
  }
  
  try {
    const { data: existingUsers, error: checkError } = await db
      .from('users')
      .select('id')
      .eq('email', email);
      
    if (checkError) throw checkError;
    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({ success: false, error: 'Email sudah terdaftar.' });
    }
    
    const { error: insertError } = await db
      .from('users')
      .insert([{
        nama,
        email,
        password: bcrypt.hashSync(password, 10),
        role: 'user'
      }]);
      
    if (insertError) throw insertError;
    
    return res.status(201).json({ success: true, message: 'Registrasi berhasil! Silakan login.' });
  } catch (err) {
    console.error('API Register error:', err);
    return res.status(500).json({ success: false, error: 'Terjadi kesalahan sistem saat mendaftar.' });
  }
});

// POST /api/auth/login
router.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email dan password wajib diisi.' });
  }
  
  try {
    const { data: users, error } = await db
      .from('users')
      .select('*')
      .eq('email', email);
      
    if (error) throw error;
    if (!users || users.length === 0) {
      return res.status(400).json({ success: false, error: 'Email tidak ditemukan.' });
    }
    
    const user = users[0];
    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(400).json({ success: false, error: 'Password salah.' });
    }
    
    // Generate JWT
    const token = jwt.sign(
      { id: user.id, nama: user.nama, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Set token in Cookie as well
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax'
    });
    
    return res.json({
      success: true,
      message: 'Login berhasil!',
      token: token,
      user: {
        id: user.id,
        nama: user.nama,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('API Login error:', err);
    return res.status(500).json({ success: false, error: 'Terjadi kesalahan sistem saat login.' });
  }
});

// ========== MENU API ==========

// GET /api/menu
router.get('/menu', async (req, res) => {
  try {
    const { data: menu, error } = await db
      .from('menu')
      .select('*')
      .order('kategori')
      .order('nama');
      
    if (error) throw error;
    
    const BUCKET_URL = 'https://ysjrfjrnquvyrvztzmtp.supabase.co/storage/v1/object/public/menu';
    const processedMenu = (menu || []).map(item => ({
      ...item,
      foto_url: `${BUCKET_URL}/${item.foto}`
    }));
    
    return res.json({ success: true, menu: processedMenu });
  } catch (err) {
    console.error('API Get Menu error:', err);
    return res.status(500).json({ success: false, error: 'Terjadi kesalahan saat mengambil menu.' });
  }
});

// ========== KERANJANG API (PROTECTED) ==========

// GET /api/keranjang
router.get('/keranjang', apiAuth, async (req, res) => {
  try {
    const { data, error } = await db
      .from('keranjang')
      .select('id, user_id, menu_id, jumlah, menu:menu_id (nama, harga, foto)')
      .eq('user_id', req.user.id);
      
    if (error) throw error;
    
    const BUCKET_URL = 'https://ysjrfjrnquvyrvztzmtp.supabase.co/storage/v1/object/public/menu';
    const keranjang = (data || []).map(item => ({
      id: item.id,
      user_id: item.user_id,
      menu_id: item.menu_id,
      jumlah: item.jumlah,
      nama: item.menu ? item.menu.nama : '',
      harga: item.menu ? item.menu.harga : 0,
      foto: item.menu ? item.menu.foto : '',
      foto_url: item.menu && item.menu.foto ? `${BUCKET_URL}/${item.menu.foto}` : null
    }));
    
    return res.json({ success: true, keranjang });
  } catch (err) {
    console.error('API Get Keranjang error:', err);
    return res.status(500).json({ success: false, error: 'Terjadi kesalahan saat mengambil keranjang.' });
  }
});

// POST /api/keranjang/add
router.post('/api/keranjang/add', apiAuth, async (req, res) => {
  const { menu_id, jumlah } = req.body;
  if (!menu_id) {
    return res.status(400).json({ success: false, error: 'menu_id wajib dikirim.' });
  }
  
  const menuIdInt = parseInt(menu_id);
  const count = parseInt(jumlah || 1);
  
  try {
    const { data: existing, error: findError } = await db
      .from('keranjang')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('menu_id', menuIdInt);
      
    if (findError) throw findError;
    
    if (existing && existing.length > 0) {
      const { data, error } = await db
        .from('keranjang')
        .update({ jumlah: existing[0].jumlah + count })
        .eq('id', existing[0].id)
        .select();
        
      if (error) throw error;
      return res.json({ success: true, message: 'Item di keranjang berhasil diperbarui!', item: data[0] });
    } else {
      const { data, error } = await db
        .from('keranjang')
        .insert([{ user_id: req.user.id, menu_id: menuIdInt, jumlah: count }])
        .select();
        
      if (error) throw error;
      return res.status(201).json({ success: true, message: 'Berhasil ditambahkan ke keranjang!', item: data[0] });
    }
  } catch (err) {
    console.error('API Add to Cart error:', err);
    return res.status(500).json({ success: false, error: 'Terjadi kesalahan saat menambahkan menu ke keranjang.' });
  }
});

// PUT /api/keranjang/update/:id
router.put('/api/keranjang/update/:id', apiAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const { aksi } = req.body; // 'tambah' atau 'kurang'
  
  try {
    const { data: item, error: findError } = await db
      .from('keranjang')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id); // Secure: user can only update their own cart
      
    if (findError) throw findError;
    if (!item || item.length === 0) {
      return res.status(404).json({ success: false, error: 'Item keranjang tidak ditemukan.' });
    }
    
    let newJumlah = item[0].jumlah;
    if (aksi === 'tambah') {
      newJumlah += 1;
    } else if (aksi === 'kurang' && newJumlah > 1) {
      newJumlah -= 1;
    } else {
      return res.status(400).json({ success: false, error: 'Aksi tidak valid atau jumlah minimum tercapai.' });
    }
    
    const { data: updatedItem, error: updateError } = await db
      .from('keranjang')
      .update({ jumlah: newJumlah })
      .eq('id', id)
      .select();
      
    if (updateError) throw updateError;
    
    return res.json({ success: true, message: 'Kuantitas berhasil diperbarui!', item: updatedItem[0] });
  } catch (err) {
    console.error('API Update Cart error:', err);
    return res.status(500).json({ success: false, error: 'Terjadi kesalahan saat memperbarui keranjang.' });
  }
});

// DELETE /api/keranjang/delete/:id
router.delete('/api/keranjang/delete/:id', apiAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  
  try {
    // Verify ownership
    const { data: item } = await db
      .from('keranjang')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id);
      
    if (!item || item.length === 0) {
      return res.status(404).json({ success: false, error: 'Item keranjang tidak ditemukan.' });
    }
    
    const { error } = await db
      .from('keranjang')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
    
    return res.json({ success: true, message: 'Item berhasil dihapus dari keranjang.' });
  } catch (err) {
    console.error('API Delete Cart Item error:', err);
    return res.status(500).json({ success: false, error: 'Terjadi kesalahan saat menghapus item keranjang.' });
  }
});

// ========== PESANAN API (PROTECTED) ==========

// GET /api/pesanan
router.get('/pesanan', apiAuth, async (req, res) => {
  try {
    const { data: pesanan, error } = await db
      .from('pesanan')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    return res.json({ success: true, pesanan: pesanan || [] });
  } catch (err) {
    console.error('API Get Pesanan error:', err);
    return res.status(500).json({ success: false, error: 'Terjadi kesalahan saat mengambil riwayat pesanan.' });
  }
});

// POST /api/pesanan/checkout
router.post('/api/pesanan/checkout', apiAuth, async (req, res) => {
  const { catatan, payment } = req.body;
  const uid = req.user.id;
  const payMethod = payment || 'cash';
  
  try {
    // 1. Calculate total from keranjang
    const { data: cartItems, error: cartError } = await db
      .from('keranjang')
      .select('jumlah, menu:menu_id (harga)')
      .eq('user_id', uid);
      
    if (cartError) throw cartError;
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ success: false, error: 'Keranjang belanja kosong.' });
    }
    
    const total = cartItems.reduce((sum, item) => {
      const harga = item.menu ? item.menu.harga : 0;
      return sum + (harga * item.jumlah);
    }, 0);
    
    if (total <= 0) {
      return res.status(400).json({ success: false, error: 'Total belanja harus lebih dari 0.' });
    }
    
    // 2. Insert into pesanan
    const { data: newOrder, error: orderError } = await db
      .from('pesanan')
      .insert([{
        user_id: uid,
        total: total,
        status: 'pending',
        catatan: catatan || null,
        payment: payMethod
      }])
      .select();
      
    if (orderError || !newOrder || newOrder.length === 0) {
      throw orderError || new Error('Gagal membuat pesanan baru.');
    }
    
    const orderId = newOrder[0].id;
    
    // 3. Insert into riwayat
    const { error: historyError } = await db
      .from('riwayat')
      .insert([{ pesanan_id: orderId, user_id: uid }]);
      
    if (historyError) console.error('History insert error:', historyError);
    
    // 4. Clear keranjang
    const { error: deleteError } = await db
      .from('keranjang')
      .delete()
      .eq('user_id', uid);
      
    if (deleteError) console.error('Delete cart error:', deleteError);
    
    return res.status(201).json({
      success: true,
      message: 'Pesanan berhasil dibuat!',
      order: newOrder[0]
    });
  } catch (err) {
    console.error('API Checkout error:', err);
    return res.status(500).json({ success: false, error: 'Terjadi kesalahan sistem saat checkout.' });
  }
});

module.exports = router;
