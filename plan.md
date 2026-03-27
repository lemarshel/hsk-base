# Project Plan — Chinese Module

## Goal

Build the Chinese module inside **Lingua Bridge** as the first complete language sub-app: a structured Chinese learning system built around a **40-text curriculum**, a verified vocabulary dataset, interactive exploration tools, learner tracking, and future mobile delivery. The Chinese module should serve both as a working learning product and as the reference implementation for later language modules. :contentReference[oaicite:0]{index=0} :contentReference[oaicite:1]{index=1} :contentReference[oaicite:2]{index=2}

## Core Mission

The Chinese module is meant to teach the core of Mandarin through a tightly designed system rather than isolated flashcards or random lessons.

The method is:

- take the most useful Chinese words
- organize them into **40 topics × 100 words**
- teach them through natural, high-quality story contexts
- support direct vocabulary exploration and morpheme-family discovery
- track real learner behavior for later optimization
- keep the system accessible through web first, then later mobile apps for Android and iPhone :contentReference[oaicite:3]{index=3} :contentReference[oaicite:4]{index=4}

## Current Project State

The Chinese module is already the most mature part of the wider platform.

Completed or substantially completed work includes:

- source collection and comparison
- missing-word recovery from official PDFs
- morpheme-enriched master dataset
- topic assignment for the 40-topic curriculum
- multiple audit passes
- learner tracker
- vocabulary runtime
- interactive mindmap groundwork and redesign planning

The story reader and dashboard/cross-linking are planned but still documented as not started in the project phase logs. :contentReference[oaicite:5]{index=5} :contentReference[oaicite:6]{index=6} :contentReference[oaicite:7]{index=7}

## Dataset Objectives

### Master Vocabulary Dataset

The Chinese module should maintain a verified master vocabulary dataset containing:

- Chinese word
- pinyin
- English meaning
- Russian meaning
- example sentence
- part of speech
- morpheme breakdown
- HSK level
- related structural metadata where available

The project originally identified `OUR_HSK_v3/index.html` as the strongest base source because it had the best overall completeness: 4651 words, HSK tagging, pinyin, English, Russian, examples, POS, and radical data. :contentReference[oaicite:8]{index=8}

### Missing Word Recovery

The source dataset was not sufficient on its own. Missing official HSK words had to be recovered from PDF sources and merged into the master data. This recovery work is a required part of the Chinese module pipeline, not a side note. :contentReference[oaicite:9]{index=9}

### Final Chinese Data Goal

The Chinese module should preserve:

- full master dataset for all recovered words
- 4000-word curriculum layer for the 40-text system
- dropped/non-core words saved separately so nothing is lost

Topic structure requirements already documented include:

- **40 topics**
- **100 words per topic**
- balanced HSK distribution per topic
- dropped words saved separately in full form :contentReference[oaicite:10]{index=10}

## Curriculum Requirements

The Chinese curriculum is built around the “all of Chinese in 40 texts” principle.

Requirements:

1. **4000 core words** are divided across **40 topics × 100 words**.  
2. Every topic must eventually receive **one complete story/text** using its target vocabulary.  
3. For Chinese, helper vocabulary should stay as controlled as possible, ideally around **HSK 1–2 scaffolding** when building the reading experience.  
4. Stories must feel natural and interesting, not like textbook filler.  
5. Chinese formatting must preserve correct character grouping and pinyin layout.  
6. Tone-color conventions should follow the HSK Base style.  
7. The learner must be able to show/hide pinyin and translation layers.  
8. Audio should support the full text experience. :contentReference[oaicite:11]{index=11} :contentReference[oaicite:12]{index=12}

## Chinese-Specific Display Rules

Chinese needs rules that other language modules do not.

These include:

- Chinese characters are always primary
- pinyin appears under the Chinese text
- spaces must reflect true word grouping, not arbitrary per-character spacing
- tone coloring should match HSK Base conventions
- translation visibility must be toggleable
- pinyin visibility must be toggleable
- Chinese-only mode should remain the default study mode in the story reader :contentReference[oaicite:13]{index=13} :contentReference[oaicite:14]{index=14}

## Planned Runtime Components

The Chinese module is not only data. It is a runtime learning app with several connected parts.

### 1. Vocabulary Page

The vocabulary page is the main searchable study surface.

It should support:

- browsing and search
- grouped word display
- export tools
- saved preferences
- persistent learner state
- integration with tracker events
- mobile-friendly behavior and layout fixes already partially implemented :contentReference[oaicite:15]{index=15}

### 2. Morpheme Mindmap

The mindmap should help users explore Chinese through recurring character families and predictive links.

Planned/known requirements include:

- topic-linked expansion
- seed words first, then predictive family expansion
- support for opening by topic or by word family
- open-all / close-all controls
- visual redesign away from force-simulation chaos toward a more structured model :contentReference[oaicite:16]{index=16} :contentReference[oaicite:17]{index=17}

### 3. Story Reader

The story reader is a central module, not an extra feature.

Planned requirements:

