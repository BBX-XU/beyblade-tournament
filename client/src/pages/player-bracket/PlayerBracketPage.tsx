import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { tournaments } from '@client/src/api';
import type { Match } from '@shared/api.interface';
import { Card, CardContent } from '@client/src/components/ui/card';
import BottomNav from '@client/src/components/BottomNav';

const roundLabelMap: Record<string, string> = {
  final: '决赛',
  semifinal: '半决赛',
  quarterfinal: '四分之一决赛',
  '1/2': '半决赛',
  '1/4': '四分之一决赛',
  '1/8': '八分之一决赛',
  '1/16': '十六分之一决赛',
};

const getRoundLabel = (round: string): string => {
  if (roundLabelMap[round]) return roundLabelMap[round];
  if (round.startsWith('round_') || round.startsWith('swiss_')) {
    const num = round.replace(/[^0-9]/g, '');
    return `第 ${num} 轮`;
  }
  if (/^[Rr]ound\s*\d+/.test(round)) {
    const num = round.replace(/[^0-9]/g, '');
    return `第 ${num} 轮`;
  }
  return round;
};

const PlayerBracketPage = () => {
  const { id } = useParams<{ id: string }>();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = async () => {
    if (!id) return;
    try {
      const data: Match[] = await tournaments.listMatches(id);
      setMatches(data);
    } catch (error) {
      logger.error('fetch matches failed', error);
      toast.error('加载赛程失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    pollRef.current = setInterval(fetchData, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Group by round
  const roundsMap = new Map<string, Match[]>();
  for (const m of matches) {
    const key = m.round;
    if (!roundsMap.has(key)) roundsMap.set(key, []);
    roundsMap.get(key)!.push(m);
  }
  // Sort each round's matches by matchIndex
  for (const [, list] of roundsMap) {
    list.sort((a, b) => a.matchIndex - b.matchIndex);
  }
  // Round order: try numeric extraction
  const roundKeys = Array.from(roundsMap.keys()).sort((a, b) => {
    const numA = parseInt(a.replace(/[^0-9]/g, ''), 10) || 0;
    const numB = parseInt(b.replace(/[^0-9]/g, ''), 10) || 0;
    return numA - numB;
  });

  return (
    <div
      className="min-h-screen p-4 pb-20"
      style={{ backgroundColor: 'hsl(240 20% 5%)', color: 'hsl(0 0% 96%)' }}
    >
      <h1 className="text-2xl font-bold mb-4">赛程对阵</h1>

      {loading && (
        <div className="flex justify-center py-12">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{
              borderColor: 'hsl(48 100% 50%)',
              borderTopColor: 'transparent',
            }}
          />
        </div>
      )}

      {!loading && matches.length === 0 && (
        <div
          className="rounded-xl p-8 text-center"
          style={{
            backgroundColor: 'hsl(240 18% 10%)',
            border: '1px solid hsl(240 15% 22%)',
          }}
        >
          <p style={{ color: 'hsl(240 10% 60%)' }}>暂无赛程信息</p>
        </div>
      )}

      {!loading && matches.length > 0 && (
        <div className="flex flex-col gap-5">
          {roundKeys.map((roundKey) => {
            const roundMatches: Match[] = roundsMap.get(roundKey) || [];
            return (
              <div key={roundKey}>
                <h2
                  className="text-base font-bold mb-3 flex items-center gap-2"
                  style={{ color: 'hsl(0 0% 96%)' }}
                >
                  <span
                    className="w-1 h-4 rounded-full"
                    style={{ backgroundColor: 'hsl(355 80% 56%)' }}
                  />
                  {getRoundLabel(roundKey)}
                </h2>
                <div className="flex flex-col gap-2">
                  {roundMatches.map((m: Match) => {
                    const isFinished = m.status === 'finished';
                    return (
                      <Card
                        key={m.id}
                        style={{
                          backgroundColor: 'hsl(240 18% 10%)',
                          borderColor: isFinished
                            ? 'hsla(48, 100%, 50%, 0.6)'
                            : 'hsl(240 15% 22%)',
                          color: 'hsl(0 0% 96%)',
                          boxShadow: isFinished
                            ? '0 0 12px rgba(255, 215, 0, 0.15)'
                            : 'none',
                        }}
                      >
                        <CardContent className="p-3">
                          {/* Player 1 */}
                          <div className="flex items-center justify-between py-1">
                            <span
                              className="flex-1 truncate pr-2"
                              style={{
                                color:
                                  isFinished && m.winnerId === m.player1Id
                                    ? 'hsl(48 100% 50%)'
                                    : 'hsl(0 0% 96%)',
                                fontWeight:
                                  isFinished && m.winnerId === m.player1Id
                                    ? 700
                                    : 400,
                              }}
                            >
                              {m.player1Name || (m.player1Id ? '选手1' : '待定')}
                            </span>
                            <span
                              className="text-lg font-bold tabular-nums min-w-[2ch] text-right"
                              style={{
                                color:
                                  isFinished && m.winnerId === m.player1Id
                                    ? 'hsl(48 100% 50%)'
                                    : 'hsl(240 10% 60%)',
                              }}
                            >
                              {isFinished ? m.score1 : '-'}
                            </span>
                          </div>

                          <div
                            className="text-center text-xs py-1"
                            style={{ color: 'hsl(240 15% 22%)' }}
                          >
                            VS
                          </div>

                          {/* Player 2 */}
                          <div className="flex items-center justify-between py-1">
                            <span
                              className="flex-1 truncate pr-2"
                              style={{
                                color:
                                  isFinished && m.winnerId === m.player2Id
                                    ? 'hsl(48 100% 50%)'
                                    : 'hsl(0 0% 96%)',
                                fontWeight:
                                  isFinished && m.winnerId === m.player2Id
                                    ? 700
                                    : 400,
                              }}
                            >
                              {m.player2Name || (m.player2Id ? '选手2' : '待定')}
                            </span>
                            <span
                              className="text-lg font-bold tabular-nums min-w-[2ch] text-right"
                              style={{
                                color:
                                  isFinished && m.winnerId === m.player2Id
                                    ? 'hsl(48 100% 50%)'
                                    : 'hsl(240 10% 60%)',
                              }}
                            >
                              {isFinished ? m.score2 : '-'}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default PlayerBracketPage;
