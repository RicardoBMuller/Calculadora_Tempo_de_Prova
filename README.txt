CALCULADORA FCC + OCR.SPACE
==========================

CONFIGURAÇÃO RÁPIDA

1. Abra o arquivo config.js.
2. Troque:

   COLE_AQUI_SUA_CHAVE_OCR_SPACE

   pela chave gratuita que você criou no OCR.Space.

3. Salve o arquivo.
4. Envie TODOS os arquivos desta pasta para a raiz do seu repositório GitHub Pages.
5. Abra o site no celular e use "Fotografar cartão".

Exemplo:

window.FCC_CONFIG = {
  OCRSPACE_API_KEY: "SUA_CHAVE_REAL_AQUI",
  OCRSPACE_ENDPOINT: "https://api.ocr.space/parse/image",
  OCRSPACE_ENGINE: "3"
};

COMO FUNCIONA

- O site continua permitindo digitação manual.
- Ao fotografar o cartão, a imagem é reduzida/comprimida no navegador.
- A imagem é enviada diretamente para o OCR.Space Engine 3.
- O código procura os campos "Início", "Duração da Prova" e
  "Permanência mínima".
- Antes de calcular, o site mostra os valores encontrados para conferência.

IMPORTANTE

A versão gratuita do OCR.Space limita o arquivo de imagem a 1 MB.
Por isso o site compacta automaticamente a foto antes do envio.

Como a chamada é feita diretamente pelo navegador, a chave do OCR.Space
fica visível no código do GitHub Pages. Não coloque neste projeto senhas,
tokens corporativos ou qualquer outro segredo.
