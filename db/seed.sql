-- Seed data matching the CNC_LAB prototype's demonstration content

INSERT INTO roles (name, description) VALUES
    ('CNC Operator (Turning)', 'Operates CNC lathes to perform turning operations to specification');

INSERT INTO tasks (code, title, material, start_dimension_mm, target_dimension_mm, tolerance_mm, target_surface_finish_ra, role_id) VALUES
    ('TRN-01', 'Mild Steel Turning', 'Mild Steel', 55.00, 50.00, 0.05, 1.6,
        (SELECT id FROM roles WHERE name = 'CNC Operator (Turning)'));

INSERT INTO learning_modules (title, topic, focus_area, content_url) VALUES
    ('GD&T & Finishing', 'Surface Finish vs Feed Rate', 'GD&T Knowledge', NULL),
    ('Finishing Feed Rate Tolerance', 'Choosing feed rate for a finishing pass', 'Finishing Feed Rate Tolerance', NULL);

-- Demo users (candidate / employer / admin) are NOT inserted here.
-- Their passwords need to be bcrypt-hashed at seed time, so run:
--   npm run seed
-- which executes db/seed.js — it runs this file first, then inserts the demo
-- users, candidate profile, and employer profile with properly hashed passwords.
