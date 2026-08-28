import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Trash2, Settings, Calendar, MapPin, Users, Eye, EyeOff, Lock } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';

import { Button } from '@client/src/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@client/src/components/ui/card';
import { Input } from '@client/src/components/ui/input';
import { Label } from '@client/src/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
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
import type {
  Tournament,
  TournamentFormat,
  TournamentStatus,
  CreateTournamentRequest,
} from '@shared/api.interface';
import { showConfirm } from '@lark-apaas/client-toolkit';

const ADMIN_KEY_SESSION_PREFIX = 'bey_admin_verified_';

const FORMAT_LABELS: Record<TournamentFormat, string> = {
  single_elimination: '单败淘汰',
  double_elimination: '双败淘汰',
  round_robin: '循环赛',
  swiss: '瑞士轮',
  swiss_elimination: '瑞士轮+淘汰',
  round_robin_elimination: '循环+淘汰',
};

const STATUS_LABELS: Record<TournamentStatus, string> = {
  pending: '待开始',
  registering: '报名中',
  ongoing: '进行中',
  finished: '已结束',
};

const STATUS_VARIANTS: Record<TournamentStatus, string> = {
  pending: 'bg-secondary text-secondary-foreground border-secondary-border',
  registering:
    'bg-accent/20 text-accent border-accent/40',
  ongoing:
    'bg-primary/20 text-primary border-primary/40',
  finished:
    'bg-muted text-muted-foreground border-border',
};

const AdminTournamentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [tournamentList, setTournamentList] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [showKeyDialogOpen, setShowKeyDialogOpen] = useState<boolean>(false);
  const [showKey, setShowKey] = useState<boolean>(false);
  const [showConfirmKey, setShowConfirmKey] = useState<boolean>(false);
  const [deleteKeyDialogOpen, setDeleteKeyDialogOpen] = useState<boolean>(false);
  const [adminKeyInput, setAdminKeyInput] = useState<string>('');
  const [confirmKey, setConfirmKey] = useState<string>('');
  const [deleteKeyInput, setDeleteKeyInput] = useState<string>('');
  const [showDeleteKey, setShowDeleteKey] = useState<boolean>(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [pendingManage, setPendingManage] = useState<string | null>(null);
  const [manageKeyDialogOpen, setManageKeyDialogOpen] = useState<boolean>(false);
  const [manageKeyInput, setManageKeyInput] = useState<string>('');
  const [showManageKey, setShowManageKey] = useState<boolean>(false);

  const [formData, setFormData] = useState<CreateTournamentRequest>({
    name: '',
    format: 'single_elimination',
    maxPlayers: 16,
    winScore: 3,
    swissRounds: 3,
    tournamentDate: '',
    location: '',
    adminKey: '',
  });

  const loadTournaments = async (): Promise<void> => {
    try {
      setLoading(true);
      const data: Tournament[] = await tournaments.listTournaments();
      setTournamentList(data);
    } catch (error) {
      logger.error('loadTournaments failed', error);
      toast.error('加载比赛列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTournaments();
  }, []);

  const handleCreate = async (): Promise<void> => {
    if (!formData.name.trim()) {
      toast.error('请输入比赛名称');
      return;
    }
    if (!adminKeyInput.trim()) {
      toast.error('请设置管理密钥');
      return;
    }
    if (adminKeyInput.length < 4 || adminKeyInput.length > 20) {
      toast.error('管理密钥长度需在 4-20 位之间');
      return;
    }
    if (adminKeyInput !== confirmKey) {
      toast.error('两次输入的密钥不一致');
      return;
    }
    try {
      await tournaments.createTournament({ ...formData, adminKey: adminKeyInput.trim() });
      toast.success('比赛创建成功');
      setDialogOpen(false);
      setFormData({
        name: '',
        format: 'single_elimination',
        maxPlayers: 16,
        winScore: 3,
        swissRounds: 3,
        tournamentDate: '',
        location: '',
        adminKey: '',
      });
      setAdminKeyInput('');
      setConfirmKey('');
      setShowKey(false);
      setShowConfirmKey(false);
      loadTournaments();
    } catch (error) {
      logger.error('createTournament failed', error);
      toast.error('创建比赛失败');
    }
  };

  const handleDelete = async (id: string, name: string): Promise<void> => {
    setPendingDelete({ id, name });
    setDeleteKeyInput('');
    setShowDeleteKey(false);
    setDeleteKeyDialogOpen(true);
  };

  const confirmDelete = async (): Promise<void> => {
    if (!pendingDelete) return;
    try {
      await tournaments.deleteTournament(pendingDelete.id, deleteKeyInput);
      toast.success('删除成功');
      setDeleteKeyDialogOpen(false);
      setPendingDelete(null);
      setDeleteKeyInput('');
      loadTournaments();
    } catch (error) {
      logger.error('deleteTournament failed', error);
      toast.error('删除失败，密钥错误或比赛不存在');
    }
  };

  const handleManage = async (id: string): Promise<void> => {
    const verified = sessionStorage.getItem(`bey_admin_verified_${id}`);
    if (verified === 'true') {
      navigate(`/admin/tournament/${id}`);
      return;
    }
    setPendingManage(id);
    setManageKeyInput('');
    setShowManageKey(false);
    setManageKeyDialogOpen(true);
  };

  const confirmManage = async (): Promise<void> => {
    if (!pendingManage) return;
    try {
      const result = await tournaments.verifyAdminKey(pendingManage, manageKeyInput);
      if (result.valid) {
        sessionStorage.setItem(`bey_admin_verified_${pendingManage}`, 'true');
        setManageKeyDialogOpen(false);
        navigate(`/admin/tournament/${pendingManage}`);
      } else {
        toast.error('管理密钥错误');
      }
    } catch (error) {
      logger.error('verifyAdminKey failed', error);
      toast.error('验证失败，请重试');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gradient-red-gold">
            BEYBLADE X 管理后台
          </h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-accent text-accent-foreground hover:bg-accent/90 border-accent-border glow-gold"
              >
                <Plus className="w-4 h-4" />
                新建比赛
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border text-foreground">
              <DialogHeader>
                <DialogTitle className="text-gradient-red-gold">
                  新建比赛
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">比赛名称</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="请输入比赛名称"
                    className="bg-background border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="format">赛制</Label>
                  <Select
                    value={formData.format}
                    onValueChange={(val: string) =>
                      setFormData({
                        ...formData,
                        format: val as TournamentFormat,
                      })
                    }
                  >
                    <SelectTrigger id="format" className="w-full bg-background">
                      <SelectValue placeholder="选择赛制" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="single_elimination">单败淘汰</SelectItem>
                      <SelectItem value="double_elimination">双败淘汰</SelectItem>
                      <SelectItem value="round_robin">循环赛</SelectItem>
                      <SelectItem value="swiss">瑞士轮</SelectItem>
                      <SelectItem value="swiss_elimination">瑞士轮+淘汰</SelectItem>
                      <SelectItem value="round_robin_elimination">循环+淘汰</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="maxPlayers">最大人数</Label>
                    <Input
                      id="maxPlayers"
                      type="number"
                      value={formData.maxPlayers}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData({
                          ...formData,
                          maxPlayers: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="bg-background border-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="winScore">每局胜分</Label>
                    <Input
                      id="winScore"
                      type="number"
                      value={formData.winScore ?? 3}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData({
                          ...formData,
                          winScore: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="bg-background border-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="swissRounds">瑞士轮轮次</Label>
                  <Input
                    id="swissRounds"
                    type="number"
                    value={formData.swissRounds ?? 3}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({
                        ...formData,
                        swissRounds: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="bg-background border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">日期</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.tournamentDate ?? ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, tournamentDate: e.target.value })
                    }
                    className="bg-background border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">地点</Label>
                  <Input
                    id="location"
                    value={formData.location ?? ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    placeholder="请输入比赛地点"
                    className="bg-background border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminKey">
                    管理密钥 <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="adminKey"
                      type={showKey ? 'text' : 'password'}
                      value={adminKeyInput}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setAdminKeyInput(e.target.value)
                      }
                      placeholder="请输入管理密钥（4-20位）"
                      className="bg-background border-input pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmKey">
                    确认密钥 <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmKey"
                      type={showConfirmKey ? 'text' : 'password'}
                      value={confirmKey}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setConfirmKey(e.target.value)
                      }
                      placeholder="请再次输入管理密钥"
                      className="bg-background border-input pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmKey(!showConfirmKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmKey ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    请牢记密钥，用于后续管理和删除比赛
                  </p>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" className="border-border text-foreground">
                    取消
                  </Button>
                </DialogClose>
                <Button
                  onClick={handleCreate}
                  className="bg-primary text-primary-foreground border-primary-border"
                >
                  创建
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* 比赛列表 */}
        {loading ? (
          <div className="text-center text-muted-foreground py-12">加载中...</div>
        ) : tournamentList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Users className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">还没有比赛</h3>
            <p className="text-muted-foreground mb-4">
              点击上方「新建比赛」按钮创建第一场比赛
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tournamentList.map((t: Tournament) => (
              <Card
                key={t.id}
                className="bg-card border-border hover:border-primary/50 transition-colors"
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg font-bold truncate">
                      {t.name}
                    </CardTitle>
                    <Badge
                      className={STATUS_VARIANTS[t.status]}
                    >
                      {STATUS_LABELS[t.status]}
                    </Badge>
                  </div>
                  <CardDescription>
                    {FORMAT_LABELS[t.format]}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{t.tournamentDate || '日期未定'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{t.location || '地点未定'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>
                      报名人数：
                      <span className="text-foreground font-medium">
                        -- / {t.maxPlayers}
                      </span>
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button
                    onClick={() => handleManage(t.id)}
                    className="flex-1 bg-primary text-primary-foreground border-primary-border"
                  >
                    <Settings className="w-4 h-4" />
                    管理
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDelete(t.id, t.name)}
                    className="border-destructive/50 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* 管理密钥验证弹窗 */}
        <Dialog open={manageKeyDialogOpen} onOpenChange={setManageKeyDialogOpen}>
          <DialogContent className="bg-card border-border text-foreground max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-gradient-red-gold flex items-center gap-2">
                <Lock className="w-5 h-5" />
                验证管理密钥
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                请输入比赛的管理密钥以进入管理后台
              </p>
              <div className="relative">
                <Input
                  type={showManageKey ? 'text' : 'password'}
                  value={manageKeyInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setManageKeyInput(e.target.value)
                  }
                  placeholder="请输入管理密钥"
                  className="bg-background border-input pr-10"
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === 'Enter') confirmManage();
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowManageKey(!showManageKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showManageKey ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" className="border-border text-foreground">
                  取消
                </Button>
              </DialogClose>
              <Button
                onClick={confirmManage}
                className="bg-primary text-primary-foreground border-primary-border"
              >
                验证
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 删除验证密钥弹窗 */}
        <Dialog open={deleteKeyDialogOpen} onOpenChange={setDeleteKeyDialogOpen}>
          <DialogContent className="bg-card border-border text-foreground max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                删除比赛
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                确定要删除比赛
                <span className="text-foreground font-medium">
                  「{pendingDelete?.name}」
                </span>
                吗？此操作不可恢复。
              </p>
              <div className="space-y-1">
                <Label>请输入管理密钥以确认删除</Label>
                <div className="relative">
                  <Input
                    type={showDeleteKey ? 'text' : 'password'}
                    value={deleteKeyInput}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setDeleteKeyInput(e.target.value)
                    }
                    placeholder="请输入管理密钥"
                    className="bg-background border-input pr-10"
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === 'Enter') confirmDelete();
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeleteKey(!showDeleteKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showDeleteKey ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" className="border-border text-foreground">
                  取消
                </Button>
              </DialogClose>
              <Button
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground border-destructive-border"
              >
                确认删除
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminTournamentsPage;
