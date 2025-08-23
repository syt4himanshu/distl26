
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
          console.log('📚 Loaded teachers from database:', teachersData);
          
          teachers.length = 0; // Clear existing array
          teachers.push(...teachersData);
          
          console.log(`✅ Processed ${teachers.length} teachers`);
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
          console.log('👥 Loaded users from database:', usersData);
          
          users.length = 0; // Clear existing array
          users.push(...usersData);
          
          console.log(`✅ Processed ${users.length} users`);
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
          console.log('📊 Loaded statistics from database:', stats);
          
          // Update the statistics cards
          document.getElementById('totalUsers').textContent = stats.totalUsers;
          document.getElementById('totalStudents').textContent = stats.totalStudents;
          document.getElementById('totalTeachers').textContent = stats.totalTeachers;
          document.getElementById('activeUsers').textContent = stats.activeUsers;
          
          console.log('✅ Statistics updated');
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
          console.log('📥 Loaded students from database:', studentsData);
          
          // Transform API data to match frontend expectations
          students.length = 0; // Clear existing array
          studentsData.forEach(student => {
            students.push({
              id: student.id,
              uid: student.uid,
              firstName: student.firstName || 'Unknown',
              middleName: student.middleName || '',
              lastName: student.lastName || 'Student',
              fullName: student.fullName || `${student.firstName} ${student.lastName}`,
              semester: student.semester || 0,
              section: student.section || 'N/A',
              year: student.year || new Date().getFullYear(),
              mentorId: student.mentorId,
              // Add default values for missing fields to prevent UI errors
              domain: student.domain || ["General"],
              careerGoal: student.careerGoal || "Placement",
              softSkillsRating: student.softSkillsRating || 3,
              email: student.email || `${student.uid}@student.edu`,
              mobile: student.mobile || "+91 9876543210",
              fatherName: student.fatherName || "Father Name",
              motherName: student.motherName || "Mother Name",
              permanentAddress: student.permanentAddress || "Address not provided",
              sgpa: student.sgpa || 0.0,
              cgpa: student.cgpa || 0.0
            });
          });
          
          console.log(`✅ Processed ${students.length} students`);
          renderStudents();
        } else {
          console.error('❌ Failed to load students:', response.status);
        }
      } catch (error) {
        console.error('❌ Error loading students:', error);
      }
    }

    // Initialize API loading when page loads  
    document.addEventListener('DOMContentLoaded', function() {
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
      console.log('Page loaded, checking tab functionality...');
      checkTabsDebug();
    });
    
    function checkTabsDebug() {
      const sections = document.querySelectorAll('.section');
      const tabs = document.querySelectorAll('.nav-tab');
      
      console.log('Sections found:', sections.length);
      sections.forEach(section => {
        console.log(`Section ${section.id}: ${section.style.display}, classes: ${section.className}`);
      });
      
      console.log('Tabs found:', tabs.length);
      tabs.forEach(tab => {
        console.log(`Tab: ${tab.textContent}, onclick: ${tab.onclick}`);
      });
    }

    // Tab Switching - Simplified version
   function switchTab(tabId) {
  console.log(`🔄 switchTab called with tabId: ${tabId}`);

  try {
    // Hide all tab sections (not nested ones like in student modal)
    const allTabSections = document.querySelectorAll(".tab-section");
    console.log(`Found ${allTabSections.length} tab sections`);

    allTabSections.forEach((sec, index) => {
      sec.classList.add('hidden');
      sec.style.display = 'none';
      console.log(`Hidden tab section ${index}: ${sec.id}`);
    });

    // Show the selected section
    const targetSection = document.getElementById(tabId);
    if (targetSection) {
      targetSection.classList.remove('hidden');
      targetSection.style.display = 'block';
      console.log(`✅ Showing section: ${tabId}`);
    } else {
      console.error(`❌ Section not found: ${tabId}`);
      return;
    }

    // Update active tab
    const allTabs = document.querySelectorAll(".nav-tab");
    allTabs.forEach((btn, index) => {
      btn.classList.remove("active");
      console.log(`Removed active from tab ${index}`);
    });

    const activeTab = document.querySelector(`button[onclick*="switchTab('${tabId}')"]`);
    if (activeTab) {
      activeTab.classList.add("active");
      console.log(`✅ Activated tab for: ${tabId}`);
    } else {
      console.error(`❌ Tab button not found for: ${tabId}`);
    }

    console.log(`🎉 Tab switch completed: ${tabId}`);

  } catch (error) {
    console.error(`❌ Error in switchTab:`, error);
  }
}


    // User Management Functions
    function showAddUserForm() {
      document.getElementById("userForm").style.display = "block";
      document.getElementById("editIndex").value = "";
      document.getElementById("userId").value = "";
      document.getElementById("password").value = "";
      document.getElementById("role").value = "student";
    }

    async function saveUser() {
      const userId = document.getElementById("userId").value.trim();
      const password = document.getElementById("password").value.trim();
      const role = document.getElementById("role").value;
      const editIndex = document.getElementById("editIndex").value;

      if (!userId || !password) {
        alert("Please enter User ID and Password");
        return;
      }

      const userData = {
        username: userId,
        password: password,
        role: role
      };

      try {
        const token = localStorage.getItem('access_token');
        let response;

        if (editIndex === "") {
          // Create new user
          response = await fetch('http://localhost:5002/api/admin/users', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
          });
        } else {
          // Update existing user
          const user = users[editIndex];
          response = await fetch(`http://localhost:5002/api/admin/users/${user.id}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
          });
        }

        if (response.ok) {
          const result = await response.json();
          console.log('✅ User save result:', result);
          alert(`✅ ${result.message}`);
          
          // Refresh data from API
          await loadUsersFromAPI();
          await loadStatisticsFromAPI();
          
          // If a student or faculty was created, also refresh those lists
          if (result.student_profile === "created") {
            console.log('🎓 Student profile created, refreshing students list...');
            await loadStudentsFromAPI();
          }
          if (result.faculty_profile === "created") {
            console.log('👨‍🏫 Faculty profile created, refreshing teachers list...');
            await loadTeachersFromAPI();
          }
          
          document.getElementById("userForm").style.display = "none";
        } else {
          const error = await response.json();
          alert(`❌ Failed to save user: ${error.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error saving user:', error);
        alert('❌ Error connecting to server. Please try again.');
      }
    }

    function cancelUser() {
      document.getElementById("userForm").style.display = "none";
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
            <button class="btn-sm btn-edit" onclick="editUser(${index})">✏ Edit</button>
            <button class="btn-sm btn-delete" onclick="deleteUser(${index})">🗑 Delete</button>
          </td>
        `;
        tbody.appendChild(row);
      });
    }

    function editUser(index) {
      const user = users[index];
      document.getElementById("userForm").style.display = "block";
      document.getElementById("editIndex").value = index;
      document.getElementById("userId").value = user.username;
      document.getElementById("password").value = ""; // Don't pre-fill password for security
      document.getElementById("role").value = user.role;
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
          <td><span class="tag">${assignedCount}/10</span></td>
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
        return student ? `${student.firstName} ${student.lastName} (${student.uid})` : studentId;
      }).join('<br>');

      document.getElementById("teacherModalBody").innerHTML = `
        <table class="data-table">
          <tr><th>Name</th><td>${teacher.name}</td></tr>
          <tr><th>UID</th><td>${teacher.uid}</td></tr>
          <tr><th>Email</th><td>${teacher.email}</td></tr>
          <tr><th>Contact</th><td>${teacher.contact}</td></tr>
          <tr><th>Students Assigned</th><td>${assignedStudents.length}/10</td></tr>
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
        const studentId = student.id;
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
            <button class="btn-sm btn-view" onclick="viewStudent(${uid})">👁 View</button>
            <button class="btn-sm btn-delete" onclick="deleteStudent(${uid})" style="margin-left: 5px;">🗑 Delete</button>
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

    function saveStudent() {
      // Disabled - redirect to User Management
      alert("💡 Student creation is now done through User Management!");
      showSection('user-management');
    }

    function editStudent(studentId) {
      // For now, editing is disabled - students should be managed through User Management
      alert("💡 Student editing is currently disabled. Use User Management to modify user accounts.");
    }

    async function deleteStudent(studentId) {
      const student = students.find(s => s.id === studentId);
      if (!student) return;

      if (!confirm(`Are you sure you want to delete student ${student.uid} (${student.firstName} ${student.lastName})?`)) {
        return;
      }

      // Note: This would require a DELETE endpoint on the backend
      // For now, we'll show a message
      alert("Student deletion feature requires backend DELETE endpoint implementation.");
    }
    
    // ========== END STUDENT MANAGEMENT FUNCTIONS ==========

    async function getStudent(uid) {
        try {
          const res = await fetch(`http://127.0.0.1:5002/students/${uid}`, {
            method: "GET",
            headers: {
              "Authorization": "Bearer " + localStorage.getItem("access_token"),
              "Content-Type": "application/json"
            }
          });

          if (!res.ok) {
            throw new Error(`Error ${res.status}`);
          }

          const data = await res.json();
          console.log("Student:", data);
        } catch (err) {
          console.error(err);
        }
}





    function viewStudent(studentId) {
      
      const student = students.find(s => s.uid == studentId);
      
      if (!student) return;

     console.log(student);

      // Populate the detailed student information
      document.getElementById("studentFullName").textContent = `${student.firstName} ${student.middleName || ''} ${student.lastName}`;
      document.getElementById("studentSection").textContent = student.section;
      document.getElementById("studentSemester").textContent = student.semester;
      document.getElementById("studentUID").textContent = student.uid;
      document.getElementById("studentYear").textContent = student.year;
      document.getElementById("studentMobile").textContent = student.mobile;
      document.getElementById("studentEmail").textContent = student.email;
      document.getElementById("studentLinkedIn").textContent = student.linkedInId;
      document.getElementById("studentAddress").textContent = student.permanentAddress;

      // Parent information
      document.getElementById("fatherName").textContent = student.fatherName;
      document.getElementById("fatherMobile").textContent = student.mobile.replace(student.mobile.slice(-1), (parseInt(student.mobile.slice(-1)) + 1).toString());
      document.getElementById("fatherEmail").textContent = student.email.replace('@', '.father@');
      document.getElementById("fatherOccupation").textContent = "Software Engineer";
      document.getElementById("motherName").textContent = student.motherName;
      document.getElementById("motherMobile").textContent = student.mobile.replace(student.mobile.slice(-1), (parseInt(student.mobile.slice(-1)) + 2).toString());
      document.getElementById("motherEmail").textContent = student.email.replace('@', '.mother@');
      document.getElementById("motherOccupation").textContent = "Teacher";

      // Academic information
      document.getElementById("currentSemester").textContent = student.semester;
      document.getElementById("backlogCount").textContent = student.backlogSubjects === "None" ? "0" : "1";
      document.getElementById("backlogSubjects").innerHTML = student.backlogSubjects === "None" ? '<span class="empty-value">None</span>' : student.backlogSubjects;

      // Career development activities
      document.getElementById("aptitudeScore").textContent = "85/100";
      document.getElementById("aptitudeDate").textContent = "2023-10-15";
      document.getElementById("cocubesScore").textContent = "720/1000";
      document.getElementById("cocubesDate").textContent = "2023-11-20";
      document.getElementById("gateScore").textContent = "650 (GATE)";
      document.getElementById("gateDate").textContent = "2024-02-10";
      document.getElementById("otherExamName").textContent = "Google Data Analytics";
      document.getElementById("otherExamScore").textContent = "Certified";
      document.getElementById("otherExamDate").textContent = "2023-08-05";

      // Project and internship details
      document.getElementById("microProjectTitle").textContent = student.projects? student.projects[0] : "NULL";
      document.getElementById("microProjectGuide").textContent = "Prof. Anil Kumar";
      document.getElementById("majorProjectTitle").textContent = student.projects? student.projects[1] : "NULL";
      document.getElementById("majorProjectGuide").textContent = "Prof. Sunita Verma";
      document.getElementById("internship1Company").textContent = student.internships? student.internships[0] : "NULL";
      document.getElementById("internship1Domain").textContent = student.domain? student.domain[0]: "Not entered yet";
      document.getElementById("internship1Type").textContent = "Physical";
      document.getElementById("internship1Paid").textContent = "Paid";
      document.getElementById("internship1Duration").textContent = "2023-06-01 to 2023-08-01";
      document.getElementById("internship2Company").textContent = student.internships? student.internships[1] : "Not done";
      document.getElementById("internship2Domain").textContent = student.domain? student.domain[1] : "NULL";
      document.getElementById("internship2Type").textContent = "Online";
      document.getElementById("internship2Paid").textContent = "Unpaid";
      document.getElementById("internship2Duration").textContent = "2023-12-01 to 2024-01-15";

      // SWOC Analysis
      document.getElementById("strengths").textContent = student.strengths;
      document.getElementById("weaknesses").textContent = student.weaknesses;
      document.getElementById("opportunities").textContent = student.opportunities;
      document.getElementById("challenges").textContent = student.challenges;

      // Career objectives and skills
      document.getElementById("careerObjectives").textContent = student.careerGoal === "Placement" ? "Job" : "Higher studies";
      document.getElementById("careerDetails").textContent = student.careerGoal === "Placement" ?
        "Software engineer role in tech industry" : "Pursue MS in Computer Science";
      document.getElementById("clarityPreparedness").textContent = "Good";
      document.getElementById("campusPlacement").textContent = student.careerGoal === "Placement" ? "Yes" : "No";
      document.getElementById("interpersonalSkills").textContent = student.softSkillsRating;
      document.getElementById("softSkills").textContent = "Presentation Skills, Writing";
      document.getElementById("additionalSkills").textContent = "Cloud Computing, Advanced Machine Learning";
      document.getElementById("expectations").textContent = "Industry mentorship, Advanced technical workshops, Placement preparation";

      // Update domain tags
      const domainContainer = document.getElementById("domainOfInterest");
      domainContainer.innerHTML = student.domain.map(d => `<span class="tag">${d}</span>`).join('');

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
      alert('Download functionality would be implemented here.');
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
          <td>10</td>
          <td>
            <button class="btn-sm btn-allocate" onclick="showAllocationInterface(${teacher.id})" ${assignedCount >= 10 ? 'disabled' : ''}>
              ➕ Allocate
            </button>
            <button class="btn-sm btn-view" onclick="viewAllocatedStudents(${teacher.id})">👁 View</button>
          </td>
        `;
        tbody.appendChild(row);
      });
    }

    async function showAllocationInterface(teacherId) {
      selectedTeacherForAllocation = teacherId;
      const teacher = teachers.find(t => t.id === teacherId);
      if (!teacher) return;

      const assignedStudents = teacher.studentsAssigned || [];
      if (assignedStudents.length >= 10) {
        alert("This teacher already has the maximum number of students (10).");
        return;
      }

      document.getElementById("selectedTeacherTitle").textContent = `Allocating Students to ${teacher.name}`;

      // Generate suggested students from backend
      try {
        const token = localStorage.getItem('access_token');
        console.log(`🔄 Generating allocations for teacher ID: ${teacherId}`);
        
        const response = await fetch(`http://localhost:5002/admin/faculty/${teacherId}/mentees/generate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log(`📡 API Response Status: ${response.status}`);
        const grid = document.getElementById("studentAllocationGrid");
        
        if (response.ok) {
          const suggestedStudents = await response.json();
          console.log(`📚 Suggested students received:`, suggestedStudents);
          grid.innerHTML = "";

          if (suggestedStudents.length === 0) {
            grid.innerHTML = `
              <div class="status-message info">
                <p>📋 <strong>No students available for assignment</strong></p>
                <p style="font-size: 14px;">All students are optimally distributed based on the current allocation algorithm.</p>
              </div>`;
          } else {
            suggestedStudents.forEach(student => {
              const div = document.createElement("div");
              div.className = "student-allocation-item";
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
          console.log(`📡 API Response (${response.status}):`, errorText);
          
          // Handle the "no unassigned students" case gracefully
          if (response.status === 400) {
            try {
              const errorData = JSON.parse(errorText);
              if (errorData.error && errorData.error.includes("No unassigned students")) {
                grid.innerHTML = `
                  <div class="status-message info">
                    <p>📋 <strong>No unassigned students available</strong></p>
                    <p style="font-size: 14px;">All students are already assigned to mentors, or there are no students in the system.</p>
                  </div>`;
              } else {
                grid.innerHTML = `
                  <div class="status-message warning">
                    <p>⚠️ <strong>Unable to load students</strong></p>
                    <p style="font-size: 14px;">${errorData.error || 'Unknown error occurred'}</p>
                  </div>`;
              }
            } catch (parseError) {
              grid.innerHTML = `
                <div class="status-message error">
                  <p>⚠️ <strong>Unable to load students</strong></p>
                  <p style="font-size: 14px;">Please try again later.</p>
                </div>`;
            }
          } else {
            grid.innerHTML = `
              <div class="status-message error">
                <p>❌ <strong>Error loading students</strong></p>
                <p style="font-size: 14px;">Server error (${response.status}). Please try again.</p>
              </div>`;
          }
        }
      } catch (error) {
        console.error('❌ Network/Connection Error:', error);
        document.getElementById("studentAllocationGrid").innerHTML = `
          <div class="status-message error">
            <p>🌐 <strong>Connection Error</strong></p>
            <p style="font-size: 14px;">Unable to connect to server. Please check your connection and try again.</p>
          </div>`;
      }

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
        const response = await fetch(`http://localhost:5002/admin/faculty/${selectedTeacherForAllocation}/mentees/confirm`, {
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

    async function viewAllocatedStudents(teacherId) {
      const teacher = teachers.find(t => t.id === teacherId);
      if (!teacher) return;

      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`http://localhost:5002/admin/faculty/${teacherId}/mentees`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const assignedStudents = await response.json();
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
          alert('❌ Failed to load assigned students');
        }
      } catch (error) {
        console.error('Error loading assigned students:', error);
        alert('❌ Error connecting to server');
      }
    }

    async function deallocateStudent(teacherId, studentId, studentUid) {
      if (!confirm(`Are you sure you want to remove student ${studentUid} from this teacher?`)) {
        return;
      }

      try {
        const token = localStorage.getItem('access_token');
        
        // Remove student assignment by setting mentor_id to null
        const response = await fetch(`http://localhost:5002/api/students/${studentId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            mentor_id: null
          })
        });

        if (response.ok) {
          alert(`✅ Successfully removed student ${studentUid} from teacher assignment`);
          
          // Refresh data
          await loadTeachersFromAPI();
          await loadStudentsFromAPI();
          renderAllocation();
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
    document.getElementById('bulkUploadFile').addEventListener('change', function (e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
          try {
            // This is a simplified version - you would need a proper CSV/Excel parser
            const data = e.target.result;
            alert('Bulk upload functionality would process the file here. File loaded: ' + file.name);
            // In a real implementation, you would parse CSV/Excel and add users
          } catch (error) {
            alert('Error processing file: ' + error.message);
          }
        };
        reader.readAsText(file);
      }
    });

    function downloadExcelFormat() {
      const csvContent = `User ID,Password,Role,First Name,Last Name,Email
FAC001,password123,teacher,John,Doe,john.doe@university.edu
21CE001,password123,student,Jane,Smith,jane.smith@student.edu`;

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bulk_upload_format.csv';
      a.click();
      window.URL.revokeObjectURL(url);
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
 