- one story per topic
- sidebar with all topics
- topic progress bars
- Chinese-only mode
- optional pinyin layer
- optional full translation layer
- hover popup with pinyin, English, morpheme breakdown, and Hanzi Writer stroke animation
- checklist of target words with persistent state
- export progress
- print mode
- navigation across topics
- tracker integration for seen, hovered, and checked_off events
- direct linking into the mindmap from story words or topics :contentReference[oaicite:18]{index=18} :contentReference[oaicite:19]{index=19}

### 4. Dashboard and Cross-Linking

The Chinese module should eventually have a home dashboard that makes the app feel unified rather than a pile of pages.

Planned requirements:

- overall stats
- words learned / familiar / unseen
- daily streak
- study session totals
- progress indicator
- navigation cards for vocabulary, mindmap, and stories
- suggested study section
- review words section
- weakest-family or low-completion recommendations
- learning-history chart
- top navigation linking all Chinese pages together in one coherent system :contentReference[oaicite:20]{index=20}

## Learner Tracking Requirements

The tracker is one of the most important technical parts of the Chinese module.

It should:

- log learner interactions in localStorage
- store structured event history
- support export
- expose progress methods for UI modules
- track words and topics, not just raw clicks
- work in browser without modules or backend
- provide a clean event schema that future ML or personalization layers can use

Required or documented event behavior includes:

- session start / end
- word hover
- search
- checked_off
- stroke play
- story open / seen behavior

The tracker already went through fixes for API completeness, localStorage schema, export format, and word ID mapping. :contentReference[oaicite:21]{index=21} :contentReference[oaicite:22]{index=22}

## Audit and Verification Requirements

The Chinese module must remain audit-driven.

That means:

- do not trust scraped or merged data blindly
- preserve audit folders and reports
- verify recovery results
- verify topic balance
- verify tracker behavior
- verify story word coverage
- verify cleanup of corrupted extraction artifacts

The project notes describe multiple completed audits, including full integrity checks and tracker verification. That discipline should remain part of the plan, not just historical commentary. :contentReference[oaicite:23]{index=23}

## Architecture Direction Inside Lingua Bridge

The Chinese module should live as a **language sub-app** inside the main Lingua Bridge platform.

Correct direction:

- `lingua-bridge/index.html` = landing page
- `lingua-bridge/chinese/` = Chinese sub-app
- `lingua-bridge/shared/` = shared microprograms and shared styling
- Chinese-specific pages and data stay under `/chinese/`
- shared logic gradually moves into reusable language-agnostic files

Documented shared candidates include:

- `tracker.js`
- `search.js`
- `audio.js`
- `word-card.js` :contentReference[oaicite:24]{index=24}

## Data and File Migration Plan

The Chinese module should be migrated into Lingua Bridge in a controlled way.

Known integration steps already documented:

1. migrate the Chinese master word data into `chinese/data/words.json`
2. migrate topic data into `chinese/data/topics.json`
3. port the tracker into shared components
4. build `chinese/index.html` as the production Chinese page inside Lingua Bridge
5. link it from the main landing page
6. deploy through the platform shell :contentReference[oaicite:25]{index=25}

## Mobile Expansion

The Chinese module should not remain desktop-web only.

Future expansion includes dedicated mobile applications for:

- **Android**
- **iPhone**

The goal is wider access without losing the core method: structured texts, story-based study, learner tracking, vocabulary exploration, and language-specific learning tools. Chinese should act as the first test case for how Lingua Bridge works on phones and tablets. :contentReference[oaicite:26]{index=26}

## Long-Term Strategic Role

The Chinese module is not just one language page. It is the reference model for the wider platform.

It should prove:

- the 40-text method
- the topic schema
- the data pipeline
- the audit discipline
- the tracker model
- the multi-page learning app structure
- the eventual web-to-mobile transition

If Chinese stays messy, later language modules will inherit the mess. If Chinese becomes clean, it becomes the template. :contentReference[oaicite:27]{index=27} :contentReference[oaicite:28]{index=28}

## Acceptance Criteria

The Chinese module plan should be considered successful when:

1. A verified Chinese master dataset exists and remains reproducible.  
2. The 40-topic schema is preserved at **40 × 100 = 4000 core words**.  
3. Dropped words are preserved separately, not discarded.  
4. Vocabulary page works as a stable Chinese sub-app page.  
5. Tracker works with clean event schema and export support.  
6. Mindmap works as a real exploratory tool, not just a visual demo.  
7. Story reader exists for all 40 topics with proper Chinese/pinyin/translation layering.  
8. Dashboard cross-links the Chinese study pages into one coherent app.  
9. Chinese module is cleanly placed under Lingua Bridge as a sub-app.  
10. Shared microprograms are separated from Chinese-specific page logic.  
11. The module remains ready for future Android and iPhone expansion. :contentReference[oaicite:29]{index=29} :contentReference[oaicite:30]{index=30} :contentReference[oaicite:31]{index=31}

## Summary

Chinese is the first real implementation of Lingua Bridge.

This plan is not about making a prettier word list. It is about turning the Chinese work into a complete, structured sub-app with:

