import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { Calendar, MapPin, Users, ChevronRight } from 'lucide-react';
import { tournaments } from '@client/src/api';
import type { Tournament, TournamentFormat, Player } from '@shared/api.interface';
import { Card, CardContent } from '@client/src/components/ui/card';
import { Badge } from '@client/src/components/ui/badge';

const FORMAT_LABELS: Record<TournamentFormat, string> = {
  single_elimination: '单败淘汰',
  double_elimination: '双败淘汰',
  round_robin: '循环赛',
  swiss: '瑞士轮',
  swiss_elimination: '瑞士轮+淘汰',
  round_robin_elimination: '循环+淘汰',
};

interface TournamentWithCount extends Tournament {
  playerCount: number;
}

const PlayerHomePage = () => {
  const navigate = useNavigate();
  const [list, setList] = useState<TournamentWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = async () => {
    try {
      const data: Tournament[] = await tournaments.listTournaments();
      const filtered: Tournament[] = data.filter(
        (t: Tournament) =>
          t.status === 'registering' || t.status === 'ongoing',
      );

      const withCounts: TournamentWithCount[] = await Promise.all(
        filtered.map(async (t: Tournament) => {
          try {
            const players: Player[] = await tournaments.listPlayers(t.id);
            return { ...t, playerCount: players.length };
          } catch (err) {
            logger.error(`fetch players failed for ${t.id}`, err);
            return { ...t, playerCount: 0 };
          }
        }),
      );

      setList(withCounts);
    } catch (error) {
      logger.error('fetch tournament list failed', error);
      toast.error('加载比赛列表失败');
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
  }, []);

  const renderStatusBadge = (status: string) => {
    if (status === 'registering') {
      return (
        <Badge
          variant="outline"
          style={{
            backgroundColor: 'rgba(46, 204, 113, 0.15)',
            color: '#2ecc71',
            borderColor: 'rgba(46, 204, 113, 0.4)',
          }}
        >
          报名中
        </Badge>
      );
    }
    if (status === 'ongoing') {
      return (
        <Badge
          variant="outline"
          style={{
            backgroundColor: 'hsla(48, 100%, 50%, 0.15)',
            color: 'hsl(48 100% 50%)',
            borderColor: 'hsla(48, 100%, 50%, 0.4)',
          }}
        >
          进行中
        </Badge>
      );
    }
    return null;
  };

  return (
    <div
      className="min-h-screen p-4 pb-20"
      style={{ backgroundColor: 'hsl(240 20% 5%)', color: 'hsl(0 0% 96%)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1
            className="text-3xl font-bold bg-clip-text text-transparent"
            style={{
              backgroundImage:
                'linear-gradient(90deg, hsl(355 80% 56%), hsl(48 100% 50%))',
            }}
          >
            BEYBLADE X
          </h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(240 10% 60%)' }}>
            战斗陀螺对战平台
          </p>
        </div>
        <Link
          to="/admin"
          className="text-xs"
          style={{ color: 'hsl(240 10% 60%)' }}
        >
          管理后台
        </Link>
      </div>

      {/* Loading */}
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

      {/* Tournament List */}
      {!loading && list.length === 0 && (
        <div
          className="rounded-xl p-8 text-center"
          style={{
            backgroundColor: 'hsl(240 18% 10%)',
            border: '1px solid hsl(240 15% 22%)',
          }}
        >
          <p style={{ color: 'hsl(240 10% 60%)' }}>暂无进行中的比赛</p>
        </div>
      )}

      {!loading && list.length > 0 && (
        <div className="flex flex-col gap-3">
          {list.map((t: TournamentWithCount) => {
            const progress: number = t.maxPlayers > 0
              ? Math.min(100, (t.playerCount / t.maxPlayers) * 100)
              : 0;
            return (
              <Card
                key={t.id}
                className="cursor-pointer transition-transform active:scale-[0.98]"
                style={{
                  backgroundColor: 'hsl(240 18% 10%)',
                  borderColor: 'hsl(240 15% 22%)',
                  color: 'hsl(0 0% 96%)',
                }}
                onClick={() => navigate(`/tournament/${t.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-bold flex-1 pr-2 truncate">
                      {t.name}
                    </h3>
                    {renderStatusBadge(t.status)}
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="px-2 py-0.5 rounded text-xs"
                      style={{
                        backgroundColor: 'hsla(355, 80%, 56%, 0.15)',
                        color: 'hsl(355 80% 65%)',
                      }}
                    >
                      {FORMAT_LABELS[t.format]}
                    </span>
                  </div>

                  <div
                    className="flex flex-col gap-1.5 text-sm mb-3"
                    style={{ color: 'hsl(240 10% 60%)' }}
                  >
                    {t.tournamentDate && (
                      <div className="flex items-center gap-2">
                        <Calendar size={14} />
                        <span>{t.tournamentDate}</span>
                      </div>
                    )}
                    {t.location && (
                      <div className="flex items-center gap-2">
                        <MapPin size={14} />
                        <span className="truncate">{t.location}</span>
                      </div>
                    )}
                  </div>

                  {/* Progress */}
                  <div className="mb-2">
                    <div
                      className="flex items-center justify-between text-xs mb-1.5"
                      style={{ color: 'hsl(240 10% 60%)' }}
                    >
                      <span className="flex items-center gap-1">
                        <Users size={12} />
                        报名进度
                      </span>
                      <span>
                        {t.playerCount} / {t.maxPlayers}
                      </span>
                    </div>
                    <div
                      className="w-full h-2 rounded-full overflow-hidden"
                      style={{ backgroundColor: 'hsl(240 15% 22%)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${progress}%`,
                          background:
                            'linear-gradient(90deg, hsl(355 80% 56%), hsl(48 100% 50%))',
                        }}
                      />
                    </div>
                  </div>

                  <div
                    className="flex items-center justify-end text-sm"
                    style={{ color: 'hsl(48 100% 50%)' }}
                  >
                    <span>查看详情</span>
                    <ChevronRight size={16} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PlayerHomePage;
