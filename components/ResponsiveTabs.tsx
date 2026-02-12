'use client';

import { useState, type ReactNode } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Activity,
  Users,
  Swords,
  Trophy,
  Settings,
  Gamepad2,
  Code,
  ScrollText,
  Database,
  ImageIcon,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  activity: Activity,
  users: Users,
  swords: Swords,
  trophy: Trophy,
  settings: Settings,
  gamepad2: Gamepad2,
  code: Code,
  scrolltext: ScrollText,
  database: Database,
  image: ImageIcon,
  wrench: Wrench,
};

export interface TabDefinition {
  value: string;
  label: string;
  icon?: string;
  testId?: string;
}

interface ResponsiveTabsProps {
  tabs: TabDefinition[];
  defaultValue: string;
  children: ReactNode;
  className?: string;
}

export default function ResponsiveTabs({ tabs, defaultValue, children, className }: ResponsiveTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className={className}>
      <div className="hidden md:block">
        <TabsList>
          {tabs.map((tab) => {
            const Icon = tab.icon ? ICON_MAP[tab.icon] : undefined;
            return (
              <TabsTrigger key={tab.value} value={tab.value} data-testid={tab.testId}>
                {Icon && <Icon className="w-4 h-4 mr-2" />}
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>

      <div className="block md:hidden">
        <Select value={activeTab} onValueChange={setActiveTab}>
          <SelectTrigger data-testid="select-tab-mobile">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tabs.map((tab) => {
              const Icon = tab.icon ? ICON_MAP[tab.icon] : undefined;
              return (
                <SelectItem key={tab.value} value={tab.value} data-testid={`select-tab-${tab.value}`}>
                  <span className="flex items-center gap-2">
                    {Icon && <Icon className="w-4 h-4" />}
                    {tab.label}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {children}
    </Tabs>
  );
}
