import fitz  # PyMuPDF
import json
import os

def split_pdf(pdf_path, output_folder):
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
    
    doc = fitz.open(pdf_path)
    new_songs = []
    
    print(f"Total pages: {len(doc)}")
    
    for i in range(len(doc)):
        page = doc.load_page(i)
        
        # Try to extract the first line of text as the title
        text = page.get_text().strip().split('\n')
        title = text[0] if text else f"Page {i+1}"
        if len(title) > 50: title = f"Page {i+1}" # Fallback if first line is too long
        
        image_name = f"page_{i+1:03d}.png"
        image_path = os.path.join(output_folder, image_name)
        
        # Render page to image
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2)) # Double resolution
        pix.save(image_path)
        
        new_songs.append({
            "id": f"book-page-{i+1}",
            "title": f"ספר שירים - {title}",
            "type": "image",
            "source": f"songs/{image_name}",
            "votes": 0,
            "addedBy": "system"
        })
        print(f"Processed page {i+1}/{len(doc)}: {title}")
    
    return new_songs

if __name__ == "__main__":
    songs_dir = "songs"
    pdf_file = "songbook.pdf"
    
    songs_data = split_pdf(pdf_file, songs_dir)
    
    # Update song-data.json
    with open("song-data.json", "r", encoding="utf-8") as f:
        existing_data = json.load(f)
    
    # Add new songs to the list
    existing_data["songs"].extend(songs_data)
    
    with open("song-data.json", "w", encoding="utf-8") as f:
        json.dump(existing_data, f, ensure_ascii=False, indent=2)
    
    print("Done! song-data.json updated.")
