-- Add GPS coordinates to restaurants
ALTER TABLE restaurants ADD COLUMN latitude  DOUBLE PRECISION;
ALTER TABLE restaurants ADD COLUMN longitude DOUBLE PRECISION;

-- Seed realistic coordinates around a sample city centre
-- Using Indore, India (22.7196° N, 75.8577° E) as the base
-- Each restaurant is placed 0.5–4 km away so they appear in a 5 km radius search
UPDATE restaurants SET latitude = 22.7250, longitude = 75.8640 WHERE name = 'Sharma Dhaba';        -- ~0.8 km N
UPDATE restaurants SET latitude = 22.7140, longitude = 75.8520 WHERE name = 'South Spice';         -- ~1.6 km SW
UPDATE restaurants SET latitude = 22.7300, longitude = 75.8700 WHERE name = 'Patel Chaat Corner';  -- ~1.5 km NE
UPDATE restaurants SET latitude = 22.7050, longitude = 75.8450 WHERE name = 'Chinese Dragon';      -- ~3.2 km S
UPDATE restaurants SET latitude = 22.7380, longitude = 75.8800 WHERE name = 'Pizza Point';         -- ~3.8 km NE
