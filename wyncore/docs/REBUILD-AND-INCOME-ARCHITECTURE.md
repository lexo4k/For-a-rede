# WYNCORE — arquitetura consolidada de renda e operação

Atualizado em 2026-11-21. Branch: `wyncore-personal-work-hub`.

## Objetivo do produto

WYNCORE deve ser uma central pessoal de oportunidades de trabalho remunerado, acompanhamento de tarefas, controle de ganhos e, em uma área separada, uma plataforma de campanhas publicitárias financiadas por anunciantes. Não deve prometer salário, visualização remunerada sem contrato, saldo fictício ou saque de receita que não foi recebida.

## Dois fluxos que não podem ser misturados

### A. WYNCORE Work — renda do proprietário/trabalhador

O usuário se candidata diretamente a plataformas externas. Cada empresa faz seleção, disponibiliza tarefas, revisa entregas e paga o trabalhador segundo as regras da própria conta. WYNCORE organiza oportunidades, tarefas, metas e comprovantes; não intercepta pagamentos de OneForma, CrowdGen, TELUS, Outlier, RWS, Welo Data, Prolific ou Hub Data.

A interface lista oito fontes oficiais e mantém:
- links diretos para cadastro/vagas;
- informação de elegibilidade, revisão e ciclo de pagamento, quando publicada;
- acompanhamento pessoal de tarefas;
- registro manual separado entre valor informado e valor marcado como recebido;
- planejador de metas mensais de R$ 3.000, R$ 4.000, R$ 5.000 e R$ 6.000, calculando horas necessárias apenas a partir de uma taxa líquida real informada pelo usuário.

O planejador não é previsão de renda. A taxa deve ser copiada da oferta ou painel da plataforma, depois de confirmar moeda, aprovação, taxas e elegibilidade.

### B. WYNCORE Ads — campanhas e recompensas a participantes

Só pode exibir campanha recompensada quando um anunciante/rede autorizar expressamente o formato, o país, o tráfego incentivado e a recompensa em dinheiro. O publisher não pode gerar conversões para si mesmo quando os termos do parceiro proíbem autoindicação, atividade própria ou tráfego artificial. Visualização do player no navegador não é prova antifraude criptográfica.

A Adscend só pode ser ativada depois de aprovação de publisher, ativação formal do produto Rewarded Video para BR, credenciais reais e postback validado. Não creditar o dono do publisher por assistir aos próprios anúncios sem autorização escrita do parceiro.

## Plataformas externas listadas no WYNCORE Work

1. Hub Data — gravações de tarefas reais; só horas aprovadas são pagas. A página de fatos da Hub informa taxa-base de US$ 5/h aprovada em casa e US$ 6/h no trabalho, com valores e bônus vigentes exibidos no app. O FAQ informa que a compatibilidade do aparelho é verificada no Minute e lista modelos específicos; Moto G35 não aparece na lista publicada, então a compatibilidade precisa ser confirmada no cadastro. A Hub informa pagamentos via PIX/transferência e condições no painel.
2. OneForma — taxas por projeto; pagamentos geralmente duas vezes por mês; métodos dependem do país e precisam aparecer como Connected.
3. Welo Data — vagas e projetos conforme país, idioma e seleção.
4. RWS TrainAI — projetos de dados/linguagem sujeitos a qualificação.
5. Prolific — estudos sujeitos à elegibilidade e disponibilidade.
6. CrowdGen by Appen — projetos e métodos de pagamento variam por país/conta.
7. TELUS Digital AI Community — página oficial de vagas no Brasil; verificar se a vaga ainda está aberta.
8. Outlier — projetos sujeitos a qualificação e taxa indicada na oferta.

## Matemática de metas — não é garantia

A página de fatos da Hub usa conversão indicativa de R$ 5 por US$ 1 e informa US$ 5/h aprovada em casa (R$ 25/h exibidos) e US$ 6/h no trabalho (R$ 30/h exibidos). Com essas taxas de referência, antes de qualquer ajuste, recusa, limite ou indisponibilidade:

| Meta mensal | A R$ 25/h aprovada | A R$ 30/h aprovada |
|---|---:|---:|
| R$ 3.000 | 120 h/mês | 100 h/mês |
| R$ 4.000 | 160 h/mês | 133,4 h/mês |
| R$ 5.000 | 200 h/mês | 166,7 h/mês |
| R$ 6.000 | 240 h/mês | 200 h/mês |

Hora gravada não equivale a hora aprovada. A Hub pode recusar gravações; a disponibilidade real de tarefas e a compatibilidade do dispositivo precisam ser confirmadas. Não projetar renda usando bônus como se fossem garantidos.

## Integrações financeiras existentes e seus limites

- Adscend: adaptador de ofertas/postbacks existe; sem evidência de credenciais válidas, campanhas BR autorizadas ou receita liquidada.
- Asaas: adaptador de cobrança/transferência Pix existe; exige conta aprovada, chave do ambiente correto, webhook autenticado e saldo. É para campanhas/recompensas WYNCORE, não para importar automaticamente ganhos de sites externos.
- PayPal: adaptador existe; produto/conta de payout e países elegíveis precisam ser aprovados. Não tratar como conexão ativa.
- Supabase/Postgres/Blob: persistência depende de configuração íntegra. O ambiente Preview auditado tinha chave anon e segredo RPC vazios; o armazenamento Blob estava configurado. Não declarar Supabase RPC ativo.
- WYNCORE Work usa contas próprias, tarefas e lançamentos pessoais; seus lançamentos de pagamento são manuais e não consultam extrato bancário.

## Bloqueios operacionais verificados

- No Vercel, as variáveis Adscend, Asaas e PayPal não apareceram cadastradas na listagem de ambiente examinada.
- A chave anon e o segredo RPC do Supabase estavam vazios no Preview; não usar RPC até configurar e testar.
- O preview Vercel READY ainda corresponde ao commit anterior `615aaa1`; os commits de rebuild `c4bfed9` e `9aacc7e` ainda não tinham deployment associado no momento da verificação.
- Uma tentativa de deployment manual foi bloqueada pelo limite de API do plano Vercel (HTTP 402: mais de 100 deployments no dia; nova tentativa indicada após 24 horas). Não contornar o limite nem alterar o plano automaticamente.

## Critérios de conclusão

1. Confirmar sintaxe e testes automatizados do projeto.
2. Publicar preview com os últimos commits e testar cadastro/login, persistência, tarefas, registros e planejador no navegador.
3. Validar cada portal externo no Brasil, elegibilidade e métodos de pagamento com a conta real do trabalhador.
4. Para Adscend, obter aprovação formal de Rewarded Video incentivado no Brasil e testar postback de sandbox/produção.
5. Para Asaas, testar sandbox, webhook e reconciliação; produção só após aprovação e pequeno pagamento conciliado.
6. Só chamar WYNCORE de operacional depois de cada etapa comprovada.

## Referências oficiais consultadas

- Hub Brasil: https://app.hubdata.org/pt
- Hub fatos e pagamentos: https://app.hubdata.org/pt/fatos
- Hub FAQ e compatibilidade: https://hubdata.org/faq
- OneForma pagamentos: https://www.oneforma.com/help-center/payment-issues-and-finance/how-payments-work-on-oneforma/
- OneForma métodos: https://www.oneforma.com/help-center/general-inquiries/what-payment-methods-are-available-for-you/
- CrowdGen onboarding/pagamentos: https://crowdgen.com/onboarding/
- TELUS vagas Brasil: https://jobs.telusdigital.com/search/cfm5/ai-community/jobs/in/country/brazil
