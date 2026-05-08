# Recomeço - Registro de Alterações

## Histórico de Versões

### v1.0.0 - 07/05/2026

#### Funcionalidades Implementadas

##### 1. Backend
- [x] Servidor Node.js + Express
- [x] Banco de dados SQLite (sql.js)
- [x] Rotas API REST:
  - GET /api/people - Listar todas as pessoas
  - GET /api/people/:id - Buscar pessoa por ID
  - POST /api/people - Criar nova pessoa
  - PUT /api/people/:id - Atualizar pessoa
  - DELETE /api/people/:id - Excluir pessoa
  - GET /api/mentors - Listar líderes
  - POST /api/mentors - Criar líder
  - PUT /api/mentors/:id - Atualizar líder
  - DELETE /api/mentors/:id - Excluir líder
  - GET /api/dashboard/summary - Dados do dashboard
  - POST /api/auth/login - Login
  - GET /api/auth/verify - Verificar token
  - GET /api/health - Status do servidor

##### 2. Frontend
- [x] React + Vite
- [x] Sistema de rotas com React Router
- [x] Página Dashboard com estatísticas
- [x] Página de Pessoas (lista com cards)
- [x] Página de Cadastro/Edição de pessoa
- [x] Página de Líderes de Recomeço
- [x] Página de Login
- [x] Campo de foto no cadastro
- [x] Foto nos cards de pessoas
- [x] Filtros (status, mês, decisão, batizado)
- [x] Busca por nome/contato
- [x] Sistema de autenticação JWT
- [x] Proteção de rotas

##### 3. Design/UI
- [x] Cores: Branco, Preto, Vermelho (#dc143c)
- [x] Layout responsivo (mobile, tablet, desktop)
- [x] Animações no menu
- [x] Ícones no menu
- [x] Visual premium (sombras, gradientes, bordas arredondadas)
- [x] Logo com gradiente vermelho
- [x] Cards com hover effects
- [x] Modal de confirmação de exclusão

##### 4. Banco de Dados

###### Tabela people
- id
- decisionDate
- decisionMonth
- fullName
- birthDate
- fullAddress
- contact
- gender
- baptized
- firstDecision
- discipleStatus
- finalDecision
- photo (base64)
- notes
- createdAt
- updatedAt

###### Tabela mentors
- id
- fullName
- phone
- notes
- active
- createdAt
- updatedAt

###### Tabela people_mentors
- id
- personId
- mentorId

##### 5. Credenciais de Acesso
- Email: admin@recomeco.com
- Senha: recomeco123

---

## Como Rodar o Projeto

### Pré-requisitos
- Node.js instalado

### Instalação
```bash
# Instalar dependências globais
npm install

# Instalar dependências do servidor
cd server && npm install

# Instalar dependências do cliente
cd ../client && npm install
```

### Executar
```bash
# Terminal 1 (Backend)
cd server && npm run dev

# Terminal 2 (Frontend)
cd client && npm run dev
```

Acesse: http://localhost:5173

---

## Próximas Funcionalidades Pendentes

- [ ] Resetar senha do admin
- [ ] Exportar dados (PDF/Excel)
- [ ] Backup automático do banco
- [ ] Notificações
- [ ] Histórico de alterações
- [ ] Campo de busca por líder
- [ ] Ordenação de listas
- [ ] Paginação
- [ ] Estatísticas avançadas
- [ ] Deploy em produção

---

## Tecnologias Utilizadas

- Frontend: React 18, Vite 5, React Router 6
- Backend: Node.js, Express 4, sql.js, jsonwebtoken
- Banco: SQLite (sql.js)
- Estilização: CSS Puro

---

*Documento atualizado em: 07/05/2026*