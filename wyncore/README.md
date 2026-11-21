# WYNCORE

Plataforma privada de atividades com contas por função, aprovação de participantes exclusivamente pelo administrador proprietário, atribuição e revisão de atividades, níveis SL1–SL9 e registros operacionais.

## Implementado
- Backend Node.js sem dependências de terceiros (exceto armazenamento Vercel Blob).
- Login administrativo por identificador **ADMIN** e senha de ambiente; contas de participantes com senha derivada via scrypt.
- Sessão assinada em cookie HttpOnly, SameSite=Strict e expiração.
- Solicitação pública de acesso; somente o administrador proprietário pode aprovar participantes e executar ações administrativas. Contas novas sempre recebem o papel participant.
- Campanhas com orçamento, recompensa, fonte HTTPS e bloqueio até conferência manual de evidência de financiamento.
- Atribuição, comprovação, revisão, histórico, trilha de auditoria e relatórios CSV.
- Persistência JSON em Vercel Blob privado ou disco persistente.
- Interface ligada à API; cache PWA somente para arquivos estáticos.
- Testes automatizados para fluxos de autenticação, equipe, campanhas e regras financeiras.

## Executar localmente
Requer Node.js 22 ou superior.

```bash
cd wyncore
WYNCORE_OWNER_PASSWORD='uma-senha-forte-com-12-ou-mais-caracteres' WYNCORE_SESSION_SECRET='um-segredo-aleatorio-com-32-ou-mais-caracteres' npm start
```

Abra http://localhost:3000. O administrador informa **ADMIN** no campo de acesso e usa a senha configurada. Participantes solicitam acesso pela tela inicial e aguardam aprovação. Para executar testes: `npm test`.

## Variáveis de ambiente
- `WYNCORE_OWNER_PASSWORD`: senha administrativa forte (mínimo 12 caracteres).
- `WYNCORE_SESSION_SECRET`: segredo aleatório para assinar sessões (mínimo 32 caracteres).
- `BLOB_READ_WRITE_TOKEN`: acesso ao armazenamento privado Vercel Blob.
- `WYNCORE_PARTNER_WEBHOOK_SECRET`: segredo para validar a assinatura HMAC de campanhas recebidas de um parceiro.
- `WYNCORE_GOOGLE_CLIENT_ID`: opcional, para autenticação Google.

Nunca coloque valores secretos no Git, no frontend ou em mensagens. Configure-os somente no ambiente seguro do serviço.

## Publicar
O arquivo `render.yaml` descreve o serviço web e um disco persistente. A publicação precisa ser autorizada na conta do proprietário. Na Vercel, Preview e Production são ambientes separados e precisam de configuração própria. Não promova uma versão de Preview para Production para contornar falhas de configuração.

## Limites reais e integrações pendentes
O sistema tem backend e armazenamento, mas ainda não está conectado a contratantes, campanhas pagas, fontes automáticas de oportunidades ou processadores de pagamento. A conferência de financiamento é manual e baseada em evidência fornecida; não é verificação bancária. A rota de pagamento permanece bloqueada (HTTP 503) enquanto não houver provedor real conectado e confirmação verificável. O estado exibido em carteira é operacional, não saldo bancário.

Os espaços publicitários da página são apenas posições visuais. Nenhuma rede de anúncios está conectada e nenhuma impressão ou receita é fabricada. Não use inventário publicitário comum com recompensa em dinheiro por visualização/clique: só integre campanhas cujo contrato autorize expressamente esse tipo de incentivo.

Veja [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md) para os requisitos técnicos e critérios de ativação das integrações de anúncios e Pix. A avaliação específica do MobSPOT está em [docs/MOBSPOT-COMPATIBILITY.md](docs/MOBSPOT-COMPATIBILITY.md). A pesquisa de provedor de vídeo remunerado está em [docs/REWARDED-VIDEO-PROVIDER-RESEARCH.md](docs/REWARDED-VIDEO-PROVIDER-RESEARCH.md).

## Módulos inspirados na experiência SL
A interface inclui áreas para conteúdos e campanhas, aprendizagem/estágio, progressão visual SL1–SL9 e acompanhamento de indicações. A progressão é administrativa e não cria direito financeiro. A progressão é demonstrativa e baseada em atividades aprovadas/registradas no fluxo. Não representa níveis oficiais de terceiros, não cria saldo, não oferece comissões por recrutamento e não processa depósitos ou saques.

## Cadastro e integração de parceiros
O administrador pode cadastrar participantes em Equipe e aprovações. O cadastro cria acesso pendente; após aprovação, a pessoa pode entrar com o e-mail ou celular e a senha definida. Para importação automática de campanhas, configure `WYNCORE_PARTNER_WEBHOOK_SECRET` no ambiente do servidor e compartilhe o segredo apenas com o parceiro contratado. O parceiro envia `POST /api/integrations/campaigns` com JSON contendo `title`, `sponsor`, `reward`, `budget` e `url`, e o cabeçalho `X-Wyncore-Signature: sha256=<HMAC-SHA256 do corpo bruto>`. As campanhas entram como `pending_funding`; o webhook não confirma dinheiro nem libera pagamentos.

## WYNCORE Company
- Funil comercial de empresas: prospecção, contato, proposta, contrato registrado e inativo.
- Registro interno de custos operacionais. Os lançamentos não movimentam dinheiro nem substituem extratos ou documentos contábeis.
- Cada alteração é enviada à API e só é apresentada como salva após resposta bem-sucedida do servidor.
