"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { BattleProfile, TurnData } from "@/app/actions/battles";

interface DownloadBattleButtonProps {
  battle: BattleProfile;
  turns: TurnData[];
}

export function DownloadBattleButton({ battle, turns }: DownloadBattleButtonProps) {
  const handleDownload = () => {
    const exportData = {
      battleId: battle.battleId,
      displayName: battle.displayName,
      status: battle.status,
      isPrivate: battle.isPrivate,
      createdAt: battle.createdAt,
      updatedAt: battle.updatedAt,
      currentTurn: battle.currentTurn,
      currentPlayerIndex: battle.currentPlayerIndex,
      winnerId: battle.winnerId,
      endReason: battle.endReason,
      mapData: battle.mapData,
      players: {
        player1: {
          deviceId: battle.player1DeviceId,
          displayName: battle.player1DisplayName,
          avatar: battle.player1Avatar,
        },
        player2: battle.player2DeviceId ? {
          deviceId: battle.player2DeviceId,
          displayName: battle.player2DisplayName,
          avatar: battle.player2Avatar,
        } : null,
      },
      turns: [...turns].reverse().map(turn => ({
        turnId: turn.turnId,
        deviceId: turn.deviceId,
        turnNumber: turn.turnNumber,
        timestamp: turn.timestamp,
        isValid: turn.isValid,
        validationErrors: turn.validationErrors,
        actions: turn.actions,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `battle-${battle.displayName.replace(/\s+/g, "-").toLowerCase()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      data-testid="button-download-battle"
    >
      <Download className="w-4 h-4 mr-2" />
      Download JSON
    </Button>
  );
}
