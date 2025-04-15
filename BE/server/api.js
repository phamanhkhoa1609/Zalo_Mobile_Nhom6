//auth token we will use to generate a meeting and connect to it
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlrZXkiOiI3MTE2MzY4ZS01ZDU1LTRjYjYtYmYzZC0yNTk0YmU3OTFlMDgiLCJwZXJtaXNzaW9ucyI6WyJhbGxvd19qb2luIl0sImlhdCI6MTcxMzM1Mzc4OCwiZXhwIjoxNzEzNDQwMTg4fQ.69B7EAd3WeO1tfMoZy3gBRcubxBf2Ec5eOppsy21jSQ";

// API call to create meeting
const createMeeting = async () => {
  try {
    const res = await fetch(`https://api.videosdk.live/v2/rooms`, {
      method: "POST",
      headers: {
        authorization: `${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      throw new Error("Failed to create meeting");
    }
    const { roomId } = await res.json();
    return roomId;
  } catch (error) {
    console.error("Error creating meeting:", error);
    throw error;
  }
};

module.exports = {
  createMeeting,
};
