(function () {
  "use strict";
  const main = document.getElementById("product-main-image");
  const original = document.getElementById("product-image-original");
  const caption = document.getElementById("product-image-caption");
  if (!main) return;
  document.querySelectorAll("[data-product-image]").forEach(button => {
    button.addEventListener("click", () => {
      main.src = button.dataset.productImage;
      main.alt = button.dataset.imageAlt || "Product image";
      original.href = button.dataset.productImage;
      caption.textContent = main.alt;
      document.querySelectorAll("[data-product-image]").forEach(other => {
        other.classList.toggle("is-selected", other === button);
        other.setAttribute("aria-pressed", String(other === button));
      });
    });
  });
})();
