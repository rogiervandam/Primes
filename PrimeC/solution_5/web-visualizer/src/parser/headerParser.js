/**
 * Trace header / title / benchmark metadata extraction.
 *
 * These helpers operate on the optional preamble lines (TITLE, benchmark
 * output) that appear before the actual EVENT/STEP records and produce a
 * normalised presentation object the visualiser consumes.
 */

import {
  parseKvLine,
  firstDefined,
  collectTitleInfo,
  dedupeStrings,
} from './parseUtils';

/** Collect TITLE and headerKv-derived title/subtitle/info into one object. */
export function extractTitleMetadata(lines, headerKv = {}) {
  const titleLines = lines.filter((line) => /^TITLE\s/i.test(line));
  const kvs = titleLines.map((line) => parseKvLine(line.replace(/^TITLE\s+/i, '')));
  const title = firstDefined(
    ...kvs.map((kv) => firstDefined(kv.title, kv.label, null)),
    headerKv.title,
    headerKv.trace_title,
    null,
  );
  const subtitle = firstDefined(
    ...kvs.map((kv) => firstDefined(kv.subtitle, kv.subheading, null)),
    headerKv.subtitle,
    headerKv.trace_subtitle,
    null,
  );
  const info = [
    ...collectTitleInfo(firstDefined(headerKv.title_info, headerKv.info, headerKv.details, null)),
    ...kvs.flatMap((kv) => collectTitleInfo(firstDefined(kv.info, kv.details, kv.extra, null))),
  ];
  return { title, subtitle, info: dedupeStrings(info) };
}

/** Scan the raw lines for the trailing benchmark output line, parsed. */
export function extractBenchmarkMetadata(lines) {
  for (let index = lines.length - 1; index >= 0; index--) {
    const line = lines[index];
    if (!line || /^(TRACE|TEXT|EVENT|STEP|TITLE|DUMP)\s/i.test(line)) continue;
    const parsed = parseBenchmarkOutputLine(line);
    if (parsed) return parsed;
  }
  return null;
}

/** Parse a single `label;iters;time;threads[;tag=val,...]` line. */
export function parseBenchmarkOutputLine(line) {
  if (!line || typeof line !== 'string') return null;
  const parts = line.trim().split(';');
  if (parts.length < 4 || parts.length > 5) return null;
  const iterations = Number(parts[1]);
  const totalTime = Number(parts[2]);
  const threads = Number(parts[3]);
  if (!parts[0] || !Number.isFinite(iterations) || !Number.isFinite(totalTime) || !Number.isFinite(threads)) return null;
  const tags = {};
  if (parts[4]) {
    for (const entry of parts[4].split(',')) {
      const [key, value] = entry.split('=');
      if (key && value) tags[key] = value;
    }
  }
  return {
    label: parts[0],
    iterations,
    totalTime,
    threads,
    tags,
    summary: `${parts[0]} | ${iterations} passes | ${totalTime.toFixed(3)}s | ${threads} thread${threads === 1 ? '' : 's'}`,
  };
}

/** Combine a header object and metadata into the renderer's presentation object. */
export function buildTracePresentation(header, meta = {}) {
  const info = [...(meta.info || [])];
  if (header.benchmarkSettings) info.push(`Settings ${header.benchmarkSettings}`);
  if (header.maxNumber) info.push(`Max ${header.maxNumber}`);
  if (header.storageModel) info.push(`Storage ${header.storageModel}`);
  if (meta.benchmark?.summary) info.push(meta.benchmark.summary);

  return {
    title: meta.title || null,
    subtitle: meta.subtitle || null,
    infoLines: dedupeStrings(info),
    benchmark: meta.benchmark || null,
  };
}
