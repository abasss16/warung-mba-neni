const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/login', (req, res) => res.render('login', { session: req.session, error: null, success: null }));
router.get('/register', (req, res) => res.render('register', { session: req.session, error: null }));
router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/logout', authController.logout);

module.exports = router;