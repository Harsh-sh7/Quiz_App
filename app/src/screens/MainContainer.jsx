import React, { useState, useContext, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Image,
} from "react-native";
import SocialScreen from "./SocialScreen";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { getUserScores, getLeaderboard, getCategories, getNotifications, acceptChallenge, rejectChallenge, acceptFriendRequest, deleteNotification, savePushToken } from "../services/api";

const { width } = Dimensions.get("window");

const MainContainer = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState("home");
  const [loading, setLoading] = useState(false);
  const [recentScores, setRecentScores] = useState([]);
  const [allScores, setAllScores] = useState([]);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const { logout } = useContext(AuthContext);
  const { showNotification } = useNotification();
  const { expoPushToken } = usePushNotifications();

  useEffect(() => {
    if (expoPushToken) {
      savePushToken(expoPushToken).catch(err => console.error("Failed to save push token:", err));
    }
  }, [expoPushToken]);

  const handleAcceptChallenge = async (challengeId, category, difficulty, challengerName, notificationId) => {
    try {
      // Delete notification first
      if (notificationId) {
        await deleteNotification(notificationId);
      }
      
      // Navigate to challenge lobby
      const cat = availableCategories.find(c => c.name === category);
      const catId = cat ? cat.id : 9;
      
      navigation.navigate('ChallengeLobby', {
        challengeId,
        category,
        categoryId: catId,
        difficulty,
        opponentName: challengerName,
        isChallenger: false
      });
    } catch (error) {
      console.error('Error accepting challenge:', error);
    }
  };

  const handleRejectChallenge = async (challengeId, notificationId) => {
    try {
      // Call backend to reject challenge and notify the challenger
      await rejectChallenge({ challengeId });
      
      // Delete the notification
      if (notificationId) {
        await deleteNotification(notificationId);
        // Update ref to reflect deleted notification
        lastNotificationCountRef.current = Math.max(0, lastNotificationCountRef.current - 1);
      }
      
      showNotification('Challenge Rejected', 'You declined the challenge', 'info');
    } catch (error) {
      console.error('Error rejecting challenge:', error);
    }
  };

  const handleAcceptFriend = async (userId, notificationId) => {
    try {
      await acceptFriendRequest(userId);
      if (notificationId) {
        await deleteNotification(notificationId);
      }
      showNotification('Friend Added!', 'Friend request accepted', 'success');
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };

  const handleRejectFriend = async (notificationId) => {
    try {
      if (notificationId) {
        await deleteNotification(notificationId);
      }
      showNotification('Request Declined', 'Friend request rejected', 'info');
    } catch (error) {
      console.error('Error rejecting friend request:', error);
    }
  };

  // Use ref for notification count to avoid useEffect dependency issues
  const lastNotificationCountRef = React.useRef(0);

  // Initialize and poll for notifications
  useEffect(() => {
    console.log('🚀 MainContainer mounted - Starting notification system');
    
    fetchScores();
    fetchCategories();
    
    // Initialize notification count
    const initNotifications = async () => {
      try {
        const notifs = await getNotifications();
        lastNotificationCountRef.current = notifs.length;
        console.log('✅ Initial notification count:', notifs.length);
      } catch (error) {
        console.error('❌ Error initializing notifications:', error);
      }
    };
    
    initNotifications();
    
    // Poll for notifications every 5 seconds
    const notificationPoll = setInterval(async () => {
      try {
        const notifs = await getNotifications();
        const currentCount = notifs.length;
        const lastCount = lastNotificationCountRef.current;
        
        console.log('🔔 Polling - Current:', currentCount, 'Last:', lastCount);
        
        // Check for new notifications
        if (currentCount > lastCount) {
          const newNotifs = notifs.slice(0, currentCount - lastCount);
          
          console.log('🆕 New notifications detected:', newNotifs.length);
          
          // Show in-app toast for each new notification
          newNotifs.forEach(notif => {
            console.log('📢 Showing notification:', notif.type);
            if (notif.type === 'challenge_received') {
              showNotification(
                'New Challenge!',
                `${notif.fromUser?.username} challenged you to a ${notif.data.category} quiz!`,
                'challenge',
                null,
                [
                  {
                    label: 'Accept',
                    style: 'primary',
                    onPress: () => handleAcceptChallenge(
                      notif.data.challengeId,
                      notif.data.category,
                      notif.data.difficulty,
                      notif.fromUser?.username,
                      notif._id
                    )
                  },
                  {
                    label: 'Reject',
                    style: 'destructive',
                    onPress: () => handleRejectChallenge(notif.data.challengeId, notif._id)
                  }
                ]
              );
            } else if (notif.type === 'friend_request') {
              showNotification(
                'Friend Request',
                `${notif.fromUser?.username} sent you a friend request`,
                'friend',
                null,
                [
                  {
                    label: 'Accept',
                    style: 'primary',
                    onPress: () => handleAcceptFriend(notif.fromUser._id, notif._id)
                  },
                  {
                    label: 'Reject',
                    style: 'destructive',
                    onPress: () => handleRejectFriend(notif._id)
                  }
                ]
              );
            } else if (notif.type === 'challenge_accepted') {
              showNotification(
                'Challenge Accepted!',
                `${notif.fromUser?.username} accepted your challenge!`,
                'success'
              );
            } else if (notif.type === 'challenge_rejected') {
              showNotification(
                'Challenge Rejected',
                `${notif.fromUser?.username} rejected your challenge`,
                'error'
              );
            } else if (notif.type === 'challenge_completed') {
              showNotification(
                'Challenge Completed!',
                `${notif.fromUser?.username} completed your challenge!`,
                'success'
              );
            }
          });
          
          lastNotificationCountRef.current = currentCount;
        }
      } catch (error) {
        console.error('❌ Error polling notifications:', error);
        // If unauthorized (token invalid/expired), logout to force re-login
        if (error.response && error.response.status === 401) {
          console.log('⚠️ Token expired or invalid, logging out...');
          logout();
        }
      }
    }, 5000);
    
    return () => {
      console.log('🛑 Cleaning up notification poll');
      clearInterval(notificationPoll);
    };
  }, []); // Empty dependency array - runs once on mount

  useEffect(() => {
    if (activeTab === "leaderboard") {
      fetchLeaderboard();
    }
  }, [activeTab, selectedCategory]);

  const fetchScores = async () => {
    try {
      const scores = await getUserScores();
      setRecentScores(scores.slice(0, 3));
      setAllScores(scores);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      setLeaderboardLoading(true);
      const data = await getLeaderboard(selectedCategory);
      setLeaderboardData(data);
    } catch (error) {
      console.error("Leaderboard fetch error:", error);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const cats = await getCategories();
      setAvailableCategories(cats);
    } catch (error) {
      console.error("Categories fetch error:", error);
    }
  };

  const handleTabChange = (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
  };

  const categories = [
    {
      id: 18,
      name: "Technology",
      difficulty: "medium",
      color: "#FF6B6B",
      icon: "💻",
    },
    {
      id: 21,
      name: "Sports",
      difficulty: "easy",
      color: "#4ECDC4",
      icon: "⚽",
    },
    {
      id: 9,
      name: "General",
      difficulty: "easy",
      color: "#95E1D3",
      icon: "🧠",
    },
    {
      id: 23,
      name: "History",
      difficulty: "hard",
      color: "#F38181",
      icon: "📚",
    },
    {
      id: 17,
      name: "Science",
      difficulty: "medium",
      color: "#AA96DA",
      icon: "🔬",
    },
    {
      id: 11,
      name: "Movies",
      difficulty: "easy",
      color: "#FCBAD3",
      icon: "🎬",
    },
  ];

  const getCategoryName = (catId) => {
    if (!catId) return "Quiz";
    // Try to find in availableCategories (dynamic) first, then hardcoded
    // Use loose equality to handle both string and number IDs
    const cat = availableCategories.find((c) => c.id == catId) || 
                categories.find((c) => c.id == catId);
    return cat ? cat.name : "Quiz";
  };

  const getScoreColor = (rank) => {
    const colors = [
      "#000",
      "#FF6B6B",
      "#4ECDC4",
      "#95E1D3",
      "#F38181",
      "#AA96DA",
      "#FCBAD3",
      "#FFE66D",
    ];
    return colors[rank - 1] || "#999";
  };

  const totalQuizzes = allScores.length;
  const totalScore = allScores.reduce((sum, item) => sum + item.score, 0);
  const totalQuestions = allScores.reduce(
    (sum, item) => sum + item.totalQuestions,
    0
  );
  const avgPercentage =
    totalQuestions > 0 ? (totalScore / totalQuestions) * 100 : 0;

  const renderHomeTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.description}>
        Challenge your friends and family with our Quiz app, let's see who comes
        out on top in the ultimate quiz showdown, and earns the bragging rights!
      </Text>

      <Text style={styles.sectionTitle}>Popular Quizies</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[styles.categoryCard, { backgroundColor: category.color }]}
            onPress={() =>
              navigation.navigate("Quiz", {
                category: category.id,
                difficulty: category.difficulty,
              })
            }
          >
            <View style={styles.categoryHeader}>
              <View style={styles.categoryTag}>
                <Text style={styles.categoryTagText}>{category.name}</Text>
              </View>
            </View>

            <Text style={styles.categoryTitle}>{category.name}</Text>
            <Text style={styles.categoryDescription}>
              Explore the world of {category.name.toLowerCase()} with this
              interesting quiz!
            </Text>

            <View style={styles.categoryIllustration}>
              <Text style={styles.categoryEmoji}>{category.icon}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.sectionTitle}>Recent Played</Text>

      {recentScores.length > 0 ? (
        recentScores.map((score, index) => (
          <View key={index} style={styles.recentItem}>
            <View style={styles.recentIcon}>
              <Ionicons name="flask" size={22} color="#FF6B6B" />
            </View>
            <View style={styles.recentInfo}>
              <Text style={styles.recentTitle}>
                {getCategoryName(score.category)}
              </Text>
              <Text style={styles.recentScore}>
                {score.score}/{score.totalQuestions} correct
              </Text>
            </View>
            <TouchableOpacity
              style={styles.playAgainButton}
              onPress={() =>
                navigation.navigate("Quiz", {
                  category: parseInt(score.category),
                  difficulty: score.difficulty,
                })
              }
            >
              <Text style={styles.playAgainText}>Play again</Text>
            </TouchableOpacity>
          </View>
        ))
      ) : (
        <Text style={styles.noRecent}>No recent quizzes. Start playing!</Text>
      )}

      <View style={{ height: 120 }} />
    </ScrollView>
  );

  const renderLeaderboardTab = () => {
    const dataArray = Array.isArray(leaderboardData) ? leaderboardData : [];
    const topThree = dataArray.slice(0, 3);
    const rest = dataArray.slice(3);
    // console.log('Leaderboard Data:', dataArray);

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.leaderboardContent}
      >
        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryFilter}
          contentContainerStyle={styles.categoryFilterContent}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedCategory === null && styles.filterChipActive,
            ]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedCategory === null && styles.filterChipTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {availableCategories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.filterChip,
                selectedCategory === cat.id && styles.filterChipActive,
              ]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedCategory === cat.id && styles.filterChipTextActive,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {leaderboardLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
          </View>
        ) : dataArray.length === 0 ? (
          <View style={styles.emptyLeaderboard}>
            <Ionicons name="trophy-outline" size={80} color="#999" />
            <Text style={styles.emptyTitle}>No Data Yet</Text>
            <Text style={styles.emptyText}>
              Be the first to play and top the leaderboard!
            </Text>
          </View>
        ) : (
          <>
            {/* Top 3 Podium */}
            {topThree.length >= 1 && (
              <View style={styles.podium}>
                {/* 2nd Place */}
                {topThree[1] && (
                  <View style={styles.podiumItem}>
                    <View style={[styles.avatar, styles.avatar2]}>
                      <Text style={styles.avatarText}>
                        {topThree[1]?.username?.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.podiumBadge}>🥈</Text>
                    <Text style={styles.podiumName}>{topThree[1]?.username}</Text>
                    <Text style={styles.podiumPoints}>
                      {topThree[1]?.percentage?.toFixed(0)}%
                    </Text>
                  </View>
                )}

                {/* 1st Place */}
                {topThree[0] && (
                  <View style={[styles.podiumItem, styles.podiumWinner]}>
                    <View style={[styles.avatar, styles.avatar1]}>
                      <Text style={styles.avatarText}>
                        {topThree[0]?.username?.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.podiumBadge}>🥇</Text>
                    <Text style={styles.podiumName}>{topThree[0]?.username}</Text>
                    <Text style={styles.podiumPoints}>
                      {topThree[0]?.percentage?.toFixed(0)}%
                    </Text>
                  </View>
                )}

                {/* 3rd Place */}
                {topThree[2] && (
                  <View style={styles.podiumItem}>
                    <View style={[styles.avatar, styles.avatar3]}>
                      <Text style={styles.avatarText}>
                        {topThree[2]?.username?.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.podiumBadge}>🥉</Text>
                    <Text style={styles.podiumName}>{topThree[2]?.username}</Text>
                    <Text style={styles.podiumPoints}>
                      {topThree[2]?.percentage?.toFixed(0)}%
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Leaderboard List */}
            {rest.map((player, index) => {
              const rank = index + 4;
              return (
                <View key={player.userId || index} style={styles.listItem}>
                  <View style={styles.listLeft}>
                    <View style={styles.listAvatar}>
                      <Text style={styles.listAvatarText}>
                        {player.username?.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listName}>{player.username}</Text>
                      <Text style={styles.listPoints}>
                        {player.totalQuizzes} quizzes
                      </Text>
                    </View>
                  </View>
                  <View style={styles.listRight}>
                    <View
                      style={[
                        styles.rankBadge,
                        { backgroundColor: getScoreColor(rank) },
                      ]}
                    >
                      <Text style={styles.rankText}>#{rank}</Text>
                    </View>
                    <View
                      style={[
                        styles.scoreBadge,
                        { backgroundColor: getScoreColor(rank) },
                      ]}
                    >
                      <Text style={styles.scoreText}>
                        {player.percentage?.toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    );
  };

  const renderProfileTab = () => (
    <View>
      <View>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalQuizzes}</Text>
          <Text style={styles.statLabel}>Quizzes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{avgPercentage.toFixed(0)}%</Text>
          <Text style={styles.statLabel}>Avg Score</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalScore}</Text>
          <Text style={styles.statLabel}>Correct</Text>
        </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {allScores.length > 0 ? (
          allScores.map((score, index) => {
            const percentage = (score.score / score.totalQuestions) * 100;
            return (
              <View key={index} style={styles.scoreItem}>
                <View style={styles.scoreHeader}>
                  <View style={styles.scoreLeft}>
                    <Text style={styles.categoryNameText}>
                      {getCategoryName(score.category)}
                    </Text>
                    <Text style={styles.dateText}>
                      {new Date(score.date).toLocaleDateString()}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.difficultyBadge,
                      { backgroundColor: "#FF6B6B" },
                    ]}
                  >
                    <Text style={styles.difficultyText}>
                      {score.difficulty.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.scoreBody}>
                  <View style={styles.scoreCircle}>
                    <Text style={styles.scorePercentage}>
                      {percentage.toFixed(0)}%
                    </Text>
                  </View>
                  <View style={styles.scoreDetails}>
                    <Text style={styles.scoreText}>
                      {score.score}/{score.totalQuestions} Correct
                    </Text>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${percentage}%`,
                            backgroundColor: "#FF6B6B",
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="stats-chart-outline" size={80} color="#999" />
            <Text style={styles.emptyTitle}>No Quizzes Yet</Text>
            <Text style={styles.emptyText}>
              Start taking quizzes to see your stats here!
            </Text>
          </View>
        )}
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>
            {activeTab === "home" && "Quizie"}
            {activeTab === "leaderboard" && "Leaderboard"}
            {activeTab === "social" && "Social Hub"}
            {activeTab === "profile" && "My Stats"}
          </Text>
        </View>
        <TouchableOpacity style={styles.coinBadge} onPress={logout}>
          <Ionicons name="log-out-outline" size={25} color="#000" />
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      )}

      <View style={styles.content}>
        {activeTab === "home" && renderHomeTab()}
        {activeTab === "leaderboard" && renderLeaderboardTab()}
        {activeTab === "social" && <SocialScreen navigation={navigation} />}
        {activeTab === "profile" && renderProfileTab()}
      </View>

      {/* Floating Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navItem, activeTab === "home" && styles.navItemActive]}
          onPress={() => handleTabChange("home")}
        >
          <Ionicons
            name={activeTab === "home" ? "home" : "home-outline"}
            size={22}
            color={activeTab === "home" ? "#FFF" : "#999"}
          />
          {activeTab === "home" && (
            <Text style={styles.navLabelActive}>Home</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navItem,
            activeTab === "leaderboard" && styles.navItemActive,
          ]}
          onPress={() => handleTabChange("leaderboard")}
        >
          <Ionicons
            name={activeTab === "leaderboard" ? "trophy" : "trophy-outline"}
            size={22}
            color={activeTab === "leaderboard" ? "#FFF" : "#999"}
          />
          {activeTab === "leaderboard" && (
            <Text style={styles.navLabelActive}>Ranking</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navItem,
            activeTab === "social" && styles.navItemActive,
          ]}
          onPress={() => handleTabChange("social")}
        >
          <Ionicons
            name={activeTab === "social" ? "people" : "people-outline"}
            size={22}
            color={activeTab === "social" ? "#FFF" : "#999"}
          />
          {activeTab === "social" && (
            <Text style={styles.navLabelActive}>Social</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navItem,
            activeTab === "profile" && styles.navItemActive,
          ]}
          onPress={() => handleTabChange("profile")}
        >
          <Ionicons
            name={activeTab === "profile" ? "person" : "person-outline"}
            size={22}
            color={activeTab === "profile" ? "#FFF" : "#999"}
          />
          {activeTab === "profile" && (
            <Text style={styles.navLabelActive}>Profile</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F1E8",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  logo: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000",
  },
  coinBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  coinText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  leaderboardContent: {
    paddingVertical: 10,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(245, 241, 232, 0.8)",
    zIndex: 999,
  },
  description: {
    fontSize: 13,
    color: "#666",
    lineHeight: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 15,
  },
  categoriesScroll: {
    marginBottom: 30,
    marginHorizontal: -20,
    paddingLeft: 20,
  },
  categoryCard: {
    width: width * 0.7,
    borderRadius: 20,
    padding: 20,
    marginRight: 15,
    minHeight: 280,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  categoryTag: {
    backgroundColor: "#000",
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 15,
  },
  categoryTagText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },
  favoriteButton: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  categoryTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 10,
  },
  categoryDescription: {
    fontSize: 12,
    color: "#FFF",
    lineHeight: 18,
    opacity: 0.9,
  },
  categoryIllustration: {
    position: "absolute",
    bottom: 20,
    right: 20,
  },
  categoryEmoji: {
    fontSize: 60,
    opacity: 0.3,
  },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    marginBottom: 12,
    padding: 15,
    borderRadius: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  recentIcon: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: "#FFE5E5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  recentInfo: {
    flex: 1,
  },
  recentTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
    marginBottom: 3,
  },
  recentScore: {
    fontSize: 12,
    color: "#666",
  },
  playAgainButton: {
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 15,
  },
  playAgainText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "600",
  },
  noRecent: {
    textAlign: "center",
    color: "#999",
    fontSize: 14,
    paddingVertical: 20,
  },
  podium: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    marginBottom: 30,
  },
  podiumItem: {
    alignItems: "center",
    marginHorizontal: 10,
  },
  podiumWinner: {
    marginBottom: 20,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 3,
  },
  avatar1: {
    backgroundColor: "#FFE5B4",
    borderColor: "#FFD700",
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatar2: {
    backgroundColor: "#E8E8E8",
    borderColor: "#C0C0C0",
  },
  avatar3: {
    backgroundColor: "#FFE4C4",
    borderColor: "#CD7F32",
  },
  avatarText: {
    fontSize: 35,
  },
  podiumBadge: {
    fontSize: 24,
    marginBottom: 5,
  },
  podiumName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 3,
  },
  podiumPoints: {
    fontSize: 11,
    color: "#666",
  },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 15,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  listLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  listAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  listAvatarText: {
    fontSize: 22,
  },
  listName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
    marginBottom: 3,
  },
  listPoints: {
    fontSize: 12,
    color: "#666",
  },
  listRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rankBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  rankText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  scoreBadge: {
    width: 45,
    height: 45,
    borderRadius: "50%",
    justifyContent: "center",
    alignItems: "center",
  },
  scoreText: {
    color: "#FFF",
    padding: 90,
    fontSize: 10,
    fontWeight: "bold",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 15,
    padding: 15,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
  },
  scoreItem: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  scoreHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 15,
  },
  scoreLeft: {
    flex: 1,
  },
  categoryNameText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  dateText: {
    fontSize: 12,
    color: "#999",
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FFF",
  },
  scoreBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  scoreCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#667eea",
    justifyContent: "center",
    alignItems: "center",
  },
  scorePercentage: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  scoreDetails: {
    flex: 1,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  bottomNav: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    backgroundColor: "#FFF",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 25,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    borderRadius: 20,
  },
  navItemActive: {
    backgroundColor: "#000",
    paddingHorizontal: 15,
  },
  navLabelActive: {
    fontSize: 12,
    color: "#FFF",
    fontWeight: "600",
  },
  categoryFilter: {
    marginBottom: 20,
    marginHorizontal: -20,
  },
  categoryFilterContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#E0E0E0",
  },
  filterChipActive: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  filterChipTextActive: {
    color: "#FFF",
  },
  loadingContainer: {
    paddingVertical: 100,
    alignItems: "center",
  },
  emptyLeaderboard: {
    paddingVertical: 80,
    alignItems: "center",
  },
  logoutButton: {
    backgroundColor: "#FF6B6B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginVertical: 30,
    gap: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
});


export default MainContainer;
