import React from 'react';
import { Route, Routes } from 'react-router-dom';

import PlayerHomePage from './pages/player-home/PlayerHomePage';
import PlayerTournamentPage from './pages/player-tournament/PlayerTournamentPage';
import PlayerBracketPage from './pages/player-bracket/PlayerBracketPage';
import PlayerRankingPage from './pages/player-ranking/PlayerRankingPage';
import AdminTournamentsPage from './pages/admin-tournaments/AdminTournamentsPage';
import AdminManagePage from './pages/admin-manage/AdminManagePage';
import NotFound from './pages/NotFound/NotFound';

const RoutesComponent = () => {
  return (
    <Routes>
      <Route index element={<PlayerHomePage />} />
      <Route path="tournament/:id" element={<PlayerTournamentPage />} />
      <Route path="tournament/:id/bracket" element={<PlayerBracketPage />} />
      <Route path="tournament/:id/ranking" element={<PlayerRankingPage />} />
      <Route path="admin" element={<AdminTournamentsPage />} />
      <Route path="admin/tournament/:id" element={<AdminManagePage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default RoutesComponent;
