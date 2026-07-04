const sectionLinks = document.querySelectorAll(".section-nav a");
const textArchive = document.querySelector(".text-archive");
const sections = [...sectionLinks]
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      sectionLinks.forEach((link) => {
        link.classList.toggle("is-active", link.getAttribute("href") === `#${entry.target.id}`);
      });
    });
  },
  { root: textArchive, rootMargin: "-28% 0px -62% 0px", threshold: 0 }
);

sections.forEach((section) => observer.observe(section));

sectionLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    const target = document.querySelector(link.getAttribute("href"));
    if (!target || !textArchive) return;

    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", link.getAttribute("href"));
  });
});

const lightbox = document.querySelector(".lightbox");
const lightboxImage = document.querySelector(".lightbox-image");
const lightboxCaption = document.querySelector(".lightbox-caption");
const lightboxBackdrop = document.querySelector(".lightbox-backdrop");
const archiveThumbs = document.querySelectorAll(".archive-thumb");

function closeLightbox() {
  if (!lightbox || !lightboxImage || !lightboxCaption) return;

  lightbox.classList.remove("is-open");
  lightbox.setAttribute("aria-hidden", "true");
  lightboxImage.removeAttribute("src");
  lightboxImage.removeAttribute("alt");
  lightboxCaption.textContent = "";
}

archiveThumbs.forEach((thumb) => {
  thumb.addEventListener("click", () => {
    if (!lightbox || !lightboxImage || !lightboxCaption) return;

    const image = thumb.querySelector("img");
    const caption = thumb.dataset.caption || "";

    lightboxImage.src = thumb.dataset.full;
    lightboxImage.alt = image?.alt || caption;
    lightboxCaption.textContent = caption;
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
  });
});

lightboxBackdrop?.addEventListener("click", closeLightbox);
lightbox?.addEventListener("click", (event) => {
  if (!event.target.closest(".lightbox-figure")) {
    closeLightbox();
  }
});
