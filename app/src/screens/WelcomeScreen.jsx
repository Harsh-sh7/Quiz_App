import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions, Image } from 'react-native';
import { AuthContext } from '../context/AuthContext';

const { width } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>Quiz 🏆</Text>
        
        <Image
          source={{ uri: 'https://img.freepik.com/free-vector/students-studying-together-concept-illustration_114360-8004.jpg' }}
          style={styles.illustration}
          resizeMode="contain"
        />
        
        <Text style={styles.title}>Play to Gain Your Knowledge</Text>
        <Text style={styles.subtitle}>
          They have downloaded gmail and seems to be working for now I also believe it's important for every member
        </Text>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.replace('Main')}
        >
          <Text style={styles.buttonText}>Get started</Text>
        </TouchableOpacity>
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
    padding: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 40,
  },
  illustration: {
    width: width - 100,
    height: 250,
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 15,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#000',
    paddingVertical: 18,
    paddingHorizontal: 60,
    borderRadius: 30,
    width: width - 60,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default WelcomeScreen;
