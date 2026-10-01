import { analyzeSpectrum } from './resynthesis-analysis.js';

self.onmessage = ({ data }) => {
  try {
    const result = analyzeSpectrum(data.samples, data.sampleRate, data.partials, data.source);
    self.postMessage({ result });
  } catch (error) {
    self.postMessage({ error: error.message || String(error) });
  }
};
