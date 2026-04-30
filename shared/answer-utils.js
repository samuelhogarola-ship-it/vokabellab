(function (globalScope) {
  "use strict";

  function toArray(value) {
    if (Array.isArray(value)) return value.slice();
    if (value === undefined || value === null) return [];
    return [value];
  }

  function stripDiacritics(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function normalizeAnswer(value) {
    return stripDiacritics(value)
      .toLowerCase()
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9\s/|-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isExactMatch(expected, actual) {
    return normalizeAnswer(expected) === normalizeAnswer(actual);
  }

  function expandAcceptedAnswers(acceptedAnswers) {
    return toArray(acceptedAnswers)
      .flatMap(function (entry) {
        return String(entry)
          .split(/[|/]/)
          .map(function (part) {
            return part.trim();
          })
          .filter(Boolean);
      });
  }

  function matchesAnyAcceptedAnswer(actual, acceptedAnswers) {
    if (!expandAcceptedAnswers(acceptedAnswers).length) return false;

    return expandAcceptedAnswers(acceptedAnswers).some(function (expected) {
      return isExactMatch(expected, actual);
    });
  }

  function shuffle(items, randomFn) {
    var source = Array.isArray(items) ? items.slice() : [];
    var rng = typeof randomFn === "function" ? randomFn : Math.random;

    for (var index = source.length - 1; index > 0; index -= 1) {
      var swapIndex = Math.floor(rng() * (index + 1));
      var current = source[index];
      source[index] = source[swapIndex];
      source[swapIndex] = current;
    }

    return source;
  }

  function getItemId(item) {
    if (!item || typeof item !== "object") return item;
    if (item.id !== undefined && item.id !== null) return item.id;
    if (item.value !== undefined && item.value !== null) return item.value;
    return JSON.stringify(item);
  }

  function getRandomDistractors(items, currentItem, count, randomFn) {
    var pool = Array.isArray(items) ? items : [];
    var limit = Number(count) > 0 ? Number(count) : 0;
    var currentId = getItemId(currentItem);

    return shuffle(
      pool.filter(function (candidate) {
        return getItemId(candidate) !== currentId;
      }),
      randomFn
    ).slice(0, limit);
  }

  var api = {
    shuffle: shuffle,
    normalizeAnswer: normalizeAnswer,
    isExactMatch: isExactMatch,
    matchesAnyAcceptedAnswer: matchesAnyAcceptedAnswer,
    getRandomDistractors: getRandomDistractors
  };

  globalScope.AnswerUtils = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
