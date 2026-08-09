# Clippy release process

Production must always be traceable to the `main` branch.

1. Create a feature branch and let Vercel build a Preview deployment.
2. Test authentication, dashboard navigation, integrations and the changed workflow on Preview.
3. Merge the reviewed branch into `main`.
4. Allow Vercel to build Production from the merge commit.
5. Open **Admin → QA** and confirm the running release shows `main`, the expected commit and a healthy release check.

Do not promote a feature-branch Preview directly to Production. Preview environment variables can differ from Production and a promotion can put an unmerged or differently configured build on `useclippy.com`.

For OAuth changes, update both Preview and Production variables deliberately. Never commit credentials to Git.
