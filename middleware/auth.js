const jwt = require('jsonwebtoken');

exports.isAuthenticated = (req, res, next) => {
  const user = req.user || (req.session && req.session.user);
  if (!user) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Unauthorized. Silakan login terlebih dahulu.' });
    }
    return res.redirect('/auth/login');
  }
  next();
};

exports.isAdmin = (req, res, next) => {
  const user = req.user || (req.session && req.session.user);
  if (!user || user.role !== 'admin') {
    if (req.path.startsWith('/api/')) {
      return res.status(403).json({ error: 'Forbidden. Akses ditolak.' });
    }
    return res.status(403).send('Akses ditolak. Halaman ini hanya untuk admin.');
  }
  next();
};
