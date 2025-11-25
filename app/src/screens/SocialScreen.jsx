import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  searchUsers, 
  sendFriendRequest, 
  acceptFriendRequest, 
  getFriends, 
  getNotifications,
  getPendingChallenges,
  getCategories,
  createChallenge,
  acceptChallenge,
  rejectChallenge,
  deleteNotification,
  getChallengeHistory,
  clearChallengeHistory,
  sendTestPush
} from '../services/api';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useNotification } from '../context/NotificationContext';
import Constants from 'expo-constants';

const SocialScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [challengeHistory, setChallengeHistory] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const { expoPushToken } = usePushNotifications();
  const { showNotification } = useNotification();
  
  // Challenge Modal State
  const [challengeModalVisible, setChallengeModalVisible] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    fetchData();
    fetchCategoriesList();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'friends') {
        const friendsList = await getFriends();
        setFriends(friendsList);
      } else if (activeTab === 'notifications') {
        const notifs = await getNotifications();
        setNotifications(notifs);
      } else if (activeTab === 'history') {
        const historyData = await getChallengeHistory();
        setChallengeHistory(historyData.challenges);
        setCurrentUserId(historyData.currentUserId);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoriesList = async () => {
    try {
      const cats = await getCategories();
      setCategories(cats);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const results = await searchUsers(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async (userId) => {
    try {
      await sendFriendRequest(userId);
      Alert.alert('Success', 'Friend request sent!');
      setSearchResults([]);
      setSearchQuery('');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.msg || 'Failed to send request');
    }
  };

  const handleAcceptRequest = async (userId, notificationId) => {
    try {
      await acceptFriendRequest(userId);
      
      // Delete the notification
      if (notificationId) {
        await deleteNotification(notificationId);
        
        // Immediately update the UI
        setNotifications(prev => prev.filter(n => n._id !== notificationId));
      }
      
      Alert.alert('Success', 'Friend request accepted!');
    } catch (error) {
      console.error(error);
    }
  };

  const handleRejectFriend = async (notificationId) => {
    try {
      // Delete the notification
      if (notificationId) {
        await deleteNotification(notificationId);
        
        // Immediately update the UI
        setNotifications(prev => prev.filter(n => n._id !== notificationId));
      }
      
      Alert.alert('Request Declined', 'Friend request rejected');
    } catch (error) {
      console.error('Error rejecting friend request:', error);
    }
  };

  const openChallengeModal = (friend) => {
    setSelectedFriend(friend);
    setChallengeModalVisible(true);
  };

  const startChallenge = async () => {
    if (!selectedCategory) {
      Alert.alert('Select Category', 'Please select a category for the challenge.');
      return;
    }
    setChallengeModalVisible(false);
    
    try {
      setLoading(true);
      // Send invite
      const challenge = await createChallenge({
        challengedId: selectedFriend._id,
        category: selectedCategory.name,
        difficulty: selectedCategory.difficulty || 'medium'
      });
      
      setLoading(false);
      
      // Navigate to lobby as challenger
      navigation.navigate('ChallengeLobby', {
        challengeId: challenge._id,
        category: selectedCategory.name,
        categoryId: selectedCategory.id,
        difficulty: selectedCategory.difficulty || 'medium',
        opponentName: selectedFriend.username,
        isChallenger: true
      });
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to send challenge');
      setLoading(false);
    }
  };

  const handlePlayChallenge = (challengeId, category, difficulty) => {
    const cat = categories.find(c => c.name === category);
    const catId = cat ? cat.id : 9;

    navigation.navigate('Quiz', {
      category: catId,
      difficulty: difficulty,
      isChallengeResponse: true,
      challengeId: challengeId
    });
  };
  
  const handleAcceptChallenge = async (challengeId, category, difficulty, challengerName, notificationId) => {
    try {
      const cat = categories.find(c => c.name === category);
      const catId = cat ? cat.id : 9;
      
      // Delete the notification
      if (notificationId) {
        await deleteNotification(notificationId);
        
        // Immediately update the UI
        setNotifications(prev => prev.filter(n => n._id !== notificationId));
      }
      
      // Navigate to lobby as challenged user (will auto-accept and start countdown)
      navigation.navigate('ChallengeLobby', {
        challengeId: challengeId,
        category: category,
        categoryId: catId,
        difficulty: difficulty,
        opponentName: challengerName,
        isChallenger: false
      });
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to accept challenge');
    }
  };

  const handleRejectChallenge = async (challengeId, notificationId) => {
    try {
      // Call backend to reject challenge
      await rejectChallenge({ challengeId });
      
      // Delete notification
      if (notificationId) {
        await deleteNotification(notificationId);
        
        // Immediately update the UI by removing the notification from state
        setNotifications(prev => prev.filter(n => n._id !== notificationId));
      }
      
      Alert.alert('Challenge Rejected', 'You declined the challenge');
    } catch (error) {
      console.error('Error rejecting challenge:', error);
      Alert.alert('Error', 'Failed to reject challenge');
    }
  };

  const clearAllNotifications = async () => {
    try {
      // Delete all notifications
      const deletePromises = notifications.map(notif => deleteNotification(notif._id));
      await Promise.all(deletePromises);
      
      // Refresh
      fetchData();
      Alert.alert('Success', 'All notifications cleared');
    } catch (error) {
      console.error('Error clearing notifications:', error);
      Alert.alert('Error', 'Failed to clear notifications');
    }
  };

  const renderFriendItem = ({ item }) => (
    <View style={styles.userItem}>
      <View style={styles.userInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.username.charAt(0).toUpperCase()}</Text>
        </View>
        <View>
          <Text style={styles.username}>{item.username}</Text>
          <Text style={styles.email}>{item.email}</Text>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.challengeButton}
        onPress={() => openChallengeModal(item)}
      >
        <Ionicons name="trophy" size={20} color="#FFF" />
      </TouchableOpacity>
    </View>
  );

  const renderSearchItem = ({ item }) => (
    <View style={styles.userItem}>
      <View style={styles.userInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.username.charAt(0).toUpperCase()}</Text>
        </View>
        <View>
          <Text style={styles.username}>{item.username}</Text>
          <Text style={styles.email}>{item.email}</Text>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => handleAddFriend(item._id)}
      >
        <Ionicons name="person-add" size={20} color="#FFF" />
      </TouchableOpacity>
    </View>
  );

  const renderNotificationItem = ({ item }) => {
    if (item.type === 'friend_request') {
      return (
        <View style={styles.notificationItem}>
          <View style={styles.notifContent}>
            <Ionicons name="person-add-outline" size={24} color="#4ECDC4" />
            <Text style={styles.notifText}>
              <Text style={styles.boldText}>{item.fromUser?.username}</Text> {item.message}
            </Text>
          </View>
          <View style={styles.iconButtonsContainer}>
            <TouchableOpacity 
              style={styles.iconButtonAccept}
              onPress={() => handleAcceptRequest(item.fromUser._id, item._id)}
            >
              <Ionicons name="checkmark" size={20} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.iconButtonReject}
              onPress={() => handleRejectFriend(item._id)}
            >
              <Ionicons name="close" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      );
    } else if (item.type === 'challenge_received') {
      return (
        <View style={styles.notificationItem}>
          <View style={styles.notifContent}>
            <Ionicons name="trophy-outline" size={24} color="#FF6B6B" />
            <View>
              <Text style={styles.notifText}>
                <Text style={styles.boldText}>{item.fromUser?.username}</Text> {item.message}
              </Text>
              <Text style={styles.subText}>Category: {item.data.category}</Text>
            </View>
          </View>
          <View style={styles.iconButtonsContainer}>
            <TouchableOpacity 
              style={styles.iconButtonAccept}
              onPress={() => handleAcceptChallenge(item.data.challengeId, item.data.category, item.data.difficulty, item.fromUser?.username, item._id)}
            >
              <Ionicons name="checkmark" size={20} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.iconButtonReject}
              onPress={() => handleRejectChallenge(item.data.challengeId, item._id)}
            >
              <Ionicons name="close" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      );
    } else if (item.type === 'challenge_accepted') {
       return (
        <View style={styles.notificationItem}>
          <View style={styles.notifContent}>
            <Ionicons name="game-controller-outline" size={24} color="#FFD700" />
            <Text style={styles.notifText}>
              <Text style={styles.boldText}>{item.fromUser?.username}</Text> {item.message}
            </Text>
          </View>
          {/* Need to fetch challenge details to know category/difficulty to play. 
              For now, user should go to 'Pending Challenges' list, but we don't have that UI yet.
              Let's assume we can play from here if we had data. 
              Actually, we should add a 'Pending Challenges' section or tab.
          */}
        </View>
      );
    } else {
      return (
        <View style={styles.notificationItem}>
          <View style={styles.notifContent}>
            <Ionicons name="information-circle-outline" size={24} color="#666" />
            <Text style={styles.notifText}>
              <Text style={styles.boldText}>{item.fromUser?.username}</Text> {item.message}
            </Text>
          </View>
        </View>
      );
    }
  };

  const clearHistory = async () => {
    try {
      await clearChallengeHistory();
      fetchData();
      Alert.alert('Success', 'Challenge history cleared');
    } catch (error) {
      console.error('Error clearing history:', error);
      Alert.alert('Error', 'Failed to clear history');
    }
  };

  const renderHistoryItem = ({ item }) => {
    // Correctly determine if current user is the challenger
    const isChallenger = item.challenger._id === currentUserId;
    const opponent = isChallenger ? item.challenged : item.challenger;
    const myScore = isChallenger ? item.challengerScore : item.challengedScore;
    const opponentScore = isChallenger ? item.challengedScore : item.challengerScore;
    
    // Check if it's a draw
    const isDraw = myScore === opponentScore;
    
    // Check if current user won (only if not a draw)
    const won = !isDraw && item.winner?._id === currentUserId;
    
    return (
      <View style={styles.historyItem}>
        <View style={styles.historyHeader}>
          <Ionicons 
            name={isDraw ? "remove-circle" : (won ? "trophy" : "close-circle")} 
            size={24} 
            color={isDraw ? "#FFA500" : (won ? "#FFD700" : "#FF6B6B")} 
          />
          <View style={styles.historyInfo}>
            <Text style={styles.historyOpponent}>vs {opponent.username}</Text>
            <Text style={styles.historyCategory}>{item.category}</Text>
          </View>
        </View>
        <View style={styles.historyScores}>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreLabel}>You</Text>
            <Text style={styles.scoreValue}>{myScore || 0}</Text>
          </View>
          <Text style={styles.scoreDivider}>-</Text>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreLabel}>{opponent.username}</Text>
            <Text style={styles.scoreValue}>{opponentScore || 0}</Text>
          </View>
        </View>
        <Text style={styles.historyResult}>
          {isDraw ? '🤝 Draw!' : (won ? '🎉 Victory!' : '😔 Defeat')}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Social Hub</Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>Friends</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'notifications' && styles.activeTab]}
          onPress={() => setActiveTab('notifications')}
        >
          <Text style={[styles.tabText, activeTab === 'notifications' && styles.activeTabText]}>
            Notifications
          </Text>
          {notifications.some(n => !n.read) && <View style={styles.badge} />}
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'debug' && styles.activeTab]}
          onPress={() => setActiveTab('debug')}
        >
          <Text style={[styles.tabText, activeTab === 'debug' && styles.activeTabText]}>Debug</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'friends' ? (
        <View style={styles.content}>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search users..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity onPress={handleSearch}>
              <Ionicons name="search" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {searchResults.length > 0 ? (
            <View>
              <Text style={styles.sectionTitle}>Search Results</Text>
              <FlatList
                data={searchResults}
                renderItem={renderSearchItem}
                keyExtractor={item => item._id}
              />
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>My Friends</Text>
              {friends.length === 0 ? (
                <Text style={styles.emptyText}>No friends yet. Search to add some!</Text>
              ) : (
                <FlatList
                  data={friends}
                  renderItem={renderFriendItem}
                  keyExtractor={item => item._id}
                />
              )}
            </View>
          )}
        </View>
      ) : activeTab === 'notifications' ? (
        <View style={styles.content}>
          {notifications.length === 0 ? (
            <Text style={styles.emptyText}>No notifications</Text>
          ) : (
            <>
              <TouchableOpacity 
                style={styles.clearAllButton}
                onPress={clearAllNotifications}
              >
                <Ionicons name="trash-outline" size={18} color="#FFF" />
                <Text style={styles.clearAllText}>Clear All</Text>
              </TouchableOpacity>
              <FlatList
                data={notifications}
                renderItem={renderNotificationItem}
                keyExtractor={item => item._id}
              />
            </>
          )}
        </View>
      ) : (
        <View style={styles.content}>
          {challengeHistory.length === 0 ? (
            <Text style={styles.emptyText}>No challenge history</Text>
          ) : (
            <>
              <TouchableOpacity 
                style={styles.clearAllButton}
                onPress={clearHistory}
              >
                <Ionicons name="trash-outline" size={18} color="#FFF" />
                <Text style={styles.clearAllText}>Clear History</Text>
              </TouchableOpacity>
              <FlatList
                data={challengeHistory}
                renderItem={renderHistoryItem}
                keyExtractor={item => item._id}
              />
            </>
          )}
        </View>
      )}

      {/* Challenge Modal */}
      <Modal
        visible={challengeModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setChallengeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Challenge {selectedFriend?.username}</Text>
            <Text style={styles.modalSubtitle}>Select a category:</Text>
            
            <FlatList
              data={categories}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.modalCategories}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.categoryOption,
                    selectedCategory?.id === item.id && styles.selectedCategory,
                    { backgroundColor: item.color }
                  ]}
                  onPress={() => setSelectedCategory(item)}
                >
                  <Text style={styles.categoryEmoji}>{item.icon}</Text>
                  <Text style={styles.categoryName}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setChallengeModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.startButton}
                onPress={startChallenge}
              >
                <Text style={styles.startButtonText}>Start Challenge</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1E8',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#FFF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  tab: {
    marginRight: 20,
    paddingBottom: 5,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#000',
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: -5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    marginRight: 10,
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
  },
  email: {
    fontSize: 12,
    color: '#999',
  },
  addButton: {
    backgroundColor: '#000',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  challengeButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  challengeButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 50,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  notifContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  notifText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  boldText: {
    fontWeight: 'bold',
  },
  subText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  acceptButton: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  acceptButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  playButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  playButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  modalCategories: {
    maxHeight: 120,
    marginBottom: 20,
  },
  categoryOption: {
    width: 100,
    height: 100,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
    padding: 10,
  },
  selectedCategory: {
    borderWidth: 3,
    borderColor: '#000',
  },
  categoryEmoji: {
    fontSize: 30,
    marginBottom: 5,
  },
  categoryName: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 15,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  startButton: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  startButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 15,
    alignSelf: 'flex-end',
    marginRight: 10,
  },
  clearAllText: {
    color: '#FFF',
    fontWeight: '600',
    marginLeft: 5,
  },
  iconButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButtonAccept: {
    backgroundColor: '#4CAF50',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonReject: {
    backgroundColor: '#F44336',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyItem: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    marginHorizontal: 10,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyInfo: {
    marginLeft: 10,
    flex: 1,
  },
  historyOpponent: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  historyCategory: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  historyScores: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  scoreBox: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#666',
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 5,
  },
  scoreDivider: {
    fontSize: 20,
    color: '#666',
    marginHorizontal: 20,
  },
  historyResult: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 5,
  },
});

export default SocialScreen;
