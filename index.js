import express from "express";
import { WebSocketServer } from "ws";
import http from "http";
import cors from "cors";

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

let currentSong = null;
let currentTime = 0;
let isPlaying = false;
let broadcaster = null;

wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);

      if (data.type === "broadcaster") {
        broadcaster = ws;
        console.log("🎛 Broadcaster connected");
      }

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

    } catch (err) {
      console.error("❌ Message error:", err);
    }
  });

  // send current state to new listener
  ws.send(JSON.stringify({
    type: "status",
    song: currentSong,
    time: currentTime,
    playing: isPlaying,
  }));
});

function broadcast(obj) {
  const data = JSON.stringify(obj);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(data);
  });
}

setInterval(() => {
  if (isPlaying) currentTime += 1;
}, 1000);

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`✅ FM Server running on port ${PORT}`));
