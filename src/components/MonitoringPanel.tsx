import { useState } from "react";
import { Activity, Users, Clock, TrendingUp, Server } from "lucide-react";
import clsx from "clsx";
import { ServerStats } from "./monitoring/ServerStats";
import { ClientList } from "./monitoring/ClientList";
import { SlowLog } from "./monitoring/SlowLog";
import { CommandStats } from "./monitoring/CommandStats";
import { MemoryAnalysis } from "./monitoring/MemoryAnalysis";

interface MonitoringPanelProps {
  connectionId: string;
}

type TabId = "overview" | "clients" | "slowlog" | "commands" | "memory";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const tabs: Tab[] = [
  {
    id: "overview",
    label: "Overview",
    icon: <Activity className="w-4 h-4" />,
  },
  {
    id: "clients",
    label: "Clients",
    icon: <Users className="w-4 h-4" />,
  },
  {
    id: "slowlog",
    label: "Slow Log",
    icon: <Clock className="w-4 h-4" />,
  },
  {
    id: "commands",
    label: "Commands",
    icon: <TrendingUp className="w-4 h-4" />,
  },
  {
    id: "memory",
    label: "Memory",
    icon: <Server className="w-4 h-4" />,
  },
];

export function MonitoringPanel({ connectionId }: MonitoringPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  return (
    <div className="h-full flex flex-col bg-white dark:bg-neutral-900">
      {/* Tab Navigation */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
        <div className="flex gap-1 p-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all",
                {
                  "bg-white dark:bg-neutral-800 text-brand-600 dark:text-brand-400 shadow-sm":
                    activeTab === tab.id,
                  "text-neutral-600 dark:text-neutral-400 hover:bg-white/50 dark:hover:bg-neutral-800/50":
                    activeTab !== tab.id,
                },
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === "overview" && (
          <ServerStats connectionId={connectionId} />
        )}
        {activeTab === "clients" && <ClientList connectionId={connectionId} />}
        {activeTab === "slowlog" && <SlowLog connectionId={connectionId} />}
        {activeTab === "commands" && (
          <CommandStats connectionId={connectionId} />
        )}
        {activeTab === "memory" && (
          <MemoryAnalysis connectionId={connectionId} />
        )}
      </div>
    </div>
  );
}
