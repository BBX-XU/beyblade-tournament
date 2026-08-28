import React, { useState } from 'react';
import { toast } from 'sonner';
import { Swords, PlayCircle, Edit3, RefreshCw, Trophy } from 'lucide-react';
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
import { Badge } from '@client/src/components/ui/badge';

import { tournaments } from '@client/src/api';
import type { Match, TournamentFormat } from '@shared/api.interface';

const FORMAT_LABELS: Record<TournamentFormat, string> = {
  single_elimination: '单败淘汰',
  double_elimination: '双败淘汰',
  round_robin: '循环赛',
  swiss: '瑞士轮',
  swiss_elimination: '瑞士轮+淘汰',
  round_robin_elimination: '循环+淘汰',
};

const ROUND_LABELS: Record<string, string> = {
  round_of_16: '16强赛',
  quarterfinal: '四分之一决赛',
  semifinal: '半决赛',
  final: '决赛',
  grand_final: '总决赛',
};

const getRoundLabel = (round: string): string => {
  if (ROUND_LABELS[round]) return ROUND_LABELS[round];
  const roundMatch: RegExpMatchArray | null = round.match(/^round_(\d+)$/);
  if (roundMatch) return `第${roundMatch[1]}轮`;
  const losersMatch: RegExpMatchArray | null = round.match(/^losers_round_(\d+)$/);
  if (losersMatch) return `败者组第${losersMatch[1]}轮`;
  return round;
};

interface MatchesTabProps {
  tournamentId: string;
  matches: Match[];
  format: TournamentFormat;
  onChanged: () => void;
}

