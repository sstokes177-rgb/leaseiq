Read src/app/api/upload/route.ts, src/lib/pdfProcessor.ts, src/components/FileUpload.tsx, src/components/BatchFileUpload.tsx, and any other upload-related files.

## TASK: Document Upload Validation — Block Unrelated PDFs, Prompt for Property-Related Non-Lease Docs

### THE RULES:

ALLOW (no warning): Base leases, amendments, exhibits, commencement letters, side letters, addendums, lease abstracts, estoppel certificates

ALLOW WITH CONFIRMATION: Property-related but not a lease document — shopping center handbooks, parking rules/guidelines, property manager communications, building rules and regulations, insurance certificates, CAM reconciliation statements, tenant improvement agreements, construction documents, zoning documents, environmental reports. Show prompt: "This document appears to be a [document type]. It will be stored for reference alongside your lease documents. Continue uploading?"

BLOCK COMPLETELY: Non-real-estate documents — personal documents, recipes, homework, images saved as PDF, financial statements unrelated to the property, random content with no connection to commercial real estate or property management.

### IMPLEMENTATION:

#### Step 1: Create classification API route — POST /api/documents/classify/route.ts

This route receives extracted text (first 1000 characters) and returns a classification:

```typescript
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

// Send the first ~1000 chars to Claude for quick classification
const { text } = await generateText({
  model: anthropic('claude-haiku-4-5-20251001'),
  maxOutputTokens: 100,
  messages: [{
    role: 'user',
    content: `Classify this document. Read the text below and determine what type of document it is.

Return ONLY a JSON object with these fields:
- category: "lease" | "amendment" | "exhibit" | "commencement_letter" | "side_letter" | "cam_statement" | "property_related" | "unrelated"  
- description: brief 5-10 word description of what the document is
- confidence: "high" | "medium" | "low"

"property_related" means it relates to commercial real estate or property management but is not a lease document (handbooks, parking rules, building guidelines, insurance certs, tenant communications, etc.)

"unrelated" means it has nothing to do with commercial real estate, property, or leases.

TEXT:
${extractedText.slice(0, 1000)}`
  }]
})
```

#### Step 2: Integrate into the upload flow

In the upload API route (src/app/api/upload/route.ts):

1. After extracting text from the PDF, call the classification
2. Based on the result:
   - category is lease/amendment/exhibit/commencement_letter/side_letter: proceed normally, set document_type to the category
   - category is cam_statement or property_related: return a response with status "needs_confirmation" and the description
   - category is unrelated: return an error response with message "This document does not appear to be related to commercial real estate. Only lease documents, amendments, exhibits, property guidelines, and other real estate documents can be uploaded."

#### Step 3: Frontend confirmation flow

In the FileUpload and BatchFileUpload components:

1. After the initial upload API call, check the response
2. If response.needs_confirmation is true:
   - Show a modal/dialog: "This document appears to be a [description]. It will be stored for reference alongside your lease documents. Continue uploading?"
   - Two buttons: "Cancel" and "Upload Anyway"
   - If user clicks "Upload Anyway", re-call the upload API with a `force: true` flag that skips classification
3. If response.error about unrelated document:
   - Show an error message: "This document cannot be uploaded because it does not appear to be related to your property or lease. Only real estate documents are accepted."
   - Red error banner, dismiss button
4. If successful: proceed as normal

#### Step 4: Also validate on the frontend BEFORE upload

Quick client-side checks before even calling the API:
- File must be a PDF (check file.type === 'application/pdf' and extension is .pdf)
- File must be under 50MB
- File name should not contain path traversal characters

Show immediate error if these fail — dont waste an API call.

#### Step 5: Handle edge cases

If the AI classification fails (API error, timeout):
- Default to ALLOWING the upload with the document_type set to the user's selection
- Log the error for debugging
- Do not block uploads just because classification failed

If the document has very little extractable text (scanned PDF with no OCR):
- Allow it with a note: "Limited text could be extracted from this document. Some AI features may not work fully."
- Still classify based on whatever text was extracted

Run npx next build — fix any errors.
Then: git add . && git commit -m "Document upload validation: block unrelated, prompt property-related" && git push

