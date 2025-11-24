const User = require('../models/User');
const Challenge = require('../models/Challenge');
const Notification = require('../models/Notification');

// Search Users
exports.searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.json([]);
    
    const users = await User.find({
      username: { $regex: query, $options: 'i' },
      _id: { $ne: req.user.id }
    }).select('username email _id');
    
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Send Friend Request
exports.sendFriendRequest = async (req, res) => {
  try {
    const targetUser = await User.findById(req.body.userId);
    if (!targetUser) return res.status(404).json({ msg: 'User not found' });

    if (targetUser.friendRequests.includes(req.user.id)) {
      return res.status(400).json({ msg: 'Friend request already sent' });
    }
    if (targetUser.friends.includes(req.user.id)) {
      return res.status(400).json({ msg: 'Already friends' });
    }

    targetUser.friendRequests.push(req.user.id);
    await targetUser.save();

    // Create Notification
    const notification = new Notification({
      user: targetUser._id,
      type: 'friend_request',
      fromUser: req.user.id,
      message: `sent you a friend request`
    });
    await notification.save();

    res.json({ msg: 'Friend request sent' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Accept Friend Request
exports.acceptFriendRequest = async (req, res) => {
  try {
    const requesterId = req.body.userId;
    const user = await User.findById(req.user.id);
    const requester = await User.findById(requesterId);

    if (!user.friendRequests.includes(requesterId)) {
      return res.status(400).json({ msg: 'No friend request from this user' });
    }

    user.friends.push(requesterId);
    user.friendRequests = user.friendRequests.filter(id => id.toString() !== requesterId);
    await user.save();

    requester.friends.push(user._id);
    await requester.save();

    res.json({ msg: 'Friend request accepted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Get Friends
exports.getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('friends', 'username email');
    res.json(user.friends);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Create Challenge (Invite)
exports.createChallenge = async (req, res) => {
  try {
    const { challengedId, category, difficulty, score } = req.body;

    // If score is provided, it's the old flow (challenger played first)
    // If score is NOT provided, it's the new flow (invite only)
    
    const status = score !== undefined ? 'pending' : 'invited';

    const challenge = new Challenge({
      challenger: req.user.id,
      challenged: challengedId,
      category,
      difficulty,
      challengerScore: score, // Can be null
      status
    });

    await challenge.save();

    // Notify Challenged User
    const notification = new Notification({
      user: challengedId,
      type: 'challenge_received',
      fromUser: req.user.id,
      data: { challengeId: challenge._id, category, difficulty, scoreToBeat: score },
      message: `challenged you to a ${category} quiz!`
    });
    await notification.save();

    res.json(challenge);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Get Pending Challenges (where user is challenged OR challenger waiting for acceptance)
exports.getPendingChallenges = async (req, res) => {
  try {
    const challenges = await Challenge.find({
      $or: [
        { challenged: req.user.id, status: { $in: ['pending', 'invited'] } },
        { challenger: req.user.id, status: { $in: ['pending', 'invited'] } }
      ]
    }).populate('challenger', 'username').populate('challenged', 'username');
    res.json(challenges);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Accept Challenge (for invited status)
exports.acceptChallenge = async (req, res) => {
  try {
    const { challengeId } = req.body;
    console.log('Accept Challenge - challengeId:', challengeId);
    console.log('Accept Challenge - userId:', req.user.id);
    
    const challenge = await Challenge.findById(challengeId);
    console.log('Challenge found:', challenge);
    
    if (!challenge) return res.status(404).json({ msg: 'Challenge not found' });
    
    // Convert both to strings for comparison
    const challengedId = challenge.challenged.toString();
    const userId = req.user.id.toString();
    
    console.log('Challenged ID:', challengedId);
    console.log('User ID:', userId);
    
    if (challengedId !== userId) {
      return res.status(401).json({ msg: 'Not authorized' });
    }
    
    challenge.status = 'pending'; // Now both can play
    await challenge.save();
    
    // Notify Challenger
    const notification = new Notification({
      user: challenge.challenger,
      type: 'challenge_accepted',
      fromUser: req.user.id,
      data: { challengeId: challenge._id },
      message: `accepted your challenge!`
    });
    await notification.save();
    
    res.json(challenge);
  } catch (err) {
    console.error('Accept Challenge Error:', err);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
};

// Complete Challenge
exports.completeChallenge = async (req, res) => {
  try {
    const { challengeId, score } = req.body;
    const challenge = await Challenge.findById(challengeId);

    if (!challenge) return res.status(404).json({ msg: 'Challenge not found' });
    
    // Check if user is challenger or challenged
    const isChallenger = challenge.challenger.toString() === req.user.id;
    const isChallenged = challenge.challenged.toString() === req.user.id;
    
    if (!isChallenger && !isChallenged) return res.status(401).json({ msg: 'Not authorized' });

    if (isChallenger) {
      challenge.challengerScore = score;
    } else {
      challenge.challengedScore = score;
    }

    // Check if both have played
    if (challenge.challengerScore !== null && challenge.challengedScore !== null) {
       challenge.status = 'completed';
       
       // Determine Winner
      if (challenge.challengedScore > challenge.challengerScore) {
        challenge.winner = challenge.challenged;
      } else if (challenge.challengedScore < challenge.challengerScore) {
        challenge.winner = challenge.challenger;
      } else {
        challenge.winner = null; 
      }
      
      // Notify the OTHER person that the challenge is done
      const otherUser = isChallenger ? challenge.challenged : challenge.challenger;
      const notification = new Notification({
        user: otherUser,
        type: 'challenge_completed',
        fromUser: req.user.id,
        data: { challengeId: challenge._id, myScore: isChallenger ? challenge.challengerScore : challenge.challengedScore, opponentScore: score },
        message: `completed the challenge!`
      });
      await notification.save();

    } else {
      // Still pending the other player
      challenge.status = 'pending';
    }

    await challenge.save();
    res.json(challenge);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Get Notifications
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate('fromUser', 'username');
    res.json(notifications);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Mark Notification as Read
exports.markNotificationRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notification = await Notification.findById(notificationId);
    
    if (!notification) return res.status(404).json({ msg: 'Notification not found' });
    if (notification.user.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });
    
    notification.read = true;
    await notification.save();
    
    res.json({ msg: 'Notification marked as read' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Delete Notification
exports.deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notification = await Notification.findById(notificationId);
    
    if (!notification) return res.status(404).json({ msg: 'Notification not found' });
    if (notification.user.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });
    
    await notification.deleteOne();
    
    res.json({ msg: 'Notification deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Get Challenge Status
exports.getChallengeStatus = async (req, res) => {
  try {
    const { challengeId } = req.params;
    const challenge = await Challenge.findById(challengeId);
    
    if (!challenge) return res.status(404).json({ msg: 'Challenge not found' });
    
    res.json({ 
      status: challenge.status,
      challengerScore: challenge.challengerScore,
      challengedScore: challenge.challengedScore,
      questions: challenge.questions
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Save Challenge Questions
exports.saveChallengeQuestions = async (req, res) => {
  try {
    const { challengeId } = req.params;
    const { questions } = req.body;
    
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) return res.status(404).json({ msg: 'Challenge not found' });
    
    challenge.questions = questions;
    await challenge.save();
    
    res.json({ msg: 'Questions saved', questions: challenge.questions });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
