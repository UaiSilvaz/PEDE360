# Região de entrega

O cadastro exige estado e município, validados pelo código oficial do IBGE. Lojas existentes podem configurar a região em **Configurações → Minha loja**. O município define a área atendida; as zonas de frete continuam definindo as taxas. O cadastro cria uma zona “Toda a cidade”, com o frete informado pelo lojista.

## Fontes e cobertura

- Catálogo nacional: API de Localidades do IBGE, 27 UFs e 5.571 municípios na atualização de 8 de outubro de 2026. https://servicodados.ibge.gov.br/api/docs/localidades
- Endereços: CNEFE do Censo 2022, arquivos de 5.570 municípios. https://ftp.ibge.gov.br/Cadastro_Nacional_de_Enderecos_para_Fins_Estatisticos/Censo_Demografico_2022/Arquivos_CNEFE/CSV/Municipio/

O CNEFE registra localidades e logradouros encontrados pelo censo. Localidades podem incluir bairros e áreas rurais; essa base não garante todas as ruas atuais nem equivale a uma delimitação oficial de bairros. Boa Esperança do Norte, criada após o censo, consta no catálogo atual de cidades, mas não possui arquivo próprio nessa edição do CNEFE. “Outro” aparece primeiro em cidade, bairro e rua, com preenchimento manual; o servidor ainda exige que a cidade informada pertença à área atendida.

## Importação e manutenção

`node scripts/update-geography.mjs` atualiza o catálogo e o manifesto a partir das fontes oficiais. Revise e publique os arquivos JSON atualizados. A lista completa de endereços do país não é carregada no navegador: cadastro e alteração da região importam o arquivo municipal em segundo plano, com `after()` e limite de 300 segundos. O ZIP/CSV é processado em fluxo, guardando apenas nomes únicos de localidades e logradouros, sem números residenciais ou informações pessoais. O resultado fica no cache PostgreSQL `CityAddressDirectory`, compartilhado por município.

O cliente consulta até 100 opções por pesquisa e pode buscar parte do nome. Ruas são filtradas pelo bairro selecionado. Enquanto a base carrega ou quando está indisponível, o preenchimento manual continua funcionando. O lojista pode tentar a importação novamente em Configurações. Somente usuários autorizados podem iniciar a importação da cidade salva em sua loja, com limite de frequência.

## Verificação

`npm test` verifica o catálogo e o processamento ZIP/CSV. `node --import tsx --env-file=.env tests/delivery-geography.integration.ts` verifica o isolamento da cidade, as taxas e o endereço persistido. Com o servidor local rodando, `node --env-file=.env tests/geography.browser.mjs` verifica cadastro, configurações e dois pedidos em navegador móvel, por seleção e preenchimento manual.
