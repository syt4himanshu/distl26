// Reports Section JavaScript
// Sample data - Replace with actual API calls
const sampleStudents = [
    {
        uid: "21CE001234",
        name: "Rahul Sharma",
        semester: 6,
        cgpa: 8.5,
        backlogs: 0,
        backlogSubjects: [],
        domain: "Web Development",
        careerGoal: "Placement",
        semesterGrades: { 1: 8.2, 2: 8.4, 3: 8.6, 4: 8.5, 5: 8.7, 6: 8.5 }
    },
    {
        uid: "21CE001235",
        name: "Priya Singh",
        semester: 6,
        cgpa: 9.2,
        backlogs: 0,
        backlogSubjects: [],
        domain: "Machine Learning",
        careerGoal: "Higher Studies",
        semesterGrades: { 1: 9.0, 2: 9.1, 3: 9.3, 4: 9.2, 5: 9.4, 6: 9.2 }
    },
    {
        uid: "21CE001236",
        name: "Arjun Patel",
        semester: 4,
        cgpa: 7.8,
        backlogs: 2,
        backlogSubjects: ["Mathematics-III", "Digital Electronics"],
        domain: "Data Science",
        careerGoal: "Placement",
        semesterGrades: { 1: 7.5, 2: 7.8, 3: 8.0, 4: 7.9 }
    },
    {
        uid: "21CE001237",
        name: "Sneha Reddy",
        semester: 8,
        cgpa: 8.9,
        backlogs: 0,
        backlogSubjects: [],
        domain: "Cybersecurity",
        careerGoal: "Entrepreneurship",
        semesterGrades: { 1: 8.5, 2: 8.7, 3: 8.9, 4: 8.8, 5: 9.0, 6: 8.9, 7: 9.1, 8: 8.8 }
    },
    {
        uid: "21CE001238",
        name: "Vikash Kumar",
        semester: 2,
        cgpa: 6.5,
        backlogs: 1,
        backlogSubjects: ["Physics-I"],
        domain: "Mobile Development",
        careerGoal: "Placement",
        semesterGrades: { 1: 6.2, 2: 6.8 }
    }
];

let currentSemester = 1;
let toppersChart = null;
let distributionChart = null;
let allStudentsData = [...sampleStudents];

// Initialize reports when tab is clicked
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

function loadMetrics() {
    const totalStudents = allStudentsData.length;
    const avgCGPA = (allStudentsData.reduce((sum, student) => sum + student.cgpa, 0) / totalStudents).toFixed(2);
    const backlogStudents = allStudentsData.filter(student => student.backlogs > 0).length;
    const activeSemesters = [...new Set(allStudentsData.map(student => student.semester))].length;

    document.getElementById('totalStudentsMetric').textContent = totalStudents;
    document.getElementById('avgCGPAMetric').textContent = avgCGPA;
    document.getElementById('totalBacklogsMetric').textContent = backlogStudents;
    document.getElementById('activeSemestersMetric').textContent = activeSemesters;
}

