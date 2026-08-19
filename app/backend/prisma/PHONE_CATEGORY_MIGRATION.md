# Phone category migration

Run the dedicated data procedure only after reviewing the report against the target database:

```bash
npm run db:migrate:phone-categories
```

The procedure is idempotent and uses the category-only hierarchy seed. It never calls the general demo seed and does not create or delete products, variants, images, or orders. Product rows formerly assigned to the exact `smartphones` slug are reassigned in place:

- `iPhone` is selected from the first non-empty structured value among `phoneType`, `deviceType`, `platform`, `operatingSystem`, and `os` when its normalized value contains the structured token `iPhone` or `iOS`.
- `Android Phones` is selected when that normalized value contains the structured token `Android`, including values such as `MagicOS 9.0 based on Android 15`.
- All other non-discarded legacy phone products remain under the canonical `Phones` root and are returned in `unclassifiedPhones` for review.
- Discarded, unclassified legacy test products are moved to the `Phones` root without subtype assignment, remain `DISCARDED`, and are reported separately in `discardedUnclassifiedPhones`; they do not block active storefront classification.

The CLI prints counts before and after, category migration counts, and the exact unclassified product IDs/slugs/names. The legacy `Smartphones` row remains for compatibility but is marked inactive. The SQL equivalent for a reviewed/manual database run is `production-category-hierarchy.sql` in this directory.

After execution, verify product-count and legacy-category invariants before approving the change:

```sql
SELECT COUNT(*) FROM products;
SELECT slug, is_active FROM categories WHERE slug IN ('phones', 'iphone', 'android', 'smartphones');
SELECT category_id, COUNT(*) FROM products GROUP BY category_id;
```
