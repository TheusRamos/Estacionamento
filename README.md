# Estacionamento Pro

Sistema web de gerenciamento de estacionamento desenvolvido como requisito para obtenção de nota parcial no Curso de Ciência da Computação da **UNIFUCAMP** — Monte Carmelo, MG.

**Autores:** Matheus Ramos e Lukas Raymond

---

## Visão Geral

Plataforma web responsiva para gestão completa de estacionamento, com dois perfis de acesso distintos: **cliente** e **administrador**. O sistema permite reserva de vagas, controle de entrada e saída de veículos, gestão de tarifas, mensalistas e geração de relatórios de sessões.

---

## Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Frontend | HTML5 + CSS3 (sem frameworks) |
| Linguagem | JavaScript ES Modules (sem bundler) |
| Banco de dados | Firebase Firestore (NoSQL, tempo real) |
| Autenticação | Firebase Authentication (e-mail/senha + Google) |
| Hospedagem | Firebase Hosting (compatível) |
| Mobile | Apache Cordova (Android/iOS) |
| Fonte | Inter (Google Fonts) |
| Ícones | Material Symbols Rounded |

**Firebase SDK:** v10.12.2 via CDN estático (módulos ES)

---

## Estrutura de Arquivos

```
www/
├── index.html                  # Login
├── cadastro.html               # Cadastro de novo cliente
│
├── client-home.html            # Dashboard do cliente
├── client-vagas.html           # Mapa de vagas com reserva (matriz 8×2)
├── client-veiculos.html        # Gerenciar veículos cadastrados
├── client-historico.html       # Histórico de sessões e pagamentos
│
├── admin-home.html             # Dashboard do administrador
├── admin-entrada.html          # Registro de entrada e saída
├── admin-mensalistas.html      # Gestão de mensalistas
├── admin-clientes.html         # Listagem e detalhes de clientes cadastrados
├── admin-setores.html          # Setores e vagas (CRUD + geração de matriz padrão)
├── admin-tarifas.html          # Cadastro e edição de tarifas
├── admin-sessoes.html          # Histórico de todas as sessões
│
├── assets/
│   └── images/
│       └── qrcode.jpeg
│
├── css/
│   ├── variables.css           # Design tokens (cores, espaçamentos, tipografia)
│   ├── reset.css               # Reset/base global
│   ├── components.css          # Componentes reutilizáveis (sidebar, topbar, modal, etc.)
│   └── pages.css               # Estilos específicos por página
│
└── js/
    ├── layout.js               # Guard de autenticação + sidebar + topbar (compartilhado)
    ├── unsubs.js               # Registro de listeners Firestore (limpeza no beforeunload)
    ├── utils.js                # Funções utilitárias: formatação, badges, escape, onReady
    │
    ├── config/
    │   └── firebase.js         # Inicialização do Firebase (app, auth, db)
    │
    ├── components/
    │   ├── modal.js            # Bottom sheet modal reutilizável
    │   ├── toast.js            # Notificações toast
    │   └── loader.js           # Controle de loading em botões
    │
    ├── entries/                # Ponto de entrada de cada página HTML (thin wrappers)
    │   ├── login.js
    │   ├── register.js
    │   ├── client-home.js
    │   ├── client-vagas.js
    │   ├── client-veiculos.js
    │   ├── client-historico.js
    │   ├── admin-home.js
    │   ├── admin-entrada.js
    │   ├── admin-mensalistas.js
    │   ├── admin-clientes.js
    │   ├── admin-setores.js
    │   ├── admin-tarifas.js
    │   └── admin-sessoes.js
    │
    ├── services/               # Camada de acesso ao Firestore
    │   ├── auth.js             # Login, cadastro, Google OAuth, onAuthChange, getClientes
    │   ├── vagas.js            # CRUD de vagas + reserva/ocupação atômica
    │   ├── setores.js          # CRUD de setores
    │   ├── tarifas.js          # CRUD de tarifas
    │   ├── sessoes.js          # Abertura e fechamento de sessões
    │   ├── reservas.js         # Criação e cancelamento de reservas
    │   ├── veiculos.js         # CRUD de veículos por usuário
    │   ├── mensalistas.js      # Gestão de mensalistas
    │   └── pagamentos.js       # Registro de pagamentos
    │
    └── pages/
        ├── auth/
        │   ├── login.js        # Lógica da página de login
        │   └── register.js     # Lógica da página de cadastro
        ├── client/
        │   ├── dashboard.js    # Dashboard do cliente
        │   ├── spots.js        # Mapa de vagas (matriz 8×2, animada)
        │   ├── vehicles.js     # Gerenciar veículos
        │   └── sessions.js     # Histórico de sessões e reservas
        └── admin/
            ├── dashboard.js    # Dashboard do administrador
            ├── entry.js        # Entrada e saída de veículos
            ├── sectors.js      # Setores e vagas (inclui geração de matriz padrão)
            ├── rates.js        # Tarifas
            ├── subscribers.js  # Mensalistas
            ├── clients.js      # Listagem de clientes com veículos e sessões
            └── sessions.js     # Sessões (visão admin)
```

