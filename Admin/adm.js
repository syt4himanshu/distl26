// Data Arrays - All loaded from API
let teachers = [];
let students = [];
let users = [];

let allocations = {}; // { teacherId: [studentIds...] }
let selectedTeacherForAllocation = null;

// ========== API LOADING FUNCTIONS ==========

// Load teachers/faculty from backend API
async function loadTeachersFromAPI() {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch('http://localhost:5002/api/admin/faculty', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const teachersData = await response.json();


            teachers.length = 0; // Clear existing array
            teachers.push(...teachersData);


            renderTeachers();
            renderAllocation(); // Update allocation table after teachers are loaded
        } else {
            console.error('❌ Failed to load teachers:', response.status);
        }
    } catch (error) {
        console.error('❌ Error loading teachers:', error);
    }
}

// Load users from backend API
async function loadUsersFromAPI() {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch('http://localhost:5002/api/admin/users', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const usersData = await response.json();


            users.length = 0; // Clear existing array
            users.push(...usersData);


            renderUsers();
        } else {
            console.error('❌ Failed to load users:', response.status);
        }
    } catch (error) {
        console.error('❌ Error loading users:', error);
    }
}

// Load dashboard statistics from backend API
async function loadStatisticsFromAPI() {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch('http://localhost:5002/api/admin/statistics', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const stats = await response.json();


            // Update the statistics cards
            document.getElementById('totalUsers').textContent = stats.totalUsers;
            document.getElementById('totalStudents').textContent = stats.totalStudents;
            document.getElementById('totalTeachers').textContent = stats.totalTeachers;
            document.getElementById('activeUsers').textContent = stats.activeUsers;


        } else {
            console.error('❌ Failed to load statistics:', response.status);
        }
    } catch (error) {
        console.error('❌ Error loading statistics:', error);
    }
}

// Load students from backend API
async function loadStudentsFromAPI() {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch('http://localhost:5002/api/students', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const studentsData = await response.json();


            // Transform API data to match frontend expectations
            students.length = 0; // Clear existing array

            studentsData.forEach(student => {
                // Extract nested objects or provide defaults
                const personalInfo = student.personal_info || {};
                const careerObjective = student.career_objective || {};
                const swoc = student.swoc || {};
                const skills = student.skills || {};

                // Calculate current SGPA from post_admission_records
                const currentSemester = student.semester || 0;
                const currentRecord = student.post_admission_records?.find(record => record.semester === currentSemester);
                const currentSGPA = currentRecord?.sgpa || 0.0;

                // Calculate CGPA from all semesters
                const allSGPA = student.post_admission_records?.map(record => record.sgpa).filter(sgpa => sgpa && sgpa > 0) || [];
                const cgpa = allSGPA.length > 0 ? (allSGPA.reduce((sum, sgpa) => sum + sgpa, 0) / allSGPA.length).toFixed(2) : 0.0;

                // Get backlog count from current semester
                const currentBacklogSubjects = currentRecord?.backlog_subjects || '';
                const backlogCount = currentBacklogSubjects ? currentBacklogSubjects.split(',').length : 0;

                students.push({
                    // Basic info
                    id: student.id,
                    uid: student.uid,
                    firstName: student.first_name || 'Unknown',
                    middleName: student.middle_name || '',
                    lastName: student.last_name || 'Student',
                    fullName: student.full_name || `${student.first_name || ''} ${student.last_name || ''}`.trim(),
                    semester: student.semester || 0,
                    section: student.section || 'N/A',
                    year: student.year_of_admission || new Date().getFullYear(),
                    mentorId: student.mentor_id,

                    // Personal info (from personal_info object)
                    email: personalInfo.personal_email || personalInfo.college_email || `${student.uid}@student.edu`,
                    mobile: personalInfo.mobile_no || "+91 9876543210",
                    linkedInId: personalInfo.linked_in_id || 'N/A',
                    permanentAddress: personalInfo.permanent_address || "Address not provided",
                    fatherName: personalInfo.father_name || "Father Name",
                    motherName: personalInfo.mother_name || "Mother Name",
                    dob: personalInfo.dob || 'N/A',
                    gender: personalInfo.gender || 'N/A',
                    collegeEmail: personalInfo.college_email || 'N/A',
                    emergencyContactName: personalInfo.emergency_contact_name || 'N/A',
                    emergencyContactNumber: personalInfo.emergency_contact_number || 'N/A',
                    fatherEmail: personalInfo.father_email || 'N/A',
                    fatherMobile: personalInfo.father_mobile_no || 'N/A',
                    fatherOccupation: personalInfo.father_occupation || 'N/A',
                    motherEmail: personalInfo.mother_email || 'N/A',
                    motherMobile: personalInfo.mother_mobile_no || 'N/A',
                    motherOccupation: personalInfo.mother_occupation || 'N/A',

                    // Academic info - calculated from post_admission_records
                    backlogs: backlogCount,
                    backlogSubjects: currentBacklogSubjects || 'N/A',
                    sgpa: currentSGPA,
                    cgpa: parseFloat(cgpa),

                    // Career info (from career_objective object)
                    careerGoal: careerObjective.career_goal || "Placement",
                    careerDetails: careerObjective.specific_details || 'N/A',
                    clarityPreparedness: careerObjective.clarity_preparedness || 'N/A',
                    interestedInCampusPlacement: careerObjective.interested_in_campus_placement !== undefined ?
                        careerObjective.interested_in_campus_placement : true,
                    campusPlacementReasons: careerObjective.campus_placement_reasons || 'N/A',

                    // Skills (from skills object)
                    domain: skills.domains_of_interest || "General",
                    programmingLanguages: skills.programming_languages || 'N/A',
                    technologiesFrameworks: skills.technologies_frameworks || 'N/A',
                    familiarToolsPlatforms: skills.familiar_tools_platforms || 'N/A',
                    expectations: skills.expectations || 'N/A',
                    softSkillsRating: student.softSkillsRating || 3,

                    // SWOC (from swoc object)
                    strengths: swoc.strengths || 'N/A',
                    weaknesses: swoc.weaknesses || 'N/A',
                    opportunities: swoc.opportunities || 'N/A',
                    challenges: swoc.challenges || 'N/A',

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
                    cocurricular_participations: student.cocurricular_participations || [],
                    cocurricular_organizations: student.cocurricular_organizations || [],

                    // Store the complete student object for reference
                    _rawData: student,
                });
            });


            renderStudents();
        } else {
            console.error('❌ Failed to load students:', response.status);
        }
    } catch (error) {
        console.error('❌ Error loading students:', error);
    }
}

// Initialize API loading when page loads  
document.addEventListener('DOMContentLoaded', function () {
    loadStudentsFromAPI();
    loadTeachersFromAPI();
    loadUsersFromAPI();
    loadStatisticsFromAPI();
});

// Initialize
window.addEventListener('load', function () {
    renderUsers();
    renderTeachers();
    loadStudentsFromAPI(); // Load students from API instead of hardcoded
    updateStats();

    // Debug: Log initial tab state

    checkTabsDebug();
});

function checkTabsDebug() {
    const sections = document.querySelectorAll('.section');
    const tabs = document.querySelectorAll('.nav-tab');

}

