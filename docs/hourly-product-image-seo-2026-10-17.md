# Hourly product image SEO — safe changed-only pipeline

This repository already had **20 fully published shopping product-detail pages** with
attributed, real seller listing WebP photographs. The product catalog also
contained **51 comparison-only candidates** (included in 24 published buying
guides but without standalone detail pages or photographs). The single featured
smartphone detail page additionally has its own seller-photo gallery.

## New automation

Workflow `.github/workflows/hourly-product-images.yml` runs at minute 17 of
each UTC hour, can also run manually from GitHub Actions, and gets an initial
`push` trigger on deployment. It runs
`node scripts/sync-editorial-product-images.mjs`, refreshes the static
fallback image sitemap via `npm run content:export`, runs `npm test`, and
commits only when files actually changed.

The first run creates up to 51 **original SVG category-concept illustrations**,
one for every previously unpictured comparison candidate, and records images
in `content/shopping-catalog.json`. These editorial vector illustrations
have distinct descriptive filenames, dimensions, useful alt text and the explicit
on-image disclaimer "NOT AN ACTUAL SELLER PRODUCT PHOTO". Each corresponding
buying guide displays these honestly and lists the URLs through `image:image`
in the canonical sitemap. All images are local first-party assets.

This approach does **not** manufacture fake photos of branded products or
misstate seller availability. No existing real WebP, photo provenance, affiliate
URL, listing product ID, guide published date or manual imagery gets replaced.
The source catalog remains the canonical data file; only unpictured products
without standalone detail pages are illustrated by the generator.

An image audit report (`content/image-audit-report.json`) records the image
inventory. The job is deterministic and idempotent: a second hourly run
does not regenerate images, change publication dates, fake updates, or submit
duplicate sitemaps.

## Indexing workflow

Runtime and fallback `/sitemap.xml` include new first-party SVG URLs as
`image:image` tags for their published guides. `lastmod` changes to the
image-publication date only for pages that actually acquired new artwork,
without altering the visible original `datePublished`.

The existing Cloudflare Worker hourly Google Search Console code now
fingerprints image sitemap content in addition to the URL inventory, so a
new image batch can trigger *one* authorized GSC sitemap submission.
Google independently decides when to fetch, index and display images.
Neither SVG thumbnail generation nor sitemap submission guarantees
Google Images placement, high rankings or Adsterra CPM.

## Limitations and next steps

These are **illustrations, not product photos**. Replacing concepts with
product-specific approved photos is desirable for the highest-quality retail
image result; after someone supplies an image with valid attribution and
rights, add its `image` entry to the catalog with source metadata and remove
the corresponding illustration from the catalog. The generator will never
overwrite images already recorded. For new seller product pages, do not
publish an unverified photograph.

Hourly GitHub Actions schedules may be delayed by GitHub capacity or
disabled after inactivity. Check its runs and whether commits were deployed
by the existing Cloudflare Workers Builds integration. No long-running
model session, extra hosting, image API key or fabricated clicks are needed.

## Verification

- `npm test` — image, guide, sitemap and Worker tests.
- `node scripts/sync-editorial-product-images.mjs` — build missing original illustrations.
- `npm run content:export` — refresh static image sitemap.
- `https://buysell.best/sitemap.xml` — canonical URLs and <image:loc> entries.
- Private D1 GSC `gsc_state` — `sitemap_submission_time` and `sitemap_submission_hash`.
