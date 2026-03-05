document.addEventListener('DOMContentLoaded', () => {
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
    const careerGoalSelect = document.getElementById('careerGoal');
    const placementTypeRow = document.getElementById('placementTypeRow');
    const higherStudiesTypeRow = document.getElementById('higherStudiesTypeRow');
    const replacePhotoBtn = document.getElementById('replacePhotoBtn');

    let currentStep = 1;
    const totalSteps = stepContents.length;

    const DRAFT_VERSION = 1;
    const DRAFT_PREFIX = 'student_form_draft_v1';
    const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
    let draftStorageKey = `${DRAFT_PREFIX}_anonymous`;
    let autosaveTimer = null;

    initializeForm();

    prevBtn.addEventListener('click', goToPreviousStep);
    nextBtn.addEventListener('click', handleNextButtonClick);
    stepIndicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => handleStepIndicatorClick(index + 1));
    });

    if (replacePhotoBtn) {
        replacePhotoBtn.addEventListener('click', () => {
            const wrapper = document.getElementById('photoUploadWrapper');
            const isHidden = wrapper && wrapper.style.display === 'none';
            setPhotoReplaceMode(isHidden);
        });
    }

    if (campusPlacement && placementReasonRow) {
        campusPlacement.addEventListener('change', () => {
            togglePlacementReason();
            scheduleDraftSave();
        });
    }

    if (careerGoalSelect) {
        careerGoalSelect.addEventListener('change', () => {
            toggleCareerGoalSubFields();
            scheduleDraftSave();
        });
    }

    if (semesterSelect) {
        semesterSelect.addEventListener('change', () => {
            updateSemesterVisibility();
            scheduleDraftSave();
        });
    }

    form.querySelectorAll('input, select, textarea').forEach(field => {
        field.addEventListener('blur', () => {
            if (field.required) validateField(field);
            scheduleDraftSave();
        });

        field.addEventListener('input', () => {
            if (field.classList.contains('error')) {
                clearFieldError(field);
            }
            scheduleDraftSave();
        });

        field.addEventListener('change', () => {
            scheduleDraftSave();
        });
    });

    window.addEventListener('beforeunload', () => {
        saveDraft(false);
    });

    async function initializeForm() {
        const studentData = await loadStudentData();
        setDraftStorageKey(studentData);
        restoreDraftIfAvailable();
        togglePlacementReason();
        toggleCareerGoalSubFields();
        updateSemesterVisibility();
        updateFormState();
    }

    function scheduleDraftSave() {
        clearTimeout(autosaveTimer);
        autosaveTimer = setTimeout(() => saveDraft(false), 900);
    }

    function showToast(message, type = 'info', duration = 2600) {
        const existing = document.querySelector('.form-toast');
        if (existing) {
            existing.remove();
        }

        const toast = document.createElement('div');
        toast.className = `form-toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 260);
        }, duration);
    }

    function safeStorageGet(key) {
        try {
            return localStorage.getItem(key);
        } catch (error) {
            console.error('localStorage read failed:', error);
            return null;
        }
    }

    function safeStorageSet(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (error) {
            console.error('localStorage write failed:', error);
            return false;
        }
    }

    function safeStorageRemove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('localStorage remove failed:', error);
            return false;
        }
    }

    function parseJwtSub(token) {
        try {
            const parts = token.split('.');
            if (parts.length < 2) return null;
            const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            const decoded = atob(payload.padEnd(payload.length + (4 - payload.length % 4) % 4, '='));
            const json = JSON.parse(decoded);
            return json.sub || json.user_id || json.id || null;
        } catch {
            return null;
        }
    }

    function setDraftStorageKey(studentData) {
        const token = safeStorageGet('access_token') || '';
        const tokenSub = parseJwtSub(token);
        const candidate = studentData?.id || studentData?.student_id || studentData?.user_id || studentData?.full_name || tokenSub || 'anonymous';
        draftStorageKey = `${DRAFT_PREFIX}_${String(candidate).replace(/\s+/g, '_')}`;
    }

    function serializeFormState() {
        const values = {};
        form.querySelectorAll('input, select, textarea').forEach(el => {
            if (!el.name) return;

            if (el.type === 'file') {
                if (el.files && el.files.length > 0) {
                    values[el.name] = { fileName: el.files[0].name, size: el.files[0].size };
                }
                return;
            }

            if (el.type === 'checkbox') {
                values[el.name] = Boolean(el.checked);
                return;
            }

            if (el.type === 'radio') {
                if (el.checked) values[el.name] = el.value;
                return;
            }

            values[el.name] = el.value;
        });

        return values;
    }

    function restoreSerializedState(values) {
        if (!values || typeof values !== 'object') return;

        form.querySelectorAll('input, select, textarea').forEach(el => {
            if (!el.name || !(el.name in values)) return;
            const val = values[el.name];

            if (el.type === 'file') return;

            if (el.type === 'checkbox') {
                el.checked = Boolean(val);
                return;
            }

            if (el.type === 'radio') {
                el.checked = val === el.value;
                return;
            }

            el.value = val ?? '';
        });

        togglePlacementReason();
        toggleCareerGoalSubFields();
        updateSemesterVisibility();
    }

    function saveDraft(showFeedback = false) {
        const now = Date.now();
        const payload = {
            version: DRAFT_VERSION,
            savedAt: now,
            expiresAt: now + DRAFT_TTL_MS,
            currentStep,
            formValues: serializeFormState()
        };

        const ok = safeStorageSet(draftStorageKey, JSON.stringify(payload));

        if (!ok && showFeedback) {
            showToast('Could not save draft locally. Browser storage may be full or blocked.', 'error', 4000);
            return false;
        }

        if (ok && showFeedback) {
            showToast('Step saved. Draft available for 24 hours.', 'success', 2200);
        }

        return ok;
    }

    function restoreDraftIfAvailable() {
        const raw = safeStorageGet(draftStorageKey);
        if (!raw) return;

        try {
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') {
                safeStorageRemove(draftStorageKey);
                return;
            }

            if (parsed.version !== DRAFT_VERSION) {
                safeStorageRemove(draftStorageKey);
                return;
            }

            if (!parsed.expiresAt || Date.now() > parsed.expiresAt) {
                safeStorageRemove(draftStorageKey);
                showToast('Saved draft expired after 24 hours and was cleared.', 'info', 3200);
                return;
            }

            restoreSerializedState(parsed.formValues);

            if (Number.isInteger(parsed.currentStep) && parsed.currentStep >= 1 && parsed.currentStep <= totalSteps) {
                currentStep = parsed.currentStep;
            }

            showToast('Draft restored from local storage.', 'info', 2400);
        } catch (error) {
            console.error('Invalid draft JSON:', error);
            safeStorageRemove(draftStorageKey);
            showToast('A corrupted saved draft was removed.', 'warning', 3000);
        }
    }

    function clearDraft() {
        safeStorageRemove(draftStorageKey);
    }

    async function loadStudentData() {
        try {
            const token = safeStorageGet('access_token');
            if (!token) {
                window.location.href = '../login.html';
                return null;
            }

            const response = await fetch('http://localhost:5002/student/me', {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const studentData = await response.json();
                populateFormWithData(studentData);
                return studentData;
            }

            if (response.status === 401) {
                safeStorageRemove('access_token');
                window.location.href = '../login.html';
                return null;
            }

            console.log('No existing student data found, starting with empty form');
            return null;
        } catch (error) {
            console.error('Error loading student data:', error);
            showToast('Could not fetch existing profile data. You can continue and submit later.', 'warning', 3400);
            return null;
        }
    }

    function setVal(id, value) {
        const el = document.getElementById(id);
        if (el && value !== undefined && value !== null) el.value = value;
    }

    function setQueryVal(selector, value) {
        const el = document.querySelector(selector);
        if (el && value !== undefined && value !== null) el.value = value;
    }

    function renderUploadedPhotoLink(photoUrl) {
        const infoEl = document.getElementById('uploadedPhotoInfo');
        const linkEl = document.getElementById('uploadedPhotoLink');
        const statusEl = document.getElementById('photoStatusMessage');
        const replaceBtn = document.getElementById('replacePhotoBtn');
        if (!infoEl || !linkEl) return;

        if (photoUrl && typeof photoUrl === 'string' && photoUrl.trim()) {
            infoEl.style.display = 'block';
            linkEl.href = photoUrl;
            if (statusEl) {
                statusEl.style.display = 'block';
                statusEl.textContent = 'Photo already uploaded. Upload again only if you want to replace it.';
            }
            if (replaceBtn) replaceBtn.style.display = 'inline-flex';
            setPhotoReplaceMode(false);
        } else {
            infoEl.style.display = 'none';
            linkEl.href = '#';
            if (statusEl) statusEl.style.display = 'none';
            if (replaceBtn) replaceBtn.style.display = 'none';
            setPhotoReplaceMode(true);
        }
    }

    function setPhotoReplaceMode(showUploader) {
        const wrapper = document.getElementById('photoUploadWrapper');
        const replaceBtn = document.getElementById('replacePhotoBtn');
        if (!wrapper) return;
        wrapper.style.display = showUploader ? 'block' : 'none';
        if (replaceBtn && replaceBtn.style.display !== 'none') {
            replaceBtn.textContent = showUploader ? 'Cancel Replace' : 'Replace Photo';
        }
    }

    function populateFormWithData(data) {
        setVal('fullName', data.full_name);
        setVal('section', data.section);
        setVal('semester', data.semester);
        setVal('yearOfAdmission', data.year_of_admission);

        if (data.personal_info) {
            const pi = data.personal_info;
            setVal('bloodGroup', pi.blood_group);
            setVal('category', pi.category);
            setVal('aadharNumber', pi.aadhar_number);
            setVal('misUID', pi.mis_uid);
            setVal('mobileNo', pi.mobile_no);
            setVal('personalEmail', pi.personal_email);
            setVal('collegeEmail', pi.college_email);
            setVal('linkedInId', pi.linked_in_id);
            setVal('githubId', pi.github_id);
            setVal('permanentAddress', pi.permanent_address);
            setVal('presentAddress', pi.present_address);
            setVal('dob', pi.dob);
            setVal('gender', pi.gender);
            setVal('fatherName', pi.father_name);
            setVal('fatherMobileNo', pi.father_mobile_no);
            setVal('fatherEmail', pi.father_email);
            setVal('fatherOccupation', pi.father_occupation);
            setVal('motherName', pi.mother_name);
            setVal('motherMobileNo', pi.mother_mobile_no);
            setVal('motherEmail', pi.mother_email);
            setVal('motherOccupation', pi.mother_occupation);
            setVal('guardianName', pi.emergency_contact_name);
            setVal('guardianMobile', pi.emergency_contact_number);
            setVal('guardianEmail', pi.guardian_email);
            renderUploadedPhotoLink(pi.photo_url);
        } else {
            renderUploadedPhotoLink(null);
        }

        if (data.past_education_records && data.past_education_records.length > 0) {
            data.past_education_records.forEach(record => {
                const examName = (record.exam_name || record.degree || '').toUpperCase();
                if (examName === 'SSC' || examName === 'X') {
                    setVal('sscPercentage', record.percentage);
                    setVal('sscYear', record.year_of_passing);
                } else if (examName === 'HSSC' || examName === 'XII') {
                    setVal('hsscPercentage', record.percentage);
                    setVal('hsscYear', record.year_of_passing);
                } else if (examName === 'DIPLOMA') {
                    setVal('diplomaPercentage', record.percentage);
                    setVal('diplomaYear', record.year_of_passing);
                }
            });
        }

        if (data.post_admission_records && data.post_admission_records.length > 0) {
            data.post_admission_records.forEach(record => {
                const s = record.semester;
                if (s >= 1 && s <= 8) {
                    setVal(`sem${s}SGPA`, record.sgpa);
                    setVal(`sem${s}Backlog`, record.backlog_subjects);
                }
            });
        }

        if (data.projects && data.projects.length > 0) {
            if (data.projects[0]) {
                setVal('miniProjectTitle', data.projects[0].title);
                setVal('miniProjectGuide', data.projects[0].description);
            }
            if (data.projects[1]) {
                setVal('majorProjectTitle', data.projects[1].title);
                setVal('majorProjectGuide', data.projects[1].description);
            }
            if (data.projects[2]) {
                setVal('ubaProjectTitle', data.projects[2].title);
                setVal('ubaProjectGuide', data.projects[2].description);
            }
        }

        if (data.internships && data.internships.length > 0) {
            data.internships.forEach((internship, idx) => {
                const n = idx + 1;
                if (n > 2) return;
                setVal(`internship${n}Company`, internship.company_name);
                setVal(`internship${n}Domain`, internship.domain);
                setVal(`internship${n}Type`, internship.internship_type);
                setVal(`internship${n}Paid`, internship.paid_unpaid);
                setVal(`internship${n}Start`, internship.start_date);
                setVal(`internship${n}End`, internship.end_date);
            });
        }

        if (data.cocurricular_participations && data.cocurricular_participations.length > 0) {
            data.cocurricular_participations.forEach((p, idx) => {
                if (idx >= 3) return;
                const i = idx + 1;
                setQueryVal(`input[name="participation${i}Name"]`, p.name);
                setQueryVal(`input[name="participation${i}Date"]`, p.date);
                setQueryVal(`select[name="participation${i}Level"]`, p.level);
                setQueryVal(`input[name="participation${i}Awards"]`, p.awards);
            });
        }

        if (data.cocurricular_organizations && data.cocurricular_organizations.length > 0) {
            data.cocurricular_organizations.forEach((org, idx) => {
                if (idx >= 3) return;
                const i = idx + 1;
                setQueryVal(`input[name="organization${i}Name"]`, org.name);
                setQueryVal(`input[name="organization${i}Date"]`, org.date);
                setQueryVal(`select[name="organization${i}Level"]`, org.level);
                setQueryVal(`input[name="organization${i}Remark"]`, org.remark);
            });
        }

        if (data.swoc) {
            setVal('strengths', data.swoc.strengths);
            setVal('weaknesses', data.swoc.weaknesses);
            setVal('opportunities', data.swoc.opportunities);
            setVal('challenges', data.swoc.challenges);
        }

        if (data.career_objective) {
            const co = data.career_objective;
            setVal('careerGoal', co.career_goal);
            setVal('specificDetails', co.specific_details);
            setVal('clarityPreparedness', co.clarity_preparedness);

            if (co.interested_in_campus_placement !== undefined) {
                setVal('campusPlacement', co.interested_in_campus_placement ? 'true' : 'false');
            }
            setVal('placementReasons', co.campus_placement_reasons);
        }

        if (data.skills) {
            setVal('programmingLanguages', data.skills.programming_languages);
            setVal('technologiesFrameworks', data.skills.technologies_frameworks);
            setVal('familiarToolsPlatforms', data.skills.familiar_tools_platforms);

            if (data.skills.domains_of_interest) {
                const domains = data.skills.domains_of_interest.split(',').map(d => d.trim());
                document.querySelectorAll('input[name^="domain"]').forEach(cb => {
                    if (domains.includes(cb.value)) cb.checked = true;
                });
            }
        }
    }

    function goToPreviousStep() {
        if (currentStep > 1) {
            currentStep--;
            updateFormState();
            saveDraft(false);
        }
    }

    function handleNextButtonClick() {
        if (!validateStep(currentStep)) {
            showToast('Please correct the highlighted fields before continuing.', 'error', 2400);
            return;
        }

        saveDraft(true);

        if (currentStep < totalSteps) {
            currentStep++;
            updateFormState();
        } else {
            submitForm();
        }
    }

    function handleStepIndicatorClick(targetStep) {
        if (targetStep === currentStep) return;

        if (targetStep < currentStep) {
            currentStep = targetStep;
            updateFormState();
            saveDraft(false);
            return;
        }

        showToast('Complete the current step to move forward.', 'warning', 2600);
    }

    function updateFormState() {
        stepContents.forEach((content, index) => {
            content.classList.toggle('active', index + 1 === currentStep);
        });

        if (stepIndicators.length) {
            stepIndicators.forEach((indicator, index) => {
                indicator.classList.toggle('active', index + 1 === currentStep);
                indicator.classList.toggle('completed', index + 1 < currentStep);
                indicator.classList.toggle('locked', index + 1 > currentStep);
                indicator.setAttribute('aria-disabled', index + 1 > currentStep ? 'true' : 'false');
            });
        }

        const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
        progressFill.style.width = `${progress}%`;
        progressPercentage.textContent = `${Math.round(progress)}%`;

        prevBtn.disabled = currentStep === 1;
        nextBtn.textContent = currentStep === totalSteps ? 'Submit' : 'Next →';
        currentStepSpan.textContent = currentStep;

        if (currentStep === totalSteps) {
            populateReviewContent();
        }
    }

    function updateSemesterVisibility() {
        if (!semesterSelect) return;
        const currentSemester = parseInt(semesterSelect.value) || 0;
        document.querySelectorAll('.semester-row').forEach((row, index) => {
            const semNum = index + 1;
            row.style.display = semNum < currentSemester ? 'block' : 'none';
        });
    }

    function togglePlacementReason() {
        if (!campusPlacement || !placementReasonRow) return;
        const show = campusPlacement.value === 'false';
        placementReasonRow.style.display = show ? 'block' : 'none';
        const reasonsField = document.getElementById('placementReasons');
        if (reasonsField) reasonsField.required = show;
    }

    function toggleCareerGoalSubFields() {
        if (!careerGoalSelect) return;
        const val = careerGoalSelect.value;
        if (placementTypeRow) placementTypeRow.style.display = val === 'placement' ? '' : 'none';
        if (higherStudiesTypeRow) higherStudiesTypeRow.style.display = val === 'higher_studies' ? '' : 'none';
    }

    function validateStep(step) {
        const currentStepContent = document.querySelector(`.step-content[data-step="${step}"]`);
        const requiredFields = currentStepContent.querySelectorAll('[required]');
        let isValid = true;

        if (step === 7) {
            ['strengths', 'weaknesses', 'opportunities', 'challenges'].forEach(id => {
                const field = document.getElementById(id);
                if (field && !field.value.trim()) {
                    if (!validateField(field)) isValid = false;
                }
            });
        }

        if (step === 8) {
            ['careerGoal', 'clarityPreparedness', 'campusPlacement'].forEach(id => {
                const field = document.getElementById(id);
                if (field && !field.value.trim()) {
                    if (!validateField(field)) isValid = false;
                }
            });

            const checkedDomains = Array.from(document.querySelectorAll('input[name^="domain"]:checked'));
            if (checkedDomains.length === 0) {
                isValid = false;
                const container = document.querySelector('label[for="domainsOfInterest"]')?.parentElement;
                if (container) {
                    let errorDiv = container.querySelector('.error-message');
                    if (!errorDiv) {
                        errorDiv = document.createElement('div');
                        errorDiv.className = 'error-message';
                        container.appendChild(errorDiv);
                    }
                    errorDiv.textContent = 'Please select at least one domain of interest';
                    errorDiv.style.display = 'block';
                }
            }
        }

        for (let field of requiredFields) {
            if (!validateField(field)) {
                isValid = false;
                field.scrollIntoView({ behavior: 'smooth', block: 'center' });
                break;
            }
        }

        return isValid;
    }

    function validateField(field) {
        const formGroup = field.closest('.form-group');
        if (!formGroup) return true;
        const errorMessage = formGroup.querySelector('.error-message');

        clearFieldError(field);

        let fieldValid = true;
        let errorMsg = 'This field is required';

        if (field.type === 'checkbox') {
            if (field.required && !field.checked) fieldValid = false;
        } else if (!field.value.trim()) {
            if (field.required) fieldValid = false;
        } else {
            switch (field.id) {
                case 'mobileNo':
                case 'fatherMobileNo':
                case 'motherMobileNo':
                case 'guardianMobile':
                    if (!isValidPhone(field.value)) { fieldValid = false; errorMsg = 'Please enter a valid 10-digit mobile number'; }
                    break;
                case 'aadharNumber':
                    if (field.value.replace(/\D/g, '').length !== 12) { fieldValid = false; errorMsg = 'Please enter a valid 12-digit Aadhar number'; }
                    break;
                case 'personalEmail':
                case 'fatherEmail':
                case 'motherEmail':
                case 'guardianEmail':
                    if (!isValidEmail(field.value)) { fieldValid = false; errorMsg = 'Please enter a valid email address'; }
                    break;
                case 'collegeEmail':
                    if (!isValidCollegeEmail(field.value)) { fieldValid = false; errorMsg = 'Please enter a valid college email ending with @stvincentngp.edu.in'; }
                    break;
                case 'yearOfAdmission':
                    if (!isValidYear(field.value)) { fieldValid = false; errorMsg = 'Please enter a valid year between 2000 and current year'; }
                    break;
                case 'sscPercentage':
                case 'hsscPercentage':
                case 'diplomaPercentage':
                    if (!isValidPercentage(field.value)) { fieldValid = false; errorMsg = 'Please enter a valid percentage (0-100)'; }
                    break;
                case 'sscYear':
                case 'hsscYear':
                case 'diplomaYear':
                    if (!isValidPassingYear(field.value)) { fieldValid = false; errorMsg = 'Please enter a valid passing year'; }
                    break;
                case 'semester':
                    if (!isValidSemester(field.value)) { fieldValid = false; errorMsg = 'Semester must be between 1 and 8'; }
                    break;
                default:
                    if (field.id && field.id.match(/^sem\dSGPA$/)) {
                        if (!isValidSGPA(field.value)) { fieldValid = false; errorMsg = 'SGPA must be between 0 and 10'; }
                    }
                    if (field.tagName === 'SELECT' && field.value === '') fieldValid = false;
            }
        }

        if (!fieldValid) {
            field.classList.add('error');
            if (errorMessage) {
                errorMessage.textContent = errorMsg;
                errorMessage.style.display = 'block';
            }
        }

        return fieldValid;
    }

    function clearFieldError(field) {
        const formGroup = field.closest('.form-group');
        if (!formGroup) return;
        const errorMessage = formGroup.querySelector('.error-message');
        field.classList.remove('error');
        if (errorMessage) errorMessage.style.display = 'none';
    }

    function isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()); }
    function isValidCollegeEmail(email) { return /^[^\s@]+@stvincentngp\.edu\.in$/.test(email.trim()); }
    function isValidPhone(phone) { return /^[0-9]{10}$/.test(phone.replace(/\D/g, '')); }
    function isValidYear(year) { const n = parseInt(year, 10); return !isNaN(n) && n >= 2000 && n <= new Date().getFullYear(); }
    function isValidPercentage(v) { const n = parseFloat(v); return !isNaN(n) && n >= 0 && n <= 100; }
    function isValidSemester(s) { const n = parseInt(s, 10); return !isNaN(n) && n >= 1 && n <= 8; }
    function isValidPassingYear(year) { const n = parseInt(year, 10); const cur = new Date().getFullYear(); return !isNaN(n) && n >= 2000 && n <= cur; }
    function isValidSGPA(s) { const n = parseFloat(s); return !isNaN(n) && n >= 0 && n <= 10; }

    function populateReviewContent() {
        const formData = new FormData(form);
        const get = k => formData.get(k);

        const row = (label, value) => value ? `<p><strong>${label}:</strong> ${value}</p>` : '';
        const sec = (title, html) => html.trim() ? `<h4>${title}</h4><div class="review-section">${html}</div>` : '';

        let html = '<h3>Review Your Information</h3>';

        html += sec('Student Personal Information',
            row('Full Name', get('fullName')) +
            row('Section', get('section')) +
            row('Semester', get('semester')) +
            row('Year of Admission', get('yearOfAdmission')) +
            row('Date of Birth', get('dob')) +
            row('Gender', get('gender')) +
            row('Blood Group', get('bloodGroup')) +
            row('Category', get('category')) +
            row('Aadhar Number', get('aadharNumber')) +
            row('MIS UID', get('misUID')) +
            row('WhatsApp Mobile No.', get('mobileNo')) +
            row('Personal Email', get('personalEmail')) +
            row('College Email', get('collegeEmail')) +
            row('LinkedIn ID', get('linkedInId')) +
            row('GitHub ID', get('githubId')) +
            row('Permanent Address', get('permanentAddress')) +
            row('Present Address', get('presentAddress'))
        );

        html += sec("Parent's Information",
            row("Father's Name", get('fatherName')) +
            row("Father's Mobile", get('fatherMobileNo')) +
            row("Father's Email", get('fatherEmail')) +
            row("Father's Occupation", get('fatherOccupation')) +
            row("Mother's Name", get('motherName')) +
            row("Mother's Mobile", get('motherMobileNo')) +
            row("Mother's Email", get('motherEmail')) +
            row("Mother's Occupation", get('motherOccupation')) +
            row('Local Guardian Name', get('guardianName')) +
            row('Local Guardian Mobile', get('guardianMobile')) +
            row('Local Guardian Email', get('guardianEmail'))
        );

        html += sec('Academic Information (Before Admission)',
            row('SSC Board', get('sscBoard')) +
            row('SSC Percentage', get('sscPercentage')) +
            row('SSC Year', get('sscYear')) +
            row('HSSC Board', get('hsscBoard')) +
            row('HSSC Percentage', get('hsscPercentage')) +
            row('HSSC Year', get('hsscYear')) +
            row('Diploma Board', get('diplomaBoard')) +
            row('Diploma Percentage', get('diplomaPercentage')) +
            row('Diploma Year', get('diplomaYear')) +
            row('Entrance Exam Type', get('entranceExamType')) +
            row('Entrance Exam Score', get('entranceExamScore')) +
            row('Entrance Exam Passing Year', get('entranceExamDate'))
        );

        let semHtml = '';
        for (let i = 1; i <= 8; i++) {
            const sgpa = get(`sem${i}SGPA`);
            const season = get(`sem${i}Season`);
            const yr = get(`sem${i}Year`);
            const rank = get(`sem${i}Rank`);
            const awards = get(`sem${i}Awards`);
            const backlog = get(`sem${i}Backlog`);
            if (sgpa || season || rank || awards || backlog) {
                semHtml += `<p><strong>Semester ${i}:</strong> `;
                if (sgpa) semHtml += `SGPA: ${sgpa}`;
                if (season && yr) semHtml += ` | ${season} ${yr}`;
                if (rank) semHtml += ` | Rank: ${rank}`;
                if (awards) semHtml += ` | Awards: ${awards}`;
                if (backlog) semHtml += ` | Backlogs: ${backlog}`;
                semHtml += '</p>';
            }
        }
        html += sec('Academic Information (After Admission)', semHtml);

        html += sec('Project and Internship Details',
            row('Mini Project Title', get('miniProjectTitle')) +
            row('Mini Project Guide', get('miniProjectGuide')) +
            row('Major Project Title', get('majorProjectTitle')) +
            row('Major Project Guide', get('majorProjectGuide')) +
            row('UBA Project Title', get('ubaProjectTitle')) +
            row('UBA Project Guide', get('ubaProjectGuide')) +
            row('Internship 1 Company', get('internship1Company')) +
            row('Internship 1 Title', get('internship1Title')) +
            row('Internship 1 Domain', get('internship1Domain')) +
            row('Internship 1 Type', get('internship1Type')) +
            row('Internship 1 Paid/Unpaid', get('internship1Paid')) +
            row('Internship 1 Dates', [get('internship1Start'), get('internship1End')].filter(Boolean).join(' to ')) +
            row('Internship 2 Company', get('internship2Company')) +
            row('Internship 2 Title', get('internship2Title')) +
            row('Internship 2 Domain', get('internship2Domain')) +
            row('Internship 2 Type', get('internship2Type')) +
            row('Internship 2 Paid/Unpaid', get('internship2Paid')) +
            row('Internship 2 Dates', [get('internship2Start'), get('internship2End')].filter(Boolean).join(' to '))
        );

        let ccaHtml = '';
        for (let i = 1; i <= 3; i++) {
            const pName = get(`participation${i}Name`);
            if (pName) ccaHtml += row(`Participation ${i}`, [pName, get(`participation${i}Level`), get(`participation${i}Awards`)].filter(Boolean).join(' | '));
        }
        for (let i = 1; i <= 3; i++) {
            const oName = get(`organization${i}Name`);
            if (oName) ccaHtml += row(`Organized ${i}`, [oName, get(`organization${i}Level`), get(`organization${i}Remark`)].filter(Boolean).join(' | '));
        }
        for (let i = 1; i <= 3; i++) {
            const sTitle = get(`sdp${i}Title`);
            if (sTitle) ccaHtml += row(`SDP/MOOC ${i}`, [sTitle, get(`sdp${i}Agency`), get(`sdp${i}Duration`) ? get(`sdp${i}Duration`) + ' hrs' : ''].filter(Boolean).join(' | '));
        }
        html += sec('Co-Curricular Activities', ccaHtml);

        html += sec('SWOC Analysis',
            row('Strengths', get('strengths')) +
            row('Weaknesses', get('weaknesses')) +
            row('Opportunities', get('opportunities')) +
            row('Challenges', get('challenges'))
        );

        const selectedDomains = Array.from(document.querySelectorAll('input[name^="domain"]:checked')).map(c => c.value);
        const selectedInterests = Array.from(document.querySelectorAll('input[name^="interest_"]:checked')).map(c => c.value);

        html += sec('Career Objectives and Skills',
            row('Career Goal', get('careerGoal')) +
            row('Placement Type', get('placementType')) +
            row('Higher Studies Type', get('higherStudiesType')) +
            row('Specific Details', get('specificDetails')) +
            row('Clarity & Preparedness', get('clarityPreparedness')) +
            row('Campus Placement Interest', get('campusPlacement')) +
            row('Placement Reasons', get('placementReasons')) +
            row('Areas of Interest', selectedInterests.join(', ')) +
            row('Interested in Being Mentor?', get('mentorInterest')) +
            row('Expectations from Institute', get('institutionExpectations')) +
            row('Technical & Soft Skills', get('technicalSoftSkills')) +
            row('Additional Technical Skills', get('additionalTechnicalSkills')) +
            row('Additional Soft Skills', get('additionalSoftSkills')) +
            row('Programming Languages', get('programmingLanguages')) +
            row('Technologies & Frameworks', get('technologiesFrameworks')) +
            row('Familiar Tools & Platforms', get('familiarToolsPlatforms')) +
            row('Domains of Interest', selectedDomains.join(', '))
        );

        reviewContent.innerHTML = html;
    }

    async function submitForm() {
        if (!validateStep(currentStep)) {
            showToast('Please complete all required fields before submitting.', 'error', 3000);
            return;
        }

        try {
            const formData = new FormData(form);
            const rawData = Object.fromEntries(formData.entries());
            const studentData = transformFormDataToAPI(rawData);
            const photoFile = formData.get('photoUpload');

            const token = safeStorageGet('access_token');
            if (!token) {
                showToast('Session expired. Please login again.', 'error', 3000);
                window.location.href = '../login.html';
                return;
            }

            nextBtn.classList.add('btn-loading');
            nextBtn.disabled = true;

            const response = await fetch('http://localhost:5002/student/me', {
                method: 'PUT',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(studentData)
            });

            if (response.ok) {
                await response.json();
                let photoUploadError = null;
                if (photoFile instanceof File && photoFile.size > 0) {
                    const uploadResult = await uploadPhoto(photoFile, token);
                    photoUploadError = uploadResult.error;
                    if (!photoUploadError && uploadResult.photoUrl) {
                        renderUploadedPhotoLink(uploadResult.photoUrl);
                    }
                }

                clearDraft();
                if (photoUploadError) {
                    showToast('Profile saved, but photo upload failed.', 'warning', 3200);
                    alert('Profile updated successfully, but photo upload failed: ' + photoUploadError);
                } else {
                    showToast('Profile and photo updated successfully. Local draft cleared.', 'success', 2600);
                    alert('Profile updated successfully!');
                }
            } else {
                let errorPayload = null;
                try {
                    errorPayload = await response.json();
                } catch {
                    errorPayload = null;
                }
                console.error('Submission failed:', errorPayload);
                showToast('Failed to update profile. Please try again.', 'error', 3400);
                alert('Failed to update profile: ' + (errorPayload?.details || errorPayload?.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            showToast('Network error. Please check your connection and retry.', 'error', 3400);
            alert('Network error. Please check your connection and try again.');
        } finally {
            nextBtn.classList.remove('btn-loading');
            nextBtn.disabled = false;
        }
    }

    async function uploadPhoto(photoFile, token) {
        if (!photoFile.type || !photoFile.type.startsWith('image/')) {
            return { error: 'Invalid file type. Please upload a JPG/PNG image.' };
        }
        if (photoFile.size > 2 * 1024 * 1024) {
            return { error: 'File too large. Max size is 2MB.' };
        }

        const photoFormData = new FormData();
        photoFormData.append('photo', photoFile);

        const uploadResponse = await fetch('http://localhost:5002/student/me/upload-photo', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            body: photoFormData
        });

        if (!uploadResponse.ok) {
            let errorPayload = null;
            try {
                errorPayload = await uploadResponse.json();
            } catch {
                errorPayload = null;
            }
            return { error: errorPayload?.error || 'Upload failed' };
        }
        const payload = await uploadResponse.json();
        return { error: null, photoUrl: payload?.photo_url || null };
    }

    function transformFormDataToAPI(rawData) {
        const setDefault = v => (v && v.trim()) ? v.trim() : 'N/A';
        const parseNum = v => (v && v.trim()) ? parseFloat(v) : null;
        const parseInt2 = v => (v && v.trim()) ? parseInt(v, 10) : null;
        const orNull = v => (v && v.trim()) ? v.trim() : null;

        const selectedDomains = Array.from(document.querySelectorAll('input[name^="domain"]:checked')).map(c => c.value);

        const apiData = {
            semester: parseInt2(rawData.semester),
            section: orNull(rawData.section),
            personal_info: {
                blood_group: orNull(rawData.bloodGroup),
                category: orNull(rawData.category),
                aadhar_number: orNull(rawData.aadharNumber),
                mis_uid: orNull(rawData.misUID),
                mobile_no: setDefault(rawData.mobileNo),
                personal_email: setDefault(rawData.personalEmail),
                college_email: setDefault(rawData.collegeEmail),
                linked_in_id: setDefault(rawData.linkedInId),
                github_id: orNull(rawData.githubId),
                permanent_address: setDefault(rawData.permanentAddress),
                present_address: orNull(rawData.presentAddress),
                dob: orNull(rawData.dob),
                gender: setDefault(rawData.gender),
                father_name: setDefault(rawData.fatherName),
                father_mobile_no: setDefault(rawData.fatherMobileNo),
                father_email: setDefault(rawData.fatherEmail),
                father_occupation: setDefault(rawData.fatherOccupation),
                mother_name: setDefault(rawData.motherName),
                mother_mobile_no: setDefault(rawData.motherMobileNo),
                mother_email: setDefault(rawData.motherEmail),
                mother_occupation: setDefault(rawData.motherOccupation),
                emergency_contact_name: setDefault(rawData.guardianName),
                emergency_contact_number: setDefault(rawData.guardianMobile),
                guardian_name: orNull(rawData.guardianName),
                guardian_mobile: orNull(rawData.guardianMobile),
                guardian_email: orNull(rawData.guardianEmail)
            },
            past_education_records: [],
            post_admission_records: [],
            projects: [],
            internships: [],
            cocurricular_participations: [],
            cocurricular_organizations: [],
            swoc: {
                strengths: setDefault(rawData.strengths),
                weaknesses: setDefault(rawData.weaknesses),
                opportunities: setDefault(rawData.opportunities),
                challenges: setDefault(rawData.challenges)
            },
            career_objective: {
                career_goal: setDefault(rawData.careerGoal),
                specific_details: setDefault(rawData.specificDetails),
                clarity_preparedness: setDefault(rawData.clarityPreparedness),
                interested_in_campus_placement: rawData.campusPlacement === 'true',
                campus_placement_reasons: setDefault(rawData.placementReasons)
            },
            skills: {
                programming_languages: setDefault(rawData.programmingLanguages),
                technologies_frameworks: setDefault(rawData.technologiesFrameworks),
                familiar_tools_platforms: setDefault(rawData.familiarToolsPlatforms),
                domains_of_interest: selectedDomains.length > 0 ? selectedDomains.join(', ') : 'N/A'
            }
        };

        const sscPercentage = parseNum(rawData.sscPercentage);
        const sscYear = parseInt2(rawData.sscYear);
        if (sscYear !== null && sscPercentage !== null) {
            apiData.past_education_records.push({
                exam_name: 'SSC',
                percentage: sscPercentage,
                year_of_passing: sscYear
            });
        }
        const hsscPercentage = parseNum(rawData.hsscPercentage);
        const hsscYear = parseInt2(rawData.hsscYear);
        if (hsscYear !== null && hsscPercentage !== null) {
            apiData.past_education_records.push({
                exam_name: 'HSSC',
                percentage: hsscPercentage,
                year_of_passing: hsscYear
            });
        }
        const diplomaPercentage = parseNum(rawData.diplomaPercentage);
        const diplomaYear = parseInt2(rawData.diplomaYear);
        if (diplomaYear !== null && diplomaPercentage !== null) {
            apiData.past_education_records.push({
                exam_name: 'DIPLOMA',
                percentage: diplomaPercentage,
                year_of_passing: diplomaYear
            });
        }

        for (let i = 1; i <= 8; i++) {
            const sgpa = rawData[`sem${i}SGPA`];
            const backlog = rawData[`sem${i}Backlog`];
            const parsedSgpa = parseNum(sgpa);
            if (parsedSgpa !== null || (sgpa === '0' || sgpa === 0)) {
                apiData.post_admission_records.push({
                    semester: i,
                    sgpa: parsedSgpa,
                    backlog_subjects: setDefault(backlog)
                });
            }
        }

        [
            { type: 'Mini Project', title: rawData.miniProjectTitle, guide: rawData.miniProjectGuide },
            { type: 'Major Project', title: rawData.majorProjectTitle, guide: rawData.majorProjectGuide },
            { type: 'UBA', title: rawData.ubaProjectTitle, guide: rawData.ubaProjectGuide }
        ].forEach(p => {
            if (orNull(p.title)) {
                apiData.projects.push({
                    title: setDefault(p.title),
                    description: setDefault(p.guide)
                });
            }
        });

        [1, 2].forEach(n => {
            if (orNull(rawData[`internship${n}Company`])) {
                apiData.internships.push({
                    company_name: setDefault(rawData[`internship${n}Company`]),
                    domain: setDefault(rawData[`internship${n}Domain`]),
                    internship_type: setDefault(rawData[`internship${n}Type`]),
                    paid_unpaid: rawData[`internship${n}Paid`] === 'Paid' ? 'Paid' : 'Unpaid',
                    start_date: orNull(rawData[`internship${n}Start`]),
                    end_date: orNull(rawData[`internship${n}End`])
                });
            }
        });

        for (let i = 1; i <= 3; i++) {
            const name = rawData[`participation${i}Name`];
            if (orNull(name)) {
                apiData.cocurricular_participations.push({
                    name: setDefault(name),
                    date: orNull(rawData[`participation${i}Date`]),
                    level: setDefault(rawData[`participation${i}Level`]),
                    awards: setDefault(rawData[`participation${i}Awards`])
                });
            }
        }

        for (let i = 1; i <= 3; i++) {
            const name = rawData[`organization${i}Name`];
            if (orNull(name)) {
                apiData.cocurricular_organizations.push({
                    name: setDefault(name),
                    date: orNull(rawData[`organization${i}Date`]),
                    level: setDefault(rawData[`organization${i}Level`]),
                    remark: setDefault(rawData[`organization${i}Remark`])
                });
            }
        }

        Object.keys(apiData).forEach(key => {
            if (Array.isArray(apiData[key]) && apiData[key].length === 0) delete apiData[key];
            else if (apiData[key] === null) delete apiData[key];
        });

        return apiData;
    }

});
