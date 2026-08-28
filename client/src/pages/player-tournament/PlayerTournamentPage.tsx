import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import {
  Calendar,
  MapPin,
  Users,
  ChevronDown,
  ChevronUp,
  Trophy,
  BarChart3,
} from 'lucide-react';
import { tournaments } from '@client/src/api';
import type { Tournament, Player, TournamentFormat } from '@shared/api.interface';
import { Card, CardContent, CardHeader, CardTitle } from '@client/src/components/ui/card';
import { Badge } from '@client/src/components/ui/badge';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import BottomNav from '@client/src/components/BottomNav';

const FORMAT_LABELS: Record<TournamentFormat, string> = {
  single_elimination: '单败淘汰',
  double_elimination: '双败淘汰',
  round_robin: '循环赛',
  swiss: '瑞士轮',
  swiss_elimination: '瑞士轮+淘汰',
  round_robin_elimination: '循环+淘汰',
};

const PlayerTournamentPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [bey, setBey] = useState('');
  const [myPlayer, setMyPlayer] = useState<Player | null>(null);
  const [showPlayers, setShowPlayers] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const storageKey = id ? `beyblade_player_${id}` : '';

  const fetchData = async () => {
    if (!id) return;
    try {
      const [t, pList]: [Tournament, Player[]] = await Promise.all([
        tournaments.getTournament(id),
        tournaments.listPlayers(id),
      ]);
      setTournament(t);
      setPlayers(pList);
      if (storageKey) {
        const savedId = localStorage.getItem(storageKey);
        if (savedId) {
          const found = pList.find((p: Player) => p.id === savedId);
          setMyPlayer(found || null);
        }
      }
    } catch (error) {
      logger.error('fetch tournament detail failed', error);
      toast.error('加载比赛详情失败');
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

  const handleSignup = async () => {
    if (!id || !name.trim()) {
      toast.error('请输入姓名');
      return;
    }
    setSubmitting(true);
    try {
      const player: Player = await tournaments.addPlayer(id, {
        name: name.trim(),
        bey: bey.trim() || undefined,
      });
      setMyPlayer(player);
      if (storageKey) localStorage.setItem(storageKey, player.id);
      toast.success('报名成功！');
      const pList: Player[] = await tournaments.listPlayers(id);
      setPlayers(pList);
    } catch (error) {
      logger.error('signup failed', error);
      toast.error('报名失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'hsl(240 20% 5%)' }}
      >
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'hsl(48 100% 50%)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: 'hsl(240 20% 5%)', color: 'hsl(0 0% 96%)' }}
      >
        <p>比赛不存在</p>
      </div>
    );
  }

  const progress = tournament.maxPlayers > 0
    ? Math.min(100, (players.length / tournament.maxPlayers) * 100)
    : 0;
  const isRegistering = tournament.status === 'registering'
    && tournament.signupStatus === 'open';
  const isOngoingOrFinished = tournament.status === 'ongoing'
    || tournament.status === 'finished';

  const cardStyle = {
    backgroundColor: 'hsl(240 18% 10%)',
    borderColor: 'hsl(240 15% 22%)',
    color: 'hsl(0 0% 96%)',
  };
  const mutedColor = 'hsl(240 10% 60%)';

  return (
    <div
      className="min-h-screen p-4 pb-20"
      style={{ backgroundColor: 'hsl(240 20% 5%)', color: 'hsl(0 0% 96%)' }}
    >
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-2">{tournament.name}</h1>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span
            className="px-2 py-0.5 rounded text-xs"
            style={{
              backgroundColor: 'hsla(355, 80%, 56%, 0.15)',
              color: 'hsl(355 80% 65%)',
            }}
          >
            {FORMAT_LABELS[tournament.format]}
          </span>
          {tournament.status === 'registering' && (
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
          )}
          {tournament.status === 'ongoing' && (
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
          )}
          {tournament.status === 'finished' && (
            <Badge variant="outline" style={{ color: mutedColor, borderColor: 'hsla(240,10%,60%,0.4)' }}>
              已结束
            </Badge>
          )}
        </div>
        <div className="flex flex-col gap-1.5 text-sm" style={{ color: mutedColor }}>
          {tournament.tournamentDate && (
            <div className="flex items-center gap-2">
              <Calendar size={14} /><span>{tournament.tournamentDate}</span>
            </div>
          )}
          {tournament.location && (
            <div className="flex items-center gap-2">
              <MapPin size={14} /><span>{tournament.location}</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress */}
      <Card className="mb-4" style={cardStyle}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm mb-2" style={{ color: mutedColor }}>
            <span className="flex items-center gap-1"><Users size={14} />报名人数</span>
            <span style={{ color: 'hsl(0 0% 96%)' }}>
              {players.length} / {tournament.maxPlayers}
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'hsl(240 15% 22%)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, hsl(355 80% 56%), hsl(48 100% 50%))',
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Signup Form */}
      {isRegistering && !myPlayer && (
        <Card className="mb-4" style={cardStyle}>
          <CardHeader className="pb-2"><CardTitle className="text-lg">立即报名</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0 flex flex-col gap-3">
            <div>
              <label className="text-sm mb-1.5 block" style={{ color: mutedColor }}>姓名</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入您的姓名"
                style={{ borderColor: 'hsl(240 15% 22%)', color: 'hsl(0 0% 96%)' }}
              />
            </div>
            <div>
              <label className="text-sm mb-1.5 block" style={{ color: mutedColor }}>常用陀螺</label>
              <Input
                value={bey}
                onChange={(e) => setBey(e.target.value)}
                placeholder="例如：Dragoon Storm"
                style={{ borderColor: 'hsl(240 15% 22%)', color: 'hsl(0 0% 96%)' }}
              />
            </div>
            <Button
              onClick={handleSignup}
              disabled={submitting || !name.trim()}
              className="w-full mt-2"
              style={{
                backgroundColor: 'hsl(48 100% 50%)',
                color: 'hsl(240 20% 5%)',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '16px',
                height: '48px',
              }}
            >
              {submitting ? '报名中...' : '立即报名'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Signed Up Card */}
      {myPlayer && (
        <Card
          className="mb-4"
          style={{
            backgroundColor: 'hsl(240 18% 10%)',
            borderColor: 'rgba(46, 204, 113, 0.5)',
            color: 'hsl(0 0% 96%)',
            boxShadow: '0 0 15px rgba(46, 204, 113, 0.15)',
          }}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Badge
                variant="outline"
                style={{
                  backgroundColor: 'rgba(46, 204, 113, 0.15)',
                  color: '#2ecc71',
                  borderColor: 'rgba(46, 204, 113, 0.4)',
                }}
              >
                ✓ 已报名
              </Badge>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span style={{ color: mutedColor }}>序号</span>
                <span className="font-bold" style={{ color: 'hsl(48 100% 50%)' }}>
                  #{myPlayer.seed ?? '-'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: mutedColor }}>姓名</span>
                <span className="font-medium">{myPlayer.name}</span>
              </div>
              {myPlayer.bey && (
                <div className="flex items-center justify-between">
                  <span style={{ color: mutedColor }}>常用陀螺</span>
                  <span className="font-medium">{myPlayer.bey}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ongoing/Finished Entries */}
      {isOngoingOrFinished && (
        <div className="flex flex-col gap-3 mb-4">
          <Card
            className="cursor-pointer transition-transform active:scale-[0.98]"
            style={cardStyle}
            onClick={() => navigate(`/tournament/${id}/bracket`)}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'hsla(355, 80%, 56%, 0.2)', color: 'hsl(355 80% 65%)' }}
                >
                  <Trophy size={20} />
                </div>
                <div>
                  <p className="font-semibold">查看赛程</p>
                  <p className="text-xs" style={{ color: mutedColor }}>对阵图与实时比分</p>
                </div>
              </div>
              <span style={{ color: 'hsl(48 100% 50%)' }}>→</span>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer transition-transform active:scale-[0.98]"
            style={cardStyle}
            onClick={() => navigate(`/tournament/${id}/ranking`)}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'hsla(48, 100%, 50%, 0.2)', color: 'hsl(48 100% 50%)' }}
                >
                  <BarChart3 size={20} />
                </div>
                <div>
                  <p className="font-semibold">查看排名</p>
                  <p className="text-xs" style={{ color: mutedColor }}>选手积分排行榜</p>
                </div>
              </div>
              <span style={{ color: 'hsl(48 100% 50%)' }}>→</span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Player List */}
      <Card style={cardStyle}>
        <button
          className="w-full p-4 flex items-center justify-between text-left"
          onClick={() => setShowPlayers(!showPlayers)}
        >
          <span className="font-semibold">报名名单 ({players.length})</span>
          {showPlayers ? (
            <ChevronUp size={18} style={{ color: mutedColor }} />
          ) : (
            <ChevronDown size={18} style={{ color: mutedColor }} />
          )}
        </button>
        {showPlayers && (
          <div
            className="border-t px-4 py-2 max-h-80 overflow-y-auto"
            style={{ borderColor: 'hsl(240 15% 22%)' }}
          >
            {players.length === 0 && (
              <p className="text-sm py-4 text-center" style={{ color: mutedColor }}>
                暂无报名选手
              </p>
            )}
            {players.map((p: Player, idx: number) => (
              <div
                key={p.id}
                className="flex items-center justify-between py-2 text-sm"
                style={{
                  borderBottom: idx < players.length - 1 ? '1px solid hsl(240 15% 22%)' : 'none',
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center text-xs" style={{ color: mutedColor }}>
                    {p.seed ?? idx + 1}
                  </span>
                  <span
                    className={myPlayer?.id === p.id ? 'font-bold' : 'font-medium'}
                    style={{
                      color: myPlayer?.id === p.id ? 'hsl(48 100% 50%)' : 'hsl(0 0% 96%)',
                    }}
                  >
                    {p.name}
                    {myPlayer?.id === p.id && ' (我)'}
                  </span>
                </div>
                {p.bey && (
                  <span className="text-xs truncate max-w-[40%] text-right" style={{ color: mutedColor }}>
                    {p.bey}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <BottomNav />
    </div>
  );
};

export default PlayerTournamentPage;
