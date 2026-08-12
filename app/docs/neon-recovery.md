# Neon Production Database Recovery

Use this only after confirming production data loss or a bad catalogue change. Do not test restore against the live database.

1. In Neon, open the production project and identify the branch that serves `wahabmobiles.com`.
2. Use Neon point-in-time restore or branch restore to create a new branch at the timestamp immediately before the accidental change.
3. Inspect the restored branch data first, especially `products`, `product_variants`, `product_images`, `brands`, and `categories`.
4. If only catalogue rows were affected, export the needed rows from the restored branch and import them into production with Prisma or `psql`.
5. If the full production branch must be replaced, schedule downtime, update the production `DATABASE_URL` to the restored branch, redeploy Render, and verify `/api/health/db`.
6. Keep the original damaged branch until the site, admin portal, and catalogue have been verified.

Current provider capability to rely on: Neon branching and point-in-time restore. No extra backup tooling is required before the first real catalogue entry.
