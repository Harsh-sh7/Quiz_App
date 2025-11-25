import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { acceptChallenge, getChallengeStatus } from '../services/api';

const ChallengeLobbyScreen = ({ route, navigation }) => {
  const { 
    challengeId, 
    category, 
    categoryId,
    difficulty, 
    opponentName,
    isChallenger 
  } = route.params;

  const [status, setStatus] = useState('waiting');
  const [countdown, setCountdown] = useState(null);
  const pollIntervalRef = React.useRef(null);

  useEffect(() => {
    if (!isChallenger) {
      // Challenged user - accept immediately and start countdown
      handleAccept();
    } else {
      // Challenger - poll for acceptance every 3 seconds (not too frequent)
      pollIntervalRef.current = setInterval(checkChallengeStatus, 3000);
      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
      };
    }
  }, []);

  const handleAccept = async () => {
    try {
      await acceptChallenge({ challengeId });
      startCountdown();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to accept challenge');
      navigation.goBack();
    }
  };

  const checkChallengeStatus = async () => {
    try {
      const statusData = await getChallengeStatus(challengeId);
      console.log('Challenge status:', statusData);
      
      // If challenge was rejected/declined
      if (statusData.status === 'declined') {
        // Stop polling
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        
        // Show alert and go back
        Alert.alert(
          'Challenge Rejected',
          `${opponentName} declined your challenge`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }
      
      // If status changed to 'pending', it means the other user accepted
      if (statusData.status === 'pending') {
        // Stop polling
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        startCountdown();
      }
    } catch (error) {
      console.error('Error checking challenge status:', error);
    }
  };

  const startCountdown = () => {
    setStatus('ready');
    let count = 3;
    setCountdown(count);
    
    const countInterval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(countInterval);
        navigateToQuiz();
      }
    }, 1000);
  };

  const navigateToQuiz = () => {
    // Add a delay for challenger to ensure challenged user's questions are saved first
    // Challenged user: starts immediately, fetches and saves questions
    // Challenger: waits 3 seconds, then fetches the saved questions
    const delay = isChallenger ? 3000 : 0;
    
    setTimeout(() => {
      navigation.replace('Quiz', {
        category: categoryId,
        difficulty: difficulty,
        challengeMode: true,
        challengeId: challengeId,
        isChallengeResponse: !isChallenger
      });
    }, delay);
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Challenge',
      'Are you sure you want to cancel this challenge?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes', 
          onPress: () => navigation.goBack(),
          style: 'destructive'
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {status === 'waiting' ? (
          <>
            <Ionicons name="hourglass-outline" size={80} color="#FF6B6B" />
            <Text style={styles.title}>Waiting for {opponentName}</Text>
            <Text style={styles.subtitle}>
              {isChallenger 
                ? 'Waiting for opponent to accept...' 
                : 'Accepting challenge...'}
            </Text>
            <ActivityIndicator size="large" color="#FF6B6B" style={{ marginTop: 20 }} />
            
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Category</Text>
              <Text style={styles.infoValue}>{category}</Text>
              <Text style={[styles.infoLabel, { marginTop: 10 }]}>Difficulty</Text>
              <Text style={styles.infoValue}>{difficulty}</Text>
            </View>

            {isChallenger && (
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelButtonText}>Cancel Challenge</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            <Ionicons name="rocket-outline" size={80} color="#4CAF50" />
            <Text style={styles.title}>Get Ready!</Text>
            <Text style={styles.subtitle}>Starting in...</Text>
            <Text style={styles.countdown}>{countdown}</Text>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1E8',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  countdown: {
    fontSize: 80,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginTop: 30,
  },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
    marginTop: 30,
    width: '100%',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 20,
    color: '#000',
    fontWeight: 'bold',
    marginTop: 5,
  },
  cancelButton: {
    marginTop: 30,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    backgroundColor: '#FF6B6B',
  },
  cancelButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ChallengeLobbyScreen;
