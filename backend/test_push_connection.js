const sendPushNotification = require('./utils/pushNotification');

const testPush = async () => {
  console.log("🚀 Testing connection to Expo Push Service...");
  
  // This is a fake token, so we expect Expo to receive it but say "DeviceNotRegistered" or similar.
  // If we get a network error, then the backend can't reach Expo.
  const fakeToken = "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]";
  
  try {
    await sendPushNotification(
      fakeToken, 
      "Test Title", 
      "Test Body", 
      { data: "test" }
    );
    console.log("✅ Request sent to Expo (check output above for specific Expo response)");
  } catch (error) {
    console.error("❌ Failed to connect to Expo:", error);
  }
};

testPush();
