import express from "express";
import { WebSocketServer } from "ws";
import http from "http";
import cors from "cors";

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// ✅ State variables
let broadcaster = null;
let currentSong = null;
let currentTitle = "BiharFM Live Stream";
let currentImage = null;
let currentTime = 0;
let isPlaying = false;

// ✅ WebSocket connection
wss.on("connection", (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const key = url.searchParams.get("key");

  // mark as broadcaster
  if (key === process.env.BROADCAST_KEY || key === "supersecret123") {
    ws.isBroadcaster = true;
    broadcaster = ws;
    console.log("🎙 Broadcaster connected");
  } else {
    ws.isBroadcaster = false;
    console.log("🎧 Listener connected");
  }

  // ✅ Incoming messages
  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);

      // Only broadcaster can control playback or update metadata
      if (ws.isBroadcaster) {
        switch (data.type) {
          case "play":
            currentSong = data.song;
            currentTitle = data.title || "Unknown Track";
            currentImage = data.image || null;
            currentTime = 0;
            isPlaying = true;
            broadcast({
              type: "play",
              song: currentSong,
              title: currentTitle,
              image: currentImage,
              time: 0,
            });
            break;

          case "pause":
            isPlaying = false;
            broadcast({ type: "pause" });
            break;

          case "resume":
            isPlaying = true;
            broadcast({ type: "resume", time: currentTime });
            break;

          case "seek":
            currentTime = data.time;
            broadcast({ type: "seek", time: currentTime });
            break;

          case "updateMeta":
            if (data.title) currentTitle = data.title;
            if (data.image) currentImage = data.image;
            broadcast({
              type: "meta",
              title: currentTitle,
              image: currentImage,
            });
            break;
        }
      }
    } catch (err) {
      console.error("❌ Message error:", err);
    }
  });

  // ✅ Initial status on connection
  ws.send(
    JSON.stringify({
      type: "status",
      song: currentSong,
      title: currentTitle,
      image: currentImage,
      time: currentTime,
      playing: isPlaying,
    })
  );

  ws.on("close", () => {
    if (ws.isBroadcaster) {
      broadcaster = null;
      console.log("❌ Broadcaster disconnected");
    }
  });
});

// ✅ Broadcast helper
function broadcast(obj) {
  const data = JSON.stringify(obj);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(data);
  });
}

// ✅ Track playback time
setInterval(() => {
  if (isPlaying) currentTime += 1;
}, 1000);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`✅ Bihar FM server running on port ${PORT}`));
