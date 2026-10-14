/**
 * Shared test helpers for the scribble backend test suite.
 * Provides factory functions for rooms, players, mock sockets,
 * and a reusable test server (HTTP + WebSocket).
 */

import http from "http";
import express from "express";
import { WebSocket } from "ws";
import { rooms } from "../src/store/roomStore.js";
import { ROOM_STATES } from "../src/config/constants.js";
import { initWebSockets } from "../src/sockets/socketManager.js";
import room_router from "../src/routes/room.routes.js";

// ── Mock socket ──────────────────────────────────────────────
let mockConnId = 0;

export function createMockSocket() {
  const sent = [];
  return {
    connId: ++mockConnId,
    readyState: WebSocket.OPEN,
    send(data) { sent.push(JSON.parse(data)); },
    close() { this.readyState = WebSocket.CLOSED; },
    sent,
    // helpers for rate-limit tests
    rateLimitBuckets: undefined,
  };
}

// ── Room / player factories ──────────────────────────────────

export function createPlayer(overrides = {}) {
  return {
    playerId: overrides.playerId ?? `p-${Math.random().toString(36).slice(2, 8)}`,
    socket: overrides.socket ?? createMockSocket(),
    hasGuessed: false,
    lastStrokeId: 0,
    reconnectExpiresAt: null,
    score: 0,
    ...overrides,
  };
}

export function createRoom(roomId, overrides = {}) {
  const room = {
    players: [],
    state: ROOM_STATES.waiting,
    strokes: [],
    totalRounds: 5,
    currentRounds: 0,
    alreadyMadeDrawers: [],
    roomDeleteTimer: null,
    roomLocked: false,
    pendingTimeouts: new Set(),
    shuttingDown: false,
    drawer: null,
    word: null,
    candidateArray: [],
    timer: null,
    time: 60,
    ...overrides,
  };
  rooms[roomId] = room;
  return room;
}

/**
 * Remove ALL rooms from the shared store – call in afterEach / after.
 */
export function clearAllRooms() {
  for (const id of Object.keys(rooms)) {
    const room = rooms[id];
    if (room.timer) { clearInterval(room.timer); room.timer = null; }
    if (room.roomDeleteTimer) { clearTimeout(room.roomDeleteTimer); room.roomDeleteTimer = null; }
    if (room.pendingTimeouts) {
      for (const tid of room.pendingTimeouts) clearTimeout(tid);
      room.pendingTimeouts.clear();
    }
    delete rooms[id];
  }
}

// ── Test server (HTTP + WS) ──────────────────────────────────

/**
 * Create an Express + WebSocket test server on an ephemeral port.
 * Returns { server, wss, app, baseUrl, wsUrl, close() }.
 */
export async function createTestServer() {
  const app = express();
  app.use(express.json());
  app.use("/api/rooms", room_router);

  const server = http.createServer(app);
  const wss = initWebSockets(server);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  const close = () =>
    new Promise((resolve, reject) => {
      // Close all WS clients
      for (const client of wss.clients) client.terminate();
      wss.close(() => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    });

  return {
    server,
    wss,
    app,
    baseUrl: `http://127.0.0.1:${port}`,
    wsUrl: `ws://127.0.0.1:${port}`,
    close,
  };
}

/**
 * Open a WebSocket client to the test server and wait for it to be OPEN.
 * All received messages are buffered in ws.inbox (parsed JSON objects).
 * Returns the WebSocket instance.
 */
export function connectWs(wsUrl, roomId, playerId) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${wsUrl}/?roomId=${roomId}&playerId=${playerId}`);
    ws.inbox = [];
    ws._inboxWaiters = [];

    ws.on("message", (data) => {
      const msg = JSON.parse(data.toString());
      ws.inbox.push(msg);
      // Notify any waiters
      const waiters = ws._inboxWaiters;
      ws._inboxWaiters = [];
      for (const w of waiters) w();
    });

    ws.on("open", () => resolve(ws));
    ws.on("error", reject);
  });
}

/**
 * Collect the next `n` parsed JSON messages from a WS client's inbox.
 * If messages were already buffered before this call, they are drained first.
 */
export function collectMessages(ws, n, timeoutMs = 5000) {
  return new Promise((resolve) => {
    if (ws.inbox.length >= n) {
      return resolve(ws.inbox.splice(0, n));
    }

    const timer = setTimeout(() => {
      resolve(ws.inbox.splice(0)); // return whatever we have
    }, timeoutMs);

    function check() {
      if (ws.inbox.length >= n) {
        clearTimeout(timer);
        resolve(ws.inbox.splice(0, n));
      } else {
        ws._inboxWaiters.push(check);
      }
    }

    ws._inboxWaiters.push(check);
  });
}

/**
 * Wait for a single message matching a predicate.
 * Checks already-buffered inbox messages first.
 */
export function waitForMessage(ws, predicate, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    // Check existing inbox
    const idx = ws.inbox.findIndex(predicate);
    if (idx !== -1) {
      return resolve(ws.inbox.splice(idx, 1)[0]);
    }

    const timer = setTimeout(() => {
      reject(new Error("Timed out waiting for message"));
    }, timeoutMs);

    function check() {
      const idx = ws.inbox.findIndex(predicate);
      if (idx !== -1) {
        clearTimeout(timer);
        resolve(ws.inbox.splice(idx, 1)[0]);
      } else {
        ws._inboxWaiters.push(check);
      }
    }

    ws._inboxWaiters.push(check);
  });
}

/**
 * Small sleep helper.
 */
export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
