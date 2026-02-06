import fitz

def analyze_pages(pdf_path, num_pages=20):
    doc = fitz.open(pdf_path)
    for i in range(min(num_pages, len(doc))):
        page = doc.load_page(i)
        blocks = page.get_text("blocks")
        print(f"\n--- Page {i+1} ---")
        for b in blocks[:5]: # Look at first 5 blocks
            print(f"[{b[4].strip()}]")

if __name__ == "__main__":
    analyze_pages("songbook.pdf")
