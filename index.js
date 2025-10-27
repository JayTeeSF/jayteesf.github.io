// JayTeeSF static site JS (vanilla).
// Configure your Google Form embed URL here (ends with ?embedded=true).
const CONTACT_FORM_URL = ""; // ← SET ME

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
});

// Contact Form modal
const formModal = document.getElementById("formModal");
const formFrame = document.getElementById("formFrame");
const formHelp  = document.getElementById("formHelp");
const directLink = document.getElementById("formDirectLink");
const modalDirect = document.getElementById("modalDirectLink");

function openForm() {
  if (CONTACT_FORM_URL) {
    formFrame.src = CONTACT_FORM_URL;
    formHelp.hidden = true;
    const normalUrl = CONTACT_FORM_URL.replace("?embedded=true", "");
    directLink.href = normalUrl;
    modalDirect.href = normalUrl;
  } else {
    formFrame.removeAttribute("src");
    formHelp.hidden = false;
    directLink.href = "#";
    modalDirect.href = "#";
  }
  if (typeof formModal.showModal === "function") {
    formModal.showModal();
  } else {
    CONTACT_FORM_URL && window.open(CONTACT_FORM_URL.replace("?embedded=true", ""));
  }
}
document.querySelectorAll(".contact-btn").forEach(btn => btn.addEventListener("click", openForm));
document.querySelectorAll("[data-behavior='close-modal']").forEach(btn => btn.addEventListener("click", () => formModal.close()));
