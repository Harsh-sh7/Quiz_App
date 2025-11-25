import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-100));

  const showNotification = useCallback((title, message, type = 'info', onPress = null, actions = null) => {
    setNotification({ title, message, type, onPress, actions });
    
    // Slide down and fade in
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto hide after 10 seconds if has actions, 5 seconds otherwise
    const autoHideDelay = actions ? 10000 : 5000;
    setTimeout(() => {
      if (!actions || !notification?.actions) {
        hideNotification();
      }
    }, autoHideDelay);
  }, []);

  const hideNotification = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setNotification(null);
    });
  }, []);

  const handlePress = () => {
    if (notification?.onPress && !notification?.actions) {
      notification.onPress();
      hideNotification();
    }
  };

  const handleAction = (action) => {
    if (action.onPress) {
      action.onPress();
    }
    hideNotification();
  };

  const getIconAndColor = () => {
    switch (notification?.type) {
      case 'challenge':
        return { icon: 'trophy', color: '#FF6B6B' };
      case 'friend':
        return { icon: 'person-add', color: '#4ECDC4' };
      case 'success':
        return { icon: 'checkmark-circle', color: '#4CAF50' };
      case 'error':
        return { icon: 'alert-circle', color: '#F44336' };
      default:
        return { icon: 'information-circle', color: '#2196F3' };
    }
  };

  return (
    <NotificationContext.Provider value={{ showNotification, hideNotification }}>
      {children}
      {notification && (
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.notification}>
            <TouchableOpacity
              onPress={handlePress}
              activeOpacity={notification.onPress && !notification.actions ? 0.8 : 1}
              disabled={!!notification.actions}
            >
              <View style={styles.content}>
                <Ionicons
                  name={getIconAndColor().icon}
                  size={24}
                  color={getIconAndColor().color}
                  style={styles.icon}
                />
                <View style={styles.textContainer}>
                  <Text style={styles.title}>{notification.title}</Text>
                  <Text style={styles.message}>{notification.message}</Text>
                </View>
                <TouchableOpacity onPress={hideNotification} style={styles.closeButton}>
                  <Ionicons name="close" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
            
            {notification.actions && (
              <View style={styles.actionsContainer}>
                {notification.actions.map((action, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.actionButton,
                      action.style === 'destructive' && styles.destructiveButton,
                      action.style === 'primary' && styles.primaryButton,
                    ]}
                    onPress={() => handleAction(action)}
                  >
                    <Text
                      style={[
                        styles.actionButtonText,
                        action.style === 'destructive' && styles.destructiveButtonText,
                        action.style === 'primary' && styles.primaryButtonText,
                      ]}
                    >
                      {action.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </Animated.View>
      )}
    </NotificationContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingTop: 50,
    paddingHorizontal: 10,
  },
  notification: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    color: '#666',
  },
  closeButton: {
    padding: 5,
    marginLeft: 10,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingHorizontal: 15,
    paddingBottom: 15,
    paddingTop: 10,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
  },
  destructiveButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  primaryButtonText: {
    color: '#FFF',
  },
  destructiveButtonText: {
    color: '#FFF',
  },
});
