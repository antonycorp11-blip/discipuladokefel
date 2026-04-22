#!/usr/bin/env python3
import pypdf
import json
import re
import os

PDF_PATH = "/Users/aquillesantonysantiagosantos/Downloads/discipulado-kefel/biblia-a-mensagem_compress.pdf"
OUT_PATH = "/Users/aquillesantonysantiagosantos/Downloads/discipulado-kefel/public/data/bible_mensagem.json"

BOOK_NAMES = [
    "Gênesis", "Êxodo", "Levítico", "Números", "Deuteronômio",
    "Josué", "Juízes", "Rute", "1 Samuel", "2 Samuel",
    "1 Reis", "2 Reis", "1 Crônicas", "2 Crônicas", "Esdras",
    "Neemias", "Ester", "Jó", "Salmos", "Provérbios",
    "Eclesiastes", "Cantares", "Isaías", "Jeremias", "Lamentações",
    "Ezequiel", "Daniel", "Oseias", "Joel", "Amós",
    "Obadias", "Jonas", "Miqueias", "Naum", "Habacuque",
    "Sofonias", "Ageu", "Zacarias", "Malaquias",
    "Mateus", "Marcos", "Lucas", "João", "Atos",
    "Romanos", "1 Coríntios", "2 Coríntios", "Gálatas", "Efésios",
    "Filipenses", "Colossenses", "1 Tessalonicenses", "2 Tessalonicenses",
    "1 Timóteo", "2 Timóteo", "Tito", "Filemon", "Hebreus",
    "Tiago", "1 Pedro", "2 Pedro", "1 João", "2 João",
    "3 João", "Judas", "Apocalipse"
]

def get_book_regex(name):
    # Transforma "1 Samuel" em algo que pegue "1 Samuel", "1Samuel", "Primeiro Samuel", "I Samuel"
    base = name
    if name.startswith("1 "): base = r"(1|I|Primeiro)\s*" + name[2:]
    elif name.startswith("2 "): base = r"(2|II|Segundo)\s*" + name[2:]
    elif name.startswith("3 "): base = r"(3|III|Terceiro)\s*" + name[2:]
    # Escapar para regex e permitir espaços/caixa alta
    pattern = r"^\s*" + base + r"\s*$"
    return re.compile(pattern, re.IGNORECASE)

BOOK_REGEXES = [(name, get_book_regex(name)) for name in BOOK_NAMES]

