let currentSemester = 1;
let toppersChart = null;
let distributionChart = null;
let allStudentsData = [];

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
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
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
      // Find SGPA for the student's current semester
      const currentRecord = student.post_admission_records.find(rec => rec.semester === student.semester) || {};
      return {
        uid: student.uid,
        name: student.fullName,
        semester: student.semester,
        sgpa: currentRecord.sgpa || 0.0, // SGPA for current semester
        post_admission_records: student.post_admission_records || [], // Keep all records for toppers
        backlogs: student.backlogs || 0,
        backlogSubjects: student.backlogSubjects || [],
        domain: student.domain || '',
        careerGoal: student.careerGoal || ''
      };
    });
  } catch (error) {
    console.error('Error fetching students:', error.message);
    throw error;
  }
}

async function fetchStudentsData() {
  return await fetchStudents();
}

async function fetchToppers(semester) {
  const students = await fetchStudents({ semester });
  console.log('Toppers students:', students);
  return students
    .map(student => {
      // Find SGPA for the selected semester
      const record = student.post_admission_records.find(rec => rec.semester === semester) || {};
      return { ...student, sgpa: record.sgpa || 0.0 };
    })
    .filter(student => student.sgpa > 0)
    .sort((a, b) => b.sgpa - a.sgpa)
    .slice(0, 10);
}

async function fetchSemesterDistribution() {
  const students = await fetchStudents();
  const distribution = {};
  students.forEach(student => {
    distribution[student.semester] = (distribution[student.semester] || 0) + 1;
  });
  return distribution;
}

async function fetchBacklogStudents() {
  const students = await fetchStudents();
  return students.filter(student => student.backlogs > 0);
}

function initializeReports() {
  loadMetrics();
  loadToppers(currentSemester);
  loadSemesterDistribution();
  loadBacklogStudents();
  loadGeneralReport();
  setupSemesterTabs();
}

function setupSemesterTabs() {
  document.querySelectorAll('.semester-tab').forEach(tab => {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.semester-tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      currentSemester = parseInt(this.dataset.semester);
      loadToppers(currentSemester);
    });
  });
}

async function loadMetrics() {
  try {
    allStudentsData = await fetchStudentsData();
    const totalStudents = allStudentsData.length;
    const avgSGPA = (allStudentsData.reduce((sum, student) => sum + student.sgpa, 0) / totalStudents).toFixed(2) || 0.0;
    const backlogStudents = allStudentsData.filter(student => student.backlogs > 0).length;
    const activeSemesters = [...new Set(allStudentsData.map(student => student.semester))].length;

    document.getElementById('totalStudentsMetric').textContent = totalStudents;
    document.getElementById('avgCGPAMetric').textContent = avgSGPA; // Label kept as CGPA for UI consistency
    document.getElementById('totalBacklogsMetric').textContent = backlogStudents;
    document.getElementById('activeSemestersMetric').textContent = activeSemesters;
  } catch (error) {
    alert(`Error loading metrics: ${error.message}`);
  }
}

async function loadToppers(semester) {
  try {
    const toppers = await fetchToppers(semester);
    const tbody = document.getElementById('toppersTableBody');
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
    alert(`Error loading toppers: ${error.message}`);
  }
}

