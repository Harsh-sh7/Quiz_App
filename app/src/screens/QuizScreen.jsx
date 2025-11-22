import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { decode } from 'html-entities';

const { width } = Dimensions.get('window');

const QuizScreen = ({ route, navigation }) => {
  const { category, difficulty } = route.params;
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const url = `https://opentdb.com/api.php?amount=10&category=${category}&difficulty=${difficulty}&type=multiple`;
      const response = await axios.get(url);
      
      const formattedQuestions = response.data.results.map((q) => ({
        question: decode(q.question),
        correct_answer: decode(q.correct_answer),
        answers: [...q.incorrect_answers, q.correct_answer]
          .map(a => decode(a))
          .sort(() => Math.random() - 0.5),
      }));

      setQuestions(formattedQuestions);
      setLoading(false);
    } catch (error) {
      console.error(error);
      alert('Failed to load questions');
      navigation.goBack();
    }
  };

  const handleAnswer = (selectedAnswer) => {
    if (showResult) return;
    
    setSelectedAnswer(selectedAnswer);
    setShowResult(true);

    const currentQuestion = questions[currentQuestionIndex];
    let newScore = score;
    if (selectedAnswer === currentQuestion.correct_answer) {
      newScore = score + 1;
      setScore(newScore);
    }

    setTimeout(() => {
      if (currentQuestionIndex + 1 < questions.length) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedAnswer(null);
        setShowResult(false);
      } else {
        navigation.replace('Results', { 
          score: newScore, 
          total: questions.length,
          category: category.toString(),
          difficulty 
        });
      }
    }, 1500);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Loading Quiz...</Text>
      </View>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <Ionicons name="diamond" size={16} color="#000" />
          <Text style={styles.coinText}>20</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          Question {currentQuestionIndex + 1}/{questions.length}
        </Text>
      </View>

      {/* Question Card */}
      <View style={styles.questionCard}>
        <Text style={styles.questionText}>{currentQuestion.question}</Text>
      </View>

      {/* Answers */}
      <View style={styles.answersContainer}>
        {currentQuestion.answers.map((answer, index) => {
          const isSelected = selectedAnswer === answer;
          const isCorrect = answer === currentQuestion.correct_answer;
          const showCorrect = showResult && isCorrect;
          const showWrong = showResult && isSelected && !isCorrect;

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.answerButton,
                showCorrect && styles.correctAnswer,
                showWrong && styles.wrongAnswer,
              ]}
              onPress={() => handleAnswer(answer)}
              disabled={showResult}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.answerText,
                (showCorrect || showWrong) && styles.answerTextWhite
              ]}>
                {answer}
              </Text>
              {showCorrect && <Ionicons name="checkmark-circle" size={24} color="#FFF" />}
              {showWrong && <Ionicons name="close-circle" size={24} color="#FFF" />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Score Display */}
      <View style={styles.scoreContainer}>
        <Text style={styles.scoreLabel}>Current Score</Text>
        <Text style={styles.scoreValue}>{score}/{questions.length}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1E8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F1E8',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    color: '#000',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  coinText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  progressContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#000',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  questionCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 25,
    marginBottom: 30,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  questionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    lineHeight: 26,
  },
  answersContainer: {
    paddingHorizontal: 20,
    gap: 15,
  },
  answerButton: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
  },
  answerText: {
    fontSize: 16,
    color: '#000',
    flex: 1,
    fontWeight: '500',
  },
  answerTextWhite: {
    color: '#FFF',
  },
  correctAnswer: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  wrongAnswer: {
    backgroundColor: '#F44336',
    borderColor: '#F44336',
  },
  scoreContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
});

export default QuizScreen;
