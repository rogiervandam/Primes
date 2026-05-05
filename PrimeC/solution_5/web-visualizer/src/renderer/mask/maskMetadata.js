export function maskTintColor(host, slotIndex = 0) {
  const base = host._opColor();
  return slotIndex % 2 === 0 ? base : host._mixRgb(base, [245, 158, 11], 0.45);
}

export function maskWriteEntries(host) {
  if (!host.maskWriteOrderWords || host.maskWriteOrderWords.length === 0) return [];
  if (!Number.isFinite(host.maskWordBits) || host.maskWordBits <= 0) return [];

  const entries = [];
  for (let index = 0; index < host.maskWriteOrderWords.length; index++) {
    const wordIndex = Number(host.maskWriteOrderWords[index]);
    const slotIndex = Number(host.maskWriteOrderSlots?.[index] ?? 0);
    if (!Number.isFinite(wordIndex) || wordIndex < 0) continue;

    const startBit = wordIndex * host.maskWordBits;
    const count = Math.max(1, Math.min(host.maskWordBits, host.bitCount - startBit));
    if (count <= 0) continue;

    const segments = host._multiBitBoundsSegments(startBit, count);
    if (segments.length === 0) continue;

    for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
      const segment = segments[segmentIndex];
      entries.push({
        order: entries.length,
        wordIndex,
        slotIndex,
        eventId: Number(host.maskWriteOrderEventIds?.[index] ?? -1),
        startBit: segment.startBit,
        count: segment.count,
        bounds: segment.bounds,
        wordStartBit: startBit,
        wordCount: count,
        segmentIndex,
        segmentCount: segments.length,
        slot: host._vectorSlotLayout(Math.floor(segment.startBit / Math.max(1, host._logicalGroupBits()))),
      });
    }
  }

  return entries;
}

export function maskWordOrderSummary(host) {
  const entries = maskWriteEntries(host);
  if (entries.length === 0) return [];

  const perWord = new Map();
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    const existing = perWord.get(entry.wordIndex);
    if (existing) {
      existing.orders.push(entry.order + 1);
      if (Number.isFinite(entry.eventId) && entry.eventId >= 0 && !existing.eventIds.includes(entry.eventId)) {
        existing.eventIds.push(entry.eventId);
      }
      continue;
    }
    perWord.set(entry.wordIndex, {
      ...entry,
      orders: [entry.order + 1],
      eventIds: Number.isFinite(entry.eventId) && entry.eventId >= 0 ? [entry.eventId] : [],
    });
  }

  return Array.from(perWord.values()).sort((a, b) => a.wordIndex - b.wordIndex);
}

export function maskEntriesBySlot(host) {
  const grouped = new Map();
  const entries = maskWriteEntries(host);
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    if (!grouped.has(entry.slotIndex)) grouped.set(entry.slotIndex, []);
    grouped.get(entry.slotIndex).push(entry);
  }
  return Array.from(grouped.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, slotEntries]) => slotEntries);
}

export function maskEntryBits(host, entry) {
  if (!entry) return [];
  const slotBits = host.maskSlotBits?.[entry.slotIndex] || [];
  const bits = [];
  const wordStart = Number.isFinite(entry.wordStartBit) ? entry.wordStartBit : entry.startBit;
  const rangeStart = entry.startBit;
  const rangeStop = entry.startBit + entry.count;
  for (let index = 0; index < slotBits.length; index++) {
    const absoluteBit = wordStart + Number(slotBits[index]);
    if (!Number.isFinite(absoluteBit) || absoluteBit < 0 || absoluteBit >= host.bitCount) continue;
    if (absoluteBit < rangeStart || absoluteBit >= rangeStop) continue;
    bits.push(absoluteBit);
  }
  return bits;
}

export function maskEntryGroupBounds(host, entry) {
  if (!entry) return null;
  const groupBits = Math.max(1, host._logicalGroupBits());
  const groupStart = Math.floor(entry.startBit / groupBits) * groupBits;
  const groupCount = Math.max(1, Math.min(groupBits, host.bitCount - groupStart));
  const groupSegments = host._multiBitBoundsSegments(groupStart, groupCount);
  if (groupSegments.length === 0) return null;
  for (let index = 0; index < groupSegments.length; index++) {
    const segment = groupSegments[index];
    if (entry.startBit >= segment.startBit && entry.startBit < segment.startBit + segment.count) {
      return segment.bounds;
    }
  }
  return groupSegments[0].bounds;
}