function updateToppersChart(toppers) {
  const ctx = document.getElementById('toppersChart')?.getContext('2d');
  if (!ctx) return;

  if (toppersChart) {
    toppersChart.destroy();
  }

  if (toppers.length === 0) {
    return;
  }

  toppersChart = new Chart(ctx, {
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
          min: 6,
          max: 10
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
}

async function loadSemesterDistribution() {
  try {
    const distribution = await fetchSemesterDistribution();
    const total = allStudentsData.length;
    const tbody = document.getElementById('distributionTableBody');
    tbody.innerHTML = '';

    Object.keys(distribution).sort((a, b) => a - b).forEach(semester => {
      const count = distribution[semester];
      const percentage = ((count / total) * 100).toFixed(1);

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
    alert(`Error loading semester distribution: ${error.message}`);
  }
}

function updateDistributionChart(distribution) {
  const ctx = document.getElementById('distributionChart')?.getContext('2d');
  if (!ctx) return;

  if (distributionChart) {
    distributionChart.destroy();
  }

  distributionChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: Object.keys(distribution).map(sem => `Sem ${sem}`),
      datasets: [{
        data: Object.values(distribution),
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
        }
      }
    }
  });
}

async function loadBacklogStudents() {
  try {
    const backlogStudents = await fetchBacklogStudents();
    document.getElementById('backlogStudentsCount').textContent = backlogStudents.length;

    const backlogList = document.getElementById('backlogList');
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
    alert(`Error loading backlog students: ${error.message}`);
  }
}

async function loadGeneralReport() {
  try {
    allStudentsData = await fetchStudentsData();
    updateGeneralReportTable(allStudentsData);
  } catch (error) {
    alert(`Error loading general report: ${error.message}`);
  }
}

function filterGeneralReport() {
  const searchTerm = document.getElementById('generalSearchInput')?.value.toLowerCase() || '';
  const semesterFilter = document.getElementById('generalSemesterFilter')?.value;
  const sgpaFilter = document.getElementById('cgpaRangeFilter')?.value;
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

  if (sgpaFilter) {
    const [min, max] = sgpaFilter.split('-').map(Number);
    filteredData = filteredData.filter(student => {
      if (sgpaFilter === '0-6') {
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

function updateGeneralReportTable(data) {
  const tbody = document.getElementById('generalReportTableBody');
  if (!tbody) return;

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
      <td>${student.sgpa.toFixed(2)}</td>
      <td>
        <span style="color: ${student.backlogs > 0 ? '#ef4444' : '#059669'};">
          ${student.backlogs}
        </span>
      </td>
      <td><span class="tag">${student.domain || 'Unknown'}</span></td>
      <td><span class="tag ${student.careerGoal.toLowerCase().replace(' ', '-') || 'unknown'}">${student.careerGoal || 'Unknown'}</span></td>
      <td>
        <button class="btn-sm btn-view" onclick="viewStudentDetails('${student.uid}')">View</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function refreshReports() {
  document.getElementById('totalStudentsMetric').textContent = '-';
  document.getElementById('avgCGPAMetric').textContent = '-';
  document.getElementById('totalBacklogsMetric').textContent = '-';
  document.getElementById('activeSemestersMetric').textContent = '-';

  initializeReports();
}

function exportAllReports() {
  const data = {
    metrics: {
      totalStudents: allStudentsData.length,
      avgSGPA: (allStudentsData.reduce((sum, student) => sum + student.sgpa, 0) / allStudentsData.length).toFixed(2) || 0.0,
      backlogStudents: allStudentsData.filter(student => student.backlogs > 0).length,
      activeSemesters: [...new Set(allStudentsData.map(student => student.semester))].length
    },
    students: allStudentsData,
    timestamp: new Date().toISOString()
  };

  downloadJSON(data, 'complete_academic_report.json');
  alert('📊 Complete academic report exported successfully!');
}

function exportBacklogReport() {
  const backlogStudents = allStudentsData.filter(student => student.backlogs > 0);
  const data = {
    summary: {
      totalBacklogStudents: backlogStudents.length,
      totalStudents: allStudentsData.length,
      percentage: ((backlogStudents.length / allStudentsData.length) * 100).toFixed(2)
    },
    students: backlogStudents,
    timestamp: new Date().toISOString()
  };

  downloadJSON(data, 'backlog_students_report.json');
  alert('⚠️ Backlog report exported successfully!');
}

function exportToExcel() {
  const csvContent = convertToCSV(allStudentsData);
  downloadCSV(csvContent, 'general_report.csv');
  alert('📊 Data exported to Excel format!');
}

function exportToPDF() {
  alert('📄 PDF export functionality will be implemented with jsPDF library');
}

function printReport() {
  window.print();
}

function viewStudentDetails(uid) {
  const student = allStudentsData.find(s => s.uid === uid);
  if (student) {
    alert(`Student Details:\nName: ${student.name}\nUID: ${student.uid}\nSGPA: ${student.sgpa.toFixed(2)}\nSemester: ${student.semester}\nBacklogs: ${student.backlogs}\nDomain: ${student.domain || 'Unknown'}\nCareer Goal: ${student.careerGoal || 'Unknown'}`);
  }
}

function convertToCSV(data) {
  const headers = ['UID', 'Name', 'Semester', 'SGPA', 'Backlogs', 'Domain', 'Career Goal'];
  const csvRows = [headers.join(',')];

  data.forEach(student => {
    const row = [
      student.uid,
      student.name,
      student.semester,
      student.sgpa.toFixed(2),
      student.backlogs,
      student.domain || 'Unknown',
      student.careerGoal || 'Unknown'
    ];
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
}

function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initializeReports();
});