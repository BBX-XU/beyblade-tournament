import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Users, Trophy, Calendar, Settings as SettingsIcon } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@client/src/components/ui/tabs';
import { Badge } from '@client/src/components/ui/badge';

import { tournaments } from '@client/src/api';
import type {
  Tournament,
  TournamentStatus,
  SignupStatus,
  Player,
  Match,
  RankingItem,
} from '@shared/api.interface';

import SettingsTab from './components/SettingsTab';
import PlayersTab from './components/PlayersTab';
import MatchesTab from './components/MatchesTab';
import RankingTab from './components/RankingTab';

const STATUS_LABELS: Record<TournamentStatus, string> = {
  pending: '待开始',
  registering: '报名中',
  ongoing: '进行中',
  finished: '已结束',
};

const STATUS_VARIANTS: Record<TournamentStatus, string> = {
  pending: 'bg-secondary text-secondary-foreground border-secondary-border',
  registering: 'bg-accent/20 text-accent border-accent/40',
  ongoing: 'bg-primary/20 text-primary border-primary/40',
  finished: 'bg-muted text-muted-foreground border-border',
};

const SIGNUP_LABELS: Record<SignupStatus, string> = {
  open: '报名开放',
  closed: '报名关闭',
};

const SIGNUP_VARIANTS: Record<SignupStatus, string> = {
  open: 'bg-accent/20 text-accent border-accent/40',
  closed: 'bg-muted text-muted-foreground border-border',
};

const AdminManagePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const tournamentId: string = id ?? '';

  const loadAll = useCallback(async (): Promise<void> => {
    if (!tournamentId) return;
    try {
      setLoading(true);
      const [t, p, m, r] = await Promise.all([
        tournaments.getTournament(tournamentId),
        tournaments.listPlayers(tournamentId),
        tournaments.listMatches(tournamentId),
        tournaments.getRanking(tournamentId),
      ]);
      setTournament(t);
      setPlayers(p);
      setMatches(m);
      setRanking(r);
    } catch (error) {
      logger.error('loadAll failed', error);
      toast.error('加载比赛数据失败');
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const refreshTournament = async (): Promise<void> => {
    if (!tournamentId) return;
    try {
      const t: Tournament = await tournaments.getTournament(tournamentId);
      setTournament(t);
    } catch (error) {
      logger.error('refreshTournament failed', error);
    }
  };

  const refreshPlayers = async (): Promise<void> => {
    if (!tournamentId) return;
    try {
      const data: Player[] = await tournaments.listPlayers(tournamentId);
      setPlayers(data);
    } catch (error) {
      logger.error('refreshPlayers failed', error);
    }
  };

  const refreshMatches = async (): Promise<void> => {
    if (!tournamentId) return;
    try {
      const data: Match[] = await tournaments.listMatches(tournamentId);
      setMatches(data);
    } catch (error) {
      logger.error('refreshMatches failed', error);
    }
  };

  const refreshRanking = async (): Promise<void> => {
    if (!tournamentId) return;
    try {
      const data: RankingItem[] = await tournaments.getRanking(tournamentId);
      setRanking(data);
    } catch (error) {
      logger.error('refreshRanking failed', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-muted-foreground">比赛不存在</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* 顶部栏 */}
        <div className="flex flex-col gap-3 mb-6">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">返回列表</span>
          </button>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <h1 className="text-xl md:text-2xl font-bold text-gradient-red-gold truncate">
              {tournament.name}
            </h1>
            <div className="flex gap-2 flex-wrap">
              <Badge className={STATUS_VARIANTS[tournament.status]}>
                {STATUS_LABELS[tournament.status]}
              </Badge>
              <Badge className={SIGNUP_VARIANTS[tournament.signupStatus]}>
                {SIGNUP_LABELS[tournament.signupStatus]}
              </Badge>
            </div>
          </div>
        </div>

        {/* Tab 导航 */}
        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="bg-secondary/50 w-full md:w-auto">
            <TabsTrigger value="settings" className="flex-1 md:flex-none">
              <SettingsIcon className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">比赛设置</span>
              <span className="sm:hidden">设置</span>
            </TabsTrigger>
            <TabsTrigger value="players" className="flex-1 md:flex-none">
              <Users className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">选手管理</span>
              <span className="sm:hidden">选手</span>
            </TabsTrigger>
            <TabsTrigger value="matches" className="flex-1 md:flex-none">
              <Calendar className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">赛程管理</span>
              <span className="sm:hidden">赛程</span>
            </TabsTrigger>
            <TabsTrigger value="ranking" className="flex-1 md:flex-none">
              <Trophy className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">排名</span>
              <span className="sm:hidden">排名</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="mt-4">
            <SettingsTab
              tournament={tournament}
              onSaved={refreshTournament}
              tournamentId={tournamentId}
            />
          </TabsContent>

          <TabsContent value="players" className="mt-4">
            <PlayersTab
              tournamentId={tournamentId}
              players={players}
              maxPlayers={tournament.maxPlayers}
              onChanged={async (): Promise<void> => {
                await refreshPlayers();
                await refreshRanking();
              }}
            />
          </TabsContent>

          <TabsContent value="matches" className="mt-4">
            <MatchesTab
              tournamentId={tournamentId}
              matches={matches}
              format={tournament.format}
              onChanged={async (): Promise<void> => {
                await refreshMatches();
                await refreshRanking();
              }}
            />
          </TabsContent>

          <TabsContent value="ranking" className="mt-4">
            <RankingTab ranking={ranking} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminManagePage;
