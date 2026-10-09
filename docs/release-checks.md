# Release Checks

GitHub is the review and update destination. Existing Forgejo issues remain
valid reference material; link them explicitly, rather than assuming that
their numbers identify the same issues on GitHub. The owner merges PRs.

## Before Review

Run `npm ci`, `npm run check:release`, `CI=1 npm run qa -- --workers=2`,
then `CI=1 npm run qa:release`. The last command tests the actual production
build on port 5179, not the development server on port 5178.

The macOS visual baselines remain strict. Linux CI runs the functional
desktop/mobile suite and production/offline tests, not incompatible macOS
pixel comparisons. Do not regenerate baselines just to make a check pass.

GitHub PRs and main pushes use the same verification workflow. Deployment
depends on all checks succeeding and uploads exactly the tested `dist`
directory. The daily check uses that same gate. None of this replaces
physical-device testing or makes GitHub branch-protection rules mandatory;
repository administrators control those settings separately.

## Offline and Update Behaviour

- Every build generates a service worker with a content-addressed shell:
  HTML, JavaScript, CSS, icons, manifest and the existing pixel font.
- Pixel Operator regular and bold are bundled locally as WOFF2, with the
  author's CC0 license in `public/fonts/CC0-PixelOperator.txt`. Source:
  https://www.dafont.com/pixel-operator.font
  Both faces are included in the offline shell; no font CDN is required.
- One successful online installation is required before offline launches.
  A missing critical asset rejects installation. Music is optional and
  cached on demand; uncached or ranged audio may remain unavailable offline.
- An update waits for existing game tabs/windows to close. There is no
  forced reload or mid-career controller replacement.
- Cache cleanup only touches obsolete caches belonging to this app's base
  path. IndexedDB careers and other applications' caches are untouched.
- Development servers do not register the worker. Production has no QA
  global, debug controls, emergency reset button or Figma capture script.

## Forgejo Bridge

The existing local Forgejo-to-GitHub bridge is not changed by this PR.
It uses a non-force push, so once GitHub main moves ahead it will refuse
divergence rather than overwrite it. Retire or deliberately reconcile that
bridge before resuming Forgejo code merges; otherwise it will keep failing.
Keeping Forgejo running for historical issues does not require the bridge.