- verified data
- 40-topic curriculum design
- story-based acquisition
- morpheme exploration
- learner-state tracking
- dashboard-level integration
- future mobile reach

That is the standard the Chinese module should meet before the rest of the platform scales around it. :contentReference[oaicite:32]{index=32}


Major Add on:
## General Language-Building Method

Lingua Bridge follows a general language-building workflow that can be reused across different target languages.

### G-Step 1 — Build the Core Word Base

The first stage is to create the main word foundation for a language.

#### 1.1 Official level-based sources when available
If a language already has an official or widely accepted level structure, that structure is used as the starting point. This applies to languages such as Chinese or Japanese, where official or semi-official graded word systems already exist. In such cases, the platform uses approximately **4000–5000 words** from those level-based sources as the initial core.

#### 1.2 Custom level structure when no official list exists
If no official level list exists, a structured word base is built manually from strong, reputable sources chosen specifically for that language. In this case, the platform uses a clean multi-level split. One standard model is:

- **Level 1:** 500  
- **Level 2:** 700  
- **Level 3:** 800  
- **Level 4:** 900  
- **Level 5:** 1000  
- **Level 6:** 1100  

This produces a total of **5000 words**.

The exact level distribution may differ by language, but at this stage the goal is to create a strong, practical, approximately graded vocabulary foundation. Meanings at this point may still be partly approximate unless the source already provides official English definitions.

### G-Step 2 — Refine, Structure, and Prepare the Language System

Once the initial word base exists, the next stage is to transform it into a usable structured learning system.

#### 2.1 Grouping, filtering, search, and audio
Words are first divided approximately into useful internal structures such as phonetic groups, root families, morphemes, or similar language-specific clusters. Filters are added to the target-language words themselves, along with search tools and audio playback for pronunciation and study support.

#### 2.2 Manual quality checking in batches
The words are then reviewed carefully in batches of around **100 words at a time**. This includes:
- checking translations into **English** and **Russian** first
- correcting spelling
- adding example sentences
- translating those examples into multiple learner languages
- assigning the correct **part of speech**

For languages that already have strong official graded sources, the next step may be less important. For languages without such official grading, it becomes essential.

#### 2.3 Final level assignment
After the meanings, spelling, examples, and POS structure are cleaned up, the words are assigned to their final levels. A common 5000-word split is:

- **Level 1:** 500  
- **Level 2:** 700  
- **Level 3:** 800  
- **Level 4:** 900  
- **Level 5:** 1000  
- **Level 6:** 1100  

At this point the system should contain much more precise translations and cleaner level divisions.

#### 2.4 Divide the full word base into 40 study batches
Once the words are stable, they are divided evenly into **40 batches of 100 words** each. These batches are built using level distribution logic, so each text receives a balanced mixture from the correct difficulty ranges.

#### 2.5 Dictionary / test / flashcard readiness
At this stage the word base is already mature enough to function as:
- a strong searchable dictionary
- an Anki-style study base
- a testing system
- or another structured vocabulary tool

#### 2.6 Turn the batches into story-based learning texts
This is where the core method becomes most important.

Each 100-word batch is placed into a carefully written retelling of a famous story or another strong narrative format. The target batch words are embedded into context, while easier helper words — usually around Level 1–2 — are used to support comprehension. Stories are chosen and arranged so that easier texts come first and more challenging texts appear later.

The texts build upward. Words learned in earlier texts are reused and spread into later texts, so the learner gradually reaches a harder and denser 40th text without constantly resetting difficulty.

#### 2.7 Apply long-term memory repetition logic
A repetition formula is then applied to determine after how many days words should reappear in later texts to move them toward long-term memory. These repetitions are spread **forward into later texts**, never backward.

#### 2.8 Provide the 100-word list after each text
After a text is completed, the exact target list of **100 words** used in that text is shown clearly for review and study.

#### 2.9 Add audio and supporting study layers
At this stage the audio layer is added:
- word audio
- sentence audio
- reading support
- structural divisions and study aids linked to the text

This is the stage where the language is effectively “hacked” through **40 texts built from 40 structured story-based batches**.

##### 2.9.1 Harder-first sequencing inside texts
Within a text, harder words should preferably appear earlier, when the learner’s mind is fresher, while easier words can appear later.

##### 2.9.2 Different style from text to text
Each text should have its own style of telling so the learner does not feel like they are reading the same material again and again.

##### 2.9.3 Style preference and branching story paths
Users should be able to like or dislike the style of a text. This allows the system to detect which styles they respond to best. In the long term, that makes it possible to generate or prepare multiple story paths for the same 100-word batch.

For example:
- first pass: 1 story for each batch = 40 stories
- later passes: additional different stories for the same batches
- users choose styles they prefer
- the most liked styles receive more future versions

This means the system can eventually grow from a single 40-story path into many parallel paths while still preserving the same batch-based vocabulary structure.

### G-Step 3 — Expansion

After the core system is stable, the next stage includes broader improvements such as:

- improving design
- adding alphabet learning through a custom method
- building a dedicated app
- expanding interface languages
- improving personalization and style selection
- extending the same method across more languages