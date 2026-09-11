import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { loadCorpus, parseDocumentType } from './corpus.ts';
import { extractPdf } from './ingest.ts';
import { QvacModelAdapter } from './model-port.ts';
import { review } from './review.ts';

const [pdfPath, documentTypeArg, jobDirectory = 'jobs/review'] = process.argv.slice(2);
if (!pdfPath || !documentTypeArg) {
  console.error('Usage: npm run review -- <document.pdf> <propuesta|carta_origen_fondos> [job-directory]');
  process.exitCode = 1;
} else {
  const documentType = parseDocumentType(documentTypeArg);
  const model = await QvacModelAdapter.load();
  try {
    const extractedText = await extractPdf(pdfPath);
    const record = await review({
      document: { id: path.basename(pdfPath, path.extname(pdfPath)), type: documentType, extractedText },
      corpus: await loadCorpus('corpus'),
      model
    });
    await mkdir(jobDirectory, { recursive: true });
    await writeFile(path.join(jobDirectory, 'extracted.txt'), extractedText);
    await writeFile(path.join(jobDirectory, 'review-record.json'), `${JSON.stringify(record, null, 2)}\n`);
    console.log(path.join(jobDirectory, 'review-record.json'));
  } finally {
    await model.close();
  }
}
