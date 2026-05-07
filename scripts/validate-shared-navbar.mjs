import assert from "node:assert/strict";

await import("../shared/navbar.js");

const { SharedNavbar } = globalThis;

assert.ok(SharedNavbar, "SharedNavbar should be attached to globalThis");

const vokabelMarkup = SharedNavbar.createNavbarMarkup({
  variant: "vokabellab",
  activeApp: "vokabellab"
});

assert.match(vokabelMarkup, /shared-navbar--vokabellab/);
assert.match(vokabelMarkup, /Vokabel Lab/);
assert.match(vokabelMarkup, /nav-active/);

const imKontextMarkup = SharedNavbar.createNavbarMarkup({
  variant: "imkontext",
  activeApp: "imkontext"
});

assert.match(imKontextMarkup, /shared-navbar--imkontext/);
assert.match(imKontextMarkup, /imKontext/);
assert.match(imKontextMarkup, /shared-navbar-logo-im/);

const derDieDasMarkup = SharedNavbar.createNavbarMarkup({
  variant: "vokabellab",
  activeApp: "derdiedas"
});

assert.match(derDieDasMarkup, /der die das/);
assert.match(derDieDasMarkup, /data-navbar-active-link="derdiedas"/);

assert.equal(
  SharedNavbar.getDashboardMessage("hola@example.com"),
  "El dashboard estará disponible próximamente. Si lo necesitas antes o quieres avisarnos de algo, escríbenos a hola@example.com."
);

console.log("shared-navbar-ok");
