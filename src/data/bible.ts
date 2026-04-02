// Cache em memória para evitar chamadas repetidas
const chapterCache = new Map<string, BibleVerse[]>();

export interface BibleVerse {
  book_id: string;
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface BibleBook {
  id: string;
  nome: string;
  abrev: string;
  testamento: 'AT' | 'NT';
  capitulos: number;
}

export const BIBLE_BOOKS: BibleBook[] = [
  { id: 'genesis',           nome: 'Gênesis',           abrev: 'Gn',  testamento: 'AT', capitulos: 50 },
  { id: 'exodus',            nome: 'Êxodo',             abrev: 'Êx',  testamento: 'AT', capitulos: 40 },
  { id: 'leviticus',         nome: 'Levítico',          abrev: 'Lv',  testamento: 'AT', capitulos: 27 },
  { id: 'numbers',           nome: 'Números',           abrev: 'Nm',  testamento: 'AT', capitulos: 36 },
  { id: 'deuteronomy',       nome: 'Deuteronômio',      abrev: 'Dt',  testamento: 'AT', capitulos: 34 },
  { id: 'joshua',            nome: 'Josué',             abrev: 'Js',  testamento: 'AT', capitulos: 24 },
  { id: 'judges',            nome: 'Juízes',            abrev: 'Jz',  testamento: 'AT', capitulos: 21 },
  { id: 'ruth',              nome: 'Rute',              abrev: 'Rt',  testamento: 'AT', capitulos: 4 },
  { id: '1+samuel',          nome: '1 Samuel',          abrev: '1Sm', testamento: 'AT', capitulos: 31 },
  { id: '2+samuel',          nome: '2 Samuel',          abrev: '2Sm', testamento: 'AT', capitulos: 24 },
  { id: '1+kings',           nome: '1 Reis',            abrev: '1Rs', testamento: 'AT', capitulos: 22 },
  { id: '2+kings',           nome: '2 Reis',            abrev: '2Rs', testamento: 'AT', capitulos: 25 },
  { id: '1+chronicles',      nome: '1 Crônicas',        abrev: '1Cr', testamento: 'AT', capitulos: 29 },
  { id: '2+chronicles',      nome: '2 Crônicas',        abrev: '2Cr', testamento: 'AT', capitulos: 36 },
  { id: 'ezra',              nome: 'Esdras',            abrev: 'Ed',  testamento: 'AT', capitulos: 10 },
  { id: 'nehemiah',          nome: 'Neemias',           abrev: 'Ne',  testamento: 'AT', capitulos: 13 },
  { id: 'esther',            nome: 'Ester',             abrev: 'Et',  testamento: 'AT', capitulos: 10 },
  { id: 'job',               nome: 'Jó',                abrev: 'Jó',  testamento: 'AT', capitulos: 42 },
  { id: 'psalms',            nome: 'Salmos',            abrev: 'Sl',  testamento: 'AT', capitulos: 150},
  { id: 'proverbs',          nome: 'Provérbios',        abrev: 'Pv',  testamento: 'AT', capitulos: 31 },
  { id: 'ecclesiastes',      nome: 'Eclesiastes',       abrev: 'Ec',  testamento: 'AT', capitulos: 12 },
  { id: 'song+of+solomon',   nome: 'Cantares',          abrev: 'Ct',  testamento: 'AT', capitulos: 8 },
  { id: 'isaiah',            nome: 'Isaías',            abrev: 'Is',  testamento: 'AT', capitulos: 66 },
  { id: 'jeremiah',          nome: 'Jeremias',          abrev: 'Jr',  testamento: 'AT', capitulos: 52 },
  { id: 'lamentations',      nome: 'Lamentações',       abrev: 'Lm',  testamento: 'AT', capitulos: 5 },
  { id: 'ezekiel',           nome: 'Ezequiel',          abrev: 'Ez',  testamento: 'AT', capitulos: 48 },
  { id: 'daniel',            nome: 'Daniel',            abrev: 'Dn',  testamento: 'AT', capitulos: 12 },
  { id: 'hosea',             nome: 'Oseias',            abrev: 'Os',  testamento: 'AT', capitulos: 14 },
  { id: 'joel',              nome: 'Joel',              abrev: 'Jl',  testamento: 'AT', capitulos: 3 },
  { id: 'amos',              nome: 'Amós',              abrev: 'Am',  testamento: 'AT', capitulos: 9 },
  { id: 'obadiah',           nome: 'Obadias',           abrev: 'Ob',  testamento: 'AT', capitulos: 1 },
  { id: 'jonah',             nome: 'Jonas',             abrev: 'Jn',  testamento: 'AT', capitulos: 4 },
  { id: 'micah',             nome: 'Miqueias',          abrev: 'Mq',  testamento: 'AT', capitulos: 7 },
  { id: 'nahum',             nome: 'Naum',              abrev: 'Na',  testamento: 'AT', capitulos: 3 },
  { id: 'habakkuk',          nome: 'Habacuque',         abrev: 'Hc',  testamento: 'AT', capitulos: 3 },
  { id: 'zephaniah',         nome: 'Sofonias',          abrev: 'Sf',  testamento: 'AT', capitulos: 3 },
  { id: 'haggai',            nome: 'Ageu',              abrev: 'Ag',  testamento: 'AT', capitulos: 2 },
  { id: 'zechariah',         nome: 'Zacarias',          abrev: 'Zc',  testamento: 'AT', capitulos: 14 },
  { id: 'malachi',           nome: 'Malaquias',         abrev: 'Ml',  testamento: 'AT', capitulos: 4 },
  { id: 'matthew',           nome: 'Mateus',            abrev: 'Mt',  testamento: 'NT', capitulos: 28 },
  { id: 'mark',              nome: 'Marcos',            abrev: 'Mc',  testamento: 'NT', capitulos: 16 },
  { id: 'luke',              nome: 'Lucas',             abrev: 'Lc',  testamento: 'NT', capitulos: 24 },
  { id: 'john',              nome: 'João',              abrev: 'Jo',  testamento: 'NT', capitulos: 21 },
  { id: 'acts',              nome: 'Atos',              abrev: 'At',  testamento: 'NT', capitulos: 28 },
  { id: 'romans',            nome: 'Romanos',           abrev: 'Rm',  testamento: 'NT', capitulos: 16 },
  { id: '1+corinthians',     nome: '1 Coríntios',       abrev: '1Co', testamento: 'NT', capitulos: 16 },
  { id: '2+corinthians',     nome: '2 Coríntios',       abrev: '2Co', testamento: 'NT', capitulos: 13 },
  { id: 'galatians',         nome: 'Gálatas',           abrev: 'Gl',  testamento: 'NT', capitulos: 6 },
  { id: 'ephesians',         nome: 'Efésios',           abrev: 'Ef',  testamento: 'NT', capitulos: 6 },
  { id: 'philippians',       nome: 'Filipenses',        abrev: 'Fp',  testamento: 'NT', capitulos: 4 },
  { id: 'colossians',        nome: 'Colossenses',       abrev: 'Cl',  testamento: 'NT', capitulos: 4 },
  { id: '1+thessalonians',   nome: '1 Tessalonicenses', abrev: '1Ts', testamento: 'NT', capitulos: 5 },
  { id: '2+thessalonians',   nome: '2 Tessalonicenses', abrev: '2Ts', testamento: 'NT', capitulos: 3 },
  { id: '1+timothy',         nome: '1 Timóteo',         abrev: '1Tm', testamento: 'NT', capitulos: 6 },
  { id: '2+timothy',         nome: '2 Timóteo',         abrev: '2Tm', testamento: 'NT', capitulos: 4 },
  { id: 'titus',             nome: 'Tito',              abrev: 'Tt',  testamento: 'NT', capitulos: 3 },
  { id: 'philemon',          nome: 'Filemon',           abrev: 'Fm',  testamento: 'NT', capitulos: 1 },
  { id: 'hebrews',           nome: 'Hebreus',           abrev: 'Hb',  testamento: 'NT', capitulos: 13 },
  { id: 'james',             nome: 'Tiago',             abrev: 'Tg',  testamento: 'NT', capitulos: 5 },
  { id: '1+peter',           nome: '1 Pedro',           abrev: '1Pe', testamento: 'NT', capitulos: 5 },
  { id: '2+peter',           nome: '2 Pedro',           abrev: '2Pe', testamento: 'NT', capitulos: 3 },
  { id: '1+john',            nome: '1 João',            abrev: '1Jo', testamento: 'NT', capitulos: 5 },
  { id: '2+john',            nome: '2 João',            abrev: '2Jo', testamento: 'NT', capitulos: 1 },
  { id: '3+john',            nome: '3 João',            abrev: '3Jo', testamento: 'NT', capitulos: 1 },
  { id: 'jude',              nome: 'Judas',             abrev: 'Jd',  testamento: 'NT', capitulos: 1 },
  { id: 'revelation',        nome: 'Apocalipse',        abrev: 'Ap',  testamento: 'NT', capitulos: 22 }
];

export async function fetchBibleChapter(bookId: string, chapter: number): Promise<BibleVerse[]> {
  const cacheKey = `${bookId}:${chapter}`;
  if (chapterCache.has(cacheKey)) return chapterCache.get(cacheKey)!;

  const bookIndexMap: Record<string, number> = {
    'genesis': 1, 'exodus': 2, 'leviticus': 3, 'numbers': 4, 'deuteronomy': 5, 'joshua': 6,
    'judges': 7, 'ruth': 8, '1+samuel': 9, '2+samuel': 10, '1+kings': 11, '2+kings': 12,
    '1+chronicles': 13, '2+chronicles': 14, 'ezra': 15, 'nehemiah': 16, 'esther': 17,
    'job': 18, 'psalms': 19, 'proverbs': 20, 'ecclesiastes': 21, 'song+of+solomon': 22,
    'isaiah': 23, 'jeremiah': 24, 'lamentations': 25, 'ezekiel': 26, 'daniel': 27,
    'hosea': 28, 'joel': 29, 'amos': 30, 'obadiah': 31, 'jonah': 32, 'micah': 33,
    'nahum': 34, 'habakkuk': 35, 'zephaniah': 36, 'haggai': 37, 'zechariah': 38,
    'malachi': 39, 'matthew': 40, 'mark': 41, 'luke': 42, 'john': 43, 'acts': 44,
    'romans': 45, '1+corinthians': 46, '2+corinthians': 47, 'galatians': 48,
    'ephesians': 49, 'philippians': 50, 'colossians': 51, '1+thessalonians': 52,
    '2+thessalonians': 53, '1+timothy': 54, '2+timothy': 55, 'titus': 56,
    'philemon': 57, 'hebrews': 58, 'james': 59, '1+peter': 60, '2+peter': 61,
    '1+john': 62, '2+john': 63, '3+john': 64, 'jude': 65, 'revelation': 66
  };

  try {
    const bookIdx = bookIndexMap[bookId] || 1;
    const url = `https://bolls.life/get-text/ACF/${bookIdx}/${chapter}/`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    const verses = (data || []).map((v: any) => ({
      book_id: bookId,
      book_name: '',
      chapter: chapter,
      verse: v.verse,
      text: v.text.trim()
    }));
    chapterCache.set(cacheKey, verses);
    return verses;
  } catch (err) {
    console.error('Bible load error:', err);
    return [];
  }
}