// Tab Switching - Simplified version
// Tab Switching - Simplified version
function switchTab(tabId) {


    try {
        // Hide all tab sections (not nested ones like in student modal)
        const allTabSections = document.querySelectorAll(".tab-section");


        allTabSections.forEach((sec, index) => {
            sec.classList.add('hidden');
            sec.style.display = 'none';

        });

        // Show the selected section
        const targetSection = document.getElementById(tabId);
        if (targetSection) {
            targetSection.classList.remove('hidden');
            targetSection.style.display = 'block';

        } else {
            console.error(`❌ Section not found: ${tabId}`);
            return;
        }

        // Update active tab
        const allTabs = document.querySelectorAll(".nav-tab");
        allTabs.forEach((btn, index) => {
            btn.classList.remove("active");

        });

        const activeTab = document.querySelector(`button[onclick*="switchTab('${tabId}')"]`);
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
    if (role === 'student') {
        document.getElementById("studentForm").style.display = "block";
        document.getElementById("facultyForm").style.display = "none";
        document.getElementById("passwordEditForm").style.display = "none";
    } else if (role === 'faculty') {
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
        year_of_admission: yearNum
    };



    fetch("http://localhost:5002/api/admin/users", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(studentData)
    })
        .then(response => {

            if (!response.ok) {
                // For error responses, try to get JSON error details
                return response.json().then(errorData => {
                    throw new Error(JSON.stringify(errorData));
                }).catch(() => {
                    throw new Error(`HTTP error! status: ${response.status}`);
                });
            }
            return response.json();
        })
        .then(data => {
            alert("Student created successfully!");

            cancelStudent();
            loadStudentsFromAPI();
            loadTeachersFromAPI();
            loadUsersFromAPI();
            loadStatisticsFromAPI();
            // Refresh user list or perform other actions
        })
        .catch(error => {
            console.error("Error:", error);
            try {
                const errorObj = JSON.parse(error.message);
                alert("Error: " + (errorObj.error || errorObj.details || error.message));
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

    if (!email.includes('@')) {
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
        contact_number: contact
    };



    fetch("http://localhost:5002/api/admin/users", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(facultyData)
    })
        .then(response => {

            if (!response.ok) {
                return response.json().then(errorData => {
                    throw new Error(JSON.stringify(errorData));
                }).catch(() => {
                    throw new Error(`HTTP error! status: ${response.status}`);
                });
            }
            return response.json();
        })
        .then(data => {
            alert("Faculty created successfully!");

            cancelFaculty();
            loadStudentsFromAPI();
            loadTeachersFromAPI();
            loadUsersFromAPI();
            loadStatisticsFromAPI();
            // Refresh user list or perform other actions
        })
        .catch(error => {
            console.error("Error:", error);
            try {
                const errorObj = JSON.parse(error.message);
                alert("Error: " + (errorObj.error || errorObj.details || error.message));
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
        document.getElementById("studentYearOfAdmission").value = student.year_of_admission || "";
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
        document.getElementById("facultyFirstName").value = faculty.first_name || "";
        document.getElementById("facultyLastName").value = faculty.last_name || "";
        document.getElementById("facultyContactNumber").value = faculty.contact_number || "";
        document.getElementById("editIndex").value = index;

        document.getElementById("facultyForm").style.display = "block";
        document.getElementById("roleSelectionForm").style.display = "none";
        document.getElementById("studentForm").style.display = "none";
    }
}

async function savePassword() {
    const newPassword = document.getElementById("newPassword").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value.trim();
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
        new_password: newPassword
    };

    try {
        const token = localStorage.getItem('access_token');
        const user = users[editIndex];

        const response = await fetch(`http://localhost:5002/admin/reset-password`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(passwordData)
        });

        if (response.ok) {
            const result = await response.json();

            alert(`✅ Password updated successfully for user "${userId}"`);

            // Hide form and clear fields
            document.getElementById("passwordEditForm").style.display = "none";
            document.getElementById("newPassword").value = "";
            document.getElementById("confirmPassword").value = "";
        } else {
            const error = await response.json();
            alert(`❌ Failed to update password: ${error.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error updating password:', error);
        alert('❌ Error connecting to server. Please try again.');
    }
}

function cancelPasswordEdit() {
    document.getElementById("passwordEditForm").style.display = "none";
    document.getElementById("newPassword").value = "";
    document.getElementById("confirmPassword").value = "";
}

function renderUsers() {
    const tbody = document.getElementById("userTableBody");
    tbody.innerHTML = "";

    users.forEach((user, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
      <td><strong>${user.username}</strong></td>
      <td><span class="tag ${user.role}">${user.role}</span></td>
      <td><span class="tag" style="background: #dcfce7; color: #166534;">${user.status}</span></td>
      <td>${user.created}</td>
      <td>
        <button class="btn-sm btn-password" onclick="changeUserPassword(${index})" style="background: #8b5cf6; color: white;">🔐 Password</button>
        <button class="btn-sm btn-delete" onclick="deleteUser(${index})">🗑 Delete</button>
      </td>
    `;
        tbody.appendChild(row);
    });
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
        const token = localStorage.getItem('access_token');
        const response = await fetch(`http://localhost:5002/api/admin/users/${user.id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

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
            alert(`❌ Failed to delete user: ${error.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('❌ Error connecting to server. Please try again.');
    }
}

function filterUsers() {
    const search = document.getElementById("searchInput").value.toLowerCase();
    const roleFilter = document.getElementById("roleFilter").value;
    const rows = document.querySelectorAll("#userTableBody tr");

    rows.forEach(row => {
        const userId = row.cells[0].textContent.toLowerCase();
        const role = row.cells[1].textContent.toLowerCase();

        const matchesSearch = userId.includes(search);
        const matchesRole = roleFilter === "" || role.includes(roleFilter);

        if (matchesSearch && matchesRole) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    });
}

// Teachers Management
function renderTeachers() {
    const tbody = document.getElementById("teacherTableBody");
    tbody.innerHTML = "";

    teachers.forEach(teacher => {
        const assignedCount = teacher.studentsAssigned ? teacher.studentsAssigned.length : 0;
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
    const search = document.getElementById("teacherSearchInput").value.toLowerCase();
    const rows = document.querySelectorAll("#teacherTableBody tr");

    rows.forEach(row => {
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
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) return;



    const assignedStudents = teacher.studentsAssigned || [];

    const studentDetails = assignedStudents.map(studentId => {
        const student = students.find(s => s.uid === studentId);

        return student ? `${student.fullName} (${student.uid})` : studentId;
    }).join('<br>');

    document.getElementById("teacherModalBody").innerHTML = `
    <table class="data-table">
      <tr><th>Name</th><td>${teacher.name}</td></tr>
      <tr><th>UID</th><td>${teacher.uid}</td></tr>
      <tr><th>Email</th><td>${teacher.email}</td></tr>
      <tr><th>Contact</th><td>${teacher.contact}</td></tr>
      <tr><th>Students Assigned</th><td>${assignedStudents.length}/20</td></tr>
      <tr><th>Assigned Students</th><td>${studentDetails || 'None'}</td></tr>
    </table>
  `;
    document.getElementById("teacherModal").style.display = "flex";
}

function closeTeacherModal() {
    document.getElementById("teacherModal").style.display = "none";
}

// Students Management
function renderStudents() {
    const tbody = document.getElementById("studentTableBody");
    tbody.innerHTML = "";

    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; color: #666;">No students found. Students are being loaded from the database...</td></tr>';
        return;
    }

    students.forEach(student => {
        // Handle both API format and detailed format
        const studentId = student.uid;
        const uid = student.uid || 'N/A';
        const name = student.fullName || `${student.firstName || student.first_name || ''} ${student.lastName || student.last_name || ''}`.trim() || 'Unknown';
        const semester = student.semester || 'N/A';
        const section = student.section || 'N/A';
        const year = student.year_of_admission || student.year || 'N/A';
        const sgpa = student.sgpa || 'N/A';
        const domain = student.domain || ['General'];
        const careerGoal = student.careerGoal || 'Not specified';

        const mentor = student.mentorId ?
            teachers.find(t => t.id === student.mentorId)?.name || 'Unknown' :
            'Not Assigned';

        const row = document.createElement("tr");
        row.innerHTML = `
      <td><strong>${uid}</strong></td>
      <td>${name}</td>
      <td>${semester}</td>
      <td>${section}</td>
      <td>${year}</td>
      <td>${sgpa}</td>
      <td>
        <div class="tags">
          ${Array.isArray(domain) ? domain.map(d => `<span class="tag">${d}</span>`).join('') : '<span class="tag">General</span>'}
        </div>
      </td>
      <td><span class="tag ${careerGoal === 'Placement' ? 'placement' : 'higher-studies'}">${careerGoal}</span></td>
      <td>${mentor}</td>
      <td>
        <button class="btn-sm btn-view" onclick="viewStudent('${studentId}')">👁 View</button>
        <small style="display: block; color: #666; margin-top: 5px;">Edit via User Mgmt</small>
      </td>
    `;
        tbody.appendChild(row);
    });
}

function filterStudents() {
    const search = document.getElementById("studentSearchInput").value.toLowerCase();
    const domain = document.getElementById("domainFilter").value;
    const year = document.getElementById("yearFilter").value;
    const section = document.getElementById("sectionFilter").value;
    const softSkills = document.getElementById("softSkillsFilter").value;
    const careerGoal = document.getElementById("careerGoalFilter").value;

    const rows = document.querySelectorAll("#studentTableBody tr");

    rows.forEach((row, index) => {
        const student = students[index];
        if (!student) return;

        const matchesSearch = !search ||
            student.firstName.toLowerCase().includes(search) ||
            student.lastName.toLowerCase().includes(search) ||
            student.uid.toLowerCase().includes(search);

        const matchesDomain = !domain || student.domain.includes(domain);
        const matchesYear = !year || student.year.toString() === year;
        const matchesSection = !section || student.section === section;
        const matchesSoftSkills = !softSkills || student.softSkillsRating.toString() === softSkills;
        const matchesCareerGoal = !careerGoal || student.careerGoal === careerGoal;

        if (matchesSearch && matchesDomain && matchesYear && matchesSection && matchesSoftSkills && matchesCareerGoal) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    });
}

// ========== STUDENT MANAGEMENT FUNCTIONS (DISABLED) ==========
// Student creation is now only available through User Management

// Show message that student creation should be done through User Management
function showAddStudentForm() {
    alert("💡 Student creation has been moved to User Management!\n\n" +
        "To add a new student:\n" +
        "1. Go to User Management section\n" +
        "2. Click 'Add User'\n" +
        "3. Set role to 'student'\n" +
        "4. The student will appear in Students List once they have a complete profile");
}

function cancelStudentEdit() {
    // Disabled
}



function editStudent(studentId) {
    // For now, editing is disabled - students should be managed through User Management
    alert("💡 Student editing is currently disabled. Use User Management to modify user accounts.");
}

async function deleteStudent(userId) {
    const token = localStorage.getItem('access_token'); // or your JWT storage method
    const apiUrl = `http://localhost:5002/api/admin/users/${userId}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Include JWT token
            }
        });

        const data = await response.json();

        if (response.ok) {

            return { success: true, message: data.message };
            alert("Student deleted Successfully")
        } else {
            console.error('Error deleting user:', data.error);
            return {
                success: false,
                error: data.error,
                details: data.details,
                status: response.status
            };
        }
    } catch (error) {
        console.error('Network error:', error);
        return {
            success: false,
            error: 'Network error',
            details: error.message
        };
    }
}

// ========== END STUDENT MANAGEMENT FUNCTIONS ==========

function viewStudent(studentId) {


    const student = students.find(s => s.uid == studentId);
    if (!student) return;



    // Helper function to handle null/undefined values
    const getValue = (value, defaultValue = 'N/A') => {
        return value !== null && value !== undefined && value !== '' ? value : defaultValue;
    };

    // Helper function to format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('en-CA'); // YYYY-MM-DD format
        } catch (e) {
            return dateString;
        }
    };

    // Helper function to format internship duration
    const formatDuration = (start, end) => {
        if (!start || !end) return 'N/A';
        return `${formatDate(start)} to ${formatDate(end)}`;
    };

    // Populate the detailed student information

    document.getElementById("studentFullNam").textContent = getValue(student.fullName)
    document.getElementById("studentSection").textContent = getValue(student.section);
    document.getElementById("studentSemester").textContent = getValue(student.semester);
    document.getElementById("studentUID").textContent = getValue(student.uid);
    document.getElementById("studentYear").textContent = getValue(student.year);

    // Personal info - now directly from student object (flattened)
    document.getElementById("studentDOB").textContent = formatDate(student.dob);
    document.getElementById("studentGender").textContent = getValue(student.gender);
    document.getElementById("studentMobile").textContent = getValue(student.mobile);
    document.getElementById("studentPersonalEmail").textContent = getValue(student.email);
    document.getElementById("studentCollegeEmail").textContent = getValue(student.collegeEmail);
    document.getElementById("studentLinkedIn").textContent = getValue(student.linkedInId);
    document.getElementById("studentAddress").textContent = getValue(student.permanentAddress);
    document.getElementById("emergencyContactName").textContent = getValue(student.emergencyContactName);
    document.getElementById("emergencyContactNumber").textContent = getValue(student.emergencyContactNumber);

    // Parent information - now directly from student object (flattened)
    document.getElementById("fatherName").textContent = getValue(student.fatherName);
    document.getElementById("fatherMobile").textContent = getValue(student.fatherMobile);
    document.getElementById("fatherEmail").textContent = getValue(student.fatherEmail);
    document.getElementById("fatherOccupation").textContent = getValue(student.fatherOccupation);
    document.getElementById("motherName").textContent = getValue(student.motherName);
    document.getElementById("motherMobile").textContent = getValue(student.motherMobile);
    document.getElementById("motherEmail").textContent = getValue(student.motherEmail);
    document.getElementById("motherOccupation").textContent = getValue(student.motherOccupation);

    // Academic information - Before Admission
    const pastEducation = student.past_education_records || [];
    const sscRecord = pastEducation.find(record => record.exam_name === 'SSC');
    const hsscRecord = pastEducation.find(record => record.exam_name === 'HSSC');

    document.getElementById("sscPercentage").textContent = sscRecord ? getValue(sscRecord.percentage + '%') : 'N/A';
    document.getElementById("sscYear").textContent = sscRecord ? getValue(sscRecord.year_of_passing) : 'N/A';
    document.getElementById("hsscPercentage").textContent = hsscRecord ? getValue(hsscRecord.percentage + '%') : 'N/A';
    document.getElementById("hsscYear").textContent = hsscRecord ? getValue(hsscRecord.year_of_passing) : 'N/A';

    // Display all past education records in detail
    const pastEducationContainer = document.getElementById("pastEducationDetails");
    if (pastEducationContainer && pastEducation.length > 0) {
        let pastEducationHTML = '';
        pastEducation.forEach(record => {
            pastEducationHTML += `<div class="education-record">
                <strong>${getValue(record.exam_name)}</strong><br>
                📊 Percentage: ${getValue(record.percentage + '%')} | 📅 Year: ${getValue(record.year_of_passing)}
            </div>`;
        });
        pastEducationContainer.innerHTML = pastEducationHTML;
    }

    // Academic information - After Admission
    const postAdmission = student.post_admission_records || [];
    const currentSemester = getValue(student.semester, 'N/A');

    // Calculate backlog count and subjects
    let backlogCount = 0;
    let backlogSubjects = [];

    if (postAdmission.length == 0) {
        document.getElementById("sem1SGPA").innerText = "N/A"
        document.getElementById("sem2SGPA").innerText = "N/A"
        document.getElementById("sem3SGPA").innerText = "N/A"
        document.getElementById("sem4SGPA").innerText = "N/A"
        document.getElementById("sem5SGPA").innerText = "N/A"
        document.getElementById("sem6SGPA").innerText = "N/A"
        document.getElementById("sem7SGPA").innerText = "N/A"
        document.getElementById("sem8SGPA").innerText = "N/A"
    }

    postAdmission.forEach(record => {
        if (record.sgpa !== null && record.sgpa !== undefined) {
            document.getElementById(`sem${record.semester}SGPA`).textContent = record.sgpa;
        }

        if (record.backlog_subjects && record.backlog_subjects !== 'None' && record.backlog_subjects !== 'N/A') {
            backlogCount++;
            backlogSubjects.push(`Sem ${record.semester}: ${record.backlog_subjects}`);
        }
    });

    // Display all semester-wise performance records
    const semesterPerformanceContainer = document.getElementById("semesterPerformanceDetails");
    if (semesterPerformanceContainer && postAdmission.length > 0) {
        let semesterHTML = '';
        postAdmission.forEach(record => {
            const backlogInfo = record.backlog_subjects && record.backlog_subjects !== 'None' && record.backlog_subjects !== 'N/A'
                ? ` | 📚 Backlogs: ${record.backlog_subjects}` : '';
            semesterHTML += `<div class="semester-record">
                <strong>Semester ${record.semester}</strong><br>
                📊 SGPA: ${getValue(record.sgpa)}${backlogInfo}
            </div>`;
        });
        semesterPerformanceContainer.innerHTML = semesterHTML;
    }

    document.getElementById("currentSemester").textContent = currentSemester;
    document.getElementById("backlogCount").textContent = backlogCount;
    document.getElementById("backlogSubjects").textContent = backlogSubjects.length > 0 ?
        backlogSubjects.join('; ') : 'None';

    // Display current SGPA and CGPA prominently
    document.getElementById("currentSGPA").textContent = student.sgpa ? student.sgpa.toFixed(2) : 'N/A';
    document.getElementById("currentCGPA").textContent = student.cgpa ? student.cgpa.toFixed(2) : 'N/A';

    // Performance in Career Development Activities
    const careerActivities = student.career_activities || [];

    if (careerActivities.length == 0) {

    }

    if (careerActivities.length > 0) {
        document.getElementById("aptitudeScore").textContent = getValue(careerActivities[0].score_rank);
        document.getElementById("aptitudeDate").textContent = formatDate(careerActivities[0].exam_date);

        if (careerActivities.length > 1) {
            document.getElementById("cocubesScore").textContent = getValue(careerActivities[1].score_rank);
            document.getElementById("cocubesDate").textContent = formatDate(careerActivities[1].exam_date);
        }

        if (careerActivities.length > 2) {
            document.getElementById("gateScore").textContent = getValue(careerActivities[2].score_rank);
            document.getElementById("gateDate").textContent = formatDate(careerActivities[2].exam_date);
        }

        // Display all career activities in detail
        const careerActivitiesContainer = document.getElementById("allCareerActivitiesDetails");
        if (careerActivitiesContainer && careerActivities.length > 0) {
            let careerActivitiesHTML = '';
            careerActivities.forEach((activity, index) => {
                careerActivitiesHTML += `<div class="career-activity-record">
                    <strong>Activity ${index + 1}: ${getValue(activity.activity_name)}</strong><br>
                    📊 Score/Rank: ${getValue(activity.score_rank)} | 📅 Date: ${formatDate(activity.exam_date)}
                </div>`;
            });
            careerActivitiesContainer.innerHTML = careerActivitiesHTML;
        }
    }

    // Project and Internship Details
    const projects = student.projects || [];
    const internships = student.internships || [];

    if (projects.length > 0) {
        document.getElementById("project1Title").textContent = getValue(projects[0].title);
        document.getElementById("project1Description").textContent = getValue(projects[0].description);
    }

    if (projects.length > 1) {
        document.getElementById("project2Title").textContent = getValue(projects[1].title);
        document.getElementById("project2Description").textContent = getValue(projects[1].description);
    }

    // Display all projects in detail
    const projectsContainer = document.getElementById("allProjectsDetails");
    if (projectsContainer && projects.length > 0) {
        let projectsHTML = '';
        projects.forEach((project, index) => {
            projectsHTML += `<div class="project-record">
                <strong>Project ${index + 1}: ${getValue(project.title)}</strong><br>
                📝 Description: ${getValue(project.description)}
            </div>`;
        });
        projectsContainer.innerHTML = projectsHTML;
    }

    if (internships.length > 0) {
        document.getElementById("internship1Company").textContent = getValue(internships[0].company_name);
        document.getElementById("internship1Domain").textContent = getValue(internships[0].domain);
        document.getElementById("internship1Type").textContent = getValue(internships[0].internship_type);
        document.getElementById("internship1Paid").textContent = getValue(internships[0].paid_unpaid);
        document.getElementById("internship1Duration").textContent = formatDuration(internships[0].start_date, internships[0].end_date);
    }

    if (internships.length > 1) {
        document.getElementById("internship2Company").textContent = getValue(internships[1].company_name);
        document.getElementById("internship2Domain").textContent = getValue(internships[1].domain);
        document.getElementById("internship2Type").textContent = getValue(internships[1].internship_type);
        document.getElementById("internship2Paid").textContent = getValue(internships[1].paid_unpaid);
        document.getElementById("internship2Duration").textContent = formatDuration(internships[1].start_date, internships[1].end_date);
    }

    // Display all internships in detail
    const internshipsContainer = document.getElementById("allInternshipsDetails");
    if (internshipsContainer && internships.length > 0) {
        let internshipsHTML = '';
        internships.forEach((internship, index) => {
            const duration = formatDuration(internship.start_date, internship.end_date);
            internshipsHTML += `<div class="internship-record">
                <strong>Internship ${index + 1}: ${getValue(internship.company_name)}</strong><br>
                🏢 Company: ${getValue(internship.company_name)} | 🌐 Domain: ${getValue(internship.domain)}<br>
                📋 Type: ${getValue(internship.internship_type)} | 💰 Paid: ${getValue(internship.paid_unpaid)}<br>
                📅 Duration: ${duration}
            </div>`;
        });
        internshipsContainer.innerHTML = internshipsHTML;
    }

    // Co-Curricular Activities
    const participations = student.cocurricular_participations || [];
    const organizations = student.cocurricular_organizations || [];

    let participationHTML = '';
    participations.forEach(activity => {
        participationHTML += `<p><strong>${getValue(activity.name)}</strong><br>
            📅 Date: ${formatDate(activity.date)} | 🏆 Level: ${getValue(activity.level)} | 🎖️ Awards: ${getValue(activity.awards)}</p>`;
    });
    document.querySelector(".activity-list").innerHTML = participationHTML || '<p>No participation activities</p>';

    let organizationHTML = '';
    organizations.forEach(activity => {
        organizationHTML += `<p><strong>${getValue(activity.name)}</strong><br>
            📅 Date: ${formatDate(activity.date)} | 🏆 Level: ${getValue(activity.level)} | 💬 Remark: ${getValue(activity.remark)}</p>`;
    });
    document.querySelectorAll(".activity-list")[1].innerHTML = organizationHTML || '<p>No organized activities</p>';

    // SWOC Analysis - now directly from student object (flattened)
    document.getElementById("strengths").textContent = getValue(student.strengths);
    document.getElementById("weaknesses").textContent = getValue(student.weaknesses);
    document.getElementById("opportunities").textContent = getValue(student.opportunities);
    document.getElementById("challenges").textContent = getValue(student.challenges);

    // Career Objectives and Skills - now directly from student object (flattened)
    document.getElementById("careerObjectives").textContent = getValue(student.careerGoal);
    document.getElementById("careerDetails").textContent = getValue(student.careerDetails);
    document.getElementById("clarityPreparedness").textContent = getValue(student.clarityPreparedness);
    document.getElementById("campusPlacement").textContent = student.interestedInCampusPlacement ? "Yes" : "No";
    document.getElementById("campusPlacementReasons").textContent = getValue(student.campusPlacementReasons);
    document.getElementById("programmingLanguages").textContent = getValue(student.programmingLanguages);
    document.getElementById("technologiesFrameworks").textContent = getValue(student.technologiesFrameworks);
    document.getElementById("familiarToolsPlatforms").textContent = getValue(student.familiarToolsPlatforms);
    document.getElementById("expectations").textContent = getValue(student.expectations);

    // Domain of interest tags
    const domainContainer = document.getElementById("domainOfInterest");
    if (student.domain) {
        const domains = student.domain.split(',').map(d => d.trim());
        domainContainer.innerHTML = domains.map(d => `<span class="tag">${d}</span>`).join('');
    } else {
        domainContainer.innerHTML = '<span class="empty-value">N/A</span>';
    }

    // Show the modal
    document.querySelector('.dialog-container').classList.remove('hidden');
    document.querySelector('.details-container').classList.remove('hidden');
    document.getElementsByTagName('body')[0].classList.add('overflow-hidden');
}

function closeDialog() {
    if (confirm('Are you sure you want to close?')) {
        document.querySelector('.dialog-container').classList.add('hidden');
        document.querySelector('.details-container').classList.add('hidden');
        document.getElementsByTagName('body')[0].classList.remove('overflow-hidden');
    }
}

function toggleSection(header) {
    const section = header.parentElement;
    section.classList.toggle('expanded');
    const icon = header.querySelector('.expand-icon');
    icon.textContent = section.classList.contains('expanded') ? '▲' : '▼';
}

function printDialog() {
    window.print();
}

function downloadData() {
    // Get the student details modal content
    const modalContent = document.getElementById('studentModal');
    if (!modalContent) {
        alert('No student data available for download.');
        return;
    }

    // Extract all data from the modal
    const studentData = extractStudentData(modalContent);

    // Create a formatted document for PDF export
    const content = document.createElement('div');
    content.innerHTML = generatePDFContent(studentData);

    // Configure PDF options
    const opt = {
        margin: 10,
        filename: `student_report_${studentData.uid}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Generate and download PDF
    html2pdf().set(opt).from(content).save();
}

function extractStudentData(modal) {
    // Helper function to get text content or default value
    const getValue = (id, defaultValue = 'N/A') => {
        const element = modal.querySelector(`#${id}`);
        return element ? (element.textContent.trim() || defaultValue) : defaultValue;
    };

    // Extract all data from the modal
    return {
        // Personal Information
        department: getValue('studentDepartment', 'Computer Engineering'),
        fullName: getValue('studentFullNam'),
        section: getValue('studentSection'),
        semester: getValue('studentSemester'),
        uid: getValue('studentUID'),
        year: getValue('studentYear'),
        dob: getValue('studentDOB'),
        gender: getValue('studentGender'),
        mobile: getValue('studentMobile'),
        personalEmail: getValue('studentPersonalEmail'),
        collegeEmail: getValue('studentCollegeEmail'),
        linkedin: getValue('studentLinkedIn'),
        address: getValue('studentAddress'),
        emergencyContactName: getValue('emergencyContactName'),
        emergencyContactNumber: getValue('emergencyContactNumber'),

        // Parent's Information
        fatherName: getValue('fatherName'),
        fatherMobile: getValue('fatherMobile'),
        fatherEmail: getValue('fatherEmail'),
        fatherOccupation: getValue('fatherOccupation'),
        motherName: getValue('motherName'),
        motherMobile: getValue('motherMobile'),
        motherEmail: getValue('motherEmail'),
        motherOccupation: getValue('motherOccupation'),

        // Academic Information - Before Admission
        sscPercentage: getValue('sscPercentage'),
        sscYear: getValue('sscYear'),
        hsscPercentage: getValue('hsscPercentage'),
        hsscYear: getValue('hsscYear'),

        // Academic Information - After Admission
        sem1SGPA: getValue('sem1SGPA'),
        sem2SGPA: getValue('sem2SGPA'),
        sem3SGPA: getValue('sem3SGPA'),
        sem4SGPA: getValue('sem4SGPA'),
        sem5SGPA: getValue('sem5SGPA'),
        sem6SGPA: getValue('sem6SGPA'),
        sem7SGPA: getValue('sem7SGPA'),
        sem8SGPA: getValue('sem8SGPA'),
        currentSemester: getValue('currentSemester'),
        backlogCount: getValue('backlogCount'),
        backlogSubjects: getValue('backlogSubjects'),
        currentSGPA: getValue('currentSGPA'),
        currentCGPA: getValue('currentCGPA'),

        // Career Development Activities
        aptitudeScore: getValue('aptitudeScore'),
        aptitudeDate: getValue('aptitudeDate'),
        cocubesScore: getValue('cocubesScore'),
        cocubesDate: getValue('cocubesDate'),
        gateScore: getValue('gateScore'),
        gateDate: getValue('gateDate'),
        otherExamName: getValue('otherExamName'),
        otherExamScore: getValue('otherExamScore'),
        otherExamDate: getValue('otherExamDate'),

        // Project and Internship Details
        project1Title: getValue('project1Title'),
        project1Description: getValue('project1Description'),
        project2Title: getValue('project2Title'),
        project2Description: getValue('project2Description'),
        internship1Company: getValue('internship1Company'),
        internship1Domain: getValue('internship1Domain'),
        internship1Type: getValue('internship1Type'),
        internship1Paid: getValue('internship1Paid'),
        internship1Duration: getValue('internship1Duration'),
        internship2Company: getValue('internship2Company'),
        internship2Domain: getValue('internship2Domain'),
        internship2Type: getValue('internship2Type'),
        internship2Paid: getValue('internship2Paid'),
        internship2Duration: getValue('internship2Duration'),

        // SWOC Analysis
        strengths: getValue('strengths'),
        weaknesses: getValue('weaknesses'),
        opportunities: getValue('opportunities'),
        challenges: getValue('challenges'),

        // Career Objectives and Skills
        careerObjectives: getValue('careerObjectives'),
        careerDetails: getValue('careerDetails'),
        clarityPreparedness: getValue('clarityPreparedness'),
        campusPlacement: getValue('campusPlacement'),
        campusPlacementReasons: getValue('campusPlacementReasons'),
        programmingLanguages: getValue('programmingLanguages'),
        technologiesFrameworks: getValue('technologiesFrameworks'),
        familiarToolsPlatforms: getValue('familiarToolsPlatforms'),
        domainOfInterest: getValue('domainOfInterest'),
        expectations: getValue('expectations')
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
                    <tr><td style="border: 1px solid #ddd; padding: 8px; width: 30%;"><strong>Department</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.department}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Full Name</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.fullName}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Section</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.section}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Semester</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.semester}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Roll No./UID</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.uid}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Year of Admission</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.year}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Date of Birth</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.dob}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Gender</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.gender}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Mobile No.</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.mobile}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Personal Email ID</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.personalEmail}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>College Email ID</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.collegeEmail}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>LinkedIn ID</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.linkedin}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Permanent Address</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.address}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Emergency Contact Name</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.emergencyContactName}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Emergency Contact Number</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.emergencyContactNumber}</td></tr>
                </table>
            </div>
            
            <div style="margin: 20px 0;">
                <h2 style="color: #1e40af; background: #f0f5ff; padding: 10px; border-radius: 5px;">Parent's Information</h2>
                <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
                    <tr><td style="border: 1px solid #ddd; padding: 8px; width: 30%;"><strong>Father's Name</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.fatherName}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Father's Mobile No.</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.fatherMobile}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Father's Email ID</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.fatherEmail}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Father's Occupation</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.fatherOccupation}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Mother's Name</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.motherName}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Mother's Mobile No.</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.motherMobile}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Mother's Email ID</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.motherEmail}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Mother's Occupation</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.motherOccupation}</td></tr>
                </table>
            </div>
            
            <div style="margin: 20px 0;">
                <h2 style="color: #1e40af; background: #f0f5ff; padding: 10px; border-radius: 5px;">Academic Information - Before Admission</h2>
                <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
                    <tr><td style="border: 1px solid #ddd; padding: 8px; width: 30%;"><strong>SSC (X) Percentage/Grade</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.sscPercentage}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>SSC Year of Passing</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.sscYear}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>HSSC (XII) Percentage/Grade</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.hsscPercentage}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>HSSC Year of Passing</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.hsscYear}</td></tr>
                </table>
            </div>
            
            <div style="margin: 20px 0;">
                <h2 style="color: #1e40af; background: #f0f5ff; padding: 10px; border-radius: 5px;">Academic Information - After Admission</h2>
                <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
                    <tr><td style="border: 1px solid #ddd; padding: 8px; width: 30%;"><strong>Semester 1 SGPA</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.sem1SGPA}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Semester 2 SGPA</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.sem2SGPA}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Semester 3 SGPA</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.sem3SGPA}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Semester 4 SGPA</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.sem4SGPA}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Semester 5 SGPA</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.sem5SGPA}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Semester 6 SGPA</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.sem6SGPA}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Semester 7 SGPA</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.sem7SGPA}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Semester 8 SGPA</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.sem8SGPA}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Current Semester</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.currentSemester}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Number of Active Backlogs</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.backlogCount}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Backlog Subject Names</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.backlogSubjects}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Current SGPA</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.currentSGPA}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Current CGPA</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.currentCGPA}</td></tr>
                </table>
            </div>
            
            <div style="margin: 20px 0;">
                <h2 style="color: #1e40af; background: #f0f5ff; padding: 10px; border-radius: 5px;">Performance in Career Development Activities</h2>
                <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
                    <tr><td style="border: 1px solid #ddd; padding: 8px; width: 30%;"><strong>Aptitude Score/Rank</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.aptitudeScore}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Aptitude Date</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.aptitudeDate}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Cocubes Score/Rank</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.cocubesScore}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Cocubes Date</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.cocubesDate}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Gate Score/Rank</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.gateScore}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Gate Date</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.gateDate}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Other Exam Name</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.otherExamName}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Other Exam Score/Rank</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.otherExamScore}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Other Exam Date</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.otherExamDate}</td></tr>
                </table>
            </div>
            
            <div style="margin: 20px 0;">
                <h2 style="color: #1e40af; background: #f0f5ff; padding: 10px; border-radius: 5px;">Project and Internship Details</h2>
                <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
                    <tr><td style="border: 1px solid #ddd; padding: 8px; width: 30%;"><strong>Project 1 Title</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.project1Title}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Project 1 Description</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.project1Description}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Project 2 Title</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.project2Title}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Project 2 Description</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.project2Description}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Internship 1 Company</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.internship1Company}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Internship 1 Domain</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.internship1Domain}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Internship 1 Type</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.internship1Type}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Internship 1 Paid/Unpaid</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.internship1Paid}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Internship 1 Duration</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.internship1Duration}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Internship 2 Company</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.internship2Company}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Internship 2 Domain</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.internship2Domain}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Internship 2 Type</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.internship2Type}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Internship 2 Paid/Unpaid</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.internship2Paid}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Internship 2 Duration</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.internship2Duration}</td></tr>
                </table>
            </div>
            
            <div style="margin: 20px 0;">
                <h2 style="color: #1e40af; background: #f0f5ff; padding: 10px; border-radius: 5px;">SWOC Analysis</h2>
                <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
                    <tr><td style="border: 1px solid #ddd; padding: 8px; width: 30%;"><strong>Strengths</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.strengths}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Weaknesses</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.weaknesses}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Opportunities</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.opportunities}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Challenges</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.challenges}</td></tr>
                </table>
            </div>
            
            <div style="margin: 20px 0;">
                <h2 style="color: #1e40af; background: #f0f5ff; padding: 10px; border-radius: 5px;">Career Objectives and Skills</h2>
                <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
                    <tr><td style="border: 1px solid #ddd; padding: 8px; width: 30%;"><strong>Career Objectives</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.careerObjectives}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Specific Details</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.careerDetails}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Clarity and Preparedness</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.clarityPreparedness}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Interested in Campus Placement</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.campusPlacement}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Campus Placement Reasons</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.campusPlacementReasons}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Programming Languages</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.programmingLanguages}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Technologies/Frameworks</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.technologiesFrameworks}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Familiar Tools/Platforms</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.familiarToolsPlatforms}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Domain of Interest</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.domainOfInterest}</td></tr>
                    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Expectations from Institute/Department</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.expectations}</td></tr>
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

    teachers.forEach(teacher => {
        const assignedCount = teacher.studentsAssigned ? teacher.studentsAssigned.length : 0;
        const row = document.createElement("tr");
        row.innerHTML = `
      <td><strong>${teacher.name}</strong></td>
      <td>${teacher.uid}</td>
      <td>${teacher.email}</td>
      <td><span class="tag">${assignedCount}</span></td>
      <td>20</td>
      <td>
        <button class="btn-sm btn-allocate" onclick="showAllocationInterface(${teacher.id})" ${assignedCount >= 20 ? 'disabled' : ''}>
          ➕ Allocate
        </button>
        
        <button class="btn-sm btn-remove" onclick="removeAllocatedStudents(${teacher.id})" ${assignedCount === 0 ? 'disabled' : ''}>
          🗑️ Remove
        </button>
      </td>
    `;
        tbody.appendChild(row);
    });
}

