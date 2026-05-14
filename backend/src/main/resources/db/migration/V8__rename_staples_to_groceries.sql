-- Rename 'Staples & Pulses' category to 'Groceries' and update its slug.
-- All products already under this category stay linked via the same category_id.
UPDATE categories
SET name = 'Groceries',
    slug = 'groceries'
WHERE slug = 'staples-pulses';
