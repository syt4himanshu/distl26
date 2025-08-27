document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    const themeToggle = document.getElementById('themeToggle');
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const changePasswordModal = document.getElementById('changePasswordModal');
    const closeModal = document.getElementById('closeModal');
    const cancelChangePassword = document.getElementById('cancelChangePassword');
    const changePasswordForm = document.getElementById('changePasswordForm');
    const studentNameElement = document.getElementById('student-name');
    const remarksContainer = document.getElementById('remarksContainer');
    const mentorContainer = document.getElementById('mentorContainer');
    const errorMsg = document.getElementById("errorMsg");

    // Initialize dashboard
    initializeDashboard();

    // Event Listeners
    navToggle.addEventListener('click', toggleMobileMenu);
    themeToggle.addEventListener('click', toggleTheme);
    changePasswordBtn.addEventListener('click', openChangePasswordModal);
    closeModal.addEventListener('click', closeChangePasswordModal);
    cancelChangePassword.addEventListener('click', closeChangePasswordModal);
    changePasswordForm.addEventListener('submit', handleChangePassword);
    logoutBtn.addEventListener('click', handleLogout);

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === changePasswordModal) {
            closeChangePasswordModal();
        }
    });

    // Functions
    async function initializeDashboard() {
        await loadStudentData();
        await loadMentoringData();
        await loadMentorData();

        initializeTheme();
    }

    async function loadStudentData() {
        try {
            const token = localStorage.getItem("access_token");
            if (!token) {
                window.location.href = "../login.html";
                return;
            }

            const response = await fetch("http://localhost:5002/student/me", {
                method: "GET",
                headers: {
                    "Authorization": "Bearer " + token,
                    "Content-Type": "application/json"
                }
            });

            if (response.ok) {
                const studentData = await response.json();
                if (studentData.full_name) {
                    studentNameElement.textContent = studentData.full_name;
                }
            } else if (response.status === 401) {
                localStorage.removeItem("access_token");
                window.location.href = "../login.html";
            }
        } catch (error) {
            console.error('Error loading student data:', error);
        }
    }

    async function loadMentoringData() {
        try {
            const token = localStorage.getItem("access_token");
            if (!token) return;

            const response = await fetch(`http://localhost:5002/students/me/mentoring-minutes`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                }
            });

            if (!response.ok) {
                alert("Failed to fetch mentoring minutes");
                return;
            }

            const data = await response.json();
            const remarks = [...data];
            displayRemarks(remarks);

        } catch (error) {
            console.error('Error loading mentoring data:', error);
            displayRemarksError();
        }
    }

    async function loadMentorData() {
        try {
            const token = localStorage.getItem("access_token");
            if (!token) return;

            const response = await fetch("http://localhost:5002/students/me/mentor", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + token
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Failed to fetch mentor:", errorData);
                displayMentorError(errorData.error || "Failed to fetch mentor");
                return;
            }

            const data = await response.json();

            // Map backend fields to what displayMentorInfo expects
            const mentor = {
                faculty_email: data.email,
                faculty_name: data.full_name,
                contact: data.contact_number
            };

            displayMentorInfo(mentor);

        } catch (error) {
            console.error("Error loading mentor data:", error);
            displayMentorError("Something went wrong");
        }
    }

    function displayRemarks(remarks) {
        console.log(remarks, remarks.length)
        if (!remarks || remarks.length === 0) {
            remarksContainer.innerHTML = `
                <div class="text-center" style="padding: 2rem; color: var(--text-muted);">
                    <h3>No Mentoring Sessions Yet</h3>
                    <p>Your mentoring remarks will appear here once you have sessions with your faculty mentor.</p>
                </div>
            `;
            return;
        }

        const remarksHTML = remarks.map((remark, index) => `
            <div class="remark-card">
                <div class="remark-header">
                    <div>
                        <div class="remark-faculty">${remark.faculty_name}</div>
                        <div class="remark-date">${formatDate(remark.date)}</div>
                    </div>
                    <span class="remark-semester">Semester ${remark.semester}</span>
                </div>
                <div class="remark-content">
                    <div class="remark-field">
                        <div class="remark-label">Remarks</div>
                        <div class="remark-value">${remark.remarks}</div>
                    </div>
                    <div class="remark-field">
                        <div class="remark-label">Suggestions</div>
                        <div class="remark-value">${remark.suggestion}</div>
                    </div>
                    <div class="remark-field">
                        <div class="remark-label">Action Items</div>
                        <div class="remark-value">${remark.action}</div>
                    </div>
                </div>
            </div>
        `).join('');

        remarksContainer.innerHTML = remarksHTML;
    }

    function displayMentorInfo(mentor) {
        if (!mentor) {
            displayMentorError();
            return;
        }

        const mentorHTML = `
            <div class="mentor-info">
                <div class="mentor-avatar">
                    ${mentor.faculty_name.split(' ').map(n => n[0]).join('')}
                </div>
                <div class="mentor-details">
                    <h3>${mentor.faculty_name}</h3>
                    <p>${mentor.faculty_email}</p>
                    <p>${mentor.contact}</p>
                </div>
            </div>
            <div class="mentor-stats">
                <div style="margin-top: 1rem; padding: 1rem; background: var(--bg-card); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                    <div class="remark-field">
                        <div class="remark-label">Contact Information</div>
                        <div class="remark-value">
                            <strong>Email:</strong> ${mentor.faculty_email}<br>
                            <strong>Phone:</strong> ${mentor.contact}<br>
                            <strong>Office:</strong> ${mentor.office || 'Not specified'}
                        </div>
                    </div>
                </div>
            </div>
        `;

        mentorContainer.innerHTML = mentorHTML;
    }

    function displayRemarksError() {
        remarksContainer.innerHTML = `
            <div class="text-center" style="padding: 2rem; color: var(--error-color);">
                <h3>Error Loading Data</h3>
                <p>Failed to load mentoring remarks. Please try again later.</p>
            </div>
        `;
    }

    function displayMentorError() {
        mentorContainer.innerHTML = `
            <div class="text-center" style="padding: 2rem; color: var(--error-color);">
                <h3>Error Loading Data</h3>
                <p>Failed to load mentor information. Please try again later.</p>
            </div>
        `;
    }

    function toggleMobileMenu() {
        navMenu.classList.toggle('active');
        navToggle.classList.toggle('active');

        // Animate hamburger menu
        const bars = navToggle.querySelectorAll('.bar');
        bars.forEach((bar, index) => {
            if (navMenu.classList.contains('active')) {
                if (index === 0) bar.style.transform = 'rotate(45deg) translate(5px, 5px)';
                if (index === 1) bar.style.opacity = '0';
                if (index === 2) bar.style.transform = 'rotate(-45deg) translate(7px, -6px)';
            } else {
                bar.style.transform = 'none';
                bar.style.opacity = '1';
            }
        });

        // Prevent body scroll when menu is open
        if (navMenu.classList.contains('active')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }

    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }

    function initializeTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }

    function openChangePasswordModal() {
        changePasswordModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function closeChangePasswordModal() {
        changePasswordModal.classList.remove('show');
        document.body.style.overflow = '';
        changePasswordForm.reset();
        errorMsg.style.display = 'none';
    }

    async function handleChangePassword(e) {
        e.preventDefault();

        const formData = new FormData(changePasswordForm);
        const currentPassword = formData.get('currentPassword')
        const newPassword = formData.get('newPassword');
        const confirmPassword = formData.get('confirmPassword');

        // Clear previous error messages
        errorMsg.style.display = 'none';

        if (newPassword !== confirmPassword) {
            showError('New passwords do not match');
            return;
        }

        if (newPassword.length < 8) {
            showError('Password must be at least 8 characters long');
            return;
        }

        try {
            const res = await fetch("http://localhost:5002/api/auth/change-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + localStorage.getItem("access_token")
                },
                body: JSON.stringify({
                    "old_password": currentPassword,
                    "new_password": newPassword
                })
            });

            const data = await res.json();

            if (!res.ok) {
                // Handle different error scenarios
                if (res.status === 401) {
                    showError("Invalid old password. Please try again.");
                } else if (res.status === 400) {
                    showError(data.error || "Invalid request. Please check your input.");
                } else if (res.status === 500) {
                    showError("Server error. Please try again later.");
                } else {
                    showError(data.error || "Something went wrong. Please try again.");
                }
                return;
            }

            // Success scenario
            showSuccess(data.message || "Password changed successfully!");
            changePasswordForm.reset();

            // Hide success message after 5 seconds
            setTimeout(() => {
                hideSuccess();
            }, 5000);

        } catch (err) {
            console.error("Error:", err);
            if (err.name === "TypeError" && err.message.includes("fetch")) {
                showError("Network error. Please check your connection.");
            } else {
                showError("An unexpected error occurred. Please try again.");
            }
        }
    }

    function showError(message) {
        errorMsg.textContent = message;
        errorMsg.style.display = "block";
        errorMsg.style.color = "#dc3545";
        errorMsg.style.backgroundColor = "#f8d7da";
        errorMsg.style.border = "1px solid #f5c6cb";
        errorMsg.style.padding = "10px";
        errorMsg.style.borderRadius = "4px";
        errorMsg.style.marginBottom = "15px";
    }

    function showSuccess(message) {
        errorMsg.textContent = message;
        errorMsg.style.display = "block";
        errorMsg.style.color = "#155724";
        errorMsg.style.backgroundColor = "#d4edda";
        errorMsg.style.border = "1px solid #c3e6cb";
        errorMsg.style.padding = "10px";
        errorMsg.style.borderRadius = "4px";
        errorMsg.style.marginBottom = "15px";
    }

    function hideSuccess() {
        errorMsg.style.display = "none";
    }

    function handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem("access_token");
            window.location.href = "../login.html";
        }
    }

    function formatDate(dateString) {
        if (!dateString) return 'N/A';

        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';

        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    // Close mobile menu when clicking on a link
    document.addEventListener('click', (e) => {
        if (e.target.closest('.nav-btn') && navMenu.classList.contains('active')) {
            toggleMobileMenu();
        }
    });

    // Handle window resize for responsive design
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && navMenu.classList.contains('active')) {
            toggleMobileMenu();
        }
    });

    // Add touch event handling for mobile
    if ('ontouchstart' in window) {
        // Add touch feedback for buttons
        const touchElements = document.querySelectorAll('.nav-btn, .btn, .theme-toggle');
        touchElements.forEach(element => {
            element.addEventListener('touchstart', function () {
                this.style.transform = 'scale(0.95)';
            });

            element.addEventListener('touchend', function () {
                this.style.transform = '';
            });
        });
    }

    // Prevent zoom on double tap for mobile
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function (event) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
});
