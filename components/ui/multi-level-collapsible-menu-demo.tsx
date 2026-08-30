"use client";

import {
  BellIcon,
  ChartBarIcon,
  ChevronRightIcon,
  CreditCardIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  MessageSquareIcon,
  SettingsIcon,
  ShieldIcon,
  UserIcon,
} from "lucide-react";
import { type ReactElement, useState } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/multi-level-collapsible-menu-utils/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/multi-level-collapsible-menu-utils/collapsible";
import {
  Item,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/multi-level-collapsible-menu-utils/item";

type NavItem = {
  id: string;
  name: string;
  icon: ReactElement;
  items?: NavItem[];
};

const navItems: NavItem[] = [
  {
    icon: <LayoutDashboardIcon />,
    id: "dashboard",
    items: [
      {
        icon: <ChartBarIcon />,
        id: "analytics",
        items: [
          {
            icon: <FileTextIcon aria-hidden="true" />,
            id: "real-time",
            name: "Real-time",
          },
          {
            icon: <FileTextIcon aria-hidden="true" />,
            id: "historical",
            name: "Historical",
          },
        ],
        name: "Analytics",
      },
      {
        icon: <MessageSquareIcon aria-hidden="true" />,
        id: "reports",
        name: "Reports",
      },
    ],
    name: "Dashboard",
  },
  {
    icon: <UserIcon aria-hidden="true" />,
    id: "team",
    items: [
      { icon: <UserIcon aria-hidden="true" />, id: "members", name: "Members" },
      {
        icon: <ShieldIcon aria-hidden="true" />,
        id: "permissions",
        name: "Permissions",
      },
    ],
    name: "Team",
  },
  {
    icon: <CreditCardIcon aria-hidden="true" />,
    id: "billing",
    name: "Billing",
  },
  {
    icon: <SettingsIcon aria-hidden="true" />,
    id: "settings",
    name: "Settings",
  },
  {
    icon: <BellIcon aria-hidden="true" />,
    id: "notifications",
    name: "Notifications",
  },
];

const defaultOpenIds = new Set(["dashboard", "analytics"]);

function NavMenuItem({
  item,
  level = 0,
  selectedId,
  onSelect,
}: {
  item: NavItem;
  level?: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const isFolder = !!item.items && item.items.length > 0;
  const isSelected = selectedId === item.id;

  if (isFolder) {
    return (
      <Collapsible
        className="group/collapsible"
        defaultOpen={defaultOpenIds.has(item.id)}
      >
        <CollapsibleTrigger
          nativeButton={false}
          render={
            <Item
              className="group/item cursor-pointer hover:bg-accent hover:text-foreground"
              size="xs"
              style={{ paddingLeft: `${level * 12 + 8}px` }}
            />
          }
        >
          <ItemMedia variant="icon">
            <div className="size-4 text-muted-foreground group-hover/item:text-foreground transition-colors">
              {item.icon}
            </div>
          </ItemMedia>
          <ItemTitle className="text-sm font-medium group-data-[state=open]/collapsible:font-semibold">
            {item.name}
          </ItemTitle>
          <ChevronRightIcon
            aria-hidden="true"
            className="ml-auto size-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden">
          <div className="flex flex-col gap-0.5 py-1">
            {item.items?.map((child) => (
              <NavMenuItem
                item={child}
                key={child.id}
                level={level + 1}
                onSelect={onSelect}
                selectedId={selectedId}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <Item
      className={`group/item cursor-pointer ${
        isSelected
          ? "bg-accent text-accent-foreground font-medium"
          : "hover:bg-accent hover:text-foreground"
      }`}
      onClick={() => onSelect(item.id)}
      size="xs"
      style={{ paddingLeft: `${level * 12 + 8}px` }}
    >
      <ItemMedia variant="icon">
        <div className={`size-4 transition-colors ${
          isSelected
            ? "text-accent-foreground"
            : "text-muted-foreground group-hover/item:text-foreground"
        }`}>
          {item.icon}
        </div>
      </ItemMedia>
      <ItemTitle className="text-sm">{item.name}</ItemTitle>
    </Item>
  );
}

function ExpandedMenu() {
  const [selectedId, setSelectedId] = useState<string | null>("real-time");

  return (
    <div className="w-full max-w-xs">
      <Card className="border-border">
        <CardContent>
          <div className="flex flex-col gap-0.5">
            {navItems.map((item) => (
              <NavMenuItem
                item={item}
                key={item.id}
                onSelect={setSelectedId}
                selectedId={selectedId}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function MultiLevelCollapsibleMenuDemo() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-6">
      <ExpandedMenu />
    </div>
  );
}
