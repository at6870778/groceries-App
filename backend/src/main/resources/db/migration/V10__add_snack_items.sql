-- Add snack food items under the snacks category
INSERT INTO products (category_id, name, sku, description, unit, mrp, selling_price, stock_qty, image_url, is_active)
VALUES
  ((SELECT id FROM categories WHERE slug='snacks'), 'Aloo Chaat',    'SKU-CHAAT-1',  'Tangy potato chaat with chutneys',    '1 plate', 40.00,  35.00,  80, NULL, TRUE),
  ((SELECT id FROM categories WHERE slug='snacks'), 'Samosa',        'SKU-SAMOSA-1', 'Crispy fried samosa with filling',    '2 pcs',   30.00,  25.00, 120, NULL, TRUE),
  ((SELECT id FROM categories WHERE slug='snacks'), 'Masala Chai',   'SKU-CHAI-1',   'Hot masala tea, freshly brewed',      '1 cup',   20.00,  18.00, 200, NULL, TRUE),
  ((SELECT id FROM categories WHERE slug='snacks'), 'Dhokla',        'SKU-DHOKLA-1', 'Soft steamed Gujarati dhokla',        '200 gm',  60.00,  50.00,  60, NULL, TRUE),
  ((SELECT id FROM categories WHERE slug='snacks'), 'Poha',          'SKU-POHA-1',   'Light flattened rice snack',          '1 plate', 35.00,  30.00,  90, NULL, TRUE);
