# AGENTS.md

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues (`gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Browser support

**Browser Support:** Baseline Newly available. Such features may be used when feature-detected, with a lightweight fallback where the library depends on them. No polyfills ship in the bundle; document the ones consumers may load. Deliberate deviations from platform guidance are recorded in `docs/adr/`.
