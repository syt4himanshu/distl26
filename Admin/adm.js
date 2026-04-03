// Data Arrays - All loaded from API
let teachers = [];
let students = [];
let users = [];
const DEFAULT_PROFILE_ICON =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'%3E%3Crect width='96' height='96' rx='48' fill='%23e2e8f0'/%3E%3Ccircle cx='48' cy='36' r='16' fill='%2394a3b8'/%3E%3Cpath d='M20 78c4-14 16-22 28-22s24 8 28 22' fill='%2394a3b8'/%3E%3C/svg%3E";
const USERS_PAGE_SIZE = 20;
let currentUsersPage = 1;
let filteredUsersData = [];
const STUDENTS_PAGE_SIZE = 20;
let currentStudentsPage = 1;
let filteredStudentsData = [];

let allocations = {}; // { teacherId: [studentIds...] }
let selectedTeacherForAllocation = null;
let activeModal = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return DEFAULT_PROFILE_ICON;
  if (/^(https?:|data:image\/)/i.test(raw)) return raw;
  return DEFAULT_PROFILE_ICON;
}

// ========== UI/UX UTILITIES (NON-BREAKING) ==========
function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return false;

  if (activeModal && activeModal !== id) {
    closeModal(activeModal, true);
  }

  modal.classList.remove("hidden", "is-closing");
  modal.classList.add("is-open");

  if (
    modal.classList.contains("modal") ||
    modal.classList.contains("modal-overlay")
  ) {
    modal.style.display = "flex";
  } else if (modal.style.display === "none") {
    modal.style.display = "block";
  }

  activeModal = id;

  setTimeout(() => {
    const focusable = modal.querySelectorAll(
      "input, button, select, textarea, [tabindex]:not([tabindex='-1'])",
    );
    if (focusable.length > 0) {
      focusable[0].focus();
    }
  }, 50);

  return true;
}

function closeModal(id, instant = false) {
  const modal = document.getElementById(id);
  if (!modal) return false;

  const completeClose = () => {
    modal.classList.remove("is-open", "is-closing");
    if (
      modal.classList.contains("modal") ||
      modal.classList.contains("modal-overlay")
    ) {
      modal.style.display = "none";
    }
    if (activeModal === id) {
      activeModal = null;
    }
  };

  if (instant) {
    completeClose();
    return true;
  }

  modal.classList.add("is-closing");
  modal.classList.remove("is-open");
  setTimeout(completeClose, 220);
  return true;
}

function showToast(message, type = "info") {
  const safeType = ["info", "success", "danger", "warning"].includes(type)
    ? type
    : "info";
  const icons = { info: "ℹ️", success: "✅", danger: "❌", warning: "⚠️" };

  let stack = document.getElementById("toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.id = "toast-stack";
    stack.setAttribute("aria-live", "polite");
    stack.setAttribute("aria-atomic", "true");
    document.body.appendChild(stack);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${safeType}`;

  const icon = document.createElement("span");
  icon.textContent = icons[safeType] || icons.info;
  const text = document.createElement("span");
  text.textContent = String(message || "");

  toast.appendChild(icon);
  toast.appendChild(text);
  stack.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("hiding");
    setTimeout(() => toast.remove(), 240);
  }, 3200);
}

// ========== API LOADING FUNCTIONS ==========

// Load teachers/faculty from backend API
async function loadTeachersFromAPI() {
  try {
    const token = localStorage.getItem("access_token");
    const response = await fetch("http://localhost:5002/api/admin/faculty", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const teachersData = await response.json();

      teachers.length = 0; // Clear existing array
      teachers.push(...teachersData);

      renderTeachers();
      renderAllocation(); // Update allocation table after teachers are loaded
    } else {
      console.error("❌ Failed to load teachers:", response.status);
    }
  } catch (error) {
    console.error("❌ Error loading teachers:", error);
  }
}

// Load users from backend API
async function loadUsersFromAPI() {
  try {
    const token = localStorage.getItem("access_token");
    const response = await fetch("http://localhost:5002/api/admin/users", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const usersData = await response.json();

      users.length = 0; // Clear existing array
      users.push(...usersData);

      renderUsers();
    } else {
      console.error("❌ Failed to load users:", response.status);
    }
  } catch (error) {
    console.error("❌ Error loading users:", error);
  }
}

// Load dashboard statistics from backend API
async function loadStatisticsFromAPI() {
  try {
    const token = localStorage.getItem("access_token");
    const response = await fetch("http://localhost:5002/api/admin/statistics", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const stats = await response.json();

      // Update the statistics cards
      document.getElementById("totalUsers").textContent = stats.totalUsers;
      document.getElementById("totalStudents").textContent =
        stats.totalStudents;
      document.getElementById("totalTeachers").textContent =
        stats.totalTeachers;
      document.getElementById("activeUsers").textContent = stats.activeUsers;
    } else {
      console.error("❌ Failed to load statistics:", response.status);
    }
  } catch (error) {
    console.error("❌ Error loading statistics:", error);
  }
}

// Load students from backend API
async function loadStudentsFromAPI() {
  try {
    const token = localStorage.getItem("access_token");
    const response = await fetch("http://localhost:5002/api/students", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const studentsData = await response.json();

      // Transform API data to match frontend expectations
      students.length = 0; // Clear existing array

      studentsData.forEach((student) => {
        // Extract nested objects or provide defaults
        const personalInfo = student.personal_info || {};
        const careerObjective = student.career_objective || {};
        const swoc = student.swoc || {};
        const skills = student.skills || {};

        // Calculate current SGPA from post_admission_records
        const currentSemester = student.semester || 0;
        const currentRecord = student.post_admission_records?.find(
          (record) => record.semester === currentSemester,
        );
        const currentSGPA = currentRecord?.sgpa || 0.0;

        // Calculate CGPA from all semesters
        const allSGPA =
          student.post_admission_records
            ?.map((record) => record.sgpa)
            .filter((sgpa) => sgpa && sgpa > 0) || [];
        const cgpa =
          allSGPA.length > 0
            ? (
                allSGPA.reduce((sum, sgpa) => sum + sgpa, 0) / allSGPA.length
              ).toFixed(2)
            : 0.0;

        // Get backlog count from current semester
        const currentBacklogSubjects = currentRecord?.backlog_subjects || "";
        const backlogCount = currentBacklogSubjects
          ? currentBacklogSubjects.split(",").length
          : 0;

        students.push({
          // Basic info
          id: student.id,
          uid: student.uid,
          firstName: student.first_name || "Unknown",
          middleName: student.middle_name || "",
          lastName: student.last_name || "Student",
          fullName:
            student.full_name ||
            `${student.first_name || ""} ${student.last_name || ""}`.trim(),
          semester: student.semester || 0,
          section: student.section || "N/A",
          year: student.year_of_admission || new Date().getFullYear(),
          mentorId: student.mentor_id,

          // Personal info (from personal_info object)
          email:
            personalInfo.personal_email ||
            personalInfo.college_email ||
            `${student.uid}@student.edu`,
          mobile: personalInfo.mobile_no || "+91 9876543210",
          photoUrl: personalInfo.photo_url || "",
          photoPublicId: personalInfo.photo_public_id || "",
          linkedInId: personalInfo.linked_in_id || "N/A",
          permanentAddress:
            personalInfo.permanent_address || "Address not provided",
          fatherName: personalInfo.father_name || "Father Name",
          motherName: personalInfo.mother_name || "Mother Name",
          dob: personalInfo.dob || "N/A",
          gender: personalInfo.gender || "N/A",
          collegeEmail: personalInfo.college_email || "N/A",
          emergencyContactName: personalInfo.emergency_contact_name || "N/A",
          emergencyContactNumber:
            personalInfo.emergency_contact_number || "N/A",
          fatherEmail: personalInfo.father_email || "N/A",
          fatherMobile: personalInfo.father_mobile_no || "N/A",
          fatherOccupation: personalInfo.father_occupation || "N/A",
          motherEmail: personalInfo.mother_email || "N/A",
          motherMobile: personalInfo.mother_mobile_no || "N/A",
          motherOccupation: personalInfo.mother_occupation || "N/A",

          // Academic info - calculated from post_admission_records
          backlogs: backlogCount,
          backlogSubjects: currentBacklogSubjects || "N/A",
          sgpa: currentSGPA,
          cgpa: parseFloat(cgpa),

          // Career info (from career_objective object)
          careerGoal: careerObjective.career_goal || "Placement",
          careerDetails: careerObjective.specific_details || "N/A",
          clarityPreparedness: careerObjective.clarity_preparedness || "N/A",
          interestedInCampusPlacement:
            careerObjective.interested_in_campus_placement !== undefined
              ? careerObjective.interested_in_campus_placement
              : true,
          campusPlacementReasons:
            careerObjective.campus_placement_reasons || "N/A",

          // Skills (from skills object)
          domain: skills.domains_of_interest || "General",
          programmingLanguages: skills.programming_languages || "N/A",
          technologiesFrameworks: skills.technologies_frameworks || "N/A",
          familiarToolsPlatforms: skills.familiar_tools_platforms || "N/A",
          expectations: skills.expectations || "N/A",
          softSkillsRating: student.softSkillsRating || 3,

          // SWOC (from swoc object)
          strengths: swoc.strengths || "N/A",
          weaknesses: swoc.weaknesses || "N/A",
          opportunities: swoc.opportunities || "N/A",
          challenges: swoc.challenges || "N/A",

          // Past Education Records
          past_education_records: student.past_education_records || [],

          // Post Admission Records (semester-wise performance)
          post_admission_records: student.post_admission_records || [],

          // Career Activities
          career_activities: student.career_activities || [],

          // Projects
          projects: student.projects || [],

          // Internships
          internships: student.internships || [],

          // Co-curricular Activities
          cocurricular_participations:
            student.cocurricular_participations || [],
          cocurricular_organizations: student.cocurricular_organizations || [],

          // Store the complete student object for reference
          _rawData: student,
        });
      });

      renderStudents();
      renderUsers(); // Re-render user rows so profile icons resolve for student UIDs.
    } else {
      console.error("❌ Failed to load students:", response.status);
    }
  } catch (error) {
    console.error("❌ Error loading students:", error);
  }
}

// Initialize API loading when page loads
document.addEventListener("DOMContentLoaded", function () {
  loadStudentsFromAPI();
  loadTeachersFromAPI();
  loadUsersFromAPI();
  loadStatisticsFromAPI();

  const profileImageModal = document.getElementById("studentImagePreviewModal");
  if (profileImageModal) {
    profileImageModal.addEventListener("click", function (event) {
      if (event.target === profileImageModal) {
        closeStudentImagePreviewModal();
      }
    });
  }
});

// Initialize
window.addEventListener("load", function () {
  renderUsers();
  renderTeachers();
  loadStudentsFromAPI(); // Load students from API instead of hardcoded
  updateStats();

  // Debug: Log initial tab state

  checkTabsDebug();
});

function checkTabsDebug() {
  const sections = document.querySelectorAll(".section");
  const tabs = document.querySelectorAll(".nav-tab");
}

// Tab Switching - Simplified version
// Tab Switching - Simplified version
function switchTab(tabId) {
  try {
    // Hide all tab sections (not nested ones like in student modal)
    const allTabSections = document.querySelectorAll(".tab-section");

    allTabSections.forEach((sec, index) => {
      sec.classList.add("hidden");
      sec.style.display = "none";
    });

    // Show the selected section
    const targetSection = document.getElementById(tabId);
    if (targetSection) {
      targetSection.classList.remove("hidden");
      targetSection.style.display = "block";
    } else {
      console.error(`❌ Section not found: ${tabId}`);
      return;
    }

    // Update active tab
    const allTabs = document.querySelectorAll(".nav-tab");
    allTabs.forEach((btn, index) => {
      btn.classList.remove("active");
    });

    const activeTab = document.querySelector(
      `button[onclick*="switchTab('${tabId}')"]`,
    );
    if (activeTab) {
      activeTab.classList.add("active");
    } else {
      console.error(`❌ Tab button not found for: ${tabId}`);
    }

    if (tabId == "reports") {
      initializeReports();
    }
  } catch (error) {
    console.error(`❌ Error in switchTab:`, error);
  }
}
// User Management Functions
function showAddUserForm() {
  // Show role selection form first
  document.getElementById("roleSelectionForm").style.display = "block";
  document.getElementById("studentForm").style.display = "none";
  document.getElementById("facultyForm").style.display = "none";
  document.getElementById("passwordEditForm").style.display = "none";
}

function selectRole(role) {
  // Hide role selection form
  document.getElementById("roleSelectionForm").style.display = "none";

  // Show appropriate form based on role
  if (role === "student") {
    document.getElementById("studentForm").style.display = "block";
    document.getElementById("facultyForm").style.display = "none";
    document.getElementById("passwordEditForm").style.display = "none";
  } else if (role === "faculty") {
    document.getElementById("facultyForm").style.display = "block";
    document.getElementById("studentForm").style.display = "none";
    document.getElementById("passwordEditForm").style.display = "none";
  }
}

function cancelRoleSelection() {
  document.getElementById("roleSelectionForm").style.display = "none";
}

function cancelStudent() {
  document.getElementById("studentForm").style.display = "none";
  document.getElementById("passwordEditForm").style.display = "none";
  clearStudentForm();
}

function cancelFaculty() {
  document.getElementById("facultyForm").style.display = "none";
  document.getElementById("passwordEditForm").style.display = "none";
  clearFacultyForm();
}

function clearStudentForm() {
  document.getElementById("studentUid").value = "";
  document.getElementById("studentFullName").value = "";
  document.getElementById("studentSemester").value = "";
  document.getElementById("studentSection").value = "";
  document.getElementById("studentYearOfAdmission").value = "";
  document.getElementById("studentPassword").value = "";
  document.getElementById("editIndex").value = "";
}

function clearFacultyForm() {
  document.getElementById("facultyEmail").value = "";
  document.getElementById("facultyPassword").value = "";
  document.getElementById("facultyFirstName").value = "";
  document.getElementById("facultyLastName").value = "";
  document.getElementById("facultyContactNumber").value = "";
  document.getElementById("editIndex").value = "";
}

function saveStudent() {
  const uid = document.getElementById("studentUid").value.trim();
  const fullName = document.getElementById("studentFullName").value.trim();
  const semester = document.getElementById("studentSemester").value;
  const section = document.getElementById("studentSection").value.trim();
  const year = document.getElementById("studentYearOfAdmission").value;
  const password = document.getElementById("studentPassword").value;

  // Validation
  if (!uid || !fullName || !semester || !section || !year || !password) {
    alert("Please fill in all required fields");
    return;
  }

  const semesterNum = parseInt(semester);
  const yearNum = parseInt(year);

  if (isNaN(semesterNum) || isNaN(yearNum)) {
    alert("Semester and Year of Admission must be valid numbers");
    return;
  }

  const studentData = {
    username: uid,
    password: password,
    role: "student",
    uid: uid,
    first_name: fullName,
    semester: semesterNum,
    section: section,
    year_of_admission: yearNum,
  };

  fetch("http://localhost:5002/api/admin/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("access_token")}`,
    },
    body: JSON.stringify(studentData),
  })
    .then((response) => {
      if (!response.ok) {
        // For error responses, try to get JSON error details
        return response
          .json()
          .then((errorData) => {
            throw new Error(JSON.stringify(errorData));
          })
          .catch(() => {
            throw new Error(`HTTP error! status: ${response.status}`);
          });
      }
      return response.json();
    })
    .then((data) => {
      alert("Student created successfully!");

      cancelStudent();
      loadStudentsFromAPI();
      loadTeachersFromAPI();
      loadUsersFromAPI();
      loadStatisticsFromAPI();
      // Refresh user list or perform other actions
    })
    .catch((error) => {
      console.error("Error:", error);
      try {
        const errorObj = JSON.parse(error.message);
        alert(
          "Error: " + (errorObj.error || errorObj.details || error.message),
        );
      } catch (e) {
        alert("Error: " + error.message);
      }
    });
}

