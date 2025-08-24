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
    const domainOtherCheckbox = document.getElementById('domainOtherCheckbox');
    const domainOtherText = document.getElementById('domainOtherText');

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

    if (domainOtherCheckbox && domainOtherText) {
        domainOtherCheckbox.addEventListener('change', toggleDomainOtherText);
    }

    // Add real-time validation
    form.querySelectorAll('input, select, textarea').forEach(field => {
        field.addEventListener('blur', () => {
            if (field.hasAttribute('required')) {
                validateField(field);
            }
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
        if (data.uid) document.getElementById('rollNo').value = data.uid;
        if (data.year_of_admission) document.getElementById('yearOfAdmission').value = data.year_of_admission;

        // Personal information
        if (data.personal_info) {
            const pi = data.personal_info;
            if (pi.mobile_no) document.getElementById('mobile').value = pi.mobile_no;
            if (pi.personal_email) document.getElementById('email').value = pi.personal_email;
            if (pi.college_email) document.getElementById('collegeEmail').value = pi.college_email;
            if (pi.linked_in_id) document.getElementById('linkedinId').value = pi.linked_in_id;
            if (pi.permanent_address) document.getElementById('permanentAddress').value = pi.permanent_address;
            if (pi.dob) document.getElementById('dob').value = pi.dob;
            if (pi.gender) document.getElementById('gender').value = pi.gender;
            if (pi.father_name) document.getElementById('fatherName').value = pi.father_name;
            if (pi.father_mobile_no) document.getElementById('fatherMobile').value = pi.father_mobile_no;
            if (pi.father_email) document.getElementById('fatherEmail').value = pi.father_email;
            if (pi.father_occupation) document.getElementById('fatherOccupation').value = pi.father_occupation;
            if (pi.mother_name) document.getElementById('motherName').value = pi.mother_name;
            if (pi.mother_mobile_no) document.getElementById('motherMobile').value = pi.mother_mobile_no;
            if (pi.mother_email) document.getElementById('motherEmail').value = pi.mother_email;
            if (pi.mother_occupation) document.getElementById('motherOccupation').value = pi.mother_occupation;
        }

        // Past education records
        if (data.past_education_records && data.past_education_records.length > 0) {
            const pastEd = data.past_education_records;
            // Populate past education fields based on degree type
            pastEd.forEach(record => {
                if (record.degree === 'SSC' || record.degree === 'X') {
                    document.getElementById('sscPercentage').value = record.percentage || '';
                    document.getElementById('sscYear').value = record.year_of_passing || '';
                } else if (record.degree === 'HSSC' || record.degree === 'XII') {
                    document.getElementById('hsscPercentage').value = record.percentage || '';
                    document.getElementById('hsscYear').value = record.year_of_passing || '';
                } else if (record.degree === 'Diploma') {
                    document.getElementById('diplomaPercentage').value = record.percentage || '';
                    document.getElementById('diplomaYear').value = record.year_of_passing || '';
                }
            });
        }

        // Career objective
        if (data.career_objective) {
            const co = data.career_objective;
            if (co.career_objective) document.getElementById('careerObjectives').value = co.career_objective;
            if (co.domain_of_interest) document.getElementById('domainOfInterest').value = co.domain_of_interest;
            if (co.additional_skills) document.getElementById('additionalSkills').value = co.additional_skills;
            if (co.expectations) document.getElementById('expectations').value = co.expectations;
        }

        // Skills
        if (data.skills) {
            const skills = data.skills;
            if (skills.technical_skills) document.getElementById('technicalSkills').value = skills.technical_skills;
            if (skills.soft_skills) document.getElementById('softSkills').value = skills.soft_skills;
            if (skills.interpersonal_skills) document.getElementById('interpersonalSkills').value = skills.interpersonal_skills;
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

    function validateStep(step) {
        const currentStepContent = document.querySelector(`.step-content[data-step="${step}"]`);
        const requiredFields = currentStepContent.querySelectorAll('[required]');
        let isValid = true;

        // Set dynamic required attributes for step 8
        if (step === 8) {
            if (campusPlacement) {
                const reason = document.getElementById('placementReason');
                if (reason) reason.required = (campusPlacement.value === 'no');
            }

            if (domainOtherCheckbox && domainOtherText) {
                domainOtherText.required = domainOtherCheckbox.checked;
            }
        }

        for (let field of requiredFields) {
            if (!validateField(field)) {
                isValid = false;

                // Scroll to first error field
                field.scrollIntoView({ behavior: 'smooth', block: 'center' });
                break; // Only scroll to the first error
            }
        }

        // Special validation for step 8 (career objectives) - removed checkbox validation since using select dropdown
        // The required validation for the select dropdown is handled by the standard required field validation above

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
                case 'mobile':
                case 'fatherMobile':
                case 'motherMobile':
                    if (!isValidPhone(field.value)) {
                        fieldValid = false;
                        errorMsg = 'Please enter a valid 10-digit mobile number';
                    }
                    break;
                case 'email':
                case 'fatherEmail':
                case 'motherEmail':
                case 'collegeEmail':
                    if (!isValidEmail(field.value)) {
                        fieldValid = false;
                        errorMsg = 'Please enter a valid email address';
                    }
                    break;
                case 'admissionYear':
                    if (!isValidYear(field.value)) {
                        fieldValid = false;
                        errorMsg = 'Please enter a valid year between 2000 and current year';
                    }
                    break;
                case 'sscPercentage':
                case 'hsscPercentage':
                case 'diplomaPercentage':
                    if (!isValidPercentage(field.value)) {
                        fieldValid = false;
                        errorMsg = 'Please enter a valid percentage (0-100)';
                    }
                    break;
                case 'sscYear':
                    if (!isValidPassingYear(field.value, 'ssc')) {
                        fieldValid = false;
                        errorMsg = 'Please enter a valid passing year for SSC';
                    }
                    break;
                case 'hsscYear':
                    if (!isValidPassingYear(field.value, 'hssc')) {
                        fieldValid = false;
                        errorMsg = 'Please enter a valid passing year for HSSC';
                    }
                    break;
                case 'placementReason':
                    errorMsg = 'Please specify the reasons';
                    break;
                case 'domainOtherText':
                    errorMsg = 'Please specify the other domain';
                    break;
                case 'semester':
                    if (!isValidSemester(field.value)) {
                        fieldValid = false;
                        errorMsg = 'Semester must be between 1 and 8';
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
        errorMessage.style.display = 'none';
    }

    // Validation helper functions
    function isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
        return !isNaN(numValue) && numValue >= 0 && numValue <= 100;
    }

    function isValidSemester(semester) {
        const numSemester = parseInt(semester);
        return !isNaN(numSemester) && numSemester >= 1 && numSemester <= 8;
    }

    function isValidPassingYear(year, type) {
        const numYear = parseInt(year);
        const currentYear = new Date().getFullYear();

        if (isNaN(numYear)) return false;

        // SSC should be at least 5 years before current year
        if (type === 'ssc') {
            return numYear >= 2000 && numYear <= currentYear - 5;
        }

        // HSSC can be up to current year (allowing current year students)
        if (type === 'hssc') {
            return numYear >= 2000 && numYear <= currentYear;
        }

        return numYear >= 2000 && numYear <= currentYear;
    }

    function togglePlacementReason() {
        if (campusPlacement.value === 'no') {
            placementReasonRow.style.display = 'block';
        } else {
            placementReasonRow.style.display = 'none';
        }
    }

    function toggleDomainOtherText() {
        domainOtherText.style.display = domainOtherCheckbox.checked ? 'inline-block' : 'none';
    }

    function populateReviewContent() {
        const formData = new FormData(form);
        let reviewHTML = '<h3>Review Your Information</h3>';

        // Group fields by step
        const sections = [
            {
                title: 'Student\'s Personal Information',
                fields: ['department', 'fullName', 'semesterSection', 'rollNo', 'admissionYear', 'mobile', 'email', 'linkedin', 'permanentAddress']
            },
            {
                title: 'Parent\'s Information',
                fields: ['fatherName', 'fatherMobile', 'fatherEmail', 'fatherOccupation', 'motherName', 'motherMobile', 'motherEmail', 'motherOccupation']
            },
            {
                title: 'Academic Information (Before Admission)',
                fields: ['sscPercentage', 'sscYear', 'hsscPercentage', 'hsscYear', 'diplomaPercentage', 'diplomaYear', 'entranceExam', 'entranceScore', 'entranceYear', 'otherQualification', 'otherPercentage', 'otherYear']
            },
            {
                title: 'Academic Information (After Admission)',
                fields: ['sem1Year', 'sem1SGPA', 'sem1Rank', 'sem1Awards', 'sem2Year', 'sem2SGPA', 'sem2Rank', 'sem2Awards', 'sem3Year', 'sem3SGPA', 'sem3Rank', 'sem3Awards', 'sem1Backlogs', 'sem2Backlogs', 'sem3Backlogs']
            },
            {
                title: 'Performance in Career Development Activities',
                fields: ['aptitudeScore', 'aptitudeDate', 'cocubesScore', 'cocubesDate', 'gatecatScore', 'gatecatDate', 'otherExamName', 'otherExamScore', 'otherExamDate']
            },
            {
                title: 'Project and Internship Details',
                fields: ['microProjectTitle', 'microProjectGuide', 'majorProjectTitle', 'majorProjectGuide', 'internship1Company', 'internship1Domain', 'internship1Type', 'internship1Paid', 'internship1Start', 'internship1End', 'internship2Company', 'internship2Domain', 'internship2Type', 'internship2Paid', 'internship2Start', 'internship2End']
            },
            {
                title: 'Co-Curricular Activities',
                fields: [] // Will be handled separately
            },
            {
                title: 'Career Objectives and Skills',
                fields: ['careerObjectives', 'careerDetails', 'careerPreparedness', 'campusPlacement', 'placementReason', 'interpersonalSkills', 'softSkills', 'additionalSkills', 'expectations', 'mentorSignature']
            }
        ];

        sections.forEach(section => {
            let sectionHasContent = false;
            let sectionHTML = `<h4>${section.title}</h4><div class="review-section">`;

            section.fields.forEach(field => {
                if (field === 'careerObjectives') {
                    const value = formData.get('careerObjectives');
                    if (value) {
                        sectionHTML += `<p><strong>Career Objectives:</strong> ${value}</p>`;
                        sectionHasContent = true;
                    }
                } else {
                    const value = formData.get(field);
                    if (value) {
                        const label = document.querySelector(`label[for="${field}"]`)?.textContent?.replace(' *', '') ||
                            document.querySelector(`label[for="${field}"]`)?.textContent || field;
                        sectionHTML += `<p><strong>${label}:</strong> ${value}</p>`;
                        sectionHasContent = true;
                    }
                }
            });

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
        // Collect co-curricular activities
        const activities = [];
        document.querySelectorAll('.activity-row').forEach(row => {
            const activityData = {};
            row.querySelectorAll('input, select').forEach(input => {
                if (input.value) {
                    activityData[input.name || input.getAttribute('placeholder')] = input.value;
                }
            });
            if (Object.keys(activityData).length > 0) {
                activities.push(activityData);
            }
        });

        // Transform data to match API schema
        const apiData = {
            // Basic student info
            semester: rawData.semester ? parseInt(rawData.semester) : null,
            section: rawData.section || null,

            // Personal information
            personal_info: {
                mobile_no: rawData.mobile || '',
                personal_email: rawData.email || '',
                college_email: rawData.collegeEmail || '',
                linked_in_id: rawData.linkedinId || '',
                permanent_address: rawData.permanentAddress || '',
                dob: rawData.dob || null,
                gender: rawData.gender || '',
                father_name: rawData.fatherName || '',
                father_mobile_no: rawData.fatherMobile || '',
                father_email: rawData.fatherEmail || '',
                father_occupation: rawData.fatherOccupation || '',
                mother_name: rawData.motherName || '',
                mother_mobile_no: rawData.motherMobile || '',
                mother_email: rawData.motherEmail || '',
                mother_occupation: rawData.motherOccupation || ''
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
            cocurricular_participations: activities,

            // Career objective
            career_objective: {
                career_objective: rawData.careerObjectives || '',
                domain_of_interest: rawData.domainOfInterest || '',
                additional_skills: rawData.additionalSkills || '',
                expectations: rawData.expectations || ''
            },

            // Skills
            skills: {
                technical_skills: rawData.technicalSkills || '',
                soft_skills: rawData.softSkills || '',
                interpersonal_skills: rawData.interpersonalSkills || ''
            }
        };

        // Add past education records
        if (rawData.sscPercentage || rawData.sscYear) {
            apiData.past_education_records.push({
                degree: 'SSC',
                percentage: parseFloat(rawData.sscPercentage) || null,
                year_of_passing: parseInt(rawData.sscYear) || null
            });
        }

        if (rawData.hsscPercentage || rawData.hsscYear) {
            apiData.past_education_records.push({
                degree: 'HSSC',
                percentage: parseFloat(rawData.hsscPercentage) || null,
                year_of_passing: parseInt(rawData.hsscYear) || null
            });
        }

        if (rawData.diplomaPercentage || rawData.diplomaYear) {
            apiData.past_education_records.push({
                degree: 'Diploma',
                percentage: parseFloat(rawData.diplomaPercentage) || null,
                year_of_passing: parseInt(rawData.diplomaYear) || null
            });
        }

        // Add projects
        if (rawData.microProjectTitle) {
            apiData.projects.push({
                title: rawData.microProjectTitle,
                description: 'Micro Project',
                guide: rawData.microProjectGuide || ''
            });
        }

        if (rawData.majorProjectTitle) {
            apiData.projects.push({
                title: rawData.majorProjectTitle,
                description: 'Major Project',
                guide: rawData.majorProjectGuide || ''
            });
        }

        // Add internships
        if (rawData.internship1Company) {
            apiData.internships.push({
                company: rawData.internship1Company,
                domain: rawData.internship1Domain || '',
                type: rawData.internship1Type || '',
                is_paid: rawData.internship1Paid === 'paid',
                start_date: rawData.internship1Start || null,
                end_date: rawData.internship1End || null
            });
        }

        if (rawData.internship2Company) {
            apiData.internships.push({
                company: rawData.internship2Company,
                domain: rawData.internship2Domain || '',
                type: rawData.internship2Type || '',
                is_paid: rawData.internship2Paid === 'paid',
                start_date: rawData.internship2Start || null,
                end_date: rawData.internship2End || null
            });
        }

        // Remove empty arrays and null values
        Object.keys(apiData).forEach(key => {
            if (Array.isArray(apiData[key]) && apiData[key].length === 0) {
                delete apiData[key];
            } else if (apiData[key] === null || apiData[key] === '') {
                delete apiData[key];
            }
        });

        return apiData;
    }
});