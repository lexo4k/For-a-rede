# Avaliação técnica: OpenRewards no WYNCORE

Data da avaliação: 2026-11-18

## Decisão

O OpenRewards (MIT) é uma referência reutilizável para interface e medição de sessões de anúncio, mas **não é uma rede de anunciantes nem um processador de pagamentos**. Não copiar o projeto inteiro para dentro do WYNCORE. A arquitetura atual do WYNCORE já possui autenticação, persistência, auditoria e um receptor genérico de conversões; uma migração integral duplicaria contas, banco de dados e sessões.

Repositório avaliado: https://github.com/o87enterprises-ai/OpenRewards

## Componentes que merecem adaptação conceitual

- `RewardAdSlot.jsx`: observação de visibilidade com IntersectionObserver e pausa quando a aba perde foco.
- `/impression-session` e `/earn`: padrão de sessão iniciada no servidor e resgate de uso único.
- Valores monetários em centavos inteiros.
- Histórico de eventos separado do saldo apresentado.

## Bloqueadores encontrados no código-fonte

1. **Não fornece inventário publicitário.** O README declara expressamente que o slot é um placeholder. O componente usa `pickDemoAd()` e `getDemoAdById()`; isso não entrega anúncios de anunciantes reais nem gera receita.
2. **Não há pagamento automático.** `payoutsAutomated` é `false`; a solicitação apenas entra em fila para processamento manual. Não há adaptador Pix.
3. **A recompensa é local ao programa.** O serviço credita um valor configurado por impressão, mas não recebe confirmação de receita de uma rede de anúncios antes de creditar. Isso não deve ser tratado como receita liquidada.
4. **Sessões em memória.** O mapa de sessões desaparece em reinicializações e não compartilha estado entre instâncias. Produção exigiria armazenamento persistente/compartilhado e expiração robusta.
5. **Concorrência financeira precisa de correção.** A contagem diária, a gravação da impressão, o incremento de saldo e o ledger não estão dentro de uma transação atômica. Solicitações simultâneas podem ultrapassar limites ou deixar registros inconsistentes. O fluxo de saque também zera saldo antes de inserir o pedido, sem transação única.
6. **Limites e identidade precisam de revisão.** A sessão prova tempo de relógio decorrido, mas não prova por si só que o conteúdo foi efetivamente servido por um parceiro autorizado, nem impede automação distribuída. É necessária validação server-to-server do parceiro e controles adicionais.

## Arquitetura recomendada para o WYNCORE

- Manter a autenticação, os papéis e a administração exclusiva já existentes no WYNCORE.
- Manter um adaptador por parceiro autorizado, sem misturar inventário demonstrativo com campanhas reais.
- Só registrar conversões após postback assinado, deduplicado e conciliado com o valor efetivamente liquidado ao publisher.
- Usar um ledger append-only e transações de banco para saldo, limites, estornos e conciliação.
- Separar saldo estimado, pendente, liquidado e eventual pagamento confirmado. Nunca chamar solicitação de saque de transferência concluída.
- Tratar qualquer integração de pagamento como projeto separado, sujeito à elegibilidade, contrato, controles e homologação do provedor.

## Critérios mínimos de aceite técnico

- Rejeitar postback sem assinatura válida, com evento duplicado ou transação inconsistente.
- Aceitar estorno/reversão sem duplicar lançamentos.
- Testar simultaneidade, reinício do serviço, limite diário e indisponibilidade do parceiro.
- Garantir que nenhuma tela crie saldo a partir de anúncio demonstrativo.
- Não armazenar credenciais ou dados de pagamento no navegador, no Git ou em logs.

## Estado após esta avaliação

Esta avaliação é documentação técnica. Nenhum código do OpenRewards foi copiado ou executado no WYNCORE, nenhuma rede publicitária foi contratada/conectada e nenhum pagamento foi ativado. A branch de trabalho permanece separada da produção.
