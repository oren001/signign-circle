import fitz

def check_end(pdf_path):
    doc = fitz.open(pdf_path)
    total = len(doc)
    for i in range(total - 10, total):
        page = doc.load_page(i)
        print(f"\n--- Page {i+1} ---")
        print(page.get_text())

if __name__ == "__main__":
    check_end("songbook.pdf")
