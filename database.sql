CREATE DATABASE stroy_cloud;

\c stroy_cloud;

-- Таблица пользователей
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица проектов
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contract_amount DECIMAL(15,2) DEFAULT 0,
    advance_percent DECIMAL(5,2) DEFAULT 0,
    payment_delay INTEGER DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица транзакций
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    month INTEGER NOT NULL,
    income_accrued DECIMAL(15,2) DEFAULT 0,
    expense DECIMAL(15,2) DEFAULT 0,
    cash_incoming DECIMAL(15,2) DEFAULT 0,
    cash_outgoing DECIMAL(15,2) DEFAULT 0
);

-- Индексы для скорости
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_transactions_project_id ON transactions(project_id);