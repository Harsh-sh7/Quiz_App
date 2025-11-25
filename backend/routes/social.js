const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  getFriends,
  createChallenge,
  acceptChallenge,
  rejectChallenge,
  getPendingChallenges,
  completeChallenge,
  getNotifications,
  getChallengeStatus,
  saveChallengeQuestions,
  getChallengeHistory,
  clearChallengeHistory,
  markNotificationRead,
  deleteNotification
} = require('../controllers/socialController');

router.get('/search', auth, searchUsers);
router.post('/friend-request', auth, sendFriendRequest);
router.post('/friend-accept', auth, acceptFriendRequest);
router.get('/friends', auth, getFriends);

router.post('/challenge', auth, createChallenge);
router.post('/challenge/accept', auth, acceptChallenge);
router.post('/challenge/reject', auth, rejectChallenge);
router.get('/challenges/pending', auth, getPendingChallenges);
router.post('/challenge/complete', auth, completeChallenge);
router.get('/challenge/:challengeId/status', auth, getChallengeStatus);
router.post('/challenge/:challengeId/questions', auth, saveChallengeQuestions);
router.get('/challenges/history', auth, getChallengeHistory);
router.delete('/challenges/history', auth, clearChallengeHistory);

router.get('/notifications', auth, getNotifications);
router.put('/notifications/:notificationId/read', auth, markNotificationRead);
router.delete('/notifications/:notificationId', auth, deleteNotification);

module.exports = router;
