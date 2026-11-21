# WYNCORE

Plataforma de campanhas de anúncios e trailers, avaliação de percepção, recompensas e acompanhamento financeiro, com áreas administrativas e de participantes.

## O que está no código
- Contas de administrador e participantes, aprovação de acesso, senhas com scrypt e sessão assinada em cookie HttpOnly.
- Cadastro público de interesse comercial para empresas e agências, com objetivo, orçamento, CPF/CNPJ, contato e link de vídeo.
- Campanhas com briefing, valor por avaliação, número máximo de vagas e bloqueio de publicação enquanto o financiamento não for confirmado.
- Player de vídeo com integração de eventos para arquivos MP4/WebM/OGG, YouTube IFrame Player API e Vimeo Player SDK. O formulário fica bloqueado até o player indicar conclusão e a aplicação detecta saltos comuns de reprodução.
- Revisão administrativa, recompensa aprovada, carteira de campanha e relatório CSV.
- Adaptador Asaas para cobrança Pix de contratantes, QR Code dinâmico, webhook autenticado e idempotente, transferência Pix para participantes e confirmação de repasse via webhook.
- Chaves Pix de participantes criptografadas em repouso com AES-256-GCM.
- Persistência transacional em PostgreSQL (preferencial), com migração inicial de dados existentes no Blob/disco; alternativa de JSON em disco persistente de instância única.\n- Reservas de carteira serializadas por lock transacional no PostgreSQL, evitando saques concorrentes entre instâncias.
- Testes automatizados executados por GitHub Actions no Node.js 22.

## Executar e testar
Requer Node.js 22 ou superior.

```bash
cd wyncore
cp .env.example .env
# Preencha os segredos no ambiente local, sem versionar o arquivo .env.
npm install
npm start
```

Abra http://localhost:3000. O administrador entra com **ADMIN** e a senha de ambiente. Participantes solicitam acesso e aguardam aprovação. Testes: `npm test`.

## Armazenamento de produção\n\nConfigure `DATABASE_URL` com uma instância PostgreSQL gerenciada para que todas as rotas de API leiam e gravem o estado dentro de uma transação protegida por advisory lock. Na primeira requisição, se a tabela estiver vazia, o WYNCORE importa o estado existente do Vercel Blob privado ou do arquivo em `DATA_DIR` e passa a usar o banco. Não remova o Blob nem o disco antigo até validar a migração e manter um backup.\n\nSem PostgreSQL, o saque só pode ser habilitado com `WYNCORE_PAYOUT_STORAGE_MODE=single_writer`, `DATA_DIR` absoluto e diferente do diretório efêmero padrão, em um único serviço com disco persistente anexado.\n\n## Integração Pix Asaas
A integração está implementada no código, mas só movimenta dinheiro quando credenciais válidas e webhook forem configurados no ambiente. Comece no Sandbox.

Variáveis:
- `ASAAS_ENV=sandbox`
- `ASAAS_API_KEY`: chave de API do ambiente correspondente.
- `ASAAS_WEBHOOK_TOKEN`: segredo aleatório próprio, mínimo 32 caracteres, diferente da API key.
- `ASAAS_BASE_URL`: opcional, somente para override explícito.

Webhook público: `https://SEU-DOMINIO/api/webhooks/asaas`. Configure o header `asaas-access-token` com o mesmo `ASAAS_WEBHOOK_TOKEN` e habilite os eventos `PAYMENT_RECEIVED`, `TRANSFER_DONE`, `TRANSFER_FAILED` e `TRANSFER_CANCELLED`.

Fluxo:
1. A empresa envia seus dados e CPF/CNPJ.
2. A administração cadastra campanha e orçamento.
3. WYNCORE cria uma cobrança Pix no Asaas e exibe o copia-e-cola/QR Code.
4. A campanha só é liberada após webhook autenticado `PAYMENT_RECEIVED` conciliado com ID e valor.
5. Após aprovação de uma avaliação, o servidor tenta enviar Pix para a chave do participante, desde que o saldo e as condições do provedor permitam.
6. A carteira só marca como pago após webhook `TRANSFER_DONE`.

A criação da cobrança não é confirmação de pagamento; a criação da transferência também não é confirmação de repasse. O Asaas exige conta aprovada e saldo disponível para transferências. Homologue no Sandbox antes de produção.

## Vídeos YouTube e Vimeo
O player usa eventos oficiais para observar estado, posição, busca e fim de reprodução. Isso melhora a validação e bloqueia saltos comuns, mas o YouTube e o Vimeo não emitem uma prova criptográfica independente de que uma pessoa assistiu ao conteúdo. Portanto, o estado do player é uma verificação de reprodução no navegador, não prova antifraude absoluta. Não publique recompensa baseada apenas em uma chamada manipulável pelo cliente.

## Contratantes e campanhas
O formulário público de empresas cria um lead para a equipe WYNCORE. A página permite que empresas encontrem o serviço e solicitem uma proposta, mas não cria clientes nem contratos automaticamente. Nenhum contratante ou orçamento é inventado. A aquisição de clientes depende de divulgação, negociação, aceitação do escopo e financiamento efetivo.

Campanhas remuneradas só devem ser executadas quando o contrato do anunciante autorizar expressamente pesquisa incentivada e remuneração dos participantes. Não prometa ganhos fixos ou salários.

## Publicação
A raiz do app é `wyncore/`. O projeto Vercel deve manter esse diretório como Root Directory e Node.js 22. Preview e Production são ambientes separados. Configure credenciais Asaas e Blob em ambos os ambientes necessários. A branch de trabalho é `wyncore-personal-work-hub`; a produção só muda após promover o commit validado para a branch de produção ou promover um deployment READY. O workflow `.github/workflows/wyncore-ci.yml` executa `npm test` em pushes e pull requests.

Consulte [ASAAS_SETUP.md](ASAAS_SETUP.md) para a configuração passo a passo.
