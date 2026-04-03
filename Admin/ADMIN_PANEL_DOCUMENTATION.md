# KYS Admin Panel — Comprehensive Documentation

## Overview

The Know Your Student (KYS) system is a university mentoring platform with three roles:
- **Admin** — full system control
- **Faculty** — mentor assigned students, write mentoring minutes
- **Student** — fill and view their own profile

The admin panel (`Admin/a.html` + `Admin/adm.js` + `Admin/reports.js`) is the central control hub.
The backend is a Flask REST API (`Backend/KYS_flask_backend/main.py`).

---

## Architecture

```
Frontend (Vanilla JS + HTML)
  ├── Admin/a.html          — Dashboard layout, all tab sections
  ├── Admin/adm.js          — User/student/faculty/allocation logic
  └── Admin/reports.js      — Analytics, charts, export logic

Backend (Flask + SQLAlchemy)
  └── main.py               — All REST endpoints, models, auth
```

Database: PostgreSQL (via `DATABASE_URL` env var). ORM: SQLAlchemy + Flask-Migrate.

---

## Data Models

### User
| Field         | Type        | Notes                          |
|---------------|-------------|--------------------------------|
| id            | Integer PK  |                                |
| username      | String(120) | Unique. UID for students, email for faculty |
| password_hash | String(255) | Werkzeug PBKDF2 hash           |
| role          | String(20)  | `admin`, `student`, `faculty`  |

### Student
| Field             | Type       | Notes                        |
|-------------------|------------|------------------------------|
| id                | Integer PK |                              |
| uid               | String(20) | Unique student ID            |
| first/middle/last | String     |                              |
| semester          | Integer    | 1–8                          |
| section           | String(10) | e.g. A, B                    |
| year_of_admission | Integer    |                              |
| user_id           | FK → User  |                              |
| mentor_id         | FK → Faculty (nullable) | Assigned mentor |

### Faculty
| Field          | Type        | Notes                          |
|----------------|-------------|--------------------------------|
| id             | Integer PK  |                                |
| email          | String(120) | Must end with @stvincentngp.edu.in |
| first_name     | String      |                                |
| last_name      | String      |                                |
| contact_number | String(20)  |                                |
| user_id        | FK → User   |                                |

### StudentPersonalInfo (one-to-one with Student)
Stores: mobile, personal/college email, LinkedIn, GitHub, DOB, gender, address, father/mother details, emergency contact, blood group, category, Aadhar, MIS UID, photo URL (Cloudinary).

### Related Models (all FK → Student)
- `PastEducation` — exam_name, percentage, year_of_passing
- `PostAdmissionAcademicRecord` — semester, sgpa, backlog_subjects
- `Project` — title, description
- `Internship` — company, domain, type, paid/unpaid, dates
- `CoCurricularParticipation` — name, date, level, awards
- `CoCurricularOrganization` — name, date, level, remark
- `CareerObjective` — career_goal, specific_details, clarity_preparedness, campus_placement
- `Skills` — programming_languages, technologies_frameworks, domains_of_interest, tools
- `SWOC` — strengths, weaknesses, opportunities, challenges
- `MentoringMinute` — FK → Student + Faculty, semester, date, remarks, suggestion, action

---

## Authentication & Security

| Mechanism         | Implementation                                      |
|-------------------|-----------------------------------------------------|
| Auth method       | JWT via `flask-jwt-extended`                        |
| Token expiry      | 1 hour                                              |
| Password hashing  | Werkzeug `generate_password_hash` (PBKDF2)          |
| Rate limiting     | Login: 10 req/min; Global: 200 req/hour             |
| HTTPS             | Flask-Talisman (configurable via `FORCE_HTTPS` env) |
| CORS              | Whitelist via `ALLOWED_ORIGINS` env var             |
| Token revocation  | In-memory JWT blacklist (cleared on restart)        |
| Session cookies   | Secure, HttpOnly, SameSite=Lax                      |
| Role enforcement  | `@role_required(["admin"])` decorator on every endpoint |

### Login Flow
1. POST `/api/auth/login` with `{ uid, password }`
2. Backend validates credentials, returns `access_token` + `role`
3. Frontend stores token in `localStorage` as `access_token`
4. Every API call sends `Authorization: Bearer <token>`
5. On 401, frontend clears storage and redirects to login

### Route Guarding (Frontend)
`js/auth.js` exports `AuthGuard.guardRoute(['admin'])`. Every protected page calls this on `DOMContentLoaded`. It hits `/api/auth/verify`, checks role, and redirects if invalid.

---

## Admin Dashboard Tabs

### 1. User Management
Primary hub for creating and managing all users.

### 2. Teachers List
View all faculty with assigned student counts.

### 3. Students List
Browse all students with filters and full profile view.

