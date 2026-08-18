BEGIN;

DO $$
DECLARE
  v_phones uuid;
  v_smart_watches uuid;
  v_gadgets uuid;
  v_iphone uuid;
  v_android uuid;
  v_audio uuid;
  v_power_charging uuid;
  v_mobile_accessories uuid;
BEGIN
  INSERT INTO "categories" ("id", "parent_id", "name", "slug", "sort_order", "updated_at")
  VALUES (gen_random_uuid(), NULL, 'Phones', 'phones', 1, CURRENT_TIMESTAMP)
  ON CONFLICT ("slug") DO UPDATE SET
    "name" = EXCLUDED."name",
    "parent_id" = EXCLUDED."parent_id",
    "sort_order" = EXCLUDED."sort_order",
    "updated_at" = CURRENT_TIMESTAMP
  RETURNING "id" INTO v_phones;

  INSERT INTO "categories" ("id", "parent_id", "name", "slug", "sort_order", "updated_at")
  VALUES (gen_random_uuid(), NULL, 'Smart Watches', 'smart-watches', 2, CURRENT_TIMESTAMP)
  ON CONFLICT ("slug") DO UPDATE SET
    "name" = EXCLUDED."name",
    "parent_id" = EXCLUDED."parent_id",
    "sort_order" = EXCLUDED."sort_order",
    "updated_at" = CURRENT_TIMESTAMP
  RETURNING "id" INTO v_smart_watches;

  INSERT INTO "categories" ("id", "parent_id", "name", "slug", "sort_order", "updated_at")
  VALUES (gen_random_uuid(), NULL, 'Gadgets', 'gadgets', 3, CURRENT_TIMESTAMP)
  ON CONFLICT ("slug") DO UPDATE SET
    "name" = EXCLUDED."name",
    "parent_id" = EXCLUDED."parent_id",
    "sort_order" = EXCLUDED."sort_order",
    "updated_at" = CURRENT_TIMESTAMP
  RETURNING "id" INTO v_gadgets;

  INSERT INTO "categories" ("id", "parent_id", "name", "slug", "sort_order", "updated_at")
  VALUES (gen_random_uuid(), v_phones, 'iPhone', 'iphone', 1, CURRENT_TIMESTAMP)
  ON CONFLICT ("slug") DO UPDATE SET
    "name" = EXCLUDED."name",
    "parent_id" = EXCLUDED."parent_id",
    "sort_order" = EXCLUDED."sort_order",
    "updated_at" = CURRENT_TIMESTAMP
  RETURNING "id" INTO v_iphone;

  INSERT INTO "categories" ("id", "parent_id", "name", "slug", "sort_order", "updated_at")
  VALUES (gen_random_uuid(), v_phones, 'Android Phones', 'android', 2, CURRENT_TIMESTAMP)
  ON CONFLICT ("slug") DO UPDATE SET
    "name" = EXCLUDED."name",
    "parent_id" = EXCLUDED."parent_id",
    "sort_order" = EXCLUDED."sort_order",
    "updated_at" = CURRENT_TIMESTAMP
  RETURNING "id" INTO v_android;

  INSERT INTO "categories" ("id", "parent_id", "name", "slug", "sort_order", "updated_at")
  VALUES (gen_random_uuid(), v_gadgets, 'Audio', 'audio', 1, CURRENT_TIMESTAMP)
  ON CONFLICT ("slug") DO UPDATE SET
    "name" = EXCLUDED."name",
    "parent_id" = EXCLUDED."parent_id",
    "sort_order" = EXCLUDED."sort_order",
    "updated_at" = CURRENT_TIMESTAMP
  RETURNING "id" INTO v_audio;

  INSERT INTO "categories" ("id", "parent_id", "name", "slug", "sort_order", "updated_at")
  VALUES (gen_random_uuid(), v_gadgets, 'Power & Charging', 'power-charging', 2, CURRENT_TIMESTAMP)
  ON CONFLICT ("slug") DO UPDATE SET
    "name" = EXCLUDED."name",
    "parent_id" = EXCLUDED."parent_id",
    "sort_order" = EXCLUDED."sort_order",
    "updated_at" = CURRENT_TIMESTAMP
  RETURNING "id" INTO v_power_charging;

  INSERT INTO "categories" ("id", "parent_id", "name", "slug", "sort_order", "updated_at")
  VALUES (gen_random_uuid(), v_gadgets, 'Mobile Accessories', 'mobile-accessories', 3, CURRENT_TIMESTAMP)
  ON CONFLICT ("slug") DO UPDATE SET
    "name" = EXCLUDED."name",
    "parent_id" = EXCLUDED."parent_id",
    "sort_order" = EXCLUDED."sort_order",
    "updated_at" = CURRENT_TIMESTAMP
  RETURNING "id" INTO v_mobile_accessories;

  INSERT INTO "categories" ("id", "parent_id", "name", "slug", "sort_order", "updated_at")
  VALUES
    (gen_random_uuid(), v_audio, 'Wireless Earbuds/TWS', 'wireless-earbuds', 1, CURRENT_TIMESTAMP),
    (gen_random_uuid(), v_audio, 'Headphones', 'headphones', 2, CURRENT_TIMESTAMP),
    (gen_random_uuid(), v_audio, 'Wired Earphones/Handsfree', 'wired-earphones', 3, CURRENT_TIMESTAMP),
    (gen_random_uuid(), v_audio, 'Neckbands', 'neckbands', 4, CURRENT_TIMESTAMP),
    (gen_random_uuid(), v_audio, 'Speakers', 'speakers', 5, CURRENT_TIMESTAMP)
  ON CONFLICT ("slug") DO UPDATE SET
    "name" = EXCLUDED."name",
    "parent_id" = EXCLUDED."parent_id",
    "sort_order" = EXCLUDED."sort_order",
    "updated_at" = CURRENT_TIMESTAMP;

  INSERT INTO "categories" ("id", "parent_id", "name", "slug", "sort_order", "updated_at")
  VALUES
    (gen_random_uuid(), v_power_charging, 'Chargers', 'chargers', 1, CURRENT_TIMESTAMP),
    (gen_random_uuid(), v_power_charging, 'Wireless Chargers', 'wireless-chargers', 2, CURRENT_TIMESTAMP),
    (gen_random_uuid(), v_power_charging, 'Power Banks', 'power-banks', 3, CURRENT_TIMESTAMP),
    (gen_random_uuid(), v_power_charging, 'Charging Cables', 'charging-cables', 4, CURRENT_TIMESTAMP)
  ON CONFLICT ("slug") DO UPDATE SET
    "name" = EXCLUDED."name",
    "parent_id" = EXCLUDED."parent_id",
    "sort_order" = EXCLUDED."sort_order",
    "updated_at" = CURRENT_TIMESTAMP;

  INSERT INTO "categories" ("id", "parent_id", "name", "slug", "sort_order", "updated_at")
  VALUES
    (gen_random_uuid(), v_mobile_accessories, 'Cases & Covers', 'cases-covers', 1, CURRENT_TIMESTAMP),
    (gen_random_uuid(), v_mobile_accessories, 'Screen Protectors', 'screen-protectors', 2, CURRENT_TIMESTAMP),
    (gen_random_uuid(), v_mobile_accessories, 'Phone Holders & Stands', 'phone-holders-stands', 3, CURRENT_TIMESTAMP),
    (gen_random_uuid(), v_mobile_accessories, 'Car Accessories', 'car-accessories', 4, CURRENT_TIMESTAMP)
  ON CONFLICT ("slug") DO UPDATE SET
    "name" = EXCLUDED."name",
    "parent_id" = EXCLUDED."parent_id",
    "sort_order" = EXCLUDED."sort_order",
    "updated_at" = CURRENT_TIMESTAMP;
END
$$;

COMMIT;