function saveFaculty() {
  const email = document.getElementById("facultyEmail").value.trim();
  const password = document.getElementById("facultyPassword").value;
  const firstName = document.getElementById("facultyFirstName").value.trim();
  const lastName = document.getElementById("facultyLastName").value.trim();
  const contact = document.getElementById("facultyContactNumber").value.trim();

  // Validation
  if (!email || !password || !firstName || !lastName || !contact) {
    alert("Please fill in all required fields");
    return;
  }

  if (!email.includes("@")) {
    alert("Please enter a valid email address");
    return;
  }

  const facultyData = {
    username: email,
    password: password,
    role: "faculty",
    email: email,
    first_name: firstName,
    last_name: lastName,
    contact_number: contact,
  };

  fetch("http://localhost:5002/api/admin/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("access_token")}`,
    },
    body: JSON.stringify(facultyData),
  })
    .then((response) => {
      if (!response.ok) {
        return response
          .json()
          .then((errorData) => {
            throw new Error(JSON.stringify(errorData));
          })
          .catch(() => {
            throw new Error(`HTTP error! status: ${response.status}`);
          });
      }
      return response.json();
    })
    .then((data) => {
      alert("Faculty created successfully!");

      cancelFaculty();
      loadStudentsFromAPI();
      loadTeachersFromAPI();
      loadUsersFromAPI();
      loadStatisticsFromAPI();
      // Refresh user list or perform other actions
    })
    .catch((error) => {
      console.error("Error:", error);
      try {
        const errorObj = JSON.parse(error.message);
        alert(
          "Error: " + (errorObj.error || errorObj.details || error.message),
        );
      } catch (e) {
        alert("Error: " + error.message);
      }
    });
}

function cancelUser() {
  document.getElementById("roleSelectionForm").style.display = "none";
  document.getElementById("studentForm").style.display = "none";
  document.getElementById("facultyForm").style.display = "none";
  document.getElementById("passwordEditForm").style.display = "none";
}

function editStudent(index) {
  const student = students[index];
  if (student) {
    document.getElementById("studentUid").value = student.uid || "";
    document.getElementById("studentFullName").value = student.full_name || "";
    document.getElementById("studentSemester").value = student.semester || "";
    document.getElementById("studentSection").value = student.section || "";
    document.getElementById("studentYearOfAdmission").value =
      student.year_of_admission || "";
    document.getElementById("studentPassword").value = ""; // Don't show password
    document.getElementById("editIndex").value = index;

    document.getElementById("studentForm").style.display = "block";
    document.getElementById("roleSelectionForm").style.display = "none";
    document.getElementById("facultyForm").style.display = "none";
  }
}

function editFaculty(index) {
  const faculty = teachers[index];
  if (faculty) {
    document.getElementById("facultyEmail").value = faculty.email || "";
    document.getElementById("facultyPassword").value = ""; // Don't show password
    document.getElementById("facultyFirstName").value =
      faculty.first_name || "";
    document.getElementById("facultyLastName").value = faculty.last_name || "";
    document.getElementById("facultyContactNumber").value =
      faculty.contact_number || "";
    document.getElementById("editIndex").value = index;

    document.getElementById("facultyForm").style.display = "block";
    document.getElementById("roleSelectionForm").style.display = "none";
    document.getElementById("studentForm").style.display = "none";
  }
}

async function savePassword() {
  const newPassword = document.getElementById("newPassword").value.trim();
  const confirmPassword = document
    .getElementById("confirmPassword")
    .value.trim();
  const editIndex = document.getElementById("passwordEditIndex").value;
  const userId = document.getElementById("passwordEditUserId").value;
  const userRole = document.getElementById("passwordEditUserRole").value;

  // Validation
  if (!newPassword || !confirmPassword) {
    alert("Please fill in both password fields");
    return;
  }

  if (newPassword !== confirmPassword) {
    alert("Passwords do not match");
    return;
  }

  if (newPassword.length < 8) {
    alert("Password must be at least 8 characters long");
    return;
  }

  const passwordData = {
    role: userRole,
    username: userId,
    new_password: newPassword,
  };

  try {
    const token = localStorage.getItem("access_token");
    const user = users[editIndex];

    const response = await fetch(
      `http://localhost:5002/admin/reset-password`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(passwordData),
      },
    );

    if (response.ok) {
      const result = await response.json();

      alert(`✅ Password updated successfully for user "${userId}"`);

      // Hide form and clear fields
      document.getElementById("passwordEditForm").style.display = "none";
      document.getElementById("newPassword").value = "";
      document.getElementById("confirmPassword").value = "";
    } else {
      const error = await response.json();
      alert(`❌ Failed to update password: ${error.error || "Unknown error"}`);
    }
  } catch (error) {
    console.error("Error updating password:", error);
    alert("❌ Error connecting to server. Please try again.");
  }
}

function cancelPasswordEdit() {
  document.getElementById("passwordEditForm").style.display = "none";
  document.getElementById("newPassword").value = "";
  document.getElementById("confirmPassword").value = "";
}

function getFilteredUsers() {
  const search = (
    document.getElementById("searchInput")?.value || ""
  ).toLowerCase();
  const roleFilter = document.getElementById("roleFilter")?.value || "";

  return users.filter((user) => {
    const userId = String(user.username || "").toLowerCase();
    const role = String(user.role || "").toLowerCase();
    const matchesSearch = !search || userId.includes(search);
    const matchesRole = !roleFilter || role === roleFilter.toLowerCase();
    return matchesSearch && matchesRole;
  });
}

function updateUsersPaginationUI(totalItems) {
  const totalPages = Math.max(1, Math.ceil(totalItems / USERS_PAGE_SIZE));
  if (currentUsersPage > totalPages) currentUsersPage = totalPages;
  if (currentUsersPage < 1) currentUsersPage = 1;

  const pageInfo = document.getElementById("usersPageInfo");
  const prevBtn = document.getElementById("usersPrevPageBtn");
  const nextBtn = document.getElementById("usersNextPageBtn");

  if (pageInfo)
    pageInfo.textContent = `Page ${currentUsersPage} of ${totalPages} (${totalItems} users)`;
  if (prevBtn) prevBtn.disabled = currentUsersPage === 1;
  if (nextBtn) nextBtn.disabled = currentUsersPage === totalPages;
}

function renderUsers(resetPage = true) {
  const tbody = document.getElementById("userTableBody");
  tbody.innerHTML = "";

  filteredUsersData = getFilteredUsers();
  if (resetPage) currentUsersPage = 1;
  updateUsersPaginationUI(filteredUsersData.length);

  if (filteredUsersData.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align: center; color: #666;">No users found for current filters.</td></tr>';
    return;
  }

  const startIdx = (currentUsersPage - 1) * USERS_PAGE_SIZE;
  const pageUsers = filteredUsersData.slice(
    startIdx,
    startIdx + USERS_PAGE_SIZE,
  );

  pageUsers.forEach((user) => {
    const originalIndex = users.findIndex((u) => u.id === user.id);
    const profile = resolveUserProfileImage(user);
    const encodedUsername = encodeURIComponent(user.username || "");
    const safeUsername = escapeHtml(user.username);
    const safeRole = escapeHtml(user.role);
    const safeStatus = escapeHtml(user.status);
    const safeCreated = escapeHtml(user.created);
    const safeThumb = sanitizeUrl(profile.thumbUrl);
    const row = document.createElement("tr");
    row.innerHTML = `
	      <td>
	        <div class="user-id-cell">
	          <button class="profile-icon-btn" type="button" onclick="openProfileImageForUser('${encodedUsername}')" title="View profile photo">
	            <img class="profile-icon-img" src="${safeThumb}" alt="${safeUsername} profile photo" loading="lazy" onerror="this.src='${DEFAULT_PROFILE_ICON}'">
	          </button>
	          <strong>${safeUsername}</strong>
	        </div>
	      </td>
	      <td><span class="tag ${safeRole}">${safeRole}</span></td>
	      <td><span class="tag" style="background: #dcfce7; color: #166534;">${safeStatus}</span></td>
	      <td>${safeCreated}</td>
	      <td>
	        <button class="btn-sm btn-password" onclick="changeUserPassword(${originalIndex})" style="background: #8b5cf6; color: white;">🔐 Password</button>
	        <button class="btn-sm btn-delete" onclick="deleteUser(${originalIndex})">🗑 Delete</button>
	      </td>
	    `;
    tbody.appendChild(row);
  });
}

function resolveUserProfileImage(user) {
  if (!user || user.role !== "student") {
    return {
      imageUrl: DEFAULT_PROFILE_ICON,
      thumbUrl: DEFAULT_PROFILE_ICON,
      hasImage: false,
    };
  }

  const student = students.find(
    (s) => String(s.uid || "").trim() === String(user.username || "").trim(),
  );
  if (!student || !student.photoUrl) {
    return {
      imageUrl: DEFAULT_PROFILE_ICON,
      thumbUrl: DEFAULT_PROFILE_ICON,
      hasImage: false,
    };
  }

  return {
    imageUrl: student.photoUrl,
    thumbUrl: student.photoUrl,
    hasImage: true,
  };
}

function openProfileImageForUser(encodedUsername) {
  const username = decodeURIComponent(encodedUsername || "");
  const user = users.find((u) => String(u.username) === String(username));
  if (!user) return;

  const profile = resolveUserProfileImage(user);
  const modal = document.getElementById("studentImagePreviewModal");
  const previewTitle = document.getElementById("studentImagePreviewTitle");
  const previewImage = document.getElementById("studentImagePreviewImg");
  if (!modal || !previewTitle || !previewImage) return;

  previewTitle.textContent = profile.hasImage
    ? `${username} - Profile Photo`
    : `${username} - No image uploaded`;
  previewImage.src = profile.imageUrl;
  previewImage.alt = `${username} profile photo`;
  previewImage.onerror = () => {
    previewImage.src = DEFAULT_PROFILE_ICON;
  };
  openModal("studentImagePreviewModal");
}

function closeStudentImagePreviewModal() {
  const modal = document.getElementById("studentImagePreviewModal");
  const previewImage = document.getElementById("studentImagePreviewImg");
  if (!modal || !previewImage) return;
  closeModal("studentImagePreviewModal", true);
  previewImage.src = "";
}

function changeUserPassword(index) {
  const user = users[index];

  // Show password edit form
  document.getElementById("passwordEditForm").style.display = "block";
  document.getElementById("roleSelectionForm").style.display = "none";
  document.getElementById("studentForm").style.display = "none";
  document.getElementById("facultyForm").style.display = "none";

  // Set form data
  document.getElementById("passwordEditIndex").value = index;
  document.getElementById("passwordEditUserId").value = user.username;
  document.getElementById("passwordEditUserRole").value = user.role;
  document.getElementById("editingUserName").textContent = user.username;
  document.getElementById("newPassword").value = "";
  document.getElementById("confirmPassword").value = "";
}

