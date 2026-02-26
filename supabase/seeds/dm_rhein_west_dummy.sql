-- Dummy data for dm@rhein-west.de
-- Run in Supabase SQL editor.
-- Safe to re-run (uses ON CONFLICT / upsert).

DO $$
DECLARE
  v_lead_id    UUID;
  v_company_id UUID;
  v_user_id    UUID;
BEGIN

  -- 1. Find the auth user
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'dm@rhein-west.de';

  -- 2. Upsert lead
  INSERT INTO leads (
    first_name, last_name, email, company, position,
    employee_count, annual_revenue,
    total_score, max_score,
    typology_id, typology_name,
    bottleneck_dimension, bottleneck_score,
    dimension_scores,
    diagnostic_status, diagnostic_completed_at
  )
  VALUES (
    'Daria', 'Mushket', 'dm@rhein-west.de', 'Rhein-West GmbH', 'Geschäftsführerin',
    '21-50', '1-5m',
    62, 100,
    'operational-reactive', 'Operativ Reaktiv',
    'Führung & Kultur', 9,
    '[
      {"name": "Strategie & Vision",      "score": 14, "maxScore": 20, "percentage": 70},
      {"name": "Führung & Kultur",        "score": 9,  "maxScore": 20, "percentage": 45},
      {"name": "Prozesse & Strukturen",   "score": 13, "maxScore": 20, "percentage": 65},
      {"name": "People & Entwicklung",    "score": 11, "maxScore": 20, "percentage": 55},
      {"name": "Execution & Performance", "score": 15, "maxScore": 20, "percentage": 75}
    ]'::jsonb,
    'completed', now() - interval '7 days'
  )
  ON CONFLICT (email) DO UPDATE SET
    first_name            = EXCLUDED.first_name,
    last_name             = EXCLUDED.last_name,
    company               = EXCLUDED.company,
    position              = EXCLUDED.position,
    employee_count        = EXCLUDED.employee_count,
    annual_revenue        = EXCLUDED.annual_revenue,
    total_score           = EXCLUDED.total_score,
    max_score             = EXCLUDED.max_score,
    typology_id           = EXCLUDED.typology_id,
    typology_name         = EXCLUDED.typology_name,
    bottleneck_dimension  = EXCLUDED.bottleneck_dimension,
    bottleneck_score      = EXCLUDED.bottleneck_score,
    dimension_scores      = EXCLUDED.dimension_scores,
    diagnostic_status     = EXCLUDED.diagnostic_status,
    diagnostic_completed_at = EXCLUDED.diagnostic_completed_at
  RETURNING id, company_id INTO v_lead_id, v_company_id;

  -- 3. Link profile to lead (if auth user exists)
  IF v_user_id IS NOT NULL THEN
    INSERT INTO profiles (id, role, company_id, has_password)
    VALUES (v_user_id, 'customer', v_company_id, true)
    ON CONFLICT (id) DO UPDATE SET
      company_id = EXCLUDED.company_id,
      role       = 'customer';
  END IF;

  RAISE NOTICE 'lead_id=%, company_id=%, user_id=%', v_lead_id, v_company_id, v_user_id;
END $$;
