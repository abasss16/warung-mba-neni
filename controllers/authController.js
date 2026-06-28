const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  const { nama, email, password, konfirmasi } = req.body;
  if (password !== konfirmasi) return res.render('register', { session: req.session, error: 'Password tidak cocok' });
  if (password.length < 6) return res.render('register', { session: req.session, error: 'Password minimal 6 karakter' });
  
  try {
    const { data: existingUsers, error: checkError } = await db
      .from('users')
      .select('id')
      .eq('email', email);
      
    if (checkError) throw checkError;
    if (existingUsers && existingUsers.length > 0) {
      return res.render('register', { session: req.session, error: 'Email sudah terdaftar' });
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
    
    res.render('login', { session: req.session, error: null, success: 'Registrasi berhasil! Silakan login.' });
  } catch (err) {
    console.error('Register error:', err);
    res.render('register', { session: req.session, error: 'Terjadi kesalahan sistem saat mendaftar' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const { data: users, error } = await db
      .from('users')
      .select('*')
      .eq('email', email);
      
    if (error) throw error;
    if (!users || users.length === 0) {
      return res.render('login', { session: req.session, error: 'Email tidak ditemukan', success: null });
    }
    
    const user = users[0];
    if (!bcrypt.compareSync(password, user.password)) {
      return res.render('login', { session: req.session, error: 'Password salah', success: null });
    }
    
    // Generate JWT
    const token = jwt.sign(
      { id: user.id, nama: user.nama, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'bu-neni-jwt-secret-key-12345',
      { expiresIn: '7d' }
    );
    
    // Save in HTTP-only Cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax'
    });
    
    req.session.user = user;
    if (user.role === 'admin') {
      res.redirect('/admin');
    } else {
      res.redirect('/');
    }
  } catch (err) {
    console.error('Login error:', err);
    res.render('login', { session: req.session, error: 'Terjadi kesalahan sistem saat login', success: null });
  }
};

exports.logout = (req, res) => {
  res.clearCookie('token');
  res.clearCookie('csrfToken');
  if (req.session) {
    req.session.destroy();
  }
  res.redirect('/auth/login');
};