---

## Perfis de Acesso

### Cliente
- Visualiza o mapa de vagas em tempo real (matriz 8×2 por fileira)
- Reserva vagas com seleção de veículo
- Gerencia seus veículos (placa, modelo, cor)
- Consulta histórico de sessões, reservas e pagamentos

### Administrador / Operador
- Dashboard com ocupação em tempo real (círculo de porcentagem + estatísticas)
- Registra entrada e saída de veículos (busca por placa)
- Visualiza clientes cadastrados com veículos, sessões e reservas ativas
- Gerencia setores e vagas (criar, editar, excluir; geração de matriz padrão)
- Define tarifas (por hora, diária, mensalidade)
- Controla mensalistas e suas vigências
- Acessa o histórico completo de sessões com filtros

---

## Coleções Firestore

| Coleção | Descrição |
|---------|-----------|
| `usuarios` | Perfil do usuário (nome, tipo: cliente/administrador/operador) |
| `setores` | Setores do estacionamento (nome, totalVagas) |
| `vagas` | Vagas individuais (codigo, setorId, tipo, status) |
| `tarifas` | Tarifas de cobrança (nome, tipo, valor) |
| `sessoes` | Sessões de estacionamento (entrada, saída, vagaId, valor) |
| `reservas` | Reservas ativas com expiração automática |
| `veiculos` | Veículos cadastrados por usuário (placa, modelo, cor) |
| `mensalistas` | Mensalistas com período de vigência |
| `pagamentos` | Registro de pagamentos por sessão |

---

## Como Executar

O projeto é estático — basta servir a pasta `www/` com qualquer servidor HTTP local.

**Com VS Code (Live Server):**
```
Clique com botão direito em www/index.html → Open with Live Server
```

**Com Python:**
```bash
cd www
python -m http.server 5500
```

Acesse `http://localhost:5500` no navegador.

> **Nota:** O Firebase está configurado com o projeto `estacionamento-fbcee`. As credenciais estão em `www/js/config/firebase.js`. As regras de segurança do Firestore devem estar configuradas no Console do Firebase para permitir leitura/escrita autenticada.

---

## Primeiros Passos (Banco Vazio)

1. Crie uma conta de administrador no Firebase Authentication Console (ou via tela de cadastro + altere o campo `tipo` no Firestore manualmente para `"administrador"`)
2. Faça login em `index.html`
3. Acesse **Setores e Vagas** no menu lateral
4. Clique no ícone ✨ no topbar ou em **"Gerar Matriz Padrão"** para criar automaticamente:
   - 3 setores: Fileira A, Fileira B, Fileira C
   - 16 vagas por fileira (A-01 a A-16, B-01 a B-16, C-01 a C-16) — layout 8×2
5. Crie ao menos uma **tarifa** em **Tarifas**
6. O sistema está pronto para uso

---

## Design System

Paleta **Deep Navy × Safety Yellow** inspirada em sinalização viária:

| Token | Valor | Uso |
|-------|-------|-----|
| `--color-primary` | `#041627` | Sidebar, topbar, textos principais |
| `--color-accent` | `#feb700` | CTAs, estados ativos, destaque |
| Fonte | Inter | Toda a interface |
| Ícones | Material Symbols Rounded | Toda a interface |

Layout responsivo: sidebar fixa no desktop (264px), drawer no mobile. Footer fixo na base (`--footer-height: 52px`). Topbar fixa de 80px.
