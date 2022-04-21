export default {
  "name": "Português (Brasil)",
  "identifier": "pt-BR",
  "translations": {
    /* Context menu items
        these are the items displayed in the menu when you right-click on a page
        */
    "addToDictionary": "Adicionar ao dicionário",
    "pictureInPicture": "Picture in picture",
    "openInNewTab": "Abrir em uma nova aba",
    "openInNewPrivateTab": "Abrir em uma nova aba privada",
    "saveLinkAs": "Salvar link como...",
    "viewImage": "Ver imagem",
    "openImageInNewTab": "Abrir imagem em uma nova aba",
    "openImageInNewPrivateTab": "Abrir imagem em uma nova aba privada",
    "saveImageAs": "Salvar imagem como",
    "searchWith": "Pesquisar no %s", //%s will be replaced with the name of the current search engine
    "copyLink": "Copiar link",
    "copyEmailAddress": "Copiar endereço de email",
    "selectAll": "Selecionar tudo",
    "undo": "Desfazer",
    "redo": "Refazer",
    "cut": "Recortar",
    "copy": "Copiar", //this is a verb (as in "copy the currently-selected text")
    "paste": "Colar",
    "goBack": "Voltar",
    "goForward": "Avançar",
    "inspectElement": "Inspecionar elemento",
    /* searchbar */
    "pasteAndGo": "Colar e ir", //context menu item
    "DDGAnswerSubtitle": "Resposta", //this is a noun - it is used as a subtitle when displaying Instant Answers from DuckDuckGo in the searchbar
    "suggestedSite": "Site sugerido", //this is used to label suggested websites from the DuckDuckGo API,
    "resultsFromDDG": "Resultados do DuckDuckGo", //this is used as a label to indicate which results come from DuckDuckGo's API
    "taskN": "Tarefa %n", //this is used as a way to identify which tab a task is in "task 1", "task 2", ...
    /* custom !bangs
        these are some of the items that show up when you press ! in the searchbar.
        Each one of these strings describes what the command will do when you run it. */
    "showMoreBangs": "Mostrar mais...",
    "viewSettings": "Ver configurações",
    "takeScreenshot": "Capturar tela",
    "clearHistory": "Limpar histórico",
    "enableBlocking": "Ativar bloqueio de conteúdo para este site",
    "disableBlocking": "Desativar bloqueio de conteúdo para este site",
    "clearHistoryConfirmation": "Limpar todo o histórico e dados de navegação?",
    "switchToTask": "Trocar para a tarefa",
    "createTask": "Criar tarefa",
    "closeTask": "Fechar tarefa",
    "moveToTask": "Mover esta aba para uma tarefa",
    "nameTask": "Nomear tarefa",
    "addBookmark": "Adicionar favorito",
    "searchBookmarks": "Buscar nos favoritos",
    "bookmarksAddTag": "Adicionar tag",
    "bookmarksSimilarItems": "Itens semelhantes",
    "searchHistory": "Buscar no histórico",
    "importBookmarks": "Importar favoritos do arquivo HTML",
    "exportBookmarks": "Exportar favoritos",
    "runUserscript": "Executar script do usuário",
    /* navbar */
    "openMenu": "Menu",
    "enterReaderView": "Modo leitura",
    "exitReaderView": "Sair do modo leitura",
    "newTabLabel": "Nova aba", //this is a noun, used for tabs that don't have a page loaded in them yet
    "connectionNotSecure": "Sua conexão com este site não é segura.",
    "searchbarPlaceholder": "Busque ou digite um endereço",
    "privateTab": "Aba privada",
    "newTabAction": "Nova aba", //this is a verb, used to label a button that adds a tab to the tabstrip when clicked
    /* task overlay */
    "viewTasks": "Ver tarefas",
    "newTask": "Nova Tarefa", //"new" is a verb - it is used for a button at the bottom of the task overlay
    "defaultTaskName": "Tarefa %n", //this is the name used for newly-created tasks; %n is replaced with a number ("task 1", "task 2", etc)
    "taskDeleteWarning": {
      "unsafeHTML": "Tarefa deletada! <a> desfazer?</a>"
    },
    "tasksSearchTabs": null, //missing translation
    "returnToTask": "Retornar a sua tarefa anterior",
    "taskDescriptionTwo": "%t e %t",
    "taskDescriptionThree": "%t e %t, mais %n",
    /* find in page toolbar */
    "searchInPage": "Buscar na página", //this is used as the placeholder text for the textbox in the find in page toolbar
    "findMatchesSingular": "Ocorrência %i de %t", //this and the next label are used to indicate which match is currently highlighted
    "findMatchesPlural": "Ocorrência %i de %t",
    /* Focus mode */
    "isFocusMode": "Você está no modo concentração.",
    "closeDialog": "OK", //used as a label for the button that closes the dialog
    "focusModeExplanation1": "No modo concentração, você não pode criar novas guias ou alternar tarefas.",
    "focusModeExplanation2": "Você pode sair do modo concentração desmarcando \"Modo concentração\" no menu - Visualizar .",
    /* relative dates */
    "timeRangeJustNow": "Agora mesmo",
    "timeRangeMinutes": "Há alguns minutos atrás",
    "timeRangeHour": "Na última hora",
    "timeRangeToday": "Hoje",
    "timeRangeYesterday": "Ontem",
    "timeRangeWeek": "Semana passada",
    "timeRangeMonth": "Mês passado",
    "timeRangeYear": "Ano passado",
    "timeRangeLongerAgo": "Há mais de um ano",
    /* pages/error/index.html */
    "crashErrorTitle": "Ocorreu algo de errado.",
    "crashErrorSubtitle": "Erro ao carregar esta página.",
    "errorPagePrimaryAction": "Tentar novamente",
    "serverNotFoundTitle": "Servidor não encontrado",
    "serverNotFoundSubtitle": "O min não conseguiu localizar este site",
    "archiveSearchAction": "Buscar em archive.org",
    "sslErrorTitle": "Site indisponível",
    "sslErrorMessage": "O min não conseguiu se conectar de uma maneira segura a este site.",
    "dnsErrorTitle": "Site não localizado",
    "dnsErrorMessage": "Ocorreu um erro de DNS.",
    "offlineErrorTitle": "Você está off-line",
    "offlineErrorMessage": "Reconecte-se à Internet e tente novamente.",
    "genericConnectionFail": "O min não conseguiu se conectar ao site.",
    "sslTimeErrorMessage": "O min não conseguiu se conectar de uma maneira segura a este site. Por favor, verifique se o relógio do computador está correto.",
    "addressInvalidTitle": "Endereço inválido.",
    "genericError": "Ocorreu um erro",
    /* pages/phishing/index.html */
    "phishingErrorTitle": "Este site é perigoso.",
    "phishingErrorMessage": "Este website pode estar tentando roubar suas informações pessoais, como senhas ou detalhes bancários.",
    "phishingErrorVisitAnyway": "Visitar site mesmo assim",
    "phishingErrorLeave": "Sair deste site",
    /* multiple instances alert */
    "multipleInstancesErrorMessage": "Um erro foi detectado, por favor, feche todas as instâncias abertas e reinicie o Min",
    /* pages/sessionRestoreError/index.html */
    "sessionRestoreErrorTitle": "Ocorreu um erro",
    "sessionRestoreErrorExplanation": "Suas abas salvas não puderam ser restauradas corretamente.",
    "sessionRestoreErrorBackupInfo": "Nós salvamos um backup dos seus dados em: %l.", //%l will be replaced with a path to a file
    "sessionRestoreErrorLinkInfo": {
      "unsafeHTML": "Se este erro continuar ocorrendo, por favor, abra um novo chamado <a href=\"https://github.com/minbrowser/min\" target=\"_blank\">aqui</a>."
    },
    /* pages/settings/index.html */
    "settingsPreferencesHeading": "Preferências",
    "settingsRestartRequired": "Você precisa reiniciar o navegador para aplicar estas mudanças.",
    "settingsPrivacyHeading": "Bloqueio de conteúdo",
    "settingsContentBlockingLevel0": "Permitir todos os anúncios e rastreadores",
    "settingsContentBlockingLevel1": "Bloquear anúncios e rastreadores de terceiros",
    "settingsContentBlockingLevel2": "Bloquear todos os anúncios e rastreadores",
    "settingsContentBlockingExceptions": "Permitir anúncios nos sites:",
    "settingsBlockScriptsToggle": "Bloquear scripts",
    "settingsBlockImagesToggle": "Bloquear imagens",
    "settingsBlockedRequestCount": {
      "unsafeHTML": "Até agora, o Min bloqueou <strong> </strong> anúncios e rastreadores."
    },
    "settingsCustomBangs": "Bangs personalizados",
    "settingsCustomBangsAdd": "Adicionar um bang personalizado",
    "settingsCustomBangsPhrase": "Comando (obrigatório)",
    "settingsCustomBangsSnippet": "Descrição (opcional)",
    "settingsCustomBangsRedirect": "URL de redirecionamento (obrigatório)",
    "settingsCustomizeFiltersLink": "Personalizar filtros",
    "settingsAppearanceHeading": "Aparência",
    "settingsEnableDarkMode": "Habilitar modo dark:",
    "settingsDarkModeNever": "Nunca",
    "settingsDarkModeNight": "À noite",
    "settingsDarkModeAlways": "Sempre",
    "settingsDarkModeSystem": null,
    "settingsSiteThemeToggle": "Habilitar mudanças de cores na barra de endereços",
    "settingsAdditionalFeaturesHeading": "Recursos adicionais",
    "settingsUserscriptsToggle": "Habilitar scripts do usuário",
    "settingsShowDividerToggle": "Mostrar divisória entre as guias",
    "settingsSeparateTitlebarToggle": "Usar a barra de título separada",
    "settingsAutoplayToggle": null, //missing translation 
    "settingsOpenTabsInForegroundToggle": "Abrir novas guias em primeiro plano",
    "settingsUserscriptsExplanation": {
      "unsafeHTML": "Scripts do usuário permitem modificar o comportamento do site - <a href=\"https://github.com/minbrowser/min/wiki/userscripts\">Saiba mais</a>."
    },
    "settingsUserAgentToggle": "Usar agente de usuário personalizado",
    "settingsUpdateNotificationsToggle": "Verificar atualizações automaticamente",
    "settingsUsageStatisticsToggle": {
      "unsafeHTML": "Enviar estatísticas de uso (<a href=\"https://github.com/minbrowser/min/blob/master/docs/statistics.md\">Mais informações</a>)"
    },
    "settingsSearchEngineHeading": "Serviço de busca",
    "settingsDefaultSearchEngine": "Escolha o serviço de busca padrão:",
    "settingsDDGExplanation": "Defina DuckDuckGo como o serviço padrão de buscas para ver respostas instantâneas na barra de busca.",
    "customSearchEngineDescription": "Substituir o serviço de pesquisa por %s",
    "settingsKeyboardShortcutsHeading": "Teclas de atalho",
    "settingsKeyboardShortcutsHelp": "Use vírgulas para separar vários atalhos.",
    "settingsProxyHeading": "Proxy",
    "settingsNoProxy": "Não usar Proxy",
    "settingsManualProxy": "Configuração Manual",
    "settingsAutomaticProxy": "Configuração Automática",
    "settingsProxyRules": "Regras de proxy:",
    "settingsProxyBypassRules": "Sem proxy para:",
    "settingsProxyConfigurationURL": "Configuração de URL",
    /* app menu */
    "appMenuFile": "Arquivo",
    "appMenuNewTab": "Nova aba",
    "appMenuDuplicateTab": "Duplicar aba atual",
    "appMenuNewPrivateTab": "Nova aba privada",
    "appMenuNewTask": "Nova tarefa",
    "appMenuSavePageAs": "Salvar página como",
    "appMenuPrint": "Imprimir",
    "appMenuEdit": "Editar",
    "appMenuUndo": "Desfazer",
    "appMenuRedo": "Refazer",
    "appMenuCut": "Recortar",
    "appMenuCopy": "Copiar",
    "appMenuPaste": "Colar",
    "appMenuSelectAll": "Selecionar tudo",
    "appMenuFind": "Buscar na página",
    "appMenuView": "Visualizar",
    "appMenuZoomIn": "Ampliar",
    "appMenuZoomOut": "Reduzir",
    "appMenuActualSize": "Tamanho original",
    "appMenuFullScreen": "Tela cheia", //on some platforms, this string is replaced with one built-in to the OS
    "appMenuFocusMode": "Modo concentração",
    "appMenuBookmarks": "Favoritos",
    "appMenuHistory": "Histórico",
    "appMenuDeveloper": "Desenvolvedor",
    "appMenuReloadBrowser": "Recarregar navegador",
    "appMenuInspectBrowser": "Inspecionar navegador",
    "appMenuInspectPage": "Inspecionar página",
    "appMenuWindow": "Janela",
    "appMenuMinimize": "Minimizar",
    "appMenuClose": "Fechar",
    "appMenuAlwaysOnTop": "Sempre no topo",
    "appMenuHelp": "Ajuda",
    "appMenuKeyboardShortcuts": "Teclas de atalho",
    "appMenuReportBug": "Informar um problema",
    "appMenuTakeTour": "Tour pelo Min",
    "appMenuViewGithub": "Ver no GitHub",
    "appMenuAbout": "Sobre o %n", //%n is replaced with app name
    "appMenuPreferences": "Preferências",
    "appMenuServices": "Serviços",
    "appMenuHide": "Esconder %n",
    "appMenuHideOthers": "Esconder o resto",
    "appMenuShowAll": "Mostrar tudo",
    "appMenuQuit": "Sair do %n",
    "appMenuBringToFront": "Trazer tudo para a frente",
    /* PDF Viewer */
    "PDFPageCounter": {
      "unsafeHTML": "página <input type='text'/> de <span id='total'></span>"
    },
    /* Context Reader */
    "buttonReaderSettings": "Configurações do modo leitura",
    "buttonReaderLightTheme": "Claro",
    "buttonReaderSepiaTheme": "Sepia ",
    "buttonReaderDarkTheme": "Escuro",
    "openReaderView": "Sempre abrir em modo leitura",
    "autoRedirectBannerReader": "Sempre abrir artigos deste site em modo leitura?",
    "buttonReaderRedirectYes": "Sim",
    "buttonReaderRedirectNo": "Não",
    "articleReaderView": "Artigo original",
    /* Download manager */
    "downloadCancel": "Cancelar",
    "downloadStateCompleted": "Concluído",
    "downloadStateFailed": "Falhou",
    /* Update Notifications */
    "updateNotificationTitle": "Uma nova versão do Min está disponível",
    /* Autofill settings */
    "settingsPasswordAutoFillHeadline": "Senhas",
    "settingsSelectPasswordManager": "Escolha um gerenciadoror de senhas suportado:",
    "keychainViewPasswords": "Ver senhas salvas",
    /* Password manager setup */
    "passwordManagerSetupHeading": "Conclua a configuração de %p para usar o preenchimento automático",
    "passwordManagerSetupStep1": {
      "unsafeHTML": "Primeiro, <a id='password-manager-setup-link'></a> e extraia-o para o seu sistema."
    },
    "passwordManagerInstallerSetup": {
      "unsafeHTML": "Baixe <a id='password-manager-setup-link-installer'></a> e arraste o arquivo para a caixa abaixo:"
    },
    "passwordManagerSetupLink": "Faça o download %p CLI tool",
    "passwordManagerSetupLinkInstaller": "o %p CLI installer",
    "passwordManagerSetupStep2": "Em seguida, arraste a ferramenta para a caixa abaixo:",
    "passwordManagerSetupDragBox": "Arraste a ferramenta aqui",
    "passwordManagerSetupInstalling": "Instalando ...",
    "passwordManagerBitwardenSignIn": null, //missing translation
    "passwordManagerSetupSignIn": "Entre no seu gerenciador de senhas para começar a usar o preenchimento automático. Suas credenciais não serão armazenadas em nenhum lugar do Min.",
    "disableAutofill": "Desativar preenchimento automático",
    "passwordManagerSetupUnlockError": "Falha ao desbloquear o armazenamento de senhas:",
    "passwordManagerSetupRetry": "Verifique se você está usando o arquivo certo e digitando a senha correta. Você pode tentar novamente arrastando a ferramenta aqui.",
    "passwordManagerUnlock": "Digite sua senha mestre %p para desbloquear o armazenamento de senhas:",
    /* Password save bar */
    "passwordCaptureSavePassword": "Salvar senha para %s?",
    "passwordCaptureSave": "Salvar",
    "passwordCaptureDontSave": "Não salvar",
    "passwordCaptureNeverSave": null, //missing translation
    /* Password viewer */
    "savedPasswordsHeading": "Senhas salvas",
    "savedPasswordsEmpty": "Nenhuma senha salva",
    "savedPasswordsNeverSavedLabel": null, //missing translation
    "deletePassword": "Excluir senha de %s?",
    /* Dialogs */
    "loginPromptTitle": "Fazer login em %h (%r)",
    "dialogConfirmButton": "Confirmar",
    "dialogSkipButton": "Cancelar",
    "username": "Nome de usuário",
    "email": "Email",
    "password": "Senha",
    "secretKey": "Chave secreta",
    "openExternalApp": null, //missing translation
    "clickToCopy": "Clique para copiar",
    "copied": "Copiado"
  }
}
