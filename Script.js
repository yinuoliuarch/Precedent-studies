const CONTENT_ROOT = "content/seek";

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderInlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/!\s(.+)/g, '<span class="critical-line">$1</span>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

function flushParagraph(lines, html) {
  if (!lines.length) return;

  html.push(`<p>${renderInlineMarkdown(lines.join("<br />"))}</p>`);
  lines.length = 0;
}

function markdownToHtml(markdown) {
  const html = [];
  const paragraph = [];
  let listOpen = false;
  let rawHtmlOpen = false;
  let rawHtmlDepth = 0;

  markdown.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();

    if (rawHtmlOpen) {
      html.push(line);
      rawHtmlDepth += (line.match(/<div\b/g) || []).length;
      rawHtmlDepth -= (line.match(/<\/div>/g) || []).length;
      if (rawHtmlDepth <= 0) rawHtmlOpen = false;
      return;
    }

    if (!trimmed) {
      flushParagraph(paragraph, html);
      if (listOpen) {
        html.push("</ol>");
        listOpen = false;
      }
      return;
    }

    if (trimmed.startsWith("<div")) {
      flushParagraph(paragraph, html);
      html.push(line);
      rawHtmlDepth = (line.match(/<div\b/g) || []).length - (line.match(/<\/div>/g) || []).length;
      rawHtmlOpen = rawHtmlDepth > 0;
      return;
    }

    const imageMatch = trimmed.match(/^!\[(.*?)\]\((\S+)(?:\s+["'](.+?)["'])?\)$/);
    if (imageMatch) {
      flushParagraph(paragraph, html);
      const alt = imageMatch[1] || "Archive image";
      const src = imageMatch[2];
      const caption = imageMatch[3] || alt;
      html.push(`
        <figure class="text-figure image-record">
          <button class="archive-thumb text-zoom" type="button" data-full="${escapeHtml(src)}" data-caption="${escapeHtml(caption)}">
            <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" />
          </button>
          <figcaption>${escapeHtml(caption)} Click image to zoom.</figcaption>
        </figure>
      `);
      return;
    }

    const labelMatch = trimmed.match(/^\[\[(.+)\]\]$/);
    if (labelMatch) {
      flushParagraph(paragraph, html);
      html.push(`<p class="module-label">${escapeHtml(labelMatch[1])}</p>`);
      return;
    }

    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph(paragraph, html);
      const level = headingMatch[1].length + 1;
      html.push(`<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`);
      return;
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      flushParagraph(paragraph, html);
      if (!listOpen) {
        html.push("<ol>");
        listOpen = true;
      }
      html.push(`<li>${renderInlineMarkdown(orderedMatch[1])}</li>`);
      return;
    }

    if (trimmed.startsWith("Fig.")) {
      flushParagraph(paragraph, html);
      html.push(`<p class="figure-caption">${renderInlineMarkdown(trimmed)}</p>`);
      return;
    }

    paragraph.push(trimmed);
  });

  flushParagraph(paragraph, html);
  if (listOpen) html.push("</ol>");

  return html.join("\n");
}

async function loadMarkdownContent() {
  const targets = document.querySelectorAll("[data-markdown]");

  await Promise.all(
    [...targets].map(async (target) => {
      const filename = target.dataset.markdown || target.id;
      const response = await fetch(`${CONTENT_ROOT}/${filename}.md`);

      if (!response.ok) {
        throw new Error(`Could not load ${filename}.md`);
      }

      const markdown = await response.text();
      const contentTarget = target.classList.contains("markdown-content")
        ? target
        : target.querySelector(".markdown-content");

      if (!contentTarget) return;

      contentTarget.innerHTML = markdownToHtml(markdown);
      contentTarget.classList.remove("is-loading");
    })
  );
}

function initSectionNavigation() {
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
}

function initLightbox() {
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
}

loadMarkdownContent()
  .then(() => {
    initSectionNavigation();
    initLightbox();
  })
  .catch((error) => {
    console.error(error);
    document.querySelectorAll(".is-loading").forEach((target) => {
      target.textContent = "Content unavailable.";
    });
  });

