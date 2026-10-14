/**
 * Tests for room management via HTTP routes + the in-memory roomStore.
 *
 * Covers: room creation, joining, capacity enforcement, invalid joins,
 * room independence, appropriate HTTP status codes.
 */

import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { rooms } from "../src/store/roomStore.js";
import { clearAllRooms } from "./helpers.js";
import { ROOM_STATES } from "../src/config/constants.js";
import { createTestServer } from "./helpers.js";

// Lightweight HTTP fetch helper (built-in from Node 18+)
async function post(baseUrl, path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  return { status: res.status, body: json };
}

describe("Room HTTP routes", () => {
  let srv;

  afterEach(async () => {
    clearAllRooms();
    if (srv) { await srv.close(); srv = null; }
  });

  // ── Creation ──────────────────────────────────────────────

  it("POST /api/rooms/rooms creates a room and returns roomId + playerId", async () => {
    srv = await createTestServer();
    const { status, body } = await post(srv.baseUrl, "/api/rooms/rooms");
    assert.equal(status, 201);
    assert.ok(body.roomId, "should return roomId");
    assert.ok(body.playerId, "should return playerId");
    assert.ok(rooms[body.roomId], "room should exist in store");
  });

  // ── Joining ───────────────────────────────────────────────

  it("POST /api/rooms/join_rooms/:id lets a new player join", async () => {
    srv = await createTestServer();
    const create = await post(srv.baseUrl, "/api/rooms/rooms");
    const { status, body } = await post(
      srv.baseUrl,
      `/api/rooms/join_rooms/${create.body.roomId}`
    );
    assert.equal(status, 201);
    assert.ok(body.playerId);
    assert.equal(rooms[create.body.roomId].players.length, 2);
  });

  it("rejects joining a non-existent room", async () => {
    srv = await createTestServer();
    const { status } = await post(srv.baseUrl, "/api/rooms/join_rooms/NOPE");
    assert.equal(status, 400);
  });

  // ── Capacity ──────────────────────────────────────────────

  it("enforces the four-player capacity", async () => {
    srv = await createTestServer();
    const create = await post(srv.baseUrl, "/api/rooms/rooms");
    const roomId = create.body.roomId;

    // Join 3 more (total 4, one from create)
    for (let i = 0; i < 3; i++) {
      const r = await post(srv.baseUrl, `/api/rooms/join_rooms/${roomId}`);
      assert.equal(r.status, 201, `player ${i + 2} should join`);
    }

    assert.equal(rooms[roomId].players.length, 4);

    // 5th player should be rejected
    const { status, body } = await post(
      srv.baseUrl,
      `/api/rooms/join_rooms/${roomId}`
    );
    assert.equal(status, 409);
    assert.equal(body.code, "ROOM_FULL");
  });

  // ── Locked room ───────────────────────────────────────────

  it("rejects joining a locked room (game in progress)", async () => {
    srv = await createTestServer();
    const create = await post(srv.baseUrl, "/api/rooms/rooms");
    const roomId = create.body.roomId;
    rooms[roomId].roomLocked = true;
    rooms[roomId].state = ROOM_STATES.drawing;

    const { status, body } = await post(
      srv.baseUrl,
      `/api/rooms/join_rooms/${roomId}`
    );
    assert.equal(status, 409);
    assert.equal(body.code, "ROOM_LOCKED");
  });

  // ── Multiple independent rooms ────────────────────────────

  it("rooms are independent", async () => {
    srv = await createTestServer();
    const r1 = await post(srv.baseUrl, "/api/rooms/rooms");
    const r2 = await post(srv.baseUrl, "/api/rooms/rooms");
    assert.notEqual(r1.body.roomId, r2.body.roomId);

    // Joining room 1 does not affect room 2
    await post(srv.baseUrl, `/api/rooms/join_rooms/${r1.body.roomId}`);
    assert.equal(rooms[r1.body.roomId].players.length, 2);
    assert.equal(rooms[r2.body.roomId].players.length, 1);
  });

  // ── Reconnection via join route ───────────────────────────

  it("reconnect with valid playerId returns 200", async () => {
    srv = await createTestServer();
    const create = await post(srv.baseUrl, "/api/rooms/rooms");
    const roomId = create.body.roomId;
    const playerId = create.body.playerId;

    // Simulate disconnection (set socket null and reconnect expiry)
    const player = rooms[roomId].players[0];
    player.socket = null;
    player.reconnectExpiresAt = Date.now() + 5000;

    const { status, body } = await post(
      srv.baseUrl,
      `/api/rooms/join_rooms/${roomId}?playerId=${playerId}`
    );
    assert.equal(status, 200);
    assert.equal(body.reconnect, true);
  });

  it("reconnect with expired timer returns 410", async () => {
    srv = await createTestServer();
    const create = await post(srv.baseUrl, "/api/rooms/rooms");
    const roomId = create.body.roomId;
    const playerId = create.body.playerId;

    const player = rooms[roomId].players[0];
    player.socket = null;
    player.reconnectExpiresAt = Date.now() - 1000; // expired

    const { status } = await post(
      srv.baseUrl,
      `/api/rooms/join_rooms/${roomId}?playerId=${playerId}`
    );
    assert.equal(status, 410);
  });

  it("reconnect with unknown playerId returns 404", async () => {
    srv = await createTestServer();
    const create = await post(srv.baseUrl, "/api/rooms/rooms");
    const { status } = await post(
      srv.baseUrl,
      `/api/rooms/join_rooms/${create.body.roomId}?playerId=UNKNOWN`
    );
    assert.equal(status, 404);
  });
});
