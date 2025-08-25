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
    console.log('Fetching students from:', url);

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
    console.log('Fetched students:', students);

    return students.map(student => {
      // Calculate current SGPA
      let currentSGPA = 0.0;
      let backlogs = 0;
      let backlogSubjects = [];

      if (student.post_admission_records && student.post_admission_records.length > 0) {
        // Find record for current semester
        const currentRecord = student.post_admission_records.find(rec => rec.semester === student.semester);
        if (currentRecord) {
          currentSGPA = currentRecord.sgpa || 0.0;

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
    console.log('Toppers students for semester', semester, ':', students);

    // Process each student to get their SGPA for the selected semester
    const studentsWithSemesterSGPA = students.map(student => {
      let semesterSGPA = 0.0;

      // Find the SGPA for the selected semester
      if (student.post_admission_records) {
        const record = student.post_admission_records.find(rec => rec.semester === semester);
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
      console.log('Selected semester:', currentSemester);
      loadToppers(currentSemester);
    });
  });
}

// Load metrics
async function loadMetrics() {
  try {
    allStudentsData = await fetchStudentsData();
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
    console.log('Loading toppers for semester:', semester);
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
      console.log("hello: ", student)
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

// Export all reports - UPDATED
function exportAllReports() {
  const data = {
    metrics: {
      totalStudents: allStudentsData.length,
      avgSGPA: allStudentsData.length > 0 ? // Updated property name
        (allStudentsData.reduce((sum, student) => sum + student.sgpa, 0) / allStudentsData.length).toFixed(2) : '0.00',
      backlogStudents: allStudentsData.filter(student => student.backlogs > 0).length,
      activeSemesters: [...new Set(allStudentsData.map(student => student.semester))].length
    },
    students: allStudentsData,
    timestamp: new Date().toISOString()
  };

  downloadJSON(data, 'complete_academic_report.json');
  alert('📊 Complete academic report exported successfully!');
}

// Export backlog report
function exportBacklogReport() {
  const backlogStudents = allStudentsData.filter(student => student.backlogs > 0);
  const data = {
    summary: {
      totalBacklogStudents: backlogStudents.length,
      totalStudents: allStudentsData.length,
      percentage: allStudentsData.length > 0 ?
        ((backlogStudents.length / allStudentsData.length) * 100).toFixed(2) : '0.00'
    },
    students: backlogStudents,
    timestamp: new Date().toISOString()
  };

  downloadJSON(data, 'backlog_students_report.json');
  alert('⚠️ Backlog report exported successfully!');
}

// Export to Excel
function exportToExcel() {
  const csvContent = convertToCSV(allStudentsData);
  downloadCSV(csvContent, 'general_report.csv');
  alert('📊 Data exported to Excel format!');
}

// Export to PDF
function exportToPDF() {
  // Create a formatted document for PDF export
  const content = document.createElement('div');
  content.innerHTML = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px;">
      <h1 style="color: #2563eb; text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
        📊 Academic Reports Dashboard
      </h1>
      
      <div style="margin: 20px 0;">
        <h2 style="color: #1e40af;">📈 Summary Statistics</h2>
        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p><strong>Total Students:</strong> ${allStudentsData.length}</p>
          <p><strong>Average SGPA:</strong> ${(allStudentsData.reduce((sum, s) => sum + s.sgpa, 0) / allStudentsData.length).toFixed(2)}</p>
          <p><strong>Students with Backlogs:</strong> ${allStudentsData.filter(s => s.backlogs > 0).length}</p>
          <p><strong>Students without Backlogs:</strong> ${allStudentsData.filter(s => s.backlogs === 0).length}</p>
        </div>
        
        <h2 style="color: #1e40af;">🎯 Domain Distribution</h2>
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0;">
          ${generateDomainDistributionHTML()}
        </div>
        
        <h2 style="color: #1e40af;">📚 Semester-wise Performance</h2>
        <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; margin: 15px 0;">
          ${generateSemesterPerformanceHTML()}
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px;">
        Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
      </div>
    </div>
  `;

  // Configure PDF options
  const opt = {
    margin: 10,
    filename: 'academic_reports_dashboard.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  // Generate and download PDF
  html2pdf().set(opt).from(content).save();
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

// Print report
function printReport() {
  window.print();
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