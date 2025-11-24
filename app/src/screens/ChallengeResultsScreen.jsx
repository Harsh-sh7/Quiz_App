import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getChallengeStatus, createChallenge, completeChallenge, saveScore } from '../services/api';

const { width } = Dimensions.get('window');

const ChallengeResultsScreen = ({ route, navigation }) => {
  const { challengeId, myScore, totalQuestions } = route.params;
  const [loading, setLoading] = useState(true);
  const [challengeData, setChallengeData] = useState(null);
  const [opponentScore, setOpponentScore] = useState(null);
  const [winner, setWinner] = useState(null);
  const pollIntervalRef = React.useRef(null);

  useEffect(() => {
    const initResults = async () => {
      // Save my score first
      await saveMyScore();
      
      // Wait a bit for the score to be saved
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Then fetch results
      const bothFinished = await fetchChallengeResults();
      
      // Only start polling if opponent hasn't finished yet
      if (!bothFinished) {
        console.log('Starting polling for opponent...');
        pollIntervalRef.current = setInterval(async () => {
          const finished = await fetchChallengeResults();
          if (finished && pollIntervalRef.current) {
            console.log('Stopping poll - both finished');
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }, 3000);
      }
    };
    
    initResults();
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const saveMyScore = async () => {
    try {
      console.log('Saving challenge score:', myScore, 'for challenge:', challengeId);
      await completeChallenge({
        challengeId,
        score: myScore
      });
      console.log('Score saved successfully');
    } catch (error) {
      console.error('Error saving score:', error);
    }
  };

  const fetchChallengeResults = async () => {
    try {
      const data = await getChallengeStatus(challengeId);
      console.log('Challenge data:', data);
      console.log('My score:', myScore);
      console.log('Challenger score:', data.challengerScore);
      console.log('Challenged score:', data.challengedScore);
      
      setChallengeData(data);
      
      // Determine which score is opponent's
      const isChallenger = data.challengerScore === myScore;
      const oppScore = isChallenger ? data.challengedScore : data.challengerScore;
      
      console.log('Am I challenger?', isChallenger);
      console.log('Opponent score:', oppScore);
      
      setOpponentScore(oppScore);
      
      // If both have played, determine winner and stop polling
      if (data.challengerScore !== null && data.challengedScore !== null) {
        console.log('Both players finished! Showing results.');
        
        setLoading(false);
        if (data.challengerScore > data.challengedScore) {
          setWinner('challenger');
        } else if (data.challengedScore > data.challengerScore) {
          setWinner('challenged');
        } else {
          setWinner('draw');
        }
        
        return true; // Both finished
      } else {
        console.log('Still waiting for opponent...');
        return false; // Still waiting
      }
    } catch (error) {
      console.error('Error fetching challenge results:', error);
      return false;
    }
  };

  const handleBackToHome = () => {
    navigation.navigate('Main');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>Waiting for opponent to finish...</Text>
      </View>
    );
  }

  const myPercentage = ((myScore / totalQuestions) * 100).toFixed(0);
  const oppPercentage = opponentScore !== null ? ((opponentScore / totalQuestions) * 100).toFixed(0) : 0;
  const didIWin = myScore > opponentScore;
  const isDraw = myScore === opponentScore;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {isDraw ? (
          <>
            <Ionicons name="ribbon-outline" size={80} color="#FFD700" />
            <Text style={styles.resultTitle}>It's a Draw!</Text>
          </>
        ) : didIWin ? (
          <>
            <Ionicons name="trophy" size={80} color="#FFD700" />
            <Text style={styles.resultTitle}>You Won!</Text>
          </>
        ) : (
          <>
            <Ionicons name="sad-outline" size={80} color="#FF6B6B" />
            <Text style={styles.resultTitle}>You Lost</Text>
          </>
        )}
      </View>

      <View style={styles.scoresContainer}>
        <View style={[styles.scoreCard, didIWin && styles.winnerCard]}>
          <Text style={styles.scoreLabel}>Your Score</Text>
          <Text style={styles.scoreValue}>{myScore}/{totalQuestions}</Text>
          <Text style={styles.percentage}>{myPercentage}%</Text>
          {didIWin && <Ionicons name="trophy" size={24} color="#FFD700" style={styles.trophy} />}
        </View>

        <View style={styles.vsContainer}>
          <Text style={styles.vsText}>VS</Text>
        </View>

        <View style={[styles.scoreCard, !didIWin && !isDraw && styles.winnerCard]}>
          <Text style={styles.scoreLabel}>Opponent</Text>
          <Text style={styles.scoreValue}>{opponentScore}/{totalQuestions}</Text>
          <Text style={styles.percentage}>{oppPercentage}%</Text>
          {!didIWin && !isDraw && <Ionicons name="trophy" size={24} color="#FFD700" style={styles.trophy} />}
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.homeButton} onPress={handleBackToHome}>
          <Text style={styles.homeButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1E8',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F1E8',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  resultTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 20,
    color: '#000',
  },
  scoresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  scoreCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  winnerCard: {
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 10,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
  },
  percentage: {
    fontSize: 18,
    color: '#666',
    marginTop: 5,
  },
  trophy: {
    marginTop: 10,
  },
  vsContainer: {
    marginHorizontal: 10,
  },
  vsText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
  },
  actions: {
    marginTop: 'auto',
  },
  rematchButton: {
    flexDirection: 'row',
    backgroundColor: '#FF6B6B',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  rematchButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  homeButton: {
    backgroundColor: '#FFF',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  homeButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default ChallengeResultsScreen;
