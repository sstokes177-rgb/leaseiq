export type Language = 'en' | 'es'

export const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.settings': 'Settings',
    'nav.signOut': 'Sign out',
    'nav.back': 'Back',
    'nav.allLocations': 'All locations',

    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.welcomeBack': 'Welcome back',
    'dashboard.locations': 'locations in your portfolio',
    'dashboard.noLocations': 'Get started by adding your first location.',
    'dashboard.addLocation': 'Add Location',
    'dashboard.yourLocations': 'Your Locations',
    'dashboard.searchPlaceholder': 'Search locations by name, address, city...',
    'dashboard.noDocuments': 'No documents yet',
    'dashboard.documents': 'documents',

    // Location
    'location.uploadDocuments': 'Upload Documents',
    'location.uploadDescription': "Upload your lease, amendments, and addenda. We'll extract and index them for Q&A.",
    'location.askLease': 'Ask Your Lease',
    'location.askDescription': 'Ask anything in plain language. Get cited answers from your actual lease text.',
    'location.startChatting': 'Start chatting',
    'location.uploadFirst': 'Upload a lease first',
    'location.recentDocuments': 'Recent Documents',
    'location.criticalDates': 'Critical Dates',
    'location.actionNeeded': 'Action needed',
    'location.noDocumentsYet': 'No documents yet',
    'location.noDocsDescription': 'Upload your lease to unlock AI-powered analysis and Q&A.',
    'location.uploadYourLease': 'Upload your lease',

    // Chat
    'chat.askAnything': 'Ask anything about your lease',
    'chat.groundedIn': 'Answers are grounded in documents for',
    'chat.groundedGeneral': 'Questions are answered using the exact language from your uploaded documents.',
    'chat.exampleQuestions': 'Example questions',
    'chat.typeMessage': 'Type your message...',
    'chat.disclaimer': 'Provelo provides informational summaries only \u2014 not legal advice. Consult a licensed attorney for legal interpretation.',
    'chat.responseDisclaimer': 'Informational summary based on your uploaded documents \u2014 not legal advice. Consult an attorney for legal interpretation.',

    // Lease Summary
    'summary.title': 'Lease Summary',
    'summary.subtitle': 'Key terms extracted from your documents',
    'summary.aiExtracted': 'AI-extracted from your documents',
    'summary.generate': 'Generate lease summary',
    'summary.generating': 'Generating summary\u2026',
    'summary.regenerate': 'Regenerate',
    'summary.regenerating': 'Regenerating\u2026',
    'summary.tenant': 'Tenant',
    'summary.landlord': 'Landlord',
    'summary.leaseTerm': 'Lease Term',
    'summary.leaseType': 'Lease Type',
    'summary.sqft': 'Square Footage',
    'summary.financials': 'Financials',
    'summary.baseRent': 'Base Rent',
    'summary.securityDeposit': 'Security Deposit',
    'summary.rentEscalation': 'Rent Escalation',
    'summary.renewalOptions': 'Renewal Options',
    'summary.permittedUse': 'Permitted Use',
    'summary.verifyNote': 'AI-extracted summary \u2014 verify key terms against your actual lease documents.',

    // Obligation Matrix
    'obligations.title': 'Obligation Matrix',
    'obligations.subtitle': 'Who is responsible for what',
    'obligations.generate': 'Generate obligation matrix',
    'obligations.generating': 'Analyzing lease obligations\u2026',
    'obligations.yourResp': 'Your Responsibility',
    'obligations.landlordResp': "Landlord's Responsibility",
    'obligations.shared': 'Shared',
    'obligations.notAddressed': 'Not addressed in lease',

    // CAM
    'cam.title': 'CAM Charge Analysis',
    'cam.subtitle': 'Common area maintenance details',
    'cam.generate': 'Analyze CAM charges',
    'cam.generating': 'Analyzing CAM charges\u2026',
    'cam.objectionWindow': 'CAM Objection Window',
    'cam.proRataShare': 'Pro-rata Share',
    'cam.adminFee': 'Admin Fee',
    'cam.camCap': 'CAM Cap',
    'cam.auditWindow': 'Audit Window',
    'cam.escalationLimit': 'Escalation Limit',
    'cam.included': 'Included in CAM',
    'cam.excluded': 'Excluded from CAM',

    // Settings
    'settings.title': 'Settings',
    'settings.subtitle': 'Manage your account and preferences',
    'settings.profile': 'Profile',
    'settings.profileDesc': 'Your account information',
    'settings.companyName': 'Company / Name',
    'settings.email': 'Email',
    'settings.language': 'Language',
    'settings.languageDesc': 'Choose your preferred language',
    'settings.notifications': 'Notifications',
    'settings.notificationsDesc': 'Choose what alerts you receive',
    'settings.save': 'Save Changes',
    'settings.saving': 'Saving...',
    'settings.saved': 'Saved',

    // Lease Comparison
    'compare.title': 'Lease Comparison',
    'compare.subtitle': 'Side-by-side amendment analysis',
    'compare.emptyTitle': 'Compare your lease versions',
    'compare.emptyDesc': 'See what changed between your base lease and amendments, with impact analysis for each clause.',
    'compare.compareNow': 'Compare Versions',
    'compare.comparing': 'Comparing\u2026',
    'compare.export': 'Export Comparison',
    'compare.discuss': 'Discuss Changes with AI',

    // Common
    'common.loading': 'Loading\u2026',
    'common.pdfOrWord': 'PDF or Word',
    'common.aiPoweredQA': 'AI-powered Q&A',
    'common.days': 'days',
    'common.passed': 'Passed',
    'common.today': 'Today',
  },

  es: {
    // Navigation
    'nav.dashboard': 'Panel',
    'nav.settings': 'Configuraci\u00f3n',
    'nav.signOut': 'Cerrar sesi\u00f3n',
    'nav.back': 'Volver',
    'nav.allLocations': 'Todas las ubicaciones',

    // Dashboard
    'dashboard.title': 'Panel',
    'dashboard.welcomeBack': 'Bienvenido de nuevo',
    'dashboard.locations': 'ubicaciones en su portafolio',
    'dashboard.noLocations': 'Comience agregando su primera ubicaci\u00f3n.',
    'dashboard.addLocation': 'Agregar Ubicaci\u00f3n',
    'dashboard.yourLocations': 'Sus Ubicaciones',
    'dashboard.searchPlaceholder': 'Buscar ubicaciones por nombre, direcci\u00f3n, ciudad...',
    'dashboard.noDocuments': 'Sin documentos a\u00fan',
    'dashboard.documents': 'documentos',

    // Location
    'location.uploadDocuments': 'Subir Documentos',
    'location.uploadDescription': 'Suba su contrato de arrendamiento, enmiendas y anexos. Los extraeremos e indexaremos para preguntas y respuestas.',
    'location.askLease': 'Pregunte Sobre Su Contrato',
    'location.askDescription': 'Pregunte cualquier cosa en lenguaje simple. Obtenga respuestas citadas de su texto real del contrato.',
    'location.startChatting': 'Comenzar a chatear',
    'location.uploadFirst': 'Suba un contrato primero',
    'location.recentDocuments': 'Documentos Recientes',
    'location.criticalDates': 'Fechas Cr\u00edticas',
    'location.actionNeeded': 'Acci\u00f3n necesaria',
    'location.noDocumentsYet': 'Sin documentos a\u00fan',
    'location.noDocsDescription': 'Suba su contrato para activar el an\u00e1lisis con IA y preguntas y respuestas.',
    'location.uploadYourLease': 'Suba su contrato',

    // Chat
    'chat.askAnything': 'Pregunte cualquier cosa sobre su contrato',
    'chat.groundedIn': 'Las respuestas se basan en los documentos de',
    'chat.groundedGeneral': 'Las preguntas se responden usando el lenguaje exacto de sus documentos subidos.',
    'chat.exampleQuestions': 'Preguntas de ejemplo',
    'chat.typeMessage': 'Escriba su mensaje...',
    'chat.disclaimer': 'Provelo proporciona res\u00famenes informativos solamente \u2014 no es asesor\u00eda legal. Consulte a un abogado licenciado para interpretaci\u00f3n legal.',
    'chat.responseDisclaimer': 'Resumen informativo basado en sus documentos subidos \u2014 no es asesor\u00eda legal. Consulte a un abogado para interpretaci\u00f3n legal.',

    // Lease Summary
    'summary.title': 'Resumen del Contrato',
    'summary.subtitle': 'T\u00e9rminos clave extra\u00eddos de sus documentos',
    'summary.aiExtracted': 'Extra\u00eddo por IA de sus documentos',
    'summary.generate': 'Generar resumen del contrato',
    'summary.generating': 'Generando resumen\u2026',
    'summary.regenerate': 'Regenerar',
    'summary.regenerating': 'Regenerando\u2026',
    'summary.tenant': 'Arrendatario',
    'summary.landlord': 'Arrendador',
    'summary.leaseTerm': 'Plazo del Contrato',
    'summary.leaseType': 'Tipo de Contrato',
    'summary.sqft': 'Pies Cuadrados',
    'summary.financials': 'Finanzas',
    'summary.baseRent': 'Renta Base',
    'summary.securityDeposit': 'Dep\u00f3sito de Seguridad',
    'summary.rentEscalation': 'Escalamiento de Renta',
    'summary.renewalOptions': 'Opciones de Renovaci\u00f3n',
    'summary.permittedUse': 'Uso Permitido',
    'summary.verifyNote': 'Resumen extra\u00eddo por IA \u2014 verifique los t\u00e9rminos clave contra sus documentos reales.',

    // Obligation Matrix
    'obligations.title': 'Matriz de Obligaciones',
    'obligations.subtitle': 'Qui\u00e9n es responsable de qu\u00e9',
    'obligations.generate': 'Generar matriz de obligaciones',
    'obligations.generating': 'Analizando obligaciones del contrato\u2026',
    'obligations.yourResp': 'Su Responsabilidad',
    'obligations.landlordResp': 'Responsabilidad del Arrendador',
    'obligations.shared': 'Compartida',
    'obligations.notAddressed': 'No abordado en el contrato',

    // CAM
    'cam.title': 'An\u00e1lisis de Cargos CAM',
    'cam.subtitle': 'Detalles de mantenimiento de \u00e1reas comunes',
    'cam.generate': 'Analizar cargos CAM',
    'cam.generating': 'Analizando cargos CAM\u2026',
    'cam.objectionWindow': 'Ventana de Objeci\u00f3n CAM',
    'cam.proRataShare': 'Parte Proporcional',
    'cam.adminFee': 'Tarifa Administrativa',
    'cam.camCap': 'Tope CAM',
    'cam.auditWindow': 'Ventana de Auditor\u00eda',
    'cam.escalationLimit': 'L\u00edmite de Escalamiento',
    'cam.included': 'Incluido en CAM',
    'cam.excluded': 'Excluido de CAM',

    // Settings
    'settings.title': 'Configuraci\u00f3n',
    'settings.subtitle': 'Administre su cuenta y preferencias',
    'settings.profile': 'Perfil',
    'settings.profileDesc': 'Informaci\u00f3n de su cuenta',
    'settings.companyName': 'Empresa / Nombre',
    'settings.email': 'Correo electr\u00f3nico',
    'settings.language': 'Idioma',
    'settings.languageDesc': 'Elija su idioma preferido',
    'settings.notifications': 'Notificaciones',
    'settings.notificationsDesc': 'Elija qu\u00e9 alertas recibir',
    'settings.save': 'Guardar Cambios',
    'settings.saving': 'Guardando...',
    'settings.saved': 'Guardado',

    // Lease Comparison
    'compare.title': 'Comparaci\u00f3n de Contrato',
    'compare.subtitle': 'An\u00e1lisis de enmiendas lado a lado',
    'compare.emptyTitle': 'Compare sus versiones del contrato',
    'compare.emptyDesc': 'Vea qu\u00e9 cambi\u00f3 entre su contrato base y las enmiendas, con an\u00e1lisis de impacto para cada cl\u00e1usula.',
    'compare.compareNow': 'Comparar Versiones',
    'compare.comparing': 'Comparando\u2026',
    'compare.export': 'Exportar Comparaci\u00f3n',
    'compare.discuss': 'Discutir Cambios con IA',

    // Common
    'common.loading': 'Cargando\u2026',
    'common.pdfOrWord': 'PDF o Word',
    'common.aiPoweredQA': 'Preguntas y respuestas con IA',
    'common.days': 'd\u00edas',
    'common.passed': 'Pasado',
    'common.today': 'Hoy',
  },
}

export function t(key: string, lang: Language = 'en'): string {
  return translations[lang]?.[key] ?? translations.en[key] ?? key
}
