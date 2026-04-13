-- Add user_id and is_staff columns to ticket_responses table
ALTER TABLE ticket_responses 
ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);

ALTER TABLE ticket_responses 
ADD COLUMN IF NOT EXISTS is_staff BOOLEAN DEFAULT false;

ALTER TABLE ticket_responses 
ADD COLUMN IF NOT EXISTS staff_name VARCHAR(255);

-- Update existing records to use is_staff based on responder_type if it exists
UPDATE ticket_responses 
SET is_staff = (responder_type = 'staff' OR responder_type = 'admin')
WHERE is_staff IS NULL AND responder_type IS NOT NULL;

-- Make ticket_id reference the numeric id instead of string
-- First, add a new column for the numeric foreign key
ALTER TABLE ticket_responses 
ADD COLUMN IF NOT EXISTS ticket_id_num INTEGER;

-- Update the column with the correct ticket ids
UPDATE ticket_responses tr
SET ticket_id_num = st.id
FROM support_tickets st
WHERE tr.ticket_id = st.ticket_id AND tr.ticket_id_num IS NULL;

-- Create index on the new column
CREATE INDEX IF NOT EXISTS idx_responses_ticket_id_num ON ticket_responses(ticket_id_num);
