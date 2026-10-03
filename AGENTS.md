# Regras do projeto — Recomeço

Estas regras são obrigatórias e têm prioridade sobre fluxos de trabalho padrão.

## Alterações (OBRIGATÓRIO)

1. **Antes de qualquer alteração de código**, perguntar ao usuário:
   - (a) Ele quer que a alteração seja feita em um **branch novo**? (padrão
     sugerido: sim → branch + PR; ele pode dizer que não e autorizar direto)
2. **Nunca** assumir que pode alterar — perguntar primeiro.

## Deploy (OBRIGATÓRIO)

1. Depois de uma alteração pronta, **perguntar ao usuário se ele quer fazer
   deploy**. Nunca executar deploy sem confirmação explícita.
2. Preferir uma única pergunta combinando: branch novo? + deploy agora?
3. O deploy **nunca é automático**: o workflow só publica via
   `workflow_dispatch` (execução manual). Mesmo com merge em `main`, nada é
   publicado até o deploy manual ser disparado com confirmação.

## Git / GitHub

- `main` é **protegida**: sem push direto, sem force push, só via PR.
- Fluxo: branch novo → commit → PR → CI (`build`) → merge (com confirmação do
  usuário) → deploy manual (só se o usuário pedir).
- Nunca fazer commit/push sem pedido explícito do usuário.

## Comandos

- Build/validação: roda sozinho em PR e em push para `main` (CI).
- Deploy manual: `gh workflow run deploy.yml`
- Acompanhar: `gh run watch`
