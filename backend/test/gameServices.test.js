/**
 * Tests for core game logic in src/services/gameServices.js
 *
 * Covers: round start, drawer selection, stroke handling, guess scoring,
 * duplicate guesses, drawer self-guess prevention, round/game transitions,
 * state resets between rounds.
 */

import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { WebSocket } from "ws";
import { rooms } from "../src/store/roomStore.js";
import { ROOM_STATES, STROKE_EVENTS, GUESS_EVENTS } from "../src/config/constants.js";
import {
  startRound,
  handleStrokes,
  checkGuess,
  checkWord,
  cleanupRoomTimers,
  scheduleRoomTimeout,
} from "../src/services/gameServices.js";
import {
  createRoom,
  createPlayer,
  createMockSocket,
  clearAllRooms,
} from "./helpers.js";

afterEach(() => {
  clearAllRooms();
});

// ── startRound ──────────────────────────────────────────────

describe("startRound", () => {
  it("starts a round and picks a drawer when >= 2 connected players", () => {
    const room = createRoom("r1");
    const p1 = createPlayer();
    const p2 = createPlayer();
    room.players.push(p1, p2);

    startRound(room);

    assert.equal(room.currentRounds, 1);
    assert.ok(room.drawer, "should have a drawer");
    assert.ok(
      [p1.playerId, p2.playerId].includes(room.drawer.playerId),
      "drawer should be one of the players"
    );
    assert.equal(room.state, ROOM_STATES.choosing_words);
  });

  it("does not start with only 1 connected player", () => {
    const room = createRoom("r2");
    const p1 = createPlayer();
    room.players.push(p1);

    startRound(room);

    assert.equal(room.currentRounds, 0);
    assert.equal(room.state, ROOM_STATES.waiting);
  });

  it("resets hasGuessed and lastStrokeId for all players", () => {
    const room = createRoom("r3");
    const p1 = createPlayer({ hasGuessed: true, lastStrokeId: 5 });
    const p2 = createPlayer({ hasGuessed: true, lastStrokeId: 10 });
    room.players.push(p1, p2);

    startRound(room);

    assert.equal(p1.hasGuessed, false);
    assert.equal(p1.lastStrokeId, 0);
    assert.equal(p2.hasGuessed, false);
    assert.equal(p2.lastStrokeId, 0);
  });

  it("clears strokes when starting a new round", () => {
    const room = createRoom("r4");
    room.strokes = [{ strokeId: 1 }, { strokeId: 2 }];
    const p1 = createPlayer();
    const p2 = createPlayer();
    room.players.push(p1, p2);

    startRound(room);

    assert.equal(room.strokes.length, 0);
  });

  it("sends candidate words to the drawer", () => {
    const room = createRoom("r5");
    const p1 = createPlayer();
    const p2 = createPlayer();
    room.players.push(p1, p2);

    startRound(room);

    const drawerSock = room.drawer.socket;
    const wordMsg = drawerSock.sent.find((m) => m.type === "word_choice");
    assert.ok(wordMsg, "drawer should receive word_choice message");
    assert.equal(wordMsg.words.length, 3, "should offer 3 candidate words");
  });

  it("ends the game when currentRounds >= totalRounds", () => {
    const room = createRoom("r6", { totalRounds: 2, currentRounds: 2 });
    const p1 = createPlayer();
    const p2 = createPlayer();
    room.players.push(p1, p2);

    startRound(room);

    assert.equal(room.state, ROOM_STATES.game_over);
  });

  it("picks a different drawer on the second round", () => {
    const room = createRoom("r7");
    const p1 = createPlayer();
    const p2 = createPlayer();
    room.players.push(p1, p2);

    startRound(room);
    const firstDrawerId = room.drawer.playerId;

    // Simulate choosing a word and ending the round
    room.state = ROOM_STATES.starting_new_round;
    room.currentRounds = 1; // already incremented by first startRound

    startRound(room);

    const secondDrawerId = room.drawer.playerId;
    assert.notEqual(firstDrawerId, secondDrawerId, "should rotate drawers");
  });
});

// ── handleStrokes ───────────────────────────────────────────

