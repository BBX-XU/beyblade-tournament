import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { Crown, Medal } from 'lucide-react';
import { tournaments } from '@client/src/api';
import type { RankingItem } from '@shared/api.interface';
import { Card, CardContent } from '@client/src/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import BottomNav from '@client/src/components/BottomNav';

const PlayerRankingPage = () => {
  const { id } = useParams<{ id: string }>();
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = async () => {
    if (!id) return;
    try {
      const data: RankingItem[] = await tournaments.getRanking(id);
      setRanking(data);
    } catch (error) {
      logger.error('fetch ranking failed', error);
      toast.error('加载排名失败');
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

  const champion = ranking.length > 0 ? ranking[0] : null;
  const rest = ranking.length > 1 ? ranking.slice(1) : [];

  return (
    <div
      className="min-h-screen p-4 pb-20"
      style={{ backgroundColor: 'hsl(240 20% 5%)', color: 'hsl(0 0% 96%)' }}
    >
      <h1 className="text-2xl font-bold mb-4">积分榜</h1>

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

      {!loading && ranking.length === 0 && (
        <div
          className="rounded-xl p-8 text-center"
          style={{
            backgroundColor: 'hsl(240 18% 10%)',
            border: '1px solid hsl(240 15% 22%)',
          }}
        >
          <p style={{ color: 'hsl(240 10% 60%)' }}>暂无排名数据</p>
        </div>
      )}

      {!loading && champion && (
        <>
          {/* Champion Card */}
          <Card
            className="mb-5"
            style={{
              backgroundColor: 'hsl(240 18% 10%)',
              borderColor: 'hsl(48 100% 50%)',
              color: 'hsl(0 0% 96%)',
              boxShadow: '0 0 25px rgba(255, 215, 0, 0.3)',
            }}
          >
            <CardContent className="p-5 text-center">
              <div
                className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center"
                style={{
                  background:
                    'linear-gradient(135deg, hsl(48 100% 60%), hsl(48 100% 40%))',
                  color: 'hsl(240 20% 5%)',
                  boxShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
                }}
              >
                <Crown size={32} />
              </div>
              <p
                className="text-xs mb-1"
                style={{ color: 'hsl(48 100% 50%)' }}
              >
                🏆 冠军
              </p>
              <h2
                className="text-2xl font-bold mb-1"
                style={{ color: 'hsl(48 100% 50%)' }}
              >
                {champion.playerName}
              </h2>
              {champion.bey && (
                <p
                  className="text-sm mb-3"
                  style={{ color: 'hsl(240 10% 60%)' }}
                >
                  {champion.bey}
                </p>
              )}
              <div className="flex items-center justify-center gap-6 text-sm">
                <div className="text-center">
                  <p
                    className="text-xl font-bold"
                    style={{ color: 'hsl(48 100% 50%)' }}
                  >
                    {champion.wins}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: 'hsl(240 10% 60%)' }}
                  >
                    胜场
                  </p>
                </div>
                <div className="text-center">
                  <p
                    className="text-xl font-bold"
                    style={{ color: 'hsl(355 80% 65%)' }}
                  >
                    {champion.losses}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: 'hsl(240 10% 60%)' }}
                  >
                    败场
                  </p>
                </div>
                <div className="text-center">
                  <p
                    className="text-xl font-bold"
                    style={{ color: 'hsl(0 0% 96%)' }}
                  >
                    {champion.points}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: 'hsl(240 10% 60%)' }}
                  >
                    积分
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ranking Table */}
          <Card
            style={{
              backgroundColor: 'hsl(240 18% 10%)',
              borderColor: 'hsl(240 15% 22%)',
              color: 'hsl(0 0% 96%)',
            }}
          >
            <CardContent className="p-0">
              <Table>
                <TableHeader
                  style={{ backgroundColor: 'hsl(240 15% 15%)' }}
                >
                  <TableRow style={{ borderColor: 'hsl(240 15% 22%)' }}>
                    <TableHead style={{ color: 'hsl(240 10% 60%)' }}>
                      排名
                    </TableHead>
                    <TableHead style={{ color: 'hsl(240 10% 60%)' }}>
                      姓名
                    </TableHead>
                    <TableHead style={{ color: 'hsl(240 10% 60%)' }}>
                      陀螺
                    </TableHead>
                    <TableHead
                      className="text-center"
                      style={{ color: 'hsl(240 10% 60%)' }}
                    >
                      胜
                    </TableHead>
                    <TableHead
                      className="text-center"
                      style={{ color: 'hsl(240 10% 60%)' }}
                    >
                      败
                    </TableHead>
                    <TableHead
                      className="text-right"
                      style={{ color: 'hsl(240 10% 60%)' }}
                    >
                      积分
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* #1 already shown in champion card, skip */}
                  {rest.map((item: RankingItem) => {
                    const isTop3 = item.rank <= 3;
                    const rankColor = isTop3
                      ? 'hsl(48 100% 50%)'
                      : 'hsl(240 10% 60%)';
                    return (
                      <TableRow
                        key={item.playerId}
                        style={{ borderColor: 'hsl(240 15% 22%)' }}
                      >
                        <TableCell>
                          <div
                            className="flex items-center gap-1.5"
                            style={{ color: rankColor }}
                          >
                            {isTop3 && <Medal size={14} />}
                            <span className="font-bold">{item.rank}</span>
                          </div>
                        </TableCell>
                        <TableCell
                          style={{
                            color: isTop3
                              ? 'hsl(48 100% 50%)'
                              : 'hsl(0 0% 96%)',
                            fontWeight: isTop3 ? 600 : 400,
                          }}
                        >
                          {item.playerName}
                        </TableCell>
                        <TableCell
                          className="max-w-[80px] truncate"
                          style={{ color: 'hsl(240 10% 60%)' }}
                        >
                          {item.bey || '-'}
                        </TableCell>
                        <TableCell
                          className="text-center"
                          style={{ color: 'hsl(0 0% 96%)' }}
                        >
                          {item.wins}
                        </TableCell>
                        <TableCell
                          className="text-center"
                          style={{ color: 'hsl(240 10% 60%)' }}
                        >
                          {item.losses}
                        </TableCell>
                        <TableCell
                          className="text-right font-semibold"
                          style={{
                            color: isTop3
                              ? 'hsl(48 100% 50%)'
                              : 'hsl(0 0% 96%)',
                          }}
                        >
                          {item.points}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      <BottomNav />
    </div>
  );
};

export default PlayerRankingPage;