async function deleteUser(index) {
  const user = users[index];
  if (!confirm(`Are you sure you want to delete user "${user.username}"?`)) {
    return;
  }

  try {
    const token = localStorage.getItem("access_token");
    const response = await fetch(
      `http://localhost:5002/api/admin/users/${user.id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (response.ok) {
      const result = await response.json();
      alert(`✅ ${result.message}`);

      // Refresh data from API
      await loadUsersFromAPI();
      await loadStatisticsFromAPI();
      await loadStudentsFromAPI();
      await loadStudentsFromAPI();
    } else {
      const error = await response.json();
      alert(`❌ Failed to delete user: ${error.error || "Unknown error"}`);
    }
  } catch (error) {
    console.error("Error deleting user:", error);
    alert("❌ Error connecting to server. Please try again.");
  }
}

function filterUsers() {
  renderUsers(true);
}

function changeUsersPage(direction) {
  const totalPages = Math.max(
    1,
    Math.ceil(filteredUsersData.length / USERS_PAGE_SIZE),
  );
  const nextPage = currentUsersPage + direction;
  if (nextPage < 1 || nextPage > totalPages) return;
  currentUsersPage = nextPage;
  renderUsers(false);
}

// Teachers Management
function renderTeachers() {
  const tbody = document.getElementById("teacherTableBody");
  tbody.innerHTML = "";

  teachers.forEach((teacher) => {
    const assignedCount = teacher.studentsAssigned
      ? teacher.studentsAssigned.length
      : 0;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${teacher.name}</strong></td>
      <td>${teacher.uid}</td>
      <td>${teacher.email}</td>
      <td>${teacher.contact}</td>
              <td><span class="tag">${assignedCount}/20</span></td>
      <td>
        <button class="btn-sm btn-view" onclick="viewTeacher(${teacher.id})">👁 View</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function filterTeachers() {
  const search = document
    .getElementById("teacherSearchInput")
    .value.toLowerCase();
  const rows = document.querySelectorAll("#teacherTableBody tr");

  rows.forEach((row) => {
    const name = row.cells[0].textContent.toLowerCase();
    const uid = row.cells[1].textContent.toLowerCase();

    if (name.includes(search) || uid.includes(search)) {
      row.style.display = "";
    } else {
      row.style.display = "none";
    }
  });
}

function viewTeacher(teacherId) {
  const teacher = teachers.find((t) => t.id === teacherId);
  if (!teacher) return;

  const assignedStudents = teacher.studentsAssigned || [];

  const studentDetails = assignedStudents
    .map((studentId) => {
      const student = students.find((s) => s.uid === studentId);

      return student ? `${student.fullName} (${student.uid})` : studentId;
    })
    .join("<br>");

  document.getElementById("teacherModalBody").innerHTML = `
    <table class="data-table">
      <tr><th>Name</th><td>${teacher.name}</td></tr>
      <tr><th>UID</th><td>${teacher.uid}</td></tr>
      <tr><th>Email</th><td>${teacher.email}</td></tr>
      <tr><th>Contact</th><td>${teacher.contact}</td></tr>
      <tr><th>Students Assigned</th><td>${assignedStudents.length}/20</td></tr>
      <tr><th>Assigned Students</th><td>${studentDetails || "None"}</td></tr>
    </table>
  `;
  openModal("teacherModal");
}

function closeTeacherModal() {
  closeModal("teacherModal", true);
}

// Students Management
function updateStudentsPaginationUI(totalItems) {
  const totalPages = Math.max(1, Math.ceil(totalItems / STUDENTS_PAGE_SIZE));
  const pageInfo = document.getElementById("studentsPageInfo");
  const prevBtn = document.getElementById("studentsPrevPageBtn");
  const nextBtn = document.getElementById("studentsNextPageBtn");

  if (currentStudentsPage > totalPages) currentStudentsPage = totalPages;
  if (currentStudentsPage < 1) currentStudentsPage = 1;

  if (pageInfo)
    pageInfo.textContent = `Page ${currentStudentsPage} of ${totalPages} (${totalItems} students)`;
  if (prevBtn) prevBtn.disabled = currentStudentsPage === 1;
  if (nextBtn) nextBtn.disabled = currentStudentsPage === totalPages;
}

function getFilteredStudents() {
  const search = (
    document.getElementById("studentSearchInput")?.value || ""
  ).toLowerCase();
  const domain = document.getElementById("domainFilter")?.value || "";
  const year = document.getElementById("yearFilter")?.value || "";
  const section = document.getElementById("sectionFilter")?.value || "";
  const softSkills = document.getElementById("softSkillsFilter")?.value || "";
  const careerGoal = document.getElementById("careerGoalFilter")?.value || "";

  return students.filter((student) => {
    const firstName = (student.firstName || "").toLowerCase();
    const lastName = (student.lastName || "").toLowerCase();
    const uid = (student.uid || "").toLowerCase();
    const fullName = (
      student.fullName || `${student.firstName || ""} ${student.lastName || ""}`
    ).toLowerCase();

    const matchesSearch =
      !search ||
      firstName.includes(search) ||
      lastName.includes(search) ||
      fullName.includes(search) ||
      uid.includes(search);
    const studentDomain = Array.isArray(student.domain)
      ? student.domain
      : String(student.domain || "")
          .split(",")
          .map((d) => d.trim());
    const matchesDomain = !domain || studentDomain.includes(domain);
    const matchesYear = !year || String(student.year) === String(year);
    const matchesSection = !section || student.section === section;
    const matchesSoftSkills =
      !softSkills || String(student.softSkillsRating) === String(softSkills);
    const matchesCareerGoal = !careerGoal || student.careerGoal === careerGoal;

    return (
      matchesSearch &&
      matchesDomain &&
      matchesYear &&
      matchesSection &&
      matchesSoftSkills &&
      matchesCareerGoal
    );
  });
}

function renderStudents(resetPage = true) {
  const tbody = document.getElementById("studentTableBody");
  tbody.innerHTML = "";

  filteredStudentsData = getFilteredStudents();
  if (resetPage) currentStudentsPage = 1;

  const totalFiltered = filteredStudentsData.length;
  updateStudentsPaginationUI(totalFiltered);

  if (totalFiltered === 0) {
    tbody.innerHTML =
      '<tr><td colspan="10" style="text-align: center; color: #666;">No students found. Students are being loaded from the database...</td></tr>';
    return;
  }

  const startIdx = (currentStudentsPage - 1) * STUDENTS_PAGE_SIZE;
  const pageStudents = filteredStudentsData.slice(
    startIdx,
    startIdx + STUDENTS_PAGE_SIZE,
  );

  pageStudents.forEach((student) => {
    // Handle both API format and detailed format
    const studentId = student.uid;
    const uid = student.uid || "N/A";
    const name =
      student.fullName ||
      `${student.firstName || student.first_name || ""} ${
        student.lastName || student.last_name || ""
      }`.trim() ||
      "Unknown";
    const semester = student.semester || "N/A";
    const section = student.section || "N/A";
    const year = student.year_of_admission || student.year || "N/A";
    const sgpa = student.sgpa || "N/A";
    const domain = student.domain || ["General"];
    const careerGoal = student.careerGoal || "Not specified";

    const mentor = student.mentorId
      ? teachers.find((t) => t.id === student.mentorId)?.name || "Unknown"
      : "Not Assigned";
    const safeUid = escapeHtml(uid);
    const safeName = escapeHtml(name);
    const safeSemester = escapeHtml(semester);
    const safeSection = escapeHtml(section);
    const safeYear = escapeHtml(year);
    const safeSgpa = escapeHtml(sgpa);
    const safeCareerGoal = escapeHtml(careerGoal);
    const safeMentor = escapeHtml(mentor);
    const safeDomainTags = Array.isArray(domain)
      ? domain.map((d) => `<span class="tag">${escapeHtml(d)}</span>`).join("")
      : '<span class="tag">General</span>';

    const row = document.createElement("tr");
    row.innerHTML = `
	      <td><strong>${safeUid}</strong></td>
	      <td>${safeName}</td>
	      <td>${safeSemester}</td>
	      <td>${safeSection}</td>
	      <td>${safeYear}</td>
	      <td>${safeSgpa}</td>
	      <td>
	        <div class="tags">
	          ${safeDomainTags}
	        </div>
	      </td>
	      <td><span class="tag ${
          careerGoal === "Placement" ? "placement" : "higher-studies"
        }">${safeCareerGoal}</span></td>
	      <td>${safeMentor}</td>
	      <td>
	        <button class="btn-sm btn-view" onclick="viewStudent('${studentId}')">👁 View</button>
	        <small style="display: block; color: #666; margin-top: 5px;">Edit via User Mgmt</small>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function filterStudents() {
  renderStudents(true);
}

function changeStudentsPage(direction) {
  const totalPages = Math.max(
    1,
    Math.ceil(filteredStudentsData.length / STUDENTS_PAGE_SIZE),
  );
  const nextPage = currentStudentsPage + direction;
  if (nextPage < 1 || nextPage > totalPages) return;
  currentStudentsPage = nextPage;
  renderStudents(false);
}

// ========== STUDENT MANAGEMENT FUNCTIONS (DISABLED) ==========
// Student creation is now only available through User Management

// Show message that student creation should be done through User Management
function showAddStudentForm() {
  alert(
    "💡 Student creation has been moved to User Management!\n\n" +
      "To add a new student:\n" +
      "1. Go to User Management section\n" +
      "2. Click 'Add User'\n" +
      "3. Set role to 'student'\n" +
      "4. The student will appear in Students List once they have a complete profile",
  );
}

function cancelStudentEdit() {
  // Disabled
}

function editStudent(studentId) {
  // For now, editing is disabled - students should be managed through User Management
  alert(
    "💡 Student editing is currently disabled. Use User Management to modify user accounts.",
  );
}

async function deleteStudent(userId) {
  const token = localStorage.getItem("access_token"); // or your JWT storage method
  const apiUrl = `http://localhost:5002/api/admin/users/${userId}`;

  try {
    const response = await fetch(apiUrl, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // Include JWT token
      },
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true, message: data.message };
      alert("Student deleted Successfully");
    } else {
      console.error("Error deleting user:", data.error);
      return {
        success: false,
        error: data.error,
        details: data.details,
        status: response.status,
      };
    }
  } catch (error) {
    console.error("Network error:", error);
    return {
      success: false,
      error: "Network error",
      details: error.message,
    };
  }
}

// ========== END STUDENT MANAGEMENT FUNCTIONS ==========

