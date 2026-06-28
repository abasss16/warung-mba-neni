const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const xss = require('xss');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const db = require('./db');

const app = express();

// Helmet for HTTP security headers
app.use(helmet({
  contentSecurityPolicy: false // Allow external fonts, CDNs etc. used by Bu Neni app
}));

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({ secret: 'bu-neni-secret', resave: false, saveUninitialized: true }));

// Global XSS Sanitizer Middleware
function sanitizeInput(obj) {
  if (typeof obj === 'string') {
    return xss(obj);
  } else if (Array.isArray(obj)) {
    return obj.map(sanitizeInput);
  } else if (typeof obj === 'object' && obj !== null) {
    const sanitized = {};
    for (const key in obj) {
      sanitized[key] = sanitizeInput(obj[key]);
    }
    return sanitized;
  }
  return obj;
}

app.use((req, res, next) => {
  if (req.body) req.body = sanitizeInput(req.body);
  if (req.query) req.query = sanitizeInput(req.query);
  if (req.params) req.params = sanitizeInput(req.params);
  next();
});

// JWT Authentication Parser Middleware
app.use((req, res, next) => {
  const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'bu-neni-jwt-secret-key-12345');
      req.user = decoded;
      req.session = req.session || {};
      req.session.user = decoded; // Ensure EJS templates and other routes can read session.user
    } catch (err) {
      console.warn('JWT verification failed:', err.message);
      res.clearCookie('token');
    }
  }
  next();
});

// CSRF Double Submit Cookie Protection Middleware
app.use((req, res, next) => {
  // Generate CSRF token if not exists in cookies
  let csrfToken = req.cookies.csrfToken;
  if (!csrfToken) {
    csrfToken = crypto.randomBytes(32).toString('hex');
    res.cookie('csrfToken', csrfToken, { 
      httpOnly: false, // Needs to be accessible by client-side cookies for Double Submit verification
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
  }
  
  // Expose csrfToken to all templates
  res.locals.csrfToken = csrfToken;
  
  // Skip CSRF validation for GET, HEAD, OPTIONS
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }
  
  // Skip CSRF validation for REST API endpoints if they use Bearer token in Auth header
  if (req.path.startsWith('/api/') && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return next();
  }
  
  // Perform CSRF validation
  const clientToken = req.body._csrf || req.headers['x-csrf-token'];
  if (!clientToken || clientToken !== csrfToken) {
    return res.status(403).send('CSRF token validation failed. Silakan muat ulang halaman.');
  }
  
  next();
});

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use((req, res, next) => {
  console.log('REQUEST:', req.url);
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api', require('./routes/api'));
app.use('/auth', require('./routes/auth'));
app.use('/menu', require('./routes/menu'));
app.use('/keranjang', require('./routes/keranjang'));
app.use('/pesanan', require('./routes/pesanan'));
app.use('/admin', require('./routes/admin'));

// ========== HALAMAN UTAMA ==========
app.get('/', async (req, res) => {
  try {
    const { data: menuPopuler, error } = await db
      .from('menu')
      .select('*')
      .order('id', { ascending: false })
      .limit(6);
    
    res.render('index', {
      session: req.session,
      menuPopuler: menuPopuler || []
    });
  } catch (err) {
    console.error('Error fetching popular menu:', err);
    res.render('index', {
      session: req.session,
      menuPopuler: []
    });
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(3000, () => {
    console.log('Server running: http://localhost:3000');
  });
}

module.exports = app;