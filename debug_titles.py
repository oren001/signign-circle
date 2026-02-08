
import fitz

def extract_all_titles():
    doc = fitz.open('songbook.pdf')
    with open('pdf_titles_debug.txt', 'w', encoding='utf-8') as f:
        for i in range(len(doc)):
            page = doc.load_page(i)
            # Try to get the first block of text
            blocks = page.get_text("blocks")
            title = ""
            if blocks:
                # Find the block closest to the top
                sorted_blocks = sorted(blocks, key=lambda b: b[1])
                for b in sorted_blocks:
                    content = b[4].strip()
                    if content and not content.isdigit() and len(content) > 3:
                        title = content.split('\n')[0]
                        break
            
            f.write(f"Page {i+1}: {title}\n")
    print("Done. Saved to pdf_titles_debug.txt")

if __name__ == "__main__":
    extract_all_titles()
