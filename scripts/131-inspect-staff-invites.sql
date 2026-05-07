-- Surface staff_invitations rows so we can confirm whether the
-- "pending" group the user is asking about is actually populated.
SELECT id, email, role, invited_by, expires_at, used_at, created_at
FROM staff_invitations
ORDER BY created_at DESC
LIMIT 50;