def extract():
    print(f"Lendo PDF: {PDF_PATH}")
    reader = pypdf.PdfReader(PDF_PATH)
    total_pages = len(reader.pages)
    bible = {name: {} for name in BOOK_NAMES}
    
    current_book = None
    current_chapter = None
    last_verse = None
    
    cp_vs_pattern = re.compile(r'^(\d+):\s*(\d+(?:-\d+)?)')
    vs_only_pattern = re.compile(r'^(\d+(?:-\d+)?)\s+')

    print("Iniciando extração com detecção aprimorada...")
    for pg_idx in range(total_pages):
        page = reader.pages[pg_idx]
        text = page.extract_text()
        if not text: continue
        
        lines = text.split('\n')
        for line in lines:
            line_clean = line.strip()
            if not line_clean: continue
            
            # 1. Detectar Livro
            found_book = None
            if len(line_clean) < 30: # Títulos são curtos
                for bname, regex in BOOK_REGEXES:
                    if regex.match(line_clean):
                        found_book = bname
                        break
            
            if found_book:
                current_book = found_book
                current_chapter = None
                last_verse = None
                print(f"  > [{pg_idx+1}/{total_pages}] {current_book}")
                continue
            
            if not current_book: continue
            
            # 2. Detectar Capítulo:Versículo
            m = cp_vs_pattern.match(line_clean)
            if m:
                current_chapter = int(m.group(1))
                v_range = m.group(2)
                try:
                    v_start = int(v_range.split('-')[0])
                    content = line_clean[m.end():].strip()
                    if current_chapter not in bible[current_book]:
                        bible[current_book][current_chapter] = {}
                    bible[current_book][current_chapter][v_start] = f"({v_range}) " + content
                    last_verse = v_start
                except: pass
            else:
                # 3. Detectar apenas Versículo
                m_vs = vs_only_pattern.match(line_clean)
                if m_vs and current_chapter:
                    v_range = m_vs.group(1)
                    try:
                        v_start = int(v_range.split('-')[0])
                        # Proteção simples contra números de página (geralmente no fim/início)
                        if last_verse and v_start > last_verse + 100: pass 
                        else:
                            content = line_clean[m_vs.end():].strip()
                            bible[current_book][current_chapter][v_start] = f"({v_range}) " + content
                            last_verse = v_start
                            continue
                    except: pass
                
                # 4. Continuação
                if current_book and current_chapter and last_verse:
                    if last_verse in bible[current_book][current_chapter]:
                        # Ignorar linhas que parecem números de página sozinhos
                        if not re.match(r'^\d+$', line_clean):
                            bible[current_book][current_chapter][last_verse] += " " + line_clean

    print("Formatando JSON final...")
    final_data = []
    
    # Número esperado de capítulos por livro (para garantir que o JSON tenha todos os slots)
    EXPECTED_CHAPS = {
        "Salmos": 150, "Gênesis": 50, "Êxodo": 40, "Levítico": 27, "Números": 36, "Deuteronômio": 34,
        "Josué": 24, "Juízes": 21, "Rute": 4, "1 Samuel": 31, "2 Samuel": 24, "1 Reis": 22, "2 Reis": 25,
        "1 Crônicas": 29, "2 Crônicas": 36, "Esdras": 10, "Neemias": 13, "Ester": 10, "Jó": 42,
        "Provérbios": 31, "Eclesiastes": 12, "Cantares": 8, "Isaías": 66, "Jeremias": 52, "Lamentações": 5,
        "Ezequiel": 48, "Daniel": 12, "Oseias": 14, "Joel": 3, "Amós": 9, "Obadias": 1, "Jonas": 4,
        "Miqueias": 7, "Naum": 3, "Habacuque": 3, "Sofonias": 3, "Ageu": 2, "Zacarias": 14, "Malaquias": 4,
        "Mateus": 28, "Marcos": 16, "Lucas": 24, "João": 21, "Atos": 28, "Romanos": 16, "1 Coríntios": 16,
        "2 Coríntios": 13, "Gálatas": 6, "Efésios": 6, "Filipenses": 4, "Colossenses": 4, "1 Tessalonicenses": 5,
        "2 Tessalonicenses": 3, "1 Timóteo": 6, "2 Timóteo": 4, "Tito": 3, "Filemon": 1, "Hebreus": 13,
        "Tiago": 5, "1 Pedro": 5, "2 Pedro": 3, "1 João": 5, "2 João": 1, "3 João": 1, "Judas": 1, "Apocalipse": 22
    }

    for bname in BOOK_NAMES:
        book_obj = {"abbrev": bname.lower()[:3], "name": bname, "chapters": []}
        book_data = bible[bname]
        
        total_chaps = EXPECTED_CHAPS.get(bname, max(book_data.keys()) if book_data else 1)
        
        for c in range(1, total_chaps + 1):
            chap_data = book_data.get(c, {})
            if not chap_data:
                book_obj["chapters"].append(["[Capítulo não encontrado no PDF]"])
                continue
            
            max_v = max(chap_data.keys())
            verses = []
            for v in range(1, max_v + 1):
                v_text = chap_data.get(v, "")
                # Limpeza final do texto
                v_text = re.sub(r'\s+', ' ', v_text).strip()
                verses.append(v_text if v_text else "")
            book_obj["chapters"].append(verses)
        
        final_data.append(book_obj)

    with open(OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(final_data, f, ensure_ascii=False, indent=0)
    
    print(f"Sucesso! Bíblia completa salva em {OUT_PATH}")

if __name__ == "__main__":
    extract()
