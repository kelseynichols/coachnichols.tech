/* Contact form handler for static hosting.
   Webflow's bundled JS tries to submit forms to Webflow's servers, which don't
   exist on GitHub Pages. This intercepts that, sends the data to FormSubmit via
   AJAX, and reuses the page's existing Webflow success/error message blocks. */
(function () {
  var AJAX_ENDPOINT = "https://formsubmit.co/ajax/752e61c8a97c138f3867839cb0d281b6";

  function onReady(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  function siblingMsg(form, cls) {
    var parent = form.parentNode;
    if (!parent) return null;
    return parent.querySelector(":scope > ." + cls) || parent.querySelector("." + cls);
  }

  function handle(form) {
    var btn = form.querySelector('[type="submit"]');
    var original = btn ? btn.value : null;
    if (btn) {
      btn.value = btn.getAttribute("data-wait") || "Please wait...";
      btn.disabled = true;
    }

    var data = new FormData(form);
    data.append("_subject", "New message from coachnichols.tech");
    data.append("_template", "table");
    // Set reply-to to the visitor's email so replies go straight to them.
    var emailField = form.querySelector('[name="email-2"], input[type="email"]');
    if (emailField && emailField.value) data.append("_replyto", emailField.value);

    fetch(AJAX_ENDPOINT, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: data
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        var ok = res && (res.success === true || res.success === "true");
        var done = siblingMsg(form, "w-form-done");
        var fail = siblingMsg(form, "w-form-fail");
        if (ok) {
          form.style.display = "none";
          if (done) done.style.display = "block";
          if (fail) fail.style.display = "none";
          form.reset();
        } else if (fail) {
          fail.style.display = "block";
        }
      })
      .catch(function () {
        var fail = siblingMsg(form, "w-form-fail");
        if (fail) fail.style.display = "block";
      })
      .finally(function () {
        if (btn) { btn.value = original; btn.disabled = false; }
      });
  }

  onReady(function () {
    var forms = document.querySelectorAll('form#email-form, form[name="email-form"]');
    Array.prototype.forEach.call(forms, function (form) {
      // Capture phase + stopImmediatePropagation runs before Webflow's handler
      // and prevents it from firing.
      form.addEventListener(
        "submit",
        function (e) {
          e.preventDefault();
          e.stopImmediatePropagation();
          handle(form);
        },
        true
      );
    });
  });
})();
