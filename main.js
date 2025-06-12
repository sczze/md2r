const { Plugin } = require('obsidian');

const bookAbbreviations = {
  'gen': 'Genesis',
  'ex': 'Exodus',
  'lev': 'Leviticus',
  'num': 'Numbers',
  'deut': 'Deuteronomy',
  'josh': 'Joshua',
  'judg': 'Judges',
  'ruth': 'Ruth',
  '1sam': '1 Samuel',
  '2sam': '2 Samuel',
  '1kings': '1 Kings',
  '2kings': '2 Kings',
  '1chron': '1 Chronicles',
  '2chron': '2 Chronicles',
  'ezra': 'Ezra',
  'neh': 'Nehemiah',
  'est': 'Esther',
  'job': 'Job',
  'ps': 'Psalms',
  'prov': 'Proverbs',
  'eccles': 'Ecclesiastes',
  'song': 'Song of Solomon',
  'isa': 'Isaiah',
  'jer': 'Jeremiah',
  'lam': 'Lamentations',
  'ezek': 'Ezekiel',
  'dan': 'Daniel',
  'hos': 'Hosea',
  'joel': 'Joel',
  'amos': 'Amos',
  'obad': 'Obadiah',
  'jonah': 'Jonah',
  'mic': 'Micah',
  'nah': 'Nahum',
  'hab': 'Habakkuk',
  'zeph': 'Zephaniah',
  'hag': 'Haggai',
  'zech': 'Zechariah',
  'mal': 'Malachi',
  'matt': 'Matthew',
  'mark': 'Mark',
  'luke': 'Luke',
  'john': 'John',
  'acts': 'Acts',
  'rom': 'Romans',
  '1cor': '1 Corinthians',
  '2cor': '2 Corinthians',
  'gal': 'Galatians',
  'eph': 'Ephesians',
  'phil': 'Philippians',
  'col': 'Colossians',
  '1thess': '1 Thessalonians',
  '2thess': '2 Thessalonians',
  '1tim': '1 Timothy',
  '2tim': '2 Timothy',
  'titus': 'Titus',
  'philem': 'Philemon',
  'heb': 'Hebrews',
  'james': 'James',
  '1pet': '1 Peter',
  '2pet': '2 Peter',
  '1john': '1 John',
  '2john': '2 John',
  '3john': '3 John',
  'jude': 'Jude',
  'rev': 'Revelation'
};


module.exports = class BibleInlinePlugin extends Plugin {
  onload() {
    console.log('Bible Inline Plugin loaded');

    this.bibleRoot = 'esvbible';

    function parseVersesByHeading(content) {
      const lines = content.split('\n');
      const verses = {};
      let currentVerse = null;
      let verseLines = [];

      for (const line of lines) {
        const headingMatch = line.match(/^##\s*(\d+)$/);
        if (headingMatch) {
          if (currentVerse !== null) {
            verses[currentVerse] = verseLines.join('\n').trim();
          }
          currentVerse = Number(headingMatch[1]);
          verseLines = [];
        } else if (currentVerse !== null) {
          verseLines.push(line);
        }
      }
      if (currentVerse !== null) {
        verses[currentVerse] = verseLines.join('\n').trim();
      }
      return verses;
    }

    const regex = /--([\dA-Za-z .]+?)\s*(\d+):(\d+)(?:-(\d+))?--/gi;


    this.registerMarkdownPostProcessor((element, ctx) => {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
      const toReplace = [];

      let node;
      while ((node = walker.nextNode())) {
        const text = node.textContent;
        let match;
        while ((match = regex.exec(text)) !== null) {
          toReplace.push({
            node,
            start: match.index,
            end: regex.lastIndex,
            match: match,
          });
        }
      }

      for (let i = toReplace.length - 1; i >= 0; i--) {
        const { node, start, end, match } = toReplace[i];
        const originalText = node.textContent;

        const before = originalText.slice(0, start);
        const after = originalText.slice(end);

        const beforeNode = document.createTextNode(before);
        const afterNode = document.createTextNode(after);

        const verseBlock = document.createElement('blockquote');
        verseBlock.classList.add('bible-verse-block');

	let book = match[1].trim();

	const normalizedKey = book.toLowerCase().replace(/[^a-z0-9]/gi, '');
	if (bookAbbreviations.hasOwnProperty(normalizedKey)) {
 	 book = bookAbbreviations[normalizedKey];
	} else {
  	book = book.replace(/\s+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
	}

	const chapter = match[2];
	const verseStart = Number(match[3]);
	const verseEnd = match[4] ? Number(match[4]) : verseStart;


        const chapterNum = chapter.padStart(2, '0');
        const fileName = `${book}_${chapterNum}.md`;
        const filePath = `${this.bibleRoot}/${book}/${fileName}`;

        this.app.vault.adapter.read(filePath).then(content => {
          const verses = parseVersesByHeading(content);
          if (!verses || Object.keys(verses).length === 0) {
            console.error(`No verses found in ${filePath}`);
            verseBlock.textContent = `Error loading ${book} ${chapter}:${verseStart}${verseEnd !== verseStart ? '-' + verseEnd : ''}`;
            return;
          }

          for (let v = verseStart; v <= verseEnd; v++) {
            if (!verses[v]) {
              console.warn(`Verse ${v} not found in ${filePath}`);
              continue;
            }
            const verseDiv = document.createElement('div');
            if (verseStart !== verseEnd) {
              const sup = document.createElement('sup');
              sup.textContent = v;
              verseDiv.appendChild(sup);
            }
            const span = document.createElement('span');
            span.textContent = verses[v];
            verseDiv.appendChild(span);
            verseBlock.appendChild(verseDiv);
          }

          const footer = document.createElement('footer');
          footer.textContent = `${book} ${chapter}:${verseStart}${verseEnd !== verseStart ? '-' + verseEnd : ''}`;
          verseBlock.appendChild(footer);

          const parent = node.parentNode;
          parent.insertBefore(beforeNode, node);
          parent.insertBefore(verseBlock, node);
          parent.insertBefore(afterNode, node);
          parent.removeChild(node);

        }).catch(err => {
          console.error(`Error loading ${book} ${chapter}:${verseStart}`, err);
          verseBlock.textContent = `Error loading ${book} ${chapter}:${verseStart}${verseEnd !== verseStart ? '-' + verseEnd : ''}`;
          const parent = node.parentNode;
          parent.insertBefore(beforeNode, node);
          parent.insertBefore(verseBlock, node);
          parent.insertBefore(afterNode, node);
          parent.removeChild(node);
        });
      }
    });
  }

  onunload() {
    console.log('Bible Inline Plugin unloaded');
  }
};