async function showAllocationInterface(teacherId) {
    selectedTeacherForAllocation = teacherId;
    console.log(teachers)
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) return;

    const assignedStudents = teacher.studentsAssigned || [];
    if (assignedStudents.length >= 20) {
        alert("This teacher already has the maximum number of students (20).");
        return;
    }

    document.getElementById("selectedTeacherTitle").textContent = `Allocating Students to ${teacher.name}`;

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

    const checkboxes = document.querySelectorAll(".student-checkbox:checked");
    const selectedStudentIds = Array.from(checkboxes).map(cb => parseInt(cb.getAttribute("data-student-id")));

    if (selectedStudentIds.length === 0) {
        alert("Please select at least one student to allocate.");
        return;
    }

    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`http://localhost:5002/api/admin/faculty/${selectedTeacherForAllocation}/mentees/confirm`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                student_ids: selectedStudentIds
            })
        });

        if (response.ok) {
            const result = await response.json();
            alert(`✅ ${result.message || 'Successfully assigned students!'}`);

            // Refresh data from API
            await loadTeachersFromAPI();
            await loadStudentsFromAPI();

            cancelAllocation();
            renderAllocation();
            renderStudents();
        } else {
            const error = await response.json();
            alert(`❌ Failed to assign students: ${error.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error confirming allocation:', error);
        alert('❌ Error connecting to server. Please try again.');
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



    const teacher = teachers.find(t => t.id === selectedTeacherForAllocation);
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
        const token = localStorage.getItem('access_token');


        const response = await fetch(`http://localhost:5002/api/admin/faculty/${selectedTeacherForAllocation}/mentees/generate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

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
                        <p style="font-size: 14px;">${suggestedStudents.students.length} students have been randomly selected for allocation.</p>
                    </div>`;

                console.log(suggestedStudents)

                suggestedStudents.students.forEach(student => {
                    const div = document.createElement("div");
                    div.className = "student-allocation-item selected";
                    div.innerHTML = `
                        <span><strong>${student.full_name}</strong><br>
                        <small>${student.uid} - Sem ${student.semester}, Sec ${student.section}</small></span>
                        <input type="checkbox" class="student-checkbox" data-student-id="${student.id}" data-student-uid="${student.uid}" checked>
                    `;
                    grid.appendChild(div);
                });
            }
        } else {
            const errorText = await response.text();
            console.log(`📡 Random Allocation API Response (${response.status}):`, errorText);

            try {
                const errorData = JSON.parse(errorText);
                if (errorData.error && errorData.error.includes("No unassigned students")) {
                    grid.innerHTML = `
                        <div class="status-message info">
                            <p>📋 <strong>No unassigned students available</strong></p>
                            <p style="font-size: 14px;">All students are already assigned to mentors.</p>
                        </div>`;
                } else if (errorData.error && errorData.error.includes("maximum number")) {
                    grid.innerHTML = `
                        <div class="status-message warning">
                            <p>⚠️ <strong>Maximum allocation reached</strong></p>
                            <p style="font-size: 14px;">${errorData.error}</p>
                        </div>`;
                } else {
                    grid.innerHTML = `
                        <div class="status-message error">
                            <p>⚠️ <strong>Unable to generate random allocation</strong></p>
                            <p style="font-size: 14px;">${errorData.error || 'Unknown error occurred'}</p>
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
        console.error('❌ Network/Connection Error during random allocation:', error);
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

    const teacher = teachers.find(t => t.id === selectedTeacherForAllocation);
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
        const token = localStorage.getItem('access_token');
        console.log(`👥 Loading unassigned students for teacher ID: ${selectedTeacherForAllocation}`);

        const response = await fetch(`http://localhost:5002/api/admin/faculty/${selectedTeacherForAllocation}/mentees/generate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

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

                suggestedStudents.forEach(student => {
                    const div = document.createElement("div");
                    div.className = "student-allocation-item";
                    div.innerHTML = `
                        <span><strong>${student.full_name}</strong><br>
                        <small>${student.uid} - Sem ${student.semester}, Sec ${student.section}</small></span>
                        <input type="checkbox" class="student-checkbox" data-student-id="${student.id}" data-student-uid="${student.uid}">
                    `;
                    grid.appendChild(div);
                });
            }
        } else {
            const errorText = await response.text();
            console.log(`📡 Manual Selection API Response (${response.status}):`, errorText);

            try {
                const errorData = JSON.parse(errorText);
                if (errorData.error && errorData.error.includes("No unassigned students")) {
                    grid.innerHTML = `
                        <div class="status-message info">
                            <p>📋 <strong>No unassigned students available</strong></p>
                            <p style="font-size: 14px;">All students are already assigned to mentors.</p>
                        </div>`;
                } else {
                    grid.innerHTML = `
                        <div class="status-message error">
                            <p>⚠️ <strong>Unable to load unassigned students</strong></p>
                            <p style="font-size: 14px;">${errorData.error || 'Unknown error occurred'}</p>
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
        console.error('❌ Network/Connection Error during manual selection:', error);
        document.getElementById("studentAllocationGrid").innerHTML = `
            <div class="status-message error">
                <p>🌐 <strong>Connection Error</strong></p>
                <p style="font-size: 14px;">Unable to connect to server. Please check your connection and try again.</p>
            </div>`;
    }
}

async function viewAllocatedStudents(teacherId) {
    console.log('DEBUG: viewAllocatedStudents called with teacherId:', teacherId);
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) {
        console.log('DEBUG: Teacher not found for ID:', teacherId);
        return;
    }
    console.log('DEBUG: Found teacher:', teacher);

    try {
        const token = localStorage.getItem('access_token');
        console.log('DEBUG: Token:', token ? 'Present' : 'Missing');

        const url = `http://localhost:5002/api/admin/faculty/${teacherId}/mentees`;
        console.log('DEBUG: Making request to:', url);
        console.log('DEBUG: Request method: GET');
        console.log('DEBUG: Request headers:', {
            'Authorization': `Bearer ${token ? token.substring(0, 20) + '...' : 'Missing'}`,
            'Content-Type': 'application/json'
        });

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('DEBUG: Response status:', response.status);
        console.log('DEBUG: Response headers:', response.headers);

        if (response.ok) {
            const assignedStudents = await response.json();
            console.log('DEBUG: Assigned students:', assignedStudents);
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

                assignedStudents.forEach(student => {
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
            const popup = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
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
            console.log('DEBUG: Response not OK, status:', response.status);
            const errorText = await response.text();
            console.log('DEBUG: Error response text:', errorText);
            alert('❌ Failed to load assigned students');
        }
    } catch (error) {
        console.error('Error loading assigned students:', error);
        console.log('DEBUG: Error details:', error);
        alert('❌ Error connecting to server');
    }
}

async function deallocateStudent(teacherId, studentId, studentUid) {
    if (!confirm(`Are you sure you want to remove student ${studentUid} from this teacher?`)) {
        return;
    }

    try {
        const token = localStorage.getItem('access_token');

        // Use the proper remove endpoint
        const response = await fetch(`http://localhost:5002/api/admin/faculty/${teacherId}/mentees/remove`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                student_ids: [studentId]
            })
        });

        if (response.ok) {
            alert(`✅ Successfully removed student ${studentUid} from teacher assignment`);

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
            alert(`❌ Failed to remove student: ${error.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error deallocating student:', error);
        alert('❌ Error connecting to server. Please try again.');
    }
}

// Bulk Upload Functions
document.getElementById('bulkUploadStudent').addEventListener('change', handleStudentUpload);
document.getElementById('bulkUploadFaculty').addEventListener('change', handleFacultyUpload);

// Function to handle student bulk upload
async function handleStudentUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        alert('No file selected.');
        return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href("../login.html");
        return;
    }

    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            const fileData = new Uint8Array(e.target.result);
            const workbook = XLSX.read(fileData, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Convert sheet to JSON array, assuming first row is headers
            const students = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
            console.log('Raw parsed student data:', students); // Debug: Log raw data

            // Remove header row and map to expected object format
            const studentData = students.slice(1).map(row => ({
                uid: row[0]?.trim() || '',
                full_name: row[1]?.trim() || '',
                semester: row[2]?.trim() || '',
                section: row[3]?.trim() || '',
                year_of_admission: row[4]?.trim() || ''
            }));

            // Filter out invalid rows
            const validStudents = studentData.filter(student => student.uid && student.uid.trim());
            console.log('Valid student data:', validStudents); // Debug: Log filtered data

            if (validStudents.length === 0) {
                alert('No valid student data found in the file.');
                return;
            }

            // Send to backend
            const response = await fetch('http://localhost:5002/api/auth/register/bulk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(validStudents)
            });

            console.log('Response status:', response.status); // Debug: Log status

            // Check if response is OK
            if (!response.ok) {
                let errorResponse;
                try {
                    errorResponse = await response.json();
                } catch {
                    errorResponse = {};
                }
                throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorResponse.msg || errorResponse.error || response.statusText}`);
            }

            // Parse response
            const responseData = await response.json();
            console.log('Student bulk upload response:', responseData); // Debug: Log response

            // Process results
            let successCount = 0;
            let failureCount = 0;
            let failureMessages = [];
            if (responseData.result && Array.isArray(responseData.result)) {
                responseData.result.forEach(result => {
                    console.log(`Student ${result.uid}: ${result.status} ${result.error || ''}`);
                    if (result.status === 'success') {
                        successCount++;
                    } else {
                        failureCount++;
                        failureMessages.push(`Student ${result.uid}: ${result.error}`);
                    }
                });
            } else {
                console.warn('Unexpected response format:', responseData);
                alert('Unexpected response format from server. Check console for details.');
                return;
            }

            // Show appropriate alert
            if (failureCount === 0) {
                alert(`Student bulk upload completed. ${successCount} succeeded, ${failureCount} failed.`);
            } else {
                alert(`Student bulk upload completed. ${successCount} succeeded, ${failureCount} failed.\nErrors:\n${failureMessages.join('\n')}`);
            }

            // Reload data
            await loadUsersFromAPI();
            await loadStatisticsFromAPI();
            await loadStudentsFromAPI();

        } catch (error) {
            console.error('Error uploading students:', error, error.stack);
            alert(`Error uploading students: ${error.message}`);
        }
    };
    reader.onerror = function () {
        console.error('Error reading file');
        alert('Error reading the uploaded file.');
    };
    reader.readAsArrayBuffer(file);
}

