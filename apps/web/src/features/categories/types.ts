export type CampusProgram = {
  programId: number
  programName: string
  programGroup: string
}

export type Category = {
  categoryId: number
  categoryName: string
  description: string
  shelfLocation: string
  shelfColumn: number
  shelfRow: number
  textbookRecencyRule: boolean
  programIds: number[]
  totalBooksCount: number
  totalThesisCount: number
  createdAt: string
  updatedAt: string | null
}

export type CategoryPayload = {
  categoryName: string
  description: string
  shelfLocation: string
  shelfColumn: number
  shelfRow: number
  textbookRecencyRule: boolean
  programIds: number[]
}

export type CategoryShelfSync = {
  bookCopies: number
  movedBookCopies: number
  researchCopies: number
  movedResearchCopies: number
}

export type CategorySaveResult = Category & Partial<CategoryShelfSync>
