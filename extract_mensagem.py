#!/usr/bin/env python3
"""
Extrai a Bíblia A Mensagem do PDF e gera bible_mensagem.json
no mesmo formato de bible_acf.json (array de 66 livros, cada um com chapters[])
"""

import pdfplumber
import json
import re
import sys

PDF_PATH = "/Users/aquillesantonysantiagosantos/Downloads/discipulado-kefel/biblia-a-mensagem_compress.pdf"
OUT_PATH = "/Users/aquillesantonysantiagosantos/Downloads/discipulado-kefel/public/data/bible_mensagem.json"

# Nomes dos 66 livros em ordem canônica (para mapeamento)
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

# Aliases para reconhecer os livros no PDF (variações de grafia)
BOOK_ALIASES = {
    "Gênesis": ["Gênesis", "Genesis"],
    "Êxodo": ["Êxodo", "Exodo"],
    "Levítico": ["Levítico", "Levitico"],
    "Números": ["Números", "Numeros"],
    "Deuteronômio": ["Deuteronômio", "Deuteronomio"],
    "Josué": ["Josué", "Josue"],
    "Juízes": ["Juízes", "Juizes"],
    "Rute": ["Rute"],
    "1 Samuel": ["1 Samuel"],
    "2 Samuel": ["2 Samuel"],
    "1 Reis": ["1 Reis"],
    "2 Reis": ["2 Reis"],
    "1 Crônicas": ["1 Crônicas", "1 Cronicas"],
    "2 Crônicas": ["2 Crônicas", "2 Cronicas"],
    "Esdras": ["Esdras"],
    "Neemias": ["Neemias"],
    "Ester": ["Ester"],
    "Jó": ["Jó", "Jo"],
    "Salmos": ["Salmos"],
    "Provérbios": ["Provérbios", "Proverbios"],
    "Eclesiastes": ["Eclesiastes"],
    "Cantares": ["Cantares", "Cântico dos Cânticos", "Cantico"],
    "Isaías": ["Isaías", "Isaias"],
    "Jeremias": ["Jeremias"],
    "Lamentações": ["Lamentações", "Lamentacoes"],
    "Ezequiel": ["Ezequiel"],
    "Daniel": ["Daniel"],
    "Oseias": ["Oseias", "Oséias"],
    "Joel": ["Joel"],
    "Amós": ["Amós", "Amos"],
    "Obadias": ["Obadias"],
    "Jonas": ["Jonas"],
    "Miqueias": ["Miqueias"],
    "Naum": ["Naum"],
    "Habacuque": ["Habacuque"],
    "Sofonias": ["Sofonias"],
    "Ageu": ["Ageu"],
    "Zacarias": ["Zacarias"],
    "Malaquias": ["Malaquias"],
    "Mateus": ["Mateus"],
    "Marcos": ["Marcos"],
    "Lucas": ["Lucas"],
    "João": ["João", "Joao"],
    "Atos": ["Atos"],
    "Romanos": ["Romanos"],
    "1 Coríntios": ["1 Coríntios", "1 Corintios"],
    "2 Coríntios": ["2 Coríntios", "2 Corintios"],
    "Gálatas": ["Gálatas", "Galatas"],
    "Efésios": ["Efésios", "Efesios"],
    "Filipenses": ["Filipenses"],
    "Colossenses": ["Colossenses"],
    "1 Tessalonicenses": ["1 Tessalonicenses"],
    "2 Tessalonicenses": ["2 Tessalonicenses"],
    "1 Timóteo": ["1 Timóteo", "1 Timoteo"],
    "2 Timóteo": ["2 Timóteo", "2 Timoteo"],
    "Tito": ["Tito"],
    "Filemon": ["Filemon", "Filêmon"],
    "Hebreus": ["Hebreus"],
    "Tiago": ["Tiago"],
    "1 Pedro": ["1 Pedro"],
    "2 Pedro": ["2 Pedro"],
    "1 João": ["1 João", "1 Joao"],
    "2 João": ["2 João", "2 Joao"],
    "3 João": ["3 João", "3 Joao"],
    "Judas": ["Judas"],
    "Apocalipse": ["Apocalipse"],
}

