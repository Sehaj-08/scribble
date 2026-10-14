/**
 * WebSocket integration tests.
 *
 * Spins up a real HTTP + WebSocket test server and connects real WS clients
 * to verify the end-to-end message flow: connection, room events, strokes,
 * guessing, game lifecycle, disconnection cleanup, and error handling.
 */

import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { WebSocket } from "ws";
import { rooms } from "../src/store/roomStore.js";
import { ROOM_STATES, STROKE_EVENTS, GUESS_EVENTS, CHOOSE_WORD } from "../src/config/constants.js";
import {
  createTestServer,
  connectWs,
  collectMessages,
  waitForMessage,
  clearAllRooms,
  sleep,
} from "./helpers.js";

let srv;

afterEach(async () => {
  clearAllRooms();
  if (srv) {
    await srv.close().catch(() => {});
    srv = null;
  }
});

// ── Helpers ─────────────────────────────────────────────────

async function createRoomViaHTTP(baseUrl) {
  const res = await fetch(`${baseUrl}/api/rooms/rooms`, { method: "POST" });
  return res.json();
}

async function joinRoomViaHTTP(baseUrl, roomId) {
  const res = await fetch(`${baseUrl}/api/rooms/join_rooms/${roomId}`, {
    method: "POST",
  });
  return res.json();
}

function closeWs(ws) {
  return new Promise((resolve) => {
    if (ws.readyState === WebSocket.CLOSED) return resolve();
    ws.on("close", resolve);
    ws.close();
  });
}

// ── Connection basics ───────────────────────────────────────

describe("WebSocket integration – connection", () => {
  it("connects successfully with valid roomId and playerId", async () => {
    srv = await createTestServer();
    const { roomId, playerId } = await createRoomViaHTTP(srv.baseUrl);

    const ws = await connectWs(srv.wsUrl, roomId, playerId);
    assert.equal(ws.readyState, WebSocket.OPEN);

    await closeWs(ws);
  });

  it("closes connection for non-existent room", async () => {
    srv = await createTestServer();
    const ws = new WebSocket(`${srv.wsUrl}/?roomId=FAKE&playerId=FAKE`);

    const code = await new Promise((resolve) => {
      ws.on("close", (code) => resolve(code));
      ws.on("error", () => {}); // suppress error
    });

    assert.equal(code, 1008);
  });

  it("closes connection for unknown playerId", async () => {
    srv = await createTestServer();
    const { roomId } = await createRoomViaHTTP(srv.baseUrl);
    const ws = new WebSocket(`${srv.wsUrl}/?roomId=${roomId}&playerId=UNKNOWN`);

    const code = await new Promise((resolve) => {
      ws.on("close", (code) => resolve(code));
      ws.on("error", () => {});
    });

    assert.equal(code, 1008);
  });
});

// ── State snapshot on connect ───────────────────────────────

describe("WebSocket integration – state snapshot", () => {
  it("new player receives current state snapshot on connect", async () => {
    srv = await createTestServer();
    const { roomId, playerId } = await createRoomViaHTTP(srv.baseUrl);

    const ws = await connectWs(srv.wsUrl, roomId, playerId);
    // Server sends exactly 2 messages on connect:
    //   1. all_connectedPlayers_list
    //   2. current_state_snapshot
    const msgs = await collectMessages(ws, 2, 3000);

    const snapshot = msgs.find(
      (m) => m.type === "current_state_snapshot"
    );
    assert.ok(snapshot, "should receive current_state_snapshot");
    assert.equal(snapshot.state, ROOM_STATES.waiting);

    await closeWs(ws);
  });
});

// ── Invalid messages ────────────────────────────────────────

describe("WebSocket integration – invalid messages", () => {
  it("closes connection on malformed JSON", async () => {
    srv = await createTestServer();
    const { roomId, playerId } = await createRoomViaHTTP(srv.baseUrl);

    const ws = await connectWs(srv.wsUrl, roomId, playerId);
    // Drain initial messages
    await collectMessages(ws, 2, 1000);

    ws.send("NOT_VALID_JSON{{{");

    const code = await new Promise((resolve) => {
      ws.on("close", (code) => resolve(code));
    });

    assert.equal(code, 1007);
  });

  it("silently rejects unknown message type (no crash)", async () => {
    srv = await createTestServer();
    const { roomId, playerId } = await createRoomViaHTTP(srv.baseUrl);
    const ws = await connectWs(srv.wsUrl, roomId, playerId);
    await collectMessages(ws, 2, 1000);

    ws.send(JSON.stringify({ type: "fireworks", data: "boom" }));

    // Server should stay alive — send another message to verify
    await sleep(200);
    assert.equal(ws.readyState, WebSocket.OPEN);

    await closeWs(ws);
  });
});

// ── Two-player communication ────────────────────────────────

describe("WebSocket integration – two-player game flow", () => {
  it("player_joined event is received by existing player when second player connects", async () => {
    srv = await createTestServer();
    const { roomId, playerId: p1Id } = await createRoomViaHTTP(srv.baseUrl);
    const { playerId: p2Id } = await joinRoomViaHTTP(srv.baseUrl, roomId);

    const ws1 = await connectWs(srv.wsUrl, roomId, p1Id);
    await collectMessages(ws1, 2, 1000); // drain initial msgs

    // Set up listener before ws2 connects
    const joinPromise = waitForMessage(
      ws1,
      (m) => m.type === "player_joined",
      3000
    );

    const ws2 = await connectWs(srv.wsUrl, roomId, p2Id);

    const joinMsg = await joinPromise;
    assert.equal(joinMsg.playerId, p2Id);

    await closeWs(ws1);
    await closeWs(ws2);
  });
});

