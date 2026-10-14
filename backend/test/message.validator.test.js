/**
 * Tests for src/services/message.validator.js
 *
 * Covers: valid messages, missing fields, invalid types,
 * unknown message types, boundary values.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validator } from "../src/services/message.validator.js";
import { STROKE_EVENTS, GUESS_EVENTS, CHOOSE_WORD } from "../src/config/constants.js";

// ── Top-level structural validation ─────────────────────────

describe("validator – structural checks", () => {
  it("rejects null", () => {
    const r = validator(null);
    assert.equal(r.valid, false);
  });

  it("rejects undefined", () => {
    const r = validator(undefined);
    assert.equal(r.valid, false);
  });

  it("rejects a string", () => {
    const r = validator("hello");
    assert.equal(r.valid, false);
  });

  it("rejects an array", () => {
    const r = validator([1, 2, 3]);
    assert.equal(r.valid, false);
  });

  it("rejects an object with no type field", () => {
    const r = validator({ x: 1 });
    assert.equal(r.valid, false);
  });

  it("rejects an object with numeric type", () => {
    const r = validator({ type: 42 });
    assert.equal(r.valid, false);
  });

  it("rejects unknown message type", () => {
    const r = validator({ type: "fireworks" });
    assert.equal(r.valid, false);
    assert.match(r.reason, /unknown/i);
  });
});

// ── Stroke validation ───────────────────────────────────────

describe("validator – stroke_point", () => {
  const base = {
    type: STROKE_EVENTS.POINT,
    strokeId: 1,
    x: 100,
    y: 200,
    newStroke: true,
  };

  it("accepts a valid stroke", () => {
    assert.equal(validator(base).valid, true);
  });

  it("rejects missing strokeId", () => {
    const { strokeId, ...rest } = base;
    assert.equal(validator(rest).valid, false);
  });

  it("rejects non-integer strokeId", () => {
    assert.equal(validator({ ...base, strokeId: 1.5 }).valid, false);
  });

  it("rejects missing x", () => {
    const { x, ...rest } = base;
    assert.equal(validator(rest).valid, false);
  });

  it("rejects NaN x", () => {
    assert.equal(validator({ ...base, x: NaN }).valid, false);
  });

  it("rejects Infinity y", () => {
    assert.equal(validator({ ...base, y: Infinity }).valid, false);
  });

  it("rejects x out of canvas (negative)", () => {
    assert.equal(validator({ ...base, x: -1 }).valid, false);
  });

  it("rejects x out of canvas (>800)", () => {
    assert.equal(validator({ ...base, x: 801 }).valid, false);
  });

  it("rejects y out of canvas (negative)", () => {
    assert.equal(validator({ ...base, y: -1 }).valid, false);
  });

  it("rejects y out of canvas (>600)", () => {
    assert.equal(validator({ ...base, y: 601 }).valid, false);
  });

  it("accepts boundary x=0, y=0", () => {
    assert.equal(validator({ ...base, x: 0, y: 0 }).valid, true);
  });

  it("accepts boundary x=800, y=600", () => {
    assert.equal(validator({ ...base, x: 800, y: 600 }).valid, true);
  });

  it("rejects non-boolean newStroke", () => {
    assert.equal(validator({ ...base, newStroke: "yes" }).valid, false);
  });
});

// ── Guess validation ────────────────────────────────────────

describe("validator – guess", () => {
  const base = { type: GUESS_EVENTS.GUESS, text: "cat" };

  it("accepts a valid guess", () => {
    assert.equal(validator(base).valid, true);
  });

  it("rejects missing text", () => {
    assert.equal(validator({ type: GUESS_EVENTS.GUESS }).valid, false);
  });

  it("rejects numeric text", () => {
    assert.equal(validator({ type: GUESS_EVENTS.GUESS, text: 42 }).valid, false);
  });

  it("rejects empty string", () => {
    assert.equal(validator({ type: GUESS_EVENTS.GUESS, text: "   " }).valid, false);
  });

  it("rejects overly long text (>14 chars)", () => {
    assert.equal(
      validator({ type: GUESS_EVENTS.GUESS, text: "a".repeat(15) }).valid,
      false
    );
  });

  it("accepts text at max length (14 chars)", () => {
    assert.equal(
      validator({ type: GUESS_EVENTS.GUESS, text: "a".repeat(14) }).valid,
      true
    );
  });
});

// ── Word choice validation ──────────────────────────────────

describe("validator – choose_word", () => {
  it("accepts a valid word choice", () => {
    const r = validator({ type: CHOOSE_WORD.WORD, wordId: 3 });
    assert.equal(r.valid, true);
  });

  it("rejects missing wordId", () => {
    const r = validator({ type: CHOOSE_WORD.WORD });
    assert.equal(r.valid, false);
  });

  it("rejects non-integer wordId", () => {
    const r = validator({ type: CHOOSE_WORD.WORD, wordId: "three" });
    assert.equal(r.valid, false);
  });

  it("rejects float wordId", () => {
    const r = validator({ type: CHOOSE_WORD.WORD, wordId: 2.5 });
    assert.equal(r.valid, false);
  });
});
