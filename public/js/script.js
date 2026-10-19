(() => {
  "use strict";

  const forms = document.querySelectorAll(".needs-validation");

  for (const form of forms) {
    form.addEventListener("submit", (event) => {
      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
      }

      // Bootstrap validation messages show
      form.classList.add("was-validated");
    });
  }
})();
