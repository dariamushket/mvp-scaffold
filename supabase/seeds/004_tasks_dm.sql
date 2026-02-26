-- Seed: Tasks dummy data for dm@rhein-west.de
-- Run AFTER 004_tasks.sql migration.
-- Re-runnable: deletes existing task data for this lead first.
--
-- IMPORTANT: also corrects profiles.company_id to use leads.id
-- (consistent with the invite-route fix: "use leads.id as profile company_id").

DO $$
DECLARE
  v_lead_id  UUID;
  v_user_id  UUID;
  v_tag_s    UUID;   -- Strategie tag
  v_tag_f    UUID;   -- Führung tag
  v_t1       UUID;   -- task 1
  v_t2       UUID;   -- task 2
  v_t3       UUID;   -- task 3
  v_t4       UUID;   -- task 4
BEGIN

  -- ── 1. Resolve lead ──────────────────────────────────────────────────────
  SELECT id INTO v_lead_id
  FROM leads WHERE email = 'dm@rhein-west.de';

  IF v_lead_id IS NULL THEN
    RAISE EXCEPTION 'Lead dm@rhein-west.de not found — run dm_rhein_west_dummy.sql first.';
  END IF;

  -- ── 2. Fix profile: company_id must equal leads.id (not leads.company_id)
  --    The existing seed stored leads.company_id; sessions + tasks RLS both
  --    compare against leads.id, so we correct it here.
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'dm@rhein-west.de';

  IF v_user_id IS NOT NULL THEN
    UPDATE profiles
    SET    company_id = v_lead_id
    WHERE  id = v_user_id
      AND  company_id IS DISTINCT FROM v_lead_id;

    RAISE NOTICE 'profile.company_id → % (leads.id)', v_lead_id;
  ELSE
    RAISE NOTICE 'No auth user for dm@rhein-west.de — skipping profile update.';
  END IF;

  -- ── 3. Clean slate for this lead's tasks ────────────────────────────────
  DELETE FROM tasks WHERE company_id = v_lead_id;

  -- ── 4. Tags (idempotent: skip if name already exists) ───────────────────
  IF NOT EXISTS (SELECT 1 FROM task_tags WHERE name = 'Strategie') THEN
    INSERT INTO task_tags (name, color) VALUES ('Strategie', '#2d8a8a')
    RETURNING id INTO v_tag_s;
  ELSE
    SELECT id INTO v_tag_s FROM task_tags WHERE name = 'Strategie';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM task_tags WHERE name = 'Führung') THEN
    INSERT INTO task_tags (name, color) VALUES ('Führung', '#7c3aed')
    RETURNING id INTO v_tag_f;
  ELSE
    SELECT id INTO v_tag_f FROM task_tags WHERE name = 'Führung';
  END IF;

  -- ── 5. Tasks ─────────────────────────────────────────────────────────────

  -- Task 1 — not_started, deadline in 14 days
  INSERT INTO tasks (company_id, title, description, status, tag_id, deadline, position)
  VALUES (
    v_lead_id,
    'Führungsleitbild definieren',
    'Erarbeiten Sie ein klares Leitbild für die Führungskultur bei Rhein-West. '
    'Fokus: Werte, Verhalten und Entscheidungsprinzipien.',
    'not_started', v_tag_f, CURRENT_DATE + 14, 0
  ) RETURNING id INTO v_t1;

  -- Task 2 — in_progress, deadline in 5 days
  INSERT INTO tasks (company_id, title, description, status, tag_id, deadline, position)
  VALUES (
    v_lead_id,
    'Talentgespräche planen',
    'Vereinbaren Sie strukturierte 1:1-Gespräche mit den Top-10-Talenten. '
    'Ziel: Bindung stärken, Entwicklungswünsche erfassen.',
    'in_progress', v_tag_f, CURRENT_DATE + 5, 0
  ) RETURNING id INTO v_t2;

  -- Task 3 — in_progress, deadline OVERDUE (-2 days)
  INSERT INTO tasks (company_id, title, description, status, tag_id, deadline, position)
  VALUES (
    v_lead_id,
    'OKR-Workshop vorbereiten',
    'Bereiten Sie den Quartals-OKR-Workshop vor. Agenda, Unterlagen und '
    'Einladungen müssen vor dem Termin versendet sein.',
    'in_progress', v_tag_s, CURRENT_DATE - 2, 1
  ) RETURNING id INTO v_t3;

  -- Task 4 — done, deadline in the past
  INSERT INTO tasks (company_id, title, description, status, tag_id, deadline, position)
  VALUES (
    v_lead_id,
    'Strategiedokument lesen',
    'Lesen und annotieren Sie die Strategieempfehlungen aus dem PSEI-Assessment. '
    'Schlüsselbefunde für das Führungsteam zusammenfassen.',
    'done', v_tag_s, CURRENT_DATE - 10, 2
  ) RETURNING id INTO v_t4;

  -- ── 6. Subtasks ──────────────────────────────────────────────────────────

  -- Task 1 subtasks (all open)
  INSERT INTO subtasks (task_id, title, is_done, deadline, position) VALUES
    (v_t1, 'Stakeholder-Interviews durchführen',  false, CURRENT_DATE + 4,  0),
    (v_t1, 'Entwurf Leitbild erstellen',          false, CURRENT_DATE + 9,  1),
    (v_t1, 'Feedback vom Führungsteam einholen',  false, CURRENT_DATE + 12, 2);

  -- Task 2 subtasks (1 done, 2 open)
  INSERT INTO subtasks (task_id, title, is_done, deadline, position) VALUES
    (v_t2, 'Liste der Top-Talente zusammenstellen', true,  CURRENT_DATE - 3, 0),
    (v_t2, 'Termine koordinieren',                  false, CURRENT_DATE + 2, 1),
    (v_t2, 'Gesprächsleitfaden vorbereiten',         false, CURRENT_DATE + 4, 2);

  -- Task 3 subtasks (2 done, 1 overdue-open)
  INSERT INTO subtasks (task_id, title, is_done, deadline, position) VALUES
    (v_t3, 'Agenda erstellen',        true,  CURRENT_DATE - 8, 0),
    (v_t3, 'Teilnehmer einladen',     true,  CURRENT_DATE - 5, 1),
    (v_t3, 'Präsentation vorbereiten', false, CURRENT_DATE - 1, 2);

  -- Task 4 subtasks (all done)
  INSERT INTO subtasks (task_id, title, is_done, position) VALUES
    (v_t4, 'Kapitel 1: Marktanalyse lesen',      true, 0),
    (v_t4, 'Kapitel 2: Wettbewerbsanalyse lesen', true, 1),
    (v_t4, 'Kapitel 3: Empfehlungen annotieren',  true, 2);

  -- ── 7. Attachments ───────────────────────────────────────────────────────
  INSERT INTO task_attachments (task_id, label, url, type) VALUES
    (v_t1, 'Vorlage: Führungsleitbild',   'https://example.com/fuehrungs-leitbild-vorlage.pdf', 'link'),
    (v_t2, 'Gesprächsleitfaden Talente',  'https://example.com/talent-gespraech.pdf',           'link'),
    (v_t3, 'OKR-Framework Kurzübersicht', 'https://example.com/okr-framework.pdf',              'link'),
    (v_t4, 'PSEI Assessment-Bericht',     'https://example.com/psei-report.pdf',                'link');

  -- ── 8. One task template (bonus) ────────────────────────────────────────
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

  RAISE NOTICE '✓ Tasks seed complete — lead_id: %, tags: % / %, tasks: 4', v_lead_id, v_tag_s, v_tag_f;

END $$;
