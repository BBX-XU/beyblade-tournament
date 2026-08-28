import React from 'react';
import { Trophy, Medal, Award } from 'lucide-react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@client/src/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@client/src/components/ui/table';

import type { RankingItem } from '@shared/api.interface';

interface RankingTabProps {
  ranking: RankingItem[];
}

const getRankIcon = (rank: number): React.ReactNode => {
  if (rank === 1) return <Trophy className="w-5 h-5 text-accent" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-muted-foreground" />;
  if (rank === 3) return <Award className="w-5 h-5 text-amber-700" />;
  return <span className="w-5 text-center text-muted-foreground text-sm">{rank}</span>;
};

const RankingTab: React.FC<RankingTabProps> = ({ ranking }) => {
  const champion: RankingItem | undefined = ranking[0];

  return (
    <div className="space-y-4">
      {/* 冠军卡片 */}
      {champion && (
        <Card className="bg-card border-2 border-accent/60 glow-gold overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#e63946] to-[#ffd700]" />
          <CardContent className="pt-6 pb-6">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-amber-600 flex items-center justify-center glow-gold">
                <Trophy className="w-8 h-8 text-background" />
              </div>
              <div className="text-xs text-accent font-semibold tracking-widest uppercase">
                冠军
              </div>
              <div className="text-2xl font-bold text-gradient-gold">
                {champion.playerName}
              </div>
              {champion.bey && (
                <div className="text-sm text-muted-foreground">
                  陀螺：{champion.bey}
                </div>
              )}
              <div className="flex gap-6 mt-2">
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent">
                    {champion.wins}
                  </div>
                  <div className="text-xs text-muted-foreground">胜场</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {champion.losses}
                  </div>
                  <div className="text-xs text-muted-foreground">败场</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gradient-gold">
                    {champion.points}
                  </div>
                  <div className="text-xs text-muted-foreground">积分</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 排名表格 */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">完整排名</CardTitle>
        </CardHeader>
        <CardContent>
          {ranking.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              暂无排名数据
            </div>
          ) : (
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-secondary/30">
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="w-16 text-muted-foreground">排名</TableHead>
                    <TableHead className="text-foreground">姓名</TableHead>
                    <TableHead className="text-foreground">陀螺</TableHead>
                    <TableHead className="text-center text-foreground w-16">胜</TableHead>
                    <TableHead className="text-center text-foreground w-16">败</TableHead>
                    <TableHead className="text-right text-foreground w-20">积分</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranking.map((item: RankingItem) => {
                    const isTop3: boolean = item.rank <= 3;
                    return (
                      <TableRow
                        key={item.playerId}
                        className={`border-border ${
                          isTop3 ? 'bg-accent/5' : ''
                        }`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {getRankIcon(item.rank)}
                          </div>
                        </TableCell>
                        <TableCell
                          className={`font-medium ${
                            isTop3 ? 'text-accent' : 'text-foreground'
                          }`}
                        >
                          {item.playerName}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.bey || '-'}
                        </TableCell>
                        <TableCell className="text-center text-success font-medium">
                          {item.wins}
                        </TableCell>
                        <TableCell className="text-center text-destructive font-medium">
                          {item.losses}
                        </TableCell>
                        <TableCell
                          className={`text-right font-bold ${
                            isTop3 ? 'text-accent' : 'text-foreground'
                          }`}
                        >
                          {item.points}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RankingTab;