describe("handleStrokes", () => {
  it("broadcasts stroke to non-drawer players", () => {
    const room = createRoom("s1", { state: ROOM_STATES.drawing });
    const drawer = createPlayer({ playerId: "drawer1" });
    const guesser = createPlayer({ playerId: "guesser1" });
    room.players.push(drawer, guesser);
    room.drawer = drawer;

    const strokeMsg = {
      type: STROKE_EVENTS.POINT,
      strokeId: 1,
      x: 100,
      y: 200,
      newStroke: true,
    };

    handleStrokes(room, "drawer1", "drawer1", strokeMsg);

    assert.equal(room.strokes.length, 1);
    // guesser should have received the stroke
    const received = guesser.socket.sent.find(
      (m) => m.type === STROKE_EVENTS.POINT
    );
    assert.ok(received, "guesser should receive stroke");
    assert.equal(guesser.socket.sent.filter(m => m.strokeId === 1).length, 1);
    // drawer should NOT receive their own stroke back
    const drawerReceived = drawer.socket.sent.find(
      (m) => m.type === STROKE_EVENTS.POINT
    );
    assert.equal(drawerReceived, undefined, "drawer should not get own stroke");
  });

  it("rejects strokes from non-drawer players", () => {
    const room = createRoom("s2", { state: ROOM_STATES.drawing });
    const drawer = createPlayer({ playerId: "drawer1" });
    const guesser = createPlayer({ playerId: "guesser1" });
    room.players.push(drawer, guesser);
    room.drawer = drawer;

    const strokeMsg = {
      type: STROKE_EVENTS.POINT,
      strokeId: 1,
      x: 100,
      y: 200,
      newStroke: true,
    };

    handleStrokes(room, "guesser1", "drawer1", strokeMsg);

    assert.equal(room.strokes.length, 0, "no stroke should be stored");
  });

  it("rejects strokes when room is not in DRAWING state", () => {
    const room = createRoom("s3", { state: ROOM_STATES.waiting });
    const drawer = createPlayer({ playerId: "drawer1" });
    room.players.push(drawer);
    room.drawer = drawer;

    const strokeMsg = {
      type: STROKE_EVENTS.POINT,
      strokeId: 1,
      x: 100,
      y: 200,
      newStroke: true,
    };

    handleStrokes(room, "drawer1", "drawer1", strokeMsg);

    assert.equal(room.strokes.length, 0);
  });
});

// ── checkGuess ──────────────────────────────────────────────

describe("checkGuess", () => {
  function setupGuessRoom(roomId) {
    const room = createRoom(roomId, {
      state: ROOM_STATES.drawing,
      word: "capybara",
      time: 45,
      totalRounds: 5,
      currentRounds: 1,
    });
    const drawer = createPlayer({ playerId: "drawer" });
    const p1 = createPlayer({ playerId: "p1" });
    const p2 = createPlayer({ playerId: "p2" });
    room.players.push(drawer, p1, p2);
    room.drawer = drawer;
    return { room, drawer, p1, p2 };
  }

  it("correct guess awards points equal to remaining time", () => {
    const { room, p1 } = setupGuessRoom("g1");
    const msg = { type: GUESS_EVENTS.GUESS, text: "Capybara" };

    checkGuess(null, room, "p1", "drawer", msg);

    assert.equal(p1.score, 45, "score should equal room.time");
    assert.equal(p1.hasGuessed, true);
  });

  it("broadcasts correct_guess to all players", () => {
    const { room, drawer, p1, p2 } = setupGuessRoom("g2");
    const msg = { type: GUESS_EVENTS.GUESS, text: "capybara" };

    checkGuess(null, room, "p1", "drawer", msg);

    const drawerGot = drawer.socket.sent.find((m) => m.type === "correct_guess");
    const p2Got = p2.socket.sent.find((m) => m.type === "correct_guess");
    assert.ok(drawerGot, "drawer sees correct_guess");
    assert.ok(p2Got, "other guesser sees correct_guess");
  });

  it("duplicate guess does not award points again", () => {
    const { room, p1 } = setupGuessRoom("g3");
    const msg = { type: GUESS_EVENTS.GUESS, text: "capybara" };

    checkGuess(null, room, "p1", "drawer", msg);
    const scoreAfterFirst = p1.score;

    checkGuess(null, room, "p1", "drawer", msg);
    assert.equal(p1.score, scoreAfterFirst, "score unchanged on duplicate");
  });

  it("drawer cannot guess their own word", () => {
    const { room, drawer } = setupGuessRoom("g4");
    const msg = { type: GUESS_EVENTS.GUESS, text: "capybara" };

    checkGuess(null, room, "drawer", "drawer", msg);

    assert.equal(drawer.score, 0, "drawer should not score");
    assert.equal(drawer.hasGuessed, false);
  });

  it("wrong guess is broadcast as chat", () => {
    const { room, p1, p2 } = setupGuessRoom("g5");
    const msg = { type: GUESS_EVENTS.GUESS, text: "zebra" };

    checkGuess(null, room, "p1", "drawer", msg);

    assert.equal(p1.score, 0);
    const chatMsg = p2.socket.sent.find((m) => m.type === "chat");
    assert.ok(chatMsg, "wrong guess should be broadcast as chat");
    assert.equal(chatMsg.text, "zebra");
  });

  it("rejects guesses when room state is not DRAWING", () => {
    const { room, p1 } = setupGuessRoom("g6");
    room.state = ROOM_STATES.round_ended;
    const msg = { type: GUESS_EVENTS.GUESS, text: "capybara" };

    checkGuess(null, room, "p1", "drawer", msg);

    assert.equal(p1.score, 0);
  });

  it("round ends when all guessers guess correctly", () => {
    const { room, p1, p2 } = setupGuessRoom("g7");

    // p1 guesses correctly
    checkGuess(null, room, "p1", "drawer", {
      type: GUESS_EVENTS.GUESS,
      text: "capybara",
    });

    // p2 guesses correctly – this should trigger round end
    checkGuess(null, room, "p2", "drawer", {
      type: GUESS_EVENTS.GUESS,
      text: "capybara",
    });

    assert.equal(room.state, ROOM_STATES.round_ended);
  });

  it("guess with empty text is rejected", () => {
    const { room, p1 } = setupGuessRoom("g8");
    const msg = { type: GUESS_EVENTS.GUESS, text: "" };

    // The message won't even get to checkGuess normally (validator catches it),
    // but checkGuess also guards against !message.text
    checkGuess(null, room, "p1", "drawer", msg);

    assert.equal(p1.score, 0);
  });
});

