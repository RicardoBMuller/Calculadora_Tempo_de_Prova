CALCULADORA FCC • OCR.SPACE • v10

Esta versão possui:
- entrada manual do Horário de Início;
- entrada manual da Duração da Prova;
- Permanência Mínima em destaque;
- captura de foto pela câmera do celular;
- leitura OCR.Space Engine 3;
- confirmação dos campos lidos antes do cálculo;
- cálculo baseado SOMENTE em Horário de Início + Duração;
- o campo Término do cartão é ignorado, mesmo se estiver preenchido incorretamente;
- cálculo do horário mínimo de liberação: Início + Permanência Mínima;
- resultado exibido também em modal moderno;
- histórico local e cópia do resumo;
- intro e identidade visual FCC mantidas.

CONFIGURAÇÃO

1. Abra config.js.
2. Em OCRSPACE_API_KEY, cole sua chave do OCR.Space.
3. Publique todos os arquivos na raiz do GitHub Pages.

Exemplo:

window.FCC_CONFIG = {
  OCRSPACE_API_KEY: "SUA_CHAVE_AQUI",
  OCRSPACE_ENDPOINT: "https://api.ocr.space/parse/image",
  OCRSPACE_ENGINE: "3"
};

LÓGICA DO CARTÃO

O OCR procura principalmente:
1. Duração da Prova
2. Início
3. Permanência mínima

O campo Término pode estar correto, incorreto ou vazio. Ele NÃO participa do cálculo.

Exemplo:
Início lido: 09:12
Duração: 00:50
Término escrito no cartão: 10:20 (incorreto)

Resultado do sistema:
09:12 + 00:50 = 10:02

Com Permanência mínima 00:30:
09:12 + 00:30 = 09:42

Ou seja:
Encerramento: 10:02
Liberação mínima: 09:42

SEGURANÇA

Como o site é estático no GitHub Pages, a chave gratuita do OCR.Space fica visível no config.js para quem inspecionar o código-fonte. Não coloque senhas, chaves privadas ou dados corporativos secretos nesse arquivo.