# Número de capítulos por livro
BOOK_CHAPTERS = [
    50, 40, 27, 36, 34, 24, 21, 4, 31, 24,
    22, 25, 29, 36, 10, 13, 10, 42, 150, 31,
    12, 8, 66, 52, 5, 48, 12, 14, 3, 9,
    1, 4, 7, 3, 3, 3, 2, 14, 4,
    28, 16, 24, 21, 28, 16, 16, 13, 6, 6,
    4, 4, 5, 3, 6, 4, 3, 1, 13,
    5, 5, 3, 5, 1, 1, 1, 22
]

def build_alias_map():
    """Cria um map de alias -> nome canônico"""
    alias_map = {}
    for canonical, aliases in BOOK_ALIASES.items():
        for alias in aliases:
            alias_map[alias.lower()] = canonical
    return alias_map

def extract_all_text(pdf_path):
    """Extrai todo o texto do PDF página a página"""
    print("Extraindo texto do PDF...")
    pages_text = []
    with pdfplumber.open(pdf_path) as pdf:
        total = len(pdf.pages)
        for i, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            pages_text.append(text)
            if (i + 1) % 100 == 0:
                print(f"  Processado: {i+1}/{total} páginas")
    print(f"  Total: {total} páginas extraídas")
    return pages_text

def detect_book(line, alias_map):
    """Verifica se uma linha é o título de um livro bíblico"""
    stripped = line.strip()
    # Remover possíveis números de página ou prefixos
    cleaned = stripped.strip()
    return alias_map.get(cleaned.lower())

def parse_bible_text(pages_text, alias_map):
    """
    Parseia o texto extraído e organiza em estrutura de livros/capítulos/versículos.
    Retorna: dict { canonical_book_name: { chapter_num: [verse_texts] } }
    """
    # Formato do PDF: "cap: vers-vers Texto" ou "cap: vers Texto" ou só versículo dentro do capítulo
    
    bible = { name: {} for name in BOOK_NAMES }
    
    current_book = None
    current_chapter = None
    pending_text = []  # Acumula texto de versículos multi-linha
    
    # Padrão: início de capítulo+versículo: "3: 1 texto" ou "3: 1-5 texto"
    # também pode aparecer como "3: 1-5" sozinho na linha
    cap_verse_pattern = re.compile(r'^(\d+):\s+(\d+(?:-\d+)?)\s+(.*)')
    # Padrão: só versículo (sem número de capítulo repetido): "15 texto" ou "15-20 texto"
    verse_only_pattern = re.compile(r'^(\d+(?:-\d+)?)\s+((?:[A-ZÁÉÍÓÚÀÂÊÔÃÕÜÇ"].{3,}|[a-záéíóúàâêôãõüç"].{3,}))')
    
    # Merge all pages into one big string, split by line
    all_lines = []
    for pg_text in pages_text:
        for line in pg_text.split('\n'):
            all_lines.append(line)
    
    i = 0
    verse_buffer = {}  # chapter -> list of (verse_num, text)
    
    def flush_pending():
        nonlocal pending_text
        result = " ".join(pending_text).strip()
        pending_text = []
        return result
    
    def save_verse(book, chap, verse_start, verse_end, text):
        if not book or not chap:
            return
        if chap not in bible[book]:
            bible[book][chap] = {}
        # Se é intervalo de versículos, atribui o texto ao primeiro versículo para agrupamento
        # Na versão A Mensagem, versículos agrupados ficam em um único bloco de texto
        for v in range(verse_start, verse_end + 1):
            if v == verse_start:
                bible[book][chap][v] = text
            else:
                # Versículos "secundários" do grupo apontam para o texto do primeiro
                if v not in bible[book][chap]:
                    bible[book][chap][v] = ""  # placeholder
    
    last_chapter_seen = None
    last_verse_seen = None
    continuation_text = ""
    
    for line_idx, line in enumerate(all_lines):
        line = line.strip()
        if not line:
            continue
        
        # --- Detectar título de livro ---
        canonical = detect_book(line, alias_map)
        if canonical:
            current_book = canonical
            current_chapter = None
            last_chapter_seen = None
            last_verse_seen = None
            print(f"  Livro detectado: {canonical}")
            continue
        
        if not current_book:
            continue
        
        # --- Detectar padrão "CAP: VERS texto" ---
        m = cap_verse_pattern.match(line)
        if m:
            chap_num = int(m.group(1))
            verse_range = m.group(2)
            text = m.group(3).strip()
            
            # Parsear range de versículos
            if '-' in verse_range:
                parts = verse_range.split('-')
                v_start = int(parts[0])
                v_end = int(parts[1])
            else:
                v_start = int(verse_range)
                v_end = v_start
            
            current_chapter = chap_num
            last_chapter_seen = chap_num
            last_verse_seen = v_start
            
            if chap_num not in bible[current_book]:
                bible[current_book][chap_num] = {}
            
            # Salvar versículo
            combined = verse_range + " " + text if text else verse_range
            bible[current_book][chap_num][v_start] = combined
            # Preencher versículos do range
            for v in range(v_start + 1, v_end + 1):
                if v not in bible[current_book][chap_num]:
                    bible[current_book][chap_num][v] = ""
            continue
        
        # --- Continuação do último versículo (linha sem número de versículo) ---
        if current_book and current_chapter and last_verse_seen:
            # Se a linha não começa com número e parece texto do versículo anterior,
            # acumula ao último versículo
            m2 = verse_only_pattern.match(line)
            if m2:
                # É um versículo sem número de capítulo
                verse_range = m2.group(1)
                text = m2.group(2).strip()
                if '-' in verse_range:
                    parts = verse_range.split('-')
                    v_start = int(parts[0])
                    v_end = int(parts[1])
                else:
                    v_start = int(verse_range)
                    v_end = v_start
                
                last_verse_seen = v_start
                if current_chapter not in bible[current_book]:
                    bible[current_book][current_chapter] = {}
                
                combined = verse_range + " " + text
                bible[current_book][current_chapter][v_start] = combined
                for v in range(v_start + 1, v_end + 1):
                    if v not in bible[current_book][current_chapter]:
                        bible[current_book][current_chapter][v] = ""
            else:
                # Linha de continuação — acumula ao último versículo
                if current_chapter in bible[current_book] and last_verse_seen in bible[current_book][current_chapter]:
                    current_text = bible[current_book][current_chapter][last_verse_seen]
                    if current_text:
                        bible[current_book][current_chapter][last_verse_seen] = current_text + " " + line
    
    return bible

