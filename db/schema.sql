-- CNC_LAB Database Schema (PostgreSQL)

CREATE TYPE user_role AS ENUM ('candidate', 'employer', 'admin');
CREATE TYPE assessment_type AS ENUM ('INITIAL', 'REASSESSMENT');
CREATE TYPE assessment_status AS ENUM ('IN_PROGRESS', 'GAPS_IDENTIFIED', 'READY_FOR_ROLE');
CREATE TYPE verification_status AS ENUM ('NOT_VERIFIED', 'VERIFIED', 'VERIFIED_POST_TRAINING');
CREATE TYPE shortlist_status AS ENUM ('CANNOT_SHORTLIST', 'SHORTLISTED');

-- Users: candidates, employers, and admins all authenticate through this table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role user_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Candidate profile, one-to-one with a user
CREATE TABLE candidates (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Employer / MSME profile, one-to-one with a user
CREATE TABLE employers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Job roles that candidates are assessed against, e.g. "CNC Operator (Turning)"
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT
);

-- Machining tasks assigned to candidates, e.g. TRN-01
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    material TEXT NOT NULL,
    start_dimension_mm NUMERIC(6,2) NOT NULL,
    target_dimension_mm NUMERIC(6,2) NOT NULL,
    tolerance_mm NUMERIC(5,3) NOT NULL DEFAULT 0.05,
    target_surface_finish_ra NUMERIC(5,2) NOT NULL DEFAULT 1.6,
    role_id INTEGER REFERENCES roles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One assessment = one candidate attempting one task (initial or reassessment)
CREATE TABLE assessments (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    task_id INTEGER NOT NULL REFERENCES tasks(id),
    type assessment_type NOT NULL DEFAULT 'INITIAL',
    score NUMERIC(5,2),
    status assessment_status NOT NULL DEFAULT 'IN_PROGRESS',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- The machining parameters + simulated outcome the candidate submitted for an assessment
CREATE TABLE assessment_attempts (
    id SERIAL PRIMARY KEY,
    assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    tool TEXT NOT NULL,
    spindle_speed_rpm INTEGER NOT NULL,
    feed_rate_mm_rev NUMERIC(4,2) NOT NULL,
    depth_of_cut_mm NUMERIC(4,2) NOT NULL,
    process_sequence JSONB NOT NULL,
    simulated_final_dimension_mm NUMERIC(6,3),
    simulated_surface_finish_ra NUMERIC(5,2),
    cycle_time_seconds INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Skill gaps identified from an assessment
CREATE TABLE skill_gaps (
    id SERIAL PRIMARY KEY,
    assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    gap_name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Targeted micro-learning modules
CREATE TABLE learning_modules (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    topic TEXT NOT NULL,
    focus_area TEXT NOT NULL,
    content_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Which candidates completed which learning modules
CREATE TABLE learning_completions (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    module_id INTEGER NOT NULL REFERENCES learning_modules(id),
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (candidate_id, module_id)
);

-- Per-capability verification status shown on the employer's practical skill audit
CREATE TABLE verification_records (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    area TEXT NOT NULL,
    status verification_status NOT NULL DEFAULT 'NOT_VERIFIED',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (candidate_id, area)
);

-- Employer shortlisting decisions
CREATE TABLE shortlists (
    id SERIAL PRIMARY KEY,
    employer_id INTEGER NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
    candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id),
    status shortlist_status NOT NULL DEFAULT 'CANNOT_SHORTLIST',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (employer_id, candidate_id)
);

-- Audit trail for security-sensitive and workflow-changing actions
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id INTEGER,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assessments_candidate ON assessments(candidate_id);
CREATE INDEX idx_attempts_assessment ON assessment_attempts(assessment_id);
CREATE INDEX idx_skill_gaps_assessment ON skill_gaps(assessment_id);
CREATE INDEX idx_verification_candidate ON verification_records(candidate_id);
CREATE INDEX idx_shortlists_employer ON shortlists(employer_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity, entity_id);