// ── checkWord ───────────────────────────────────────────────

describe("checkWord", () => {
  it("sets room.word and transitions to DRAWING state", () => {
    const room = createRoom("w1", {
      state: ROOM_STATES.choosing_words,
      candidateArray: [
        { wordId: 0, word: "Capybara" },
        { wordId: 1, word: "Axolotl" },
        { wordId: 2, word: "Pangolin" },
      ],
    });
    const drawer = createPlayer({ playerId: "d1" });
    const guesser = createPlayer({ playerId: "g1" });
    room.players.push(drawer, guesser);
    room.drawer = drawer;

    checkWord(room, "d1", drawer, { wordId: 1 });

    assert.equal(room.word, "axolotl");
    assert.equal(room.state, ROOM_STATES.drawing);
    // Timer should have started
    assert.ok(room.timer !== null, "timer should be set");
    // Clean up the interval
    clearInterval(room.timer);
    room.timer = null;
  });

  it("rejects word choice from non-drawer", () => {
    const room = createRoom("w2", {
      state: ROOM_STATES.choosing_words,
      candidateArray: [{ wordId: 0, word: "Capybara" }],
    });
    const drawer = createPlayer({ playerId: "d1" });
    const guesser = createPlayer({ playerId: "g1" });
    room.players.push(drawer, guesser);
    room.drawer = drawer;

    checkWord(room, "g1", drawer, { wordId: 0 });

    assert.equal(room.word, null, "word should not be set by non-drawer");
  });

  it("rejects invalid wordId", () => {
    const room = createRoom("w3", {
      state: ROOM_STATES.choosing_words,
      candidateArray: [
        { wordId: 0, word: "Capybara" },
        { wordId: 1, word: "Axolotl" },
      ],
    });
    const drawer = createPlayer({ playerId: "d1" });
    room.players.push(drawer);
    room.drawer = drawer;

    checkWord(room, "d1", drawer, { wordId: 99 });

    assert.equal(room.word, null);
  });
});

// ── scheduleRoomTimeout ─────────────────────────────────────

describe("scheduleRoomTimeout", () => {
  it("runs callback after delay", async () => {
    const room = createRoom("t1");
    let called = false;

    scheduleRoomTimeout(room, () => { called = true; }, 50);

    await new Promise((r) => setTimeout(r, 100));
    assert.equal(called, true);
  });

  it("does not run callback when room.shuttingDown is true", async () => {
    const room = createRoom("t2");
    room.shuttingDown = true;
    let called = false;

    scheduleRoomTimeout(room, () => { called = true; }, 50);

    await new Promise((r) => setTimeout(r, 100));
    assert.equal(called, false);
  });

  it("removes its timeoutId from pendingTimeouts after firing", async () => {
    const room = createRoom("t3");

    scheduleRoomTimeout(room, () => {}, 50);

    assert.equal(room.pendingTimeouts.size, 1);
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(room.pendingTimeouts.size, 0);
  });
});

// ── cleanupRoomTimers ───────────────────────────────────────

describe("cleanupRoomTimers", () => {
  it("clears all timers and sets shuttingDown on every room", () => {
    const room1 = createRoom("c1");
    const room2 = createRoom("c2");

    room1.timer = setInterval(() => {}, 60000);
    room2.roomDeleteTimer = setTimeout(() => {}, 60000);
    scheduleRoomTimeout(room1, () => {}, 60000);

    cleanupRoomTimers();

    assert.equal(room1.timer, null);
    assert.equal(room2.roomDeleteTimer, null);
    assert.equal(room1.shuttingDown, true);
    assert.equal(room2.shuttingDown, true);
    assert.equal(room1.pendingTimeouts.size, 0);
  });
});