def bible_to_json_format(bible_dict):
    """
    Converte o dict para o formato do app:
    Array de 66 livros, cada um com:
    { abbrev, chapters: [ [verse1, verse2, ...], [...] ] }
    """
    result = []
    
    for idx, book_name in enumerate(BOOK_NAMES):
        book_data = bible_dict.get(book_name, {})
        num_chapters = BOOK_CHAPTERS[idx]
        
        chapters = []
        for chap_num in range(1, num_chapters + 1):
            chap_data = book_data.get(chap_num, {})
            
            if not chap_data:
                # Capítulo não encontrado — criar placeholder
                chapters.append([f"[Capítulo {chap_num} não encontrado no PDF]"])
                continue
            
            # Converter dict de versículos em array ordenado
            max_verse = max(chap_data.keys()) if chap_data else 0
            verses = []
            for v in range(1, max_verse + 1):
                text = chap_data.get(v, "")
                verses.append(text if text else "")
            
            # Remover versículos vazios do final
            while verses and not verses[-1]:
                verses.pop()
            
            chapters.append(verses if verses else [f"[Capítulo {chap_num}]"])
        
        result.append({
            "abbrev": book_name[:3].lower(),
            "name": book_name,
            "chapters": chapters
        })
        print(f"  [{idx+1}/66] {book_name}: {len([c for c in chapters if len(c) > 0])} capítulos")
    
    return result

def main():
    alias_map = build_alias_map()
    
    print("=== Extraindo texto do PDF ===")
    pages_text = extract_all_text(PDF_PATH)
    
    print("\n=== Parseando estrutura bíblica ===")
    bible = parse_bible_text(pages_text, alias_map)
    
    print("\n=== Verificando cobertura ===")
    uncovered = []
    for idx, name in enumerate(BOOK_NAMES):
        chaps = bible.get(name, {})
        if not chaps:
            uncovered.append(name)
            print(f"  AVISO: {name} sem dados!")
        else:
            total_verses = sum(len(v) for v in chaps.values())
            print(f"  {name}: {len(chaps)} capítulos, {total_verses} versículos")
    
    print(f"\n=== Convertendo para formato do app ===")
    json_data = bible_to_json_format(bible)
    
    print(f"\n=== Salvando em {OUT_PATH} ===")
    with open(OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(json_data, f, ensure_ascii=False, separators=(',', ':'))
    
    import os
    size_mb = os.path.getsize(OUT_PATH) / 1024 / 1024
    print(f"  Arquivo salvo: {size_mb:.1f} MB")
    print("\nConcluído!")

if __name__ == '__main__':
    main()
