import React, { useState, useMemo, useEffect } from 'react';
import { 
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
    Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { 
    DollarSign, TrendingUp, Building2, Wallet, FileText, AlertCircle, Plus, LogOut 
} from 'lucide-react';
import Auth from './Auth';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const API_URL = 'https://stroy-backend-s7xi.onrender.com/api';

// Функция очистки числа от лишних символов
const cleanNumber = (val) => {
    if (val === undefined || val === null) return 0;
    let num;
    if (typeof val === 'string') {
        // Убираем всё кроме цифр, точки и минуса
        const cleaned = val.replace(/[^0-9.-]/g, '');
        num = parseFloat(cleaned);
    } else {
        num = val;
    }
    return isNaN(num) ? 0 : num;
};

// Компонент карточки статистики
const StatCard = ({ title, value, icon, color }) => {
    const cleanValue = cleanNumber(value);
    return (
        <div style={{ background: 'white', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 12, borderLeft: `4px solid ${color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: color + '20', color }}>{icon}</div>
            <div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{title}</div>
                <div style={{ fontSize: 20, fontWeight: 'bold', color: '#1e293b' }}>
                    {cleanValue.toLocaleString('ru-RU')} ₽
                </div>
            </div>
        </div>
    );
};

// Основной компонент приложения (после авторизации)
const AppContent = ({ onLogout }) => {
    const [projects, setProjects] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [activeTab, setActiveTab] = useState('bdr');
    const [showProjectModal, setShowProjectModal] = useState(false);
    const [newProject, setNewProject] = useState({ name: '', contractAmount: '', advancePercent: 30, paymentDelay: 30 });
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState('dashboard');

    const token = localStorage.getItem('token');

    // Загрузка данных с сервера
    const loadData = async () => {
        try {
            const [projectsRes, transactionsRes] = await Promise.all([
                fetch(`${API_URL}/projects`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/transactions`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            let projectsData = await projectsRes.json();
            let transactionsData = await transactionsRes.json();

            // Очищаем все числа
            projectsData = projectsData.map(p => ({
                ...p,
                contract_amount: cleanNumber(p.contract_amount),
                advance_percent: cleanNumber(p.advance_percent),
                payment_delay: cleanNumber(p.payment_delay)
            }));

            transactionsData = transactionsData.map(t => ({
                ...t,
                income_accrued: cleanNumber(t.income_accrued),
                expense: cleanNumber(t.expense),
                cash_incoming: cleanNumber(t.cash_incoming),
                cash_outgoing: cleanNumber(t.cash_outgoing)
            }));

            setProjects(projectsData);
            setTransactions(transactionsData);
            if (projectsData.length > 0 && !selectedProjectId) {
                setSelectedProjectId(projectsData[0].id);
            }
        } catch (err) {
            console.error('Ошибка загрузки:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const selectedProject = projects.find(p => p.id === selectedProjectId);
    const projectTransactions = transactions.filter(t => t.project_id === selectedProjectId);

    const monthlyData = useMemo(() => {
        if (!selectedProject) return [];
        const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
        const result = [];
        let cashBalance = 0;
        let receivable = 0;

        for (let i = 0; i <= 11; i++) {
            const trans = projectTransactions.find(t => t.month === i) || { 
                income_accrued: 0, expense: 0, cash_incoming: 0, cash_outgoing: 0 
            };
            const incomeAccrued = cleanNumber(trans.income_accrued);
            const expense = cleanNumber(trans.expense);
            const profitBdr = incomeAccrued - expense;
            const cashIncoming = cleanNumber(trans.cash_incoming);
            const cashOutgoing = cleanNumber(trans.cash_outgoing);
            cashBalance = cashBalance + cashIncoming - cashOutgoing;
            receivable = receivable + incomeAccrued - cashIncoming;
            result.push({
                month: months[i],
                monthIndex: i,
                incomeAccrued,
                expense,
                profitBdr,
                cashIncoming,
                cashOutgoing,
                cashBalance,
                receivable,
                marginPercent: incomeAccrued > 0 ? (profitBdr / incomeAccrued * 100) : 0,
                id: trans.id
            });
        }
        return result;
    }, [selectedProject, projectTransactions]);

    const totals = useMemo(() => {
        const totalIncome = monthlyData.reduce((sum, m) => sum + m.incomeAccrued, 0);
        const totalExpense = monthlyData.reduce((sum, m) => sum + m.expense, 0);
        const totalCashIn = monthlyData.reduce((sum, m) => sum + m.cashIncoming, 0);
        const totalCashOut = monthlyData.reduce((sum, m) => sum + m.cashOutgoing, 0);
        const finalBalance = monthlyData[monthlyData.length - 1]?.cashBalance || 0;
        const finalReceivable = monthlyData[monthlyData.length - 1]?.receivable || 0;
        return {
            totalIncome, totalExpense, netProfit: totalIncome - totalExpense,
            totalCashIn, totalCashOut, netCashFlow: totalCashIn - totalCashOut,
            finalBalance, finalReceivable, margin: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100) : 0
        };
    }, [monthlyData]);

    // Функция обновления транзакции
    const addTransaction = async (monthIndex, field, value) => {
        const existing = projectTransactions.find(t => t.month === monthIndex);
        // Очищаем значение
        let newValue = cleanNumber(value);
        
        const dbField = field === 'incomeAccrued' ? 'income_accrued' : 
                        field === 'expense' ? 'expense' : 
                        field === 'cashIncoming' ? 'cash_incoming' : 'cash_outgoing';
        
        if (existing) {
            const updatedTransaction = {
                ...existing,
                [dbField]: newValue
            };
            
            await fetch(`${API_URL}/transactions/${existing.id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updatedTransaction)
            });
        } else {
            const newTransaction = {
                project_id: selectedProjectId,
                month: monthIndex,
                income_accrued: field === 'incomeAccrued' ? newValue : 0,
                expense: field === 'expense' ? newValue : 0,
                cash_incoming: field === 'cashIncoming' ? newValue : 0,
                cash_outgoing: field === 'cashOutgoing' ? newValue : 0
            };
            
            await fetch(`${API_URL}/transactions`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newTransaction)
            });
        }
        
        loadData();
    };

    const addProject = async () => {
        if (newProject.name && newProject.contractAmount) {
            await fetch(`${API_URL}/projects`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: newProject.name,
                    contractAmount: cleanNumber(newProject.contractAmount),
                    advancePercent: cleanNumber(newProject.advancePercent),
                    paymentDelay: cleanNumber(newProject.paymentDelay)
                })
            });
            setShowProjectModal(false);
            setNewProject({ name: '', contractAmount: '', advancePercent: 30, paymentDelay: 30 });
            loadData();
        }
    };

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Загрузка данных...</div>;
    }

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: 20 }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Building2 size={28} color="#3b82f6" />
                    <h1 style={{ fontSize: 24, color: '#1e293b' }}>СтройУчёт</h1>
                    
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <button onClick={() => setCurrentPage('dashboard')} style={{ background: currentPage === 'dashboard' ? '#3b82f6' : '#e2e8f0', color: currentPage === 'dashboard' ? 'white' : '#1e293b', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}>
                         Сводка
                    </button>
                    <button onClick={() => setCurrentPage('projects')} style={{ background: currentPage === 'projects' ? '#3b82f6' : '#e2e8f0', color: currentPage === 'projects' ? 'white' : '#1e293b', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}>
                         Проекты
                    </button>
                    <button style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => setShowProjectModal(true)}>
                        <Plus size={18} /> Новый проект
                    </button>
                    <button onClick={onLogout} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <LogOut size={18} /> Выйти
                    </button>
                </div>
            </header>

            {currentPage === 'dashboard' ? (
                <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <h3> Сводная информация по всем проектам</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 20 }}>
                        <StatCard title="Всего проектов" value={projects.length} icon={<Building2 size={20} />} color="#3b82f6" />
                        <StatCard title="Общая выручка" value={projects.reduce((sum, p) => sum + (p.contract_amount || 0), 0)} icon={<span style={{ fontSize: 20 }}>₽</span>} color="#3b82f6" />
                        <StatCard title="Активных проектов" value={projects.length} icon={<TrendingUp size={20} />} color="#10b981" />
                    </div>
                    <div style={{ marginTop: 20 }}>
                        <h4>Список проектов</h4>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
                            <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                    <th style={{ padding: 12, textAlign: 'left' }}>Название</th>
                                    <th style={{ padding: 12, textAlign: 'right' }}>Сумма договора</th>
                                    <th style={{ padding: 12, textAlign: 'center' }}>Аванс</th>
                                    <th style={{ padding: 12, textAlign: 'center' }}>Отсрочка</th>
                                </tr>
                            </thead>
                            <tbody>
                                {projects.map(project => (
                                    <tr key={project.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: 12 }}>{project.name}</td>
                                        <td style={{ padding: 12, textAlign: 'right' }}>{(project.contract_amount || 0).toLocaleString('ru-RU')} ₽</td>
                                        <td style={{ padding: 12, textAlign: 'center' }}>{project.advance_percent}%</td>
                                        <td style={{ padding: 12, textAlign: 'center' }}>{project.payment_delay} дн.</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <>
                    {projects.length > 0 && (
                        <>
                            <div style={{ marginBottom: 16 }}>
                                <select style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0' }} value={selectedProjectId || ''} onChange={(e) => setSelectedProjectId(parseInt(e.target.value))}>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid #e2e8f0' }}>
                                <button onClick={() => setActiveTab('bdr')} style={{ padding: '10px 20px', background: activeTab === 'bdr' ? '#3b82f6' : 'transparent', color: activeTab === 'bdr' ? 'white' : '#64748b', border: 'none', borderRadius: 8, cursor: 'pointer' }}>БДР</button>
                                <button onClick={() => setActiveTab('bdds')} style={{ padding: '10px 20px', background: activeTab === 'bdds' ? '#3b82f6' : 'transparent', color: activeTab === 'bdds' ? 'white' : '#64748b', border: 'none', borderRadius: 8, cursor: 'pointer' }}>БДДС</button>
                                <button onClick={() => setActiveTab('analytics')} style={{ padding: '10px 20px', background: activeTab === 'analytics' ? '#3b82f6' : 'transparent', color: activeTab === 'analytics' ? 'white' : '#64748b', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Аналитика</button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                                <StatCard title="Выручка" value={totals.totalIncome} icon={<span style={{ fontSize: 20 }}>₽</span>} color="#3b82f6" />
                                <StatCard title="Расходы" value={totals.totalExpense} icon={<TrendingUp size={20} />} color="#ef4444" />
                                <StatCard title="Прибыль" value={totals.netProfit} icon={<span style={{ fontSize: 20 }}>₽</span>} color="#10b981" />
                                <StatCard title="Рентабельность" value={totals.margin} icon={<TrendingUp size={20} />} color="#8b5cf6" />
                                <StatCard title="Остаток" value={totals.finalBalance} icon={<Wallet size={20} />} color="#f59e0b" />
                                <StatCard title="Дебиторка" value={totals.finalReceivable} icon={<AlertCircle size={20} />} color="#ec4899" />
                            </div>

                            {activeTab === 'bdr' && selectedProject && (
                                <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                    <h3>Бюджет доходов и расходов (БДР) - {selectedProject.name}</h3>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
                                        <thead>
                                            <tr><th style={{ textAlign: 'left', padding: 8 }}>Месяц</th><th style={{ textAlign: 'right', padding: 8 }}>Доход</th><th style={{ textAlign: 'right', padding: 8 }}>Расходы</th><th style={{ textAlign: 'right', padding: 8 }}>Прибыль</th></tr>
                                        </thead>
                                        <tbody>
                                            {monthlyData.map((row, i) => (
                                                <tr key={i}>
                                                    <td style={{ padding: 8 }}>{row.month}</td>
                                                    <td style={{ textAlign: 'right', padding: 8 }}>
                                                        <input 
                                                            type="number" 
                                                            defaultValue={row.incomeAccrued} 
                                                            onBlur={(e) => addTransaction(row.monthIndex, 'incomeAccrued', e.target.value)} 
                                                            style={{ width: 120, padding: 6, border: '1px solid #ccc', borderRadius: 6, textAlign: 'right' }} 
                                                        />
                                                    </td>
                                                    <td style={{ textAlign: 'right', padding: 8 }}>
                                                        <input 
                                                            type="number" 
                                                            defaultValue={row.expense} 
                                                            onBlur={(e) => addTransaction(row.monthIndex, 'expense', e.target.value)} 
                                                            style={{ width: 120, padding: 6, border: '1px solid #ccc', borderRadius: 6, textAlign: 'right' }} 
                                                        />
                                                    </td>
                                                    <td style={{ textAlign: 'right', padding: 8, color: row.profitBdr >= 0 ? 'green' : 'red' }}>
                                                        {row.profitBdr.toLocaleString('ru-RU')} ₽
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {activeTab === 'bdds' && selectedProject && (
                                <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                    <h3>Бюджет движения денежных средств (БДДС) - {selectedProject.name}</h3>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
                                        <thead>
                                            <tr><th style={{ textAlign: 'left', padding: 8 }}>Месяц</th><th style={{ textAlign: 'right', padding: 8 }}>Поступления</th><th style={{ textAlign: 'right', padding: 8 }}>Платежи</th><th style={{ textAlign: 'right', padding: 8 }}>Сальдо</th></tr>
                                        </thead>
                                        <tbody>
                                            {monthlyData.map((row, i) => (
                                                <tr key={i}>
                                                    <td style={{ padding: 8 }}>{row.month}</td>
                                                    <td style={{ textAlign: 'right', padding: 8 }}>
                                                        <input 
                                                            type="number" 
                                                            defaultValue={row.cashIncoming} 
                                                            onBlur={(e) => addTransaction(row.monthIndex, 'cashIncoming', e.target.value)} 
                                                            style={{ width: 120, padding: 6, border: '1px solid #ccc', borderRadius: 6, textAlign: 'right' }} 
                                                        />
                                                    </td>
                                                    <td style={{ textAlign: 'right', padding: 8 }}>
                                                        <input 
                                                            type="number" 
                                                            defaultValue={row.cashOutgoing} 
                                                            onBlur={(e) => addTransaction(row.monthIndex, 'cashOutgoing', e.target.value)} 
                                                            style={{ width: 120, padding: 6, border: '1px solid #ccc', borderRadius: 6, textAlign: 'right' }} 
                                                        />
                                                    </td>
                                                    <td style={{ textAlign: 'right', padding: 8, color: row.cashBalance >= 0 ? 'green' : 'red' }}>
                                                        {row.cashBalance.toLocaleString('ru-RU')} ₽
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {activeTab === 'analytics' && selectedProject && (
                                <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                    <h3>Аналитика</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginTop: 16 }}>
                                        <div>
                                            <h4>Доходы и расходы</h4>
                                            <ResponsiveContainer width="100%" height={300}>
                                                <LineChart data={monthlyData}>
                                                    <XAxis dataKey="month" />
                                                    <YAxis />
                                                    <Tooltip />
                                                    <Legend />
                                                    <Line dataKey="incomeAccrued" stroke="#3b82f6" name="Доходы" />
                                                    <Line dataKey="expense" stroke="#ef4444" name="Расходы" />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div>
                                            <h4>Прибыль по месяцам</h4>
                                            <ResponsiveContainer width="100%" height={300}>
                                                <BarChart data={monthlyData}>
                                                    <XAxis dataKey="month" />
                                                    <YAxis />
                                                    <Tooltip />
                                                    <Bar dataKey="profitBdr" fill="#10b981" name="Прибыль" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                    {projects.length === 0 && (
                        <div style={{ textAlign: 'center', padding: 50, background: 'white', borderRadius: 16 }}>
                            <p>У вас пока нет проектов. Создайте первый проект!</p>
                            <button onClick={() => setShowProjectModal(true)} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', marginTop: 16 }}>➕ Создать проект</button>
                        </div>
                    )}
                </>
            )}

            {showProjectModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowProjectModal(false)}>
                    <div style={{ background: 'white', borderRadius: 16, padding: 24, width: 400 }} onClick={(e) => e.stopPropagation()}>
                        <h3>Новый проект</h3>
                        <input type="text" placeholder="Название проекта" style={{ width: '100%', padding: 10, margin: '10px 0', border: '1px solid #ccc', borderRadius: 8 }} value={newProject.name} onChange={(e) => setNewProject({...newProject, name: e.target.value})} />
                        <input type="text" placeholder="Сумма договора (₽)" style={{ width: '100%', padding: 10, margin: '10px 0', border: '1px solid #ccc', borderRadius: 8 }} value={newProject.contractAmount} onChange={(e) => setNewProject({...newProject, contractAmount: e.target.value})} />
                        <input type="number" placeholder="Аванс (%)" style={{ width: '100%', padding: 10, margin: '10px 0', border: '1px solid #ccc', borderRadius: 8 }} value={newProject.advancePercent} onChange={(e) => setNewProject({...newProject, advancePercent: e.target.value})} />
                        <input type="number" placeholder="Отсрочка (дней)" style={{ width: '100%', padding: 10, margin: '10px 0', border: '1px solid #ccc', borderRadius: 8 }} value={newProject.paymentDelay} onChange={(e) => setNewProject({...newProject, paymentDelay: e.target.value})} />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
                            <button style={{ background: '#e2e8f0', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }} onClick={() => setShowProjectModal(false)}>Отмена</button>
                            <button style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }} onClick={addProject}>Создать</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Главный компонент с авторизацией
const App = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        return !!localStorage.getItem('token');
    });

    if (!isAuthenticated) {
        return <Auth onLogin={() => setIsAuthenticated(true)} />;
    }

    return <AppContent onLogout={() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
    }} />;
};

export default App;