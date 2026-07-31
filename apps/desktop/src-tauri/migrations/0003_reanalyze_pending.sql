UPDATE jobs
SET status = 'needs_reanalysis',
    error_detail = 'Reevaluación por reglas de nombres v2',
    updated_at = CURRENT_TIMESTAMP
WHERE id IN (
  SELECT job_id FROM suggestions WHERE status = 'suggested'
);
