## Objetivo

Criar duas contas admin diretamente, sem painel de gestão.

## Contas a criar

| Email | Password | Role |
|---|---|---|
| `vrcf.infseg@outlook.pt` | `vrcf2025` | `admin` |
| `vrcf@outlook.pt` | `vrcf2025` | `admin` |

## Como vou criar

Como o registo público está desativado, vou usar uma Edge Function pontual chamada `bootstrap-admins` que:

1. Valida que quem invoca é o super-admin (`vrcf.loja@gmail.com`) via JWT.
2. Para cada um dos dois utilizadores:
   - Cria a conta via `supabase.auth.admin.createUser()` com `email_confirm: true` (entram já sem precisar de verificar email).
   - Insere a role `admin` na tabela `user_roles`.
3. Devolve o resultado de cada criação (sucesso ou erro, ex: "já existe").

Depois invoco a função uma vez a partir do teu browser (estás logado como super-admin) e mostro o resultado.

## Após criação

- Os dois utilizadores podem fazer login imediatamente em `/login` com as credenciais acima.
- Têm acesso total ao painel Admin (mesmas permissões que tu, exceto gestão de roles).
- Recomendo que mudem a password no primeiro acesso (se quiseres, posso adicionar um botão "Alterar password" no header do Admin numa próxima iteração).

## Detalhes técnicos

- **Edge Function nova**: `supabase/functions/bootstrap-admins/index.ts` com `verify_jwt = false` (validação manual do JWT no código, padrão Lovable).
- Usa `SUPABASE_SERVICE_ROLE_KEY` (já existe nos secrets) para o `auth.admin.createUser`.
- Sem alterações de schema — usa a tabela `user_roles` existente.
- A função fica no projeto e pode ser reutilizada se quiseres adicionar mais admins no futuro (basta editar a lista hardcoded ou eu invoco-a com novos parâmetros).

## Resultado

3 admins ativos: `vrcf.loja@gmail.com` (super_admin), `vrcf.infseg@outlook.pt` (admin), `vrcf@outlook.pt` (admin). Todos podem trabalhar em paralelo em famílias diferentes.
