import express from "express";
import { WebSocketServer } from "ws";
import http from "http";
import cors from "cors";

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

let broadcaster = null;
let currentSong = null;
let currentTime = 0;
let isPlaying = false;

// ✅ WebSocket connection
wss.on("connection", (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const key = url.searchParams.get("key"); // broadcaster key if provided

  // mark as broadcaster if key matches
  if (key === process.env.BROADCAST_KEY || key === "supersecret123") {
    ws.isBroadcaster = true;
    broadcaster = ws;
    console.log("🎙 Broadcaster connected");
  } else {
    ws.isBroadcaster = false;
    console.log("🎧 Listener connected");
  }

  // handle messages
  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);

      // only broadcaster can control playback
      if (ws.isBroadcaster) {
        if (data.type === "play") {
          currentSong = data.song;
          currentTime = 0;
          isPlaying = true;
          broadcast({ type: "play", song: currentSong, time: 0 });
        }
        if (data.type === "pause") {
          isPlaying = false;
          broadcast({ type: "pause" });
        }
        if (data.type === "resume") {
          isPlaying = true;
          broadcast({ type: "resume", time: currentTime });
        }
        if (data.type === "seek") {
          currentTime = data.time;
          broadcast({ type: "seek", time: currentTime });
        }
      }
    } catch (err) {
      console.error("❌ Message error:", err);
    }
  });

  // send initial status
  ws.send(JSON.stringify({
    type: "status",
    song: currentSong,
    time: currentTime,
    playing: isPlaying,
  }));

  ws.on("close", () => {
    if (ws.isBroadcaster) {
      broadcaster = null;
      console.log("❌ Broadcaster disconnected");
    }
  });
});

// ✅ broadcast to all except broadcaster
function broadcast(obj) {
  const data = JSON.stringify(obj);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(data);
  });
}

// Update time when playing
setInterval(() => {
  if (isPlaying) currentTime += 1;
}, 1000);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`✅ Bihar FM server running on port ${PORT}`));
