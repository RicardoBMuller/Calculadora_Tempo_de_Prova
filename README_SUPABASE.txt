FCC • CALCULADORA DE DURAÇÃO DE PROVAS
CONTADOR GLOBAL COM SUPABASE
======================================

ARQUIVOS PRINCIPAIS
- index.html
- styles.css
- app.js
- config.js
- logo-fcc.jpg
- supabase_setup.sql
- .nojekyll

COMO CONFIGURAR

1. Acesse o projeto "calculadora-fcc" no Supabase.

2. Abra SQL Editor > New query.

3. Abra o arquivo supabase_setup.sql deste pacote, copie TODO o conteúdo,
   cole no SQL Editor e execute em Run.

4. No Supabase, obtenha:
   - Project URL
   - Publishable key (começa normalmente por sb_publishable_...)

   A URL pode ser encontrada em Integrations > Data API ou no Connect.
   A chave pode ser encontrada em Settings > API Keys.

5. Abra config.js e substitua:

   SUPABASE_URL: "COLE_AQUI_A_PROJECT_URL"
   SUPABASE_PUBLISHABLE_KEY: "COLE_AQUI_A_PUBLISHABLE_KEY"

   Exemplo de formato:
   SUPABASE_URL: "https://abcdefghijk.supabase.co"
   SUPABASE_PUBLISHABLE_KEY: "sb_publishable_xxxxxxxxx"

6. IMPORTANTE:
   Use APENAS a Publishable key no site.
   NÃO use Secret key nem service_role no GitHub Pages.

7. Envie TODOS os arquivos desta pasta para a raiz do repositório GitHub Pages.

COMO O CONTADOR FUNCIONA
- Uma nova sessão/aba recebe um novo número de visitante.
- A intro mostra: "Você é o visitante nº X".
- O rodapé mostra o total de acessos registrados.
- Atualizar a página (F5) na mesma aba NÃO aumenta o contador.
- Fechar a aba e abrir uma nova sessão registra um novo acesso.
- Nenhum nome, e-mail, IP ou dado pessoal é salvo na tabela.

TESTE NO SUPABASE
Depois de executar o SQL, você pode testar no SQL Editor:

select public.get_site_visit_count();
select public.register_site_visit();
select public.get_site_visit_count();

OBSERVAÇÃO
O contador é público por natureza. A tabela não fica acessível diretamente,
mas a função de incremento precisa ser pública para o site conseguir registrar
visitas sem login. Para um contador interno de uso normal isso é suficiente;
proteção contra abuso deliberado exigiria uma camada de backend/rate limiting.
