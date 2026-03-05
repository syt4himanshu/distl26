/* ================================================
   STUDENT DASHBOARD — dashboard.js
================================================ */

document.addEventListener("DOMContentLoaded", () => {
  // ── DOM Refs ──────────────────────────────────
  const hamburger = document.getElementById("hamburger");
  const mobileDrawer = document.getElementById("mobileDrawer");
  const drawerBackdrop = document.getElementById("drawerBackdrop");
  const drawerAvatar = document.getElementById("drawerAvatar");

  const themeToggle = document.getElementById("themeToggle"); // mobile drawer
  const themeToggleDesktop = document.getElementById("themeToggleDesktop"); // desktop nav

  const changePasswordBtn = document.getElementById("changePasswordBtn"); // drawer
  const changePasswordBtnDesktop = document.getElementById(
    "changePasswordBtnDesktop",
  ); // desktop

  const logoutBtn = document.getElementById("logoutBtn"); // drawer
  const logoutBtnDesktop = document.getElementById("logoutBtnDesktop"); // desktop

  const changePasswordModal = document.getElementById("changePasswordModal");
  const closeModal = document.getElementById("closeModal");
  const cancelChangePassword = document.getElementById("cancelChangePassword");
  const changePasswordForm = document.getElementById("changePasswordForm");
  const submitPasswordBtn = document.getElementById("submitPasswordBtn");
  const errorMsgEl = document.getElementById("errorMsg");

  const customPopupOverlay = document.getElementById("customPopupOverlay");
  const customPopup = document.getElementById("customPopup");
  const customPopupBadge = document.getElementById("customPopupBadge");
  const customPopupTitle = document.getElementById("customPopupTitle");
  const customPopupMessage = document.getElementById("customPopupMessage");
  const customPopupCancel = document.getElementById("customPopupCancel");
  const customPopupConfirm = document.getElementById("customPopupConfirm");

  const studentNameEl = document.getElementById("student-name"); // drawer
  const studentNameDesktop = document.getElementById("student-name-desktop");
  const heroStudentName = document.getElementById("heroStudentName");

  const studentProfileImage = document.getElementById("studentProfileImage");
  const heroAvatarRing = studentProfileImage?.closest(".hero-avatar-ring");
  const profilePhotoHint = document.getElementById("profilePhotoHint");
  const profileThumb = document.getElementById("profileThumb");
  const profileThumbImg = document.getElementById("profileThumbImg");

  const remarksContainer = document.getElementById("remarksContainer");
  const mentorContainer = document.getElementById("mentorContainer");

  const newPasswordInput = document.getElementById("newPassword");
  const strengthBar = document.getElementById("strengthBar");
  const strengthLabel = document.getElementById("strengthLabel");

  let popupResolver = null;

  // ── Init ─────────────────────────────────────
  initTheme();
  initializeDashboard();
  bindEvents();

  // ── Bind Events ──────────────────────────────
  function bindEvents() {
    // Mobile drawer
    hamburger?.addEventListener("click", toggleDrawer);
    drawerBackdrop?.addEventListener("click", closeDrawer);

    // Theme toggles
    themeToggle?.addEventListener("click", () => {
      toggleTheme();
      closeDrawer();
    });
    themeToggleDesktop?.addEventListener("click", toggleTheme);

    // Change password
    changePasswordBtn?.addEventListener("click", () => {
      openModal();
      closeDrawer();
    });
    changePasswordBtnDesktop?.addEventListener("click", openModal);

    // Logout
    logoutBtn?.addEventListener("click", handleLogout);
    logoutBtnDesktop?.addEventListener("click", handleLogout);

    // Modal
    closeModal?.addEventListener("click", closeModalFn);
    cancelChangePassword?.addEventListener("click", closeModalFn);
    changePasswordModal?.addEventListener("click", (e) => {
      if (e.target === changePasswordModal) closeModalFn();
    });
    changePasswordForm?.addEventListener("submit", handleChangePassword);
    customPopupCancel?.addEventListener("click", () => closePopup(false));
    customPopupConfirm?.addEventListener("click", () => closePopup(true));
    customPopupOverlay?.addEventListener("click", (e) => {
      if (e.target === customPopupOverlay) closePopup(false);
    });

    // Password strength
    newPasswordInput?.addEventListener("input", updateStrength);

    // Eye toggles
    document.querySelectorAll(".eye-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.target;
        const input = document.getElementById(id);
        if (!input) return;
        input.type = input.type === "password" ? "text" : "password";
      });
    });

    // Swipe down to close modal on mobile
    setupSwipeClose();

    // Close drawer on resize to desktop
    window.addEventListener("resize", () => {
      if (window.innerWidth >= 768) closeDrawer();
    });

    // Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (customPopupOverlay?.classList.contains("show")) {
        closePopup(false);
        return;
      }
      closeDrawer();
      closeModalFn();
    });
  }

  // ── Dashboard Init ───────────────────────────
  async function initializeDashboard() {
    await loadStudentData();
    await loadMentoringData();
    await loadMentorData();
  }

  // ── Student Data ─────────────────────────────
  async function loadStudentData() {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        redirectToLogin();
        return;
      }

      const res = await fetch("http://localhost:5002/student/me", {
        headers: { Authorization: "Bearer " + token },
      });

      if (res.status === 401) {
        redirectToLogin();
        return;
      }
      if (!res.ok) return;

      const data = await res.json();
      const name = data.full_name || data.uid || "Student";
      setStudentName(name);

      const photoUrl = normalizePhotoUrl(data?.personal_info?.photo_url);
      renderProfilePhoto(photoUrl, name);
    } catch (err) {
      console.error("loadStudentData:", err);
    }
  }

  function setStudentName(name) {
    if (studentNameEl) studentNameEl.textContent = name;
    if (studentNameDesktop) studentNameDesktop.textContent = name;
    if (heroStudentName) heroStudentName.textContent = name;

    // Drawer avatar initials
    if (drawerAvatar) {
      const initials = name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
      drawerAvatar.textContent = initials;
    }
  }

  function normalizePhotoUrl(url) {
    if (typeof url !== "string") return "";
    const t = url.trim();
    if (!t) return "";
    if (t.startsWith("//")) return "https:" + t;
    return t;
  }

  function renderProfilePhoto(url, name = "Student") {
    if (url) {
      // Hero avatar
      if (studentProfileImage) {
        studentProfileImage.src = url;
        studentProfileImage.alt = name + " profile photo";
        heroAvatarRing?.classList.add("has-image");
      }
      // Profile thumb card
      if (profileThumbImg) {
        profileThumbImg.src = url;
        profileThumb?.classList.add("has-image");
      }
      if (profilePhotoHint) {
        profilePhotoHint.textContent =
          "Profile photo synced from your saved student form.";
      }
    } else {
      if (studentProfileImage) studentProfileImage.removeAttribute("src");
      heroAvatarRing?.classList.remove("has-image");
      profileThumb?.classList.remove("has-image");
      if (profilePhotoHint)
        profilePhotoHint.textContent =
          "Add your profile photo in the form to display it here.";
    }
  }

  // ── Mentoring Data ───────────────────────────
  async function loadMentoringData() {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      const res = await fetch(
        "http://localhost:5002/students/me/mentoring-minutes",
        {
          headers: { Authorization: "Bearer " + token },
        },
      );

      if (!res.ok) {
        displayRemarksError();
        return;
      }

      const data = await res.json();
      displayRemarks(data);
    } catch (err) {
      console.error("loadMentoringData:", err);
      displayRemarksError();
    }
  }

  function displayRemarks(remarks) {
    if (!remarksContainer) return;

    if (!remarks || remarks.length === 0) {
      remarksContainer.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                    </svg>
                    <h3>No Mentoring Sessions Yet</h3>
                    <p>Your remarks will appear here once you have sessions with your faculty mentor.</p>
                </div>`;
      return;
    }

    const html =
      `<div class="remarks-list">` +
      remarks
        .map(
          (r) => `
            <div class="remark-card">
                <div class="remark-card-head">
                    <div>
                        <div class="remark-faculty">${escHtml(
                          r.faculty_name,
                        )}</div>
                        <div class="remark-date">${formatDate(r.date)}</div>
                    </div>
                    <span class="remark-semester">Semester ${escHtml(
                      String(r.semester),
                    )}</span>
                </div>
                <div class="remark-body">
                    <div class="remark-field">
                        <div class="remark-field-label">Remarks</div>
                        <div class="remark-field-value">${escHtml(
                          r.remarks || "—",
                        )}</div>
                    </div>
                    <div class="remark-field">
                        <div class="remark-field-label">Suggestions</div>
                        <div class="remark-field-value">${escHtml(
                          r.suggestion || "—",
                        )}</div>
                    </div>
                    <div class="remark-field">
                        <div class="remark-field-label">Action Items</div>
                        <div class="remark-field-value">${escHtml(
                          r.action || "—",
                        )}</div>
                    </div>
                </div>
            </div>`,
        )
        .join("") +
      `</div>`;

    remarksContainer.innerHTML = html;
  }

  function displayRemarksError() {
    if (!remarksContainer) return;
    remarksContainer.innerHTML = `
            <div class="error-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <h3>Failed to Load</h3>
                <p>Unable to load mentoring remarks. Please try refreshing the page.</p>
            </div>`;
  }

  // ── Mentor Data ──────────────────────────────
  async function loadMentorData() {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      const res = await fetch("http://localhost:5002/students/me/mentor", {
        headers: { Authorization: "Bearer " + token },
      });

      if (!res.ok) {
        displayMentorError();
        return;
      }

      const data = await res.json();
      displayMentorInfo({
        faculty_name: data.full_name,
        faculty_email: data.email,
        contact: data.contact_number,
        office: data.office,
      });
    } catch (err) {
      console.error("loadMentorData:", err);
      displayMentorError();
    }
  }

  function displayMentorInfo(mentor) {
    if (!mentorContainer || !mentor) {
      displayMentorError();
      return;
    }

    const initials = (mentor.faculty_name || "M")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    mentorContainer.innerHTML = `
            <div class="mentor-info">
                <div class="mentor-avatar">${escHtml(initials)}</div>
                <div class="mentor-details">
                    <h3>${escHtml(mentor.faculty_name || "Faculty Mentor")}</h3>
                    <p>${escHtml(mentor.faculty_email || "")}</p>
                    <p>${escHtml(mentor.contact || "")}</p>
                </div>
            </div>
            <div class="mentor-contact-grid" style="margin-top:14px">
                <div class="mentor-contact-item">
                    <div class="mentor-contact-label">Email</div>
                    <div class="mentor-contact-value">${escHtml(
                      mentor.faculty_email || "Not specified",
                    )}</div>
                </div>
                <div class="mentor-contact-item">
                    <div class="mentor-contact-label">Phone</div>
                    <div class="mentor-contact-value">${escHtml(
                      mentor.contact || "Not specified",
                    )}</div>
                </div>
                ${
                  mentor.office
                    ? `
                <div class="mentor-contact-item" style="grid-column:1/-1">
                    <div class="mentor-contact-label">Office</div>
                    <div class="mentor-contact-value">${escHtml(
                      mentor.office,
                    )}</div>
                </div>`
                    : ""
                }
            </div>`;
  }

  function displayMentorError() {
    if (!mentorContainer) return;
    mentorContainer.innerHTML = `
            <div class="error-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
                <h3>No Mentor Found</h3>
                <p>Mentor information could not be loaded. Please contact your coordinator.</p>
            </div>`;
  }

  // ── Theme ────────────────────────────────────
  function toggleTheme() {
    const isDark =
      document.documentElement.getAttribute("data-theme") === "dark";
    const next = isDark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  }

  function initTheme() {
    const saved = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", saved);
  }

  // ── Mobile Drawer ────────────────────────────
  function toggleDrawer() {
    const open = mobileDrawer.classList.contains("open");
    open ? closeDrawer() : openDrawer();
  }

  function openDrawer() {
    mobileDrawer?.classList.add("open");
    drawerBackdrop?.classList.add("show");
    hamburger?.classList.add("open");
    document.body.classList.add("drawer-open");
  }

  function closeDrawer() {
    mobileDrawer?.classList.remove("open");
    drawerBackdrop?.classList.remove("show");
    hamburger?.classList.remove("open");
    document.body.classList.remove("drawer-open");
  }

  // ── Change Password Modal ────────────────────
  function openModal() {
    changePasswordModal?.classList.add("show");
    document.body.style.overflow = "hidden";
    setTimeout(() => document.getElementById("currentPassword")?.focus(), 350);
  }

  function closeModalFn() {
    changePasswordModal?.classList.remove("show");
    document.body.style.overflow = "";
    changePasswordForm?.reset();
    hideFeedback();
    resetStrength();
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    hideFeedback();

    const current = document.getElementById("currentPassword")?.value;
    const newPwd = document.getElementById("newPassword")?.value;
    const confirm = document.getElementById("confirmPassword")?.value;

    if (newPwd !== confirm) {
      showFeedback("error", "New passwords do not match.");
      return;
    }
    if (newPwd.length < 8) {
      showFeedback("error", "Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(
        "http://localhost:5002/api/auth/change-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("access_token"),
          },
          body: JSON.stringify({ old_password: current, new_password: newPwd }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        const msg =
          data.error ||
          (res.status === 401
            ? "Incorrect current password."
            : "Something went wrong.");
        showFeedback("error", msg);
      } else {
        showFeedback(
          "success",
          data.message || "Password changed successfully!",
        );
        changePasswordForm?.reset();
        resetStrength();
        setTimeout(closeModalFn, 2200);
        showToast("Password changed!", "success");
      }
    } catch (err) {
      console.error("handleChangePassword:", err);
      showFeedback("error", "Network error. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  }

  function setSubmitting(loading) {
    if (!submitPasswordBtn) return;
    const text = submitPasswordBtn.querySelector(".btn-text");
    const loader = submitPasswordBtn.querySelector(".btn-loader");
    submitPasswordBtn.disabled = loading;
    if (text) text.hidden = loading;
    if (loader) loader.hidden = !loading;
  }

  function showFeedback(type, msg) {
    if (!errorMsgEl) return;
    errorMsgEl.textContent = msg;
    errorMsgEl.className = "modal-feedback show " + type;
  }

  function hideFeedback() {
    if (!errorMsgEl) return;
    errorMsgEl.className = "modal-feedback";
    errorMsgEl.textContent = "";
  }

  // ── Password Strength ────────────────────────
  function updateStrength() {
    if (!newPasswordInput || !strengthBar || !strengthLabel) return;
    const val = newPasswordInput.value;

    if (!val) {
      resetStrength();
      return;
    }

    let score = 0;
    if (val.length >= 8) score++;
    if (val.length >= 12) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    let cls, label, pct;
    if (score <= 2) {
      cls = "weak";
      label = "Weak";
      pct = "33%";
    } else if (score <= 3) {
      cls = "fair";
      label = "Fair";
      pct = "66%";
    } else {
      cls = "strong";
      label = "Strong";
      pct = "100%";
    }

    strengthBar.style.width = pct;
    strengthBar.className = "strength-bar " + cls;
    strengthLabel.textContent = label;
    strengthLabel.style.color =
      cls === "weak"
        ? "var(--color-error)"
        : cls === "fair"
        ? "var(--brand-amber)"
        : "var(--color-success)";
  }

  function resetStrength() {
    if (!strengthBar || !strengthLabel) return;
    strengthBar.style.width = "0%";
    strengthBar.className = "strength-bar";
    strengthLabel.textContent = "";
  }

  function popupIconByType(type) {
    if (type === "danger") return "!";
    if (type === "warning") return "!";
    if (type === "success") return "✓";
    return "i";
  }

  function showPopup({
    title = "Notice",
    message = "",
    confirmText = "OK",
    cancelText = "Cancel",
    type = "info",
    mode = "confirm",
  } = {}) {
    if (!customPopupOverlay || !customPopup) {
      return Promise.resolve(mode === "alert");
    }

    if (popupResolver) {
      popupResolver(false);
      popupResolver = null;
    }

    if (customPopupTitle) customPopupTitle.textContent = title;
    if (customPopupMessage) customPopupMessage.textContent = message;
    if (customPopupBadge) customPopupBadge.textContent = popupIconByType(type);

    customPopup.dataset.type = type;
    customPopup.dataset.mode = mode;

    if (customPopupConfirm) {
      customPopupConfirm.textContent = confirmText;
      customPopupConfirm.classList.toggle("danger", type === "danger");
      customPopupConfirm.classList.toggle("warning", type === "warning");
    }

    if (customPopupCancel) {
      customPopupCancel.textContent = cancelText;
      customPopupCancel.hidden = mode !== "confirm";
    }

    customPopupOverlay.classList.add("show");
    customPopupOverlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("popup-open");

    setTimeout(() => {
      if (mode === "confirm") {
        customPopupCancel?.focus();
      } else {
        customPopupConfirm?.focus();
      }
    }, 60);

    return new Promise((resolve) => {
      popupResolver = resolve;
    });
  }

  function closePopup(result = false) {
    if (!customPopupOverlay?.classList.contains("show")) return;

    customPopupOverlay.classList.remove("show");
    customPopupOverlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("popup-open");

    const resolver = popupResolver;
    popupResolver = null;
    if (resolver) resolver(result);
  }

  function showConfirmPopup(message, options = {}) {
    return showPopup({
      title: options.title || "Confirm Action",
      message,
      confirmText: options.confirmText || "OK",
      cancelText: options.cancelText || "Cancel",
      type: options.type || "info",
      mode: "confirm",
    });
  }

  function showAlertPopup(message, options = {}) {
    return showPopup({
      title: options.title || "Notice",
      message,
      confirmText: options.confirmText || "OK",
      type: options.type || "info",
      mode: "alert",
    });
  }

  window.showDashboardConfirm = showConfirmPopup;
  window.showDashboardAlert = showAlertPopup;

  // ── Logout ───────────────────────────────────
  async function handleLogout() {
    closeDrawer();
    const confirmed = await showConfirmPopup(
      "Are you sure you want to log out?",
      {
        title: "Log Out",
        confirmText: "Log Out",
        cancelText: "Stay Here",
        type: "danger",
      },
    );
    if (confirmed) {
      localStorage.removeItem("access_token");
      redirectToLogin();
    }
  }

  function redirectToLogin() {
    window.location.href = "../login.html";
  }

  // ── Toast ────────────────────────────────────
  function showToast(msg, type = "info", duration = 3000) {
    const el = document.createElement("div");
    el.className = "toast " + type;
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.classList.add("show");
      });
    });
    setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => el.remove(), 400);
    }, duration);
  }

  // ── Swipe down close (modal) ─────────────────
  function setupSwipeClose() {
    if (!changePasswordModal) return;
    let startY = 0;

    changePasswordModal.addEventListener(
      "touchstart",
      (e) => {
        startY = e.touches[0].clientY;
      },
      { passive: true },
    );

    changePasswordModal.addEventListener(
      "touchend",
      (e) => {
        const delta = e.changedTouches[0].clientY - startY;
        if (delta > 80) closeModalFn();
      },
      { passive: true },
    );
  }

  // ── Helpers ──────────────────────────────────
  function escHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d)) return "Invalid Date";
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
});
