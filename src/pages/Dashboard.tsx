import React from 'react';
import { 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  Users,
  ArrowUp,
  ArrowDown,
  Eye,
  BarChart3
} from 'lucide-react';
import StatsCard from '../components/StatsCard';
import RecentMovements from '../components/RecentMovements';
import StockAlerts from '../components/StockAlerts';
import TopArticles from '../components/TopArticles';

const Dashboard: React.FC = () => {
  const stats = [
    {
      title: 'Total Articles',
      value: '1,247',
      change: '+12%',
      changeType: 'increase' as const,
      icon: Package,
      color: '#6B2C91'
    },
    {
      title: 'Valeur Stock',
      value: '2,847,500 FCFA',
      change: '+8.2%',
      changeType: 'increase' as const,
      icon: TrendingUp,
      color: '#00A86B'
    },
    {
      title: 'Alertes Stock',
      value: '23',
      change: '-5%',
      changeType: 'decrease' as const,
      icon: AlertTriangle,
      color: '#DC143C'
    },
    {
      title: 'Utilisateurs Actifs',
      value: '45',
      change: '+3%',
      changeType: 'increase' as const,
      icon: Users,
      color: '#D4AF37'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#6B2C91' }}>
            Tableau de Bord
          </h1>
          <p className="text-gray-600 mt-1">
            Vue d'ensemble de la gestion de stock INSPC
          </p>
        </div>
        <div className="flex space-x-3">
          <button 
            className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#00A86B' }}
          >
            <Eye className="w-4 h-4 inline mr-2" />
            Voir Rapports
          </button>
          <button 
            className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#6B2C91' }}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Analyses
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Movements */}
        <div className="lg:col-span-2">
          <RecentMovements />
        </div>

        {/* Stock Alerts */}
        <div>
          <StockAlerts />
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Articles */}
        <TopArticles />

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#6B2C91' }}>
            Actions Rapides
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <button 
              className="p-4 rounded-lg border-2 border-dashed hover:bg-gray-50 transition-colors"
              style={{ borderColor: '#6B2C91' }}
            >
              <Package className="w-8 h-8 mx-auto mb-2" style={{ color: '#6B2C91' }} />
              <p className="text-sm font-medium" style={{ color: '#6B2C91' }}>
                Nouvel Article
              </p>
            </button>
            <button 
              className="p-4 rounded-lg border-2 border-dashed hover:bg-gray-50 transition-colors"
              style={{ borderColor: '#00A86B' }}
            >
              <ArrowUp className="w-8 h-8 mx-auto mb-2" style={{ color: '#00A86B' }} />
              <p className="text-sm font-medium" style={{ color: '#00A86B' }}>
                Entrée Stock
              </p>
            </button>
            <button 
              className="p-4 rounded-lg border-2 border-dashed hover:bg-gray-50 transition-colors"
              style={{ borderColor: '#DC143C' }}
            >
              <ArrowDown className="w-8 h-8 mx-auto mb-2" style={{ color: '#DC143C' }} />
              <p className="text-sm font-medium" style={{ color: '#DC143C' }}>
                Sortie Stock
              </p>
            </button>
            <button 
              className="p-4 rounded-lg border-2 border-dashed hover:bg-gray-50 transition-colors"
              style={{ borderColor: '#D4AF37' }}
            >
              <BarChart3 className="w-8 h-8 mx-auto mb-2" style={{ color: '#D4AF37' }} />
              <p className="text-sm font-medium" style={{ color: '#D4AF37' }}>
                Inventaire
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;