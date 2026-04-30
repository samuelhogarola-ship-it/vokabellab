(function (globalScope) {
  "use strict";

  function cloneItem(item) {
    if (!item || typeof item !== "object") return item;
    return Object.assign({}, item);
  }

  function createEmptyScore() {
    return {
      correct: 0,
      incorrect: 0,
      answered: 0
    };
  }

  function createSession(items, options) {
    var source = Array.isArray(items) ? items.map(cloneItem) : [];
    var config = options || {};
    var initialIndex = Number.isInteger(config.initialIndex) ? config.initialIndex : 0;

    return {
      items: source,
      currentIndex: source.length === 0 ? -1 : Math.max(0, Math.min(initialIndex, source.length - 1)),
      answers: [],
      score: createEmptyScore(),
      meta: Object.assign({}, config.meta || {})
    };
  }

  function getCurrentItem(session) {
    if (!session || !Array.isArray(session.items)) return null;
    if (session.currentIndex < 0 || session.currentIndex >= session.items.length) return null;
    return session.items[session.currentIndex];
  }

  function nextItem(session) {
    var current = session || createSession([]);
    if (!current.items.length) return Object.assign({}, current, { currentIndex: -1 });

    return Object.assign({}, current, {
      currentIndex: Math.min(current.currentIndex + 1, current.items.length - 1)
    });
  }

  function previousItem(session) {
    var current = session || createSession([]);
    if (!current.items.length) return Object.assign({}, current, { currentIndex: -1 });

    return Object.assign({}, current, {
      currentIndex: Math.max(current.currentIndex - 1, 0)
    });
  }

  function recordAnswer(session, answerRecord) {
    var current = session || createSession([]);
    var record = Object.assign(
      {
        index: current.currentIndex,
        item: getCurrentItem(current),
        answer: null,
        isCorrect: false,
        timestamp: Date.now()
      },
      answerRecord || {}
    );

    var nextAnswers = current.answers.concat([record]);
    var nextScore = {
      correct: current.score.correct + (record.isCorrect ? 1 : 0),
      incorrect: current.score.incorrect + (record.isCorrect ? 0 : 1),
      answered: current.score.answered + 1
    };

    return Object.assign({}, current, {
      answers: nextAnswers,
      score: nextScore
    });
  }

  function resetScore(session) {
    var current = session || createSession([]);

    return Object.assign({}, current, {
      answers: [],
      score: createEmptyScore()
    });
  }

  function getProgressPercent(session) {
    if (!session || !Array.isArray(session.items) || session.items.length === 0) return 0;
    if (session.currentIndex < 0) return 0;

    return Math.round((session.currentIndex / session.items.length) * 100);
  }

  var api = {
    createSession: createSession,
    getCurrentItem: getCurrentItem,
    nextItem: nextItem,
    previousItem: previousItem,
    recordAnswer: recordAnswer,
    resetScore: resetScore,
    getProgressPercent: getProgressPercent
  };

  globalScope.SharedPracticeCore = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
