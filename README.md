# Chinese Module — Lingua Bridge

Chinese is the first full language module inside **Lingua Bridge**. It contains the Chinese-specific data, pages, styling rules, and study flows built on top of the shared Lingua Bridge platform. The current Chinese dataset contains **5364 words** derived from HSK 1–6 source material, with morpheme analysis, topic balancing, audits, learner tracking, and interactive study pages already in place. :contentReference[oaicite:0]{index=0} :contentReference[oaicite:1]{index=1}

## Purpose

This module is the **Chinese-only learning app** inside the larger Lingua Bridge system.

It exists to provide:
- a searchable vocabulary experience
- morpheme/family exploration
- story-based study
- learner progress tracking
- a base UI model that later language modules can adapt

Unlike the Lingua Bridge root project, this README is only about the **Chinese runtime and Chinese data flow**. The broader multi-language platform logic belongs in the main Lingua Bridge README and Plan. :contentReference[oaicite:2]{index=2} :contentReference[oaicite:3]{index=3}

## Core Learning Idea

The Chinese module follows the **40-text method**:

- take the most useful Chinese vocabulary
- divide it into **40 topics × 100 words**
- teach those words through natural, carefully built texts
- keep beginner helper vocabulary controlled
- support audio, pinyin visibility, and translation visibility

The long-term target is a curriculum where a learner can absorb the core of Chinese through a small number of dense, high-quality study texts rather than random disconnected exercises. :contentReference[oaicite:4]{index=4} :contentReference[oaicite:5]{index=5}

## Current Scope

The current Chinese module includes:

- **Vocabulary system**
  - structured Chinese word database
  - pinyin
  - English and Russian meanings
  - examples
  - part of speech
  - morpheme breakdown
  - radical/component information where available

- **Topic system**
  - **40 balanced topics**
  - **100 words per topic**
  - HSK-balanced distribution across topics

- **Interactive tools**
  - vocabulary page
  - morpheme mindmap
  - stories/reader layer
  - learner tracker
  - dashboard/hub structure

- **Audit infrastructure**
  - repeatable audit folders
  - integrity checks
  - merge validation
  - tracker verification

This is already more than a word list. It is a Chinese learning system with both data and runtime layers. :contentReference[oaicite:6]{index=6} :contentReference[oaicite:7]{index=7} :contentReference[oaicite:8]{index=8}

## Dataset

### Final dataset size
- **5364 words** total after extraction, missing-word recovery, cleanup, duplicate merging, and artifact repair. :contentReference[oaicite:9]{index=9} :contentReference[oaicite:10]{index=10}

### Source origin
The project started from `OUR_HSK_v3/index.html`, which was chosen as the strongest source among the collected HTML versions because it had the most complete combination of:
- Chinese
- pinyin
- English
- Russian
- examples
- POS
- radicals/components
- HSK tagging

That source initially contained **4651 words**, but official PDF comparison revealed **759 missing words**, especially in HSK1. Those missing items were then recovered and merged into the dataset. :contentReference[oaicite:11]{index=11} :contentReference[oaicite:12]{index=12}

### Topic balance
The Chinese curriculum layer is built around:
- **40 topics**
- **100 words each**
- **4000 active curriculum words**
- remaining lower-priority words preserved separately outside the main topic set

This matches the Chinese study method used by HSK Base. :contentReference[oaicite:13]{index=13} :contentReference[oaicite:14]{index=14}

## Main Features

## 1. Vocabulary Page

The vocabulary page is the core dictionary-like interface for learners. It is based on the original HSK experience but sits inside a more structured system.

It is intended to support:
- searchable rows
- grouped sections
- row-level interaction
- saved learner state
- filtering and sorting
- theme modes
- persistent progress

This page is the main everyday study surface for Chinese learners. :contentReference[oaicite:15]{index=15} :contentReference[oaicite:16]{index=16}

## 2. Morpheme Mindmap

The Chinese module includes a morpheme-family exploration layer built around hub characters and compounds.

