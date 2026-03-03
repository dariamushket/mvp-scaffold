-- Editable current dimension scores (admin-overrideable, shown on portal)
ALTER TABLE leads ADD COLUMN current_dimension_scores JSONB;
