const express = require('express');
const router = express.Router();
const { register, login, savePushToken } = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/save-push-token', auth, savePushToken);

module.exports = router;
