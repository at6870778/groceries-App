-- Merge non-core categories into Groceries (keep fruits-vegetables and snacks separate).
-- Categories being merged: home-care, pooja-spiritual, spices-masala, dairy-bread, beverages

UPDATE products
SET category_id = (SELECT id FROM categories WHERE slug = 'groceries')
WHERE category_id IN (
    SELECT id FROM categories
    WHERE slug IN ('home-care', 'pooja-spiritual', 'spices-masala', 'dairy-bread', 'beverages')
);

DELETE FROM categories
WHERE slug IN ('home-care', 'pooja-spiritual', 'spices-masala', 'dairy-bread', 'beverages');
