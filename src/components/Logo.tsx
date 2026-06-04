// ── Logo ───────────────────────────────────────────────────────
// Renders the DoctorCloud brand logos (PNG) copied from
// MedicalUniverse/assets/icons/logos/.  Use the `variant` prop to
// pick between the full lockup, side lockup, or square icon.
import { Image, ImageStyle, StyleProp } from 'react-native';

import FullColor from '../../assets/images/Logo_DoctorCloud_Full_Color.png';
import FullMono  from '../../assets/images/Logo_DoctorCloud_Full_Mono.png';
import SideColor from '../../assets/images/Logo_DoctorCloud_Side_Color.png';
import SideMono  from '../../assets/images/Logo_DoctorCloud_Side_Mono.png';
import IconColor from '../../assets/images/Logo_DoctorCloud_Icon_Color.png';
import IconMono  from '../../assets/images/Logo_DoctorCloud_Icon_Mono.png';

export type LogoVariant =
  | 'full-color' | 'full-mono'
  | 'side-color' | 'side-mono'
  | 'icon-color' | 'icon-mono';

const SOURCES: Record<LogoVariant, any> = {
  'full-color': FullColor,
  'full-mono':  FullMono,
  'side-color': SideColor,
  'side-mono':  SideMono,
  'icon-color': IconColor,
  'icon-mono':  IconMono,
};

export interface LogoProps {
  variant?: LogoVariant;
  width?: number;
  height?: number;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'contain' | 'cover' | 'stretch' | 'center';
}

export function Logo({
  variant = 'icon-color',
  width = 80,
  height,
  style,
  resizeMode = 'contain',
}: LogoProps) {
  return (
    <Image
      source={SOURCES[variant]}
      style={[{ width, height: height ?? width }, style]}
      resizeMode={resizeMode}
    />
  );
}

export default Logo;
