# Audit Log

All data quality audits for the HSK Learning Project.

Each audit is in its own folder: `audit_XXX_descriptive_name/report.json`

| ID  | Name | Phase | Date | Summary |
|-----|------|-------|------|---------|
| 001 | POS Fix Round 1 | Phase 1 | 2026-03-22 | 42 POS corrections via priority chain (MANUAL dict → morphological rules → CEDICT → English patterns) |
| 002 | Morpheme Meanings Fix | Phase 1 | 2026-03-22 | 4592/4616 empty morpheme meanings filled via CC-CEDICT; 24 remaining are punctuation chars |
| 003 | Radical Verification | Phase 1 | 2026-03-22 | 155 unique radicals, 92.3% coverage (3966/4650 words); 359 empty are rare chars |
| 004 | Missing Words Discovery | Phase 0.5 | 2026-03-22 | 759 missing words found (HSK1: 494, HSK2: 140, HSK3: 58, HSK4: 39, HSK5: 19, HSK6: 9) |
| 005 | Merge Quality Check | Phase 1.5 | 2026-03-22 | 722 words merged; 61 POS fixes; 354 sentence fixes; dataset grew 4650→5372 |
| 006 | Full Integrity Check | Phase 2 | 2026-03-22 | 5372 words, 0 orphans, 0 duplicates, PDF coverage 100%; 11 artifact IDs flagged |
| 007 | Pre-Phase 3 Cleanup | Phase 2.5 | 2026-03-22 | Merged 4 duplicate char entries, added 7 properly-formed words, 2 Phase 2 topic replacements |
| 008 | Phase 4 Tracker Verification | Phase 4 | 2026-03-22 | v1: 5/7. v2 (after fixes): **7/7 PASS**. Fixed: renamed to LearnerTracker, added 3 missing methods, renamed .exportData, hsk_learner_ key, word_id + timestamp fields, WORD_ID_MAP embedded |

## Convention

- Folder name: `audit_XXX_descriptive_name`
- Always contains `report.json` with structured results
- Add a new row to this table for every new audit
