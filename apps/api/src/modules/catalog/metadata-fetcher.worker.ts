import { db } from '../../config/db.js'
import { storeCoverImage } from './cover-image.storage.ts'

const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes?q=isbn:'
const OPEN_LIBRARY_JSON_API = 'https://openlibrary.org/api/books?format=json&jscmd=data&bibkeys=ISBN:'
const OPEN_LIBRARY_IMG_API = 'https://covers.openlibrary.org/b/isbn/'

export async function fetchMissingMetadata() {
  const connection = await db.getConnection()
  try {
    const [rows] = await connection.query<any[]>(
      `SELECT title_id, isbn, cover_image_path, synopsis FROM titles 
       WHERE record_type = 'Book' 
         AND (cover_image_path IS NULL OR synopsis IS NULL)
         AND isbn IS NOT NULL 
         AND isbn != ''
       ORDER BY title_id DESC 
       LIMIT 10`
    )

    for (const row of rows) {
      const isbn = row.isbn
      let imageUrl: string | null = null
      let synopsis: string | null = null
      let storedCoverPath: string | null = null

      try {
        // Try Open Library first (JSON)
        const olResponse = await fetch(`${OPEN_LIBRARY_JSON_API}${isbn}`)
        if (olResponse.ok) {
          const olData = await olResponse.json()
          const bookData = olData[`ISBN:${isbn}`]
          if (bookData) {
            if (bookData.cover?.large) imageUrl = bookData.cover.large
            else if (bookData.cover?.medium) imageUrl = bookData.cover.medium
            if (bookData.excerpts?.[0]?.text) synopsis = bookData.excerpts[0].text
          }
        }
        
        // Fallback to Google Books for missing parts
        if (!imageUrl || !synopsis) {
          const gbResponse = await fetch(`${GOOGLE_BOOKS_API}${isbn}`)
          if (gbResponse.ok) {
            const gbData = await gbResponse.json()
            if (gbData.items && gbData.items.length > 0) {
              const volumeInfo = gbData.items[0].volumeInfo
              if (!imageUrl && volumeInfo?.imageLinks?.thumbnail) {
                imageUrl = volumeInfo.imageLinks.thumbnail.replace('http:', 'https:')
              }
              if (!synopsis && volumeInfo?.description) {
                synopsis = volumeInfo.description
              }
            }
          }
        }

        // Third Fallback: Open Library Direct Image API
        if (!imageUrl) {
          imageUrl = `${OPEN_LIBRARY_IMG_API}${isbn}-L.jpg` // -L for large. Open Library returns a 1x1 GIF if not found, we will check the size later.
        }
      } catch (err) {
        console.error(`Failed to fetch metadata for ISBN ${isbn}:`, err)
      }

      if (imageUrl && row.cover_image_path === null) {
        try {
          const imageResponse = await fetch(imageUrl)
          if (imageResponse.ok) {
            const arrayBuffer = await imageResponse.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)
            
            // Check if it's the 1x1 pixel fallback from OpenLibrary (usually < 100 bytes)
            if (buffer.length > 200) {
              const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'
              const base64 = buffer.toString('base64')
              const dataUri = `data:${contentType};base64,${base64}`
              storedCoverPath = await storeCoverImage(dataUri)
            }
          }
        } catch (err) {
          console.error(`Failed to download cover for ISBN ${isbn}:`, err)
        }
      }

      // Update Database
      const finalCoverPath = storedCoverPath || row.cover_image_path || 'none'
      const finalSynopsis = synopsis || row.synopsis || '[No synopsis available]'

      await connection.execute(
        `UPDATE titles SET cover_image_path = ?, synopsis = ? WHERE title_id = ?`,
        [finalCoverPath, finalSynopsis, row.title_id]
      )
      
      // Respect rate limits
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  } catch (error) {
    console.error('Metadata fetcher worker error:', error)
  } finally {
    connection.release()
  }
}

let workerInterval: NodeJS.Timeout | null = null

export function startMetadataFetcherWorker() {
  if (workerInterval) return
  
  workerInterval = setInterval(() => {
    fetchMissingMetadata().catch(console.error)
  }, 30000)

  setTimeout(() => fetchMissingMetadata().catch(console.error), 2000)
  console.log('Metadata fetcher background worker started.')
}
