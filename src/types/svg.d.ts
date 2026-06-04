// ── Asset module declarations ──────────────────────────────────
// Tells TypeScript that .svg and .png asset files imported from
// React Native resolve to either a component (SVGs via
// react-native-svg-transformer) or a static asset (PNGs).
declare module '*.svg' {
  import { ComponentType } from 'react';
  import { ViewProps, ColorValue } from 'react-native';

  export interface SvgProps extends ViewProps {
    width?: number | string;
    height?: number | string;
    color?: ColorValue | string;
    fill?: ColorValue | string;
    stroke?: ColorValue | string;
    strokeWidth?: number | string;
    opacity?: number | string;
  }

  const Cmp: ComponentType<SvgProps>;
  export default Cmp;
}

declare module '*.png' {
  const asset: number;
  export default asset;
}

declare module '*.jpg' {
  const asset: number;
  export default asset;
}

declare module '*.jpeg' {
  const asset: number;
  export default asset;
}
