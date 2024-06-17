import React from 'react';
import { createTheme, alpha, PaletteOptions as PaletteOptionsMui } from '@mui/material/styles';
import { orange, grey } from '@mui/material/colors';

import { SimplePaletteColorOptions } from '@mui/material/styles/createPalette';
import { ThemeOptions as ThemeOptionsMui } from '@mui/material/styles/createTheme';
import { type IobTheme, type ThemeName, ThemeType } from './types';

const step = (16 - 5) / 23 / 100;

/**
 * Convert hex color in the format '#rrggbb' or '#rgb' to an RGB object.
 */
function toInt(hex: string): { r: number; g: number; b: number } {
    const rgb: { r: number; g: number; b: number } = {
        r: 0,
        g: 0,
        b: 0,
    };

    if (hex.length === 7) {
        rgb.r = parseInt(hex.substr(1, 2), 16);
        rgb.g = parseInt(hex.substr(3, 2), 16);
        rgb.b = parseInt(hex.substr(5, 2), 16);
    } else if (hex.length === 4) {
        const r = hex.substr(1, 1);
        const g = hex.substr(2, 1);
        const b = hex.substr(3, 1);

        rgb.r = parseInt(r + r, 16);
        rgb.g = parseInt(g + g, 16);
        rgb.b = parseInt(b + b, 16);
    }

    return rgb;
}

/**
 * Convert an RGB object to a hex color string in the format '#rrggbb'.
 */
function toHex(int: { r: number; g: number; b: number }): string {
    return `#${Math.round(int.r).toString(16)}${Math.round(int.g).toString(16)}${Math.round(int.b).toString(16)}`;
}

/** Returns the hex color string in the format '#rrggbb' */
function getElevation(
    /** color in the format '#rrggbb' or '#rgb' */
    color: string,
    /** overlay color in the format '#rrggbb' or '#rgb' */
    overlayColor: string,
    /** elevation as an integer starting with 1 */
    elevation: number,
): string {
    const rgb: { r: number; g: number; b: number } = toInt(color);
    const overlay: { r: number; g: number; b: number } = toInt(overlayColor);

    rgb.r += overlay.r * (0.05 + step * (elevation - 1));
    rgb.g += overlay.g * (0.05 + step * (elevation - 1));
    rgb.b += overlay.b * (0.05 + step * (elevation - 1));

    return toHex(rgb);
}

/**
 * Get all 24 elevations of the given color and overlay.
 */
function getElevations(
    /** color in the format '#rrggbb' or '#rgb' */
    color: string,
    /** overlay color in the format '#rrggbb' or '#rgb' */
    overlay: string,
): Record<string, React.CSSProperties> {
    const elevations: Record<string, React.CSSProperties> = {};

    for (let i = 1; i <= 24; i++) {
        elevations[`elevation${i}`] = {
            backgroundColor: getElevation(color, overlay, i),
        };
    }

    return elevations;
}

// const buttonsPalette = () => ({
//     palette: {
//         // mode: "dark",
//         grey: {
//             main: grey[300],
//             dark: grey[400],
//         },
//     },
// });

// const buttonsTheme = theme => ({
//     components: {
//         MuiButton: {
//             variants: [
//                 {
//                     props: { variant: 'contained', color: 'grey' },
//                     style: {
//                         color: theme.palette.getContrastText(theme.palette.grey[300]),
//                     },
//                 },
//                 {
//                     props: { variant: 'outlined', color: 'grey' },
//                     style: {
//                         color: theme.palette.text.primary,
//                         borderColor:
//                             theme.palette.mode === 'light'
//                                 ? 'rgba(0, 0, 0, 0.23)'
//                                 : 'rgba(255, 255, 255, 0.23)',
//                         '&.Mui-disabled': {
//                             border: `1px solid ${theme.palette.action.disabledBackground}`,
//                         },
//                         '&:hover': {
//                             borderColor:
//                                 theme.palette.mode === 'light'
//                                     ? 'rgba(0, 0, 0, 0.23)'
//                                     : 'rgba(255, 255, 255, 0.23)',
//                             backgroundColor: alpha(
//                                 theme.palette.text.primary,
//                                 theme.palette.action.hoverOpacity,
//                             ),
//                         },
//                     },
//                 },
//                 {
//                     props: { color: 'grey', variant: 'text' },
//                     style: {
//                         color: 'black',
//                         '&:hover': {
//                             backgroundColor: alpha(
//                                 theme.palette.text.primary,
//                                 theme.palette.action.hoverOpacity,
//                             ),
//                         },
//                     },
//                 },
//             ],
//         },
//     },
// });

