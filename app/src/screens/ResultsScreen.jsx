import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { saveScore, createChallenge, completeChallenge } from '../services/api';

const { width } = Dimensions.get('window');

const ResultsScreen = ({ route, navigation }) => {
  const { 
    score, 
    total, 
    category, 
    difficulty,
    challengeMode,
    challengedId,
    isChallengeResponse,
    challengeId
  } = route.params;

  useEffect(() => {
    const saveUserScore = async () => {
      try {
        if (challengeMode) {
          await createChallenge({
            challengedId,
            category,
            difficulty,
            score
          });
          // Also save as normal score? Maybe not to avoid duplicates or confusion.
          // But user might want it in their history. Let's save it too.
          await saveScore({ score, totalQuestions: total, category, difficulty });
        } else if (isChallengeResponse) {
          await completeChallenge({
            challengeId,
            score
          });
          await saveScore({ score, totalQuestions: total, category, difficulty });
        } else {
          await saveScore({
            score,
            totalQuestions: total,
            category,
            difficulty,
          });
        }
      } catch (error) {
        console.error('Failed to save score:', error);
      }
    };
    saveUserScore();
  }, []);

  const percentage = (score / total) * 100;
  let message = '';
  let emoji = '';
  let backgroundColor = '';
  
  if (percentage >= 80) {
    message = 'Excellent!';
    emoji = '🏆';
    backgroundColor = '#4CAF50';
  } else if (percentage >= 60) {
    message = 'Great Job!';
    emoji = '🎉';
    backgroundColor = '#2196F3';
  } else if (percentage >= 40) {
    message = 'Keep Practicing!';
    emoji = '💪';
    backgroundColor = '#FF9800';
  } else {
    message = 'Keep Practicing!';
    emoji = '💪';
    backgroundColor = '#FF6B6B';
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.content}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.title}>{message}</Text>
        
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Your Score</Text>
          <Text style={styles.scoreValue}>{score}/{total}</Text>
          <View style={styles.percentageContainer}>
            <Text style={styles.percentage}>{percentage.toFixed(0)}%</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{score}</Text>
            <Text style={styles.statLabel}>Correct</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{total - score}</Text>
            <Text style={styles.statLabel}>Wrong</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => navigation.navigate('Main')}
          >
            <Ionicons name="home" size={20} color="#4169E1" />
            <Text style={styles.buttonText}>Back to Home</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]} 
            onPress={() => navigation.navigate('Main')}
          >
            <Ionicons name="stats-chart" size={20} color="#000" />
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>View Stats</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 40,
    textAlign: 'center',
  },
  scoreCard: {
    backgroundColor: '#FFF',
    padding: 40,
    borderRadius: 30,
    alignItems: 'center',
    width: width - 60,
    marginBottom: 30,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  scoreLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
    fontWeight: '600',
  },
  scoreValue: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 15,
  },
  percentageContainer: {
    backgroundColor: '#4169E1',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  percentage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 40,
    width: width - 60,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.9,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  buttonContainer: {
    width: width - 60,
    gap: 15,
  },
  button: {
    backgroundColor: '#FFF',
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4169E1',
  },
  secondaryButton: {
    backgroundColor: '#FFD700',
  },
  secondaryButtonText: {
    color: '#000',
  },
});

export default ResultsScreen;
