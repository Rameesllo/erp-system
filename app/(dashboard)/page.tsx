"use client";

import { useState, useEffect } from "react";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  Users, 
  Package, 
  AlertCircle,
  Loader2,
  Calendar
} from "lucide-react";
import { fetchApi } from "@/lib/api-client";
import Link from "next/link";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      try {
        const res = await fetchApi(`/api/dashboard/stats?period=${period}`);
        if (res.success) {
          setData(res.data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, [period]);

  if (loading && !data) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-slate-500 text-sm mt-1">Welcome back! Here's what's happening with your business.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="appearance-none px-4 py-2 pr-10 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 focus:outline-none focus:border-indigo-500 transition-colors shadow-sm"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
            <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Revenue" 
          value={`$${(data?.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          trend="vs past" 
          isNeutral={true} 
          icon={<DollarSign size={20} className="text-indigo-600" />} 
        />
        <StatCard 
          title="Orders" 
          value={(data?.orderCount || 0).toLocaleString()} 
          trend="vs past" 
          isNeutral={true} 
          icon={<Users size={20} className="text-emerald-600" />} 
        />
        <StatCard 
          title="Active Customers" 
          value={(data?.customerCount || 0).toLocaleString()} 
          trend="total" 
          isNeutral={true} 
          icon={<Package size={20} className="text-blue-600" />} 
        />
        <StatCard 
          title="Low Stock Items" 
          value={(data?.lowStockCount || 0).toString()} 
          trend={data?.outOfStockCount ? `${data.outOfStockCount} out of stock` : "Needs attention"} 
          isNeutral={true}
          isWarning={(data?.lowStockCount || 0) > 0}
          isDanger={(data?.outOfStockCount || 0) > 0}
          icon={<AlertCircle size={20} className={(data?.outOfStockCount || 0) > 0 ? "text-rose-600" : (data?.lowStockCount || 0) > 0 ? "text-amber-600" : "text-slate-400"} />} 
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Recent Orders - Takes up 2 columns on lg */}
        <div className="lg:col-span-2 bg-white border border-slate-200/60 rounded-2xl shadow-sm p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-800">Recent Orders</h2>
            <Link href="/sales" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">View all</Link>
          </div>
          
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 uppercase bg-slate-50/50">
                <tr>
                  <th className="px-4 py-3 font-medium rounded-l-lg">Order ID</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium rounded-r-lg">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.recentOrders?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No orders found</td>
                  </tr>
                ) : (
                  data?.recentOrders?.map((order: any) => (
                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-4 py-4 font-medium text-slate-900">#{order.id.substring(0, 8).toUpperCase()}</td>
                      <td className="px-4 py-4 text-slate-600">{order.customer}</td>
                      <td className="px-4 py-4 text-slate-500">{new Date(order.date).toLocaleDateString()}</td>
                      <td className="px-4 py-4 font-medium text-slate-700">${order.amount.toFixed(2)}</td>
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          order.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                          order.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                          'bg-rose-100 text-rose-700'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Products - Takes up 1 column on lg */}
        <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-800">Top Products</h2>
          </div>

          <div className="space-y-5 flex-1">
            {data?.topProducts?.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-sm">No sales data yet</div>
            ) : (
              data?.topProducts?.map((p: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                      <Package size={20} className="text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800 truncate w-32" title={p.product?.name}>{p.product?.name || 'Unknown'}</p>
                      <p className="text-xs text-slate-500">{p.unitsSold} sales</p>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-slate-700">
                    ${p.revenue.toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
          
          <Link href="/inventory" className="w-full mt-6 py-2 border border-slate-200 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-50 transition-colors text-center block">
            View Inventory
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, trend, isNeutral, isWarning, isDanger, icon }: any) {
  return (
    <div className={`bg-white p-6 rounded-2xl border ${isDanger ? 'border-rose-200 shadow-rose-100' : isWarning ? 'border-amber-200 shadow-amber-100' : 'border-slate-200/60 shadow-sm'} relative overflow-hidden group transition-all`}>
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-bl-full opacity-50 -z-10 group-hover:scale-110 transition-transform"></div>
      <div className="flex justify-between items-start mb-4">
        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 group-hover:bg-white group-hover:shadow-sm transition-all">
          {icon}
        </div>
        {isNeutral && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${isDanger ? 'text-rose-700 bg-rose-50' : isWarning ? 'text-amber-700 bg-amber-50' : 'text-slate-500 bg-slate-100'}`}>
            {trend}
          </span>
        )}
      </div>
      <div>
        <h3 className="text-slate-500 text-sm font-medium">{title}</h3>
        <p className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">{value}</p>
      </div>
    </div>
  );
}
