const User = require('../models/User');
const Challenge = require('../models/Challenge');
const Notification = require('../models/Notification');
const sendPushNotification = require('../utils/pushNotification');

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

    // Send Push Notification
    if (targetUser.pushToken) {
      const sender = await User.findById(req.user.id);
      await sendPushNotification(
        targetUser.pushToken,
        'New Friend Request',
        `${sender.username} sent you a friend request`,
        { type: 'friend_request', notificationId: notification._id }
      );
    }

    res.json({ msg: 'Friend request sent' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Test Push Notification
exports.sendTestPush = async (req, res) => {
  try {
    console.log('🚀 Attempting to send test push to user:', req.user.id);
    const user = await User.findById(req.user.id);
    
    if (!user.pushToken) {
      console.log('❌ No push token found for user:', user.username);
      return res.status(400).json({ msg: 'No push token registered for this user' });
    }

    console.log('Found token:', user.pushToken);

    await sendPushNotification(
      user.pushToken,
      'Test Notification',
      'This is a test push notification from the server! 🚀',
      { type: 'test' }
    );

    console.log('✅ Test notification function called');
    res.json({ msg: 'Test notification sent' });
  } catch (err) {
    console.error('❌ Test push error:', err.message);
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

    // Send Push Notification
    const challengedUser = await User.findById(challengedId);
    if (challengedUser && challengedUser.pushToken) {
      const challenger = await User.findById(req.user.id);
      await sendPushNotification(
        challengedUser.pushToken,
        'New Challenge!',
        `${challenger.username} challenged you to a ${category} quiz!`,
        { type: 'challenge_received', challengeId: challenge._id, notificationId: notification._id }
      );
    }

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

// Accept Challenge
exports.acceptChallenge = async (req, res) => {
  try {
    const { challengeId } = req.body;
    
    console.log('Accept challenge request:', { challengeId, userId: req.user.id });
    
    const challenge = await Challenge.findById(challengeId);
    
    if (!challenge) {
      console.log('Challenge not found');
      return res.status(404).json({ msg: 'Challenge not found' });
    }
    
    console.log('Challenge found:', challenge);
    console.log('Challenge.challenged type:', typeof challenge.challenged);
    console.log('req.user.id type:', typeof req.user.id);
    console.log('Challenge.challenged value:', challenge.challenged);
    console.log('req.user.id value:', req.user.id);
    
    // Convert both to strings for comparison
    if (challenge.challenged.toString() !== req.user.id.toString()) {
      console.log('User not authorized to accept this challenge');
      return res.status(401).json({ msg: 'Not authorized' });
    }
    
    challenge.status = 'pending';
    await challenge.save();
    
    // Notify challenger that challenge was accepted
    const notification = new Notification({
      user: challenge.challenger,
      type: 'challenge_accepted',
      fromUser: req.user.id,
      data: { challengeId: challenge._id },
      message: 'accepted your challenge!'
    });
    await notification.save();
    
    console.log('Challenge accepted successfully');
    res.json(challenge);
  } catch (err) {
    console.error('Accept challenge error:', err.message);
    res.status(500).send('Server Error');
  }
};

// Get Challenge History
exports.getChallengeHistory = async (req, res) => {
  try {
    const challenges = await Challenge.find({
      $or: [
        { challenger: req.user.id },
        { challenged: req.user.id }
      ],
      status: 'completed'
    })
    .populate('challenger', 'username')
    .populate('challenged', 'username')
    .populate('winner', 'username')
    .sort({ createdAt: -1 })
    .limit(50); // Limit to last 50 challenges
    
    res.json({
      challenges,
      currentUserId: req.user.id
    });
  } catch (err) {
    console.error('Get challenge history error:', err.message);
    res.status(500).send('Server Error');
  }
};

// Clear Challenge History
exports.clearChallengeHistory = async (req, res) => {
  try {
    // Delete all completed challenges where user was involved
    await Challenge.deleteMany({
      $or: [
        { challenger: req.user.id },
        { challenged: req.user.id }
      ],
      status: 'completed'
    });
    
    res.json({ msg: 'Challenge history cleared' });
  } catch (err) {
    console.error('Clear challenge history error:', err.message);
    res.status(500).send('Server Error');
  }
};

// Reject Challenge
exports.rejectChallenge = async (req, res) => {
  try {
    const { challengeId } = req.body;
    
    const challenge = await Challenge.findById(challengeId);
    
    if (!challenge) {
      return res.status(404).json({ msg: 'Challenge not found' });
    }
    
    if (challenge.challenged.toString() !== req.user.id.toString()) {
      return res.status(401).json({ msg: 'Not authorized' });
    }
    
    // Update challenge status to declined
    challenge.status = 'declined';
    await challenge.save();
    
    // Notify challenger that challenge was rejected
    const notification = new Notification({
      user: challenge.challenger,
      type: 'challenge_rejected',
      fromUser: req.user.id,
      data: { challengeId: challenge._id, category: challenge.category },
      message: 'rejected your challenge'
    });
    await notification.save();

    // Send Push Notification
    const challenger = await User.findById(challenge.challenger);
    if (challenger && challenger.pushToken) {
      const rejecter = await User.findById(req.user.id);
      await sendPushNotification(
        challenger.pushToken,
        'Challenge Rejected',
        `${rejecter.username} rejected your challenge`,
        { type: 'challenge_rejected', challengeId: challenge._id, notificationId: notification._id }
      );
    }
    
    res.json({ msg: 'Challenge rejected' });
  } catch (err) {
    console.error('Reject challenge error:', err.message);
    res.status(500).send('Server Error');
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

      // Send Push Notification
      const otherUserObj = await User.findById(otherUser);
      if (otherUserObj && otherUserObj.pushToken) {
        const completer = await User.findById(req.user.id);
        await sendPushNotification(
          otherUserObj.pushToken,
          'Challenge Completed!',
          `${completer.username} completed the challenge! Check the results.`,
          { type: 'challenge_completed', challengeId: challenge._id, notificationId: notification._id }
        );
      }

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
