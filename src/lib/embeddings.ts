import { OpenAIEmbeddings } from '@langchain/openai'

// text-embedding-3-small: cheap, fast, 1536 dimensions — matches our pgvector schema
export function createEmbeddings() {
  return new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: 'text-embedding-3-small',
    dimensions: 1536,
  })
}

export async function embedText(text: string): Promise<number[]> {
  const embeddings = createEmbeddings()
  return embeddings.embedQuery(text)
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const embeddings = createEmbeddings()
  return embeddings.embedDocuments(texts)
}
