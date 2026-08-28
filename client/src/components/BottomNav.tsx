import { NavLink, useParams } from 'react-router-dom';
import { Home, Trophy, BarChart3 } from 'lucide-react';

const BottomNav = () => {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;

  const basePath = `/tournament/${id}`;

  const navItems = [
    { to: basePath, label: '首页', icon: Home, end: true },
    { to: `${basePath}/bracket`, label: '赛程', icon: Trophy },
    { to: `${basePath}/ranking`, label: '排名', icon: BarChart3 },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t"
      style={{
        height: '60px',
        backgroundColor: 'hsl(240 18% 10%)',
        borderColor: 'hsl(240 15% 22%)',
      }}
    >
      <div className="flex h-full items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors`
              }
              style={({ isActive }) => ({
                color: isActive ? 'hsl(48 100% 50%)' : 'hsl(240 10% 60%)',
              })}
            >
              <Icon size={20} />
              <span className="text-xs font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