// Function to handle faculty bulk upload
async function handleFacultyUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        alert('No file selected.');
        return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
        alert('You must be logged in as an admin to perform this action.');
        return;
    }

    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            const fileData = new Uint8Array(e.target.result);
            const workbook = XLSX.read(fileData, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Convert sheet to JSON array, assuming first row is headers
            const faculties = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
            console.log('Raw parsed faculty data:', faculties); // Debug: Log raw data

            // Remove header row and map to expected object format
            const facultyData = faculties.slice(1).map(row => ({
                email: row[0]?.trim() || '',
                first_name: row[1]?.trim() || '',
                last_name: row[2]?.trim() || '',
                contact_number: row[3]?.trim() || '',
                password: row[4]?.trim() || undefined
            }));

            // Filter out invalid rows
            const validFaculties = facultyData.filter(faculty => faculty.email && faculty.email.trim());
            console.log('Valid faculty data:', validFaculties); // Debug: Log filtered data

            if (validFaculties.length === 0) {
                alert('No valid faculty data found in the file.');
                return;
            }

            // Send to backend
            const response = await fetch('http://localhost:5002/api/auth/register/faculty/bulk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(validFaculties)
            });

            console.log('Response status:', response.status); // Debug: Log status

            // Check if response is OK
            if (!response.ok) {
                let errorResponse;
                try {
                    errorResponse = await response.json();
                } catch {
                    errorResponse = {};
                }
                throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorResponse.msg || errorResponse.error || response.statusText}`);
            }

            // Parse response
            const responseData = await response.json();
            console.log('Faculty bulk upload response:', responseData); // Debug: Log response

            // Process results
            let successCount = 0;
            let failureCount = 0;
            let failureMessages = [];
            if (responseData.result && Array.isArray(responseData.result)) {
                responseData.result.forEach(result => {
                    console.log(`Faculty ${result.email}: ${result.status} ${result.error || ''}`);
                    if (result.status === 'success') {
                        successCount++;
                    } else {
                        failureCount++;
                        failureMessages.push(`Faculty ${result.email}: ${result.error}`);
                    }
                });
            } else {
                console.warn('Unexpected response format:', responseData);
                alert('Unexpected response format from server. Check console for details.');
                return;
            }

            // Show appropriate alert
            if (failureCount === 0) {
                alert(`Faculty bulk upload completed. ${successCount} succeeded, ${failureCount} failed.`);
            } else {
                alert(`Faculty bulk upload completed. ${successCount} succeeded, ${failureCount} failed.\nErrors:\n${failureMessages.join('\n')}`);
            }

            // Reload data
            await loadUsersFromAPI();
            await loadStatisticsFromAPI();
            await loadTeachersFromAPI();

        } catch (error) {
            console.error('Error uploading faculty:', error, error.stack);
            alert(`Error uploading faculty: ${error.message}`);
        }
    };
    reader.onerror = function () {
        console.error('Error reading file');
        alert('Error reading the uploaded file.');
    };
    reader.readAsArrayBuffer(file);
}

function downloadExcelFormat() {
    // Create a formatted document for PDF export
    const content = document.createElement('div');
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
        filename: 'bulk_upload_format_guide.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
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
                "Authorization": "Bearer " + token
            }
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
    document.getElementById("changePasswordModal").style.display = "flex";
    document.getElementById("adminChangePasswordForm").reset();
    document.getElementById("changePasswordMessage").style.display = "none";
    document.getElementById("passwordStrength").style.display = "none";
}

function closeChangePasswordModal() {
    document.getElementById("changePasswordModal").style.display = "none";
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
document.addEventListener('DOMContentLoaded', function () {
    const changePasswordForm = document.getElementById("adminChangePasswordForm");
    if (changePasswordForm) {
        changePasswordForm.addEventListener("submit", handleAdminPasswordChange);
    }
});

async function handleAdminPasswordChange(e) {
    e.preventDefault();

    const old_password = document.getElementById("adminOldPassword").value.trim();
    const new_password = document.getElementById("adminNewPassword").value.trim();
    const confirmPassword = document.getElementById("adminConfirmPassword").value.trim();

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
        showChangePasswordMessage("Password must be at least 8 characters long", "error");
        return;
    }

    if (old_password === new_password) {
        showChangePasswordMessage("New password must be different from current password", "error");
        return;
    }

    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch("http://localhost:5002/api/auth/change-password", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                old_password,
                new_password
            })
        });

        const data = await response.json();

        if (response.ok) {
            showChangePasswordMessage("✅ Password changed successfully!", "success");
            setTimeout(() => {
                closeChangePasswordModal();
            }, 2000);
        } else {
            showChangePasswordMessage(`❌ Failed to change password: ${data.message || 'Unknown error'}`, "error");
        }
    } catch (error) {
        console.error('Error changing password:', error);
        alert('❌ Error connecting to server. Please try again.');
    }
}

// Remove allocated students function
async function removeAllocatedStudents(teacherId) {
    const teacher = teachers.find(t => t.id === teacherId);
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
    const studentList = assignedStudents.map(studentId => {
        const student = students.find(s => s.id === studentId);
        return student ? `${student.full_name || student.firstName} ${student.lastName || ''} (${student.uid})` : `Student ID: ${studentId}`;
    }).join('\n');

    const confirmRemove = confirm(`Are you sure you want to remove students from ${teacher.name}?\n\nStudents to be removed:\n${studentList}\n\nThis action cannot be undone.`);

    if (!confirmRemove) {
        return;
    }

    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`http://localhost:5002/api/admin/faculty/${teacherId}/mentees/remove`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                student_ids: assignedStudents
            })
        });

        if (response.ok) {
            const result = await response.json();
            alert(`✅ ${result.message || 'Successfully removed students!'}`);

            // Refresh data from API
            await loadTeachersFromAPI();
            await loadStudentsFromAPI();

            // Update the UI
            renderAllocation();
            renderStudents();
        } else {
            const error = await response.json();
            alert(`❌ Failed to remove students: ${error.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error removing students:', error);
        alert('❌ Error connecting to server. Please try again.');
    }
}
