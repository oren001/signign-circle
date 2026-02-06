import fitz

def test_hebrew(pdf_path, start, end):
    doc = fitz.open(pdf_path)
    for i in range(start-1, end):
        page = doc.load_page(i)
        text = page.get_text().strip()
        print(f"\n--- Page {i+1} ---")
        print(f"[{text[:100]}]")

if __name__ == "__main__":
    test_hebrew("songbook.pdf", 13, 25)
