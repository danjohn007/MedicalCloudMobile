// ── Icon ──────────────────────────────────────────────────────
// Reusable wrapper around the SVG icons copied from MedicalUniverse
// (assets/icons/regular/*.svg).  Uses `react-native-svg-transformer`,
// configured in `metro.config.js`, so each .svg is a real component.
//
// Usage:
//   <Icon name="house" size={24} color={MC.primary} />
//   <Icon name="stethoscope" size={28} color={MC.primary} />
//
// Stroke-style icons (Phosphor "regular" set) inherit `color` by
// passing `stroke` to the SVG component.
import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

// Static imports — Metro bundles only what's imported.
import AddressBook        from '../../assets/icons/regular/address-book.svg';
import ArrowLeft          from '../../assets/icons/regular/arrow-left.svg';
import ArrowRight         from '../../assets/icons/regular/arrow-right.svg';
import Baby               from '../../assets/icons/regular/baby.svg';
import Bell               from '../../assets/icons/regular/bell.svg';
import BellRinging        from '../../assets/icons/regular/bell-ringing.svg';
import Bone               from '../../assets/icons/regular/bone.svg';
import Brain              from '../../assets/icons/regular/brain.svg';
import Buildings          from '../../assets/icons/regular/buildings.svg';
import Calendar           from '../../assets/icons/regular/calendar.svg';
import CaretLeft          from '../../assets/icons/regular/caret-left.svg';
import CaretRight         from '../../assets/icons/regular/caret-right.svg';
import ChatCircle         from '../../assets/icons/regular/chat-circle.svg';
import ChatCircleDots     from '../../assets/icons/regular/chat-circle-dots.svg';
import Check              from '../../assets/icons/regular/check.svg';
import CheckCircle        from '../../assets/icons/regular/check-circle.svg';
import ClipboardText      from '../../assets/icons/regular/clipboard-text.svg';
import Clock              from '../../assets/icons/regular/clock.svg';
import CreditCard         from '../../assets/icons/regular/credit-card.svg';
import CurrencyDollar     from '../../assets/icons/regular/currency-dollar.svg';
import DotsThreeVertical  from '../../assets/icons/regular/dots-three-vertical.svg';
import Drop               from '../../assets/icons/regular/drop.svg';
import Envelope           from '../../assets/icons/regular/envelope.svg';
import Eye                from '../../assets/icons/regular/eye.svg';
import FirstAid           from '../../assets/icons/regular/first-aid.svg';
import Funnel             from '../../assets/icons/regular/funnel.svg';
import Gear               from '../../assets/icons/regular/gear.svg';
import GenderFemale       from '../../assets/icons/regular/gender-female.svg';
import GraduationCap      from '../../assets/icons/regular/graduation-cap.svg';
import Heart              from '../../assets/icons/regular/heart.svg';
import House              from '../../assets/icons/regular/house.svg';
import Info               from '../../assets/icons/regular/info.svg';
import List               from '../../assets/icons/regular/list.svg';
import Lock               from '../../assets/icons/regular/lock.svg';
import MagnifyingGlass    from '../../assets/icons/regular/magnifying-glass.svg';
import MapPin             from '../../assets/icons/regular/map-pin.svg';
import MapTrifold         from '../../assets/icons/regular/map-trifold.svg';
import PaperPlaneRight    from '../../assets/icons/regular/paper-plane-right.svg';
import Phone              from '../../assets/icons/regular/phone.svg';
import Pill               from '../../assets/icons/regular/pill.svg';
import Plus               from '../../assets/icons/regular/plus.svg';
import Pulse              from '../../assets/icons/regular/pulse.svg';
import ShareNetwork       from '../../assets/icons/regular/share-network.svg';
import ShieldCheck        from '../../assets/icons/regular/shield-check.svg';
import SignOut            from '../../assets/icons/regular/sign-out.svg';
import Star               from '../../assets/icons/regular/star.svg';
import Stethoscope        from '../../assets/icons/regular/stethoscope.svg';
import Syringe            from '../../assets/icons/regular/syringe.svg';
import Tooth              from '../../assets/icons/regular/tooth.svg';
import Translate          from '../../assets/icons/regular/translate.svg';
import User               from '../../assets/icons/regular/user.svg';
import UserCircle         from '../../assets/icons/regular/user-circle.svg';
import VideoCamera        from '../../assets/icons/regular/video-camera.svg';
import Wallet             from '../../assets/icons/regular/wallet.svg';
import Warning            from '../../assets/icons/regular/warning.svg';
import X                  from '../../assets/icons/regular/x.svg';

