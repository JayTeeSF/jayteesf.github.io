// JayTeeSF static site JS (vanilla).
// Configure your Google Form embed URL here (ends with ?embedded=true).
const CONTACT_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLScRu_kpO2Ct67NqlG_cVH_VlmOg0HEi1HBkJZb7XMQc41-0BQ/viewform?embedded=true"; // ← SET ME

const root = document.documentElement;
const themeKey = "jayteesf-theme";

// Theme toggle: respects system preference, stores explicit choices.
function setTheme(mode) {
  if (mode === "dark") {
    root.setAttribute("data-theme", "dark");
    localStorage.setItem(themeKey, "dark");
  } else if (mode === "light") {
    root.setAttribute("data-theme", "light");
    localStorage.setItem(themeKey, "light");
  } else {
    root.removeAttribute("data-theme");
    localStorage.removeItem(themeKey);
  }
}
const stored = localStorage.getItem(themeKey);
if (stored) setTheme(stored);

document.getElementById("themeToggle").addEventListener("click", () => {
  const current = root.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  setTheme(current === "dark" ? "light" : "dark");
});

// Mobile nav
const nav = document.getElementById("site-nav");
const menuBtn = document.getElementById("menuBtn");
menuBtn.addEventListener("click", () => {
  const expanded = nav.getAttribute("aria-expanded") === "true";
  nav.setAttribute("aria-expanded", String(!expanded));
  menuBtn.setAttribute("aria-expanded", String(!expanded));
  updateAnchorOffset(); // header height may change when menu opens/closes
});

// --- Anchor offset: measure sticky header and expose as CSS var ---
function updateAnchorOffset() {
  const header = document.querySelector(".site-header");
  const h = header ? Math.ceil(header.getBoundingClientRect().height) : 0;
  // small extra breathing room
  document.documentElement.style.setProperty("--anchor-offset", `${h + 8}px`);
}
window.addEventListener("load", () => {
  updateAnchorOffset();

  // If landing with a hash in the URL, re-scroll so the offset applies
  if (location.hash) {
    const target = document.querySelector(location.hash);
    if (target) {
      requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }
});
window.addEventListener("resize", updateAnchorOffset);

// Collapse mobile nav helper
function closeMenu() {
  nav.setAttribute("aria-expanded", "false");
  menuBtn.setAttribute("aria-expanded", "false");
  updateAnchorOffset();
}

// Intercept in-page hash links: close menu first, then scroll with offset
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener("click", (e) => {
    const hash = a.getAttribute("href");
    if (!hash || hash === "#") return;

    const target = document.querySelector(hash);
    if (!target) return;

    if (nav.getAttribute("aria-expanded") === "true") {
      e.preventDefault();
      closeMenu();
      // After layout settles, perform the scroll and update URL
      requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        history.pushState(null, "", hash);
      });
    }
    // else: let native navigation happen; CSS offset still applies
  });
});

// Also handle manual hash changes (e.g., back/forward)
window.addEventListener("hashchange", () => {
  const target = document.querySelector(location.hash);
  if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
});

// Contact Form modal
const formModal   = document.getElementById("formModal");
const formFrame   = document.getElementById("formFrame");
const formHelp    = document.getElementById("formHelp");
const formDirect  = document.getElementById("formDirectLink");   // may not exist in HTML
const modalDirect = document.getElementById("modalDirectLink");

function openForm() {
  if (CONTACT_FORM_URL) {
    formFrame.src = CONTACT_FORM_URL;
    formHelp.hidden = true;
    const normalUrl = CONTACT_FORM_URL.replace("?embedded=true", "");
    if (formDirect)  formDirect.href  = normalUrl;
    if (modalDirect) modalDirect.href = normalUrl;
  } else {
    formFrame.removeAttribute("src");
    formHelp.hidden = false;
    if (formDirect)  formDirect.href  = "#";
    if (modalDirect) modalDirect.href = "#";
  }
  if (typeof formModal.showModal === "function") {
    formModal.showModal();
  } else {
    CONTACT_FORM_URL && window.open(CONTACT_FORM_URL.replace("?embedded=true", ""));
  }
}
document.querySelectorAll(".contact-btn").forEach(btn => btn.addEventListener("click", openForm));
document.querySelectorAll("[data-behavior='close-modal']").forEach(btn => btn.addEventListener("click", () => formModal.close()));
