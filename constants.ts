
export const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    // A TURN server is REQUIRED for production environments to handle complex network scenarios (like symmetric NATs).
    // You can get TURN server credentials from services like Twilio, or by hosting your own (e.g., using the Coturn server).
    // Example TURN server configuration:
    /*
    {
      urls: "turn:your-turn-server.com:3478",
      username: "your-username",
      credential: "your-password",
    },
    */
  ],
};
