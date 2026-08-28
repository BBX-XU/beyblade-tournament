import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { QRCodeCanvas } from 'qrcode.react';
import { Copy, QrCode, Save } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { resolveAppUrl } from '@lark-apaas/client-toolkit/utils/resolveAppUrl';

import { Button } from '@client/src/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
  DialogClose,
} from '@client/src/components/ui/dialog';

import { tournaments } from '@client/src/api';
import type { Tournament, TournamentFormat, UpdateTournamentRequest } from '@shared/api.interface';

const FORMAT_LABELS: Record<TournamentFormat, string> = {
  single_elimination: '单败淘汰',
  double_elimination: '双败淘汰',
  round_robin: '循环赛',
  swiss: '瑞士轮',
  swiss_elimination: '瑞士轮+淘汰',
  round_robin_elimination: '循环+淘汰',
};

interface SettingsTabProps {
  tournament: Tournament;
  tournamentId: string;
  onSaved: () => void;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ tournament, tournamentId, onSaved }) => {
  const [formData, setFormData] = useState<UpdateTournamentRequest>({
    name: tournament.name,
    format: tournament.format,
    maxPlayers: tournament.maxPlayers,
    winScore: tournament.winScore,
    swissRounds: tournament.swissRounds,
    tournamentDate: tournament.tournamentDate ?? '',
    location: tournament.location ?? '',
  });
  const [qrOpen, setQrOpen] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  const signupUrl: string = resolveAppUrl(`/tournament/${tournamentId}`);

  useEffect(() => {
    logger.info('Signup QR URL:', signupUrl);
  }, [signupUrl]);

  const handleSave = async (): Promise<void> => {
    if (!formData.name?.trim()) {
      toast.error('请输入比赛名称');
      return;
    }
    try {
      setSaving(true);
      await tournaments.updateTournament(tournamentId, formData);
      toast.success('设置已保存');
      onSaved();
    } catch (error) {
      logger.error('updateTournament failed', error);
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenSignup = async (): Promise<void> => {
    try {
      if (tournament.signupStatus === 'closed') {
        await tournaments.updateSignupStatus(tournamentId, 'open');
      }
      if (tournament.status === 'pending') {
        await tournaments.updateStatus(tournamentId, 'registering');
      }
      toast.success('报名已开放');
      onSaved();
      setQrOpen(true);
    } catch (error) {
      logger.error('openSignup failed', error);
      toast.error('操作失败');
    }
  };

  const handleCopyLink = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(signupUrl);
      toast.success('链接已复制');
    } catch (error) {
      logger.error('copy failed', error);
      toast.error('复制失败');
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">比赛设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="s-name">比赛名称</Label>
            <Input
              id="s-name"
              value={formData.name ?? ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="bg-background border-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-format">赛制</Label>
            <Select
              value={formData.format}
              onValueChange={(val: string) =>
                setFormData({ ...formData, format: val as TournamentFormat })
              }
            >
              <SelectTrigger id="s-format" className="w-full bg-background">
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
              <Label htmlFor="s-max">最大人数</Label>
              <Input
                id="s-max"
                type="number"
                value={formData.maxPlayers ?? 0}
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
              <Label htmlFor="s-win">每局胜分</Label>
              <Input
                id="s-win"
                type="number"
                value={formData.winScore ?? 0}
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
            <Label htmlFor="s-swiss">瑞士轮轮次</Label>
            <Input
              id="s-swiss"
              type="number"
              value={formData.swissRounds ?? 0}
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
            <Label htmlFor="s-date">日期</Label>
            <Input
              id="s-date"
              type="date"
              value={formData.tournamentDate ?? ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData({ ...formData, tournamentDate: e.target.value })
              }
              className="bg-background border-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-loc">地点</Label>
            <Input
              id="s-loc"
              value={formData.location ?? ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData({ ...formData, location: e.target.value })
              }
              className="bg-background border-input"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary text-primary-foreground border-primary-border"
          >
            <Save className="w-4 h-4" />
            保存设置
          </Button>
        </CardFooter>
      </Card>

      <Card className="bg-card border-border border-accent/30">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-semibold text-foreground mb-1">报名入口</h3>
              <p className="text-sm text-muted-foreground">
                开放报名后生成二维码，选手扫码即可报名
              </p>
            </div>
            <Dialog open={qrOpen} onOpenChange={setQrOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={handleOpenSignup}
                  className="bg-accent text-accent-foreground hover:bg-accent/90 border-accent-border glow-gold"
                >
                  <QrCode className="w-4 h-4" />
                  开放报名
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border text-foreground">
                <DialogHeader>
                  <DialogTitle className="text-gradient-red-gold text-center">
                    扫码报名
                  </DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 py-2">
                  <div className="p-6 bg-white rounded-xl glow-gold inline-block">
                    <QRCodeCanvas
                      value={signupUrl}
                      size={240}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    扫描二维码前往选手端报名页
                  </p>
                  <div className="w-full flex items-center gap-2">
                    <Input
                      readOnly
                      value={signupUrl}
                      className="bg-background border-input text-xs flex-1"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyLink}
                      className="border-border text-foreground shrink-0"
                    >
                      <Copy className="w-4 h-4" />
                      复制
                    </Button>
                  </div>
                </div>
                <div className="flex justify-end">
                  <DialogClose asChild>
                    <Button
                      variant="outline"
                      className="border-border text-foreground"
                    >
                      关闭
                    </Button>
                  </DialogClose>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsTab;
