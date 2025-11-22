const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { saveScore, getUserScores, getLeaderboard, getCategories } = require('../controllers/quizController');

router.post('/save-score', auth, saveScore);
router.get('/user-scores', auth, getUserScores);
router.get('/leaderboard', auth, getLeaderboard);
router.get('/categories', auth, getCategories);

module.exports = router;