### 4. Student Allocation
Assign students to faculty mentors.

### 5. Reports & Analytics
Charts, toppers, backlogs, incomplete profiles, PDF export.

---

## Admin Operations — Complete Reference

### User Management

#### Create Student
**UI:** User Management → Add User → Student  
**API:** `POST /api/admin/users`  
**Payload:**
```json
{
  "username": "UID123",
  "password": "pass1234",
  "role": "student",
  "uid": "UID123",
  "first_name": "John Doe",
  "semester": 3,
  "section": "A",
  "year_of_admission": 2022
}
```
**Backend logic:**
- Validates all required fields
- Checks username and UID uniqueness
- Creates `User` record with hashed password
- Creates linked `Student` profile
- Default password = UID (for bulk registration)

#### Create Faculty
**UI:** User Management → Add User → Faculty  
**API:** `POST /api/admin/users`  
**Payload:**
```json
{
  "username": "faculty@stvincentngp.edu.in",
  "password": "pass1234",
  "role": "faculty",
  "email": "faculty@stvincentngp.edu.in",
  "first_name": "Jane",
  "last_name": "Smith",
  "contact_number": "9876543210"
}
```
**Validation:** Email must end with `@stvincentngp.edu.in`.

#### Bulk Register Students
**UI:** User Management → Bulk Upload Student (CSV/XLSX)  
**API:** `POST /api/auth/register/bulk`  
**Payload:** Array of student objects  
**Behavior:** Processes each entry independently; returns per-entry success/failure. Rolls back entire batch on DB error.

#### Bulk Register Faculty
**UI:** User Management → Bulk Upload Faculty  
**API:** `POST /api/auth/register/faculty/bulk`  
Same pattern as bulk students.

#### Update User
**API:** `PUT /api/admin/users/<user_id>`  
- Students: can update uid, full_name, semester, section, year_of_admission
- Faculty: can update email, first_name, last_name, contact_number, password
- Role change is NOT allowed (must delete and recreate)

#### Delete User
**UI:** User Management → Delete button  
**API:** `DELETE /api/admin/users/<user_id>`  
- Cascades: deletes linked Student/Faculty profile and all related records
- Cannot delete own account

#### Reset User Password
**UI:** User Management → Password button  
**API:** `POST /api/admin/reset-password`  
**Payload:**
```json
{
  "role": "student",
  "username": "UID123",
  "new_password": "newpass123"
}
```
**Validation:** Min 8 chars, cannot be same as current password.

---

### Student Allocation to Faculty Mentors

This is the core mentoring assignment feature. Each faculty can mentor up to **20 students**.

#### How Allocation Works

**Step 1 — Open Allocation Tab**  
Admin navigates to "Student Allocation". The table shows all faculty with current assigned count vs max (20).

**Step 2 — Select Faculty**  
Admin clicks "Allocate" next to a faculty member. The allocation interface opens.

**Step 3 — Generate Suggestions (Random Allocation Formula)**  
Admin clicks "Random Allocation". This calls:  
`POST /api/admin/faculty/<faculty_id>/mentees/generate`

**The allocation algorithm:**
```python
# 1. Find all faculties that currently have NO mentees
faculties_without_mentees = Faculty.query.filter(~Faculty.mentees.any()).all()
n = len(faculties_without_mentees)

# 2. For each unique (semester, section) combination of unassigned students:
for semester, section in distinct_unassigned_groups:
    unassigned_students = Student.query.filter_by(
        semester=semester, section=section, mentor_id=None
    ).all()
    m = len(unassigned_students)

    # 3. Calculate how many each faculty gets: floor(m / n)
    k = m // n
    if k == 0:
        continue  # skip if not enough students

    # 4. Randomly shuffle and pick k students
    random.shuffle(unassigned_students)
    selected_students = unassigned_students[:k]
```

**Key formula:** `k = floor(total_unassigned_in_group / total_faculties_without_mentees)`

This ensures:
- Equal distribution across faculty
- Students are grouped by semester + section (same cohort stays together)
- Only unassigned students are considered
- Randomness within the group

**Step 4 — Review Suggestions**  
The UI displays the suggested students. Admin can review before confirming.

**Step 5 — Confirm Allocation**  
Admin clicks "Confirm Allocation". This calls:  
`POST /api/admin/faculty/<faculty_id>/mentees/confirm`  
**Payload:** `{ "student_ids": [1, 2, 3, ...] }`  
Sets `mentor_id = faculty_id` on each student record.

#### Manual Allocation
Admin can also directly update a student's mentor:  
`PUT /api/students/<student_id>` with `{ "mentor_id": <faculty_id> }`  
Set `mentor_id: null` to unassign.

