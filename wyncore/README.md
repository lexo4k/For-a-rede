# WYNCORE

Painel privado de proprietário único para organizar oportunidades, tarefas e recebimentos confirmados.

## Implementado
- Backend Node.js sem dependências de terceiros.
- Login de proprietário com senha configurada no ambiente, cookie HttpOnly, SameSite=Strict, expiração e limitação básica de tentativas.
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

Abra http://localhost:3000. Para executar testes: `npm test`.

## Publicar no Render
O arquivo `render.yaml` descreve o serviço web e um disco persistente. Ao criar o serviço, configure `WYNCORE_OWNER_PASSWORD` como variável secreta. `WYNCORE_SESSION_SECRET` é gerado pelo Render. O deploy ainda precisa ser autorizado na conta Render do proprietário.

## Limites reais
O sistema agora tem backend e armazenamento, mas não está conectado a contratantes, campanhas pagas, fontes automáticas de vagas ou processadores de pagamento. O cadastro é manual e o status financeiro é um registro operacional, não uma confirmação bancária. Não há promessa de renda. Integrações comerciais e contas financeiras exigem elegibilidade, revisão e autorização adequadas. Nunca coloque senhas, tokens bancários ou chaves privadas no Git.
