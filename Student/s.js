document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const form = document.getElementById('wizardForm');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const currentStepSpan = document.getElementById('currentStep');
    const stepContents = document.querySelectorAll('.step-content');
    const stepIndicators = document.querySelectorAll('.step-indicator');
    const progressFill = document.querySelector('.progress-fill');
    const progressPercentage = document.querySelector('.progress-percentage');
    const reviewContent = document.getElementById('reviewContent');
    const campusPlacement = document.getElementById('campusPlacement');
    const placementReasonRow = document.getElementById('placementReasonRow');
    const semesterSelect = document.getElementById('semester');

    // State variables
    let currentStep = 1;
    const totalSteps = stepContents.length;

    // Initialize form
    initializeForm();

    // Event Listeners
    prevBtn.addEventListener('click', goToPreviousStep);
    nextBtn.addEventListener('click', handleNextButtonClick);

    if (campusPlacement && placementReasonRow) {
        campusPlacement.addEventListener('change', togglePlacementReason);
    }

    if (semesterSelect) {
        semesterSelect.addEventListener('change', updateSemesterVisibility);
    }

    // Add real-time validation
    form.querySelectorAll('input, select, textarea').forEach(field => {
        field.addEventListener('blur', () => {
            validateField(field);
        });

        field.addEventListener('input', () => {
            if (field.classList.contains('error')) {
                clearFieldError(field);
            }
        });
    });

    // Functions
    async function initializeForm() {
        await loadStudentData();
        updateFormState();
        updateSemesterVisibility();
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
                console.log(studentData);
                populateFormWithData(studentData);
            } else if (response.status === 401) {
                // Unauthorized - redirect to login
                localStorage.removeItem("access_token");
                window.location.href = "../login.html";
            } else {
                console.log("No existing student data found, starting with empty form");
            }
        } catch (error) {
            console.error('Error loading student data:', error);
        }
    }

    function populateFormWithData(data) {
        // Basic information
        if (data.full_name) document.getElementById('fullName').value = data.full_name;
        if (data.section) document.getElementById('section').value = data.section;
        if (data.semester) document.getElementById('semester').value = data.semester;
        if (data.year_of_admission) document.getElementById('yearOfAdmission').value = data.year_of_admission;

        // Personal information
        if (data.personal_info) {
            const pi = data.personal_info;
            if (pi.mobile_no) document.getElementById('mobileNo').value = pi.mobile_no;
            if (pi.personal_email) document.getElementById('personalEmail').value = pi.personal_email;
            if (pi.college_email) document.getElementById('collegeEmail').value = pi.college_email;
            if (pi.linked_in_id) document.getElementById('linkedInId').value = pi.linked_in_id;
            if (pi.permanent_address) document.getElementById('permanentAddress').value = pi.permanent_address;
            if (pi.dob) document.getElementById('dob').value = pi.dob;
            if (pi.gender) document.getElementById('gender').value = pi.gender;
            if (pi.father_name) document.getElementById('fatherName').value = pi.father_name;
            if (pi.father_mobile_no) document.getElementById('fatherMobileNo').value = pi.father_mobile_no;
            if (pi.father_email) document.getElementById('fatherEmail').value = pi.father_email;
            if (pi.father_occupation) document.getElementById('fatherOccupation').value = pi.father_occupation;
            if (pi.mother_name) document.getElementById('motherName').value = pi.mother_name;
            if (pi.mother_mobile_no) document.getElementById('motherMobileNo').value = pi.mother_mobile_no;
            if (pi.mother_email) document.getElementById('motherEmail').value = pi.mother_email;
            if (pi.mother_occupation) document.getElementById('motherOccupation').value = pi.mother_occupation;
            if (pi.emergency_contact_name) document.getElementById('emergencyContactName').value = pi.emergency_contact_name;
            if (pi.emergency_contact_number) document.getElementById('emergencyContactNumber').value = pi.emergency_contact_number;
        }

        // Past education records
        if (data.past_education_records && data.past_education_records.length > 0) {
            const pastEd = data.past_education_records;

            pastEd.forEach(record => {

                if (record.exam_name === 'SSC' || record.degree === 'X') {
                    console.log(record.percentage)
                    if (record.percentage) document.getElementById('sscPercentage').value = record.percentage;
                    if (record.year_of_passing) document.getElementById('sscYear').value = record.year_of_passing;
                } else if (record.exam_name === 'HSSC' || record.degree === 'XII') {
                    if (record.percentage) document.getElementById('hsscPercentage').value = record.percentage;
                    if (record.year_of_passing) document.getElementById('hsscYear').value = record.year_of_passing;
                }
            });
        }

        // Post admission records
        if (data.post_admission_records && data.post_admission_records.length > 0) {
            const postEd = data.post_admission_records;
            postEd.forEach(record => {
                const semesterNum = record.semester;
                if (semesterNum >= 1 && semesterNum <= 8) {
                    const sgpaField = document.getElementById(`sem${semesterNum}SGPA`);
                    const backlogField = document.getElementById(`sem${semesterNum}Backlog`);
                    if (sgpaField && record.sgpa) sgpaField.value = record.sgpa;
                    if (backlogField && record.backlog_subjects) backlogField.value = record.backlog_subjects;
                }
            });
        }

        // Career activities
        if (data.career_activities && data.career_activities.length > 0) {
            const activities = data.career_activities;
            activities.forEach((activity, index) => {
                if (index < 3) {
                    const nameField = document.querySelector(`input[name="activity${index + 1}Name"]`);
                    const scoreField = document.querySelector(`input[name="activity${index + 1}Score"]`);
                    const dateField = document.querySelector(`input[name="activity${index + 1}Date"]`);
                    if (nameField && activity.activity_name) nameField.value = activity.activity_name;
                    if (scoreField && activity.score_rank) scoreField.value = activity.score_rank;
                    if (dateField && activity.exam_date) dateField.value = activity.exam_date;
                }
            });
        }

        // Projects
        if (data.projects && data.projects.length > 0) {
            const projects = data.projects;
            if (projects[0]) {
                if (projects[0].title) document.getElementById('project1Title').value = projects[0].title;
                if (projects[0].description) document.getElementById('project1Description').value = projects[0].description;
            }
            if (projects[1]) {
                if (projects[1].title) document.getElementById('project2Title').value = projects[1].title;
                if (projects[1].description) document.getElementById('project2Description').value = projects[1].description;
            }
        }

        // Internships
        if (data.internships && data.internships.length > 0) {
            const internships = data.internships;
            if (internships[0]) {
                if (internships[0].company_name) document.getElementById('internship1Company').value = internships[0].company_name;
                if (internships[0].domain) document.getElementById('internship1Domain').value = internships[0].domain;
                if (internships[0].internship_type) document.getElementById('internship1Type').value = internships[0].internship_type;
                if (internships[0].paid_unpaid) document.getElementById('internship1Paid').value = internships[0].paid_unpaid;
                if (internships[0].start_date) document.getElementById('internship1Start').value = internships[0].start_date;
                if (internships[0].end_date) document.getElementById('internship1End').value = internships[0].end_date;
            }
            if (internships[1]) {
                if (internships[1].company_name) document.getElementById('internship2Company').value = internships[1].company_name;
                if (internships[1].domain) document.getElementById('internship2Domain').value = internships[1].domain;
                if (internships[1].internship_type) document.getElementById('internship2Type').value = internships[1].internship_type;
                if (internships[1].paid_unpaid) document.getElementById('internship2Paid').value = internships[1].paid_unpaid;
                if (internships[1].start_date) document.getElementById('internship2Start').value = internships[1].start_date;
                if (internships[1].end_date) document.getElementById('internship2End').value = internships[1].end_date;
            }
        }

        // Co-curricular participations
        if (data.cocurricular_participations && data.cocurricular_participations.length > 0) {
            const participations = data.cocurricular_participations;
            participations.forEach((participation, index) => {
                if (index < 3) {
                    const nameField = document.querySelector(`input[name="participation${index + 1}Name"]`);
                    const dateField = document.querySelector(`input[name="participation${index + 1}Date"]`);
                    const levelField = document.querySelector(`select[name="participation${index + 1}Level"]`);
                    const awardsField = document.querySelector(`input[name="participation${index + 1}Awards"]`);
                    if (nameField && participation.name) nameField.value = participation.name;
                    if (dateField && participation.date) dateField.value = participation.date;
                    if (levelField && participation.level) levelField.value = participation.level;
                    if (awardsField && participation.awards) awardsField.value = participation.awards;
                }
            });
        }

        // Co-curricular organizations
        if (data.cocurricular_organizations && data.cocurricular_organizations.length > 0) {
            const organizations = data.cocurricular_organizations;
            organizations.forEach((org, index) => {
                if (index < 3) {
                    const nameField = document.querySelector(`input[name="organization${index + 1}Name"]`);
                    const dateField = document.querySelector(`input[name="organization${index + 1}Date"]`);
                    const levelField = document.querySelector(`select[name="organization${index + 1}Level"]`);
                    const remarkField = document.querySelector(`input[name="organization${index + 1}Remark"]`);
                    if (nameField && org.name) nameField.value = org.name;
                    if (dateField && org.date) dateField.value = org.date;
                    if (levelField && org.level) levelField.value = org.level;
                    if (remarkField && org.remark) remarkField.value = org.remark;
                }
            });
        }

        // SWOC
        if (data.swoc) {
            if (data.swoc.strengths) document.getElementById('strengths').value = data.swoc.strengths;
            if (data.swoc.weaknesses) document.getElementById('weaknesses').value = data.swoc.weaknesses;
            if (data.swoc.opportunities) document.getElementById('opportunities').value = data.swoc.opportunities;
            if (data.swoc.challenges) document.getElementById('challenges').value = data.swoc.challenges;
        }

        // Career objective
        if (data.career_objective) {
            if (data.career_objective.career_goal) document.getElementById('careerGoal').value = data.career_objective.career_goal;
            if (data.career_objective.specific_details) document.getElementById('specificDetails').value = data.career_objective.specific_details;
            if (data.career_objective.clarity_preparedness) document.getElementById('clarityPreparedness').value = data.career_objective.clarity_preparedness;
            if (data.career_objective.interested_in_campus_placement !== undefined) {

                document.getElementById('campusPlacement').value = data.career_objective.interested_in_campus_placement ? 'true' : 'false';
                togglePlacementReason();
            }
            if (data.career_objective.placement_reasons) document.getElementById('placementReasons').value = data.career_objective.placement_reasons;
        }

        // Skills
        if (data.skills) {
            if (data.skills.programming_languages) document.getElementById('programmingLanguages').value = data.skills.programming_languages;
            if (data.skills.technologies_frameworks) document.getElementById('technologiesFrameworks').value = data.skills.technologies_frameworks;
            if (data.skills.familiar_tools_platforms) document.getElementById('familiarToolsPlatforms').value = data.skills.familiar_tools_platforms;
        }

        // Domains of interest (checkboxes)

        if (data.skills && data.skills.domains_of_interest) {
            const domains = data.skills.domains_of_interest.split(',').map(d => d.trim());
            document.querySelectorAll('input[name^="domain"]').forEach(checkbox => {
                if (domains.includes(checkbox.value)) {
                    checkbox.checked = true;
                }
            });
        }

        console.log('Form populated with existing student data');
    }

    function goToPreviousStep() {
        if (currentStep > 1) {
            currentStep--;
            updateFormState();
        }
    }

    function handleNextButtonClick() {
        if (validateStep(currentStep)) {
            if (currentStep < totalSteps) {
                currentStep++;
                updateFormState();
            } else {
                submitForm();
            }
        }
    }

    function updateFormState() {
        // Update step contents visibility
        stepContents.forEach((content, index) => {
            content.classList.toggle('active', index + 1 === currentStep);
        });

        // Update step indicators
        if (stepIndicators.length) {
            stepIndicators.forEach((indicator, index) => {
                indicator.classList.toggle('active', index + 1 === currentStep);
                indicator.classList.toggle('completed', index + 1 < currentStep);
            });
        }

        // Update progress bar
        const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
        progressFill.style.width = `${progress}%`;
        progressPercentage.textContent = `${Math.round(progress)}%`;

        // Update buttons
        prevBtn.disabled = currentStep === 1;
        nextBtn.textContent = currentStep === totalSteps ? 'Submit' : 'Next →';
        currentStepSpan.textContent = currentStep;

        // Populate review content if on final step
        if (currentStep === totalSteps) {
            populateReviewContent();
        }
    }

    function updateSemesterVisibility() {
        const currentSemester = parseInt(semesterSelect.value) || 0;

        // Hide all semester rows first
        document.querySelectorAll('.semester-row').forEach((row, index) => {
            const semesterNum = index + 1;
            if (semesterNum >= currentSemester) {
                row.style.display = 'none';
            } else {
                row.style.display = 'block';
            }
        });
    }

    function validateStep(step) {
        const currentStepContent = document.querySelector(`.step-content[data-step="${step}"]`);
        const requiredFields = currentStepContent.querySelectorAll('[required]');
        let isValid = true;

        // Special validation for step 8 (SWOC) - all fields required
        if (step === 8) {
            const swocFields = ['strengths', 'weaknesses', 'opportunities', 'challenges'];
            swocFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field && !field.value.trim()) {
                    field.required = true;
                    if (!validateField(field)) {
                        isValid = false;
                    }
                }
            });
        }

        // Special validation for step 9 (Career Objectives) - all fields required
        if (step === 9) {
            const careerFields = ['careerGoal', 'clarityPreparedness', 'campusPlacement'];
            careerFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field && !field.value.trim()) {
                    field.required = true;
                    if (!validateField(field)) {
                        isValid = false;
                    }
                }
            });

            // Validate domains checkboxes - at least one must be selected
            const domainCheckboxes = document.querySelectorAll('input[name^="domain"]');
            const checkedDomains = Array.from(domainCheckboxes).filter(cb => cb.checked);
            if (checkedDomains.length === 0) {
                isValid = false;
                // Show error for domains
                const domainsContainer = document.querySelector('label[for="domainsOfInterest"]').parentElement;
                const errorDiv = domainsContainer.querySelector('.error-message') || document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.textContent = 'Please select at least one domain of interest';
                errorDiv.style.display = 'block';
                if (!domainsContainer.querySelector('.error-message')) {
                    domainsContainer.appendChild(errorDiv);
                }
            }
        }

        // Validate required fields
        for (let field of requiredFields) {
            if (!validateField(field)) {
                isValid = false;
                // Scroll to first error field
                field.scrollIntoView({ behavior: 'smooth', block: 'center' });
                break;
            }
        }

        return isValid;
    }

    function validateField(field) {
        const formGroup = field.closest('.form-group');
        const errorMessage = formGroup.querySelector('.error-message');

        // Reset previous validation states
        clearFieldError(field);

        let fieldValid = true;
        let errorMsg = 'This field is required';

        // Check if field is empty
        if (field.type === 'checkbox') {
            if (!field.checked) {
                fieldValid = false;
            }
        } else if (!field.value.trim()) {
            fieldValid = false;
        } else {
            // Field-specific validation
            switch (field.id) {
                case 'mobileNo':
                case 'fatherMobileNo':
                case 'motherMobileNo':
                case 'emergencyContactNumber':
                    if (!isValidPhone(field.value)) {
                        fieldValid = false;
                        errorMsg = 'Please enter a valid 10-digit mobile number';
                    }
                    break;
                case 'personalEmail':
                case 'fatherEmail':
                case 'motherEmail':
                    if (!isValidEmail(field.value)) {
                        fieldValid = false;
                        errorMsg = 'Please enter a valid email address';
                    }
                    break;
                case 'collegeEmail':
                    if (!isValidCollegeEmail(field.value)) {
                        fieldValid = false;
                        errorMsg = 'Please enter a valid college email address ending with @stvincentngp.edu.in';
                    }
                    break;
                case 'yearOfAdmission':
                    if (!isValidYear(field.value)) {
                        fieldValid = false;
                        errorMsg = 'Please enter a valid year between 2000 and current year';
                    }
                    break;
                case 'sscPercentage':
                case 'hsscPercentage':
                    if (!isValidPercentage(field.value)) {
                        fieldValid = false;
                        errorMsg = 'Please enter a valid percentage (0-100)';
                    }
                    break;
                case 'sscYear':
                case 'hsscYear':
                    if (!isValidPassingYear(field.value)) {
                        fieldValid = false;
                        errorMsg = 'Please enter a valid passing year (less than current year)';
                    }
                    break;
                case 'semester':
                    if (!isValidSemester(field.value)) {
                        fieldValid = false;
                        errorMsg = 'Semester must be between 1 and 8';
                    }
                    break;
                case 'sem1SGPA':
                case 'sem2SGPA':
                case 'sem3SGPA':
                case 'sem4SGPA':
                case 'sem5SGPA':
                case 'sem6SGPA':
                case 'sem7SGPA':
                case 'sem8SGPA':
                    if (!isValidSGPA(field.value)) {
                        fieldValid = false;
                        errorMsg = 'SGPA must be between 0 and 10';
                    }
                    break;
            }

            // For selects, ensure not default if value is ''
            if (field.tagName === 'SELECT' && field.value === '') {
                fieldValid = false;
            }
        }

        // Apply validation state
        if (!fieldValid) {
            field.classList.add('error');
            errorMessage.textContent = errorMsg;
            errorMessage.style.display = 'block';
        }

        return fieldValid;
    }

    function clearFieldError(field) {
        const formGroup = field.closest('.form-group');
        const errorMessage = formGroup.querySelector('.error-message');

        field.classList.remove('error');
        if (errorMessage) {
            errorMessage.style.display = 'none';
        }
    }

    // Validation helper functions
    function isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email.trim());
    }

    function isValidCollegeEmail(email) {
        const re = /^[^\s@]+@stvincentngp\.edu\.in$/;
        return re.test(email.trim());
    }

    function isValidPhone(phone) {
        const re = /^[0-9]{10}$/;
        return re.test(phone.replace(/\D/g, ''));
    }

    function isValidYear(year) {
        const currentYear = new Date().getFullYear();
        const numYear = parseInt(year);
        return !isNaN(numYear) && numYear >= 2000 && numYear <= currentYear;
    }

    function isValidPercentage(value) {
        const numValue = parseFloat(value);
        return !isNaN(numValue) && numValue >= 0 && numValue < 100;
    }

    function isValidSemester(semester) {
        const numSemester = parseInt(semester);
        return !isNaN(numSemester) && numSemester >= 1 && numSemester <= 8;
    }

    function isValidPassingYear(year) {
        const numYear = parseInt(year);
        const currentYear = new Date().getFullYear();
        return !isNaN(numYear) && numYear >= 2000 && numYear < currentYear;
    }

    function isValidSGPA(sgpa) {
        const numSGPA = parseFloat(sgpa);
        return !isNaN(numSGPA) && numSGPA >= 0 && numSGPA <= 10;
    }

    function togglePlacementReason() {


        if (campusPlacement === 'false') {
            placementReasonRow.style.display = 'block';
            document.getElementById('placementReasons').required = true;
        } else {
            placementReasonRow.style.display = 'none';
            document.getElementById('placementReasons').required = false;
        }
    }

    function populateReviewContent() {
        const formData = new FormData(form);
        let reviewHTML = '<h3>Review Your Information</h3>';

        // Group fields by step
        const sections = [
            {
                title: 'Student\'s Personal Information',
                fields: ['fullName', 'section', 'semester', 'yearOfAdmission', 'mobileNo', 'personalEmail', 'collegeEmail', 'linkedInId', 'permanentAddress', 'dob', 'gender']
            },
            {
                title: 'Parent\'s Information',
                fields: ['fatherName', 'fatherMobileNo', 'fatherEmail', 'fatherOccupation', 'motherName', 'motherMobileNo', 'motherEmail', 'motherOccupation', 'emergencyContactName', 'emergencyContactNumber']
            },
            {
                title: 'Academic Information (Before Admission)',
                fields: ['sscPercentage', 'sscYear', 'hsscPercentage', 'hsscYear']
            },
            {
                title: 'Academic Information (After Admission)',
                fields: ['sem1SGPA', 'sem1Backlog', 'sem2SGPA', 'sem2Backlog', 'sem3SGPA', 'sem3Backlog', 'sem4SGPA', 'sem4Backlog', 'sem5SGPA', 'sem5Backlog', 'sem6SGPA', 'sem6Backlog', 'sem7SGPA', 'sem7Backlog', 'sem8SGPA', 'sem8Backlog']
            },
            {
                title: 'Career Development Activities',
                fields: ['activity1Name', 'activity1Score', 'activity1Date', 'activity2Name', 'activity2Score', 'activity2Date', 'activity3Name', 'activity3Score', 'activity3Date']
            },
            {
                title: 'Project and Internship Details',
                fields: ['project1Title', 'project1Description', 'project2Title', 'project2Description', 'internship1Company', 'internship1Domain', 'internship1Type', 'internship1Paid', 'internship1Start', 'internship1End', 'internship2Company', 'internship2Domain', 'internship2Type', 'internship2Paid', 'internship2Start', 'internship2End']
            },
            {
                title: 'Co-Curricular Activities',
                fields: [] // Will be handled separately
            },
            {
                title: 'SWOC Analysis',
                fields: ['strengths', 'weaknesses', 'opportunities', 'challenges']
            },
            {
                title: 'Career Objectives and Skills',
                fields: ['careerGoal', 'specificDetails', 'clarityPreparedness', 'campusPlacement', 'placementReasons', 'programmingLanguages', 'technologiesFrameworks', 'familiarToolsPlatforms']
            }
        ];

        sections.forEach(section => {
            let sectionHasContent = false;
            let sectionHTML = `<h4>${section.title}</h4><div class="review-section">`;

            section.fields.forEach(field => {
                const value = formData.get(field);
                if (value) {
                    const label = document.querySelector(`label[for="${field}"]`)?.textContent?.replace(' *', '') ||
                        document.querySelector(`label[for="${field}"]`)?.textContent || field;
                    sectionHTML += `<p><strong>${label}:</strong> ${value}</p>`;
                    sectionHasContent = true;
                }
            });

            // Handle domains checkboxes
            if (section.title === 'Career Objectives and Skills') {
                const selectedDomains = [];
                document.querySelectorAll('input[name^="domain"]:checked').forEach(checkbox => {
                    selectedDomains.push(checkbox.value);
                });
                if (selectedDomains.length > 0) {
                    sectionHTML += `<p><strong>Domains of Interest:</strong> ${selectedDomains.join(', ')}</p>`;
                    sectionHasContent = true;
                }
            }

            sectionHTML += '</div>';

            if (sectionHasContent) {
                reviewHTML += sectionHTML;
            }
        });

        // Handle co-curricular activities separately
        const activityRows = document.querySelectorAll('.activity-row');
        if (activityRows.length > 0) {
            reviewHTML += '<h4>Co-Curricular Activities</h4><div class="review-section">';

            activityRows.forEach((row, index) => {
                const inputs = row.querySelectorAll('input, select');
                let activityText = '';

                inputs.forEach(input => {
                    if (input.value) {
                        const label = input.parentElement.querySelector('label')?.textContent ||
                            input.getAttribute('placeholder') ||
                            input.name;
                        activityText += `${label}: ${input.value}, `;
                    }
                });

                if (activityText) {
                    reviewHTML += `<p><strong>Activity ${index + 1}:</strong> ${activityText.slice(0, -2)}</p>`;
                }
            });

            reviewHTML += '</div>';
        }

        reviewContent.innerHTML = reviewHTML;
    }

    async function submitForm() {
        if (validateStep(currentStep)) {
            try {
                const formData = new FormData(form);
                const rawData = Object.fromEntries(formData.entries());

                // Transform form data to match API schema
                const studentData = transformFormDataToAPI(rawData);

                const token = localStorage.getItem("access_token");
                if (!token) {
                    alert("Please login first");
                    window.location.href = "../login.html";
                    return;
                }

                const response = await fetch("http://localhost:5002/student/me", {
                    method: "PUT",
                    headers: {
                        "Authorization": "Bearer " + token,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(studentData)
                });

                if (response.ok) {
                    const result = await response.json();
                    alert('Profile updated successfully!');
                    console.log('Form submitted successfully:', result);
                } else {
                    const error = await response.json();
                    console.error('Submission failed:', error);
                    alert('Failed to update profile: ' + (error.details || error.error || 'Unknown error'));
                }

            } catch (error) {
                console.error('Error submitting form:', error);
                alert('Network error. Please check your connection and try again.');
            }
        }
    }

    function transformFormDataToAPI(rawData) {
        // Helper function to set default value
        const setDefault = (value) => value && value.trim() ? value.trim() : "N/A";

        // Collect selected domains
        const selectedDomains = [];
        document.querySelectorAll('input[name^="domain"]:checked').forEach(checkbox => {
            selectedDomains.push(checkbox.value);
        });

        // Transform data to match API schema
        const apiData = {
            // Basic student info (only semester and section allowed for students)
            semester: rawData.semester ? parseInt(rawData.semester) : null,
            section: rawData.section || null,

            // Personal information
            personal_info: {
                mobile_no: setDefault(rawData.mobileNo),
                personal_email: setDefault(rawData.personalEmail),
                college_email: setDefault(rawData.collegeEmail),
                linked_in_id: setDefault(rawData.linkedInId),
                permanent_address: setDefault(rawData.permanentAddress),
                dob: rawData.dob || null,
                gender: setDefault(rawData.gender),
                father_name: setDefault(rawData.fatherName),
                father_mobile_no: setDefault(rawData.fatherMobileNo),
                father_email: setDefault(rawData.fatherEmail),
                father_occupation: setDefault(rawData.fatherOccupation),
                mother_name: setDefault(rawData.motherName),
                mother_mobile_no: setDefault(rawData.motherMobileNo),
                mother_email: setDefault(rawData.motherEmail),
                mother_occupation: setDefault(rawData.motherOccupation),
                emergency_contact_name: setDefault(rawData.emergencyContactName),
                emergency_contact_number: setDefault(rawData.emergencyContactNumber)
            },

            // Past education records
            past_education_records: [],

            // Post admission records
            post_admission_records: [],

            // Career activities
            career_activities: [],

            // Projects
            projects: [],

            // Internships
            internships: [],

            // Co-curricular participations
            cocurricular_participations: [],

            // Co-curricular organizations
            cocurricular_organizations: [],

            // SWOC
            swoc: {
                strengths: setDefault(rawData.strengths),
                weaknesses: setDefault(rawData.weaknesses),
                opportunities: setDefault(rawData.opportunities),
                challenges: setDefault(rawData.challenges)
            },

            // Career objective
            career_objective: {
                career_goal: setDefault(rawData.careerGoal),
                specific_details: setDefault(rawData.specificDetails),
                clarity_preparedness: setDefault(rawData.clarityPreparedness),
                interested_in_campus_placement: rawData.campusPlacement === 'true',
                campus_placement_reasons: setDefault(rawData.placementReasons),

            },

            // Skills
            skills: {
                programming_languages: setDefault(rawData.programmingLanguages),
                technologies_frameworks: setDefault(rawData.technologiesFrameworks),
                familiar_tools_platforms: setDefault(rawData.familiarToolsPlatforms),
                domains_of_interest: selectedDomains.length > 0 ? selectedDomains.join(', ') : "N/A"
            }
        };

        // Add past education records
        if (rawData.sscYear && rawData.sscYear.trim() !== '') {
            const sscYear = parseInt(rawData.sscYear);
            if (!isNaN(sscYear) && sscYear > 0) {
                apiData.past_education_records.push({
                    exam_name: 'SSC',
                    percentage: parseFloat(rawData.sscPercentage) || null,
                    year_of_passing: sscYear
                });
            }
        }

        if (rawData.hsscYear && rawData.hsscYear.trim() !== '') {
            const hsscYear = parseInt(rawData.hsscYear);
            if (!isNaN(hsscYear) && hsscYear > 0) {
                apiData.past_education_records.push({
                    exam_name: 'HSSC',
                    percentage: parseFloat(rawData.hsscPercentage) || null,
                    year_of_passing: hsscYear
                });
            }
        }

        // Add post admission records
        for (let i = 1; i <= 8; i++) {
            const sgpa = rawData[`sem${i}SGPA`];
            const backlog = rawData[`sem${i}Backlog`];
            if (sgpa || backlog) {
                apiData.post_admission_records.push({
                    semester: i,
                    sgpa: parseFloat(sgpa) || null,
                    backlog_subjects: setDefault(backlog)
                });
            }
        }

        // Add career activities
        for (let i = 1; i <= 3; i++) {
            const name = rawData[`activity${i}Name`];
            const score = rawData[`activity${i}Score`];
            const date = rawData[`activity${i}Date`];
            if (name || score || date) {
                apiData.career_activities.push({
                    activity_name: setDefault(name),
                    score_rank: setDefault(score),
                    exam_date: date || null
                });
            }
        }

        // Add projects
        if (rawData.project1Title) {
            apiData.projects.push({
                title: setDefault(rawData.project1Title),
                description: setDefault(rawData.project1Description)
            });
        }

        if (rawData.project2Title) {
            apiData.projects.push({
                title: setDefault(rawData.project2Title),
                description: setDefault(rawData.project2Description)
            });
        }

        // Add internships
        if (rawData.internship1Company) {
            apiData.internships.push({
                company_name: setDefault(rawData.internship1Company),
                domain: setDefault(rawData.internship1Domain),
                internship_type: setDefault(rawData.internship1Type),
                paid_unpaid: rawData.internship1Paid === 'Paid' ? 'Paid' : 'Unpaid',
                start_date: rawData.internship1Start || null,
                end_date: rawData.internship1End || null
            });
        }

        if (rawData.internship2Company) {
            apiData.internships.push({
                company_name: setDefault(rawData.internship2Company),
                domain: setDefault(rawData.internship2Domain),
                internship_type: setDefault(rawData.internship2Type),
                paid_unpaid: rawData.internship2Paid === 'Paid' ? 'Paid' : 'Unpaid',
                start_date: rawData.internship2Start || null,
                end_date: rawData.internship2End || null
            });
        }

        // Add co-curricular participations
        for (let i = 1; i <= 3; i++) {
            const name = rawData[`participation${i}Name`];
            const date = rawData[`participation${i}Date`];
            const level = rawData[`participation${i}Level`];
            const awards = rawData[`participation${i}Awards`];
            if (name || date || level || awards) {
                apiData.cocurricular_participations.push({
                    name: setDefault(name),
                    date: date || null,
                    level: setDefault(level),
                    awards: setDefault(awards)
                });
            }
        }

        // Add co-curricular organizations
        for (let i = 1; i <= 3; i++) {
            const name = rawData[`organization${i}Name`];
            const date = rawData[`organization${i}Date`];
            const level = rawData[`organization${i}Level`];
            const remark = rawData[`organization${i}Remark`];
            if (name || date || level || remark) {
                apiData.cocurricular_organizations.push({
                    name: setDefault(name),
                    date: date || null,
                    level: setDefault(level),
                    remark: setDefault(remark)
                });
            }
        }

        // Remove empty arrays and null values
        Object.keys(apiData).forEach(key => {
            if (Array.isArray(apiData[key]) && apiData[key].length === 0) {
                delete apiData[key];
            } else if (apiData[key] === null || apiData[key] === '') {
                delete apiData[key];
            }
        });

        // Debug logging
        console.log('Sending data to backend:', JSON.stringify(apiData, null, 2));

        return apiData;
    }
});