function viewStudent(studentId) {
  const student = students.find((s) => s.uid == studentId);
  if (!student) return;
  const modalRoot = document.getElementById("studentModal");

  const rawStudent = student._rawData || student;
  const personalInfo = rawStudent.personal_info || student.personal_info || {};
  const careerObjective =
    rawStudent.career_objective || student.career_objective || {};
  const skills = rawStudent.skills || student.skills || {};
  const swoc = rawStudent.swoc || student.swoc || {};
  const pastEducation =
    rawStudent.past_education_records || student.past_education_records || [];
  const postAdmission =
    rawStudent.post_admission_records || student.post_admission_records || [];
  const careerActivities =
    rawStudent.career_activities || student.career_activities || [];
  const projects = rawStudent.projects || student.projects || [];
  const internships = rawStudent.internships || student.internships || [];
  const participations =
    rawStudent.cocurricular_participations ||
    student.cocurricular_participations ||
    [];
  const organizations =
    rawStudent.cocurricular_organizations ||
    student.cocurricular_organizations ||
    [];
  const sdpActivities =
    rawStudent.skill_development_programs ||
    rawStudent.sdp_records ||
    rawStudent.training_records ||
    rawStudent.mooc_records ||
    [];

  const getValue = (value, defaultValue = "N/A") => {
    if (value === null || value === undefined) return defaultValue;
    if (typeof value === "string" && value.trim() === "") return defaultValue;
    return value;
  };

  const pickValue = (...values) =>
    values.find(
      (value) =>
        value !== null && value !== undefined && String(value).trim() !== "",
    );

  const setText = (id, value, defaultValue = "N/A") => {
    const el = modalRoot
      ? modalRoot.querySelector(`#${id}`)
      : document.getElementById(id);
    if (!el) return;
    el.textContent = getValue(value, defaultValue);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const parsedDate = new Date(dateString);
    if (Number.isNaN(parsedDate.getTime())) return String(dateString);
    return parsedDate.toLocaleDateString("en-CA");
  };

  const formatPercent = (value) => {
    const normalized = getValue(value);
    if (normalized === "N/A") return normalized;
    const text = String(normalized);
    return text.endsWith("%") ? text : `${text}%`;
  };

  const formatDuration = (start, end) => {
    const startDate = formatDate(start);
    const endDate = formatDate(end);
    if (startDate === "N/A" && endDate === "N/A") return "N/A";
    if (startDate === "N/A") return endDate;
    if (endDate === "N/A") return startDate;
    return `${startDate} to ${endDate}`;
  };

  const boolToText = (value) => {
    if (value === true || value === "true" || value === 1 || value === "1")
      return "Yes";
    if (value === false || value === "false" || value === 0 || value === "0")
      return "No";
    return "N/A";
  };

  const normalizeActivity = (name) =>
    String(name || "")
      .trim()
      .toLowerCase();
  const higherExamNames = new Set([
    "gate",
    "gre",
    "cat",
    "mba cet",
    "gmat",
    "toefl",
    "ielts",
  ]);

  const findEducationRecord = (...aliases) => {
    return pastEducation.find((record) =>
      aliases.includes(
        String(record.exam_name || record.degree || "")
          .trim()
          .toUpperCase(),
      ),
    );
  };

  const sscRecord = findEducationRecord("SSC", "X");
  const hsscRecord = findEducationRecord("HSSC", "XII");
  const diplomaRecord = findEducationRecord("DIPLOMA");

  let aptitudeActivity = null;
  let gdActivity = null;
  let piActivity = null;
  let psychometricActivity = null;
  let higherExamActivity = null;
  let otherActivity = null;

  careerActivities.forEach((activity) => {
    const key = normalizeActivity(activity.activity_name);
    if (!aptitudeActivity && key === "aptitude") {
      aptitudeActivity = activity;
      return;
    }
    if (!gdActivity && (key === "gd" || key.includes("group discussion"))) {
      gdActivity = activity;
      return;
    }
    if (!piActivity && (key === "pi" || key.includes("personal interview"))) {
      piActivity = activity;
      return;
    }
    if (!psychometricActivity && key.includes("psychometric")) {
      psychometricActivity = activity;
      return;
    }
    if (!higherExamActivity && higherExamNames.has(key)) {
      higherExamActivity = activity;
      return;
    }
    if (!otherActivity) {
      otherActivity = activity;
    }
  });

  const formatList = (value) => {
    if (Array.isArray(value)) return value.filter(Boolean).join(", ");
    return value;
  };

  const photoEl = modalRoot
    ? modalRoot.querySelector("#studentPhotoPreview")
    : document.getElementById("studentPhotoPreview");
  if (photoEl) {
    const src =
      pickValue(
        personalInfo.photo_url,
        student.photoUrl,
        rawStudent.image_url,
      ) || DEFAULT_PROFILE_ICON;
    photoEl.src = src;
    photoEl.onerror = () => {
      photoEl.src = DEFAULT_PROFILE_ICON;
    };
  }

  const deptEl = modalRoot
    ? modalRoot.querySelector("#studentDepartment")
    : document.getElementById("studentDepartment");
  if (deptEl) deptEl.textContent = "Computer Science Engineering";
  const deptLabelEl = modalRoot
    ? modalRoot.querySelector("#studentDepartmentLabel")
    : document.getElementById("studentDepartmentLabel");
  if (deptLabelEl)
    deptLabelEl.textContent = "Department of Computer Science Engineering";

  // Personal information
  setText("studentFullNam", pickValue(rawStudent.full_name, student.fullName));
  setText("studentSection", pickValue(rawStudent.section, student.section));
  setText("studentSemester", pickValue(rawStudent.semester, student.semester));
  setText("studentUID", pickValue(rawStudent.uid, student.uid));
  setText("studentYear", pickValue(rawStudent.year_of_admission, student.year));
  setText(
    "studentDOB",
    formatDate(pickValue(personalInfo.dob, rawStudent.dob, student.dob)),
  );
  setText(
    "studentGender",
    pickValue(personalInfo.gender, rawStudent.gender, student.gender),
  );
  setText(
    "studentBloodGroup",
    pickValue(
      personalInfo.blood_group,
      personalInfo.bloodGroup,
      rawStudent.blood_group,
      rawStudent.bloodGroup,
      student.bloodGroup,
    ),
  );
  setText(
    "studentCategory",
    pickValue(personalInfo.category, rawStudent.category, student.category),
  );
  setText(
    "studentAadhar",
    pickValue(
      personalInfo.aadhar_number,
      personalInfo.aadhar_no,
      rawStudent.aadhar_number,
      rawStudent.aadharNumber,
      student.aadharNumber,
    ),
  );
  setText(
    "studentMisUid",
    pickValue(
      personalInfo.mis_uid,
      personalInfo.misUID,
      rawStudent.mis_uid,
      rawStudent.misUID,
      student.misUID,
    ),
  );
  setText(
    "studentMobile",
    pickValue(personalInfo.mobile_no, rawStudent.mobile, student.mobile),
  );
  setText(
    "studentPersonalEmail",
    pickValue(
      personalInfo.personal_email,
      rawStudent.personal_email,
      rawStudent.email,
      student.email,
    ),
  );
  setText(
    "studentCollegeEmail",
    pickValue(
      personalInfo.college_email,
      rawStudent.college_email,
      student.collegeEmail,
    ),
  );
  setText(
    "studentLinkedIn",
    pickValue(
      personalInfo.linked_in_id,
      personalInfo.linkedInId,
      rawStudent.linked_in_id,
      student.linkedInId,
    ),
  );
  setText(
    "studentGithub",
    pickValue(
      personalInfo.github_id,
      personalInfo.github_url,
      personalInfo.githubId,
      rawStudent.github_id,
      rawStudent.githubId,
      student.githubId,
    ),
  );
  setText(
    "studentAddress",
    pickValue(
      personalInfo.permanent_address,
      rawStudent.permanent_address,
      student.permanentAddress,
    ),
  );
  setText(
    "studentPresentAddress",
    pickValue(
      personalInfo.present_address,
      personalInfo.current_address,
      rawStudent.present_address,
      rawStudent.presentAddress,
      student.presentAddress,
    ),
  );

  const guardianName = pickValue(
    personalInfo.emergency_contact_name,
    personalInfo.guardian_name,
    rawStudent.guardian_name,
    student.guardianName,
    student.emergencyContactName,
  );
  const guardianMobile = pickValue(
    personalInfo.emergency_contact_number,
    personalInfo.guardian_mobile,
    rawStudent.guardian_mobile,
    student.guardianMobile,
    student.emergencyContactNumber,
  );
  const guardianEmail = pickValue(
    personalInfo.emergency_contact_email,
    personalInfo.guardian_email,
    rawStudent.guardian_email,
    student.guardianEmail,
  );
  setText("studentGuardianName", guardianName);
  setText("studentGuardianMobile", guardianMobile);
  setText("studentGuardianEmail", guardianEmail);
  setText("parentGuardianName", guardianName);
  setText("parentGuardianMobile", guardianMobile);
  setText("parentGuardianEmail", guardianEmail);

  // Parent information
  setText(
    "fatherName",
    pickValue(
      personalInfo.father_name,
      rawStudent.father_name,
      student.fatherName,
    ),
  );
  setText(
    "fatherMobile",
    pickValue(
      personalInfo.father_mobile_no,
      rawStudent.father_mobile_no,
      student.fatherMobile,
    ),
  );
  setText(
    "fatherEmail",
    pickValue(
      personalInfo.father_email,
      rawStudent.father_email,
      student.fatherEmail,
    ),
  );
  setText(
    "fatherOccupation",
    pickValue(
      personalInfo.father_occupation,
      rawStudent.father_occupation,
      student.fatherOccupation,
    ),
  );
  setText(
    "motherName",
    pickValue(
      personalInfo.mother_name,
      rawStudent.mother_name,
      student.motherName,
    ),
  );
  setText(
    "motherMobile",
    pickValue(
      personalInfo.mother_mobile_no,
      rawStudent.mother_mobile_no,
      student.motherMobile,
    ),
  );
  setText(
    "motherEmail",
    pickValue(
      personalInfo.mother_email,
      rawStudent.mother_email,
      student.motherEmail,
    ),
  );
  setText(
    "motherOccupation",
    pickValue(
      personalInfo.mother_occupation,
      rawStudent.mother_occupation,
      student.motherOccupation,
    ),
  );

  // Academic information - before admission
  setText(
    "sscBoard",
    pickValue(
      sscRecord?.board,
      sscRecord?.education_board,
      sscRecord?.institution,
    ),
  );
  setText(
    "sscPercentage",
    sscRecord ? formatPercent(sscRecord.percentage) : "N/A",
  );
  setText("sscYear", sscRecord ? getValue(sscRecord.year_of_passing) : "N/A");
  setText(
    "hsscBoard",
    pickValue(
      hsscRecord?.board,
      hsscRecord?.education_board,
      hsscRecord?.institution,
    ),
  );
  setText(
    "hsscPercentage",
    hsscRecord ? formatPercent(hsscRecord.percentage) : "N/A",
  );
  setText(
    "hsscYear",
    hsscRecord ? getValue(hsscRecord.year_of_passing) : "N/A",
  );
  setText(
    "diplomaBoard",
    pickValue(
      diplomaRecord?.board,
      diplomaRecord?.education_board,
      diplomaRecord?.institution,
    ),
  );
  setText(
    "diplomaPercentage",
    diplomaRecord ? formatPercent(diplomaRecord.percentage) : "N/A",
  );
  setText(
    "diplomaYear",
    diplomaRecord ? getValue(diplomaRecord.year_of_passing) : "N/A",
  );
  setText(
    "entranceExamType",
    pickValue(rawStudent.entrance_exam_type, rawStudent.entranceExamType),
  );
  setText(
    "entranceExamScore",
    pickValue(rawStudent.entrance_exam_score, rawStudent.entranceExamScore),
  );
  setText(
    "entranceExamDate",
    formatDate(
      pickValue(rawStudent.entrance_exam_date, rawStudent.entranceExamDate),
    ),
  );
  setText(
    "otherExamDetails",
    pickValue(rawStudent.other_exam_details, rawStudent.otherExamDetails),
  );

  const pastEducationContainer = modalRoot
    ? modalRoot.querySelector("#pastEducationDetails")
    : document.getElementById("pastEducationDetails");
  if (pastEducationContainer) {
    if (pastEducation.length > 0) {
      let pastEducationHTML = "";
      pastEducation.forEach((record) => {
        pastEducationHTML += `<div class="education-record">
                    <strong>${getValue(
                      record.exam_name || record.degree,
                    )}</strong><br>
                    Percentage: ${formatPercent(
                      record.percentage,
                    )} | Year: ${getValue(record.year_of_passing)}
                </div>`;
      });
      pastEducationContainer.innerHTML = pastEducationHTML;
    } else {
      pastEducationContainer.innerHTML =
        "<p>No past education records available.</p>";
    }
  }

  // Academic information - after admission
  for (let sem = 1; sem <= 8; sem++) {
    setText(`sem${sem}SGPA`, "N/A");
  }

  let backlogCount = 0;
  const backlogSubjects = [];
  postAdmission.forEach((record) => {
    if (record?.semester >= 1 && record?.semester <= 8) {
      setText(`sem${record.semester}SGPA`, getValue(record.sgpa));
    }
    if (
      record?.backlog_subjects &&
      record.backlog_subjects !== "None" &&
      record.backlog_subjects !== "N/A"
    ) {
      backlogCount += 1;
      backlogSubjects.push(
        `Sem ${record.semester}: ${record.backlog_subjects}`,
      );
    }
  });

  setText("currentSemester", pickValue(rawStudent.semester, student.semester));
  setText("backlogCount", backlogCount);
  setText(
    "backlogSubjects",
    backlogSubjects.length > 0 ? backlogSubjects.join("; ") : "None",
  );
  setText(
    "currentSGPA",
    typeof student.sgpa === "number"
      ? student.sgpa.toFixed(2)
      : getValue(student.sgpa),
  );
  setText(
    "currentCGPA",
    typeof student.cgpa === "number"
      ? student.cgpa.toFixed(2)
      : getValue(student.cgpa),
  );

  const semesterPerformanceContainer = modalRoot
    ? modalRoot.querySelector("#semesterPerformanceDetails")
    : document.getElementById("semesterPerformanceDetails");
  if (semesterPerformanceContainer) {
    if (postAdmission.length > 0) {
      let semesterHTML = "";
      postAdmission.forEach((record) => {
        const backlogInfo =
          record.backlog_subjects &&
          record.backlog_subjects !== "None" &&
          record.backlog_subjects !== "N/A"
            ? ` | Backlogs: ${record.backlog_subjects}`
            : "";
        semesterHTML += `<div class="semester-record">
                    <strong>Semester ${record.semester}</strong><br>
                    SGPA: ${getValue(record.sgpa)}${backlogInfo}
                </div>`;
      });
      semesterPerformanceContainer.innerHTML = semesterHTML;
    } else {
      semesterPerformanceContainer.innerHTML =
        "<p>No semester performance records available.</p>";
    }
  }

  // Career development activities
  setText("aptitudeName", aptitudeActivity?.activity_name);
  setText("aptitudeScore", aptitudeActivity?.score_rank);
  setText("aptitudeDate", formatDate(aptitudeActivity?.exam_date));

  setText("gdName", gdActivity?.activity_name);
  setText("gdScore", gdActivity?.score_rank);
  setText("gdDate", formatDate(gdActivity?.exam_date));

  setText("piName", piActivity?.activity_name);
  setText("piScore", piActivity?.score_rank);
  setText("piDate", formatDate(piActivity?.exam_date));

  setText("psychometricName", psychometricActivity?.activity_name);
  setText("psychometricScore", psychometricActivity?.score_rank);
  setText("psychometricDate", formatDate(psychometricActivity?.exam_date));

  setText("higherExamType", higherExamActivity?.activity_name);
  setText("higherExamScore", higherExamActivity?.score_rank);
  setText("higherExamDate", formatDate(higherExamActivity?.exam_date));

  setText("otherExamName", otherActivity?.activity_name);
  setText("otherExamScore", otherActivity?.score_rank);
  setText("otherExamDate", formatDate(otherActivity?.exam_date));

  if (
    getValue(
      (modalRoot
        ? modalRoot.querySelector("#entranceExamType")
        : document.getElementById("entranceExamType")
      )?.textContent,
    ) === "N/A"
  ) {
    setText("entranceExamType", higherExamActivity?.activity_name);
  }
  if (
    getValue(
      (modalRoot
        ? modalRoot.querySelector("#entranceExamScore")
        : document.getElementById("entranceExamScore")
      )?.textContent,
    ) === "N/A"
  ) {
    setText("entranceExamScore", higherExamActivity?.score_rank);
  }
  if (
    getValue(
      (modalRoot
        ? modalRoot.querySelector("#entranceExamDate")
        : document.getElementById("entranceExamDate")
      )?.textContent,
    ) === "N/A"
  ) {
    setText("entranceExamDate", formatDate(higherExamActivity?.exam_date));
  }

  const careerActivitiesContainer = modalRoot
    ? modalRoot.querySelector("#allCareerActivitiesDetails")
    : document.getElementById("allCareerActivitiesDetails");
  if (careerActivitiesContainer) {
    if (careerActivities.length > 0) {
      let careerActivitiesHTML = "";
      careerActivities.forEach((activity, index) => {
        careerActivitiesHTML += `<div class="career-activity-record">
                    <strong>Activity ${index + 1}: ${getValue(
          activity.activity_name,
        )}</strong><br>
                    Score/Rank: ${getValue(
                      activity.score_rank,
                    )} | Date: ${formatDate(activity.exam_date)}
                </div>`;
      });
      careerActivitiesContainer.innerHTML = careerActivitiesHTML;
    } else {
      careerActivitiesContainer.innerHTML =
        "<p>No career activities available.</p>";
    }
  }

  // Project and internship details
  const miniProject = projects[0];
  const majorProject = projects[1];
  const ubaProject = projects[2];

  setText("project1Title", pickValue(miniProject?.title, miniProject?.name));
  setText(
    "project1Description",
    pickValue(
      miniProject?.description,
      miniProject?.guide,
      miniProject?.mentor,
    ),
  );
  setText("project2Title", pickValue(majorProject?.title, majorProject?.name));
  setText(
    "project2Description",
    pickValue(
      majorProject?.description,
      majorProject?.guide,
      majorProject?.mentor,
    ),
  );
  setText("ubaProjectTitle", pickValue(ubaProject?.title, ubaProject?.name));
  setText(
    "ubaProjectDescription",
    pickValue(ubaProject?.description, ubaProject?.guide, ubaProject?.mentor),
  );

  const internship1 = internships[0] || {};
  const internship2 = internships[1] || {};

  setText("internship1Company", internship1.company_name);
  setText(
    "internship1Title",
    pickValue(internship1.title, internship1.role, internship1.position),
  );
  setText("internship1Domain", internship1.domain);
  setText("internship1Description", internship1.description);
  setText("internship1Type", internship1.internship_type);
  setText("internship1Paid", internship1.paid_unpaid);
  setText(
    "internship1Duration",
    formatDuration(internship1.start_date, internship1.end_date),
  );

  setText("internship2Company", internship2.company_name);
  setText(
    "internship2Title",
    pickValue(internship2.title, internship2.role, internship2.position),
  );
  setText("internship2Domain", internship2.domain);
  setText("internship2Description", internship2.description);
  setText("internship2Type", internship2.internship_type);
  setText("internship2Paid", internship2.paid_unpaid);
  setText(
    "internship2Duration",
    formatDuration(internship2.start_date, internship2.end_date),
  );

  const projectsContainer = modalRoot
    ? modalRoot.querySelector("#allProjectsDetails")
    : document.getElementById("allProjectsDetails");
  if (projectsContainer) {
    if (projects.length > 0) {
      let projectsHTML = "";
      projects.forEach((project, index) => {
        projectsHTML += `<div class="project-record">
                    <strong>Project ${index + 1}: ${getValue(
          project.title || project.name,
        )}</strong><br>
                    Guide/Description: ${getValue(
                      project.description || project.guide,
                    )}
                </div>`;
      });
      projectsContainer.innerHTML = projectsHTML;
    } else {
      projectsContainer.innerHTML = "<p>No project records available.</p>";
    }
  }

  const internshipsContainer = modalRoot
    ? modalRoot.querySelector("#allInternshipsDetails")
    : document.getElementById("allInternshipsDetails");
  if (internshipsContainer) {
    if (internships.length > 0) {
      let internshipsHTML = "";
      internships.forEach((internship, index) => {
        const duration = formatDuration(
          internship.start_date,
          internship.end_date,
        );
        internshipsHTML += `<div class="internship-record">
                    <strong>Internship ${index + 1}: ${getValue(
          internship.company_name,
        )}</strong><br>
                    Domain: ${getValue(internship.domain)} | Type: ${getValue(
          internship.internship_type,
        )} | Paid: ${getValue(internship.paid_unpaid)}<br>
                    Duration: ${duration}
                </div>`;
      });
      internshipsContainer.innerHTML = internshipsHTML;
    } else {
      internshipsContainer.innerHTML =
        "<p>No internship records available.</p>";
    }
  }

  // Co-curricular activities
  const activityLists = modalRoot
    ? modalRoot.querySelectorAll(".activity-list")
    : document.querySelectorAll("#studentModal .activity-list");

  let participationHTML = "";
  participations.forEach((activity) => {
    participationHTML += `<p><strong>${getValue(
      activity.name,
    )}</strong><br>Date: ${formatDate(activity.date)} | Level: ${getValue(
      activity.level,
    )} | Awards: ${getValue(activity.awards)}</p>`;
  });
  if (activityLists[0]) {
    activityLists[0].innerHTML =
      participationHTML || "<p>No participation activities</p>";
  }

  let organizationHTML = "";
  organizations.forEach((activity) => {
    organizationHTML += `<p><strong>${getValue(
      activity.name,
    )}</strong><br>Date: ${formatDate(activity.date)} | Level: ${getValue(
      activity.level,
    )} | Remark: ${getValue(activity.remark)}</p>`;
  });
  if (activityLists[1]) {
    activityLists[1].innerHTML =
      organizationHTML || "<p>No organized activities</p>";
  }

  let sdpHTML = "";
  if (Array.isArray(sdpActivities)) {
    sdpActivities.forEach((record, index) => {
      const title = pickValue(
        record.title,
        record.name,
        `Program ${index + 1}`,
      );
      const agency = pickValue(record.agency, record.platform, record.provider);
      const duration = pickValue(record.duration, record.hours);
      const dateRange = formatDuration(
        record.date_from || record.start_date,
        record.date_to || record.end_date,
      );
      const details = [
        agency,
        duration ? `${duration} hrs` : "",
        dateRange !== "N/A" ? dateRange : "",
      ]
        .filter(Boolean)
        .join(" | ");
      sdpHTML += `<p><strong>${getValue(title)}</strong>${
        details ? `<br>${details}` : ""
      }</p>`;
    });
  }
  if (activityLists[2]) {
    activityLists[2].innerHTML =
      sdpHTML || "<p>No skill development records</p>";
  }

  // SWOC
  setText("strengths", pickValue(swoc.strengths, student.strengths));
  setText("weaknesses", pickValue(swoc.weaknesses, student.weaknesses));
  setText(
    "opportunities",
    pickValue(swoc.opportunities, student.opportunities),
  );
  setText("challenges", pickValue(swoc.challenges, student.challenges));

  // Career objective and skills
  setText(
    "careerObjectives",
    pickValue(careerObjective.career_goal, student.careerGoal),
  );
  setText(
    "placementType",
    pickValue(
      careerObjective.placement_type,
      careerObjective.placementType,
      rawStudent.placement_type,
      rawStudent.placementType,
    ),
  );
  setText(
    "higherStudiesType",
    pickValue(
      careerObjective.higher_studies_type,
      careerObjective.higherStudiesType,
      rawStudent.higher_studies_type,
      rawStudent.higherStudiesType,
    ),
  );
  setText(
    "careerDetails",
    pickValue(careerObjective.specific_details, student.careerDetails),
  );
  setText(
    "clarityPreparedness",
    pickValue(
      careerObjective.clarity_preparedness,
      student.clarityPreparedness,
    ),
  );
  setText(
    "campusPlacement",
    boolToText(
      pickValue(
        careerObjective.interested_in_campus_placement,
        student.interestedInCampusPlacement,
      ),
    ),
  );
  setText(
    "campusPlacementReasons",
    pickValue(
      careerObjective.campus_placement_reasons,
      student.campusPlacementReasons,
    ),
  );
  setText(
    "areasOfInterest",
    formatList(
      pickValue(
        careerObjective.areas_of_interest,
        careerObjective.areasOfInterest,
        rawStudent.areas_of_interest,
        rawStudent.areasOfInterest,
      ),
    ),
  );
  setText(
    "mentorInterest",
    pickValue(
      careerObjective.mentor_interest,
      careerObjective.mentorInterest,
      rawStudent.mentor_interest,
      rawStudent.mentorInterest,
    ),
  );
  setText(
    "technicalSoftSkills",
    pickValue(
      skills.technical_soft_skills,
      skills.technicalSoftSkills,
      rawStudent.technical_soft_skills,
      rawStudent.technicalSoftSkills,
    ),
  );
  setText(
    "additionalTechnicalSkills",
    pickValue(
      skills.additional_technical_skills,
      skills.additionalTechnicalSkills,
      rawStudent.additional_technical_skills,
      rawStudent.additionalTechnicalSkills,
    ),
  );
  setText(
    "additionalSoftSkills",
    pickValue(
      skills.additional_soft_skills,
      skills.additionalSoftSkills,
      rawStudent.additional_soft_skills,
      rawStudent.additionalSoftSkills,
    ),
  );
  setText(
    "programmingLanguages",
    pickValue(skills.programming_languages, student.programmingLanguages),
  );
  setText(
    "technologiesFrameworks",
    pickValue(skills.technologies_frameworks, student.technologiesFrameworks),
  );
  setText(
    "familiarToolsPlatforms",
    pickValue(skills.familiar_tools_platforms, student.familiarToolsPlatforms),
  );
  setText(
    "expectations",
    pickValue(
      careerObjective.institution_expectations,
      careerObjective.institutionExpectations,
      skills.expectations,
      student.expectations,
    ),
  );

  const domainContainer = modalRoot
    ? modalRoot.querySelector("#domainOfInterest")
    : document.getElementById("domainOfInterest");
  const domainsText = pickValue(skills.domains_of_interest, student.domain);
  if (domainContainer) {
    if (domainsText && domainsText !== "N/A") {
      const domains = String(domainsText)
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);
      domainContainer.innerHTML =
        domains.length > 0
          ? domains.map((d) => `<span class="tag">${d}</span>`).join("")
          : '<span class="empty-value">N/A</span>';
    } else {
      domainContainer.innerHTML = '<span class="empty-value">N/A</span>';
    }
  }

  // Show the modal
  document.querySelector(".dialog-container").classList.remove("hidden");
  document.querySelector(".details-container").classList.remove("hidden");
  document.getElementsByTagName("body")[0].classList.add("overflow-hidden");
}