const MatchesTab: React.FC<MatchesTabProps> = ({ tournamentId, matches, format, onChanged }) => {
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [score1, setScore1] = useState<string>('0');
  const [score2, setScore2] = useState<string>('0');
  const [generating, setGenerating] = useState<boolean>(false);
  const [updating, setUpdating] = useState<boolean>(false);
  const [generatingNext, setGeneratingNext] = useState<boolean>(false);

  const handleGenerate = async (): Promise<void> => {
    try {
      setGenerating(true);
      await tournaments.generateMatches(tournamentId);
      toast.success('赛程已生成');
      onChanged();
    } catch (error) {
      logger.error('generateMatches failed', error);
      toast.error('生成失败，请确保已有选手');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateNextRound = async (): Promise<void> => {
    try {
      setGeneratingNext(true);
      await tournaments.generateNextRound(tournamentId);
      toast.success('下一轮已生成');
      onChanged();
    } catch (error) {
      logger.error('generateNextRound failed', error);
      toast.error('生成下一轮失败');
    } finally {
      setGeneratingNext(false);
    }
  };

  const openScoreDialog = (match: Match): void => {
    setEditingMatch(match);
    setScore1(String(match.score1));
    setScore2(String(match.score2));
  };

  const handleUpdateScore = async (): Promise<void> => {
    if (!editingMatch) return;
    const s1: number = parseInt(score1, 10);
    const s2: number = parseInt(score2, 10);
    if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0) {
      toast.error('请输入有效的比分');
      return;
    }
    try {
      setUpdating(true);
      await tournaments.updateMatch(tournamentId, editingMatch.id, {
        score1: s1,
        score2: s2,
      });
      toast.success('比分已更新');
      setEditingMatch(null);
      onChanged();
    } catch (error) {
      logger.error('updateMatch failed', error);
      toast.error('更新失败');
    } finally {
      setUpdating(false);
    }
  };

  // 按轮次分组
  const rounds: Map<string, Match[]> = new Map<string, Match[]>();
  for (const m of matches) {
    const key: string = m.round;
    if (!rounds.has(key)) rounds.set(key, []);
    rounds.get(key)!.push(m);
  }
  // 组内按 matchIndex 排序
  for (const [, list] of rounds) {
    list.sort((a: Match, b: Match) => a.matchIndex - b.matchIndex);
  }
  const roundKeys: string[] = Array.from(rounds.keys());

  const swissFormats: TournamentFormat[] = ['swiss', 'swiss_elimination'];
  const combinedFormats: TournamentFormat[] = ['swiss_elimination', 'round_robin_elimination'];

  const isSwissFormat = swissFormats.includes(format);
  const isCombinedFormat = combinedFormats.includes(format);

  const currentSwissRound = (): number => {
    let maxRound = 0;
    for (const [roundKey, list] of rounds) {
      const match = roundKey.match(/^round_(\d+)$/);
      if (match && list.some((m: Match) => m.player1Id && m.player2Id)) {
        maxRound = Math.max(maxRound, parseInt(match[1], 10));
      }
    }
    return maxRound;
  };

  const isCurrentRoundComplete = (): boolean => {
    const cur = currentSwissRound();
    if (cur === 0) return false;
    const curKey = `round_${cur}`;
    const list = rounds.get(curKey);
    if (!list || list.length === 0) return false;
    return list.every((m: Match) => m.status === 'finished');
  };

  const hasEliminationPhase = (): boolean => {
    return roundKeys.some((r: string) => r.startsWith('elimination_'));
  };

  const isRoundRobinComplete = (): boolean => {
    const rrRounds = roundKeys.filter((r: string) => /^round_\d+$/.test(r));
    if (rrRounds.length === 0) return false;
    return rrRounds.every((r: string) => {
      const list = rounds.get(r);
      return list && list.every((m: Match) => m.status === 'finished');
    });
  };

  const showNextRoundButton = isSwissFormat && isCurrentRoundComplete() && !hasEliminationPhase();
  const showGenerateEliminationButton =
    isCombinedFormat &&
    (format === 'round_robin_elimination'
      ? isRoundRobinComplete() && !hasEliminationPhase()
      : isCurrentRoundComplete() && !hasEliminationPhase());

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Swords className="w-5 h-5 text-primary" />
                赛程管理
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                赛制：{FORMAT_LABELS[format]}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleGenerate}
                disabled={generating || matches.length > 0}
                className="bg-accent text-accent-foreground hover:bg-accent/90 border-accent-border"
              >
                <PlayCircle className="w-4 h-4" />
                {matches.length > 0 ? '已生成赛程' : '生成赛程'}
              </Button>
              {showNextRoundButton && (
                <Button
                  onClick={handleGenerateNextRound}
                  disabled={generatingNext}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 border-primary-border"
                >
                  <RefreshCw className="w-4 h-4" />
                  生成下一轮
                </Button>
              )}
              {showGenerateEliminationButton && (
                <Button
                  onClick={handleGenerateNextRound}
                  disabled={generatingNext}
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/90 border-secondary-border"
                >
                  <Trophy className="w-4 h-4" />
                  生成淘汰赛
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {matches.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
                <Swords className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">还没有赛程</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                请先添加选手，然后点击「生成赛程」
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {roundKeys.map((roundKey: string) => (
                <div key={roundKey}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1 bg-border" />
                    <h3 className="text-sm font-semibold text-accent px-3 py-1 rounded-full bg-accent/10 border border-accent/30">
                      {getRoundLabel(roundKey)}
                    </h3>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {rounds.get(roundKey)!.map((m: Match) => {
                      const isFinished: boolean = m.status === 'finished';
                      const p1Win: boolean = isFinished && m.winnerId === m.player1Id;
                      const p2Win: boolean = isFinished && m.winnerId === m.player2Id;
                      return (
                        <div
                          key={m.id}
                          onClick={() => openScoreDialog(m)}
                          className={`relative rounded-lg border p-3 cursor-pointer transition-all ${
                            isFinished
                              ? 'border-accent/50 bg-accent/5 hover:bg-accent/10'
                              : 'border-border bg-secondary/20 hover:border-primary/50 hover:bg-secondary/40'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-muted-foreground">
                              #{m.matchIndex + 1}
                            </span>
                            <Badge
                              className={
                                isFinished
                                  ? 'bg-accent/20 text-accent border-accent/40 text-[10px]'
                                  : 'bg-secondary text-secondary-foreground border-secondary-border text-[10px]'
                              }
                            >
                              {isFinished ? '已完成' : '待开始'}
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span
                                className={`font-medium truncate ${
                                  p1Win ? 'text-accent font-bold' : 'text-foreground'
                                }`}
                              >
                                {m.player1Name || '待定'}
                              </span>
                              <span
                                className={`font-mono text-lg font-bold ml-2 ${
                                  p1Win ? 'text-accent' : 'text-muted-foreground'
                                }`}
                              >
                                {m.score1}
                              </span>
                            </div>
                            <div className="text-center text-xs text-muted-foreground">
                              VS
                            </div>
                            <div className="flex items-center justify-between">
                              <span
                                className={`font-medium truncate ${
                                  p2Win ? 'text-accent font-bold' : 'text-foreground'
                                }`}
                              >
                                {m.player2Name || '待定'}
                              </span>
                              <span
                                className={`font-mono text-lg font-bold ml-2 ${
                                  p2Win ? 'text-accent' : 'text-muted-foreground'
                                }`}
                              >
                                {m.score2}
                              </span>
                            </div>
                          </div>
                          <div className="absolute top-2 right-2 opacity-0 hover:opacity-100 transition-opacity">
                            <Edit3 className="w-3 h-3 text-muted-foreground" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 比分录入对话框 */}
      <Dialog
        open={!!editingMatch}
        onOpenChange={(open: boolean) => {
          if (!open) setEditingMatch(null);
        }}
      >
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-gradient-red-gold">录入比分</DialogTitle>
          </DialogHeader>
          {editingMatch && (
            <div className="space-y-4">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div className="text-right">
                  <div className="font-medium truncate">
                    {editingMatch.player1Name || '选手1'}
                  </div>
                </div>
                <div className="text-muted-foreground text-sm">VS</div>
                <div className="text-left">
                  <div className="font-medium truncate">
                    {editingMatch.player2Name || '选手2'}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="score1" className="text-center block">
                    选手1 得分
                  </Label>
                  <Input
                    id="score1"
                    type="number"
                    min={0}
                    value={score1}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setScore1(e.target.value)
                    }
                    className="bg-background border-input text-center text-xl font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="score2" className="text-center block">
                    选手2 得分
                  </Label>
                  <Input
                    id="score2"
                    type="number"
                    min={0}
                    value={score2}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setScore2(e.target.value)
                    }
                    className="bg-background border-input text-center text-xl font-mono"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-border text-foreground">
                取消
              </Button>
            </DialogClose>
            <Button
              onClick={handleUpdateScore}
              disabled={updating}
              className="bg-primary text-primary-foreground border-primary-border"
            >
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MatchesTab;