interface PaletteOptions extends PaletteOptionsMui {
    mode: ThemeType;
    expert: string;
    grey?: {
        main?: string;
        dark?: string;
        50?: string;
        100?: string;
        200?: string;
        300?: string;
        400?: string;
        500?: string;
        600?: string;
        700?: string;
        800?: string;
        900?: string;
        A100?: string;
        A200?: string;
        A400?: string;
        A700?: string;
    };
}

interface ThemeOptions extends ThemeOptionsMui {
    name: ThemeName;
    palette?: PaletteOptions;
    toolbar?: React.CSSProperties;
    saveToolbar?: {
        background: string;
        button: React.CSSProperties;
    };
}

/**
 * The theme creation factory function.
 */
const CustomTheme = (type: ThemeName): IobTheme => {
    let options: ThemeOptions;
    let overrides: Record<string, any>;

    if (type === 'dark') {
        overrides = {
            MuiAppBar: {
                colorDefault: {
                    backgroundColor: '#272727',
                },
            },
            MuiLink: {
                root: {
                    textTransform: 'uppercase',
                    transition: 'color .3s ease',
                    color: orange[200],
                    '&:hover': {
                        color: orange[100],
                    },
                },
            },
            MuiPaper: getElevations('#121212', '#fff'),
        };

        options = {
            name: type,
            palette: {
                mode: 'dark',
                background: {
                    paper: '#121212',
                    default: '#121212',
                },
                primary: {
                    main: '#4dabf5',
                },
                secondary: {
                    main: '#436a93',
                },
                expert: '#14bb00',
                text: {
                    primary: '#ffffff',
                    secondary: '#ffffff',
                },
            },
        };
    } else if (type === 'blue') {
        overrides = {
            MuiAppBar: {
                colorDefault: {
                    backgroundColor: '#3399CC',
                },
            },
            MuiLink: {
                root: {
                    textTransform: 'uppercase',
                    transition: 'color .3s ease',
                    color: orange[400],
                    '&:hover': {
                        color: orange[300],
                    },
                },
            },
        };

        options = {
            name: type,
            palette: {
                mode: 'dark',
                background: {
                    paper: '#151d21',
                    default: '#151d21',
                },
                primary: {
                    main: '#4dabf5',
                },
                secondary: {
                    main: '#436a93',
                },
                expert: '#14bb00',
                text: {
                    primary: '#ffffff',
                    secondary: '#ffffff',
                },
            },

        };
    } else if (type === 'colored') {
        overrides = {
            MuiAppBar: {
                colorDefault: {
                    backgroundColor: '#2a3135',
                },
            },
            MuiLink: {
                root: {
                    textTransform: 'uppercase',
                    transition: 'color .3s ease',
                    color: orange[200],
                    '&:hover': {
                        color: orange[100],
                    },
                },
            },
            MuiPaper: getElevations('#151d21', '#fff'),
        };

        options = {
            name: type,
            palette: {
                mode: 'light',
                primary: {
                    main: '#3399CC',
                },
                secondary: {
                    main: '#164477',
                },
                expert: '#96fc96',
            },

        };
    } else if (type === 'PT') {
        overrides = {
            MuiAppBar: {
                colorDefault: {
                    backgroundColor: '#0F99DE',
                },
            },
            MuiLink: {
                root: {
                    textTransform: 'uppercase',
                    transition: 'color .3s ease',
                    color: orange[400],
                    '&:hover': {
                        color: orange[300],
                    },
                },
            },
        };

        options = {
            name: type,
            palette: {
                mode: 'light',
                primary: {
                    main: '#0F99DE',
                },
                secondary: {
                    main: '#88A536',
                },
                expert: '#BD1B24',
            },

        };
    } else if (type === 'DX') {
        overrides = {
            MuiAppBar: {
                colorDefault: {
                    backgroundColor: '#a9a9a9',
                },
            },
            MuiLink: {
                root: {
                    textTransform: 'uppercase',
                    transition: 'color .3s ease',
                    color: orange[400],
                    '&:hover': {
                        color: orange[300],
                    },
                },
            },
        };

        options = {
            name: type,
            palette: {
                mode: 'light',
                primary: {
                    main: '#F5F5F7',
                },
                secondary: {
                    main: '#a9a9a9',
                },
                expert: '#BD1B24',
                text: {
                    primary: '#007AFE',
                    secondary: '#007AFE',
                    disabled: '#007AFEAA',
                },
            },

        };
    } else {
        overrides = {
            MuiLink: {
                root: {
                    textTransform: 'uppercase',
                    transition: 'color .3s ease',
                    color: orange[400],
                    '&:hover': {
                        color: orange[300],
                    },
                },
            },
        };

        options = {
            name: type,
            palette: {
                mode: 'light',
                primary: {
                    main: '#3399CC',
                    light: undefined,
                    dark: undefined,
                    contrastText: undefined,
                },
                secondary: {
                    main: '#164477',
                },
                expert: '#14bb00',
            },
        };
    }

    options.toolbar = {
        height: 48,
    };

    options.saveToolbar = {
        background: (options.palette?.primary as SimplePaletteColorOptions)?.main,
        button: {
            borderRadius: 3,
            height: 32,
        },
    };

    if (options.palette) {
        options.palette.grey = {
            main: grey[300],
            dark: grey[400],
        };
    }

    const theme: IobTheme = createTheme(options) as IobTheme;

    const palette: PaletteOptions = (theme.palette as PaletteOptions);

    return createTheme(theme, {
        components: {
            ...overrides,
            MuiButton: {
                variants: [
                    {
                        props: { variant: 'contained', color: 'grey' },
                        style: {
                            color: palette.getContrastText && palette.grey && palette.grey[300] ? palette.getContrastText(palette.grey[300]) : undefined,
                        },
                    },
                    {
                        props: { variant: 'outlined', color: 'grey' },
                        style: {
                            color: palette.text?.primary,
                            borderColor:
                                palette.mode === 'light'
                                    ? 'rgba(0, 0, 0, 0.23)'
                                    : 'rgba(255, 255, 255, 0.23)',
                            '&.Mui-disabled': {
                                border: `1px solid ${palette.action?.disabledBackground}`,
                            },
                            '&:hover': {
                                borderColor:
                                    palette.mode === 'light'
                                        ? 'rgba(0, 0, 0, 0.23)'
                                        : 'rgba(255, 255, 255, 0.23)',
                                backgroundColor: alpha(
                                    palette.text?.primary || '',
                                    palette.action?.hoverOpacity || 0.04,
                                ),
                            },
                        },
                    },
                    {
                        props: { variant: 'text', color: 'grey' },
                        style: {
                            color: palette.text?.primary,
                            '&:hover': {
                                backgroundColor: alpha(
                                    palette.text?.primary || '',
                                    palette.action?.hoverOpacity || 0.04,
                                ),
                            },
                        },
                    },
                ],
            },
        },
    }) as IobTheme;
};

export default CustomTheme;
