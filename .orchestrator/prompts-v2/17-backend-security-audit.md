Read the entire src/ directory before making any changes.

## TASK: Backend + Security Audit — Production Ready

### API ROUTES (every file in src/app/api/):
1. Auth check: supabase.auth.getUser() at top. 401 if missing.
2. Authorization: always derive tenant_id from session, never trust request body.
3. Store isolation: verify store belongs to authenticated tenant.
4. Input validation: UUID format on IDs, file type (PDF/DOCX only), file size (max 20MB), string lengths.
5. Error handling: try/catch, specific messages, generic for unknown, never expose stack traces. Proper HTTP codes (400/401/403/404/500).

### DATABASE:
RLS enabled on ALL tables: tenant_profiles, documents, document_chunks, stores, conversations, messages, lease_summaries, obligation_matrices, cam_analysis, percentage_rent_entries, critical_dates, team_invitations, notifications, lease_risk_scores, cam_audits, lease_comparisons, and any others.
Each policy: tenant sees/modifies only own data (tenant_id = auth.uid()).

### CROSS-TENANT LEAK PREVENTION:
- Chat NEVER returns other tenant's chunks
- store_id filter ALWAYS applied, NEVER falls back to tenant-wide search
- Vector search (match_documents) includes store_id filter
- Keyword search includes store_id filter
- Portfolio queries only return authenticated tenant's stores

### API KEY SECURITY:
- .env.local in .gitignore
- NO API keys in frontend code
- Anthropic key only in server-side routes
- Service role key only in server-side code

### CODE QUALITY:
Remove ALL console.log/warn/error from client code.
Remove TODO/FIXME comments that are resolved.
Remove commented-out code blocks.
Remove unused imports/variables.

### PERFORMANCE:
No N+1 queries. Indexes on tenant_id, store_id, document_id. LIMIT clauses on large fetches.

Run npx tsc --noEmit. Fix ALL TypeScript errors.
Run npx next build. Must complete with ZERO errors.
Then: git add . && git commit -m "Production-ready: full audit complete" && git push