#### Remove Allocation
**UI:** Allocation tab → Remove button  
**API:** `POST /api/admin/faculty/<faculty_id>/mentees/remove`  
**Payload:** `{ "student_ids": ["UID1", "UID2"] }`  
Sets `mentor_id = null` for specified students.

#### View Faculty Mentees
**API:** `GET /api/admin/faculty/<faculty_id>/mentees`  
Returns list of all students assigned to that faculty.

---

### Statistics Dashboard

**API:** `GET /api/admin/statistics`  
Returns:
```json
{
  "totalUsers": 45,
  "totalStudents": 30,
  "totalTeachers": 15,
  "activeUsers": 45
}
```
Displayed in the 4 stat cards at the top of the dashboard.

---

### Student Search & Filtering

**API:** `GET /api/students` (accessible by admin and faculty)  
**Query params:** `semester`, `section`, `year_of_admission`, `uid`, `name`  
Returns full student profiles including all nested records.

**Frontend filters (Students List tab):**
- Search by name or UID
- Domain of interest
- Year of admission
- Section
- Soft skills rating
- Career goal

---

### Student Profile View (Full Detail Modal)

Admin can click "View" on any student to open a full detail modal showing:
- Personal info (DOB, gender, contact, address, parents, guardian)
- Academic records (SSC, HSSC, Diploma, semester-wise SGPA)
- Projects (mini, major, UBA)
- Internships (up to 2 shown, all stored)
- Co-curricular participations and organizations
- Career development activities (aptitude, GD, PI, psychometric, higher exams)
- SWOC analysis
- Career objectives and skills
- Assigned mentor name

The modal also supports **Print** and **Download as PDF** (via html2pdf.js).

---

### Reports & Analytics

All report data is fetched from `GET /api/students` with optional filters.

#### Metrics Cards
- Total students
- Average SGPA (across all students)
- Students with backlogs
- Active semesters (distinct semester values)

#### Top 10 Toppers (Semester-wise)
Filters students by selected semester, finds their SGPA for that semester from `post_admission_records`, sorts descending, takes top 10. Displayed as table + bar chart (Chart.js).

**SGPA lookup logic:**
```js
// Find record where record.semester + 1 === selected_semester
const record = post_admission_records.find(rec => rec.semester + 1 === semester);
```

#### Semester Distribution
Groups all students by `student.semester`, counts per group. Displayed as table + pie chart.

#### Backlog Students
Students where any `post_admission_records` entry has a non-empty `backlog_subjects` field (not 'N/A', 'None').

#### Incomplete Profile Report
Checks each student for missing required fields:
- Full name, DOB, gender, mobile, personal email, college email, permanent address
- Father/mother name, mobile, occupation
- SWOC (strengths, weaknesses, opportunities, challenges)
- Career goal, clarity & preparedness, domains of interest
- Campus placement interest (and reasons if `false`)

Filterable by year of admission. Exportable to Excel.

#### General Report Table
Full student list with SGPA, backlogs, domain, career goal. Filterable by semester, SGPA range, backlog count, name/UID search. Paginated (20 per page).

#### Export Options
- **Export Filtered Students** — PDF of currently filtered students
- **Export All (Batched)** — Processes all students in batches of 10, generates one PDF per batch
- **Export Backlog Report** — PDF of students with backlogs
- **Export Incomplete Profiles** — Excel file

---

## Faculty Operations (for reference)

Faculty have a separate panel (`Teacher/t.html`) and can:
- View their own profile (`GET /faculty/me`)
- Update their profile (`PUT /faculty/me`)
- View their assigned mentees (`GET /faculty/me/mentees`) — full profiles
- Add mentoring minutes for a mentee (`POST /faculty/me/mentees/<uid>/minutes`)
- View mentoring minutes for a mentee (`GET /faculty/me/mentees/<uid>/minutes`)

---

## Student Operations (for reference)

Students have their own panel (`Student/`) and can:
- View their full profile (`GET /student/me` or `GET /students/me`)
- Update their profile (`PUT /student/me` or `PUT /students/me`)
- Upload profile photo (`POST /student/me/upload-photo`) — stored on Cloudinary
- View their assigned mentor (`GET /students/me/mentor`)
- View their mentoring minutes (`GET /students/me/mentoring-minutes`)

---

## Complete API Endpoint Reference

### Auth
| Method | Endpoint                        | Role      | Description                  |
|--------|---------------------------------|-----------|------------------------------|
| POST   | /api/auth/login                 | Public    | Login, returns JWT           |
| GET    | /api/auth/verify                | Any       | Verify token validity        |
| GET    | /api/auth/verify-token          | Any       | Alias for verify             |
| POST   | /api/auth/register              | Admin     | Register single user         |
| POST   | /api/auth/register/bulk         | Admin     | Bulk register students       |
| POST   | /api/auth/register/faculty/bulk | Admin     | Bulk register faculty        |
| POST   | /api/auth/change-password       | Any       | Change own password          |
| POST   | /api/auth/logout                | Any       | Blacklist token              |

