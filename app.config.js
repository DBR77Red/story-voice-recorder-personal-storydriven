export default {
    expo: {
        name: "voice-story",
        slug: "voice-story",
        version: "1.0.0",
        orientation: "portrait",
        platforms: ["android"],
        android: {
            package: "com.danielrcamelo.voicestory"
        },
        extra: {
            deepgramApiKey: process.env.DEEPGRAM_API_KEY,
            eas: {
                projectId: "d9f2b2a6-fd97-4aa7-899a-3450a688ed8a"
            }
        }
    }
};