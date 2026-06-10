import React, { useMemo } from 'react';
import { Building2, DollarSign, TrendingUp, ArrowRight } from 'lucide-react';

const Dashboard = ({ projects, transactions, onSelectProject }) => {
    const aggregatedData = useMemo(() => {
        const result = {
            totalProjects: projects.length,
            totalIncome: 0,
            totalExpense: 0,
            projectsData: []
        };

        projects.forEach(project => {
            const projectTrans = transactions.filter(t => t.projectId === project.id);
            let projectIncome = 0;
            let projectExpense = 0;

            projectTrans.forEach(trans => {
                projectIncome += trans.incomeAccrued || 0;
                projectExpense += trans.expense || 0;
            });

            result.totalIncome += projectIncome;
            result.totalExpense += projectExpense;
            result.projectsData.push({
                id: project.id,
                name: project.name,
                income: projectIncome,
                expense: projectExpense,
                profit: projectIncome - projectExpense
            });
        });

        result.projectsData.sort((a, b) => b.income - a.income);
        return result;
    }, [projects, transactions]);

    const StatCard = ({ title, value, icon, color }) => (
        <div style={{ background: 'white', borderRadius: 12, padding: 20, borderLeft: `4px solid ${color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>{title}</div>
                    <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1e293b' }}>{value.toLocaleString('ru-RU')} ₽</div>
                </div>
                <div style={{ width: 48, height: 48, borderRadius: 24, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
            </div>
        </div>
    );

    return (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                <StatCard title="Всего проектов" value={aggregatedData.totalProjects} icon={<Building2 size={24} />} color="#3b82f6" />
                <StatCard title="Общая выручка" value={aggregatedData.totalIncome} icon={<span style={{ fontSize: 24, fontWeight: 'bold' }}>₽</span>} color="#3b82f6" />
                <StatCard title="Общие расходы" value={aggregatedData.totalExpense} icon={<TrendingUp size={24} />} color="#ef4444" />
                <StatCard title="Чистая прибыль" value={aggregatedData.totalIncome - aggregatedData.totalExpense} icon={<span style={{ fontSize: 24, fontWeight: 'bold' }}>₽</span>} color="#10b981" />
            </div>

            <div style={{ background: 'white', borderRadius: 12, padding: 20 }}>
                <h4 style={{ marginBottom: 16 }}>📋 Все проекты</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc' }}>
                            <th style={{ padding: 12, textAlign: 'left' }}>Проект</th>
                            <th style={{ padding: 12, textAlign: 'right' }}>Выручка</th>
                            <th style={{ padding: 12, textAlign: 'right' }}>Расходы</th>
                            <th style={{ padding: 12, textAlign: 'right' }}>Прибыль</th>
                            <th style={{ padding: 12, textAlign: 'center' }}>Детали</th>
                        </tr>
                    </thead>
                    <tbody>
                        {aggregatedData.projectsData.map((project, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: 12 }}>{project.name}</td>
                                <td style={{ padding: 12, textAlign: 'right' }}>{project.income.toLocaleString('ru-RU')} ₽</td>
                                <td style={{ padding: 12, textAlign: 'right' }}>{project.expense.toLocaleString('ru-RU')} ₽</td>
                                <td style={{ padding: 12, textAlign: 'right', color: project.profit >= 0 ? '#10b981' : '#ef4444' }}>{project.profit.toLocaleString('ru-RU')} ₽</td>
                                <td style={{ padding: 12, textAlign: 'center' }}>
                                    <button onClick={() => onSelectProject(project.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6' }}>
                                        <ArrowRight size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Dashboard;