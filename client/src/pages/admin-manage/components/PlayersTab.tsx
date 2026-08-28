import React, { useState } from 'react';
import { toast } from 'sonner';
import { UserPlus, Shuffle, Wand2, Trash2, Users } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';

import { Button } from '@client/src/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@client/src/components/ui/card';
import { Input } from '@client/src/components/ui/input';
import { Label } from '@client/src/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@client/src/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@client/src/components/ui/table';
import { Badge } from '@client/src/components/ui/badge';

import { tournaments } from '@client/src/api';
import type { Player } from '@shared/api.interface';
import { showConfirm } from '@lark-apaas/client-toolkit';

interface PlayersTabProps {
  tournamentId: string;
  players: Player[];
  maxPlayers: number;
  onChanged: () => void;
}

const PlayersTab: React.FC<PlayersTabProps> = ({ tournamentId, players, maxPlayers, onChanged }) => {
  const [addOpen, setAddOpen] = useState<boolean>(false);
  const [playerName, setPlayerName] = useState<string>('');
  const [playerBey, setPlayerBey] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string>('');

  const handleAdd = async (): Promise<void> => {
    if (!playerName.trim()) {
      toast.error('请输入选手姓名');
      return;
    }
    try {
      setActionLoading('add');
      await tournaments.addPlayer(tournamentId, {
        name: playerName.trim(),
        bey: playerBey.trim() || undefined,
      });
      toast.success('添加成功');
      setAddOpen(false);
      setPlayerName('');
      setPlayerBey('');
      onChanged();
    } catch (error) {
      logger.error('addPlayer failed', error);
      toast.error('添加失败');
    } finally {
      setActionLoading('');
    }
  };

  const handleDelete = async (playerId: string, name: string): Promise<void> => {
    if (!await showConfirm(`确定要删除选手「${name}」吗？`)) return;
    try {
      await tournaments.deletePlayer(tournamentId, playerId);
      toast.success('已删除');
      onChanged();
    } catch (error) {
      logger.error('deletePlayer failed', error);
      toast.error('删除失败');
    }
  };

  const handleShuffle = async (): Promise<void> => {
    if (players.length < 2) {
      toast.error('选手数量不足，无法打乱');
      return;
    }
    try {
      setActionLoading('shuffle');
      await tournaments.shufflePlayers(tournamentId);
      toast.success('已随机打乱');
      onChanged();
    } catch (error) {
      logger.error('shufflePlayers failed', error);
      toast.error('打乱失败');
    } finally {
      setActionLoading('');
    }
  };

  const handleFillSample = async (): Promise<void> => {
    try {
      setActionLoading('fill');
      await tournaments.fillSamplePlayers(tournamentId);
      toast.success('已填充示例选手');
      onChanged();
    } catch (error) {
      logger.error('fillSamplePlayers failed', error);
      toast.error('填充失败');
    } finally {
      setActionLoading('');
    }
  };

  const isFull: boolean = players.length >= maxPlayers;

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg">选手管理</CardTitle>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>
                  报名人数：
                  <span
                    className={isFull ? 'text-accent font-semibold' : 'text-foreground'}
                  >
                    {players.length}
                  </span>
                  <span> / {maxPlayers}</span>
                </span>
                {isFull && (
                  <Badge className="bg-accent/20 text-accent border-accent/40">
                    已满
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="bg-primary text-primary-foreground border-primary-border"
                    disabled={isFull}
                  >
                    <UserPlus className="w-4 h-4" />
                    添加选手
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border text-foreground">
                  <DialogHeader>
                    <DialogTitle className="text-gradient-red-gold">
                      添加选手
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="p-name">姓名</Label>
                      <Input
                        id="p-name"
                        value={playerName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setPlayerName(e.target.value)
                        }
                        placeholder="请输入选手姓名"
                        className="bg-background border-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="p-bey">常用陀螺</Label>
                      <Input
                        id="p-bey"
                        value={playerBey}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setPlayerBey(e.target.value)
                        }
                        placeholder="选填"
                        className="bg-background border-input"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline" className="border-border text-foreground">
                        取消
                      </Button>
                    </DialogClose>
                    <Button
                      onClick={handleAdd}
                      disabled={actionLoading === 'add'}
                      className="bg-primary text-primary-foreground border-primary-border"
                    >
                      添加
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button
                size="sm"
                variant="outline"
                onClick={handleFillSample}
                disabled={actionLoading === 'fill' || isFull}
                className="border-border text-foreground"
              >
                <Wand2 className="w-4 h-4" />
                快速填充
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleShuffle}
                disabled={actionLoading === 'shuffle' || players.length < 2}
                className="border-border text-foreground"
              >
                <Shuffle className="w-4 h-4" />
                随机打乱
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {players.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              还没有选手，点击「添加选手」或「快速填充」
            </div>
          ) : (
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-secondary/30">
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="w-14 text-muted-foreground">序号</TableHead>
                    <TableHead className="text-foreground">姓名</TableHead>
                    <TableHead className="text-foreground">常用陀螺</TableHead>
                    <TableHead className="w-20 text-muted-foreground">Seed</TableHead>
                    <TableHead className="w-20 text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {players.map((p: Player, idx: number) => (
                    <TableRow key={p.id} className="border-border">
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium text-foreground">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.bey || '-'}
                      </TableCell>
                      <TableCell className="text-accent font-mono">
                        {p.seed ?? '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(p.id, p.name)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PlayersTab;
