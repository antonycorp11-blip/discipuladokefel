// Importação dinâmica para não pesar no carregamento inicial do app
const bibleData: Record<string, any> = {};

export interface BibleVerse {
  book_id: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface BibleBook {
  id: string; // ID numérico (1-66) usado no JSON
  nome: string;
  abrev: string;
  testamento: 'AT' | 'NT';
  capitulos: number;
}

// Mapeamento de nomes e abreviações da Bíblia ACF (Ordenado por índice 0-65)
export const BIBLE_BOOKS: BibleBook[] = [
  { id: '1', nome: 'Gênesis', abrev: 'Gn', testamento: 'AT', capitulos: 50 },
  { id: '2', nome: 'Êxodo', abrev: 'Ex', testamento: 'AT', capitulos: 40 },
  { id: '3', nome: 'Levítico', abrev: 'Lv', testamento: 'AT', capitulos: 27 },
  { id: '4', nome: 'Números', abrev: 'Nm', testamento: 'AT', capitulos: 36 },
  { id: '5', nome: 'Deuteronômio', abrev: 'Dt', testamento: 'AT', capitulos: 34 },
  { id: '6', nome: 'Josué', abrev: 'Js', testamento: 'AT', capitulos: 24 },
  { id: '7', nome: 'Juízes', abrev: 'Jz', testamento: 'AT', capitulos: 21 },
  { id: '8', nome: 'Rute', abrev: 'Rt', testamento: 'AT', capitulos: 4 },
  { id: '9', nome: '1 Samuel', abrev: '1Sm', testamento: 'AT', capitulos: 31 },
  { id: '10', nome: '2 Samuel', abrev: '2Sm', testamento: 'AT', capitulos: 24 },
  { id: '11', nome: '1 Reis', abrev: '1Rs', testamento: 'AT', capitulos: 22 },
  { id: '12', nome: '2 Reis', abrev: '2Rs', testamento: 'AT', capitulos: 25 },
  { id: '13', nome: '1 Crônicas', abrev: '1Cr', testamento: 'AT', capitulos: 29 },
  { id: '14', nome: '2 Crônicas', abrev: '2Cr', testamento: 'AT', capitulos: 36 },
  { id: '15', nome: 'Esdras', abrev: 'Ed', testamento: 'AT', capitulos: 10 },
  { id: '16', nome: 'Neemias', abrev: 'Ne', testamento: 'AT', capitulos: 13 },
  { id: '17', nome: 'Ester', abrev: 'Et', testamento: 'AT', capitulos: 10 },
  { id: '18', nome: 'Jó', abrev: 'Jo', testamento: 'AT', capitulos: 42 },
  { id: '19', nome: 'Salmos', abrev: 'Sl', testamento: 'AT', capitulos: 150 },
  { id: '20', nome: 'Provérbios', abrev: 'Pv', testamento: 'AT', capitulos: 31 },
  { id: '21', nome: 'Eclesiastes', abrev: 'Ec', testamento: 'AT', capitulos: 12 },
  { id: '22', nome: 'Cantares', abrev: 'Ct', testamento: 'AT', capitulos: 8 },
  { id: '23', nome: 'Isaías', abrev: 'Is', testamento: 'AT', capitulos: 66 },
  { id: '24', nome: 'Jeremias', abrev: 'Jr', testamento: 'AT', capitulos: 52 },
  { id: '25', nome: 'Lamentações', abrev: 'Lm', testamento: 'AT', capitulos: 5 },
  { id: '26', nome: 'Ezequiel', abrev: 'Ez', testamento: 'AT', capitulos: 48 },
  { id: '27', nome: 'Daniel', abrev: 'Dn', testamento: 'AT', capitulos: 12 },
  { id: '28', nome: 'Oseias', abrev: 'Os', testamento: 'AT', capitulos: 14 },
  { id: '29', nome: 'Joel', abrev: 'Jl', testamento: 'AT', capitulos: 3 },
  { id: '30', nome: 'Amós', abrev: 'Am', testamento: 'AT', capitulos: 9 },
  { id: '31', nome: 'Obadias', abrev: 'Ob', testamento: 'AT', capitulos: 1 },
  { id: '32', nome: 'Jonas', abrev: 'Jn', testamento: 'AT', capitulos: 4 },
  { id: '33', nome: 'Miqueias', abrev: 'Mq', testamento: 'AT', capitulos: 7 },
  { id: '34', nome: 'Naum', abrev: 'Na', testamento: 'AT', capitulos: 3 },
  { id: '35', nome: 'Habacuque', abrev: 'Hc', testamento: 'AT', capitulos: 3 },
  { id: '36', nome: 'Sofonias', abrev: 'Sf', testamento: 'AT', capitulos: 3 },
  { id: '37', nome: 'Ageu', abrev: 'Ag', testamento: 'AT', capitulos: 2 },
  { id: '38', nome: 'Zacarias', abrev: 'Zc', testamento: 'AT', capitulos: 14 },
  { id: '39', nome: 'Malaquias', abrev: 'Ml', testamento: 'AT', capitulos: 4 },
  { id: '40', nome: 'Mateus', abrev: 'Mt', testamento: 'NT', capitulos: 28 },
  { id: '41', nome: 'Marcos', abrev: 'Mc', testamento: 'NT', capitulos: 16 },
  { id: '42', nome: 'Lucas', abrev: 'Lc', testamento: 'NT', capitulos: 24 },
  { id: '43', nome: 'João', abrev: 'Jo', testamento: 'NT', capitulos: 21 },
  { id: '44', nome: 'Atos', abrev: 'At', testamento: 'NT', capitulos: 28 },
  { id: '45', nome: 'Romanos', abrev: 'Rm', testamento: 'NT', capitulos: 16 },
  { id: '46', nome: '1 Coríntios', abrev: '1Co', testamento: 'NT', capitulos: 16 },
  { id: '47', nome: '2 Coríntios', abrev: '2Co', testamento: 'NT', capitulos: 13 },
  { id: '48', nome: 'Gálatas', abrev: 'Gl', testamento: 'NT', capitulos: 6 },
  { id: '49', nome: 'Efésios', abrev: 'Ef', testamento: 'NT', capitulos: 6 },
  { id: '50', nome: 'Filipenses', abrev: 'Fp', testamento: 'NT', capitulos: 4 },
  { id: '51', nome: 'Colossenses', abrev: 'Cl', testamento: 'NT', capitulos: 4 },
  { id: '52', nome: '1 Tessalonicenses', abrev: '1Ts', testamento: 'NT', capitulos: 5 },
  { id: '53', nome: '2 Tessalonicenses', abrev: '2Ts', testamento: 'NT', capitulos: 3 },
  { id: '54', nome: '1 Timóteo', abrev: '1Tm', testamento: 'NT', capitulos: 6 },
  { id: '55', nome: '2 Timóteo', abrev: '2Tm', testamento: 'NT', capitulos: 4 },
  { id: '56', nome: 'Tito', abrev: 'Tt', testamento: 'NT', capitulos: 3 },
  { id: '57', nome: 'Filemon', abrev: 'Fm', testamento: 'NT', capitulos: 1 },
  { id: '58', nome: 'Hebreus', abrev: 'Hb', testamento: 'NT', capitulos: 13 },
  { id: '59', nome: 'Tiago', abrev: 'Tg', testamento: 'NT', capitulos: 5 },
  { id: '60', nome: '1 Pedro', abrev: '1Pe', testamento: 'NT', capitulos: 5 },
  { id: '61', nome: '2 Pedro', abrev: '2Pe', testamento: 'NT', capitulos: 3 },
  { id: '62', nome: '1 João', abrev: '1Jo', testamento: 'NT', capitulos: 5 },
  { id: '63', nome: '2 João', abrev: '2Jo', testamento: 'NT', capitulos: 1 },
  { id: '64', nome: '3 João', abrev: '3Jo', testamento: 'NT', capitulos: 1 },
  { id: '65', nome: 'Judas', abrev: 'Jd', testamento: 'NT', capitulos: 1 },
  { id: '66', nome: 'Apocalipse', abrev: 'Ap', testamento: 'NT', capitulos: 22 },
];

export async function fetchBibleChapter(bookId: string, chapter: number, version: string = 'acf'): Promise<BibleVerse[]> {
  try {
    // Carrega o JSON local em cache conforme a versão
    if (!bibleData[version]) {
      const response = await fetch(`/data/bible_${version}.json`);
      if (!response.ok) throw new Error('Versão não encontrada');
      bibleData[version] = await response.json();
    }

    // O arquivo é um array de 66 objetos (um para cada livro)
    // Usamos o bookId (1 a 66) como índice (0 a 65)
    const bookIdx = parseInt(bookId) - 1;
    const book = bibleData[version][bookIdx];

    if (!book || !book.chapters[chapter - 1]) {
      return [];
    }

    // Converte o array de strings em versículos estruturados
    return book.chapters[chapter - 1].map((text: string, idx: number) => ({
      book_id: bookId,
      chapter: chapter,
      verse: idx + 1,
      text: text.trim()
    }));
  } catch (err) {
    console.error('Falha ao carregar Bíblia offline:', err);
    return [];
  }
}
