# Repository Guidelines

## Project Structure & Module Organization

Source lives in `src/` with the App Router under `src/app/`, shared UI in `src/components/`, hooks in `src/hooks/`, and utilities in `src/utils/`. Static assets sit in `public/`, while scripts such as `scripts/build-static.sh` support deployment workflows. Tests accompany features in `src/**/__tests__/` or `*.test.tsx`/`*.spec.tsx`, and Playwright end-to-end specs live in `tests/`.

## Build, Test, and Development Commands

Use `yarn dev` to run the Next.js dev server at `http://localhost:3000`. Ship-ready bundles come from `yarn build` followed by `yarn start`. Run `yarn build:static` for the S3-friendly static export. Code quality gates include `yarn lint`, `yarn type-check`, and `yarn format:check`. Execute Jest suites with `yarn test`, or target coverage via `yarn test:coverage`; launch Playwright with `yarn test:e2e`.

## Coding Style & Naming Conventions

Write strict TypeScript and reference modules with the `@/*` alias. Components use PascalCase (e.g., `NewUploadModal.tsx`), hooks start with `use`, and utilities prefer camelCase. Format code with Prettier (2 spaces) and enforce linting through ESLint's `next/core-web-vitals` rules. Husky runs lint-staged before commits, so keep staged files clean.

## Testing Guidelines

Unit and integration tests rely on Jest and Testing Library in a jsdom environment; Playwright covers browser flows. Name tests with the `*.test.tsx`/`*.spec.tsx` suffix or place them in `__tests__/` folders. Keep meaningful coverage for touched code and prefer `yarn test:coverage` when validating large changes.

## Commit & Pull Request Guidelines

Prefix commits with `Feat`, `Fix`, `Chore`, `Refactor`, `Docs`, or `Test`, followed by a clear summary (e.g., `Feat: Add clip timeline zoom`). Pull requests should describe intent, link any issues, and include screenshots for UI updates. Before opening a PR, ensure `yarn lint`, `yarn type-check`, and the relevant test suites all pass.

## Security & Configuration Tips

Never commit secrets; copy `.env.local.example` to `.env.local` for local overrides. Consult `README.md` for container tips, health checks, and environment configuration. Prefer existing Yarn scripts over ad hoc commands to stay aligned with CI expectations.
