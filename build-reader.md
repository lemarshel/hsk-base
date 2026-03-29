Build a very simple MVP reader page for the HSK project.
Working directory:
C:\Users\hp\Desktop\Main\hsk-base
Goal:
Create a clean reading page, not a writing tool, not a feature dump.
Name:
stories.html
Core idea:
The content should be displayed as flowing text made of word blocks.
Each word block shows:
1. Chinese
2. pinyin directly under it
3. translation directly under that
So every word is a vertical 3-line stack.
Visual target:
Like the screenshot style: Chinese on top, pinyin below, translation below.
But unlike the screenshot, use the full available horizontal space properly.
Do NOT keep the content in a narrow column unless needed for mobile.
Let the reading area breathe across the page. :contentReference[oaicite:0]{index=0}
What the page should do:
- Show a text/story as a sequence of word blocks
- Each word block flows inline and wraps naturally across the row
- 2-character words must stay together as one word block
- Pinyin belongs to the full word, not to each separate character
- Translation belongs to the full word, not to each separate character
- This is a reader, so there must be NO Hanzi Writer, NO stroke practice, NO per-character writing tools
- Keep it minimal and fast
Required layout:
1. Simple top bar
   - Back link to vocabulary page
   - Story/text title
   - A few truly necessary controls only
2. Main reading area
   - Wide content area
   - Comfortable left/right padding
   - Use most of the screen width
   - Word blocks wrap naturally like text
   - Good spacing between word blocks
   - Good vertical spacing inside each block
3. Optional simple sidebar or text selector only if needed
   - Keep it minimal
   - No giant dashboard feel
Required features only:
1. Toggle pinyin on/off
2. Toggle translation on/off
3. Click a sentence to hear TTS for that sentence (THERE SHOULD BE NO WORD ONLY TTS)
4. Previous / Next text navigation
5. Speed of the TTS
6. Read text on top with a full bar that user can click to navigate within the text audio. When clicked it reads the full story beginning to end. 
7. When the story is read in sentence only or in full text read, the characters that are being read should be highlighted read (each word while its read) so the user can track where its reading exactly. All character, pinyin (if not hidden) and translation (if not hidden) should be highlighted while the word is being read by the audio.
That is enough for v1.
Do NOT add:
- Hanzi Writer
- stroke animation
- hover popup encyclopedia cards
- checklist system
- learner tracker integration
- 100 extra filters
- progress bars everywhere
- side quests
- giant configuration system
- anything not essential to reading

Data format:
Use a very simple data structure for the reader.
Each text can be an array of sentences.
Each sentence should be correct in Chinese, pinyin and the translation should also sound correct: 

So for example not: He prepare attack Naruto (raw words + translations from the vocabulary list), but should be: He prepared to attack Naruto. 
Example:
{
  "id": "t01",
  "title": "Text 1",
  "sentences": [
    [
      { "zh": "他", "py": "tā", "en": "he" },
      { "zh": "准备", "py": "zhǔnbèi", "en": "prepared" },
      { "zh": "攻击", "py": "gōngjī", "en": "to attack" },
      { "zh": "鸣人", "py": "Míngrén", "en": "Naruto" }
    ],
    [
      { "zh": "就在这时候", "py": "jiù zài zhè shíhou", "en": "just at that moment" },
      { "zh": "伊鲁卡", "py": "Yīlǔkǎ", "en": "Iruka" },
      { "zh": "突然", "py": "tūrán", "en": "suddenly" }
    ]
  ]
}

Rendering rules:
- Render each sentence as a row/block with natural wrapping
- Render each word as:
  <div class="word-block">
    <div class="zh">准备</div>
    <div class="py">zhǔnbèi</div>
    <div class="tr">prepare</div>
  </div>
- Word blocks must align cleanly
- 2-character words stay together in one block
- Long words can be wider naturally
- Do not force equal widths unless visually necessary

Design rules:
- Use the js and css for the vocabulary.html as the basis (not fully) to match the style of it
- Clean typography
- Chinese line largest
- Pinyin smaller
- Translation smaller
- Clear spacing
- Full width reading area
- Mobile responsive
- Minimal UI clutter

Implementation rules:
- Do not modify existing complex app architecture unless absolutely needed
- Do not bring in Hanzi writer
- Do not build a giant system
- MVP only
- Clean HTML/CSS/JS
- Make it easy to expand later
- Do NOT build a monolith js css or html. Everything should be separated neatly

Deliverables:
1. stories.html
2. minimal JS only for:
   - rendering text
   - toggles
   - TTS
   - prev/next text
   - localStorage for toggles
3. minimal CSS for the reader layout
4. sample placeholder text data to prove the UI works

Success criteria:
- A text displays as clean 3-line word blocks
- Full page width is used well
- It feels like a reader, not a control panel
- It is simple, readable, and fast
- No writing/stroke features exist

You can use an example text of 1000 ish words as a test for the first text, while leaving others empty for now