function closeDialog() {
  if (confirm("Are you sure you want to close?")) {
    document.querySelector(".dialog-container").classList.add("hidden");
    document.querySelector(".details-container").classList.add("hidden");
    document
      .getElementsByTagName("body")[0]
      .classList.remove("overflow-hidden");
  }
}

function toggleSection(header) {
  const section = header.parentElement;
  section.classList.toggle("expanded");
  const icon = header.querySelector(".expand-icon");
  icon.textContent = section.classList.contains("expanded") ? "▲" : "▼";
}

function printDialog() {
  window.print();
}

function downloadData() {
  // Get the student details modal content
  const modalContent = document.getElementById("studentModal");
  if (!modalContent) {
    alert("No student data available for download.");
    return;
  }

  // Extract all data from the modal
  const studentData = extractStudentData(modalContent);

  // Create a formatted document for PDF export
  const content = document.createElement("div");
  content.innerHTML = generatePDFContent(studentData);

  // Configure PDF options
  const opt = {
    margin: 10,
    filename: `student_report_${studentData.uid}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  };

  // Generate and download PDF
  html2pdf().set(opt).from(content).save();
}

function extractStudentData(modal) {
  // Helper function to get text content or default value
  const getValue = (id, defaultValue = "N/A") => {
    const element = modal.querySelector(`#${id}`);
    return element ? element.textContent.trim() || defaultValue : defaultValue;
  };

  // Extract all data from the modal
  return {
    // Personal Information
    department: getValue("studentDepartment", "Computer Engineering"),
    fullName: getValue("studentFullNam"),
    section: getValue("studentSection"),
    semester: getValue("studentSemester"),
    uid: getValue("studentUID"),
    year: getValue("studentYear"),
    dob: getValue("studentDOB"),
    gender: getValue("studentGender"),
    mobile: getValue("studentMobile"),
    personalEmail: getValue("studentPersonalEmail"),
    collegeEmail: getValue("studentCollegeEmail"),
    linkedin: getValue("studentLinkedIn"),
    address: getValue("studentAddress"),
    emergencyContactName: getValue("studentGuardianName"),
    emergencyContactNumber: getValue("studentGuardianMobile"),

    // Parent's Information
    fatherName: getValue("fatherName"),
    fatherMobile: getValue("fatherMobile"),
    fatherEmail: getValue("fatherEmail"),
    fatherOccupation: getValue("fatherOccupation"),
    motherName: getValue("motherName"),
    motherMobile: getValue("motherMobile"),
    motherEmail: getValue("motherEmail"),
    motherOccupation: getValue("motherOccupation"),

    // Academic Information - Before Admission
    sscPercentage: getValue("sscPercentage"),
    sscYear: getValue("sscYear"),
    hsscPercentage: getValue("hsscPercentage"),
    hsscYear: getValue("hsscYear"),

    // Academic Information - After Admission
    sem1SGPA: getValue("sem1SGPA"),
    sem2SGPA: getValue("sem2SGPA"),
    sem3SGPA: getValue("sem3SGPA"),
    sem4SGPA: getValue("sem4SGPA"),
    sem5SGPA: getValue("sem5SGPA"),
    sem6SGPA: getValue("sem6SGPA"),
    sem7SGPA: getValue("sem7SGPA"),
    sem8SGPA: getValue("sem8SGPA"),
    currentSemester: getValue("currentSemester"),
    backlogCount: getValue("backlogCount"),
    backlogSubjects: getValue("backlogSubjects"),
    currentSGPA: getValue("currentSGPA"),
    currentCGPA: getValue("currentCGPA"),

    // Career Development Activities
    aptitudeScore: getValue("aptitudeScore"),
    aptitudeDate: getValue("aptitudeDate"),
    cocubesScore: getValue("gdScore"),
    cocubesDate: getValue("gdDate"),
    gateScore: getValue("piScore"),
    gateDate: getValue("piDate"),
    otherExamName: getValue("otherExamName"),
    otherExamScore: getValue("otherExamScore"),
    otherExamDate: getValue("otherExamDate"),

    // Project and Internship Details
    project1Title: getValue("project1Title"),
    project1Description: getValue("project1Description"),
    project2Title: getValue("project2Title"),
    project2Description: getValue("project2Description"),
    internship1Company: getValue("internship1Company"),
    internship1Domain: getValue("internship1Domain"),
    internship1Type: getValue("internship1Type"),
    internship1Paid: getValue("internship1Paid"),
    internship1Duration: getValue("internship1Duration"),
    internship2Company: getValue("internship2Company"),
    internship2Domain: getValue("internship2Domain"),
    internship2Type: getValue("internship2Type"),
    internship2Paid: getValue("internship2Paid"),
    internship2Duration: getValue("internship2Duration"),

    // SWOC Analysis
    strengths: getValue("strengths"),
    weaknesses: getValue("weaknesses"),
    opportunities: getValue("opportunities"),
    challenges: getValue("challenges"),

    // Career Objectives and Skills
    careerObjectives: getValue("careerObjectives"),
    careerDetails: getValue("careerDetails"),
    clarityPreparedness: getValue("clarityPreparedness"),
    campusPlacement: getValue("campusPlacement"),
    campusPlacementReasons: getValue("campusPlacementReasons"),
    programmingLanguages: getValue("programmingLanguages"),
    technologiesFrameworks: getValue("technologiesFrameworks"),
    familiarToolsPlatforms: getValue("familiarToolsPlatforms"),
    domainOfInterest: getValue("domainOfInterest"),
    expectations: getValue("expectations"),
  };
}

