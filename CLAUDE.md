@AGENTS.md

# Provelo — Project Context for Claude Code

## What this project is
A Next.js 16 web app where commercial retail tenants upload their lease PDFs
and ask natural language questions. Uses RAG (Retrieval-Augmented Generation)
with Claude API to answer questions grounded in the actual lease text.

## Tech stack
- Next.js 16 (App Router, TypeScript, Turbopack default)
- Tailwind CSS + shadcn/ui
- Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) for chat streaming
- Claude API (claude-sonnet-4-6) for LLM
- LangChain.js 0.3.x for RAG pipeline
- Supabase (PostgreSQL + pgvector + Auth + Storage)
- pdf-parse for PDF text extraction (server-only, in serverExternalPackages)
- OpenAI text-embedding-3-small for vector embeddings

## Key conventions
- All API routes in src/app/api/
- Business logic in src/lib/
- React components in src/components/
- Use server components by default, 'use client' only when needed
- All database queries through Supabase client in src/lib/supabase.ts
- pdf-parse is server-only — never import in client components

## Important files
- src/lib/prompts.ts — System prompts (most critical for answer quality)
- src/lib/ragChain.ts — Full RAG pipeline
- src/lib/pdfProcessor.ts — PDF extraction and chunking
- src/lib/vectorStore.ts — pgvector search operations
- supabase/migrations/001_initial.sql — Full database schema

## Environment variables required
- ANTHROPIC_API_KEY
- OPENAI_API_KEY (for embeddings)
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
