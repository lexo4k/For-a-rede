# WYNCORE

Plataforma privada de atividades com contas por função, aprovação de participantes, atribuição e revisão de tarefas, níveis SL1–SL9 e livro-caixa.

## Implementado
- Backend Node.js sem dependências de terceiros.
- Login de administrador por segredo de ambiente e contas de participantes com senha derivada via scrypt; sessão assinada em cookie HttpOnly, SameSite=Strict e expiração.
- Solicitação pública de acesso, aprovação por administrador/supervisor/gerente e controle de papéis; apenas administrador nomeia supervisores e gerentes.
- Cadastro de campanhas com orçamento total, recompensa por entrega, responsável e fonte HTTPS; campanhas ficam bloqueadas até conferência manual de evidência de financiamento por administrador; limite de orçamento impede atribuições acima do teto; atribuição, comprovação, revisão e registro de pagamentos já realizados.
- Livro-caixa por participante, trilha de auditoria e indicações sem comissão automática.
- API protegida para oportunidades, tarefas, histórico de alterações e exportação CSV.
- Persistência JSON em disco, com escrita atômica.
- Interface ligada à API: não usa mais localStorage como banco de dados.
- PWA com cache apenas dos arquivos estáticos. Rotas de API nunca são armazenadas offline.
- Testes automatizados para validação dos dados.

## Executar localmente
Requer Node.js 22 ou superior.

```bash
cd wyncore
WYNCORE_OWNER_PASSWORD='uma-senha-forte-com-12-ou-mais-caracteres' WYNCORE_SESSION_SECRET='use-um-segredo-aleatorio-com-32-ou-mais-caracteres' npm start
```

Abra http://localhost:3000. O administrador entra com a senha configurada e e-mail em branco. Participantes solicitam acesso pela tela inicial e aguardam aprovação. Para executar testes: `npm test`.

## Publicar no Render
O arquivo `render.yaml` descreve o serviço web e um disco persistente. Ao criar o serviço, configure `WYNCORE_OWNER_PASSWORD` como variável secreta. `WYNCORE_SESSION_SECRET` é gerado pelo Render. O deploy ainda precisa ser autorizado na conta Render do proprietário.

## Limites reais
O sistema tem backend e armazenamento, mas ainda não está conectado a contratantes, campanhas pagas, fontes automáticas de vagas ou processadores de pagamento. A conferência de financiamento é manual e baseada em referência/link fornecidos pelo administrador, não é verificação bancária automática nem garantia de recebimento. O cadastro é manual e o status financeiro é um registro operacional, não uma confirmação bancária. Não há promessa de renda. Integrações comerciais e contas financeiras exigem elegibilidade, revisão e autorização adequadas. Nunca coloque senhas, tokens bancários ou chaves privadas no Git.


## Módulos inspirados na experiência SL

A interface inclui áreas para vídeos e campanhas, aprendizagem/estágio, progressão visual SL1–SL9 e acompanhamento de indicações. A progressão é demonstrativa e baseada em atividades aprovadas/registradas no fluxo. Não representa níveis oficiais da SteadyLayout, não cria saldo, não oferece comissões por recrutamento e não processa depósitos ou saques. Vídeos e atividades só podem ser cadastrados com uma fonte e condições verificáveis. Valores anunciados, estimados, confirmados pelo contratante e efetivamente recebidos permanecem separados.


## Cadastro de participantes e integração de parceiros

O administrador pode cadastrar participantes em Equipe e aprovações. O cadastro cria acesso pendente com senha inicial; após aprovação, a pessoa pode entrar com o e-mail e a senha definida. Para importação automática de campanhas, configure `WYNCORE_PARTNER_WEBHOOK_SECRET` no ambiente Vercel e compartilhe o segredo apenas com o parceiro contratado. O parceiro envia `POST /api/integrations/campaigns` com JSON contendo `title`, `sponsor`, `reward`, `budget` e `url`, e o cabeçalho `X-Wyncore-Signature: sha256=<HMAC-SHA256 do corpo bruto>`. As campanhas entram como `pending_funding`; o webhook não confirma dinheiro nem libera pagamentos. Esta versão não faz transferências bancárias nem pagamentos automáticos.


## WYNCORE Company
- Funil comercial de empresas: prospecção, contato, proposta, contrato registrado e inativo.
- Registro interno de custos operacionais. Os lançamentos não movimentam dinheiro nem substituem extratos ou documentos contábeis.
- Cada alteração é enviada à API e só é apresentada como salva após resposta bem-sucedida do servidor. Os dados são recarregados do armazenamento persistente após login.