function generatePDFContent(data) {
  return `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px;">
            <h1 style="color: #2563eb; text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
                🎓 Student Information Report
            </h1>
            
            <div style="margin: 20px 0;">
                <h2 style="color: #1e40af; background: #f0f5ff; padding: 10px; border-radius: 5px;">Student's Personal Information</h2>
                <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
                    <tr><td style="border: 1px solid #ddd; padding: 8px; width: 30%;"><strong>Department</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.department
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Full Name</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.fullName
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Section</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.section
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Semester</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.semester
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Roll No./UID</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.uid
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Year of Admission</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.year
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Date of Birth</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.dob
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Gender</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.gender
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Mobile No.</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.mobile
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Personal Email ID</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.personalEmail
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>College Email ID</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.collegeEmail
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>LinkedIn ID</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.linkedin
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Permanent Address</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.address
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Local Guardian Name</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.emergencyContactName
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Local Guardian Mobile</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.emergencyContactNumber
                    }</td></tr>
                </table>
            </div>
            
            <div style="margin: 20px 0;">
                <h2 style="color: #1e40af; background: #f0f5ff; padding: 10px; border-radius: 5px;">Parent's Information</h2>
                <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
                    <tr><td style="border: 1px solid #ddd; padding: 8px; width: 30%;"><strong>Father's Name</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.fatherName
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Father's Mobile No.</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.fatherMobile
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Father's Email ID</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.fatherEmail
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Father's Occupation</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.fatherOccupation
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Mother's Name</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.motherName
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Mother's Mobile No.</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.motherMobile
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Mother's Email ID</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.motherEmail
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Mother's Occupation</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.motherOccupation
                    }</td></tr>
                </table>
            </div>
            
            <div style="margin: 20px 0;">
                <h2 style="color: #1e40af; background: #f0f5ff; padding: 10px; border-radius: 5px;">Academic Information - Before Admission</h2>
                <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
                    <tr><td style="border: 1px solid #ddd; padding: 8px; width: 30%;"><strong>SSC (X) Percentage/Grade</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.sscPercentage
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>SSC Year of Passing</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.sscYear
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>HSSC (XII) Percentage/Grade</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.hsscPercentage
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>HSSC Year of Passing</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.hsscYear
                    }</td></tr>
                </table>
            </div>
            
            <div style="margin: 20px 0;">
                <h2 style="color: #1e40af; background: #f0f5ff; padding: 10px; border-radius: 5px;">Academic Information - After Admission</h2>
                <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
                    <tr><td style="border: 1px solid #ddd; padding: 8px; width: 30%;"><strong>Semester 1 SGPA</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.sem1SGPA
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Semester 2 SGPA</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.sem2SGPA
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Semester 3 SGPA</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.sem3SGPA
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Semester 4 SGPA</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.sem4SGPA
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Semester 5 SGPA</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.sem5SGPA
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Semester 6 SGPA</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.sem6SGPA
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Semester 7 SGPA</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.sem7SGPA
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Semester 8 SGPA</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.sem8SGPA
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Current Semester</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.currentSemester
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Number of Active Backlogs</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.backlogCount
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Backlog Subject Names</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.backlogSubjects
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Current SGPA</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.currentSGPA
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Current CGPA</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.currentCGPA
                    }</td></tr>
                </table>
            </div>
            
            <div style="margin: 20px 0;">
                <h2 style="color: #1e40af; background: #f0f5ff; padding: 10px; border-radius: 5px;">Performance in Career Development Activities</h2>
                <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
                    <tr><td style="border: 1px solid #ddd; padding: 8px; width: 30%;"><strong>Aptitude Score/Rank</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.aptitudeScore
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Aptitude Date</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.aptitudeDate
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Group Discussion Score/Outcome</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.cocubesScore
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Group Discussion Date</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.cocubesDate
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Personal Interview Score/Outcome</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.gateScore
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Personal Interview Date</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.gateDate
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Other Exam Name</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.otherExamName
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Other Exam Score/Rank</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.otherExamScore
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Other Exam Date</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.otherExamDate
                    }</td></tr>
                </table>
            </div>
            
            <div style="margin: 20px 0;">
                <h2 style="color: #1e40af; background: #f0f5ff; padding: 10px; border-radius: 5px;">Project and Internship Details</h2>
                <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
                    <tr><td style="border: 1px solid #ddd; padding: 8px; width: 30%;"><strong>Mini Project Title</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.project1Title
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Mini Project Guide</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.project1Description
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Major Project Title</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.project2Title
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Major Project Guide</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.project2Description
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Internship 1 Company</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.internship1Company
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Internship 1 Domain</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.internship1Domain
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Internship 1 Type</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.internship1Type
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Internship 1 Paid/Unpaid</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.internship1Paid
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Internship 1 Duration</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.internship1Duration
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Internship 2 Company</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.internship2Company
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Internship 2 Domain</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.internship2Domain
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Internship 2 Type</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.internship2Type
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Internship 2 Paid/Unpaid</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.internship2Paid
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Internship 2 Duration</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.internship2Duration
                    }</td></tr>
                </table>
            </div>
            
            <div style="margin: 20px 0;">
                <h2 style="color: #1e40af; background: #f0f5ff; padding: 10px; border-radius: 5px;">SWOC Analysis</h2>
                <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
                    <tr><td style="border: 1px solid #ddd; padding: 8px; width: 30%;"><strong>Strengths</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.strengths
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Weaknesses</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.weaknesses
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Opportunities</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.opportunities
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Challenges</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.challenges
                    }</td></tr>
                </table>
            </div>
            
            <div style="margin: 20px 0;">
                <h2 style="color: #1e40af; background: #f0f5ff; padding: 10px; border-radius: 5px;">Career Objectives and Skills</h2>
                <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
                    <tr><td style="border: 1px solid #ddd; padding: 8px; width: 30%;"><strong>Career Objectives</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.careerObjectives
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Specific Details</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.careerDetails
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Clarity and Preparedness</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.clarityPreparedness
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Interested in Campus Placement</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.campusPlacement
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Campus Placement Reasons</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.campusPlacementReasons
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Programming Languages</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.programmingLanguages
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Technologies/Frameworks</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.technologiesFrameworks
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Familiar Tools/Platforms</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.familiarToolsPlatforms
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Domain of Interest</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.domainOfInterest
                    }</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Expectations from Institute/Department</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${
                      data.expectations
                    }</td></tr>
                </table>
            </div>
            
            <div style="text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px;">
                Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
            </div>
        </div>
    `;
}

// Student Allocation Functions
function renderAllocation() {
  const tbody = document.getElementById("allocationTableBody");
  tbody.innerHTML = "";

  teachers.forEach((teacher) => {
    const assignedCount = teacher.studentsAssigned
      ? teacher.studentsAssigned.length
      : 0;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${teacher.name}</strong></td>
      <td>${teacher.uid}</td>
      <td>${teacher.email}</td>
      <td><span class="tag">${assignedCount}</span></td>
      <td>20</td>
      <td>
        <button class="btn-sm btn-allocate" onclick="showAllocationInterface(${
          teacher.id
        })" ${assignedCount >= 20 ? "disabled" : ""}>
          ➕ Allocate
        </button>
        
        <button class="btn-sm btn-remove" onclick="removeAllocatedStudents(${
          teacher.id
        })" ${assignedCount === 0 ? "disabled" : ""}>
          🗑️ Remove
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

async function showAllocationInterface(teacherId) {
  selectedTeacherForAllocation = teacherId;
  console.log(teachers);
  const teacher = teachers.find((t) => t.id === teacherId);
  if (!teacher) return;

  const assignedStudents = teacher.studentsAssigned || [];
  if (assignedStudents.length >= 20) {
    alert("This teacher already has the maximum number of students (20).");
    return;
  }

  document.getElementById(
    "selectedTeacherTitle",
  ).textContent = `Allocating Students to ${teacher.name}`;

  // Clear the grid and show initial message
  const grid = document.getElementById("studentAllocationGrid");
  grid.innerHTML = `
        <div class="status-message info">
            <p>🎯 <strong>Allocation Interface Ready</strong></p>
            <p style="font-size: 14px;">Choose an allocation method above to get started.</p>
        </div>`;

  document.getElementById("allocationInterface").classList.remove("hidden");
}

async function confirmAllocation() {
  if (!selectedTeacherForAllocation) return;

  const generatedStudentIDs = document.querySelectorAll(".selected-student-id");
  const makeArray = Array.from(generatedStudentIDs);
  const selectedStudentIds = [];

  makeArray.forEach((student) =>
    selectedStudentIds.push(parseInt(student.innerText)),
  );

  if (selectedStudentIds.length === 0) {
    alert("Please select at least one student to allocate.");
    return;
  }

  try {
    const token = localStorage.getItem("access_token");
    const response = await fetch(
      `http://localhost:5002/api/admin/faculty/${selectedTeacherForAllocation}/mentees/confirm`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_ids: selectedStudentIds,
        }),
      },
    );

    if (response.ok) {
      const result = await response.json();
      alert(`✅ ${result.message || "Successfully assigned students!"}`);

      // Refresh data from API
      await loadTeachersFromAPI();
      await loadStudentsFromAPI();

      cancelAllocation();
      renderAllocation();
      renderStudents();
    } else {
      const error = await response.json();
      alert(`❌ Failed to assign students: ${error.error || "Unknown error"}`);
    }
  } catch (error) {
    console.error("Error confirming allocation:", error);
    alert("❌ Error connecting to server. Please try again.");
  }
}

function cancelAllocation() {
  document.getElementById("allocationInterface").classList.add("hidden");
  selectedTeacherForAllocation = null;
}

