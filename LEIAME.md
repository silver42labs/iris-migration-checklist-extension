# IRIS Migration Checklist
<!-- Copy of the file LEIAME.md in the root folder to publish on github pages -->
Implante uma API de exportação de migração em qualquer servidor InterSystems IRIS/Cache que exponha `/api/atelier`, capture o snapshot de configuração e compare com outro servidor em minutos. Esta extensão transforma um checklist manual e sujeito a erros em um relatório de diferenças repetível e confiável.

[![en](https://img.shields.io/badge/lang-en-red.svg)](https://github.com/silver42labs/iris-migration-checklist-extension/blob/main/README.md)
[![pt-br](https://img.shields.io/badge/lang-pt--br-green.svg)](https://github.com/silver42labs/iris-migration-checklist-extension/blob/main/LEIAME.md)

## Como usar

- Instale pela [Firefox Add-ons (AMO)](https://addons.mozilla.org/en-US/firefox/addon/iris-migration-checklist/) ou [Chrome Web Store](https://chromewebstore.google.com/detail/iris-migration-checklist/anamganabilobholichagldbejkpclag).
- Abra o Web Portal do IRIS/Cache (ou qualquer página) no servidor alvo.
- Clique no icone da extensão e escolha "Save Server Data" para capturar o baseline.
- Abra uma aba para outro servidor e escolha "Compare to Saved Server".
- Um relatório abre em uma nova aba com todas as diferenças por tipo de entidade.

## Como executar esta extensão localmente

### Firefox

1. Clone o repositório:

    ```bash
    git clone https://github.com/silver42labs/iris-migration-checklist-extension-firefox.git
    cd iris-migration-checklist-extension-firefox
    ```

2. **Firefox:** Abra `about:debugging#/runtime/this-firefox`, clique em "Load Temporary Add-on" e selecione o arquivo `manifest.json` desta pasta.

### Chrome

1. Clone o repositório:

    ```bash
    git clone https://github.com/silver42labs/iris-migration-checklist-extension-chrome.git
    cd iris-migration-checklist-extension-chrome
    ```

2. Abra `chrome://extensions`, ative o "Developer mode", clique em "Load unpacked" e selecione a pasta "package" deste projeto.

## Aspectos técnicos

### Como a extensão cria uma API dentro do IRIS

Se `/api/v1/migration/framework/export` não estiver disponível, a extensão usa a API REST do Atelier para fazer o bootstrap:

1. Um diálogo de consentimento pede sua confirmação antes de qualquer alteracao no servidor.
2. Faz upload de [Migration.Framework.cls](Migration.Framework.cls).
3. Compila a classe.
4. Executa um procedimento de setup que registra `/api/v1/migration/framework`.

Se o endpoint continuar indisponível, a interface fornece um link para a página de configuração da Web Application e pede para clicar em Save.

### Como o snapshot é armazenado

O snapshot salvo e o relatório de comparação ficam em `browser.storage.local` apenas para esta extensão. Nenhum dado é enviado para fora do servidor IRIS/Cache que você está acessando. Você pode limpar todos os dados armazenados a qualquer momento usando o botão "Clear Saved Data" no popup.

### Privacidade

Esta extensão inclui uma [política de privacidade](privacy.html) que cobre coleta, armazenamento, uso de dados e a declaração de uso limitado exigida pela Chrome Web Store e Firefox Add-ons. Nenhum dado é compartilhado com terceiros.

### Como um snapshot é comparado com o outro

O motor de comparação roteia cada seção para a estratégia adequada:

- Diferenças por entidade com base em ID para usuários, roles e web apps.
- Diferenças por multiconjunto para coleções sem ordem, como tabelas de lookup.

O relatório agrupa as diferenças por tipo de entidade e destaca itens ausentes, extras e alterados.

### Estrutura do projeto

- `popup.html` / `popup.js`: UI e fluxo da extensão.
- `api.js`: busca do export e helpers da API do Atelier.
- `bootstrap.js`: orquestração da instalação do backend.
- `compare.js`: motor de comparação.
- `strategies/`: estratégias de comparação (`entityCompare`, `flatCompare`).
- `report.html` / `report.js`: renderização do relatório.
- `privacy.html`: página de política de privacidade.
- `styles.css`: estilos compartilhados.

## Contribuir

Issues e pull requests são bem-vindos. Inclua passos de reprodução e dados de export de exemplo quando for relevante.
