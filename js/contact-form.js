/* Contact form handler for static hosting.
   Webflow's bundled JS binds a delegated "submit" handler on `document` and tries
   to POST forms to Webflow's servers, which don't exist on GitHub Pages. We attach
   our own handler on `document` in the CAPTURE phase so it runs before Webflow's,
   block it, and send the data to FormSubmit via AJAX instead — reusing the page's
   existing Webflow success/error message blocks. */
(function () {
  var AJAX_ENDPOINT = "https://formsubmit.co/ajax/752e61c8a97c138f3867839cb0d281b6";
  var CONTACT_EMAIL = "coachnicholstech@gmail.com";

  function onReady(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  function isOurForm(el) {
    return el && el.tagName === "FORM" &&
      (el.id === "email-form" || el.getAttribute("name") === "email-form");
  }

  function wrap(form) { return form.closest(".w-form") || form.parentNode; }
  function box(form, cls) { var w = wrap(form); return w ? w.querySelector("." + cls) : null; }

  function showSuccess(form) {
    var done = box(form, "w-form-done");
    var fail = box(form, "w-form-fail");
    if (fail) fail.style.display = "none";
    form.style.display = "none";
    if (done) {
      done.style.display = "block";
    } else {
      var d = document.createElement("div");
      d.className = "w-form-done";
      d.textContent = "Thanks! Your message was sent — I'll be in touch soon.";
      d.style.cssText = "display:block;padding:1rem;margin-top:1rem;";
      wrap(form).appendChild(d);
    }
    console.log("[contact-form] submitted successfully");
  }

  function showFail(form) {
    var fail = box(form, "w-form-fail");
    if (fail) fail.style.display = "block";
    else alert("Sorry, something went wrong. Please email " + CONTACT_EMAIL + " directly.");
    console.warn("[contact-form] submission failed");
  }

  function send(form) {
    var btn = form.querySelector('[type="submit"]');
    var original = btn ? btn.value : null;
    if (btn) {
      btn.value = btn.getAttribute("data-wait") || "Please wait...";
      btn.disabled = true;
    }

    var data = new FormData(form);
    data.set("_subject", "New message from coachnichols.tech");
    data.set("_template", "table");
    var emailField = form.querySelector('[name="email-2"], input[type="email"]');
    if (emailField && emailField.value) data.set("_replyto", emailField.value);

    fetch(AJAX_ENDPOINT, { method: "POST", headers: { Accept: "application/json" }, body: data })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res && (res.success === true || res.success === "true")) {
          showSuccess(form);
          form.reset();
        } else {
          showFail(form);
        }
      })
      .catch(function () { showFail(form); })
      .finally(function () { if (btn) { btn.value = original; btn.disabled = false; } });
  }

  function intercept(e) {
    if (!isOurForm(e.target)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    console.log("[contact-form] intercepted submit, sending to FormSubmit…");
    send(e.target);
  }

  onReady(function () {
    // Capture phase on document → runs before Webflow's delegated bubble handler.
    document.addEventListener("submit", intercept, true);
    var n = document.querySelectorAll('form#email-form, form[name="email-form"]').length;
    console.log("[contact-form] handler ready, " + n + " form(s) on page");
  });
})();
