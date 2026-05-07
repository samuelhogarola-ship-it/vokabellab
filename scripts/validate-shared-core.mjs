import assert from "node:assert/strict";

await import("../shared/answer-utils.js");
await import("../shared/practice-core.js");
await import("../shared/flashcard-core.js");

const { AnswerUtils, SharedPracticeCore, FlashcardCore } = globalThis;

assert.ok(AnswerUtils, "AnswerUtils should be attached to globalThis");
assert.ok(SharedPracticeCore, "SharedPracticeCore should be attached to globalThis");
assert.ok(FlashcardCore, "FlashcardCore should be attached to globalThis");

assert.equal(AnswerUtils.normalizeAnswer(" Árbol ß "), "arbol ss");
assert.equal(AnswerUtils.matchesAnyAcceptedAnswer("casa", "hogar / casa"), true);

const distractors = AnswerUtils.getRandomDistractors(
  [{ id: 1 }, { id: 2 }, { id: 3 }],
  { id: 2 },
  2,
  function () {
    return 0;
  }
);
assert.deepEqual(
  distractors.map(function (item) {
    return item.id;
  }),
  [3, 1]
);

let session = SharedPracticeCore.createSession([{ id: 1 }, { id: 2 }, { id: 3 }]);
assert.equal(SharedPracticeCore.getProgressPercent(session), 33);
assert.deepEqual(SharedPracticeCore.getCurrentItem(session), { id: 1 });

session = SharedPracticeCore.recordAnswer(session, { answer: "uno", isCorrect: true });
assert.deepEqual(session.score, { correct: 1, incorrect: 0, answered: 1 });

session = SharedPracticeCore.nextItem(session);
assert.equal(SharedPracticeCore.getProgressPercent(session), 67);

session = SharedPracticeCore.nextItem(session);
session = SharedPracticeCore.nextItem(session);
assert.equal(SharedPracticeCore.getProgressPercent(session), 100);
assert.equal(SharedPracticeCore.getCurrentItem(session), null);

session = SharedPracticeCore.resetScore(session);
assert.deepEqual(session.score, { correct: 0, incorrect: 0, answered: 0 });
assert.deepEqual(session.answers, []);

let flashcards = FlashcardCore.createFlashcardState([{ id: 10 }, { id: 11 }]);
flashcards = FlashcardCore.flipCard(flashcards);
assert.equal(flashcards.flipped, true);

flashcards = FlashcardCore.markKnown(flashcards);
assert.deepEqual(flashcards.knownIds, [10]);
assert.equal(flashcards.flipped, false);

flashcards = FlashcardCore.markUnknown(flashcards);
assert.deepEqual(flashcards.unknownIds, [11]);
assert.equal(flashcards.marks.length, 2);
assert.equal(flashcards.session.currentIndex, 2);

console.log("shared-ok");
