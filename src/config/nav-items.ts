import {
  LayoutDashboard,
  Users,
  Users2,
  CalendarDays,
  MapPin,
  MessageCircle,
  MapPinned,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  comingSoon?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Users", href: "/users", icon: Users },
  { label: "Communities", href: "/communities", icon: Users2, comingSoon: true },
  { label: "Events", href: "/events", icon: CalendarDays, comingSoon: true },
  { label: "Places", href: "/places", icon: MapPin, comingSoon: true },
  { label: "Chat", href: "/chat", icon: MessageCircle, comingSoon: true },
  { label: "Locations", href: "/locations", icon: MapPinned, comingSoon: true },
  { label: "Audit log", href: "/audit-log", icon: ScrollText, comingSoon: true },
];

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