### Admin
| Method | Endpoint                                        | Description                        |
|--------|-------------------------------------------------|------------------------------------|
| GET    | /api/admin/statistics                           | Dashboard stats                    |
| GET    | /api/admin/users                                | List all users                     |
| POST   | /api/admin/users                                | Create user (any role)             |
| PUT    | /api/admin/users/<id>                           | Update user                        |
| DELETE | /api/admin/users/<id>                           | Delete user (cascades)             |
| POST   | /api/admin/reset-password                       | Reset any user's password          |
| GET    | /api/admin/faculty                              | List faculty with mentee counts    |
| GET    | /api/admin/faculty/basic                        | List faculty (basic info only)     |
| GET    | /api/admin/faculty/<id>/mentees                 | Get faculty's mentees              |
| POST   | /api/admin/faculty/<id>/mentees/generate        | Generate random allocation         |
| POST   | /api/admin/faculty/<id>/mentees/confirm         | Confirm allocation                 |
| POST   | /api/admin/faculty/<id>/mentees/remove          | Remove mentee assignments          |
| DELETE | /api/admin/student/<uid>                        | Delete student by UID              |
| DELETE | /api/admin/faculty/<id>                         | Delete faculty by ID               |

### Students (Admin/Faculty access)
| Method | Endpoint                  | Role           | Description                  |
|--------|---------------------------|----------------|------------------------------|
| GET    | /api/students             | Admin, Faculty | Search/list students         |
| PUT    | /api/students/<id>        | Admin          | Update student (incl mentor) |

### Student (Self)
| Method | Endpoint                          | Description              |
|--------|-----------------------------------|--------------------------|
| GET    | /students/me                      | Get own profile          |
| PUT    | /students/me                      | Update own profile       |
| GET    | /student/me                       | Get own full profile     |
| PUT    | /student/me                       | Update own full profile  |
| POST   | /student/me/upload-photo          | Upload profile photo     |
| GET    | /students/me/mentor               | Get assigned mentor      |
| GET    | /students/me/mentoring-minutes    | Get own mentoring minutes|

### Faculty (Self)
| Method | Endpoint                                      | Description                  |
|--------|-----------------------------------------------|------------------------------|
| GET    | /faculty/me                                   | Get own profile              |
| PUT    | /faculty/me                                   | Update own profile           |
| GET    | /faculty/me/mentees                           | Get assigned mentees         |
| POST   | /faculty/me/mentees/<uid>/minutes             | Add mentoring minute         |
| GET    | /faculty/me/mentees/<uid>/minutes             | Get mentee's minutes         |

---

## Environment Variables

| Variable              | Required | Description                              |
|-----------------------|----------|------------------------------------------|
| DATABASE_URL          | Yes      | PostgreSQL connection string             |
| SECRET_KEY            | Yes      | Flask secret key                         |
| JWT_SECRET_KEY        | Yes      | JWT signing key                          |
| ALLOWED_ORIGINS       | No       | Comma-separated CORS origins             |
| ALLOWED_ORIGIN        | No       | Legacy single origin (backward compat)   |
| ALLOW_LOCAL_DEV_ORIGINS | No     | Allow localhost (default: true)          |
| FORCE_HTTPS           | No       | Enforce HTTPS via Talisman (default: false) |
| CLOUDINARY_CLOUD_NAME | No       | Cloudinary for photo uploads             |
| CLOUDINARY_API_KEY    | No       | Cloudinary API key                       |
| CLOUDINARY_API_SECRET | No       | Cloudinary API secret                    |
| DB_POOL_SIZE          | No       | SQLAlchemy pool size (default: 5)        |
| DB_MAX_OVERFLOW       | No       | SQLAlchemy max overflow (default: 2)     |
| LOG_LEVEL             | No       | Logging level (default: INFO)            |
| PORT                  | No       | Server port (default: 5002)              |
| FLASK_DEBUG           | No       | Debug mode (default: false)              |

---

## Known Limitations & Notes

1. **JWT blacklist is in-memory** — logged-out tokens become valid again after server restart. Production should use Redis.
2. **Max 20 students per faculty** — hardcoded in frontend UI, not enforced by backend.
3. **Allocation formula only runs for faculties with zero mentees** — if a faculty already has some mentees, they are excluded from the `n` count in the formula.
4. **Student initial password = UID** — students must change it on first login.
5. **Faculty email domain** — hardcoded to `@stvincentngp.edu.in`.
6. **Photo upload** — requires Cloudinary credentials; max 2MB, images only.
7. **Bulk upload** — frontend reads CSV/XLSX but the actual parsing logic is handled client-side before calling the bulk API.
