/**
 * Static catalogue data for the Settings panel:
 * - Tooltip text for each layout / vector preset
 * - Definitions of grouping presets and families (16/32/64-bit × N lanes)
 * - Vector base/lane dropdown options
 *
 * Pure data, no React or DOM dependencies.
 */

export const BIT_LAYOUT_TIPS = {
  '8x1': 'Horizontal row of 8 bits — compact wide layout',
  '4x2': '4 columns × 2 rows — balanced, default',
  '1x8': 'Vertical column of 8 bits — tall narrow layout',
  '3x3': '3×3 grid with center empty — square arrangement',
  '8c1': '8 bits in a row',
  '4c2': '4 bits in 2 columns',
  'grid3x3': '3x3 grid with center empty',
};

export const BYTE_LAYOUT_TIPS = {
  '8x1': '8 bytes in a row — full-width uint64 display',
  '4x2': '4 columns × 2 rows — balanced, default',
  '1x8': 'Vertical column of 8 bytes — tall display',
  '3x3': '3×3 grid with center empty — square display',
  '8c1': '8 bytes in a row',
  '4c2': '4 bytes in 2 columns',
  'grid3x3': '3x3 grid with center empty',
};

/** Plain-English summary of a layout, used as a row description under the picker. */
export function describeLayout(layoutKey, catalog, noun) {
  const layout = catalog[layoutKey];
  if (!layout) return `${noun} arrangement unknown.`;
  if (layout.grid3x3) return `${noun} arranged in a 3×3 grid with the center left empty.`;
  return `${noun} arranged as ${layout.cols} columns × ${layout.rows} rows.`;
}

export const VECTOR_TIPS = {
  1: 'No grouping — each uint64 is standalone',
  2: 'Group 2 uint64 values together',
  4: 'Group 4 uint64 values together',
  8: 'Group 8 uint64 values together',
  '1': 'Single vector',
  '2': '2 vectors',
  '4': '4 vectors',
};

export const GROUPING_PRESETS = {
  '16bit': { label: '16bit', title: 'Group bits as uint16 blocks',     baseBits: 16, lanes: 1 },
  '16x2':  { label: '16x2',  title: '2 uint16 values per grouping',    baseBits: 16, lanes: 2 },
  '16x4':  { label: '16x4',  title: '4 uint16 values per grouping',    baseBits: 16, lanes: 4 },
  '16x8':  { label: '16x8',  title: '8 uint16 values per grouping',    baseBits: 16, lanes: 8 },
  '32bit': { label: '32bit', title: 'Group bits as uint32 blocks',     baseBits: 32, lanes: 1 },
  '32x2':  { label: '32x2',  title: '2 uint32 values per grouping',    baseBits: 32, lanes: 2 },
  '32x4':  { label: '32x4',  title: '4 uint32 values per grouping',    baseBits: 32, lanes: 4 },
  '32x8':  { label: '32x8',  title: '8 uint32 values per grouping',    baseBits: 32, lanes: 8 },
  '64bit': { label: '64bit', title: 'Single uint64 grouping',          baseBits: 64, lanes: 1 },
  '64x2':  { label: '64x2',  title: '2 uint64 values per grouping',    baseBits: 64, lanes: 2 },
  '64x4':  { label: '64x4',  title: '4 uint64 values per grouping',    baseBits: 64, lanes: 4 },
  '64x8':  { label: '64x8',  title: '8 uint64 values per grouping',    baseBits: 64, lanes: 8 },
};

export const GROUPING_FAMILIES = [
  { familyKey: '16', defaultKey: '16bit', optionKeys: ['16bit', '16x2', '16x4', '16x8'] },
  { familyKey: '32', defaultKey: '32bit', optionKeys: ['32bit', '32x2', '32x4', '32x8'] },
  { familyKey: '64', defaultKey: '64bit', optionKeys: ['64bit', '64x2', '64x4', '64x8'] },
];

export const CUSTOM_GROUP_PRESETS = [2, 6, 30, 210];

/** Map a grouping preset key to its preview-class CSS modifier. */
export function groupingPreviewClassName(presetKey) {
  switch (presetKey) {
    case '16bit': return 'grouping-chip-preview-16';
    case '32bit': return 'grouping-chip-preview-32';
    case '64x2': return 'grouping-chip-preview-64x2';
    case '64x4': return 'grouping-chip-preview-64x4';
    case '64x8': return 'grouping-chip-preview-64x8';
    case '64bit': return 'grouping-chip-preview-64';
    default: return 'grouping-chip-preview-custom';
  }
}

export const VECTOR_BASE_OPTIONS = [
  { bits: 1,  label: 'bit' },
  { bits: 8,  label: 'byte' },
  { bits: 16, label: 'uint16' },
  { bits: 32, label: 'uint32' },
  { bits: 64, label: 'uint64' },
];

export const VECTOR_LANE_OPTIONS = [1, 2, 4, 8];