The mindmap work includes:
- hub generation from morpheme frequency
- category assignment
- galaxy/hub exploration
- word detail panel
- HSK filtering
- topic view extensions

This matters because Chinese is especially suitable for family-based vocabulary learning through recurring characters and compound structure. :contentReference[oaicite:17]{index=17}

## 3. Story / Reader System

The story layer is the heart of the 40-text method.

Its job is to eventually present:
- one text per topic
- all 100 topic words integrated into context
- controlled helper vocabulary
- visible/hidden pinyin
- visible/hidden translations
- full audio support

This is the main acquisition engine, not just an extra feature. :contentReference[oaicite:18]{index=18} :contentReference[oaicite:19]{index=19}

## 4. Learner Tracking

The Chinese module includes a learner tracking system designed to record real study behavior.

Tracked interactions include:
- session start / end
- word checks
- hover/lookups
- searches
- stroke play / interaction actions

The tracker stores events locally, supports export, and is meant to feed later personalization or ML layers. The tracker passed its corrected verification audit after API and schema fixes. :contentReference[oaicite:20]{index=20} :contentReference[oaicite:21]{index=21}

## Chinese-Specific Rules

Chinese is not treated exactly like other languages.

This module has special requirements:

- characters are displayed directly
- pinyin sits under the character/word
- tone colors follow HSK Base conventions
- Chinese word spacing must respect character grouping rules
- helper context for story generation should remain within HSK 1–2 as much as possible

These rules are specific to the Chinese module and should stay here, not in the shared Lingua Bridge README. :contentReference[oaicite:22]{index=22} :contentReference[oaicite:23]{index=23}

## Folder Role Inside Lingua Bridge

Recommended structure:

```text
lingua-bridge/
├── index.html
├── shared/
│   ├── js/
│   ├── css/
│   └── assets/
└── chinese/
    ├── index.html
    ├── vocabulary.html
    ├── mindmap.html
    ├── stories.html
    ├── data/
    ├── js/
    ├── css/
    └── assets/
	
	
## Future Expansion

The Chinese module is designed as the first fully developed language implementation inside Lingua Bridge, but it is not intended to remain limited to desktop web only.

### Mobile Apps

In the future, Lingua Bridge plans to launch dedicated applications for:

- **Android**
- **iPhone**

The goal is to make the learning system accessible to far more people through mobile-first use, while keeping the same core study method, structured texts, learner tracking, and interactive tools already developed for the web version. The mobile apps should preserve the main strengths of the Chinese module rather than replacing them with a simplified app-only experience. :contentReference[oaicite:0]{index=0}

### Chinese Module as the Reference App

Chinese is expected to serve as the reference model for future mobile implementation because it already contains the most mature version of the system, including:

- verified vocabulary data
- topic-based curriculum structure
- learner interaction tracking
- interactive vocabulary exploration
- morpheme-based learning tools
- story-driven study design

That means the Chinese module is not only the first language module on the web, but also the most likely foundation for testing how Lingua Bridge can work effectively on phones and tablets. :contentReference[oaicite:1]{index=1}

### Role Inside the Larger Platform Vision

The long-term aim is not to build a single Chinese website, but to make Chinese one part of a larger open language-learning ecosystem.

Lingua Bridge is planned as a free, open-source platform for learning many languages through a unified system. Each language is intended to receive its own vocabulary page, structured text curriculum, and language-specific tools while still sharing the same platform philosophy. Chinese is simply the first major implementation of that broader vision. :contentReference[oaicite:2]{index=2}

### Long-Term Platform Direction

The broader project vision includes:

- support for many languages
- interface localization for different learner languages
- static-first deployment for wide public access
- mobile access for mass usability
- language-specific tools built on top of a shared learning philosophy

Because of that, the Chinese module should be documented not as an isolated product, but as the first strong example of a system that is meant to scale beyond one language and beyond one device type. :contentReference[oaicite:3]{index=3}