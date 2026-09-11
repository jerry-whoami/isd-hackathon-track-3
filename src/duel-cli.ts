import path from 'node:path';

import { loadCorpus, parseDocumentType } from './corpus.ts';
import { runDuel } from './duel.ts';
import { extractPdf } from './ingest.ts';
import { QvacModelAdapter } from './model-port.ts';

const [pdfPath, documentTypeArg, runsArg, jobDirectory = 'jobs/duel', hostileFlag] = process.argv.slice(2);
if (!pdfPath || !documentTypeArg) {
  console.error('Usage: npm run duel -- <document.pdf> <propuesta|carta_origen_fondos> [runs] [job-directory] [--hostile]');
  process.exitCode = 1;
} else {
  const runs = runsArg === undefined ? undefined : Number(runsArg);
  if (runs !== undefined && (!Number.isInteger(runs) || runs < 1)) {
    console.error('Runs must be a positive integer.');
    process.exitCode = 1;
  } else if (hostileFlag !== undefined && hostileFlag !== '--hostile') {
    console.error('The optional fifth argument must be --hostile.');
    process.exitCode = 1;
  } else {
    const documentType = parseDocumentType(documentTypeArg);
    const model = await QvacModelAdapter.load();
    try {
      const record = await runDuel({
        document: {
          id: path.basename(pdfPath, path.extname(pdfPath)),
          type: documentType,
          extractedText: await extractPdf(pdfPath)
        },
        corpus: await loadCorpus('corpus'),
        model,
        ...(runs === undefined ? {} : { runs }),
        hostile: hostileFlag === '--hostile',
        recordPath: path.join(jobDirectory, 'duel-record.json')
      });
      console.log(`Faraday: approve=${record.counts.contained.approve_submission} route=${record.counts.contained.route_to_human} quarantine=${record.counts.contained.quarantine_submission}`);
      console.log(`Agente convencional: approve=${record.counts.naive.approve_submission} route=${record.counts.naive.route_to_human} quarantine=${record.counts.naive.quarantine_submission}`);
      if (record.naiveObedienceRate !== undefined) console.log(`Obedience rate: ${record.naiveObedienceRate}`);
    } finally {
      await model.close();
    }
  }
}
