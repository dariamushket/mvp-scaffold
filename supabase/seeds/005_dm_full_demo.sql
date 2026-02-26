-- Full demo seed for dm@rhein-west.de
-- Covers: lead data, sessions (3 states), materials (3 types), tasks + subtasks + tags.
-- Safe to re-run — deletes and recreates per-lead data fresh each time.
-- Run in Supabase SQL Editor AFTER all 4 migrations.

DO $$
DECLARE
  v_lead_id   UUID;
  v_user_id   UUID;
  v_admin_id  UUID;

  -- sessions
  v_s1  UUID;   -- completed
  v_s2  UUID;   -- booked (upcoming)
  v_s3  UUID;   -- booking_open

  -- task tags
  v_tag_s  UUID;   -- Strategie
  v_tag_f  UUID;   -- Führung

  -- tasks
  v_t1  UUID;
  v_t2  UUID;
  v_t3  UUID;
  v_t4  UUID;

BEGIN

  -- ── 1. Resolve IDs ───────────────────────────────────────────────────────
  SELECT id INTO v_lead_id  FROM leads       WHERE email = 'dm@rhein-west.de';
  SELECT id INTO v_user_id  FROM auth.users  WHERE email = 'dm@rhein-west.de';
  SELECT id INTO v_admin_id FROM auth.users  WHERE id IN (
    SELECT id FROM profiles WHERE role = 'admin' LIMIT 1
  ) LIMIT 1;

  IF v_lead_id IS NULL THEN
    RAISE EXCEPTION 'Lead dm@rhein-west.de not found — run dm_rhein_west_dummy.sql first.';
  END IF;

  -- ── 2. Fix profile.company_id = leads.id (required for all RLS) ──────────
  IF v_user_id IS NOT NULL THEN
    UPDATE profiles
    SET    company_id = v_lead_id
    WHERE  id = v_user_id
      AND  company_id IS DISTINCT FROM v_lead_id;
    RAISE NOTICE 'profile.company_id → % (leads.id)', v_lead_id;
  END IF;

  -- ── 3. Refresh lead scores (ensure display data is rich) ─────────────────
  UPDATE leads SET
    total_score           = 62,
    max_score             = 100,
    typology_id           = 'operational-reactive',
    typology_name         = 'Operativ Reaktiv',
    bottleneck_dimension  = 'Führung & Kultur',
    bottleneck_score      = 9,
    dimension_scores      = '[
      {"name": "Strategie & Vision",      "score": 14, "maxScore": 20, "percentage": 70},
      {"name": "Führung & Kultur",        "score": 9,  "maxScore": 20, "percentage": 45},
      {"name": "Prozesse & Strukturen",   "score": 13, "maxScore": 20, "percentage": 65},
      {"name": "People & Entwicklung",    "score": 11, "maxScore": 20, "percentage": 55},
      {"name": "Execution & Performance", "score": 15, "maxScore": 20, "percentage": 75}
    ]'::jsonb,
    diagnostic_status       = 'completed',
    diagnostic_completed_at = now() - interval '7 days'
  WHERE id = v_lead_id;

  -- ── 4. Sessions ──────────────────────────────────────────────────────────
  DELETE FROM sessions WHERE lead_id = v_lead_id;

  -- Session 1: completed — past, has recording
  INSERT INTO sessions (
    lead_id, created_by_admin_id, title, description,
    calendly_url, status,
    booked_start_at, booked_end_at,
    location, meeting_url, recording_url,
    show_on_dashboard
  ) VALUES (
    v_lead_id, v_admin_id,
    'Kick-off: PSEI-Ergebnisse besprechen',
    'Erste Strategiesession: Auswertung des PSEI-Assessments, Identifikation der Haupthebel.',
    'https://calendly.com/tcinar/psei',
    'completed',
    now() - interval '21 days',
    now() - interval '21 days' + interval '60 minutes',
    'Online (Zoom)',
    NULL,
    'https://example.com/recording/kickoff-psei',
    true
  ) RETURNING id INTO v_s1;

  -- Session 2: booked — upcoming next week
  INSERT INTO sessions (
    lead_id, created_by_admin_id, title, description,
    calendly_url, status,
    booked_start_at, booked_end_at,
    location, meeting_url, recording_url,
    show_on_dashboard
  ) VALUES (
    v_lead_id, v_admin_id,
    'Führungskräfte-Entwicklungsplan',
    'Deep-dive in die Dimension "Führung & Kultur": Maßnahmenplan und Quick-Wins erarbeiten.',
    'https://calendly.com/tcinar/psei',
    'booked',
    date_trunc('week', now()) + interval '8 days' + interval '10 hours',
    date_trunc('week', now()) + interval '8 days' + interval '11 hours 30 minutes',
    'Online (Teams)',
    'https://teams.microsoft.com/l/meetup-join/example',
    NULL,
    true
  ) RETURNING id INTO v_s2;

  -- Session 3: booking_open — ready to schedule
  INSERT INTO sessions (
    lead_id, created_by_admin_id, title, description,
    calendly_url, status,
    show_on_dashboard
  ) VALUES (
    v_lead_id, v_admin_id,
    'Strategie-Review & OKR-Planung',
    'Quartalsbesprechung: OKR-Fortschritt, Strategieanpassungen und nächste Meilensteine.',
    'https://calendly.com/tcinar/psei',
    'booking_open',
    true
  ) RETURNING id INTO v_s3;

  RAISE NOTICE 'Sessions: completed=%, booked=%, booking_open=%', v_s1, v_s2, v_s3;

  -- ── 5. Materials ─────────────────────────────────────────────────────────
  -- Delete existing materials for this lead (by company_id = leads.id)
  DELETE FROM materials WHERE company_id = v_lead_id;

  IF v_admin_id IS NOT NULL THEN
    INSERT INTO materials (title, description, file_name, mime_type, size_bytes, storage_path, company_id, uploaded_by, is_published)
    VALUES
      (
        'PSEI Assessment-Bericht',
        'Vollständige Auswertung Ihres People Strategy & Execution Index mit Handlungsempfehlungen.',
        'psei-assessment-bericht.pdf',
        'application/pdf',
        2457600,
        v_lead_id || '/psei-assessment-bericht.pdf',
        v_lead_id,
        v_admin_id,
        true
      ),
      (
        'Führungsleitfaden: Operativ Reaktiv',
        'Praxisleitfaden für Ihr Typologieprofil — konkrete Maßnahmen für schnelle Wirkung.',
        'fuehrungs-leitfaden-operativ-reaktiv.pdf',
        'application/pdf',
        1843200,
        v_lead_id || '/fuehrungs-leitfaden-operativ-reaktiv.pdf',
        v_lead_id,
        v_admin_id,
        true
      ),
      (
        'OKR-Framework Vorlage',
        'Excel-Vorlage für die Quarterly OKR-Planung inkl. Tracking-Dashboard.',
        'okr-framework-vorlage.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        512000,
        v_lead_id || '/okr-framework-vorlage.xlsx',
        v_lead_id,
        v_admin_id,
        true
      ),
      (
        'Session Recording: Kick-off',
        'Aufzeichnung der ersten Strategiesession (Kick-off PSEI-Auswertung).',
        'session-recording-kickoff.mp4',
        'video/mp4',
        157286400,
        v_lead_id || '/session-recording-kickoff.mp4',
        v_lead_id,
        v_admin_id,
        true
      );
    RAISE NOTICE '4 materials inserted for company_id=%', v_lead_id;
  ELSE
    RAISE NOTICE 'No admin user found — skipping materials. Create an admin user first.';
  END IF;

  -- ── 6. Task tags (idempotent) ─────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM task_tags WHERE name = 'Strategie') THEN
    INSERT INTO task_tags (name, color) VALUES ('Strategie', '#2d8a8a') RETURNING id INTO v_tag_s;
  ELSE
    SELECT id INTO v_tag_s FROM task_tags WHERE name = 'Strategie';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM task_tags WHERE name = 'Führung') THEN
    INSERT INTO task_tags (name, color) VALUES ('Führung', '#7c3aed') RETURNING id INTO v_tag_f;
  ELSE
    SELECT id INTO v_tag_f FROM task_tags WHERE name = 'Führung';
  END IF;

  -- ── 7. Tasks (clean slate) ────────────────────────────────────────────────
  DELETE FROM tasks WHERE company_id = v_lead_id;

  INSERT INTO tasks (company_id, title, description, status, tag_id, deadline, position)
  VALUES (
    v_lead_id,
    'Führungsleitbild definieren',
    'Erarbeiten Sie ein klares Leitbild für die Führungskultur bei Rhein-West. '
    'Fokus: Werte, Verhalten und Entscheidungsprinzipien.',
    'not_started', v_tag_f, CURRENT_DATE + 14, 0
  ) RETURNING id INTO v_t1;

  INSERT INTO tasks (company_id, title, description, status, tag_id, deadline, position)
  VALUES (
    v_lead_id,
    'Talentgespräche planen',
    'Vereinbaren Sie strukturierte 1:1-Gespräche mit den Top-10-Talenten. '
    'Ziel: Bindung stärken, Entwicklungswünsche erfassen.',
    'in_progress', v_tag_f, CURRENT_DATE + 5, 0
  ) RETURNING id INTO v_t2;

  INSERT INTO tasks (company_id, title, description, status, tag_id, deadline, position)
  VALUES (
    v_lead_id,
    'OKR-Workshop vorbereiten',
    'Bereiten Sie den Quartals-OKR-Workshop vor. Agenda, Unterlagen und '
    'Einladungen müssen vor dem Termin versendet sein.',
    'in_progress', v_tag_s, CURRENT_DATE - 2, 1
  ) RETURNING id INTO v_t3;

  INSERT INTO tasks (company_id, title, description, status, tag_id, deadline, position)
  VALUES (
    v_lead_id,
    'Strategiedokument lesen',
    'Lesen und annotieren Sie die Strategieempfehlungen aus dem PSEI-Assessment. '
    'Schlüsselbefunde für das Führungsteam zusammenfassen.',
    'done', v_tag_s, CURRENT_DATE - 10, 2
  ) RETURNING id INTO v_t4;

  -- ── 8. Subtasks ───────────────────────────────────────────────────────────
  INSERT INTO subtasks (task_id, title, is_done, deadline, position) VALUES
    (v_t1, 'Stakeholder-Interviews durchführen',  false, CURRENT_DATE + 4,  0),
    (v_t1, 'Entwurf Leitbild erstellen',          false, CURRENT_DATE + 9,  1),
    (v_t1, 'Feedback vom Führungsteam einholen',  false, CURRENT_DATE + 12, 2);

  INSERT INTO subtasks (task_id, title, is_done, deadline, position) VALUES
    (v_t2, 'Liste der Top-Talente zusammenstellen', true,  CURRENT_DATE - 3, 0),
    (v_t2, 'Termine koordinieren',                  false, CURRENT_DATE + 2, 1),
    (v_t2, 'Gesprächsleitfaden vorbereiten',         false, CURRENT_DATE + 4, 2);

  INSERT INTO subtasks (task_id, title, is_done, deadline, position) VALUES
    (v_t3, 'Agenda erstellen',         true,  CURRENT_DATE - 8, 0),
    (v_t3, 'Teilnehmer einladen',      true,  CURRENT_DATE - 5, 1),
    (v_t3, 'Präsentation vorbereiten', false, CURRENT_DATE - 1, 2);

  INSERT INTO subtasks (task_id, title, is_done, position) VALUES
    (v_t4, 'Kapitel 1: Marktanalyse lesen',       true, 0),
    (v_t4, 'Kapitel 2: Wettbewerbsanalyse lesen', true, 1),
    (v_t4, 'Kapitel 3: Empfehlungen annotieren',  true, 2);

  -- ── 9. Task attachments ───────────────────────────────────────────────────
  INSERT INTO task_attachments (task_id, label, url, type) VALUES
    (v_t1, 'Vorlage: Führungsleitbild',   'https://example.com/fuehrungs-leitbild-vorlage.pdf', 'link'),
    (v_t2, 'Gesprächsleitfaden Talente',  'https://example.com/talent-gespraech.pdf',           'link'),
    (v_t3, 'OKR-Framework Kurzübersicht', 'https://example.com/okr-framework.pdf',              'link'),
    (v_t4, 'PSEI Assessment-Bericht',     'https://example.com/psei-report.pdf',                'link');

  -- ── 10. Task template (bonus) ─────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM task_templates WHERE name = 'Onboarding Führungskraft') THEN
    INSERT INTO task_templates (name, description, tag_id, payload)
    VALUES (
      'Onboarding Führungskraft',
      'Standard-Aufgabenpaket für neue Führungskräfte im PSEI-Programm.',
      v_tag_f,
      '[
        {
          "title": "Erstes Führungsgespräch vereinbaren",
          "description": "30-min Kick-off mit dem Coach buchen.",
          "deadline_offset_days": 3,
          "subtasks": [
            { "title": "Verfügbarkeiten abstimmen", "deadline_offset_days": 1 },
            { "title": "Agenda vorbereiten",        "deadline_offset_days": 2 }
          ]
        },
        {
          "title": "Selbsteinschätzung ausfüllen",
          "description": "PSEI-Selbsteinschätzungsbogen ausfüllen und einreichen.",
          "deadline_offset_days": 7,
          "attachments": [
            { "label": "Selbsteinschätzungsbogen", "url": "https://example.com/selbst.pdf", "type": "link" }
          ]
        },
        {
          "title": "Führungsleitbild definieren",
          "description": "Persönliches Leitbild für die eigene Führungsarbeit erarbeiten.",
          "deadline_offset_days": 14
        }
      ]'::jsonb
    );
  END IF;

  RAISE NOTICE '✓ Full demo seed complete for lead_id: %', v_lead_id;
  RAISE NOTICE '  Sessions: completed=%, booked=%, booking_open=%', v_s1, v_s2, v_s3;
  RAISE NOTICE '  Tasks: %, %, %, %', v_t1, v_t2, v_t3, v_t4;

END $$;
