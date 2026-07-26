CALCULADORA FCC + OCR.SPACE — VERSÃO CORRIGIDA
==============================================

CONFIGURAÇÃO RÁPIDA

1. Abra config.js.
2. Troque COLE_AQUI_SUA_CHAVE_OCR_SPACE pela sua chave gratuita.
3. Salve.
4. Envie TODOS os arquivos desta pasta para a raiz do GitHub Pages.
5. No celular, use "Fotografar cartão".

COMO FUNCIONA

- Continua existindo a digitação manual de Horário de Início e Duração.
- A interface não possui mais botão de upload/galeria; há somente a captura por câmera.
- A foto é compactada e enviada ao OCR.Space Engine 3.
- O código procura: Início, Duração da Prova, Término e Permanência mínima.
- O Término reconhecido agora é usado como validação cruzada.

EXEMPLO REAL DA CORREÇÃO

Texto OCR:
  Duração da Prova: 00h50
  Início: 09 : 12 h
  Término: 10 : 02 h

Resultado reconhecido:
  Início: 09:12
  Duração: 00:50
  Encerramento: 10:02

A versão anterior podia converter as letras de "Início" em números durante a
normalização e interpretar incorretamente o campo como 00:09. Isso foi corrigido.
Agora somente os caracteres do próprio token de horário são normalizados.

VALIDAÇÃO CRUZADA

Quando Duração e Término são reconhecidos, o site também calcula o início esperado:
  10:02 - 00:50 = 09:12

Se o horário de início reconhecido divergir desse valor, o site usa a conferência
Duração + Término para corrigir o início e mostra uma observação na tela.

IMPORTANTE

A chave OCR.Space fica em config.js porque este projeto é estático no GitHub Pages.
Não coloque outras senhas ou tokens corporativos nesse arquivo.
