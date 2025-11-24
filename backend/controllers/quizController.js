const Score = require('../models/Score');

exports.saveScore = async (req, res) => {
  const { score, totalQuestions, category, difficulty } = req.body;

  try {
    const newScore = new Score({
      user: req.user.id,
      score,
      totalQuestions,
      category,
      difficulty,
    });

    await newScore.save();
    res.json(newScore);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.getUserScores = async (req, res) => {
  try {
    const scores = await Score.find({ user: req.user.id }).sort({ date: -1 });
    res.json(scores);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.getLeaderboard = async (req, res) => {
  try {
    const { category } = req.query;
    // Build query
    const query = category ? { category } : {};

    
    // Aggregate to get best scores per user for the category
    const leaderboard = await Score.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$user',
          bestScore: { $max: '$score' },
          totalQuestions: { $first: '$totalQuestions' },
          totalQuizzes: { $sum: 1 },
          category: { $first: '$category' },
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      { $unwind: '$userInfo' },
      {
        $project: {
          userId: '$_id',
          username: '$userInfo.username',
          email: '$userInfo.email',
          bestScore: 1,
          totalQuestions: 1,
          totalQuizzes: 1,
          percentage: {
            $multiply: [
              { $divide: ['$bestScore', '$totalQuestions'] },
              100
            ]
          }
        }
      },
      { $sort: { percentage: -1, bestScore: -1 } },
      { $limit: 50 }
    ]);

    res.json(leaderboard);
  } catch (err) {
    console.error('Leaderboard error:', err.message);
    res.status(500).send('Server error');
  }
};

exports.getCategories = async (req, res) => {
  try {
    // Return a predefined list of categories with metadata
    const categories = [
      { id: 9, name: 'General Knowledge', icon: '🧠', color: '#FF6B6B', difficulty: 'medium' },
      { id: 18, name: 'Computers', icon: '💻', color: '#4ECDC4', difficulty: 'medium' },
      { id: 21, name: 'Sports', icon: '⚽', color: '#45B7D1', difficulty: 'medium' },
      { id: 23, name: 'History', icon: '📜', color: '#96CEB4', difficulty: 'medium' },
      { id: 17, name: 'Science', icon: '🔬', color: '#FFEEAD', difficulty: 'medium' },
      { id: 11, name: 'Film', icon: '🎬', color: '#D4A5A5', difficulty: 'medium' },
      { id: 12, name: 'Music', icon: '🎵', color: '#9B59B6', difficulty: 'medium' },
      { id: 22, name: 'Geography', icon: '🌍', color: '#3498DB', difficulty: 'medium' },
    ];
    res.json(categories);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};
