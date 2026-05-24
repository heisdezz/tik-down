import { create } from 'twrnc';

export const palette = {
  light: {
    background:        '#F5F4FF',
    backgroundElement: '#ECEAF9',
    backgroundSelected:'#E0DDFA',
    text:              '#1C1A30',
    textSecondary:     '#6E6B87',
    primary:           '#6B5FD6',
  },
  dark: {
    background:        '#0E0D1A',
    backgroundElement: '#1B1929',
    backgroundSelected:'#25233A',
    text:              '#EBE9FF',
    textSecondary:     '#9895B4',
    primary:           '#A89FF8',
  },
  status: {
    success: '#72C9A3',
    error:   '#E97B8E',
    warning: '#EDB06A',
  },
} as const;

const tw = create({
  theme: {
    extend: {
      colors: {
        'bg-light':       palette.light.background,
        'bg-el-light':    palette.light.backgroundElement,
        'bg-sel-light':   palette.light.backgroundSelected,
        'bg-dark':        palette.dark.background,
        'bg-el-dark':     palette.dark.backgroundElement,
        'bg-sel-dark':    palette.dark.backgroundSelected,
        'text-light':     palette.light.text,
        'text-sec-light': palette.light.textSecondary,
        'text-dark':      palette.dark.text,
        'text-sec-dark':  palette.dark.textSecondary,
        primary:          palette.light.primary,
        'primary-dim':    palette.dark.primary,
        success:          palette.status.success,
        error:            palette.status.error,
        warning:          palette.status.warning,
      },
      borderRadius: { app: '12px' },
    },
  },
});

export default tw;