// Random Allocation Functions
async function generateRandomAllocation() {
  if (!selectedTeacherForAllocation) {
    alert("No teacher selected for allocation.");
    return;
  }

  const teacher = teachers.find((t) => t.id === selectedTeacherForAllocation);
  if (!teacher) {
    alert("Teacher not found.");
    return;
  }

  try {
    const token = localStorage.getItem("access_token");

    const response = await fetch(
      `http://localhost:5002/api/admin/faculty/${selectedTeacherForAllocation}/mentees/generate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    console.log(`📡 Random Allocation API Response Status: ${response.status}`);
    const grid = document.getElementById("studentAllocationGrid");

    if (response.ok) {
      const suggestedStudents = await response.json();
      console.log(`🎲 Random students received:`, suggestedStudents);

      if (suggestedStudents.length === 0) {
        grid.innerHTML = `
                    <div class="status-message info">
                        <p>📋 <strong>No students available for random allocation</strong></p>
                        <p style="font-size: 14px;">All students are already assigned to mentors.</p>
                    </div>`;
      } else {
        // Display the randomly selected students
        grid.innerHTML = `
                    <div class="status-message success" style="margin-bottom: 15px;">
                        <p>🎲 <strong>Random Allocation Generated!</strong></p>
                        <p style="font-size: 14px;">${suggestedStudents.length} students have been randomly selected for allocation.</p>
                    </div>`;

        console.log("hello", suggestedStudents);

        suggestedStudents.forEach((student) => {
          const div = document.createElement("div");
          div.className = "student-allocation-item selected";
          div.innerHTML = `
                        <span><strong>${student.full_name}</strong><br>
                        <small>${student.uid} - Sem ${student.semester}, Sec ${student.section} <span class = "selected-student-id">${student.id}</span></small></span>
                    `;
          grid.appendChild(div);
        });
      }
    } else {
      const errorText = await response.text();
      console.log(
        `📡 Random Allocation API Response (${response.status}):`,
        errorText,
      );

      try {
        const errorData = JSON.parse(errorText);
        if (
          errorData.error &&
          errorData.error.includes("No unassigned students")
        ) {
          grid.innerHTML = `
                        <div class="status-message info">
                            <p>📋 <strong>No unassigned students available</strong></p>
                            <p style="font-size: 14px;">All students are already assigned to mentors.</p>
                        </div>`;
        } else if (
          errorData.error &&
          errorData.error.includes("maximum number")
        ) {
          grid.innerHTML = `
                        <div class="status-message warning">
                            <p>⚠️ <strong>Maximum allocation reached</strong></p>
                            <p style="font-size: 14px;">${errorData.error}</p>
                        </div>`;
        } else {
          grid.innerHTML = `
                        <div class="status-message error">
                            <p>⚠️ <strong>Unable to generate random allocation</strong></p>
                            <p style="font-size: 14px;">${
                              errorData.error || "Unknown error occurred"
                            }</p>
                        </div>`;
        }
      } catch (parseError) {
        grid.innerHTML = `
                    <div class="status-message error">
                        <p>❌ <strong>Error generating random allocation</strong></p>
                        <p style="font-size: 14px;">Please try again later.</p>
                    </div>`;
      }
    }
  } catch (error) {
    console.error(
      "❌ Network/Connection Error during random allocation:",
      error,
    );
    document.getElementById("studentAllocationGrid").innerHTML = `
            <div class="status-message error">
                <p>🌐 <strong>Connection Error</strong></p>
                <p style="font-size: 14px;">Unable to connect to server. Please check your connection and try again.</p>
            </div>`;
  }
}

async function loadUnassignedStudents() {
  if (!selectedTeacherForAllocation) {
    alert("No teacher selected for allocation.");
    return;
  }

  const teacher = teachers.find((t) => t.id === selectedTeacherForAllocation);
  if (!teacher) {
    alert("Teacher not found.");
    return;
  }

  // Check if teacher already has maximum students
  const assignedStudents = teacher.studentsAssigned || [];
  if (assignedStudents.length >= 20) {
    alert("This teacher already has the maximum number of students (20).");
    return;
  }

  try {
    const token = localStorage.getItem("access_token");
    console.log(
      `👥 Loading unassigned students for teacher ID: ${selectedTeacherForAllocation}`,
    );

    const response = await fetch(
      `http://localhost:5002/api/admin/faculty/${selectedTeacherForAllocation}/mentees/generate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    console.log(`📡 Manual Selection API Response Status: ${response.status}`);
    const grid = document.getElementById("studentAllocationGrid");

    if (response.ok) {
      const suggestedStudents = await response.json();
      console.log(`👥 Unassigned students received:`, suggestedStudents);
      grid.innerHTML = "";

      if (suggestedStudents.length === 0) {
        grid.innerHTML = `
                    <div class="status-message info">
                        <p>📋 <strong>No unassigned students available</strong></p>
                        <p style="font-size: 14px;">All students are already assigned to mentors.</p>
                    </div>`;
      } else {
        grid.innerHTML = `
                    <div class="status-message info" style="margin-bottom: 15px;">
                        <p>👥 <strong>Manual Selection Mode</strong></p>
                        <p style="font-size: 14px;">Select students you want to allocate to this teacher.</p>
                    </div>`;

        suggestedStudents.forEach((student) => {
          const div = document.createElement("div");
          div.className = "student-allocation-item";
          div.innerHTML = `
                        <span><strong>${student.full_name}</strong><br>
                        <small>${student.uid} - Sem ${student.semester}, Sec ${student.section} <span class = "selected-student-id">${student.id}</span></small></span>
                        
                    `;
          grid.appendChild(div);
        });
      }
    } else {
      const errorText = await response.text();
      console.log(
        `📡 Manual Selection API Response (${response.status}):`,
        errorText,
      );

      try {
        const errorData = JSON.parse(errorText);
        if (
          errorData.error &&
          errorData.error.includes("No unassigned students")
        ) {
          grid.innerHTML = `
                        <div class="status-message info">
                            <p>📋 <strong>No unassigned students available</strong></p>
                            <p style="font-size: 14px;">All students are already assigned to mentors.</p>
                        </div>`;
        } else {
          grid.innerHTML = `
                        <div class="status-message error">
                            <p>⚠️ <strong>Unable to load unassigned students</strong></p>
                            <p style="font-size: 14px;">${
                              errorData.error || "Unknown error occurred"
                            }</p>
                        </div>`;
        }
      } catch (parseError) {
        grid.innerHTML = `
                    <div class="status-message error">
                        <p>❌ <strong>Error loading unassigned students</strong></p>
                        <p style="font-size: 14px;">Please try again later.</p>
                    </div>`;
      }
    }
  } catch (error) {
    console.error(
      "❌ Network/Connection Error during manual selection:",
      error,
    );
    document.getElementById("studentAllocationGrid").innerHTML = `
            <div class="status-message error">
                <p>🌐 <strong>Connection Error</strong></p>
                <p style="font-size: 14px;">Unable to connect to server. Please check your connection and try again.</p>
            </div>`;
  }
}

async function viewAllocatedStudents(teacherId) {
  console.log("DEBUG: viewAllocatedStudents called with teacherId:", teacherId);
  const teacher = teachers.find((t) => t.id === teacherId);
  if (!teacher) {
    console.log("DEBUG: Teacher not found for ID:", teacherId);
    return;
  }
  console.log("DEBUG: Found teacher:", teacher);

  try {
    const token = localStorage.getItem("access_token");
    console.log("DEBUG: Token:", token ? "Present" : "Missing");

    const url = `http://localhost:5002/api/admin/faculty/${teacherId}/mentees`;
    console.log("DEBUG: Making request to:", url);
    console.log("DEBUG: Request method: GET");
    console.log("DEBUG: Request headers:", {
      Authorization: `Bearer ${
        token ? token.substring(0, 20) + "..." : "Missing"
      }`,
      "Content-Type": "application/json",
    });

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log("DEBUG: Response status:", response.status);
    console.log("DEBUG: Response headers:", response.headers);

    if (response.ok) {
      const assignedStudents = await response.json();
      console.log("DEBUG: Assigned students:", assignedStudents);
      let studentsHtml = "";

      if (assignedStudents.length === 0) {
        studentsHtml = "<p>No students assigned to this teacher.</p>";
      } else {
        studentsHtml = `
          <table class="data-table">
            <thead>
              <tr><th>Name</th><th>UID</th><th>Semester</th><th>Section</th><th>Year</th><th>Actions</th></tr>
            </thead>
            <tbody>
        `;

        assignedStudents.forEach((student) => {
          studentsHtml += `
            <tr>
              <td>${student.full_name}</td>
              <td>${student.uid}</td>
              <td>${student.semester}</td>
              <td>${student.section}</td>
              <td>${student.year_of_admission}</td>
              <td>
                <button class="btn-sm btn-delete" onclick="deallocateStudent(${teacherId}, ${student.id}, '${student.uid}')">
                  🗑 Remove
                </button>
              </td>
            </tr>
          `;
        });

        studentsHtml += "</tbody></table>";
      }

      // Show in a modal or alert (you can create a proper modal later)
      const popup = window.open(
        "",
        "_blank",
        "width=800,height=600,scrollbars=yes",
      );
      popup.document.write(`
        <html>
          <head>
            <title>Students assigned to ${teacher.name}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .data-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              .data-table th, .data-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              .data-table th { background-color: #f2f2f2; }
              .btn-sm { padding: 4px 8px; font-size: 12px; cursor: pointer; }
              .btn-delete { background-color: #dc3545; color: white; border: none; }
            </style>
          </head>
          <body>
            <h2>Students assigned to ${teacher.name} (${teacher.uid})</h2>
            ${studentsHtml}
            <br><button onclick="window.close()">Close</button>
          </body>
        </html>
      `);
    } else {
      console.log("DEBUG: Response not OK, status:", response.status);
      const errorText = await response.text();
      console.log("DEBUG: Error response text:", errorText);
      alert("❌ Failed to load assigned students");
    }
  } catch (error) {
    console.error("Error loading assigned students:", error);
    console.log("DEBUG: Error details:", error);
    alert("❌ Error connecting to server");
  }
}

async function deallocateStudent(teacherId, studentId, studentUid) {
  if (
    !confirm(
      `Are you sure you want to remove student ${studentUid} from this teacher?`,
    )
  ) {
    return;
  }

  try {
    const token = localStorage.getItem("access_token");

    // Use the proper remove endpoint
    const response = await fetch(
      `http://localhost:5002/api/admin/faculty/${teacherId}/mentees/remove`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_ids: [studentId],
        }),
      },
    );

    if (response.ok) {
      alert(
        `✅ Successfully removed student ${studentUid} from teacher assignment`,
      );

      // Refresh data
      await loadTeachersFromAPI();
      await loadStudentsFromAPI();
      renderAllocation();
      renderStudents();

      // Close the popup and refresh the view
      if (window.opener && !window.opener.closed) {
        window.opener.location.reload();
      }
    } else {
      const error = await response.json();
      alert(`❌ Failed to remove student: ${error.error || "Unknown error"}`);
    }
  } catch (error) {
    console.error("Error deallocating student:", error);
    alert("❌ Error connecting to server. Please try again.");
  }
}

// Bulk Upload Functions
document
  .getElementById("bulkUploadStudent")
  .addEventListener("change", handleStudentUpload);
document
  .getElementById("bulkUploadFaculty")
  .addEventListener("change", handleFacultyUpload);

// Function to handle student bulk upload
async function handleStudentUpload(event) {
  const file = event.target.files[0];
  if (!file) {
    alert("No file selected.");
    return;
  }

  const token = localStorage.getItem("access_token");
  if (!token) {
    window.location.href("../login.html");
    return;
  }

  const reader = new FileReader();
  reader.onload = async function (e) {
    try {
      const fileData = new Uint8Array(e.target.result);
      const workbook = XLSX.read(fileData, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert sheet to JSON array, assuming first row is headers
      const students = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        raw: false,
      });
      console.log("Raw parsed student data:", students); // Debug: Log raw data

      // Remove header row and map to expected object format
      const studentData = students.slice(1).map((row) => ({
        uid: row[0]?.trim() || "",
        full_name: row[1]?.trim() || "",
        semester: row[2]?.trim() || "",
        section: row[3]?.trim() || "",
        year_of_admission: row[4]?.trim() || "",
      }));

      // Filter out invalid rows
      const validStudents = studentData.filter(
        (student) => student.uid && student.uid.trim(),
      );
      console.log("Valid student data:", validStudents); // Debug: Log filtered data

      if (validStudents.length === 0) {
        alert("No valid student data found in the file.");
        return;
      }

      // Send to backend
      const response = await fetch(
        "http://localhost:5002/api/auth/register/bulk",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(validStudents),
        },
      );

      console.log("Response status:", response.status); // Debug: Log status

      // Check if response is OK
      if (!response.ok) {
        let errorResponse;
        try {
          errorResponse = await response.json();
        } catch {
          errorResponse = {};
        }
        throw new Error(
          `HTTP error! Status: ${response.status}, Message: ${
            errorResponse.msg || errorResponse.error || response.statusText
          }`,
        );
      }

      // Parse response
      const responseData = await response.json();
      console.log("Student bulk upload response:", responseData); // Debug: Log response

      // Process results
      let successCount = 0;
      let failureCount = 0;
      let failureMessages = [];
      if (responseData.result && Array.isArray(responseData.result)) {
        responseData.result.forEach((result) => {
          console.log(
            `Student ${result.uid}: ${result.status} ${result.error || ""}`,
          );
          if (result.status === "success") {
            successCount++;
          } else {
            failureCount++;
            failureMessages.push(`Student ${result.uid}: ${result.error}`);
          }
        });
      } else {
        console.warn("Unexpected response format:", responseData);
        alert(
          "Unexpected response format from server. Check console for details.",
        );
        return;
      }

      // Show appropriate alert
      if (failureCount === 0) {
        alert(
          `Student bulk upload completed. ${successCount} succeeded, ${failureCount} failed.`,
        );
      } else {
        alert(
          `Student bulk upload completed. ${successCount} succeeded, ${failureCount} failed.\nErrors:\n${failureMessages.join(
            "\n",
          )}`,
        );
      }

      // Reload data
      await loadUsersFromAPI();
      await loadStatisticsFromAPI();
      await loadStudentsFromAPI();
    } catch (error) {
      console.error("Error uploading students:", error, error.stack);
      alert(`Error uploading students: ${error.message}`);
    }
  };
  reader.onerror = function () {
    console.error("Error reading file");
    alert("Error reading the uploaded file.");
  };
  reader.readAsArrayBuffer(file);
}

// Function to handle faculty bulk upload
async function handleFacultyUpload(event) {
  const file = event.target.files[0];
  if (!file) {
    alert("No file selected.");
    return;
  }

  const token = localStorage.getItem("access_token");
  if (!token) {
    alert("You must be logged in as an admin to perform this action.");
    return;
  }

  const reader = new FileReader();
  reader.onload = async function (e) {
    try {
      const fileData = new Uint8Array(e.target.result);
      const workbook = XLSX.read(fileData, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert sheet to JSON array, assuming first row is headers
      const faculties = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        raw: false,
      });
      console.log("Raw parsed faculty data:", faculties); // Debug: Log raw data

      // Remove header row and map to expected object format
      const facultyData = faculties.slice(1).map((row) => ({
        email: row[0]?.trim() || "",
        first_name: row[1]?.trim() || "",
        last_name: row[2]?.trim() || "",
        contact_number: row[3]?.trim() || "",
        password: row[4]?.trim() || undefined,
      }));

      // Filter out invalid rows
      const validFaculties = facultyData.filter(
        (faculty) => faculty.email && faculty.email.trim(),
      );
      console.log("Valid faculty data:", validFaculties); // Debug: Log filtered data

      if (validFaculties.length === 0) {
        alert("No valid faculty data found in the file.");
        return;
      }

      // Send to backend
      const response = await fetch(
        "http://localhost:5002/api/auth/register/faculty/bulk",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(validFaculties),
        },
      );

      console.log("Response status:", response.status); // Debug: Log status

      // Check if response is OK
      if (!response.ok) {
        let errorResponse;
        try {
          errorResponse = await response.json();
        } catch {
          errorResponse = {};
        }
        throw new Error(
          `HTTP error! Status: ${response.status}, Message: ${
            errorResponse.msg || errorResponse.error || response.statusText
          }`,
        );
      }

      // Parse response
      const responseData = await response.json();
      console.log("Faculty bulk upload response:", responseData); // Debug: Log response

      // Process results
      let successCount = 0;
      let failureCount = 0;
      let failureMessages = [];
      if (responseData.result && Array.isArray(responseData.result)) {
        responseData.result.forEach((result) => {
          console.log(
            `Faculty ${result.email}: ${result.status} ${result.error || ""}`,
          );
          if (result.status === "success") {
            successCount++;
          } else {
            failureCount++;
            failureMessages.push(`Faculty ${result.email}: ${result.error}`);
          }
        });
      } else {
        console.warn("Unexpected response format:", responseData);
        alert(
          "Unexpected response format from server. Check console for details.",
        );
        return;
      }

      // Show appropriate alert
      if (failureCount === 0) {
        alert(
          `Faculty bulk upload completed. ${successCount} succeeded, ${failureCount} failed.`,
        );
      } else {
        alert(
          `Faculty bulk upload completed. ${successCount} succeeded, ${failureCount} failed.\nErrors:\n${failureMessages.join(
            "\n",
          )}`,
        );
      }

      // Reload data
      await loadUsersFromAPI();
      await loadStatisticsFromAPI();
      await loadTeachersFromAPI();
    } catch (error) {
      console.error("Error uploading faculty:", error, error.stack);
      alert(`Error uploading faculty: ${error.message}`);
    }
  };
  reader.onerror = function () {
    console.error("Error reading file");
    alert("Error reading the uploaded file.");
  };
  reader.readAsArrayBuffer(file);
}

