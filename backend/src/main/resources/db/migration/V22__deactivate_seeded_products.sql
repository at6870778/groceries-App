-- Deactivate demo/seeded products added by Flyway migrations V2 and V10.
-- These were test data; only products added by the admin should appear in the app.
-- Using soft-delete (is_active = FALSE) to preserve order history integrity.
UPDATE products
SET is_active = FALSE
WHERE sku IN (
  -- From V2__seed_data_and_refresh_tokens.sql
  'SKU-BANANA-1',
  'SKU-TOMATO-1',
  'SKU-MILK-1',
  'SKU-BREAD-1',
  'SKU-CHIPS-1',
  'SKU-JUICE-1',
  'SKU-DAAL-1',
  'SKU-CHINI-1',
  'SKU-ATTA-1',
  'SKU-RICE-1',
  'SKU-JEERA-1',
  'SKU-SURF-1',
  'SKU-DISHWASH-1',
  'SKU-AGARBATTI-1',
  -- From V10__add_snack_items.sql
  'SKU-CHAAT-1',
  'SKU-SAMOSA-1',
  'SKU-CHAI-1',
  'SKU-DHOKLA-1',
  'SKU-POHA-1'
);
