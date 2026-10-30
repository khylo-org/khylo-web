import type { ColorSystemOptions } from '@mui/material/styles';
import merge from 'lodash-es/merge';

import { DEFAULT_COLOR_SCHEME } from '../_base/theme';

/** The "Light" color scheme. */
const theme = merge<ColorSystemOptions, ColorSystemOptions, ColorSystemOptions>(
    {},
    DEFAULT_COLOR_SCHEME,
    {
        palette: {
            mode: 'light',
            primary: {
                main: '#D97732'
            },
            secondary: {
                main: '#D97732'
            },
            background: {
                default: '#FAF8F5',
                paper: '#FFFFFF'
            },
            text: {
                primary: '#171717',
                secondary: '#504A45'
            },
            action: {
                focus: '#D5CEC6',
                hover: '#F3F0EC'
            },
            Alert: {
                infoFilledBg: '#F3F0EC',
                infoFilledColor: '#171717'
            },
            AppBar: {
                defaultBg: '#F3F0EC'
            },
            Button: {
                inheritContainedBg: '#E7E2DC',
                inheritContainedHoverBg: '#D5CEC6'
            }
        }
    }
);

export default theme;
