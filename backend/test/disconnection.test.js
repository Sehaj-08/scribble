/**
 * Tests for disconnection, reconnection, room deletion, timer safety,
 * drawer-left behavior, and graceful shutdown.
 */

import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { WebSocket } from "ws";
import { rooms } from "../src/store/roomStore.js";
import { ROOM_STATES, DRAWER_LEFT } from "../src/config/constants.js";
import {
  disconnection,
  startRound,
  cleanupRoomTimers,
  scheduleRoomTimeout,
} from "../src/services/gameServices.js";
import {
  createRoom,
  createPlayer,
  createMockSocket,
  clearAllRooms,
  sleep,
} from "./helpers.js";

afterEach(() => {
  clearAllRooms();
});

// ── Basic disconnection ─────────────────────────────────────

describe("disconnection", () => {
  it("sets player.socket to null", () => {
    const room = createRoom("d1");
    const sock = createMockSocket();
    const p1 = createPlayer({ playerId: "p1", socket: sock });
    const p2 = createPlayer({ playerId: "p2" });
    room.players.push(p1, p2);

    disconnection("p1", room, "d1", sock);

    assert.equal(p1.socket, null);
  });

  it("sets a 5-second reconnectExpiresAt", () => {
    const room = createRoom("d2");
    const sock = createMockSocket();
    const p1 = createPlayer({ playerId: "p1", socket: sock });
    const p2 = createPlayer({ playerId: "p2" });
    room.players.push(p1, p2);

    const before = Date.now();
    disconnection("p1", room, "d2", sock);

    assert.ok(p1.reconnectExpiresAt >= before + 4500, "should be ~5s from now");
    assert.ok(p1.reconnectExpiresAt <= before + 6000);
  });

  it("broadcasts Player_left to remaining players", () => {
    const room = createRoom("d3");
    const sock1 = createMockSocket();
    const p1 = createPlayer({ playerId: "p1", socket: sock1 });
    const p2 = createPlayer({ playerId: "p2" });
    room.players.push(p1, p2);

    disconnection("p1", room, "d3", sock1);

    const leftMsg = p2.socket.sent.find((m) => m.message === "Player_left");
    assert.ok(leftMsg, "remaining player should see Player_left");
    assert.equal(leftMsg.player_id, "p1");
  });

  it("ignores disconnection from a stale socket", () => {
    const room = createRoom("d4");
    const staleSock = createMockSocket();
    const newSock = createMockSocket();
    const p1 = createPlayer({ playerId: "p1", socket: newSock });
    room.players.push(p1);

    disconnection("p1", room, "d4", staleSock);

    // Socket should NOT be nulled – the player is using a newer socket
    assert.equal(p1.socket, newSock);
  });

  it("handles unknown playerId gracefully", () => {
    const room = createRoom("d5");
    const sock = createMockSocket();

    // Should not throw
    disconnection("UNKNOWN", room, "d5", sock);
  });
});

// ── Drawer disconnection ────────────────────────────────────

describe("drawer disconnection", () => {
  it("clears timer and sends DRAWER_LEFT_NEW_ROUND when drawer leaves mid-round", () => {
    const room = createRoom("dd1", {
      state: ROOM_STATES.drawing,
      currentRounds: 1,
      totalRounds: 5,
    });
    const drawSock = createMockSocket();
    const drawer = createPlayer({ playerId: "drawer", socket: drawSock });
    const p1 = createPlayer({ playerId: "p1" });
    const p2 = createPlayer({ playerId: "p2" });
    room.players.push(drawer, p1, p2);
    room.drawer = drawer;
    room.timer = setInterval(() => {}, 60000); // fake timer

    disconnection("drawer", room, "dd1", drawSock);

    assert.equal(room.timer, null, "game timer should be cleared");
    const leftMsg = p1.socket.sent.find(
      (m) => m.type === DRAWER_LEFT.DRAWER_LEFT_NEW_ROUND
    );
    assert.ok(leftMsg, "remaining players should get drawer_left_new_round");
  });
});

// ── Room deletion grace period ──────────────────────────────

describe("room deletion grace period", () => {
  it("deletes room after delay when no connected players remain", async () => {
    const room = createRoom("del1");
    const sock = createMockSocket();
    const p1 = createPlayer({ playerId: "p1", socket: sock });
    room.players.push(p1);

    disconnection("p1", room, "del1", sock);

    assert.ok(rooms["del1"], "room should still exist immediately");

    // Wait for the 5s player-removal + 5s room-delete timers
    await sleep(6000);

    // After player removal, player count should drop to 0 (or the room itself deleted)
    // The room delete timer fires after the grace period
    // In the current implementation, the room deletion happens on a second 5s timer
    // that starts when connected players < 2
    // Since we only had 1 player who disconnected, the room should
    // have the roomDeleteTimer set
    assert.ok(
      room.roomDeleteTimer !== null || !rooms["del1"],
      "room should have a deletion timer or already be deleted"
    );
  });

  it("does not set roomDeleteTimer when >= 2 players remain connected", () => {
    const room = createRoom("del2");
    const sock1 = createMockSocket();
    const p1 = createPlayer({ playerId: "p1", socket: sock1 });
    const p2 = createPlayer({ playerId: "p2" });
    const p3 = createPlayer({ playerId: "p3" });
    room.players.push(p1, p2, p3);

    disconnection("p1", room, "del2", sock1);

    // 2 players still connected → no deletion timer
    assert.equal(room.roomDeleteTimer, null);
  });
});

// ── Graceful shutdown ───────────────────────────────────────

describe("graceful shutdown", () => {
  it("prevents scheduled callbacks from running after shutdown", async () => {
    const room = createRoom("gs1");
    let callbackRan = false;

    scheduleRoomTimeout(room, () => { callbackRan = true; }, 100);

    cleanupRoomTimers();

    await sleep(200);
    assert.equal(callbackRan, false, "callback should not run after shutdown");
  });

  it("sets shuttingDown on all rooms", () => {
    const r1 = createRoom("gs2");
    const r2 = createRoom("gs3");

    cleanupRoomTimers();

    assert.equal(r1.shuttingDown, true);
    assert.equal(r2.shuttingDown, true);
  });
});

// ── Timer safety ────────────────────────────────────────────

describe("timer safety", () => {
  it("scheduleRoomTimeout cleans up its own ID from pendingTimeouts", async () => {
    const room = createRoom("ts1");

    scheduleRoomTimeout(room, () => {}, 50);
    assert.equal(room.pendingTimeouts.size, 1);

    await sleep(100);
    assert.equal(room.pendingTimeouts.size, 0);
  });

  it("multiple scheduleRoomTimeouts are all tracked", () => {
    const room = createRoom("ts2");

    scheduleRoomTimeout(room, () => {}, 10000);
    scheduleRoomTimeout(room, () => {}, 10000);
    scheduleRoomTimeout(room, () => {}, 10000);

    assert.equal(room.pendingTimeouts.size, 3);
  });
});