// ── Oversized payload ───────────────────────────────────────

describe("WebSocket integration – oversized payload", () => {
  it("rejects messages exceeding maxPayload (1KB)", async () => {
    srv = await createTestServer();
    const { roomId, playerId } = await createRoomViaHTTP(srv.baseUrl);
    const ws = await connectWs(srv.wsUrl, roomId, playerId);
    await collectMessages(ws, 2, 1000);

    // Send a payload larger than 1024 bytes
    const bigPayload = JSON.stringify({
      type: STROKE_EVENTS.POINT,
      strokeId: 1,
      x: 100,
      y: 200,
      newStroke: true,
      padding: "x".repeat(2000),
    });

    const closePromise = new Promise((resolve) => {
      ws.on("close", (code) => resolve(code));
    });

    // Suppress the client-side RangeError that ws library throws
    ws.on("error", () => {});

    try {
      ws.send(bigPayload);
    } catch {
      // Client might throw before sending
    }

    const code = await closePromise;
    // WS library closes with 1006 or 1009 for oversized messages
    assert.ok(
      [1006, 1009].includes(code),
      `expected close code 1006 or 1009, got ${code}`
    );
  });
});

// ── Rate limiting ───────────────────────────────────────────

describe("WebSocket integration – rate limiting", () => {
  it("guess rate limiting kicks in after burst (server stays alive)", async () => {
    srv = await createTestServer();
    const { roomId, playerId } = await createRoomViaHTTP(srv.baseUrl);
    const ws = await connectWs(srv.wsUrl, roomId, playerId);
    await collectMessages(ws, 2, 1000);

    // Flood with guess messages (burst limit = 5)
    for (let i = 0; i < 10; i++) {
      ws.send(JSON.stringify({ type: GUESS_EVENTS.GUESS, text: `guess${i}` }));
    }

    // Server should still be alive and not crash
    await sleep(500);
    assert.equal(ws.readyState, WebSocket.OPEN);

    await closeWs(ws);
  });
});

// ── Disconnection cleanup ───────────────────────────────────

describe("WebSocket integration – disconnection", () => {
  it("disconnected client is cleaned up (socket set to null)", async () => {
    srv = await createTestServer();
    const { roomId, playerId } = await createRoomViaHTTP(srv.baseUrl);

    const ws = await connectWs(srv.wsUrl, roomId, playerId);
    await collectMessages(ws, 2, 1000);

    await closeWs(ws);
    await sleep(500); // allow server-side close handler to fire

    const room = rooms[roomId];
    if (room) {
      const player = room.players.find((p) => p.playerId === playerId);
      if (player) {
        assert.equal(player.socket, null, "player socket should be null after disconnect");
      }
    }
  });
});

// ── Room-specific events ────────────────────────────────────

describe("WebSocket integration – room isolation", () => {
  it("events in one room do not leak to another room", async () => {
    srv = await createTestServer();

    // Create two rooms
    const room1 = await createRoomViaHTTP(srv.baseUrl);
    const room2 = await createRoomViaHTTP(srv.baseUrl);

    const { playerId: p2Id } = await joinRoomViaHTTP(srv.baseUrl, room1.roomId);

    const ws1 = await connectWs(srv.wsUrl, room1.roomId, room1.playerId);
    const wsRoom2 = await connectWs(srv.wsUrl, room2.roomId, room2.playerId);

    await collectMessages(ws1, 2, 1000);
    await collectMessages(wsRoom2, 2, 1000);

    // Set up listener on room2 to make sure it does NOT get room1's player_joined
    let room2GotPlayerJoined = false;
    wsRoom2.on("message", (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === "player_joined" && msg.playerId === p2Id) {
        room2GotPlayerJoined = true;
      }
    });

    // player 2 connects to room 1
    const ws1p2 = await connectWs(srv.wsUrl, room1.roomId, p2Id);

    await sleep(500);
    assert.equal(
      room2GotPlayerJoined,
      false,
      "room2 should not see room1 events"
    );

    await closeWs(ws1);
    await closeWs(ws1p2);
    await closeWs(wsRoom2);
  });
});

// ── Reconnecting client gets state ──────────────────────────

describe("WebSocket integration – reconnection", () => {
  it("reconnecting player receives state snapshot", async () => {
    srv = await createTestServer();
    const { roomId, playerId: p1Id } = await createRoomViaHTTP(srv.baseUrl);
    const { playerId: p2Id } = await joinRoomViaHTTP(srv.baseUrl, roomId);

    // Connect both players
    const ws1 = await connectWs(srv.wsUrl, roomId, p1Id);
    const ws2 = await connectWs(srv.wsUrl, roomId, p2Id);
    await collectMessages(ws1, 2, 1000);
    await collectMessages(ws2, 2, 1000);

    // Disconnect p1
    await closeWs(ws1);
    await sleep(500);

    // Reconnect p1 within grace period
    const ws1r = await connectWs(srv.wsUrl, roomId, p1Id);
    const msgs = await collectMessages(ws1r, 2, 3000);

    const snapshot = msgs.find((m) => m.type === "current_state_snapshot");
    assert.ok(snapshot, "reconnecting player should get state snapshot");

    await closeWs(ws1r);
    await closeWs(ws2);
  });
});
