# Recomeço

Sistema web para acompanhamento do Ministério Recomeço - Igreja.

## Objetivo

Cadastrar e acompanhar pessoas novas que aceitaram Jesus, se reconciliaram, visitaram a igreja ou tomaram alguma decisão espiritual. O sistema substitui as planilhas manuais por uma interface moderna e organizada.

## Tecnologias

- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Banco de dados**: SQLite (better-sqlite3)
- **Estilização**: CSS puro

## Funcionalidades

- Dashboard com estatísticas
- Cadastro de pessoas
- Lista de pessoas cadastradas
- Responsáveis pelo discipulado
- Filtros e busca
- API REST

## Como Instalar

1. Clone o repositório
2. Instale as dependências:

```bash
npm install
cd server && npm install
cd ../client && npm install
```

## Como Rodar

Na raiz do projeto:

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Estrutura

```
recomeco/
  client/       # Frontend React
  server/      # Backend Node.js
  package.json # Scripts
  .gitignore
  README.md
```

## Dados Iniciais

1. Acesse http://localhost:5173
2. Vá em "Responsáveis" e cadastre os discipuladores
3. Comece a cadastrar pessoas em "Novo Cadastro"

## GitHub

Para subir para o GitHub:

```bash
git init
git add .
git commit -m "feat: projeto inicial Recomeço"
git remote add origin https://github.com/seu-usuario/recomeco.git
git push -u origin main
```

## Próximos Passos

- Autenticação
- Relatórios exportáveis
- Backup do banco de dados
- Deploy em produção