function loadToppers(semester) {
    const studentsInSemester = allStudentsData.filter(student =>
        student.semesterGrades[semester] !== undefined
    );

    const toppers = studentsInSemester
        .map(student => ({
            ...student,
            semesterGPA: student.semesterGrades[semester]
        }))
        .sort((a, b) => b.semesterGPA - a.semesterGPA)
        .slice(0, 10);

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
            <td>${student.semesterGPA.toFixed(2)}</td>
        `;
        tbody.appendChild(row);
    });

    updateToppersChart(toppers);
}

function updateToppersChart(toppers) {
    const ctx = document.getElementById('toppersChart').getContext('2d');

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
                label: 'CGPA',
                data: toppers.map(student => student.semesterGPA),
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

function loadSemesterDistribution() {
    const distribution = {};
    allStudentsData.forEach(student => {
        distribution[student.semester] = (distribution[student.semester] || 0) + 1;
    });

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
}

function updateDistributionChart(distribution) {
    const ctx = document.getElementById('distributionChart').getContext('2d');

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

function loadBacklogStudents() {
    const backlogStudents = allStudentsData.filter(student => student.backlogs > 0);

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
}

function loadGeneralReport() {
    const tbody = document.getElementById('generalReportTableBody');
    tbody.innerHTML = '';

    allStudentsData.forEach(student => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${student.uid}</td>
            <td>${student.name}</td>
            <td>${student.semester}</td>
            <td>${student.cgpa.toFixed(2)}</td>
            <td>
                <span style="color: ${student.backlogs > 0 ? '#ef4444' : '#059669'};">
                    ${student.backlogs}
                </span>
            </td>
            <td><span class="tag">${student.domain}</span></td>
            <td><span class="tag ${student.careerGoal.toLowerCase().replace(' ', '-')}">${student.careerGoal}</span></td>
            <td>
                <button class="btn-sm btn-view" onclick="viewStudentDetails('${student.uid}')">View</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function filterGeneralReport() {
    const searchTerm = document.getElementById('generalSearchInput').value.toLowerCase();
    const semesterFilter = document.getElementById('generalSemesterFilter').value;
    const cgpaFilter = document.getElementById('cgpaRangeFilter').value;
    const backlogFilter = document.getElementById('backlogCountFilter').value;

    let filteredData = [...allStudentsData];

    // Search filter
    if (searchTerm) {
        filteredData = filteredData.filter(student =>
            student.name.toLowerCase().includes(searchTerm) ||
            student.uid.toLowerCase().includes(searchTerm)
        );
    }

    // Semester filter
    if (semesterFilter) {
        filteredData = filteredData.filter(student =>
            student.semester === parseInt(semesterFilter)
        );
    }

    // CGPA filter
    if (cgpaFilter) {
        const [min, max] = cgpaFilter.split('-').map(Number);
        filteredData = filteredData.filter(student => {
            if (cgpaFilter === '0-6') {
                return student.cgpa < 6;
            }
            return student.cgpa >= min && student.cgpa < max;
        });
    }

    // Backlog filter
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
            <td>${student.cgpa.toFixed(2)}</td>
            <td>
                <span style="color: ${student.backlogs > 0 ? '#ef4444' : '#059669'};">
                    ${student.backlogs}
                </span>
            </td>
            <td><span class="tag">${student.domain}</span></td>
            <td><span class="tag ${student.careerGoal.toLowerCase().replace(' ', '-')}">${student.careerGoal}</span></td>
            <td>
                <button class="btn-sm btn-view" onclick="viewStudentDetails('${student.uid}')">View</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Utility Functions
function refreshReports() {
    // Show loading state
    document.getElementById('totalStudentsMetric').textContent = '-';
    document.getElementById('avgCGPAMetric').textContent = '-';
    document.getElementById('totalBacklogsMetric').textContent = '-';
    document.getElementById('activeSemestersMetric').textContent = '-';

    // In real implementation, make API call here
    // fetchStudentsData().then(data => {
    //     allStudentsData = data;
    //     initializeReports();
    // });

    setTimeout(() => {
        initializeReports();
    }, 500);
}

function exportAllReports() {
    const data = {
        metrics: {
            totalStudents: allStudentsData.length,
            avgCGPA: (allStudentsData.reduce((sum, student) => sum + student.cgpa, 0) / allStudentsData.length).toFixed(2),
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
    // In real implementation, use a library like SheetJS
    const csvContent = convertToCSV(allStudentsData);
    downloadCSV(csvContent, 'general_report.csv');
    alert('📊 Data exported to Excel format!');
}

function exportToPDF() {
    // In real implementation, use a library like jsPDF
    alert('📄 PDF export functionality will be implemented with jsPDF library');
}

function printReport() {
    window.print();
}

function viewStudentDetails(uid) {
    const student = allStudentsData.find(s => s.uid === uid);
    if (student) {
        alert(`Student Details:\nName: ${student.name}\nUID: ${student.uid}\nCGPA: ${student.cgpa}\nSemester: ${student.semester}\nBacklogs: ${student.backlogs}`);
        // In real implementation, open detailed modal
    }
}

// Helper Functions
function convertToCSV(data) {
    const headers = ['UID', 'Name', 'Semester', 'CGPA', 'Backlogs', 'Domain', 'Career Goal'];
    const csvRows = [headers.join(',')];

    data.forEach(student => {
        const row = [
            student.uid,
            student.name,
            student.semester,
            student.cgpa,
            student.backlogs,
            student.domain,
            student.careerGoal
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

// API Integration Functions (Replace these with actual API calls)
async function fetchStudentsData() {
    try {
        const response = await fetch('/api/students/all');
        if (!response.ok) throw new Error('Failed to fetch students');
        return await response.json();
    } catch (error) {
        console.error('Error fetching students:', error);
        return sampleStudents; // Fallback to sample data
    }
}

async function fetchToppers(semester) {
    try {
        const response = await fetch(`/api/reports/toppers?semester=${semester}`);
        if (!response.ok) throw new Error('Failed to fetch toppers');
        return await response.json();
    } catch (error) {
        console.error('Error fetching toppers:', error);
        return [];
    }
}

async function fetchSemesterDistribution() {
    try {
        const response = await fetch('/api/reports/semester-distribution');
        if (!response.ok) throw new Error('Failed to fetch distribution');
        return await response.json();
    } catch (error) {
        console.error('Error fetching distribution:', error);
        return {};
    }
}

async function fetchBacklogStudents() {
    try {
        const response = await fetch('/api/reports/backlog-students');
        if (!response.ok) throw new Error('Failed to fetch backlog students');
        return await response.json();
    } catch (error) {
        console.error('Error fetching backlog students:', error);
        return [];
    }
}
