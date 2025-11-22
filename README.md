# Quiz App - React Native & Node.js

A comprehensive quiz application built with React Native (Expo) frontend and Node.js/Express backend with MongoDB database. Test your knowledge across multiple categories and compete on the leaderboard!

## 🎯 Features

### Frontend Features
- **User Authentication**
  - User registration with email and password
  - Secure login with JWT token authentication
  - Session management with automatic logout
  
- **Quiz Taking**
  - Multiple categories: Technology, Sports, General Knowledge, History, Science, Movies
  - Difficulty levels: Easy, Medium, Hard
  - Real-time quiz questions with multiple-choice answers
  - Score calculation with percentage display
  - Immediate feedback on answers

- **User Profile**
  - View personal quiz statistics (total quizzes, average score, correct answers)
  - Complete quiz history with dates and difficulty levels
  - Progress tracking with visual indicators
  - Logout functionality from profile page

- **Leaderboard**
  - Global leaderboard displaying top performers
  - Top 3 podium display (1st, 2nd, 3rd place with medals)
  - Ranked list of all users with scores
  - Category-based filtering
  - Real-time ranking updates

- **User Interface**
  - Clean and modern design with smooth animations
  - Responsive layout for all device sizes
  - Tab-based navigation (Home, Leaderboard, Profile)
  - Floating bottom navigation bar
  - Loading indicators for async operations
  - Error handling with user-friendly messages

### Backend Features
- **Authentication & Authorization**
  - User registration and login
  - JWT-based token authentication
  - Secure password storage
  - Protected routes with middleware

- **Quiz Management**
  - Quiz questions from Open Trivia Database
  - Multiple categories and difficulty levels
  - Score calculation and storage
  - Category filtering support

- **Leaderboard System**
  - User ranking calculations
  - Percentage-based scoring
  - Category-specific rankings
  - Aggregated user statistics

- **Database**
  - MongoDB for persistent data storage
  - User profiles and authentication
  - Quiz results history
  - Leaderboard data management

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (Atlas cloud or local instance)
- Expo CLI (`npm install -g expo-cli`)
- npm or yarn package manager

## 🚀 Setup Instructions

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Configure environment variables
# Edit .env file with:
# MONGO_URI=your_mongodb_connection_string
# JWT_SECRET=your_secret_key
# PORT=3000

# Start the development server
npm start
# Server runs on http://localhost:3000
```

### 2. Frontend Setup

```bash
# Navigate to app directory
cd app

# Install dependencies
npm install

# Configure API URL in env.config.js
# Update API_URL_ENV in .env file:
# API_URL_ENV=http://10.7.7.66:3000

# Start the Expo app
npm start
# Scan QR code with Expo Go app on your device
```

## 🎮 How to Use the App

### Registration
1. Open the app and tap "Register"
2. Enter username, email, and password
3. Tap "Register" button
4. You'll be logged in automatically

### Taking a Quiz
1. From home screen, select a quiz category
2. Choose difficulty level (Easy, Medium, Hard)
3. Answer all questions
4. View your score and percentage
5. Results are saved to your profile

### Viewing Leaderboard
1. Tap the "Leaderboard" tab
2. View global rankings and top 3 podium
3. Filter by category using category chips
4. See other users' scores and statistics

### Profile Management
1. Tap the "Profile" tab
2. View your personal statistics
3. See your complete quiz history
4. Tap logout icon (top right) to sign out

## 🔧 Environment Configuration

### Backend (.env)
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/quizdb
JWT_SECRET=your_jwt_secret_key
PORT=3000
```

### Frontend (.env)
```
API_URL_ENV=http://10.7.7.66:3000
```

### Device-Specific API URLs
- **Android Emulator**: `http://10.0.2.2:3000/api`
- **iOS Simulator**: `http://localhost:3000/api`
- **Physical Device**: Use your machine's local IP (e.g., `http://192.168.1.5:3000/api`)

## 📱 Tech Stack

### Frontend
- **React Native** - Mobile app framework
- **Expo** - React Native development platform
- **Axios** - HTTP client
- **React Navigation** - App navigation
- **AsyncStorage** - Local data persistence

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **MongoDB** - NoSQL database
- **JWT** - Authentication tokens
- **Open Trivia Database API** - Quiz questions

## 🐛 Troubleshooting

### Network Connection Issues
- Ensure backend server is running (`npm start` in backend directory)
- Verify API URL in `env.config.js` matches your device/network
- Check if firewall is blocking connections
- For physical devices, ensure device is on same network as backend

### MongoDB Connection Issues
- Verify MongoDB connection string in `.env`
- Check IP whitelist in MongoDB Atlas (allow your IP)
- Ensure database user has correct permissions
- Test connection with MongoDB Compass

### App Won't Start
- Clear Expo cache: `expo start --clear`
- Delete `node_modules` and run `npm install` again
- Check for syntax errors in code
- Verify all dependencies are installed

### Authentication Issues
- Clear AsyncStorage: Uninstall and reinstall app
- Check JWT_SECRET is configured in backend
- Verify token is being saved on login
- Check network requests in browser DevTools

## 📄 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Quiz
- `POST /api/quiz/save-score` - Save quiz score
- `GET /api/quiz/user-scores` - Get user's quiz history
- `GET /api/quiz/leaderboard` - Get leaderboard
- `GET /api/quiz/categories` - Get available categories

## 🎨 App Architecture

```
app/
├── src/
│   ├── screens/          # App screens (Home, Profile, Leaderboard)
│   ├── components/       # Reusable components
│   ├── context/          # React context (Auth)
│   └── services/         # API services
├── env.config.js         # Environment configuration
└── .env                  # Environment variables

backend/
├── routes/              # API routes
├── controllers/         # Business logic
├── models/              # Database models
├── middleware/          # Auth middleware
└── config/              # Database configuration
```

## 📊 Features Roadmap

- [ ] User profile customization
- [ ] Friends/social features
- [ ] Timed quizzes with countdown
- [ ] Achievement badges
- [ ] Push notifications
- [ ] Offline quiz mode
- [ ] Dark theme support
- [ ] Multiple language support

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Feel free to submit issues and enhancement requests.

## 📧 Support

For support or questions, please reach out through the project repository issues page.

