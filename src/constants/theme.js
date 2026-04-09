// src/constants/theme.js
// Design tokens for the Water Meter Reading App
// All colour decisions are centralised here — import this file in every screen.

export const Colors = {
  // Brand
  primary:        '#185FA5',
  primaryLight:   '#E6F1FB',
  primaryMid:     '#378ADD',
  primaryDark:    '#0C447C',

  // Semantic
  success:        '#3B6D11',
  successLight:   '#EAF3DE',
  successBorder:  '#C0DD97',

  warning:        '#854F0B',
  warningLight:   '#FAEEDA',
  warningBorder:  '#FAC775',

  danger:         '#A32D2D',
  dangerLight:    '#FCEBEB',
  dangerBorder:   '#F7C1C1',

  info:           '#185FA5',
  infoLight:      '#E6F1FB',
  infoBorder:     '#B5D4F4',

  // Neutrals
  white:          '#FFFFFF',
  bgPrimary:      '#FFFFFF',
  bgSecondary:    '#F5F5F3',
  bgTertiary:     '#EEEDE8',

  textPrimary:    '#1A1A18',
  textSecondary:  '#5F5E5A',
  textTertiary:   '#888780',
  textDisabled:   '#B4B2A9',

  border:         '#D3D1C7',
  borderLight:    '#E8E7E2',
  borderStrong:   '#888780',

  // Status badge backgrounds
  statusPending:  { bg: '#FAEEDA', text: '#854F0B' },
  statusDone:     { bg: '#EAF3DE', text: '#3B6D11' },
  statusUnread:   { bg: '#FCEBEB', text: '#A32D2D' },
  statusSynced:   { bg: '#EAF3DE', text: '#3B6D11' },
  statusOffline:  { bg: '#FAEEDA', text: '#854F0B' },
  statusFailed:   { bg: '#FCEBEB', text: '#A32D2D' },
  statusNext:     { bg: '#E6F1FB', text: '#0C447C' },
};

export const Typography = {
  // Font sizes
  xs:   11,
  sm:   13,
  md:   15,
  lg:   17,
  xl:   20,
  xxl:  24,
  xxxl: 28,

  // Font weights
  regular: '400',
  medium:  '500',
  bold:    '600',
};

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
  xxxl: 32,
};

export const Radius = {
  sm:  6,
  md:  10,
  lg:  14,
  xl:  20,
  full: 999,
};

export const Shadow = {
  // React Native shadow props (iOS)
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,   // Android
  },
};
