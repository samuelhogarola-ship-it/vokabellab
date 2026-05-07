(function (globalScope) {
  "use strict";

  var DEFAULT_SUPPORT_EMAIL = "vokabellab@pm.me";

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getBaseLinks() {
    return [
      {
        key: "samuel",
        label: "Samuel Coach de alemán",
        href: "https://www.samuelcoachdealeman.com/",
        external: true
      },
      {
        key: "vokabellab",
        label: "Vokabel Lab",
        href: "https://www.vokabellab.com/"
      },
      {
        key: "derdiedas",
        label: "der die das",
        href: "https://derdiedas.vokabellab.com/",
        external: true
      },
      {
        key: "imkontext",
        label: "imKontext",
        href: "https://www.imkontext.vokabellab.com/"
      }
    ];
  }

  function getVariantConfig(options) {
    var variant = options && options.variant === "imkontext" ? "imkontext" : "vokabellab";
    var activeApp = options && options.activeApp ? options.activeApp : variant;
    var supportEmail = options && options.supportEmail ? options.supportEmail : DEFAULT_SUPPORT_EMAIL;

    if (variant === "imkontext") {
      return {
        variant: variant,
        activeApp: activeApp,
        supportEmail: supportEmail,
        homeHref: options && options.homeHref ? options.homeHref : "#",
        logoSrc: options && options.logoSrc ? options.logoSrc : "./logo.png?v=3",
        logoAlt: options && options.logoAlt ? options.logoAlt : "Logo de imKontext",
        logoLabelHtml: '<span><span class="shared-navbar-logo-im">im</span> Kontext</span>',
        logoAriaLabel: options && options.logoAriaLabel ? options.logoAriaLabel : "Ir a imKontext",
        activeHref: options && options.activeHref ? options.activeHref : "#",
        dashboardLabel: "Dashboard",
        dashboardSuffix: "próximamente"
      };
    }

    return {
      variant: variant,
      activeApp: activeApp,
      supportEmail: supportEmail,
      homeHref: options && options.homeHref ? options.homeHref : "https://www.vokabellab.com/",
      logoSrc: options && options.logoSrc ? options.logoSrc : "./logo-small.webp",
      logoAlt: options && options.logoAlt ? options.logoAlt : "Logo de Vokabel Lab",
      logoLabelHtml: "<span>Vokabel Lab</span>",
      logoAriaLabel: options && options.logoAriaLabel ? options.logoAriaLabel : "Ir a Vokabel Lab",
      activeHref: options && options.activeHref ? options.activeHref : "https://www.vokabellab.com/",
      dashboardLabel: "Dashboard",
      dashboardSuffix: "Coming soon"
    };
  }

  function renderLink(item, config) {
    var isActive = item.key === config.activeApp;
    var href = isActive ? config.activeHref : item.href;
    var rel = item.external ? ' rel="noreferrer"' : "";
    var target = item.external ? ' target="_blank"' : "";
    var activeClass = isActive ? " nav-active" : "";
    var activeAttr = isActive ? ' data-navbar-active-link="' + escapeHtml(item.key) + '"' : "";

    return (
      '<a href="' + escapeHtml(href) + '" class="shared-navbar-link' + activeClass + '"' +
      activeAttr +
      target +
      rel +
      ">" +
      escapeHtml(item.label) +
      "</a>"
    );
  }

  function createNavbarMarkup(options) {
    var config = getVariantConfig(options || {});
    var links = getBaseLinks();
    var renderedLinks = [];

    for (var index = 0; index < links.length; index += 1) {
      renderedLinks.push(renderLink(links[index], config));
      if (index < links.length - 1) {
        renderedLinks.push('<span class="shared-navbar-sep">|</span>');
      }
    }

    renderedLinks.push('<span class="shared-navbar-sep">|</span>');
    renderedLinks.push(
      '<button type="button" class="shared-navbar-dashboard" data-navbar-dashboard aria-disabled="true">' +
        escapeHtml(config.dashboardLabel) +
      "</button>"
    );

    return (
      '<header class="shared-navbar shared-navbar--' + escapeHtml(config.variant) + '" data-navbar-variant="' + escapeHtml(config.variant) + '">' +
        '<nav class="shared-navbar-shell" aria-label="Navegación principal">' +
          '<div class="shared-navbar-inner">' +
            '<a class="shared-navbar-logo" href="' + escapeHtml(config.homeHref) + '" data-navbar-home aria-label="' + escapeHtml(config.logoAriaLabel) + '">' +
              '<img src="' + escapeHtml(config.logoSrc) + '" alt="' + escapeHtml(config.logoAlt) + '">' +
              config.logoLabelHtml +
            "</a>" +
            '<div class="shared-navbar-links">' +
              renderedLinks.join("") +
            "</div>" +
          "</div>" +
        "</nav>" +
      "</header>"
    );
  }

  function getDashboardMessage(supportEmail) {
    return "El dashboard estará disponible próximamente. Si lo necesitas antes o quieres avisarnos de algo, escríbenos a " + supportEmail + ".";
  }

  function bindNavbarEvents(root, options) {
    var config = getVariantConfig(options || {});
    var homeTargets = root.querySelectorAll("[data-navbar-home], [data-navbar-active-link='" + config.activeApp + "']");

    if (typeof options.onHomeClick === "function") {
      homeTargets.forEach(function (node) {
        node.addEventListener("click", function (event) {
          event.preventDefault();
          options.onHomeClick(event);
        });
      });
    }

    var dashboardButton = root.querySelector("[data-navbar-dashboard]");
    if (!dashboardButton) return;

    dashboardButton.addEventListener("click", function (event) {
      event.preventDefault();

      if (typeof options.onDashboardClick === "function") {
        options.onDashboardClick(event);
        return;
      }

      if (typeof globalScope.alert === "function") {
        globalScope.alert(getDashboardMessage(config.supportEmail));
      }
    });
  }

  function mountNavbar(target, options) {
    if (!globalScope.document) return null;

    var root = typeof target === "string"
      ? globalScope.document.querySelector(target)
      : target;

    if (!root) return null;

    root.innerHTML = createNavbarMarkup(options || {});
    bindNavbarEvents(root, options || {});
    return root.firstElementChild;
  }

  var api = {
    createNavbarMarkup: createNavbarMarkup,
    mountNavbar: mountNavbar,
    getDashboardMessage: getDashboardMessage
  };

  globalScope.SharedNavbar = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
