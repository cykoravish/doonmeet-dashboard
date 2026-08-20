import {
  LayoutDashboard,
  Users,
  Users2,
  CalendarDays,
  MapPin,
  MessageCircle,
  MapPinned,
  ScrollText,
  Mail,
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
  { label: "Communities", href: "/communities", icon: Users2 },
  { label: "Events", href: "/events", icon: CalendarDays },
  { label: "Places", href: "/places", icon: MapPin },
  { label: "Chat", href: "/chat", icon: MessageCircle },
  { label: "Locations", href: "/locations", icon: MapPinned },
  { label: "Email logs", href: "/email-logs", icon: Mail },
  { label: "Audit log", href: "/audit-log", icon: ScrollText },
];

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
