let currentSemester = 1;
let toppersChart = null;
let distributionChart = null;
let allStudentsData = [];

// DOM Content Loaded Event
document.addEventListener('DOMContentLoaded', function () {
  // Check if we're on the reports section
  const reportsSection = document.getElementById('reports');
  if (reportsSection && !reportsSection.classList.contains('hidden')) {
    initializeReports();
  }

  // Set up semester tabs event listeners
  setupSemesterTabs();
});

// Fetch students with filters
async function fetchStudents(filters = {}) {
  try {
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.error('No access token found');
      throw new Error('Please log in to access student data');
    }

    const queryParams = new URLSearchParams();
    if (filters.semester) queryParams.append('semester', filters.semester);
    if (filters.section) queryParams.append('section', filters.section);
    if (filters.year_of_admission) queryParams.append('year_of_admission', filters.year_of_admission);
    if (filters.uid) queryParams.append('uid', filters.uid);
    if (filters.name) queryParams.append('name', filters.name);

    const url = `http://localhost:5002/api/students?${queryParams.toString()}`;


    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to fetch students:', error);
      throw new Error(error.error || 'Failed to load students');
    }

    const students = await response.json();


    return students.map(student => {
      // Calculate current SGPA
      let currentSGPA = 0.0;
      let backlogs = 0;
      let backlogSubjects = [];


      if (student.post_admission_records && student.post_admission_records.length > 0) {
        // Find record for current semester


        const currentRecord = student.post_admission_records.find(rec => rec.semester + 1 === student.semester);
        if (currentRecord) {

          const c_sgpa = student.post_admission_records.reduce((sum, rec) => sum + rec.sgpa, 0);
          currentSGPA = c_sgpa / student.post_admission_records.length;



          // Calculate backlogs
          student.post_admission_records.forEach(record => {

            if (record.backlog_subjects && record.backlog_subjects !== 'N/A' && record.backlog_subjects !== 'None') {
              backlogs++;
              backlogSubjects.push(`Sem ${record.semester}: ${record.backlog_subjects}`);
            }
          });
        }
      }

      // Extract domain and career goal
      let domain = '';
      let careerGoal = '';

      if (student.skills && student.skills.domains_of_interest) {
        domain = student.skills.domains_of_interest;
      }

      if (student.career_objective && student.career_objective.career_goal) {
        careerGoal = student.career_objective.career_goal;
      }

      return {
        uid: student.uid,
        name: student.full_name,
        semester: student.semester,
        sgpa: currentSGPA,
        backlogs: backlogs,
        backlogSubjects: backlogSubjects,
        domain: domain,
        careerGoal: careerGoal,
        post_admission_records: student.post_admission_records || [],
        rawData: student // Keep the raw data for detailed views
      };
    });
  } catch (error) {
    console.error('Error fetching students:', error.message);
    throw error;
  }
}

// Fetch all students data
async function fetchStudentsData() {
  return await fetchStudents();
}

// Fetch toppers for a specific semester
async function fetchToppers(semester) {
  try {
    const students = await fetchStudents({ semester });



    // Process each student to get their SGPA for the selected semester
    const studentsWithSemesterSGPA = students.map(student => {
      let semesterSGPA = 0.0;

      // Find the SGPA for the selected semester
      if (student.post_admission_records) {
        const record = student.post_admission_records.find(
          (rec) => rec.semester + 1 === semester);


        if (record) {
          semesterSGPA = record.sgpa || 0.0;
        }
      }

      return {
        ...student,
        sgpa: semesterSGPA
      };
    });

    // Filter out students with no SGPA for this semester and sort
    return studentsWithSemesterSGPA
      .filter(student => student.sgpa > 0)
      .sort((a, b) => b.sgpa - a.sgpa)
      .slice(0, 10);
  } catch (error) {
    console.error('Error fetching toppers:', error);
    throw error;
  }
}

// Fetch semester distribution
async function fetchSemesterDistribution() {
  const students = await fetchStudents();
  const distribution = {};
  students.forEach(student => {
    distribution[student.semester] = (distribution[student.semester] || 0) + 1;
  });
  return distribution;
}

// Fetch students with backlogs
async function fetchBacklogStudents() {
  const students = await fetchStudents();
  return students.filter(student => student.backlogs > 0);
}

// Initialize all reports
function initializeReports() {
  loadMetrics();
  loadToppers(currentSemester);
  loadSemesterDistribution();
  loadBacklogStudents();
  loadGeneralReport();
}