export type IconName =
  | 'address-book'
  | 'arrow-left'
  | 'arrow-right'
  | 'baby'
  | 'bell'
  | 'bell-ringing'
  | 'bone'
  | 'brain'
  | 'buildings'
  | 'calendar'
  | 'caret-left'
  | 'caret-right'
  | 'chat-circle'
  | 'chat-circle-dots'
  | 'check'
  | 'check-circle'
  | 'clipboard-text'
  | 'clock'
  | 'credit-card'
  | 'currency-dollar'
  | 'dots-three-vertical'
  | 'drop'
  | 'envelope'
  | 'eye'
  | 'first-aid'
  | 'funnel'
  | 'gear'
  | 'gender-female'
  | 'graduation-cap'
  | 'heart'
  | 'house'
  | 'info'
  | 'list'
  | 'lock'
  | 'magnifying-glass'
  | 'map-pin'
  | 'map-trifold'
  | 'paper-plane-right'
  | 'phone'
  | 'pill'
  | 'plus'
  | 'pulse'
  | 'share-network'
  | 'shield-check'
  | 'sign-out'
  | 'star'
  | 'stethoscope'
  | 'syringe'
  | 'tooth'
  | 'translate'
  | 'user'
  | 'user-circle'
  | 'video-camera'
  | 'wallet'
  | 'warning'
  | 'x';

const ICONS: Record<IconName, React.ComponentType<any>> = {
  'address-book':       AddressBook,
  'arrow-left':         ArrowLeft,
  'arrow-right':        ArrowRight,
  'baby':               Baby,
  'bell':               Bell,
  'bell-ringing':       BellRinging,
  'bone':               Bone,
  'brain':              Brain,
  'buildings':          Buildings,
  'calendar':           Calendar,
  'caret-left':         CaretLeft,
  'caret-right':        CaretRight,
  'chat-circle':        ChatCircle,
  'chat-circle-dots':   ChatCircleDots,
  'check':              Check,
  'check-circle':       CheckCircle,
  'clipboard-text':     ClipboardText,
  'clock':              Clock,
  'credit-card':        CreditCard,
  'currency-dollar':    CurrencyDollar,
  'dots-three-vertical': DotsThreeVertical,
  'drop':               Drop,
  'envelope':           Envelope,
  'eye':                Eye,
  'first-aid':          FirstAid,
  'funnel':             Funnel,
  'gear':               Gear,
  'gender-female':      GenderFemale,
  'graduation-cap':     GraduationCap,
  'heart':              Heart,
  'house':              House,
  'info':               Info,
  'list':               List,
  'lock':               Lock,
  'magnifying-glass':   MagnifyingGlass,
  'map-pin':            MapPin,
  'map-trifold':        MapTrifold,
  'paper-plane-right':  PaperPlaneRight,
  'phone':              Phone,
  'pill':               Pill,
  'plus':               Plus,
  'pulse':              Pulse,
  'share-network':      ShareNetwork,
  'shield-check':       ShieldCheck,
  'sign-out':           SignOut,
  'star':               Star,
  'stethoscope':        Stethoscope,
  'syringe':            Syringe,
  'tooth':              Tooth,
  'translate':          Translate,
  'user':               User,
  'user-circle':        UserCircle,
  'video-camera':       VideoCamera,
  'wallet':             Wallet,
  'warning':            Warning,
  'x':                  X,
};

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  filled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Icon({ name, size = 24, color = '#111827', strokeWidth, filled, style }: IconProps) {
  const Cmp = ICONS[name];

  if (!Cmp) {
    return <View style={[{ width: size, height: size }, style]} />;
  }

  // Phosphor "regular" SVGs default to fill="black" stroke="currentColor".
  // We force them to use `color` as the visual color.
  return (
    <Cmp
      width={size}
      height={size}
      color={color}
      fill={filled ? color : 'none'}
      stroke={filled ? 'none' : color}
      strokeWidth={strokeWidth ?? undefined}
      style={style}
    />
  );
}

export default Icon;
