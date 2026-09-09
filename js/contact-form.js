/* Contact form handler for static hosting (GitHub Pages).
   - Real-time, inline validation (on blur + as the user types).
   - Intercepts Webflow's broken submit (delegated on document) via a
     capture-phase listener, and sends to FormSubmit over AJAX.
   - Reuses Webflow's existing success/error message blocks. */
(function () {
  var AJAX_ENDPOINT = "https://formsubmit.co/ajax/752e61c8a97c138f3867839cb0d281b6";
  var CONTACT_EMAIL = "coachnicholstech@gmail.com";

  // Friendly messages per field.
  var MESSAGES = {
    "name-2":    { required: "Please enter your name." },
    "email-2":   { required: "Please enter your email.", invalid: "Please enter a valid email address (e.g. name@example.com)." },
    "Phone-2":   { required: "Please enter your phone number.", invalid: "Please enter a valid phone number." },
    "Message-2": { required: "Please enter a message." }
  };

  function onReady(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  function injectStyles() {
    if (document.getElementById("cf-styles")) return;
    var s = document.createElement("style");
    s.id = "cf-styles";
    s.textContent =
      ".cf-error{color:#c0392b !important;font-size:13px !important;font-weight:400 !important;" +
      "line-height:1.35 !important;letter-spacing:normal !important;text-transform:none !important;" +
      "font-family:inherit;margin:4px 0 10px !important;display:none;}" +
      ".cf-invalid{border-color:#c0392b !important;box-shadow:0 0 0 1px #c0392b inset;}";
    document.head.appendChild(s);
  }

  // Visible, user-facing fields only (skip submit, hidden, and FormSubmit's _ fields).
  function fieldsOf(form) {
    var all = form.querySelectorAll("input:not([type=submit]):not([type=hidden]), textarea, select");
    return Array.prototype.filter.call(all, function (el) {
      return el.name && el.name.charAt(0) !== "_";
    });
  }

  function errorEl(input) {
    var next = input.nextElementSibling;
    if (next && next.classList && next.classList.contains("cf-error")) return next;
    var e = document.createElement("div");
    e.className = "cf-error";
    e.setAttribute("aria-live", "polite");
    input.insertAdjacentElement("afterend", e);
    return e;
  }

  function messageFor(input) {
    var m = MESSAGES[input.name] || {};
    var v = input.validity;
    if (v.valid) return "";
    if (v.valueMissing) return m.required || "This field is required.";
    return m.invalid || input.validationMessage || "Please check this field.";
  }

  function validateField(input) {
    var msg = messageFor(input);
    var el = errorEl(input);
    if (msg) {
      el.textContent = msg;
      el.style.display = "block";
      input.classList.add("cf-invalid");
      input.setAttribute("aria-invalid", "true");
      return false;
    }
    el.textContent = "";
    el.style.display = "none";
    input.classList.remove("cf-invalid");
    input.removeAttribute("aria-invalid");
    return true;
  }

  function validateForm(form) {
    var ok = true, first = null;
    fieldsOf(form).forEach(function (input) {
      if (!validateField(input) && !first) { first = input; ok = false; }
      else if (!input.validity.valid) ok = false;
    });
    if (first) first.focus();
    return ok;
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
    console.log("[contact-form] success");
  }

  // Keep the form visible on failure so the visitor can retry.
  function showFail(form) {
    var fail = box(form, "w-form-fail");
    if (fail) fail.style.display = "block";
    console.warn("[contact-form] submission failed");
  }

  function send(form) {
    if (form.getAttribute("data-cf-sending") === "1") return; // guard double-submit
    form.setAttribute("data-cf-sending", "1");

    var btn = form.querySelector("[type=submit]");
    var original = btn ? btn.value : null;
    if (btn) { btn.value = btn.getAttribute("data-wait") || "Sending…"; btn.disabled = true; }

    var data = new FormData(form);
    data.set("_subject", "New message from coachnichols.tech");
    data.set("_template", "table");
    var emailField = form.querySelector('[name="email-2"], input[type=email]');
    if (emailField && emailField.value) data.set("_replyto", emailField.value);

    fetch(AJAX_ENDPOINT, { method: "POST", headers: { Accept: "application/json" }, body: data })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        console.log("[contact-form] FormSubmit response:", res);
        if (res && (res.success === true || res.success === "true")) { showSuccess(form); form.reset(); }
        else { showFail(form); }
      })
      .catch(function (err) { console.error("[contact-form] network error:", err); showFail(form); })
      .finally(function () {
        form.setAttribute("data-cf-sending", "0");
        if (btn) { btn.value = original; btn.disabled = false; }
      });
  }

  function isOurForm(el) {
    return el && el.tagName === "FORM" &&
      (el.id === "email-form" || el.getAttribute("name") === "email-form");
  }

  onReady(function () {
    injectStyles();
    var forms = document.querySelectorAll('form#email-form, form[name="email-form"]');

    Array.prototype.forEach.call(forms, function (form) {
      // We render our own validation UI, so suppress the browser's native popups.
      form.setAttribute("novalidate", "novalidate");
      fieldsOf(form).forEach(function (input) {
        input.addEventListener("blur", function () { validateField(input); });
        input.addEventListener("input", function () {
          if (input.classList.contains("cf-invalid")) validateField(input);
        });
      });
    });

    // Capture phase on document → runs before Webflow's delegated handler and blocks it.
    document.addEventListener("submit", function (e) {
      if (!isOurForm(e.target)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      var form = e.target;
      if (!validateForm(form)) { console.log("[contact-form] blocked: validation errors"); return; }
      send(form);
    }, true);

    console.log("[contact-form] ready (" + forms.length + " form(s))");
  });
})();