// Set up semester tabs
// Set up semester tabs
function setupSemesterTabs() {
  const tabsContainer = document.getElementById('semesterTabs');
  if (!tabsContainer) {
    console.error('Semester tabs container not found');
    return;
  }

  // Activate the first tab by default
  const firstTab = tabsContainer.querySelector('.semester-tab');
  if (firstTab) {
    firstTab.classList.add('active');
    currentSemester = parseInt(firstTab.dataset.semester);
  }

  tabsContainer.querySelectorAll('.semester-tab').forEach(tab => {
    tab.addEventListener('click', function () {
      tabsContainer.querySelectorAll('.semester-tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      currentSemester = parseInt(this.dataset.semester);

      loadToppers(currentSemester);
    });
  });
}

// Load metrics
async function loadMetrics() {
  try {
    allStudentsData = await fetchStudentsData();
    console.log(allStudentsData[0]);

    const totalStudents = allStudentsData.length;

    // Calculate average SGPA (not CGPA)

    const totalSGPA = allStudentsData.reduce((sum, student) => sum + student.sgpa, 0);
    const avgSGPA = totalStudents > 0 ? (totalSGPA / totalStudents).toFixed(2) : '0.00';

    const backlogStudents = allStudentsData.filter(student => student.backlogs > 0).length;
    const activeSemesters = [...new Set(allStudentsData.map(student => student.semester))].length;

    document.getElementById('totalStudentsMetric').textContent = totalStudents;
    document.getElementById('avgSGPAMetric').textContent = avgSGPA; // Updated ID
    document.getElementById('totalBacklogsMetric').textContent = backlogStudents;
    document.getElementById('activeSemestersMetric').textContent = activeSemesters;
  } catch (error) {
    console.error('Error loading metrics:', error);
    showError(`Error loading metrics: ${error.message}`);
  }
}

// Load toppers for a semester
async function loadToppers(semester) {
  try {

    const toppers = await fetchToppers(semester);
    const tbody = document.getElementById('toppersTableBody');
    if (!tbody) {
      console.error('Toppers table body not found');
      return;
    }

    tbody.innerHTML = '';

    if (toppers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="no-data">No data available for this semester</td></tr>';
      updateToppersChart([]);
      return;
    }



    toppers.forEach((student, index) => {

      const row = document.createElement('tr');
      row.innerHTML = `
                <td>${index + 1}</td>
                <td>${student.name}</td>
                <td>${student.uid}</td>
                <td>${student.sgpa.toFixed(2)}</td>
            `;
      tbody.appendChild(row);
    });

    updateToppersChart(toppers);
  } catch (error) {
    console.error('Error loading toppers:', error);
    showError(`Error loading toppers: ${error.message}`);
  }
}

// Update toppers chart
function updateToppersChart(toppers) {
  const ctx = document.getElementById('toppersChart');
  if (!ctx) {
    console.error('Toppers chart canvas not found');
    return;
  }

  // Get the context
  const chartCtx = ctx.getContext('2d');
  if (!chartCtx) {
    console.error('Could not get chart context');
    return;
  }

  // Destroy existing chart if it exists
  if (toppersChart) {
    toppersChart.destroy();
  }

  if (toppers.length === 0) {
    // Clear the canvas
    chartCtx.clearRect(0, 0, ctx.width, ctx.height);
    // Display a message
    chartCtx.font = '16px Arial';
    chartCtx.fillStyle = '#64748b';
    chartCtx.textAlign = 'center';
    chartCtx.fillText('No data available', ctx.width / 2, ctx.height / 2);
    return;
  }

  // Create the chart
  toppersChart = new Chart(chartCtx, {
    type: 'bar',
    data: {
      labels: toppers.map(student => student.name.split(' ')[0]),
      datasets: [{
        label: 'SGPA',
        data: toppers.map(student => student.sgpa),
        backgroundColor: 'rgba(14, 165, 233, 0.8)',
        borderColor: 'rgba(14, 165, 233, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: false,
          min: Math.max(0, Math.min(...toppers.map(s => s.sgpa)) - 1),
          max: 10,
          title: {
            display: true,
            text: 'SGPA'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Students'
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        title: {
          display: true,
          text: `Top ${toppers.length} Students - Semester ${currentSemester}`
        }
      }
    }
  });
}

// Load semester distribution
async function loadSemesterDistribution() {
  try {
    const distribution = await fetchSemesterDistribution();
    const total = allStudentsData.length;
    const tbody = document.getElementById('distributionTableBody');
    if (!tbody) {
      console.error('Distribution table body not found');
      return;
    }

    tbody.innerHTML = '';

    Object.keys(distribution).sort((a, b) => a - b).forEach(semester => {
      const count = distribution[semester];
      const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';

      const row = document.createElement('tr');
      row.innerHTML = `
                <td>Semester ${semester}</td>
                <td>${count}</td>
                <td>${percentage}%</td>
            `;
      tbody.appendChild(row);
    });

    updateDistributionChart(distribution);
  } catch (error) {
    console.error('Error loading semester distribution:', error);
    showError(`Error loading semester distribution: ${error.message}`);
  }
}

// Update distribution chart
function updateDistributionChart(distribution) {
  const ctx = document.getElementById('distributionChart');
  if (!ctx) {
    console.error('Distribution chart canvas not found');
    return;
  }

  // Get the context
  const chartCtx = ctx.getContext('2d');
  if (!chartCtx) {
    console.error('Could not get chart context');
    return;
  }

  if (distributionChart) {
    distributionChart.destroy();
  }

  // Check if we have data
  const semesters = Object.keys(distribution);
  if (semesters.length === 0) {
    // Clear the canvas
    chartCtx.clearRect(0, 0, ctx.width, ctx.height);
    // Display a message
    chartCtx.font = '16px Arial';
    chartCtx.fillStyle = '#64748b';
    chartCtx.textAlign = 'center';
    chartCtx.fillText('No data available', ctx.width / 2, ctx.height / 2);
    return;
  }

  distributionChart = new Chart(chartCtx, {
    type: 'pie',
    data: {
      labels: semesters.map(sem => `Sem ${sem}`),
      datasets: [{
        data: semesters.map(sem => distribution[sem]),
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 205, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 159, 64, 0.8)',
          'rgba(199, 199, 199, 0.8)',
          'rgba(83, 102, 255, 0.8)'
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        },
        title: {
          display: true,
          text: 'Student Distribution by Semester'
        }
      }
    }
  });
}

// Load backlog students
async function loadBacklogStudents() {
  try {
    const backlogStudents = await fetchBacklogStudents();
    const backlogCountElement = document.getElementById('backlogStudentsCount');
    const backlogList = document.getElementById('backlogList');

    if (!backlogCountElement || !backlogList) {
      console.error('Backlog elements not found');
      return;
    }

    backlogCountElement.textContent = backlogStudents.length;

    backlogList.innerHTML = '';

    if (backlogStudents.length === 0) {
      backlogList.innerHTML = '<div class="no-data">No students have backlogs in current semester! 🎉</div>';
      return;
    }

    backlogStudents.forEach(student => {
      const item = document.createElement('div');
      item.className = 'backlog-item';
      item.innerHTML = `
                <div style="font-weight: 600; margin-bottom: 5px;">
                    ${student.name} (${student.uid}) - Semester ${student.semester}
                </div>
                <div style="color: #64748b; font-size: 12px;">
                    Backlogs (${student.backlogs}): ${student.backlogSubjects.join(', ')}
                </div>
            `;
      backlogList.appendChild(item);
    });
  } catch (error) {
    console.error('Error loading backlog students:', error);
    showError(`Error loading backlog students: ${error.message}`);
  }
}

// Load general report
async function loadGeneralReport() {
  try {
    allStudentsData = await fetchStudentsData();

    updateGeneralReportTable(allStudentsData);
  } catch (error) {
    console.error('Error loading general report:', error);
    showError(`Error loading general report: ${error.message}`);
  }
}

// Filter general report
function filterGeneralReport() {
  const searchTerm = document.getElementById('generalSearchInput')?.value.toLowerCase() || '';
  const semesterFilter = document.getElementById('generalSemesterFilter')?.value;
  const sgpaFilter = document.getElementById('sgpaRangeFilter')?.value; // Updated ID
  const backlogFilter = document.getElementById('backlogCountFilter')?.value;

  let filteredData = [...allStudentsData];

  if (searchTerm) {
    filteredData = filteredData.filter(student =>
      student.name.toLowerCase().includes(searchTerm) ||
      student.uid.toLowerCase().includes(searchTerm)
    );
  }

  if (semesterFilter) {
    filteredData = filteredData.filter(student =>
      student.semester === parseInt(semesterFilter)
    );
  }

  if (sgpaFilter) { // Updated variable name
    const [min, max] = sgpaFilter.split('-').map(Number); // Updated variable name
    filteredData = filteredData.filter(student => {
      if (sgpaFilter === '0-6') { // Updated variable name
        return student.sgpa < 6;
      }
      return student.sgpa >= min && student.sgpa < max;
    });
  }

  if (backlogFilter) {
    if (backlogFilter === '0') {
      filteredData = filteredData.filter(student => student.backlogs === 0);
    } else if (backlogFilter === '1-2') {
      filteredData = filteredData.filter(student => student.backlogs >= 1 && student.backlogs <= 2);
    } else if (backlogFilter === '3-5') {
      filteredData = filteredData.filter(student => student.backlogs >= 3 && student.backlogs <= 5);
    } else if (backlogFilter === '5+') {
      filteredData = filteredData.filter(student => student.backlogs > 5);
    }
  }

  updateGeneralReportTable(filteredData);
}

// Update general report table - UPDATED
function updateGeneralReportTable(data) {
  const tbody = document.getElementById('generalReportTableBody');
  if (!tbody) {
    console.error('General report table body not found');
    return;
  }

  tbody.innerHTML = '';

  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="no-data">No students match the selected filters</td></tr>';
    return;
  }

  data.forEach(student => {
    const row = document.createElement('tr');
    row.innerHTML = `
          <td>${student.uid}</td>
          <td>${student.name}</td>
          <td>${student.semester}</td>
          <td>${student.sgpa.toFixed(2)}</td> <!-- Using SGPA -->
          <td>
              <span style="color: ${student.backlogs > 0 ? '#ef4444' : '#059669'};">
                  ${student.backlogs}
              </span>
          </td>
          <td><span class="tag">${student.domain || 'Unknown'}</span></td>
          <td><span class="tag ${student.careerGoal ? student.careerGoal.toLowerCase().replace(/\s+/g, '-') : 'unknown'}">${student.careerGoal || 'Unknown'}</span></td>
          <td>
              <button class="btn-sm btn-view" onclick="viewStudentDetails('${student.uid}')">View</button>
          </td>
      `;
    tbody.appendChild(row);
  });
}

// Refresh all reports
function refreshReports() {
  document.getElementById('totalStudentsMetric').textContent = '-';
  document.getElementById('avgSGPAMetric').textContent = '-'; // Updated ID
  document.getElementById('totalBacklogsMetric').textContent = '-';
  document.getElementById('activeSemestersMetric').textContent = '-';

  initializeReports();
}





// Option 1: Process all students in smaller batches
async function exportAllReportsBatched() {
  if (!Array.isArray(allStudentsData) || allStudentsData.length === 0) {
    alert('No student data available for download.');
    return;
  }

  const studentDataArray = [];
  allStudentsData.forEach(student => studentDataArray.push(student.rawData));

  const BATCH_SIZE = 10; // Process 10 students at a time
  const totalStudents = studentDataArray.length;

  console.log(`Processing ${totalStudents} students in batches of ${BATCH_SIZE}`);

  for (let i = 0; i < totalStudents; i += BATCH_SIZE) {
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(totalStudents / BATCH_SIZE);

    console.log(`Processing batch ${batchNumber}/${totalBatches}`);

    const batch = studentDataArray.slice(i, i + BATCH_SIZE);
    const batchUIDs = batch.map(s => s.uid || s.full_name.replace(/\s/g, '_')).join('_');
    const fileName = `student_report_batch_${batchNumber}_${batchUIDs.substring(0, 50)}.pdf`;

    await processBatch(batch, fileName, batchNumber, totalBatches);

    // Add a small delay between batches to prevent overwhelming the browser
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  alert('All batches processed successfully!');
  document.getElementById("progress").style.display = "none";
}

async function processBatch(studentBatch, fileName, batchNumber, totalBatches) {
  const content = document.createElement('div');
  let htmlContent = '';

  studentBatch.forEach((student, index) => {
    if (index > 0) {
      htmlContent += '<div style="page-break-before: always;"></div>';
    }

    const flattenedData = flattenStudentData(student);
    htmlContent += generatePDFContent(flattenedData);
  });

  content.innerHTML = htmlContent;

  const opt = {
    margin: [10, 10, 10, 10],
    filename: fileName,
    image: { type: 'jpeg', quality: 0.95 }, // Slightly reduced quality for performance
    html2canvas: {
      scale: 1.5, // Reduced scale for better performance
      useCORS: true,
      logging: false // Disable logging for better performance
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait'
    }
  };

  try {
    // Show progress
    const progressDiv = document.getElementById('progress') || createProgressDiv();
    progressDiv.innerHTML = `Processing batch ${batchNumber}/${totalBatches}...`;

    await html2pdf().set(opt).from(content).save();
    console.log(`Batch ${batchNumber} completed successfully`);

    progressDiv.innerHTML = `Batch ${batchNumber}/${totalBatches} completed!`;

  } catch (error) {
    console.error(`Error generating PDF for batch ${batchNumber}:`, error);
    alert(`Error generating PDF for batch ${batchNumber}. Check console for details.`);
  }
}

function createProgressDiv() {
  const progressDiv = document.createElement('div');
  progressDiv.id = 'progress';
  progressDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #2563eb;
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    font-family: Arial, sans-serif;
    z-index: 10000;
  `;
  document.body.appendChild(progressDiv);
  return progressDiv;
}




/**
 * Flattens the nested JSON object into a single-level object.
 * This makes it easy to work with a long list of properties for the PDF.
 * It also handles missing objects and arrays gracefully.
 */
function flattenStudentData(data) {
  const getValue = (value) => {
    if (value === null || value === undefined || value === "") {
      return "N/A";
    }
    // Handle arrays - join them with commas
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : "N/A";
    }
    return value.toString();
  };

  const flattened = {
    // Main Student Info
    fullName: getValue(data.full_name),
    section: getValue(data.section),
    semester: getValue(data.semester),
    uid: getValue(data.uid),
    year: getValue(data.year_of_admission),

    // Personal Info (default to N/A if personal_info is null)
    dob: getValue(data.personal_info?.dob),
    gender: getValue(data.personal_info?.gender),
    mobile: getValue(data.personal_info?.mobile_no),
    personalEmail: getValue(data.personal_info?.personal_email),
    collegeEmail: getValue(data.personal_info?.college_email),
    linkedin: getValue(data.personal_info?.linked_in_id),
    address: getValue(data.personal_info?.permanent_address),
    emergencyContactName: getValue(data.personal_info?.emergency_contact_name),
    emergencyContactNumber: getValue(data.personal_info?.emergency_contact_number),

    // Parent's Information
    fatherName: getValue(data.personal_info?.father_name),
    fatherMobile: getValue(data.personal_info?.father_mobile_no),
    fatherEmail: getValue(data.personal_info?.father_email),
    fatherOccupation: getValue(data.personal_info?.father_occupation),
    motherName: getValue(data.personal_info?.mother_name),
    motherMobile: getValue(data.personal_info?.mother_mobile_no),
    motherEmail: getValue(data.personal_info?.mother_email),
    motherOccupation: getValue(data.personal_info?.mother_occupation),

    // Academic Info - Before Admission
    sscPercentage: getValue(data.past_education_records?.[0]?.percentage),
    sscYear: getValue(data.past_education_records?.[0]?.year_of_passing),
    hsscPercentage: getValue(data.past_education_records?.[1]?.percentage),
    hsscYear: getValue(data.past_education_records?.[1]?.year_of_passing),

    // Academic Info - After Admission
    sem1SGPA: getValue(data.post_admission_records?.[0]?.sgpa),
    sem2SGPA: getValue(data.post_admission_records?.[1]?.sgpa),
    sem3SGPA: getValue(data.post_admission_records?.[2]?.sgpa),
    sem4SGPA: getValue(data.post_admission_records?.[3]?.sgpa),
    sem5SGPA: getValue(data.post_admission_records?.[4]?.sgpa),
    sem6SGPA: getValue(data.post_admission_records?.[5]?.sgpa),
    sem7SGPA: getValue(data.post_admission_records?.[6]?.sgpa),
    sem8SGPA: getValue(data.post_admission_records?.[7]?.sgpa),
    backlogSubjects: getValue(data.post_admission_records?.[0]?.backlog_subjects),

    // Career Activities
    aptitudeScore: getValue(data.career_activities?.[0]?.score),
    aptitudeDate: getValue(data.career_activities?.[0]?.date),
    cocubesScore: getValue(data.career_activities?.[1]?.score),
    cocubesDate: getValue(data.career_activities?.[1]?.date),
    gateScore: getValue(data.career_activities?.[2]?.score),
    gateDate: getValue(data.career_activities?.[2]?.date),
    otherExamName: getValue(data.career_activities?.[3]?.name),
    otherExamScore: getValue(data.career_activities?.[3]?.score),
    otherExamDate: getValue(data.career_activities?.[3]?.date),

    // Projects
    project1Title: getValue(data.projects?.[0]?.title),
    project1Description: getValue(data.projects?.[0]?.description),
    project2Title: getValue(data.projects?.[1]?.title),
    project2Description: getValue(data.projects?.[1]?.description),

    // Internships
    internship1Company: getValue(data.internships?.[0]?.company),
    internship1Domain: getValue(data.internships?.[0]?.domain),
    internship1Type: getValue(data.internships?.[0]?.type),
    internship1Paid: getValue(data.internships?.[0]?.paid),
    internship1Duration: getValue(data.internships?.[0]?.duration),
    internship2Company: getValue(data.internships?.[1]?.company),
    internship2Domain: getValue(data.internships?.[1]?.domain),
    internship2Type: getValue(data.internships?.[1]?.type),
    internship2Paid: getValue(data.internships?.[1]?.paid),
    internship2Duration: getValue(data.internships?.[1]?.duration),

    // SWOC Analysis
    strengths: getValue(data.swoc?.strengths),
    weaknesses: getValue(data.swoc?.weaknesses),
    opportunities: getValue(data.swoc?.opportunities),
    challenges: getValue(data.swoc?.challenges),

    // Career Objectives
    careerObjectives: getValue(data.career_objective?.career_goal),
    careerDetails: getValue(data.career_objective?.specific_details),
    clarityPreparedness: getValue(data.career_objective?.clarity_preparedness),
    campusPlacement: getValue(data.career_objective?.interested_in_campus_placement),
    campusPlacementReasons: getValue(data.career_objective?.campus_placement_reasons),

    // Skills
    programmingLanguages: getValue(data.skills?.programming_languages),
    technologiesFrameworks: getValue(data.skills?.technologies_frameworks),
    familiarToolsPlatforms: getValue(data.skills?.familiar_tools_platforms),
    domainOfInterest: getValue(data.skills?.domains_of_interest),

    // Co-curricular activities
    organizations: getValue(data.cocurricular_organizations?.map(org => org.name)),
    participations: getValue(data.cocurricular_participations?.map(part => part.activity)),

    expectations: 'N/A', // This field is not in the JSON, so it's defaulted
  };

  console.log('Flattened data:', flattened);
  return flattened;
}

/**
 * Generates the complete HTML content for a single student's report.
 * It uses the flattened data object to populate the HTML fields.
 */
function generatePDFContent(data) {
  const tableRow = (label, value) => `
    <tr>
      <td style="border: 1px solid #ddd; padding: 8px; width: 30%; background-color: #f9f9f9;"><strong>${label}</strong></td>
      <td style="border: 1px solid #ddd; padding: 8px; word-wrap: break-word;">${value}</td>
    </tr>
  `;

  const headerStyle = "color: #1e40af; background: #f0f5ff; padding: 10px; border-radius: 5px; margin-bottom: 10px;";
  const tableStyle = "width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px;";

  const content = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: auto; line-height: 1.4;">
      <h1 style="color: #2563eb; text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 20px;">
        🎓 Student Information Report
      </h1>

      <div style="margin: 20px 0;">
        <h2 style="${headerStyle}">Student's Personal Information</h2>
        <table style="${tableStyle}">
          ${tableRow("Full Name", data.fullName)}
          ${tableRow("Section", data.section)}
          ${tableRow("Semester", data.semester)}
          ${tableRow("Roll No./UID", data.uid)}
          ${tableRow("Year of Admission", data.year)}
          ${tableRow("Date of Birth", data.dob)}
          ${tableRow("Gender", data.gender)}
          ${tableRow("Mobile No.", data.mobile)}
          ${tableRow("Personal Email ID", data.personalEmail)}
          ${tableRow("College Email ID", data.collegeEmail)}
          ${tableRow("LinkedIn ID", data.linkedin)}
          ${tableRow("Permanent Address", data.address)}
          ${tableRow("Emergency Contact Name", data.emergencyContactName)}
          ${tableRow("Emergency Contact Number", data.emergencyContactNumber)}
        </table>
      </div>

      <div style="margin: 20px 0;">
        <h2 style="${headerStyle}">Parent's Information</h2>
        <table style="${tableStyle}">
          ${tableRow("Father's Name", data.fatherName)}
          ${tableRow("Father's Mobile No.", data.fatherMobile)}
          ${tableRow("Father's Email ID", data.fatherEmail)}
          ${tableRow("Father's Occupation", data.fatherOccupation)}
          ${tableRow("Mother's Name", data.motherName)}
          ${tableRow("Mother's Mobile No.", data.motherMobile)}
          ${tableRow("Mother's Email ID", data.motherEmail)}
          ${tableRow("Mother's Occupation", data.motherOccupation)}
        </table>
      </div>
      
      <div style="margin: 20px 0;">
        <h2 style="${headerStyle}">Academic Information - Before Admission</h2>
        <table style="${tableStyle}">
          ${tableRow("SSC Percentage/Grade", data.sscPercentage)}
          ${tableRow("SSC Year of Passing", data.sscYear)}
          ${tableRow("HSSC Percentage/Grade", data.hsscPercentage)}
          ${tableRow("HSSC Year of Passing", data.hsscYear)}
        </table>
      </div>

      <div style="margin: 20px 0;">
        <h2 style="${headerStyle}">Academic Information - After Admission</h2>
        <table style="${tableStyle}">
          ${tableRow("Semester 1 SGPA", data.sem1SGPA)}
          ${tableRow("Semester 2 SGPA", data.sem2SGPA)}
          ${tableRow("Semester 3 SGPA", data.sem3SGPA)}
          ${tableRow("Semester 4 SGPA", data.sem4SGPA)}
          ${tableRow("Semester 5 SGPA", data.sem5SGPA)}
          ${tableRow("Semester 6 SGPA", data.sem6SGPA)}
          ${tableRow("Semester 7 SGPA", data.sem7SGPA)}
          ${tableRow("Semester 8 SGPA", data.sem8SGPA)}
          ${tableRow("Backlog Subject Names", data.backlogSubjects)}
        </table>
      </div>

      <div style="margin: 20px 0;">
        <h2 style="${headerStyle}">Performance in Career Development Activities</h2>
        <table style="${tableStyle}">
          ${tableRow("Aptitude Score/Rank", data.aptitudeScore)}
          ${tableRow("Aptitude Date", data.aptitudeDate)}
          ${tableRow("Cocubes Score/Rank", data.cocubesScore)}
          ${tableRow("Cocubes Date", data.cocubesDate)}
          ${tableRow("Gate Score/Rank", data.gateScore)}
          ${tableRow("Gate Date", data.gateDate)}
          ${tableRow("Other Exam Name", data.otherExamName)}
          ${tableRow("Other Exam Score/Rank", data.otherExamScore)}
          ${tableRow("Other Exam Date", data.otherExamDate)}
        </table>
      </div>

      <div style="margin: 20px 0;">
        <h2 style="${headerStyle}">Project and Internship Details</h2>
        <table style="${tableStyle}">
          ${tableRow("Project 1 Title", data.project1Title)}
          ${tableRow("Project 1 Description", data.project1Description)}
          ${tableRow("Project 2 Title", data.project2Title)}
          ${tableRow("Project 2 Description", data.project2Description)}
          ${tableRow("Internship 1 Company", data.internship1Company)}
          ${tableRow("Internship 1 Domain", data.internship1Domain)}
          ${tableRow("Internship 1 Type", data.internship1Type)}
          ${tableRow("Internship 1 Paid/Unpaid", data.internship1Paid)}
          ${tableRow("Internship 1 Duration", data.internship1Duration)}
          ${tableRow("Internship 2 Company", data.internship2Company)}
          ${tableRow("Internship 2 Domain", data.internship2Domain)}
          ${tableRow("Internship 2 Type", data.internship2Type)}
          ${tableRow("Internship 2 Paid/Unpaid", data.internship2Paid)}
          ${tableRow("Internship 2 Duration", data.internship2Duration)}
        </table>
      </div>

      <div style="margin: 20px 0;">
        <h2 style="${headerStyle}">SWOC Analysis</h2>
        <table style="${tableStyle}">
          ${tableRow("Strengths", data.strengths)}
          ${tableRow("Weaknesses", data.weaknesses)}
          ${tableRow("Opportunities", data.opportunities)}
          ${tableRow("Challenges", data.challenges)}
        </table>
      </div>

      <div style="margin: 20px 0;">
        <h2 style="${headerStyle}">Career Objectives and Skills</h2>
        <table style="${tableStyle}">
          ${tableRow("Career Objectives", data.careerObjectives)}
          ${tableRow("Specific Details", data.careerDetails)}
          ${tableRow("Clarity and Preparedness", data.clarityPreparedness)}
          ${tableRow("Interested in Campus Placement", data.campusPlacement)}
          ${tableRow("Campus Placement Reasons", data.campusPlacementReasons)}
          ${tableRow("Programming Languages", data.programmingLanguages)}
          ${tableRow("Technologies/Frameworks", data.technologiesFrameworks)}
          ${tableRow("Familiar Tools/Platforms", data.familiarToolsPlatforms)}
          ${tableRow("Domain of Interest", data.domainOfInterest)}
        </table>
      </div>

      <div style="margin: 20px 0;">
        <h2 style="${headerStyle}">Co-curricular Activities</h2>
        <table style="${tableStyle}">
          ${tableRow("Organizations", data.organizations)}
          ${tableRow("Participations", data.participations)}
          ${tableRow("Expectations from Institute/Department", data.expectations)}
        </table>
      </div>

      <div style="text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e5e5; padding-top: 10px;">
        Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
      </div>
    </div>
  `;

  return content;
}

// Export backlog report
function exportBacklogReport() {
  // Filter students with backlogs
  const backlogStudents = allStudentsData.filter(student => student.backlogs > 0);

  // Prepare data for Excel with only required fields
  const excelData = backlogStudents.map(student => ({
    "UID": student.uid,
    "Name": student.name,
    "Backlog Subjects": student.backlogSubjects.join(", ")
  }));

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(excelData);

  // Set column widths
  const colWidths = [
    { wch: 10 }, // UID
    { wch: 25 }, // Name
    { wch: 50 }  // Backlog Subjects
  ];
  ws['!cols'] = colWidths;

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Backlog Students");

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const filename = `backlog_report_${timestamp}.xlsx`;

  // Download the file
  XLSX.writeFile(wb, filename);

  alert('✅ Backlog Excel report exported successfully!');
}

// Export to Excel
function exportToExcel() {
  const csvContent = convertToCSV(allStudentsData);
  downloadCSV(csvContent, 'general_report.csv');
  alert('📊 Data exported to Excel format!');
}

// Export to PDF (jsPDF + autoTable)
function exportToPDF() {

  try {
    if (!window.jspdf || !window.jspdf.jsPDF || !window.jspdf.jsPDF.prototype.autoTable) {
      // Fallback: try to access autoTable directly attached by plugin
      if (!window.jspdf || !window.jspdf.jsPDF || !window.jsPDF || !document) {
        showError('PDF libraries not loaded. Please try again after the page fully loads.');
        return;
      }
    }

    const { metrics, students, semesterDistribution, domainCounts, backlogSummary, timestamp } = buildReportData();

    const jsPDFCtor = window.jspdf.jsPDF;
    const doc = new jsPDFCtor({ unit: 'pt', format: 'a4', compress: true });

    // Styles
    const pageWidth = doc.internal.pageSize.getWidth();
    const left = 40; // padding left
    const right = 40; // padding right
    let cursorY = 50;

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Academic Reports Dashboard', pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 10;
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(1.2);
    doc.line(left, cursorY, pageWidth - right, cursorY);
    cursorY += 20;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date(timestamp).toLocaleString()}`, left, cursorY);
    cursorY += 16;

    // Section: Summary Metrics
    sectionTitle(doc, 'Summary Statistics', left, cursorY);
    cursorY += 10;
    doc.autoTable({
      startY: cursorY,
      head: [['Metric', 'Value']],
      body: [
        ['Total Students', metrics.totalStudents.toString()],
        ['Average SGPA', metrics.avgSGPA.toString()],
        ['Students with Backlogs', metrics.backlogStudents.toString()],
        ['Active Semesters', metrics.activeSemesters.toString()]
      ],
      styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [30, 64, 175] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left, right }
    });
    cursorY = doc.lastAutoTable.finalY + 20;

    // Section: Domain Distribution
    sectionTitle(doc, 'Domain Distribution', left, cursorY);
    cursorY += 10;
    const domainRows = Object.entries(domainCounts).map(([domain, count]) => [domain, String(count)]);
    doc.autoTable({
      startY: cursorY,
      head: [['Domain', 'Count']],
      body: domainRows.length ? domainRows : [['Unknown', '0']],
      styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [245, 158, 11] },
      alternateRowStyles: { fillColor: [253, 246, 178] },
      margin: { left, right }
    });
    cursorY = doc.lastAutoTable.finalY + 20;

    // Section: Semester-wise Performance
    sectionTitle(doc, 'Semester-wise Performance', left, cursorY);
    cursorY += 10;
    const semesterRows = Object.keys(semesterDistribution)
      .sort((a, b) => Number(a) - Number(b))
      .map(sem => [
        `Semester ${sem}`,
        String(semesterDistribution[sem].count),
        String(semesterDistribution[sem].avgSGPA),
        String(semesterDistribution[sem].backlogs)
      ]);
    doc.autoTable({
      startY: cursorY,
      head: [['Semester', 'Students', 'Avg SGPA', 'Total Backlogs']],
      body: semesterRows.length ? semesterRows : [['-', '0', '0.00', '0']],
      styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [16, 185, 129] },
      alternateRowStyles: { fillColor: [219, 246, 232] },
      margin: { left, right }
    });
    cursorY = doc.lastAutoTable.finalY + 20;

    // Section: Backlog Summary
    sectionTitle(doc, 'Backlog Summary', left, cursorY);
    cursorY += 10;
    doc.autoTable({
      startY: cursorY,
      head: [['Metric', 'Value']],
      body: [
        ['Total Backlog Students', String(backlogSummary.totalBacklogStudents)],
        ['Percentage of Cohort', `${backlogSummary.percentage}%`]
      ],
      styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [239, 68, 68] },
      alternateRowStyles: { fillColor: [252, 231, 232] },
      margin: { left, right }
    });
    cursorY = doc.lastAutoTable.finalY + 20;

    // Section: General Report (Students)
    sectionTitle(doc, 'General Report (Students)', left, cursorY);
    cursorY += 10;
    const studentRows = students.map(s => [
      s.uid,
      s.name,
      String(s.semester),
      s.sgpa.toFixed(2),
      String(s.backlogs),
      s.domain || 'Unknown',
      s.careerGoal || 'Unknown'
    ]);
    doc.autoTable({
      startY: cursorY,
      head: [['UID', 'Name', 'Sem', 'SGPA', 'Backlogs', 'Domain', 'Career Goal']],
      body: studentRows,
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [14, 165, 233] },
      alternateRowStyles: { fillColor: [233, 244, 252] },
      margin: { left, right },
      didDrawPage: (data) => {
        // Footer with page number
        const str = `Page ${doc.internal.getNumberOfPages()}`;
        doc.setFontSize(9);
        doc.text(str, pageWidth - right, doc.internal.pageSize.getHeight() - 20, { align: 'right' });
      }
    });

    // Save
    doc.save('academic_reports_dashboard.pdf');
  } catch (err) {
    console.error('Failed to export PDF:', err);
    showError(`Failed to export PDF: ${err.message}`);
  }
}

// Export filtered students to PDF with batched processing
function exportFilteredStudentsToPDF() {
  // Get the currently filtered data from the general report table
  const filteredData = getCurrentFilteredStudents();

  if (!filteredData || filteredData.length === 0) {
    showError('No filtered students found. Please apply filters first.');
    return;
  }

  // Check if we should use batched processing for large datasets
  if (filteredData.length > 20) {
    exportFilteredStudentsBatched(filteredData);
  } else {
    exportFilteredStudentsSingle(filteredData);
  }
}

// Get currently filtered students from the table
function getCurrentFilteredStudents() {
  const tbody = document.getElementById('generalReportTableBody');
  if (!tbody) return null;

  const rows = tbody.querySelectorAll('tr');
  const filteredStudents = [];

  rows.forEach(row => {
    if (row.style.display !== 'none' && !row.querySelector('.no-data')) {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 7) {
        const student = {
          uid: cells[0].textContent,
          name: cells[1].textContent,
          semester: parseInt(cells[2].textContent),
          sgpa: parseFloat(cells[3].textContent),
          backlogs: parseInt(cells[4].textContent),
          domain: cells[5].querySelector('.tag')?.textContent || 'Unknown',
          careerGoal: cells[6].querySelector('.tag')?.textContent || 'Unknown'
        };
        filteredStudents.push(student);
      }
    }
  });

  return filteredStudents;
}

// Export filtered students in a single PDF
function exportFilteredStudentsSingle(filteredStudents) {
  try {
    const jsPDFCtor = window.jspdf.jsPDF;
    const doc = new jsPDFCtor({ unit: 'pt', format: 'a4', compress: true });

    const pageWidth = doc.internal.pageSize.getWidth();
    const left = 40;
    const right = 40;
    let cursorY = 50;

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Filtered Students Report', pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 10;
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(1.2);
    doc.line(left, cursorY, pageWidth - right, cursorY);
    cursorY += 20;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, left, cursorY);
    cursorY += 16;
    doc.text(`Total Filtered Students: ${filteredStudents.length}`, left, cursorY);
    cursorY += 20;

    // Students Table
    const studentRows = filteredStudents.map(s => [
      s.uid,
      s.name,
      String(s.semester),
      s.sgpa.toFixed(2),
      String(s.backlogs),
      s.domain,
      s.careerGoal
    ]);

    doc.autoTable({
      startY: cursorY,
      head: [['UID', 'Name', 'Sem', 'SGPA', 'Backlogs', 'Domain', 'Career Goal']],
      body: studentRows,
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [14, 165, 233] },
      alternateRowStyles: { fillColor: [233, 244, 252] },
      margin: { left, right },
      didDrawPage: (data) => {
        const str = `Page ${doc.internal.getNumberOfPages()}`;
        doc.setFontSize(9);
        doc.text(str, pageWidth - right, doc.internal.pageSize.getHeight() - 20, { align: 'right' });
      }
    });

    doc.save('filtered_students_report.pdf');
  } catch (err) {
    console.error('Failed to export filtered students PDF:', err);
    showError(`Failed to export PDF: ${err.message}`);
  }
}

// Export filtered students with batched processing
async function exportFilteredStudentsBatched(filteredStudents) {
  const BATCH_SIZE = 15; // Process 15 students at a time for filtered data
  const totalStudents = filteredStudents.length;

  console.log(`Processing ${totalStudents} filtered students in batches of ${BATCH_SIZE}`);

  for (let i = 0; i < totalStudents; i += BATCH_SIZE) {
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(totalStudents / BATCH_SIZE);

    console.log(`Processing filtered batch ${batchNumber}/${totalBatches}`);

    const batch = filteredStudents.slice(i, i + BATCH_SIZE);
    const batchUIDs = batch.map(s => s.uid.replace(/\s/g, '_')).join('_');
    const fileName = `filtered_students_batch_${batchNumber}_${batchUIDs.substring(0, 50)}.pdf`;

    await processFilteredBatch(batch, fileName, batchNumber, totalBatches);

    // Add a small delay between batches
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  alert('All filtered student batches processed successfully!');
  const progressDiv = document.getElementById('progress');
  if (progressDiv) progressDiv.style.display = "none";
}

// Process a batch of filtered students
async function processFilteredBatch(studentBatch, fileName, batchNumber, totalBatches) {
  try {
    const jsPDFCtor = window.jspdf.jsPDF;
    const doc = new jsPDFCtor({ unit: 'pt', format: 'a4', compress: true });

    const pageWidth = doc.internal.pageSize.getWidth();
    const left = 40;
    const right = 40;
    let cursorY = 50;

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(`Filtered Students - Batch ${batchNumber}/${totalBatches}`, pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 10;
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(1.2);
    doc.line(left, cursorY, pageWidth - right, cursorY);
    cursorY += 20;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, left, cursorY);
    cursorY += 16;
    doc.text(`Batch ${batchNumber}: ${studentBatch.length} students`, left, cursorY);
    cursorY += 20;

    // Students Table
    const studentRows = studentBatch.map(s => [
      s.uid,
      s.name,
      String(s.semester),
      s.sgpa.toFixed(2),
      String(s.backlogs),
      s.domain,
      s.careerGoal
    ]);

    doc.autoTable({
      startY: cursorY,
      head: [['UID', 'Name', 'Sem', 'SGPA', 'Backlogs', 'Domain', 'Career Goal']],
      body: studentRows,
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [14, 165, 233] },
      alternateRowStyles: { fillColor: [233, 244, 252] },
      margin: { left, right },
      didDrawPage: (data) => {
        const str = `Page ${doc.internal.getNumberOfPages()}`;
        doc.setFontSize(9);
        doc.text(str, pageWidth - right, doc.internal.pageSize.getHeight() - 20, { align: 'right' });
      }
    });

    // Show progress
    const progressDiv = document.getElementById('progress') || createProgressDiv();
    progressDiv.innerHTML = `Processing filtered batch ${batchNumber}/${totalBatches}...`;

    doc.save(fileName);
    console.log(`Filtered batch ${batchNumber} completed successfully`);

    progressDiv.innerHTML = `Filtered batch ${batchNumber}/${totalBatches} completed!`;

  } catch (error) {
    console.error(`Error generating PDF for filtered batch ${batchNumber}:`, error);
    showError(`Error generating PDF for filtered batch ${batchNumber}. Check console for details.`);
  }
}

// Build canonical report JSON from current state
function buildReportData() {
  const totalStudents = allStudentsData.length;
  const avgSGPA = totalStudents > 0 ? (allStudentsData.reduce((sum, s) => sum + s.sgpa, 0) / totalStudents).toFixed(2) : '0.00';
  const backlogStudentsArr = allStudentsData.filter(s => s.backlogs > 0);
  const backlogSummary = {
    totalBacklogStudents: backlogStudentsArr.length,
    percentage: totalStudents > 0 ? ((backlogStudentsArr.length / totalStudents) * 100).toFixed(2) : '0.00'
  };

  // Domain counts
  const domainCounts = {};
  allStudentsData.forEach(s => {
    const domain = s.domain || 'Unknown';
    domainCounts[domain] = (domainCounts[domain] || 0) + 1;
  });

  // Semester performance map
  const semMap = {};
  allStudentsData.forEach(s => {
    const sem = s.semester;
    if (!semMap[sem]) semMap[sem] = { count: 0, totalSGPA: 0, backlogs: 0 };
    semMap[sem].count += 1;
    semMap[sem].totalSGPA += s.sgpa;
    semMap[sem].backlogs += s.backlogs;
  });
  const semesterDistribution = {};
  Object.keys(semMap).forEach(sem => {
    const data = semMap[sem];
    semesterDistribution[sem] = {
      count: data.count,
      avgSGPA: data.count ? (data.totalSGPA / data.count).toFixed(2) : '0.00',
      backlogs: data.backlogs
    };
  });

  return {
    metrics: {
      totalStudents,
      avgSGPA,
      backlogStudents: backlogStudentsArr.length,
      activeSemesters: new Set(allStudentsData.map(s => s.semester)).size
    },
    students: allStudentsData,
    semesterDistribution,
    domainCounts,
    backlogSummary,
    timestamp: new Date().toISOString()
  };
}

// Helper: draw section title
function sectionTitle(doc, text, x, y) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(text, x, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
}

// Helper function to generate domain distribution HTML
function generateDomainDistributionHTML() {
  const domainCounts = {};
  allStudentsData.forEach(student => {
    const domain = student.domain || 'Unknown';
    domainCounts[domain] = (domainCounts[domain] || 0) + 1;
  });

  let html = '<table style="width: 100%; border-collapse: collapse;">';
  html += '<tr style="background: #fde68a;"><th style="border: 1px solid #f59e0b; padding: 8px;">Domain</th><th style="border: 1px solid #f59e0b; padding: 8px;">Count</th></tr>';

  Object.entries(domainCounts).forEach(([domain, count]) => {
    html += `<tr><td style="border: 1px solid #f59e0b; padding: 8px;">${domain}</td><td style="border: 1px solid #f59e0b; padding: 8px;">${count}</td></tr>`;
  });

  html += '</table>';
  return html;
}

// Helper function to generate semester performance HTML
function generateSemesterPerformanceHTML() {
  const semesterData = {};
  allStudentsData.forEach(student => {
    const semester = student.semester;
    if (!semesterData[semester]) {
      semesterData[semester] = { count: 0, totalSGPA: 0, backlogs: 0 };
    }
    semesterData[semester].count++;
    semesterData[semester].totalSGPA += student.sgpa;
    semesterData[semester].backlogs += student.backlogs;
  });

  let html = '<table style="width: 100%; border-collapse: collapse;">';
  html += '<tr style="background: #bbf7d0;"><th style="border: 1px solid #22c55e; padding: 8px;">Semester</th><th style="border: 1px solid #22c55e; padding: 8px;">Students</th><th style="border: 1px solid #22c55e; padding: 8px;">Avg SGPA</th><th style="border: 1px solid #22c55e; padding: 8px;">Total Backlogs</th></tr>';

  Object.entries(semesterData).forEach(([semester, data]) => {
    const avgSGPA = (data.totalSGPA / data.count).toFixed(2);
    html += `<tr><td style="border: 1px solid #22c55e; padding: 8px;">${semester}</td><td style="border: 1px solid #22c55e; padding: 8px;">${data.count}</td><td style="border: 1px solid #22c55e; padding: 8px;">${avgSGPA}</td><td style="border: 1px solid #22c55e; padding: 8px;">${data.backlogs}</td></tr>`;
  });

  html += '</table>';
  return html;
}



// View student details
function viewStudentDetails(uid) {
  const student = allStudentsData.find(s => s.uid === uid);
  if (student && student.rawData) {
    const rawStudent = student.rawData;
    alert(`Student Details:\nName: ${rawStudent.full_name}\nUID: ${rawStudent.uid}\nSemester: ${rawStudent.semester}\nSection: ${rawStudent.section}\nYear: ${rawStudent.year_of_admission}`);
  } else if (student) {
    alert(`Student Details:\nName: ${student.name}\nUID: ${student.uid}\nSGPA: ${student.sgpa.toFixed(2)}\nSemester: ${student.semester}\nBacklogs: ${student.backlogs}\nDomain: ${student.domain || 'Unknown'}\nCareer Goal: ${student.careerGoal || 'Unknown'}`);
  }
}


// Download CSV
function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

// Download JSON
function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

// Show error message
function showError(message) {
  // Create error toast notification
  const toast = document.createElement('div');
  toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #ef4444;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 1000;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Remove toast after 5 seconds
  setTimeout(() => {
    document.body.removeChild(toast);
  }, 5000);
}

// Switch to reports tab
function switchToReportsTab() {
  // Hide all sections
  document.querySelectorAll('.tab-section').forEach(section => {
    section.style.display = 'none';
  });

  // Show reports section
  const reportsSection = document.getElementById('reports');
  if (reportsSection) {
    reportsSection.style.display = 'block';
    // Initialize reports if not already done
    if (allStudentsData.length === 0) {
      initializeReports();
    }
  }
}