function downloadExcelFormat() {
  // Create a formatted document for PDF export
  const content = document.createElement("div");
  content.innerHTML = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px;">
            <h1 style="color: #2563eb; text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
                📥 Bulk Upload Format Guide
            </h1>
            
            <div style="margin: 20px 0;">
                <h2 style="color: #1e40af;">📋 Required Format</h2>
                <p>Use the following format for bulk uploading students and faculty:</p>
                
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <h3 style="color: #475569;">Student Format:</h3>
                    <p style="color: #64748b; font-style: italic; margin-bottom: 10px;">
                        CSV columns must follow this exact order: UID, Full Name, Semester, Section, Year of Admission
                    </p>
                    <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
                        <tr style="background: #e2e8f0;">
                            <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Field</th>
                            <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Description</th>
                            <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Example</th>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #cbd5e1; padding: 8px;">UID</td>
                            <td style="border: 1px solid #cbd5e1; padding: 8px;">Student UID</td>
                            <td style="border: 1px solid #cbd5e1; padding: 8px;">21CE001</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #cbd5e1; padding: 8px;">Full Name</td>
                            <td style="border: 1px solid #cbd5e1; padding: 8px;">Student Full Name</td>
                            <td style="border: 1px solid #cbd5e1; padding: 8px;">Jane Smith</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #cbd5e1; padding: 8px;">Semester</td>
                            <td style="border: 1px solid #cbd5e1; padding: 8px;">Current Semester</td>
                            <td style="border: 1px solid #cbd5e1; padding: 8px;">4</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #cbd5e1; padding: 8px;">Section</td>
                            <td style="border: 1px solid #cbd5e1; padding: 8px;">Class Section</td>
                            <td style="border: 1px solid #cbd5e1; padding: 8px;">A</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #cbd5e1; padding: 8px;">Year of Admission</td>
                            <td style="border: 1px solid #cbd5e1; padding: 8px;">Admission Year</td>
                            <td style="border: 1px solid #cbd5e1; padding: 8px;">2021</td>
                        </tr>
                    </table>
                </div>
                
                <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <h3 style="color: #92400e;">Faculty Format:</h3>
                    <p style="color: #92400e; font-style: italic; margin-bottom: 10px;">
                        CSV columns must follow this exact order: Email, First Name, Last Name, Contact Number, Password
                    </p>
                    <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
                        <tr style="background: #fde68a;">
                            <th style="border: 1px solid #f59e0b; padding: 8px; text-align: left;">Field</th>
                            <th style="border: 1px solid #f59e0b; padding: 8px; text-align: left;">Description</th>
                            <th style="border: 1px solid #f59e0b; padding: 8px; text-align: left;">Example</th>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #f59e0b; padding: 8px;">Email</td>
                            <td style="border: 1px solid #f59e0b; padding: 8px;">Faculty Email (must end with @stvincentngp.edu.in)</td>
                            <td style="border: 1px solid #f59e0b; padding: 8px;">john.doe@stvincentngp.edu.in</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #f59e0b; padding: 8px;">First Name</td>
                            <td style="border: 1px solid #f59e0b; padding: 8px;">Faculty First Name</td>
                            <td style="border: 1px solid #f59e0b; padding: 8px;">John</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #f59e0b; padding: 8px;">Last Name</td>
                            <td style="border: 1px solid #f59e0b; padding: 8px;">Faculty Last Name</td>
                            <td style="border: 1px solid #f59e0b; padding: 8px;">Doe</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #f59e0b; padding: 8px;">Contact Number</td>
                            <td style="border: 1px solid #f59e0b; padding: 8px;">Phone Number</td>
                            <td style="border: 1px solid #f59e0b; padding: 8px;">+91 9876543210</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #f59e0b; padding: 8px;">Password</td>
                            <td style="border: 1px solid #f59e0b; padding: 8px;">Password (optional - system will generate if blank)</td>
                            <td style="border: 1px solid #f59e0b; padding: 8px;">SecurePassword123</td>
                        </tr>
                    </table>
                </div>
                
                <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <h3 style="color: #065f46;">📝 Important Instructions:</h3>
                    <ul style="line-height: 1.6;">
                        <li><strong>Follow the column order exactly as specified</strong></li>
                        <li>Save your data in <span class="highlight">CSV format</span> (.csv extension)</li>
                        <li>Ensure all required fields are filled (password is optional for faculty)</li>
                        <li>Faculty emails <strong>must</strong> end with @stvincentngp.edu.in</li>
                        <li>Separate values with commas</li>
                        <li>Do not include column headers in your CSV file</li>
                        <li>Upload one file at a time</li>
                        <li>For faculty uploads, if password is not provided, the system will generate a secure random password</li>
                    </ul>
                </div>

                <div style="background: #fffbeb; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #f59e0b;">
                    <h3 style="color: #b45309;">⚠️ Common Mistakes to Avoid:</h3>
                    <ul style="line-height: 1.6;">
                        <li>Incorrect column order</li>
                        <li>Missing required fields</li>
                        <li>Incorrect email format for faculty</li>
                        <li>Including headers in the CSV data</li>
                        <li>Using formats other than CSV</li>
                    </ul>
                </div>
            </div>
        </div>
    `;

  // Configure PDF options
  const opt = {
    margin: 10,
    filename: "bulk_upload_format_guide.pdf",
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  };

  // Generate and download PDF
  html2pdf().set(opt).from(content).save();
}

// Update Statistics
function updateStats() {
  // Stats are now loaded dynamically from API
  loadStatisticsFromAPI();
}

// Logout function
async function logout() {
  const token = localStorage.getItem("access_token");

  if (!token) {
    console.log("No token found, already logged out.");
    window.location.href = "../login.html";
    return;
  }

  try {
    const response = await fetch("http://localhost:5002/api/auth/logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
    });

    if (response.ok) {
      console.log("Successfully logged out");
    } else {
      console.error("Logout failed:", await response.json());
    }
  } catch (error) {
    console.error("Error during logout:", error);
  }

  localStorage.removeItem("access_token");
  window.location.href = "../login.html";
}

// Change Password Modal Functions
function showChangePasswordModal() {
  openModal("changePasswordModal");
  document.getElementById("adminChangePasswordForm").reset();
  document.getElementById("changePasswordMessage").style.display = "none";
  document.getElementById("passwordStrength").style.display = "none";
}

function closeChangePasswordModal() {
  closeModal("changePasswordModal", true);
  document.getElementById("adminChangePasswordForm").reset();
  document.getElementById("changePasswordMessage").style.display = "none";
  document.getElementById("passwordStrength").style.display = "none";
}

function showChangePasswordMessage(message, type) {
  const messageElement = document.getElementById("changePasswordMessage");
  messageElement.textContent = message;
  messageElement.style.display = "block";

  if (type === "success") {
    messageElement.style.background = "#dcfce7";
    messageElement.style.color = "#166534";
    messageElement.style.border = "1px solid #bbf7d0";
  } else {
    messageElement.style.background = "#fef2f2";
    messageElement.style.color = "#dc2626";
    messageElement.style.border = "1px solid #fecaca";
  }
}

function checkPasswordStrength(password) {
  const strengthElement = document.getElementById("passwordStrength");
  let strength = 0;
  let feedback = "";

  if (password.length >= 8) strength++;
  if (password.match(/[a-z]/)) strength++;
  if (password.match(/[A-Z]/)) strength++;
  if (password.match(/[0-9]/)) strength++;
  if (password.match(/[^a-zA-Z0-9]/)) strength++;

  switch (strength) {
    case 0:
    case 1:
      feedback = "❌ Very Weak";
      strengthElement.style.color = "#dc2626";
      break;
    case 2:
      feedback = "⚠️ Weak";
      strengthElement.style.color = "#f59e0b";
      break;
    case 3:
      feedback = "⚠️ Fair";
      strengthElement.style.color = "#f59e0b";
      break;
    case 4:
      feedback = "✅ Good";
      strengthElement.style.color = "#10b981";
      break;
    case 5:
      feedback = "✅ Strong";
      strengthElement.style.color = "#059669";
      break;
  }

  strengthElement.textContent = feedback;

  // Show the strength indicator when there's content
  if (password.length > 0) {
    strengthElement.style.display = "block";
  } else {
    strengthElement.style.display = "none";
  }
}

function togglePasswordVisibility(inputId, element) {
  const input = document.getElementById(inputId);
  if (input.type === "password") {
    input.type = "text";
    element.textContent = "🙈";
  } else {
    input.type = "password";
    element.textContent = "👁";
  }
}

function showPasswordStrength() {
  const strengthElement = document.getElementById("passwordStrength");
  if (strengthElement) {
    strengthElement.style.display = "block";
  }
}

function hidePasswordStrength() {
  const strengthElement = document.getElementById("passwordStrength");
  if (strengthElement) {
    strengthElement.style.display = "none";
  }
}

// Initialize change password form event listener
document.addEventListener("DOMContentLoaded", function () {
  const changePasswordForm = document.getElementById("adminChangePasswordForm");
  if (changePasswordForm) {
    changePasswordForm.addEventListener("submit", handleAdminPasswordChange);
  }
});

async function handleAdminPasswordChange(e) {
  e.preventDefault();

  const old_password = document.getElementById("adminOldPassword").value.trim();
  const new_password = document.getElementById("adminNewPassword").value.trim();
  const confirmPassword = document
    .getElementById("adminConfirmPassword")
    .value.trim();

  // Validation
  if (!old_password || !new_password || !confirmPassword) {
    showChangePasswordMessage("Please fill in all fields", "error");
    return;
  }

  if (new_password !== confirmPassword) {
    showChangePasswordMessage("New passwords do not match", "error");
    return;
  }

  if (new_password.length < 8) {
    showChangePasswordMessage(
      "Password must be at least 8 characters long",
      "error",
    );
    return;
  }

  if (old_password === new_password) {
    showChangePasswordMessage(
      "New password must be different from current password",
      "error",
    );
    return;
  }

  try {
    const token = localStorage.getItem("access_token");
    const response = await fetch(
      "http://localhost:5002/api/auth/change-password",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          old_password,
          new_password,
        }),
      },
    );

    const data = await response.json();

    if (response.ok) {
      showChangePasswordMessage("✅ Password changed successfully!", "success");
      setTimeout(() => {
        closeChangePasswordModal();
      }, 2000);
    } else {
      showChangePasswordMessage(
        `❌ Failed to change password: ${data.message || "Unknown error"}`,
        "error",
      );
    }
  } catch (error) {
    console.error("Error changing password:", error);
    alert("❌ Error connecting to server. Please try again.");
  }
}

// Remove allocated students function
async function removeAllocatedStudents(teacherId) {
  const teacher = teachers.find((t) => t.id === teacherId);
  if (!teacher) {
    alert("Teacher not found.");
    return;
  }

  const assignedStudents = teacher.studentsAssigned || [];
  if (assignedStudents.length === 0) {
    alert("This teacher has no students assigned to remove.");
    return;
  }

  // Show confirmation dialog with student list
  const studentList = assignedStudents
    .map((studentId) => {
      const student = students.find((s) => s.id === studentId);
      return student
        ? `${student.full_name || student.firstName} ${
            student.lastName || ""
          } (${student.uid})`
        : `Student ID: ${studentId}`;
    })
    .join("\n");

  const confirmRemove = confirm(
    `Are you sure you want to remove students from ${teacher.name}?\n\nStudents to be removed:\n${studentList}\n\nThis action cannot be undone.`,
  );

  if (!confirmRemove) {
    return;
  }

  try {
    const token = localStorage.getItem("access_token");
    const response = await fetch(
      `http://localhost:5002/api/admin/faculty/${teacherId}/mentees/remove`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_ids: assignedStudents,
        }),
      },
    );

    if (response.ok) {
      const result = await response.json();
      alert(`✅ ${result.message || "Successfully removed students!"}`);

      // Refresh data from API
      await loadTeachersFromAPI();
      await loadStudentsFromAPI();

      // Update the UI
      renderAllocation();
      renderStudents();
    } else {
      const error = await response.json();
      alert(`❌ Failed to remove students: ${error.error || "Unknown error"}`);
    }
  } catch (error) {
    console.error("Error removing students:", error);
    alert("❌ Error connecting to server. Please try again.");
  }
}
