if (document.readyState === "complete") {
  lazyload();
} else {
  document.addEventListener("readystatechange", function () {
    if (document.readyState === "complete") {
      lazyload();
    }
  });
}

function lazyload() {
  const targets = document.querySelectorAll(
    "[data-lazy-srcset], [data-lazy-src]",
  );
  targets.forEach((el) => {
    function callback(entries, observer) {
      entries.forEach((entry) => {
        const src = entry.target.getAttribute("data-lazy-src");
        const srcset = entry.target.getAttribute("data-lazy-srcset");
        if (entry.isIntersecting) {
          if (src) {
            el.setAttribute("src", src);
            el.removeAttribute("data-lazy-src");
          }
          if (srcset) {
            el.setAttribute("srcset", srcset);
            el.removeAttribute("data-lazy-srcset");
          }
          observer.unobserve(entry.target);
        }
      });
    }

    const observer = new IntersectionObserver(callback, {
      rootMargin: "1000px",
      threshold: 0,
    });

    observer.observe(el);
  });
}
