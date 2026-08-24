/* Can I Buy This House? — jurisdiction + i18n data.
   Phase-2 seam: every rule value, label and line item lives HERE, in a jurisdiction
   record. No component hard-codes a rule string. Adding a US state = adding records.
   ⚠ VERIFY BEFORE SHIP. Figures below are best-knowledge as of 2026-08-12 and stand in
   for the dated, sourced rules table supplied separately. */
(function () {
  var L = ['en', 'fr', 'uk', 'es'];

  /* ---------- interface strings: key -> [en, fr, uk, es] ---------- */
  var t = {
    brand: ['Can I buy this house?', 'Puis-je acheter cette maison\u202f?', '\u0427\u0438 \u043c\u043e\u0436\u0443 \u044f \u043a\u0443\u043f\u0438\u0442\u0438 \u0446\u0435\u0439 \u0434\u0456\u043c?', '\u00bfPuedo comprar esta casa?'],
    homeLink: ['All tools', 'Tous les outils', '\u0423\u0441\u0456 \u0456\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u0438', 'Todas las herramientas'],
    deepDive: ['Deep dive 2 of 5', 'Analyse d\u00e9taill\u00e9e 2 de 5', '\u0414\u0435\u0442\u0430\u043b\u044c\u043d\u0438\u0439 \u0440\u043e\u0437\u0431\u0456\u0440 2/5', 'An\u00e1lisis detallado 2 de 5'],
    title: ['Closing costs', 'Frais de cl\u00f4ture', '\u0412\u0438\u0442\u0440\u0430\u0442\u0438 \u043d\u0430 \u0437\u0430\u043a\u0440\u0438\u0442\u0442\u044f \u0443\u0433\u043e\u0434\u0438', 'Gastos de cierre'],
    subtitle: ['What you owe on closing day, over and above the down payment.', 'Ce que vous devez le jour de la cl\u00f4ture, en plus de la mise de fonds.', '\u0429\u043e \u0432\u0438 \u0441\u043f\u043b\u0430\u0447\u0443\u0454\u0442\u0435 \u0432 \u0434\u0435\u043d\u044c \u0437\u0430\u043a\u0440\u0438\u0442\u0442\u044f \u2014 \u043f\u043e\u043d\u0430\u0434 \u043f\u0435\u0440\u0432\u0456\u0441\u043d\u0438\u0439 \u0432\u043d\u0435\u0441\u043e\u043a.', 'Lo que debe pagar el d\u00eda del cierre, adem\u00e1s del pago inicial.'],

    /* controls */
    price: ['Purchase price', 'Prix d\u2019achat', '\u0426\u0456\u043d\u0430 \u043a\u0443\u043f\u0456\u0432\u043b\u0456', 'Precio de compra'],
    downPayment: ['Down payment', 'Mise de fonds', '\u041f\u0435\u0440\u0432\u0456\u0441\u043d\u0438\u0439 \u0432\u043d\u0435\u0441\u043e\u043a', 'Pago inicial'],
    custom: ['Custom', 'Personnalis\u00e9', '\u0406\u043d\u0448\u0435', 'Personalizado'],
    propertyType: ['Property type', 'Type de propri\u00e9t\u00e9', '\u0422\u0438\u043f \u0436\u0438\u0442\u043b\u0430', 'Tipo de vivienda'],
    house: ['Resale house', 'Maison existante', '\u0411\u0443\u0434\u0438\u043d\u043e\u043a \u0437 \u043f\u0435\u0440\u0435\u043f\u0440\u043e\u0434\u0430\u0436\u0443', 'Casa de segunda mano'],
    condo: ['Resale condo', 'Condo existant', '\u041a\u0432\u0430\u0440\u0442\u0438\u0440\u0430 \u0437 \u043f\u0435\u0440\u0435\u043f\u0440\u043e\u0434\u0430\u0436\u0443', 'Condominio de segunda mano'],
    newbuild: ['New build', 'Construction neuve', '\u041d\u043e\u0432\u043e\u0431\u0443\u0434\u043e\u0432\u0430', 'Obra nueva'],
    ftb: ['First-time buyer', 'Acheteur d\u2019une premi\u00e8re habitation', '\u041f\u043e\u043a\u0443\u043f\u0435\u0446\u044c \u043f\u0435\u0440\u0448\u043e\u0433\u043e \u0436\u0438\u0442\u043b\u0430', 'Comprador de primera vivienda'],
    yes: ['Yes', 'Oui', '\u0422\u0430\u043a', 'S\u00ed'],
    no: ['No', 'Non', '\u041d\u0456', 'No'],
    noCmhcAbove: ['No CMHC insurance above this line', 'Aucune assurance SCHL au-dessus de cette ligne', '\u0412\u0438\u0449\u0435 \u0446\u0456\u0454\u0457 \u043c\u0435\u0436\u0456 \u0441\u0442\u0440\u0430\u0445\u0443\u0432\u0430\u043d\u043d\u044f CMHC \u043d\u0435 \u043f\u043e\u0442\u0440\u0456\u0431\u043d\u0435', 'Sin seguro CMHC por encima de esta l\u00ednea'],
    insuredNote: ['Below 20% your mortgage must be insured, and the premium is added to the loan.', 'Sous 20\u202f%, votre pr\u00eat doit \u00eatre assur\u00e9, et la prime est ajout\u00e9e au pr\u00eat.', '\u041d\u0438\u0436\u0447\u0435 20\u202f% \u0456\u043f\u043e\u0442\u0435\u043a\u0430 \u043f\u0456\u0434\u043b\u044f\u0433\u0430\u0454 \u0441\u0442\u0440\u0430\u0445\u0443\u0432\u0430\u043d\u043d\u044e, \u0430 \u043f\u0440\u0435\u043c\u0456\u044f \u0434\u043e\u0434\u0430\u0454\u0442\u044c\u0441\u044f \u0434\u043e \u043a\u0440\u0435\u0434\u0438\u0442\u0443.', 'Por debajo del 20\u202f% la hipoteca debe asegurarse, y la prima se suma al pr\u00e9stamo.'],
    uninsuredNote: ['At 20% or more no insurance premium applies, and no tax on it either.', '\u00c0 20\u202f% ou plus, aucune prime d\u2019assurance ne s\u2019applique, ni la taxe sur celle-ci.', '\u0417\u0430 20\u202f% \u0456 \u0431\u0456\u043b\u044c\u0448\u0435 \u043f\u0440\u0435\u043c\u0456\u044f \u043d\u0435 \u0441\u0442\u044f\u0433\u0443\u0454\u0442\u044c\u0441\u044f \u2014 \u0456 \u043f\u043e\u0434\u0430\u0442\u043a\u0443 \u043d\u0430 \u043d\u0435\u0457 \u0442\u0435\u0436 \u043d\u0435\u043c\u0430\u0454.', 'Con 20\u202f% o m\u00e1s no hay prima de seguro, ni impuesto sobre ella.'],

    /* cash summary */
    cashTotal: ['Cash needed on closing day', 'Comptant requis le jour de la cl\u00f4ture', '\u0413\u043e\u0442\u0456\u0432\u043a\u0430, \u043f\u043e\u0442\u0440\u0456\u0431\u043d\u0430 \u0432 \u0434\u0435\u043d\u044c \u0437\u0430\u043a\u0440\u0438\u0442\u0442\u044f', 'Efectivo necesario el d\u00eda del cierre'],
    closingCosts: ['Closing costs', 'Frais de cl\u00f4ture', '\u0412\u0438\u0442\u0440\u0430\u0442\u0438 \u043d\u0430 \u0437\u0430\u043a\u0440\u0438\u0442\u0442\u044f', 'Gastos de cierre'],
    ofPrice: ['of purchase price', 'du prix d\u2019achat', '\u0432\u0456\u0434 \u0446\u0456\u043d\u0438 \u043a\u0443\u043f\u0456\u0432\u043b\u0456', 'del precio de compra'],
    separateNote: ['Separate from the down payment, and due the same day.', 'Distincts de la mise de fonds, et exigibles le m\u00eame jour.', '\u041e\u043a\u0440\u0435\u043c\u043e \u0432\u0456\u0434 \u043f\u0435\u0440\u0432\u0456\u0441\u043d\u043e\u0433\u043e \u0432\u043d\u0435\u0441\u043a\u0443 \u2014 \u0456 \u0441\u043f\u043b\u0430\u0447\u0443\u044e\u0442\u044c\u0441\u044f \u0442\u043e\u0433\u043e \u0436 \u0434\u043d\u044f.', 'Aparte del pago inicial, y se pagan el mismo d\u00eda.'],
    cmhcPremium: ['CMHC insurance premium', 'Prime d\u2019assurance pr\u00eat hypoth\u00e9caire SCHL', '\u041f\u0440\u0435\u043c\u0456\u044f \u0441\u0442\u0440\u0430\u0445\u0443\u0432\u0430\u043d\u043d\u044f \u0456\u043f\u043e\u0442\u0435\u043a\u0438 CMHC', 'Prima del seguro hipotecario CMHC'],
    addedToLoan: ['added to the loan, not paid in cash', 'ajout\u00e9e au pr\u00eat, non pay\u00e9e comptant', '\u0434\u043e\u0434\u0430\u0454\u0442\u044c\u0441\u044f \u0434\u043e \u043a\u0440\u0435\u0434\u0438\u0442\u0443, \u043d\u0435 \u0441\u043f\u043b\u0430\u0447\u0443\u0454\u0442\u044c\u0441\u044f \u0433\u043e\u0442\u0456\u0432\u043a\u043e\u044e', 'se suma al pr\u00e9stamo, no se paga en efectivo'],
    mortgageAmount: ['Mortgage amount', 'Montant du pr\u00eat hypoth\u00e9caire', '\u0421\u0443\u043c\u0430 \u0456\u043f\u043e\u0442\u0435\u043a\u0438', 'Importe de la hipoteca'],

    /* table */
    lineItem: ['Line item', '\u00c9l\u00e9ment', '\u0421\u0442\u0430\u0442\u0442\u044f \u0432\u0438\u0442\u0440\u0430\u0442', 'Concepto'],
    amount: ['Amount', 'Montant', '\u0421\u0443\u043c\u0430', 'Importe'],
    grpGov: ['Taxes and government fees', 'Taxes et frais gouvernementaux', '\u041f\u043e\u0434\u0430\u0442\u043a\u0438 \u0442\u0430 \u0434\u0435\u0440\u0436\u0430\u0432\u043d\u0456 \u0437\u0431\u043e\u0440\u0438', 'Impuestos y tasas gubernamentales'],
    grpPro: ['Professional and third-party fees', 'Honoraires professionnels et frais de tiers', '\u041f\u0440\u043e\u0444\u0435\u0441\u0456\u0439\u043d\u0456 \u0442\u0430 \u0441\u0442\u043e\u0440\u043e\u043d\u043d\u0456 \u043f\u043e\u0441\u043b\u0443\u0433\u0438', 'Honorarios profesionales y de terceros'],
    grpAdj: ['Adjustments and moving in', 'Ajustements et d\u00e9m\u00e9nagement', '\u041a\u043e\u0440\u0435\u043a\u0442\u0438\u0432\u0438 \u0442\u0430 \u043f\u0435\u0440\u0435\u0457\u0437\u0434', 'Ajustes y mudanza'],
    editable: ['Every amount is editable \u2014 replace an estimate with your real quote.', 'Chaque montant est modifiable \u2014 remplacez une estimation par votre devis r\u00e9el.', '\u041a\u043e\u0436\u043d\u0443 \u0441\u0443\u043c\u0443 \u043c\u043e\u0436\u043d\u0430 \u0437\u043c\u0456\u043d\u0438\u0442\u0438 \u2014 \u0437\u0430\u043c\u0456\u043d\u0456\u0442\u044c \u043e\u0446\u0456\u043d\u043a\u0443 \u0441\u0432\u043e\u0457\u043c \u0440\u0435\u0430\u043b\u044c\u043d\u0438\u043c \u043a\u043e\u0448\u0442\u043e\u0440\u0438\u0441\u043e\u043c.', 'Cada importe es editable: sustituya una estimaci\u00f3n por su presupuesto real.'],
    estimate: ['estimate', 'estimation', '\u043e\u0446\u0456\u043d\u043a\u0430', 'estimaci\u00f3n'],
    exact: ['exact rule', 'r\u00e8gle exacte', '\u0442\u043e\u0447\u043d\u0435 \u043f\u0440\u0430\u0432\u0438\u043b\u043e', 'regla exacta'],
    yours: ['yours', 'le v\u00f4tre', '\u0432\u0430\u0448\u0435', 'suyo'],
    showBrackets: ['Bracket breakdown', 'D\u00e9tail par tranche', '\u0420\u043e\u0437\u0431\u0438\u0432\u043a\u0430 \u043f\u043e \u0448\u0430\u0431\u043b\u043e\u043d\u0430\u0445', 'Desglose por tramos'],
    hideBrackets: ['Hide breakdown', 'Masquer le d\u00e9tail', '\u0421\u0445\u043e\u0432\u0430\u0442\u0438 \u0440\u043e\u0437\u0431\u0438\u0432\u043a\u0443', 'Ocultar desglose'],
    onFirst: ['on the first', 'sur les premiers', '\u043d\u0430 \u043f\u0435\u0440\u0448\u0456', 'sobre los primeros'],
    onPortion: ['on the portion from', 'sur la tranche de', '\u043d\u0430 \u0447\u0430\u0441\u0442\u0438\u043d\u0443 \u0432\u0456\u0434', 'sobre la parte de'],
    to: ['to', '\u00e0', '\u0434\u043e', 'a'],
    subtotal: ['Subtotal', 'Sous-total', '\u041f\u0456\u0434\u0441\u0443\u043c\u043e\u043a', 'Subtotal'],
    cashOnly: ['Cash only \u2014 cannot be added to the mortgage', 'Comptant seulement \u2014 ne peut \u00eatre ajout\u00e9 au pr\u00eat', '\u0422\u0456\u043b\u044c\u043a\u0438 \u0433\u043e\u0442\u0456\u0432\u043a\u043e\u044e \u2014 \u043d\u0435 \u043c\u043e\u0436\u043d\u0430 \u0434\u043e\u0434\u0430\u0442\u0438 \u0434\u043e \u0456\u043f\u043e\u0442\u0435\u043a\u0438', 'Solo en efectivo: no puede sumarse a la hipoteca'],
    premiumTaxWhy: ['The premium itself is financed. The tax on it is not \u2014 your lawyer collects it on closing day.', 'La prime est financ\u00e9e. La taxe sur celle-ci ne l\u2019est pas \u2014 votre notaire ou avocat la per\u00e7oit le jour de la cl\u00f4ture.', '\u0421\u0430\u043c\u0430 \u043f\u0440\u0435\u043c\u0456\u044f \u0444\u0456\u043d\u0430\u043d\u0441\u0443\u0454\u0442\u044c\u0441\u044f. \u041f\u043e\u0434\u0430\u0442\u043e\u043a \u043d\u0430 \u043d\u0435\u0457 \u2014 \u043d\u0456: \u044e\u0440\u0438\u0441\u0442 \u0441\u0442\u044f\u0433\u0443\u0454 \u0439\u043e\u0433\u043e \u0432 \u0434\u0435\u043d\u044c \u0437\u0430\u043a\u0440\u0438\u0442\u0442\u044f.', 'La prima se financia. El impuesto sobre ella no: su abogado lo cobra el d\u00eda del cierre.'],

    /* credits */
    creditsTitle: ['Credits back', 'Cr\u00e9dits re\u00e7us', '\u041f\u043e\u0432\u0435\u0440\u043d\u0435\u043d\u043d\u044f \u0442\u0430 \u043a\u0440\u0435\u0434\u0438\u0442\u0438', 'Cr\u00e9ditos a su favor'],
    creditsSub: ['Some of this comes back. When it comes back matters as much as how much.', 'Une partie vous revient. Le moment o\u00f9 elle revient compte autant que le montant.', '\u0427\u0430\u0441\u0442\u0438\u043d\u0430 \u0446\u0438\u0445 \u0433\u0440\u043e\u0448\u0435\u0439 \u043f\u043e\u0432\u0435\u0440\u0442\u0430\u0454\u0442\u044c\u0441\u044f. \u041a\u043e\u043b\u0438 \u0441\u0430\u043c\u0435 \u2014 \u0432\u0430\u0436\u043b\u0438\u0432\u043e \u043d\u0435 \u043c\u0435\u043d\u0448\u0435, \u043d\u0456\u0436 \u0441\u043a\u0456\u043b\u044c\u043a\u0438.', 'Parte de esto vuelve. Cu\u00e1ndo vuelve importa tanto como cu\u00e1nto.'],
    grpAtClosing: ['Reduces your cash at closing', 'R\u00e9duit votre comptant \u00e0 la cl\u00f4ture', '\u0417\u043c\u0435\u043d\u0448\u0443\u0454 \u0433\u043e\u0442\u0456\u0432\u043a\u0443 \u043f\u0440\u0438 \u0437\u0430\u043a\u0440\u0438\u0442\u0442\u0456', 'Reduce su efectivo en el cierre'],
    grpAtClosingWhen: ['Applied on closing day', 'Appliqu\u00e9 le jour de la cl\u00f4ture', '\u0417\u0430\u0441\u0442\u043e\u0441\u043e\u0432\u0443\u0454\u0442\u044c\u0441\u044f \u0432 \u0434\u0435\u043d\u044c \u0437\u0430\u043a\u0440\u0438\u0442\u0442\u044f', 'Se aplica el d\u00eda del cierre'],
    grpLater: ['Arrives later, at tax time', 'Arrive plus tard, \u00e0 la p\u00e9riode des imp\u00f4ts', '\u041d\u0430\u0434\u0456\u0439\u0434\u0435 \u043f\u043e\u0437\u043d\u0456\u0448\u0435 \u2014 \u043f\u0456\u0434 \u0447\u0430\u0441 \u043f\u043e\u0434\u0430\u0442\u043a\u043e\u0432\u043e\u0457 \u0437\u0432\u0456\u0442\u043d\u043e\u0441\u0442\u0456', 'Llega despu\u00e9s, en la declaraci\u00f3n de impuestos'],
    grpLaterWhen: ['4 to 14 months after closing \u2014 do not budget it as closing-day money', '4 \u00e0 14 mois apr\u00e8s la cl\u00f4ture \u2014 ne le budg\u00e9tez pas comme argent du jour de la cl\u00f4ture', '\u0427\u0435\u0440\u0435\u0437 4\u201314 \u043c\u0456\u0441\u044f\u0446\u0456\u0432 \u043f\u043e \u0437\u0430\u043a\u0440\u0438\u0442\u0442\u0456 \u2014 \u043d\u0435 \u043f\u043b\u0430\u043d\u0443\u0439\u0442\u0435 \u0446\u0435 \u044f\u043a \u0433\u0440\u043e\u0448\u0456 \u043d\u0430 \u0434\u0435\u043d\u044c \u0437\u0430\u043a\u0440\u0438\u0442\u0442\u044f', 'De 4 a 14 meses tras el cierre: no lo presupueste como dinero del d\u00eda del cierre'],
    netCash: ['Net cash at closing, after credits applied that day', 'Comptant net \u00e0 la cl\u00f4ture, apr\u00e8s les cr\u00e9dits appliqu\u00e9s ce jour-l\u00e0', '\u0427\u0438\u0441\u0442\u0430 \u0433\u043e\u0442\u0456\u0432\u043a\u0430 \u043f\u0440\u0438 \u0437\u0430\u043a\u0440\u0438\u0442\u0442\u0456, \u043f\u0456\u0441\u043b\u044f \u043a\u0440\u0435\u0434\u0438\u0442\u0456\u0432 \u0442\u043e\u0433\u043e \u0434\u043d\u044f', 'Efectivo neto en el cierre, tras los cr\u00e9ditos de ese d\u00eda'],
    ftbOnly: ['Requires first-time buyer status', 'Exige le statut d\u2019acheteur d\u2019une premi\u00e8re habitation', '\u041f\u043e\u0442\u0440\u0456\u0431\u0435\u043d \u0441\u0442\u0430\u0442\u0443\u0441 \u043f\u043e\u043a\u0443\u043f\u0446\u044f \u043f\u0435\u0440\u0448\u043e\u0433\u043e \u0436\u0438\u0442\u043b\u0430', 'Requiere ser comprador de primera vivienda'],
    turnOnFtb: ['Turn on first-time buyer to see what this returns.', 'Activez \u00ab\u202facheteur d\u2019une premi\u00e8re habitation\u202f\u00bb pour voir ce que cela rapporte.', '\u0423\u0432\u0456\u043c\u043a\u043d\u0456\u0442\u044c \u00ab\u043f\u043e\u043a\u0443\u043f\u0435\u0446\u044c \u043f\u0435\u0440\u0448\u043e\u0433\u043e \u0436\u0438\u0442\u043b\u0430\u00bb, \u0449\u043e\u0431 \u043f\u043e\u0431\u0430\u0447\u0438\u0442\u0438 \u0441\u0443\u043c\u0443.', 'Active \u00abcomprador de primera vivienda\u00bb para ver lo que devuelve.'],

    /* rebate component states */
    rebApplied: ['Rebate applied', 'Remboursement appliqu\u00e9', '\u041f\u043e\u0432\u0435\u0440\u043d\u0435\u043d\u043d\u044f \u0437\u0430\u0441\u0442\u043e\u0441\u043e\u0432\u0430\u043d\u043e', 'Reembolso aplicado'],
    rebPartial: ['Rebate reduced', 'Remboursement r\u00e9duit', '\u041f\u043e\u0432\u0435\u0440\u043d\u0435\u043d\u043d\u044f \u0437\u043c\u0435\u043d\u0448\u0435\u043d\u043e', 'Reembolso reducido'],
    rebNone: ['No rebate exists here', 'Aucun remboursement ici', '\u0422\u0443\u0442 \u043f\u043e\u0432\u0435\u0440\u043d\u0435\u043d\u043d\u044f \u043d\u0435 \u0456\u0441\u043d\u0443\u0454', 'Aqu\u00ed no existe reembolso'],
    rebCapped: ['Capped at', 'Plafonn\u00e9 \u00e0', '\u041e\u0431\u043c\u0435\u0436\u0435\u043d\u043e \u0441\u0443\u043c\u043e\u044e', 'Limitado a'],
    rebPhaseWhy: ['Your price is above the threshold, so the rebate is reduced.', 'Votre prix d\u00e9passe le seuil, donc le remboursement est r\u00e9duit.', '\u0412\u0430\u0448\u0430 \u0446\u0456\u043d\u0430 \u0432\u0438\u0449\u0435 \u043f\u043e\u0440\u043e\u0433\u0443, \u0442\u043e\u043c\u0443 \u043f\u043e\u0432\u0435\u0440\u043d\u0435\u043d\u043d\u044f \u0437\u043c\u0435\u043d\u0448\u0435\u043d\u043e.', 'Su precio supera el umbral, por lo que el reembolso se reduce.'],

    /* location */
    changeLocation: ['Change location', 'Changer de lieu', '\u0417\u043c\u0456\u043d\u0438\u0442\u0438 \u043c\u0456\u0441\u0446\u0435', 'Cambiar ubicaci\u00f3n'],
    provinceTerritory: ['Province or territory', 'Province ou territoire', '\u041f\u0440\u043e\u0432\u0456\u043d\u0446\u0456\u044f \u0430\u0431\u043e \u0442\u0435\u0440\u0438\u0442\u043e\u0440\u0456\u044f', 'Provincia o territorio'],
    municipality: ['Municipality', 'Municipalit\u00e9', '\u041c\u0443\u043d\u0456\u0446\u0438\u043f\u0430\u043b\u0456\u0442\u0435\u0442', 'Municipio'],
    elsewhereIn: ['Somewhere else in', 'Ailleurs en', '\u0406\u043d\u0448\u0435 \u043c\u0456\u0441\u0446\u0435 \u0432', 'Otro lugar en'],
    locTagTpl: ['{city} rules', 'R\u00e8gles de {city}', '{city}: \u043f\u0440\u0430\u0432\u0438\u043b\u0430', 'Reglas de {city}'],
    sourcesForTpl: ['Filtered to {prov}', 'Filtr\u00e9 pour {prov}', '\u0424\u0456\u043b\u044c\u0442\u0440: {prov}', 'Filtrado para {prov}'],
    ruleTag: ['rules', 'r\u00e8gles', '\u043f\u0440\u0430\u0432\u0438\u043b\u0430', 'reglas'],
    noCityData: ['No verified city figures here yet. The rules below are exact for the province; local costs use provincial averages and are labelled as estimates.', 'Aucun chiffre municipal v\u00e9rifi\u00e9 ici pour l\u2019instant. Les r\u00e8gles ci-dessous sont exactes pour la province\u202f; les co\u00fbts locaux utilisent des moyennes provinciales et sont \u00e9tiquet\u00e9s comme estimations.', '\u041f\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043d\u0438\u0445 \u043c\u0456\u0441\u044c\u043a\u0438\u0445 \u0434\u0430\u043d\u0438\u0445 \u0449\u0435 \u043d\u0435\u043c\u0430\u0454. \u041f\u0440\u0430\u0432\u0438\u043b\u0430 \u043d\u0438\u0436\u0447\u0435 \u0442\u043e\u0447\u043d\u0456 \u0434\u043b\u044f \u043f\u0440\u043e\u0432\u0456\u043d\u0446\u0456\u0457; \u043c\u0456\u0441\u0446\u0435\u0432\u0456 \u0432\u0438\u0442\u0440\u0430\u0442\u0438 \u043f\u043e\u0434\u0430\u043d\u043e \u044f\u043a \u043f\u0440\u043e\u0432\u0456\u043d\u0446\u0456\u0439\u043d\u0456 \u0441\u0435\u0440\u0435\u0434\u043d\u0456 \u0437\u043d\u0430\u0447\u0435\u043d\u043d\u044f.', 'A\u00fan no hay cifras municipales verificadas. Las reglas siguientes son exactas para la provincia; los costes locales usan promedios provinciales y se marcan como estimaciones.'],

    /* compare */
    compare: ['Compare another city', 'Comparer une autre ville', '\u041f\u043e\u0440\u0456\u0432\u043d\u044f\u0442\u0438 \u0456\u043d\u0448\u0435 \u043c\u0456\u0441\u0442\u043e', 'Comparar otra ciudad'],
    stopCompare: ['Stop comparing', 'Arr\u00eater la comparaison', '\u0417\u0430\u043a\u0440\u0438\u0442\u0438 \u043f\u043e\u0440\u0456\u0432\u043d\u044f\u043d\u043d\u044f', 'Dejar de comparar'],
    difference: ['Difference', '\u00c9cart', '\u0420\u0456\u0437\u043d\u0438\u0446\u044f', 'Diferencia'],
    sameHouse: ['Same price, same down payment, same buyer \u2014 only the jurisdiction changes.', 'M\u00eame prix, m\u00eame mise de fonds, m\u00eame acheteur \u2014 seule la comp\u00e9tence change.', '\u0422\u0430 \u0441\u0430\u043c\u0430 \u0446\u0456\u043d\u0430, \u0442\u043e\u0439 \u0441\u0430\u043c\u0438\u0439 \u0432\u043d\u0435\u0441\u043e\u043a, \u0442\u043e\u0439 \u0441\u0430\u043c\u0438\u0439 \u043f\u043e\u043a\u0443\u043f\u0435\u0446\u044c \u2014 \u0437\u043c\u0456\u043d\u044e\u0454\u0442\u044c\u0441\u044f \u043b\u0438\u0448\u0435 \u044e\u0440\u0438\u0441\u0434\u0438\u043a\u0446\u0456\u044f.', 'Mismo precio, mismo pago inicial, mismo comprador: solo cambia la jurisdicci\u00f3n.'],

    /* sources */
    sourcesTitle: ['Sources and date stamp', 'Sources et date de v\u00e9rification', '\u0414\u0436\u0435\u0440\u0435\u043b\u0430 \u0442\u0430 \u0434\u0430\u0442\u0430 \u043f\u0435\u0440\u0435\u0432\u0456\u0440\u043a\u0438', 'Fuentes y fecha de verificaci\u00f3n'],
    sourcesFor: ['Filtered to', 'Filtr\u00e9 pour', '\u0412\u0456\u0434\u0444\u0456\u043b\u044c\u0442\u0440\u043e\u0432\u0430\u043d\u043e \u0434\u043b\u044f', 'Filtrado para'],
    verified: ['verified', 'v\u00e9rifi\u00e9', '\u043f\u0435\u0440\u0435\u0432\u0456\u0440\u0435\u043d\u043e', 'verificado'],
    lastVerified: ['Rules last verified', 'R\u00e8gles v\u00e9rifi\u00e9es le', '\u041f\u0440\u0430\u0432\u0438\u043b\u0430 \u043f\u0435\u0440\u0435\u0432\u0456\u0440\u0435\u043d\u043e', 'Reglas verificadas el'],
    unverifiedFlag: ['Placeholder values \u2014 verify before ship', 'Valeurs provisoires \u2014 \u00e0 v\u00e9rifier avant la mise en ligne', '\u0422\u0438\u043c\u0447\u0430\u0441\u043e\u0432\u0456 \u0437\u043d\u0430\u0447\u0435\u043d\u043d\u044f \u2014 \u043f\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435 \u043f\u0435\u0440\u0435\u0434 \u0432\u0438\u043f\u0443\u0441\u043a\u043e\u043c', 'Valores provisionales: verificar antes de publicar'],
    disclaimer: ['A planning tool, not financial, tax or legal advice. Rules change; verify every figure with your lender, your lawyer or notary, and the relevant government before you commit money.', 'Un outil de planification, et non un conseil financier, fiscal ou juridique. Les r\u00e8gles changent\u202f; v\u00e9rifiez chaque chiffre aupr\u00e8s de votre pr\u00eateur, de votre notaire ou avocat, et du gouvernement concern\u00e9 avant d\u2019engager des fonds.', '\u0426\u0435 \u0456\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442 \u043f\u043b\u0430\u043d\u0443\u0432\u0430\u043d\u043d\u044f, \u0430 \u043d\u0435 \u0444\u0456\u043d\u0430\u043d\u0441\u043e\u0432\u0430, \u043f\u043e\u0434\u0430\u0442\u043a\u043e\u0432\u0430 \u0430\u0431\u043e \u044e\u0440\u0438\u0434\u0438\u0447\u043d\u0430 \u043a\u043e\u043d\u0441\u0443\u043b\u044c\u0442\u0430\u0446\u0456\u044f. \u041f\u0440\u0430\u0432\u0438\u043b\u0430 \u0437\u043c\u0456\u043d\u044e\u044e\u0442\u044c\u0441\u044f: \u043f\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435 \u043a\u043e\u0436\u043d\u0443 \u0446\u0438\u0444\u0440\u0443 \u0443 \u0441\u0432\u043e\u0433\u043e \u043a\u0440\u0435\u0434\u0438\u0442\u043e\u0440\u0430, \u044e\u0440\u0438\u0441\u0442\u0430 \u0430\u0431\u043e \u043d\u043e\u0442\u0430\u0440\u0456\u0443\u0441\u0430 \u0442\u0430 \u0432\u0456\u0434\u043f\u043e\u0432\u0456\u0434\u043d\u043e\u0433\u043e \u0434\u0435\u0440\u0436\u0430\u0432\u043d\u043e\u0433\u043e \u043e\u0440\u0433\u0430\u043d\u0443, \u043f\u0435\u0440\u0448 \u043d\u0456\u0436 \u0432\u0438\u0442\u0440\u0430\u0447\u0430\u0442\u0438 \u0433\u0440\u043e\u0448\u0456.', 'Una herramienta de planificaci\u00f3n, no asesoramiento financiero, fiscal ni legal. Las reglas cambian: verifique cada cifra con su prestamista, su abogado o notario y el organismo p\u00fablico correspondiente antes de comprometer dinero.'],

    /* misc */
    theme: ['Theme', 'Th\u00e8me', '\u0422\u0435\u043c\u0430', 'Tema'],
    whatIsThis: ['What is this?', 'Qu\u2019est-ce que c\u2019est\u202f?', '\u0429\u043e \u0446\u0435?', '\u00bfQu\u00e9 es esto?'],
    print: ['Print or save as PDF', 'Imprimer ou enregistrer en PDF', '\u0414\u0440\u0443\u043a \u0430\u0431\u043e \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043d\u043d\u044f \u0432 PDF', 'Imprimir o guardar en PDF'],
    copyLink: ['Copy shareable link', 'Copier le lien partageable', '\u0421\u043a\u043e\u043f\u0456\u044e\u0432\u0430\u0442\u0438 \u043f\u043e\u0441\u0438\u043b\u0430\u043d\u043d\u044f', 'Copiar enlace para compartir'],
    adjust: ['Adjust your numbers', 'Ajuster vos chiffres', '\u0417\u043c\u0456\u043d\u0438\u0442\u0438 \u0441\u0432\u043e\u0457 \u0434\u0430\u043d\u0456', 'Ajustar sus cifras'],
    noServer: ['Nothing stored on a server', 'Rien n\u2019est stock\u00e9 sur un serveur', '\u041d\u0456\u0447\u043e\u0433\u043e \u043d\u0435 \u0437\u0431\u0435\u0440\u0456\u0433\u0430\u0454\u0442\u044c\u0441\u044f \u043d\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0456', 'Nada se almacena en un servidor'],
    downPaymentRow: ['Down payment', 'Mise de fonds', '\u041f\u0435\u0440\u0432\u0456\u0441\u043d\u0438\u0439 \u0432\u043d\u0435\u0441\u043e\u043a', 'Pago inicial'],

    /* line items */
    li_lttProv: ['Provincial land transfer tax', 'Droits de mutation immobili\u00e8re \u2014 provincial', '\u041f\u0440\u043e\u0432\u0456\u043d\u0446\u0456\u0439\u043d\u0438\u0439 \u043f\u043e\u0434\u0430\u0442\u043e\u043a \u043d\u0430 \u043f\u0435\u0440\u0435\u0434\u0430\u0447\u0443 \u043f\u0440\u0430\u0432\u0430 \u0432\u043b\u0430\u0441\u043d\u043e\u0441\u0442\u0456', 'Impuesto provincial de transmisi\u00f3n de propiedad'],
    li_lttMuni: ['Municipal land transfer tax', 'Droits de mutation immobili\u00e8re \u2014 municipal', '\u041c\u0443\u043d\u0456\u0446\u0438\u043f\u0430\u043b\u044c\u043d\u0438\u0439 \u043f\u043e\u0434\u0430\u0442\u043e\u043a \u043d\u0430 \u043f\u0435\u0440\u0435\u0434\u0430\u0447\u0443 \u043f\u0440\u0430\u0432\u0430 \u0432\u043b\u0430\u0441\u043d\u043e\u0441\u0442\u0456', 'Impuesto municipal de transmisi\u00f3n de propiedad'],
    li_ptt: ['Property transfer tax', 'Taxe sur le transfert de propri\u00e9t\u00e9', '\u041f\u043e\u0434\u0430\u0442\u043e\u043a \u043d\u0430 \u043f\u0435\u0440\u0435\u0434\u0430\u0447\u0443 \u043d\u0435\u0440\u0443\u0445\u043e\u043c\u043e\u0441\u0442\u0456', 'Impuesto de transferencia de propiedad'],
    li_deedMuni: ['Municipal deed transfer tax', 'Taxe municipale sur le transfert de titre', '\u041c\u0443\u043d\u0456\u0446\u0438\u043f\u0430\u043b\u044c\u043d\u0438\u0439 \u043f\u043e\u0434\u0430\u0442\u043e\u043a \u043d\u0430 \u043f\u0435\u0440\u0435\u0434\u0430\u0447\u0443 \u0430\u043a\u0442\u0430', 'Impuesto municipal sobre la escritura'],
    li_dutiesMuni: ['Transfer duties (welcome tax)', 'Droits de mutation immobili\u00e8re', '\u041c\u0443\u043d\u0456\u0446\u0438\u043f\u0430\u043b\u044c\u043d\u0435 \u043c\u0438\u0442\u043e \u043d\u0430 \u043f\u0435\u0440\u0435\u0434\u0430\u0447\u0443', 'Derechos de mutaci\u00f3n (impuesto de bienvenida)'],
    li_titleReg: ['Land title transfer registration fee', 'Frais d\u2019enregistrement du transfert de titre', '\u0417\u0431\u0456\u0440 \u0437\u0430 \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u044e \u043f\u0435\u0440\u0435\u0434\u0430\u0447\u0456 \u0442\u0438\u0442\u0443\u043b\u0443', 'Tasa de registro de transferencia de t\u00edtulo'],
    li_mortReg: ['Mortgage registration fee', 'Frais d\u2019enregistrement de l\u2019hypoth\u00e8que', '\u0417\u0431\u0456\u0440 \u0437\u0430 \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u044e \u0456\u043f\u043e\u0442\u0435\u043a\u0438', 'Tasa de registro de la hipoteca'],
    li_premTax: ['Provincial tax on the CMHC premium', 'Taxe provinciale sur la prime SCHL', '\u041f\u0440\u043e\u0432\u0456\u043d\u0446\u0456\u0439\u043d\u0438\u0439 \u043f\u043e\u0434\u0430\u0442\u043e\u043a \u043d\u0430 \u043f\u0440\u0435\u043c\u0456\u044e CMHC', 'Impuesto provincial sobre la prima CMHC'],
    li_lawyer: ['Real estate lawyer fees and disbursements', 'Honoraires et d\u00e9bours\u00e9s de l\u2019avocat', '\u0413\u043e\u043d\u043e\u0440\u0430\u0440 \u044e\u0440\u0438\u0441\u0442\u0430 \u0442\u0430 \u0432\u0438\u0442\u0440\u0430\u0442\u0438', 'Honorarios y desembolsos del abogado'],
    li_notary: ['Notary fees and disbursements', 'Honoraires et d\u00e9bours\u00e9s du notaire', '\u0413\u043e\u043d\u043e\u0440\u0430\u0440 \u043d\u043e\u0442\u0430\u0440\u0456\u0443\u0441\u0430 \u0442\u0430 \u0432\u0438\u0442\u0440\u0430\u0442\u0438', 'Honorarios y desembolsos del notario'],
    li_lawyerOrNotary: ['Lawyer or notary public fees', 'Honoraires de l\u2019avocat ou du notaire public', '\u0413\u043e\u043d\u043e\u0440\u0430\u0440 \u044e\u0440\u0438\u0441\u0442\u0430 \u0430\u0431\u043e \u043f\u0443\u0431\u043b\u0456\u0447\u043d\u043e\u0433\u043e \u043d\u043e\u0442\u0430\u0440\u0456\u0443\u0441\u0430', 'Honorarios del abogado o notario p\u00fablico'],
    li_titleIns: ['Title insurance', 'Assurance titres', '\u0421\u0442\u0440\u0430\u0445\u0443\u0432\u0430\u043d\u043d\u044f \u0442\u0438\u0442\u0443\u043b\u0443', 'Seguro de t\u00edtulo'],
    li_locCert: ['Updated certificate of location', 'Certificat de localisation \u00e0 jour', '\u041e\u043d\u043e\u0432\u043b\u0435\u043d\u0438\u0439 \u0441\u0435\u0440\u0442\u0438\u0444\u0456\u043a\u0430\u0442 \u0440\u043e\u0437\u0442\u0430\u0448\u0443\u0432\u0430\u043d\u043d\u044f', 'Certificado de localizaci\u00f3n actualizado'],
    li_inspect: ['Home inspection', 'Inspection de la propri\u00e9t\u00e9', '\u0422\u0435\u0445\u043d\u0456\u0447\u043d\u0430 \u0456\u043d\u0441\u043f\u0435\u043a\u0446\u0456\u044f \u0436\u0438\u0442\u043b\u0430', 'Inspecci\u00f3n de la vivienda'],
    li_appraisal: ['Appraisal', '\u00c9valuation', '\u041e\u0446\u0456\u043d\u043a\u0430 \u043c\u0430\u0439\u043d\u0430', 'Tasaci\u00f3n'],
    li_statusCert: ['Condo status certificate review', 'Examen du certificat de statut du condo', '\u041f\u0435\u0440\u0435\u0432\u0456\u0440\u043a\u0430 \u0441\u0435\u0440\u0442\u0438\u0444\u0456\u043a\u0430\u0442\u0430 \u0441\u0442\u0430\u043d\u0443 \u043a\u043e\u043d\u0434\u043e', 'Revisi\u00f3n del certificado del condominio'],
    li_taxAdj: ['Property tax adjustment to the seller', 'Ajustement de taxes fonci\u00e8res au vendeur', '\u041a\u043e\u0440\u0435\u043a\u0442\u0438\u0432 \u043f\u043e\u0434\u0430\u0442\u043a\u0443 \u043d\u0430 \u043c\u0430\u0439\u043d\u043e \u043f\u0440\u043e\u0434\u0430\u0432\u0446\u044e', 'Ajuste del impuesto predial al vendedor'],
    li_moving: ['Moving', 'D\u00e9m\u00e9nagement', '\u041f\u0435\u0440\u0435\u0457\u0437\u0434', 'Mudanza'],
    li_setup: ['Utility setup and move-in reserve', 'Branchement des services et r\u00e9serve d\u2019installation', '\u041f\u0456\u0434\u043a\u043b\u044e\u0447\u0435\u043d\u043d\u044f \u043a\u043e\u043c\u0443\u043d\u0430\u043b\u044c\u043d\u0438\u0445 \u0441\u043b\u0443\u0436\u0431 \u0456 \u0440\u0435\u0437\u0435\u0440\u0432 \u043d\u0430 \u0432\u0441\u0435\u043b\u0435\u043d\u043d\u044f', 'Alta de servicios y reserva de instalaci\u00f3n'],

    cashCheck: ['Do you have the cash?', 'Avez-vous les liquidit\u00e9s\u202f?', '\u0427\u0438 \u0454 \u0443 \u0432\u0430\u0441 \u0446\u0456 \u043a\u043e\u0448\u0442\u0438?', '\u00bfTiene el efectivo?'],
    cashCheckSub: ['Measured against net cash at closing \u2014 after the credits that actually arrive that day.', 'Mesur\u00e9 par rapport au comptant net \u00e0 la cl\u00f4ture \u2014 apr\u00e8s les cr\u00e9dits qui arrivent vraiment ce jour-l\u00e0.', '\u041f\u043e\u0440\u0456\u0432\u043d\u044f\u043d\u043e \u0437 \u0447\u0438\u0441\u0442\u043e\u044e \u0433\u043e\u0442\u0456\u0432\u043a\u043e\u044e \u043f\u0440\u0438 \u0437\u0430\u043a\u0440\u0438\u0442\u0442\u0456 \u2014 \u043f\u0456\u0441\u043b\u044f \u043a\u0440\u0435\u0434\u0438\u0442\u0456\u0432, \u0449\u043e \u0441\u043f\u0440\u0430\u0432\u0434\u0456 \u043d\u0430\u0434\u0445\u043e\u0434\u044f\u0442\u044c \u0442\u043e\u0433\u043e \u0434\u043d\u044f.', 'Comparado con el efectivo neto en el cierre, tras los cr\u00e9ditos que llegan ese mismo d\u00eda.'],
    available: ['Funds available for this purchase', 'Fonds disponibles pour cet achat', '\u041a\u043e\u0448\u0442\u0438, \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0456 \u0434\u043b\u044f \u0446\u0456\u0454\u0457 \u043a\u0443\u043f\u0456\u0432\u043b\u0456', 'Fondos disponibles para esta compra'],
    dpTitle: ['Down payment sources', 'Sources de la mise de fonds', '\u0414\u0436\u0435\u0440\u0435\u043b\u0430 \u043f\u0435\u0440\u0432\u0456\u0441\u043d\u043e\u0433\u043e \u0432\u043d\u0435\u0441\u043a\u0443', 'Fuentes del pago inicial'],
    dpSub: ['Where the money comes from, in the order that costs you least.', 'D\u2019o\u00f9 vient l\u2019argent, dans l\u2019ordre qui vous co\u00fbte le moins.', '\u0417\u0432\u0456\u0434\u043a\u0438 \u0431\u0435\u0440\u0443\u0442\u044c\u0441\u044f \u0433\u0440\u043e\u0448\u0456 \u2014 \u0443 \u043f\u043e\u0440\u044f\u0434\u043a\u0443, \u044f\u043a\u0438\u0439 \u043a\u043e\u0448\u0442\u0443\u0454 \u0432\u0430\u043c \u043d\u0430\u0439\u043c\u0435\u043d\u0448\u0435.', 'De d\u00f3nde sale el dinero, en el orden que menos le cuesta.'],
    dpWaterfall: ['The funding order', 'L\u2019ordre de financement', '\u041f\u043e\u0440\u044f\u0434\u043e\u043a \u0432\u0438\u043a\u043e\u0440\u0438\u0441\u0442\u0430\u043d\u043d\u044f', 'El orden de financiaci\u00f3n'],
    dpWaterfallWhy: ['Drawn in this order because each source costs more than the one above it. Nothing below is touched until everything above is used.', 'Utilis\u00e9es dans cet ordre parce que chaque source co\u00fbte plus que celle du dessus. Rien en dessous n\u2019est touch\u00e9 avant que tout au-dessus soit \u00e9puis\u00e9.', '\u0423 \u0446\u044c\u043e\u043c\u0443 \u043f\u043e\u0440\u044f\u0434\u043a\u0443, \u0431\u043e \u043a\u043e\u0436\u043d\u0435 \u0434\u0436\u0435\u0440\u0435\u043b\u043e \u043a\u043e\u0448\u0442\u0443\u0454 \u0431\u0456\u043b\u044c\u0448\u0435 \u0437\u0430 \u043f\u043e\u043f\u0435\u0440\u0435\u0434\u043d\u0454. \u041d\u0438\u0436\u0447\u0435 \u043d\u0456\u0447\u043e\u0433\u043e \u043d\u0435 \u0442\u043e\u0440\u043a\u0430\u0454\u043c\u043e\u0441\u044f, \u043f\u043e\u043a\u0438 \u043d\u0435 \u0432\u0438\u0447\u0435\u0440\u043f\u0430\u043d\u043e \u0432\u0441\u0435 \u0432\u0438\u0449\u0435.', 'En este orden porque cada fuente cuesta m\u00e1s que la anterior. Nada de abajo se toca hasta agotar todo lo de arriba.'],
    dpAssembled: ['Assembled from your accounts', 'R\u00e9uni depuis vos comptes', '\u0417\u0456\u0431\u0440\u0430\u043d\u043e \u0437 \u0432\u0430\u0448\u0438\u0445 \u0440\u0430\u0445\u0443\u043d\u043a\u0456\u0432', 'Reunido de sus cuentas'],
    dpDrawn: ['Drawn', 'Utilis\u00e9', '\u0412\u0437\u044f\u0442\u043e', 'Usado'],
    dpTaxCost: ['Tax cost', 'Co\u00fbt fiscal', '\u041f\u043e\u0434\u0430\u0442\u043a\u043e\u0432\u0430 \u0446\u0456\u043d\u0430', 'Coste fiscal'],
    dpLeft: ['Left in the account', 'Reste au compte', '\u0417\u0430\u043b\u0438\u0448\u043e\u043a \u043d\u0430 \u0440\u0430\u0445\u0443\u043d\u043a\u0443', 'Queda en la cuenta'],
    dpUntouched: ['Not needed', 'Non requis', '\u041d\u0435 \u043f\u043e\u0442\u0440\u0456\u0431\u043d\u043e', 'No necesario'],
    dpExhausted: ['Fully used', '\u00c9puis\u00e9', '\u0412\u0438\u0447\u0435\u0440\u043f\u0430\u043d\u043e', 'Agotado'],
    dpFree: ['Free', 'Gratuit', '\u0411\u0435\u0437 \u0432\u0438\u0442\u0440\u0430\u0442', 'Sin coste'],
    dpStrings: ['Free, with strings', 'Gratuit, avec conditions', '\u0411\u0435\u0437 \u043f\u043e\u0434\u0430\u0442\u043a\u0443, \u0430\u043b\u0435 \u0437 \u0443\u043c\u043e\u0432\u0430\u043c\u0438', 'Sin coste, con condiciones'],
    dpCosts: ['Costs tax', 'Co\u00fbte de l\u2019imp\u00f4t', '\u041a\u043e\u0448\u0442\u0443\u0454 \u043f\u043e\u0434\u0430\u0442\u043a\u0443', 'Cuesta impuestos'],
    dpRepayAnnual: ['Repayment: {a} a year for 15 years', 'Remboursement\u202f: {a} par an pendant 15 ans', '\u041f\u043e\u0432\u0435\u0440\u043d\u0435\u043d\u043d\u044f: {a} \u0449\u043e\u0440\u043e\u043a\u0443 \u043f\u0440\u043e\u0442\u044f\u0433\u043e\u043c 15 \u0440\u043e\u043a\u0456\u0432', 'Reembolso: {a} al a\u00f1o durante 15 a\u00f1os'],
    dpRoomLost: ['Contribution room comes back next calendar year, not sooner', 'Le droit de cotisation revient l\u2019an prochain, pas avant', '\u041b\u0456\u043c\u0456\u0442 \u0432\u0456\u0434\u043d\u043e\u0432\u0438\u0442\u044c\u0441\u044f \u043b\u0438\u0448\u0435 \u043d\u0430\u0441\u0442\u0443\u043f\u043d\u043e\u0433\u043e \u043a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u043d\u043e\u0433\u043e \u0440\u043e\u043a\u0443', 'El l\u00edmite vuelve el pr\u00f3ximo a\u00f1o natural, no antes'],
    dpGainRealised: ['Realises {g} of capital gain, half of it taxable at {r}', 'R\u00e9alise {g} de gain en capital, dont la moiti\u00e9 imposable \u00e0 {r}', '\u0424\u0456\u043a\u0441\u0443\u0454 {g} \u043f\u0440\u0438\u0440\u043e\u0441\u0442\u0443 \u043a\u0430\u043f\u0456\u0442\u0430\u043b\u0443, \u043f\u043e\u043b\u043e\u0432\u0438\u043d\u0430 \u043e\u043f\u043e\u0434\u0430\u0442\u043a\u043e\u0432\u0443\u0454\u0442\u044c\u0441\u044f \u0437\u0430 {r}', 'Realiza {g} de plusval\u00eda, la mitad tributable al {r}'],
    dpMarginal: ['Your marginal rate', 'Votre taux marginal', '\u0412\u0430\u0448\u0430 \u0433\u0440\u0430\u043d\u0438\u0447\u043d\u0430 \u0441\u0442\u0430\u0432\u043a\u0430', 'Su tasa marginal'],
    dpGlide: ['The savings glide path', 'La trajectoire d\u2019\u00e9pargne', '\u0413\u0440\u0430\u0444\u0456\u043a \u043d\u0430\u043a\u043e\u043f\u0438\u0447\u0435\u043d\u043d\u044f', 'La trayectoria de ahorro'],
    dpGlideSub: ['At your current savings rate, when the shortfall closes.', '\u00c0 votre rythme d\u2019\u00e9pargne actuel, quand le manque sera combl\u00e9.', '\u0417\u0430 \u043d\u0430\u044f\u0432\u043d\u043e\u0433\u043e \u0442\u0435\u043c\u043f\u0443 \u0437\u0430\u043e\u0449\u0430\u0434\u0436\u0435\u043d\u044c \u2014 \u043a\u043e\u043b\u0438 \u0431\u0440\u0430\u043a \u0431\u0443\u0434\u0435 \u043f\u043e\u043a\u0440\u0438\u0442\u043e.', 'A su ritmo de ahorro actual, cu\u00e1ndo se cierra el d\u00e9ficit.'],
    dpReached: ['Target reached in month {m}', 'Objectif atteint au mois {m}', '\u0426\u0456\u043b\u044c \u0434\u043e\u0441\u044f\u0433\u043d\u0443\u0442\u043e \u043d\u0430 {m}-\u043c\u0443 \u043c\u0456\u0441\u044f\u0446\u0456', 'Objetivo alcanzado en el mes {m}'],
    dpNever: ['Not reached within 36 months at this savings rate.', 'Non atteint en 36 mois \u00e0 ce rythme d\u2019\u00e9pargne.', '\u041d\u0435 \u0434\u043e\u0441\u044f\u0433\u043d\u0443\u0442\u043e \u0437\u0430 36 \u043c\u0456\u0441\u044f\u0446\u0456\u0432 \u0437\u0430 \u0442\u0430\u043a\u043e\u0433\u043e \u0442\u0435\u043c\u043f\u0443.', 'No alcanzado en 36 meses a este ritmo de ahorro.'],
    dpAlready: ['You already have enough. No waiting required.', 'Vous avez d\u00e9j\u00e0 assez. Aucune attente n\u00e9cessaire.', '\u0412\u0430\u043c \u0443\u0436\u0435 \u0434\u043e\u0441\u0442\u0430\u0442\u043d\u044c\u043e. \u0427\u0435\u043a\u0430\u0442\u0438 \u043d\u0435 \u043f\u043e\u0442\u0440\u0456\u0431\u043d\u043e.', 'Ya tiene suficiente. No hace falta esperar.'],
    dpBalances: ['What you have saved', 'Ce que vous avez \u00e9pargn\u00e9', '\u0429\u043e \u0432\u0438 \u043d\u0430\u043a\u043e\u043f\u0438\u043b\u0438', 'Lo que tiene ahorrado'],
    dpUnrealised: ['of which unrealised gain', 'dont gain non r\u00e9alis\u00e9', '\u0437 \u043d\u0438\u0445 \u043d\u0435\u0440\u0435\u0430\u043b\u0456\u0437\u043e\u0432\u0430\u043d\u0438\u0439 \u043f\u0440\u0438\u0440\u0456\u0441\u0442', 'de los cuales plusval\u00eda no realizada'],
    dpIncome: ['Taxable income', 'Revenu imposable', '\u041e\u043f\u043e\u0434\u0430\u0442\u043a\u043e\u0432\u0443\u0432\u0430\u043d\u0438\u0439 \u0434\u043e\u0445\u0456\u0434', 'Ingreso gravable'],
    dpGlideNote: ['Assumes {r} on savings and no change to your target.', 'Suppose {r} sur l\u2019\u00e9pargne et aucun changement \u00e0 votre objectif.', '\u041f\u0435\u0440\u0435\u0434\u0431\u0430\u0447\u0430\u0454 {r} \u043d\u0430 \u0437\u0430\u043e\u0449\u0430\u0434\u0436\u0435\u043d\u043d\u044f \u0442\u0430 \u043d\u0435\u0437\u043c\u0456\u043d\u043d\u0443 \u0446\u0456\u043b\u044c.', 'Supone {r} sobre el ahorro y ning\u00fan cambio en su objetivo.'],
    dpCheapest: ['Cheapest money first', 'L\u2019argent le moins cher d\u2019abord', '\u041d\u0430\u0439\u0434\u0435\u0448\u0435\u0432\u0448\u0456 \u0433\u0440\u043e\u0448\u0456 \u043f\u0435\u0440\u0448\u0438\u043c\u0438', 'El dinero m\u00e1s barato primero'],
    accFhsa: ['FHSA', 'CELIAPP', 'FHSA', 'FHSA'],
    accFhsaGloss: ['First Home Savings Account \u2014 deductible going in, tax-free coming out for a first home. The only account that is both.', 'Compte d\u2019\u00e9pargne libre d\u2019imp\u00f4t pour l\u2019achat d\u2019une premi\u00e8re propri\u00e9t\u00e9 \u2014 d\u00e9ductible \u00e0 l\u2019entr\u00e9e, non imposable \u00e0 la sortie. Le seul compte qui fait les deux.', '\u0420\u0430\u0445\u0443\u043d\u043e\u043a \u0437\u0430\u043e\u0449\u0430\u0434\u0436\u0435\u043d\u044c \u043d\u0430 \u043f\u0435\u0440\u0448\u0435 \u0436\u0438\u0442\u043b\u043e \u2014 \u0432\u043d\u0435\u0441\u043a\u0438 \u0437\u043c\u0435\u043d\u0448\u0443\u044e\u0442\u044c \u043f\u043e\u0434\u0430\u0442\u043e\u043a, \u0430 \u0437\u043d\u044f\u0442\u0442\u044f \u043d\u0435 \u043e\u043f\u043e\u0434\u0430\u0442\u043a\u043e\u0432\u0443\u0454\u0442\u044c\u0441\u044f. \u0404\u0434\u0438\u043d\u0438\u0439 \u0442\u0430\u043a\u0438\u0439 \u0440\u0430\u0445\u0443\u043d\u043e\u043a.', 'Cuenta de ahorro para la primera vivienda: deducible al entrar y libre de impuestos al salir. La \u00fanica cuenta que hace ambas cosas.'],
    accCash: ['Cash and savings', 'Comptant et \u00e9pargne', '\u0413\u043e\u0442\u0456\u0432\u043a\u0430 \u0442\u0430 \u0437\u0430\u043e\u0449\u0430\u0434\u0436\u0435\u043d\u043d\u044f', 'Efectivo y ahorros'],
    accCashGloss: ['Already taxed. Nothing further to pay to use it.', 'D\u00e9j\u00e0 impos\u00e9. Rien de plus \u00e0 payer pour l\u2019utiliser.', '\u0412\u0436\u0435 \u043e\u043f\u043e\u0434\u0430\u0442\u043a\u043e\u0432\u0430\u043d\u043e. \u0414\u043e\u0434\u0430\u0442\u043a\u043e\u0432\u043e \u043f\u043b\u0430\u0442\u0438\u0442\u0438 \u043d\u0435 \u0442\u0440\u0435\u0431\u0430.', 'Ya tributado. Nada m\u00e1s que pagar por usarlo.'],
    accHbp: ['RRSP through the Home Buyers\u2019 Plan', 'REER par le R\u00e9gime d\u2019accession \u00e0 la propri\u00e9t\u00e9', 'RRSP \u0447\u0435\u0440\u0435\u0437 \u043f\u043b\u0430\u043d \u043f\u043e\u043a\u0443\u043f\u0446\u0456\u0432 \u0436\u0438\u0442\u043b\u0430 (HBP)', 'RRSP mediante el Plan de Compradores de Vivienda'],
    accHbpGloss: ['No tax on withdrawal, but you must repay it over 15 years. Miss a payment and that part is added to your income.', 'Aucun imp\u00f4t au retrait, mais vous devez rembourser sur 15 ans. Un versement manqu\u00e9 est ajout\u00e9 \u00e0 votre revenu.', '\u0417\u043d\u044f\u0442\u0442\u044f \u043d\u0435 \u043e\u043f\u043e\u0434\u0430\u0442\u043a\u043e\u0432\u0443\u0454\u0442\u044c\u0441\u044f, \u0430\u043b\u0435 \u0433\u0440\u043e\u0448\u0456 \u0442\u0440\u0435\u0431\u0430 \u043f\u043e\u0432\u0435\u0440\u043d\u0443\u0442\u0438 \u0437\u0430 15 \u0440\u043e\u043a\u0456\u0432. \u041f\u0440\u043e\u043f\u0443\u0449\u0435\u043d\u0438\u0439 \u043f\u043b\u0430\u0442\u0456\u0436 \u0434\u043e\u0434\u0430\u0454\u0442\u044c\u0441\u044f \u0434\u043e \u0434\u043e\u0445\u043e\u0434\u0443.', 'Sin impuesto al retirar, pero debe devolverlo en 15 a\u00f1os. Si falla un pago, esa parte se suma a su ingreso.'],
    accTfsa: ['TFSA', 'CELI', 'TFSA', 'TFSA'],
    accTfsaGloss: ['No tax to withdraw. The contribution room comes back, but not until the next calendar year.', 'Aucun imp\u00f4t au retrait. Le droit de cotisation revient, mais seulement l\u2019ann\u00e9e civile suivante.', '\u0417\u043d\u044f\u0442\u0442\u044f \u0431\u0435\u0437 \u043f\u043e\u0434\u0430\u0442\u043a\u0443. \u041b\u0456\u043c\u0456\u0442 \u0432\u0456\u0434\u043d\u043e\u0432\u0438\u0442\u044c\u0441\u044f, \u0430\u043b\u0435 \u043b\u0438\u0448\u0435 \u043d\u0430\u0441\u0442\u0443\u043f\u043d\u043e\u0433\u043e \u043a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u043d\u043e\u0433\u043e \u0440\u043e\u043a\u0443.', 'Sin impuesto al retirar. El l\u00edmite vuelve, pero no hasta el pr\u00f3ximo a\u00f1o natural.'],
    accGift: ['Gift', 'Don', '\u041f\u043e\u0434\u0430\u0440\u0443\u043d\u043e\u043a', 'Regalo'],
    accGiftGloss: ['Not taxable in Canada. Your lender will want a signed letter saying it is a gift, not a loan.', 'Non imposable au Canada. Votre pr\u00eateur exigera une lettre sign\u00e9e attestant qu\u2019il s\u2019agit d\u2019un don, non d\u2019un pr\u00eat.', '\u0412 \u041a\u0430\u043d\u0430\u0434\u0456 \u043d\u0435 \u043e\u043f\u043e\u0434\u0430\u0442\u043a\u043e\u0432\u0443\u0454\u0442\u044c\u0441\u044f. \u041a\u0440\u0435\u0434\u0438\u0442\u043e\u0440 \u0437\u0430\u0436\u0430\u0434\u0430\u0454 \u043f\u0456\u0434\u043f\u0438\u0441\u0430\u043d\u043e\u0433\u043e \u043b\u0438\u0441\u0442\u0430, \u0449\u043e \u0446\u0435 \u043f\u043e\u0434\u0430\u0440\u0443\u043d\u043e\u043a, \u0430 \u043d\u0435 \u043f\u043e\u0437\u0438\u043a\u0430.', 'No tributa en Canad\u00e1. Su prestamista pedir\u00e1 una carta firmada que diga que es un regalo, no un pr\u00e9stamo.'],
    accNonreg: ['Non-registered investments', 'Placements non enregistr\u00e9s', '\u041d\u0435\u0437\u0430\u0440\u0435\u0454\u0441\u0442\u0440\u043e\u0432\u0430\u043d\u0456 \u0456\u043d\u0432\u0435\u0441\u0442\u0438\u0446\u0456\u0457', 'Inversiones no registradas'],
    hbpTitle: ['The RRSP \u2192 Home Buyers\u2019 Plan play', 'Le jeu REER \u2192 R\u00e9gime d\u2019accession \u00e0 la propri\u00e9t\u00e9', '\u0421\u0442\u0440\u0430\u0442\u0435\u0433\u0456\u044f RRSP \u2192 \u043f\u043b\u0430\u043d \u043f\u043e\u043a\u0443\u043f\u0446\u0456\u0432 \u0436\u0438\u0442\u043b\u0430', 'La jugada RRSP \u2192 Plan de Compradores de Vivienda'],
    hbpSub: ['Contribute, deduct, wait, withdraw, repay \u2014 in that order, and the order matters.', 'Cotiser, d\u00e9duire, attendre, retirer, remboursement \u2014 dans cet ordre, et l\u2019ordre compte.', '\u0412\u043d\u0435\u0441\u0442\u0438, \u0432\u0456\u0434\u0440\u0430\u0445\u0443\u0432\u0430\u0442\u0438, \u0437\u0430\u0447\u0435\u043a\u0430\u0442\u0438, \u0432\u0438\u0432\u0435\u0441\u0442\u0438, \u043f\u043e\u0432\u0435\u0440\u043d\u0443\u0442\u0438 \u2014 \u0441\u0430\u043c\u0435 \u0432 \u0446\u044c\u043e\u043c\u0443 \u043f\u043e\u0440\u044f\u0434\u043a\u0443, \u0456 \u0432\u0456\u043d \u043c\u0430\u0454 \u0437\u043d\u0430\u0447\u0435\u043d\u043d\u044f.', 'Aportar, deducir, esperar, retirar, devolver \u2014 en ese orden, y el orden importa.'],
    hbpStep1: ['1. Contribute', '1. Cotiser', '1. \u0412\u043d\u0435\u0441\u0442\u0438', '1. Aportar'],
    hbpStep1Body: ['Put money into an RRSP. Any RRSP room you have works \u2014 this does not need to be a special account.', 'Versez de l\u2019argent dans un REER. Tout droit de cotisation REER fonctionne \u2014 nul besoin d\u2019un compte sp\u00e9cial.', '\u0412\u043a\u043b\u0430\u0434\u0456\u0442\u044c \u043a\u043e\u0448\u0442\u0438 \u043d\u0430 RRSP. \u041f\u0440\u0430\u0446\u044e\u0454 \u0431\u0443\u0434\u044c-\u044f\u043a\u0438\u0439 \u043b\u0456\u043c\u0456\u0442 RRSP \u2014 \u043e\u043a\u0440\u0435\u043c\u0438\u0439 \u0440\u0430\u0445\u0443\u043d\u043e\u043a \u043d\u0435 \u043f\u043e\u0442\u0440\u0456\u0431\u043d\u0438\u0439.', 'Aporte dinero a un RRSP. Sirve cualquier espacio RRSP disponible \u2014 no necesita una cuenta especial.'],
    hbpStep2: ['2. Deduct', '2. D\u00e9duire', '2. \u0412\u0456\u0434\u0440\u0430\u0445\u0443\u0432\u0430\u0442\u0438', '2. Deducir'],
    hbpStep2Body: ['Claim the contribution as a deduction on your tax return. This is where the refund comes from.', 'R\u00e9clamez la cotisation en d\u00e9duction sur votre d\u00e9claration. C\u2019est d\u2019ici que vient le remboursement.', '\u0412\u043a\u0430\u0436\u0456\u0442\u044c \u0432\u043d\u0435\u0441\u043e\u043a \u044f\u043a \u0432\u0456\u0434\u0440\u0430\u0445\u0443\u0432\u0430\u043d\u043d\u044f \u0432 \u0434\u0435\u043a\u043b\u0430\u0440\u0430\u0446\u0456\u0457. \u0421\u0430\u043c\u0435 \u0437\u0432\u0456\u0434\u0441\u0438 \u0432\u0438\u043d\u0438\u043a\u0430\u0454 \u0432\u0456\u0434\u0448\u043a\u043e\u0434\u0443\u0432\u0430\u043d\u043d\u044f.', 'Reclame la aportaci\u00f3n como deducci\u00f3n en su declaraci\u00f3n. De ah\u00ed sale el reembolso.'],
    hbpStep3: ['3. Wait 90 days', '3. Attendre 90 jours', '3. \u0417\u0430\u0447\u0435\u043a\u0430\u0442\u0438 90 \u0434\u043d\u0456\u0432', '3. Esperar 90 d\u00edas'],
    hbpStep3Body: ['The contribution must sit in the RRSP for at least 90 days before you withdraw it under the HBP. Withdraw sooner and that portion is not deductible.', 'La cotisation doit rester dans le REER au moins 90 jours avant le retrait au titre du RAP. Un retrait plus t\u00f4t rend cette partie non d\u00e9ductible.', '\u0417\u043d\u0435\u0441\u043e\u043a \u043c\u0430\u0454 \u043f\u0440\u043e\u043b\u0435\u0436\u0430\u0442\u0438 \u0432 RRSP \u043d\u0435 \u043c\u0435\u043d\u0448\u0435 90 \u0434\u043d\u0456\u0432, \u043f\u0435\u0440\u0435\u0434 \u0432\u0438\u043b\u0443\u0447\u0435\u043d\u043d\u044f\u043c \u0437\u0430 HBP. \u0417\u043d\u044f\u0442\u0438 \u0440\u0430\u043d\u0456\u0448\u0435 \u2014 \u0446\u044f \u0447\u0430\u0441\u0442\u0438\u043d\u0430 \u043d\u0435 \u0431\u0443\u0434\u0435 \u0432\u0456\u0434\u0440\u0430\u0445\u043e\u0432\u0430\u043d\u0430.', 'La aportaci\u00f3n debe permanecer en el RRSP al menos 90 d\u00edas antes de retirarla bajo el HBP. Si retira antes, esa parte no es deducible.'],
    hbpStep3Warn: ['This rule is absolute. There is no exception and no appeal \u2014 miss it and the withdrawal becomes fully taxable income.', 'Cette r\u00e8gle est absolue. Aucune exception, aucun appel \u2014 la manquer rend le retrait enti\u00e8rement imposable.', '\u0426\u0435 \u043f\u0440\u0430\u0432\u0438\u043b\u043e \u0430\u0431\u0441\u043e\u043b\u044e\u0442\u043d\u0435. \u0412\u0438\u043d\u044f\u0442\u043a\u0443 \u043d\u0456, \u043e\u0441\u043a\u0430\u0440\u0436\u0435\u043d\u043d\u044f \u043d\u0435\u043c\u0430\u0454 \u2014 \u043f\u043e\u0440\u0443\u0448\u0438\u0442\u0435, \u0456 \u0432\u0438\u043b\u0443\u0447\u0435\u043d\u043d\u044f \u043f\u043e\u0432\u043d\u0456\u0441\u0442\u044e \u043e\u043f\u043e\u0434\u0430\u0442\u043a\u043e\u0432\u0443\u0454\u0442\u044c\u0441\u044f.', 'Esta regla es absoluta. No hay excepci\u00f3n ni apelaci\u00f3n \u2014 inc\u00famplala y el retiro se vuelve ingreso totalmente gravable.'],
    hbpStep4: ['4. Withdraw', '4. Retirer', '4. \u0412\u0438\u0432\u0435\u0441\u0442\u0438', '4. Retirar'],
    hbpStep4Body: ['Withdraw up to {cap} tax-free under the Home Buyers\u2019 Plan, using Form T1036.', 'Retirez jusqu\u2019\u00e0 {cap} sans imp\u00f4t dans le cadre du RAP, avec le formulaire T1036.', '\u0412\u0438\u0432\u0435\u0434\u0456\u0442\u044c \u0434\u043e {cap} \u0431\u0435\u0437 \u043f\u043e\u0434\u0430\u0442\u043a\u0443 \u0437\u0430 \u043f\u043b\u0430\u043d\u043e\u043c \u043f\u043e\u043a\u0443\u043f\u0446\u0456\u0432 \u0436\u0438\u0442\u043b\u0430, \u0432\u0438\u043a\u043e\u0440\u0438\u0441\u0442\u0430\u0432\u0448\u0438 \u0444\u043e\u0440\u043c\u0443 T1036.', 'Retire hasta {cap} libre de impuestos bajo el Plan de Compradores de Vivienda, con el formulario T1036.'],
    hbpStep5: ['5. Repay', '5. Rembourser', '5. \u041f\u043e\u0432\u0435\u0440\u043d\u0443\u0442\u0438', '5. Devolver'],
    hbpStep5Body: ['Starting the second year after the withdrawal, repay one fifteenth of it each year for 15 years. Skip a payment and that amount is added to your income for the year.', '\u00c0 partir de la deuxi\u00e8me ann\u00e9e suivant le retrait, remboursez un quinzi\u00e8me chaque ann\u00e9e pendant 15 ans. Un versement manqu\u00e9 s\u2019ajoute \u00e0 votre revenu de l\u2019ann\u00e9e.', '\u0417 \u0434\u0440\u0443\u0433\u043e\u0433\u043e \u0440\u043e\u043a\u0443 \u043f\u0456\u0441\u043b\u044f \u0432\u0438\u043b\u0443\u0447\u0435\u043d\u043d\u044f \u043f\u043e\u0432\u0435\u0440\u0442\u0430\u0439\u0442\u0435 \u043e\u0434\u043d\u0443 \u043f\u2019\u044f\u0442\u043d\u0430\u0434\u0446\u044f\u0442\u0443 \u0447\u0430\u0441\u0442\u0438\u043d\u0443 \u0449\u043e\u0440\u043e\u043a\u0443 \u0432\u043f\u0440\u043e\u0434\u043e\u0432\u0436 15 \u0440\u043e\u043a\u0456\u0432. \u041f\u0440\u043e\u043f\u0443\u0441\u0442\u0438\u0442\u0435 \u0432\u043d\u0435\u0441\u043e\u043a \u2014 \u0446\u044f \u0441\u0443\u043c\u0430 \u0434\u043e\u0434\u0430\u0454\u0442\u044c\u0441\u044f \u0434\u043e \u0432\u0430\u0448\u043e\u0433\u043e \u0434\u043e\u0445\u043e\u0434\u0443 \u0437\u0430 \u0440\u0456\u043a.', 'A partir del segundo a\u00f1o tras el retiro, devuelva un quinceavo cada a\u00f1o durante 15 a\u00f1os. Si omite un pago, ese importe se suma a su ingreso del a\u00f1o.'],
    hbpContribution: ['Your RRSP contribution', 'Votre cotisation REER', '\u0412\u0430\u0448 \u0432\u043d\u0435\u0441\u043e\u043a \u0434\u043e RRSP', 'Su aportaci\u00f3n al RRSP'],
    hbpRefund: ['Refund at your marginal rate', 'Remboursement \u00e0 votre taux marginal', '\u041f\u043e\u0432\u0435\u0440\u043d\u0435\u043d\u043d\u044f \u0437\u0430 \u0432\u0430\u0448\u043e\u044e \u0433\u0440\u0430\u043d\u0438\u0447\u043d\u043e\u044e \u0441\u0442\u0430\u0432\u043a\u043e\u044e', 'Reembolso a su tasa marginal'],
    hbpWithdraw: ['Amount withdrawn tax-free', 'Montant retir\u00e9 sans imp\u00f4t', '\u0421\u0443\u043c\u0430, \u0432\u0438\u0432\u0435\u0434\u0435\u043d\u0430 \u0431\u0435\u0437 \u043f\u043e\u0434\u0430\u0442\u043a\u0443', 'Importe retirado libre de impuestos'],
    hbpRepaySchedule: ['Repayment schedule', '\u00c9ch\u00e9ancier de remboursement', '\u0421\u0445\u0435\u043c\u0430 \u043f\u043e\u0432\u0435\u0440\u043d\u0435\u043d\u043d\u044f', 'Cronograma de devoluci\u00f3n'],
    hbpRepayPerYear: ['per year for 15 years', 'par an pendant 15 ans', '\u0449\u043e\u0440\u043e\u043a\u0443 \u0432\u043f\u0440\u043e\u0434\u043e\u0432\u0436 15 \u0440\u043e\u043a\u0456\u0432', 'al a\u00f1o durante 15 a\u00f1os'],
    hbpVerdictWorth: ['Worth it', '\u00c7a vaut le coup', '\u0412\u0430\u0440\u0442\u043e', 'Vale la pena'],
    hbpVerdictNot: ['Not worth it', 'Ne vaut pas le coup', '\u041d\u0435\u0432\u0430\u0440\u0442\u043e', 'No vale la pena'],
    hbpVerdictBody: ['The refund plus 90 days of tax-free growth beats leaving the same money in a taxable account for the same window \u2014 as long as you can actually make the 15 years of repayments.', 'Le remboursement plus 90 jours de croissance libre d\u2019imp\u00f4t l\u2019emportent sur laisser le m\u00eame montant dans un compte imposable pour la m\u00eame p\u00e9riode \u2014 pourvu que vous puissiez assumer les 15 ans de remboursements.', '\u041f\u043e\u0432\u0435\u0440\u043d\u0435\u043d\u043d\u044f \u043f\u043b\u044e\u0441 90 \u0434\u043d\u0456\u0432 \u0431\u0435\u0437\u043f\u043e\u0434\u0430\u0442\u043a\u043e\u0432\u043e\u0433\u043e \u0437\u0440\u043e\u0441\u0442\u0430\u043d\u043d\u044f \u043f\u0435\u0440\u0435\u0432\u0430\u0436\u0430\u044e\u0442\u044c \u0437\u0430\u043b\u0438\u0448\u0435\u043d\u043d\u044f \u0442\u0438\u0445 \u0441\u0430\u043c\u0438\u0445 \u043a\u043e\u0448\u0442\u0456\u0432 \u043d\u0430 \u043e\u043f\u043e\u0434\u0430\u0442\u043a\u043e\u0432\u0430\u043d\u043e\u043c\u0443 \u0440\u0430\u0445\u0443\u043d\u043a\u0443 \u043d\u0430 \u0442\u043e\u0439 \u0441\u0430\u043c\u0438\u0439 \u0442\u0435\u0440\u043c\u0456\u043d \u2014 \u044f\u043a\u0449\u043e \u0432\u0438 \u0434\u0456\u0439\u0441\u043d\u043e \u0437\u0434\u0430\u0442\u043d\u0456 \u0432\u0438\u0442\u0440\u0438\u043c\u0430\u0442\u0438 15 \u0440\u043e\u043a\u0456\u0432 \u0432\u0438\u043f\u043b\u0430\u0442.', 'El reembolso m\u00e1s 90 d\u00edas de crecimiento libre de impuestos superan a dejar el mismo dinero en una cuenta gravable durante el mismo periodo \u2014 siempre que pueda asumir los 15 a\u00f1os de pagos.'],
    hbpNoWithdraw: ['Enter a withdrawal amount to see the verdict.', 'Entrez un montant de retrait pour voir le verdict.', '\u0412\u0432\u0435\u0434\u0456\u0442\u044c \u0441\u0443\u043c\u0443 \u0432\u0438\u043b\u0443\u0447\u0435\u043d\u043d\u044f, \u0449\u043e\u0431 \u043f\u043e\u0431\u0430\u0447\u0438\u0442\u0438 \u0432\u0438\u0441\u043d\u043e\u0432\u043e\u043a.', 'Introduzca un importe de retiro para ver el veredicto.'],
    accNonregGloss: ['Selling realises a capital gain. Half of it is added to your income and taxed at your marginal rate \u2014 which is why it is last.', 'La vente r\u00e9alise un gain en capital. La moiti\u00e9 s\u2019ajoute \u00e0 votre revenu et est impos\u00e9e \u00e0 votre taux marginal \u2014 d\u2019o\u00f9 sa derni\u00e8re place.', '\u041f\u0440\u043e\u0434\u0430\u0436 \u0444\u0456\u043a\u0441\u0443\u0454 \u043f\u0440\u0438\u0440\u0456\u0441\u0442 \u043a\u0430\u043f\u0456\u0442\u0430\u043b\u0443. \u041f\u043e\u043b\u043e\u0432\u0438\u043d\u0430 \u0434\u043e\u0434\u0430\u0454\u0442\u044c\u0441\u044f \u0434\u043e \u0434\u043e\u0445\u043e\u0434\u0443 \u0442\u0430 \u043e\u043f\u043e\u0434\u0430\u0442\u043a\u043e\u0432\u0443\u0454\u0442\u044c\u0441\u044f \u0437\u0430 \u0433\u0440\u0430\u043d\u0438\u0447\u043d\u043e\u044e \u0441\u0442\u0430\u0432\u043a\u043e\u044e \u2014 \u0442\u043e\u043c\u0443 \u0446\u0435 \u043e\u0441\u0442\u0430\u043d\u043d\u0454 \u0434\u0436\u0435\u0440\u0435\u043b\u043e.', 'Vender realiza una plusval\u00eda. La mitad se suma a su ingreso y tributa a su tasa marginal: por eso va \u00fasltima.'],
    monthlySavings: ['Monthly savings toward the purchase', '\u00c9pargne mensuelle pour l\u2019achat', '\u0429\u043e\u043c\u0456\u0441\u044f\u0447\u043d\u0456 \u0437\u0430\u043e\u0449\u0430\u0434\u0436\u0435\u043d\u043d\u044f \u043d\u0430 \u043a\u0443\u043f\u0456\u0432\u043b\u044e', 'Ahorro mensual para la compra'],
    surplusLabel: ['Left over after closing day', 'Reste apr\u00e8s le jour de la cl\u00f4ture', '\u0417\u0430\u043b\u0438\u0448\u043e\u043a \u043f\u0456\u0441\u043b\u044f \u0434\u043d\u044f \u0437\u0430\u043a\u0440\u0438\u0442\u0442\u044f', 'Sobrante tras el d\u00eda del cierre'],
    shortfallLabel: ['Short by', 'Il manque', '\u041d\u0435 \u0432\u0438\u0441\u0442\u0430\u0447\u0430\u0454', 'Faltan'],
    monthsToClose: ['Months of saving to close the gap', 'Mois d\u2019\u00e9pargne pour combler l\u2019\u00e9cart', '\u041c\u0456\u0441\u044f\u0446\u0456\u0432 \u0437\u0430\u043e\u0449\u0430\u0434\u0436\u0435\u043d\u044c, \u0449\u043e\u0431 \u0437\u0430\u043a\u0440\u0438\u0442\u0438 \u0440\u043e\u0437\u0440\u0438\u0432', 'Meses de ahorro para cubrir la diferencia'],
    stPass: ['Enough', 'Suffisant', '\u0414\u043e\u0441\u0442\u0430\u0442\u043d\u044c\u043e', 'Suficiente'],
    stTight: ['Tight', 'Juste', '\u041b\u0435\u0434\u0432\u0435', 'Ajustado'],
    stShort: ['Short', 'Insuffisant', '\u041d\u0435\u0434\u043e\u0441\u0442\u0430\u0442\u043d\u044c\u043e', 'Insuficiente'],
    passNote: ['You can cover closing day and still keep a reserve.', 'Vous pouvez couvrir le jour de la cl\u00f4ture et garder une r\u00e9serve.', '\u0412\u0438 \u043f\u043e\u043a\u0440\u0438\u0432\u0430\u0454\u0442\u0435 \u0434\u0435\u043d\u044c \u0437\u0430\u043a\u0440\u0438\u0442\u0442\u044f \u0439 \u0449\u0435 \u043c\u0430\u0454\u0442\u0435 \u0440\u0435\u0437\u0435\u0440\u0432.', 'Puede cubrir el d\u00eda del cierre y conservar una reserva.'],
    tightNote: ['You would close with almost nothing left. No lender checks this. You should.', 'Vous fermeriez avec presque rien. Aucun pr\u00eateur ne v\u00e9rifie cela\u202f; vous devriez.', '\u0412\u0438 \u0437\u0430\u043a\u0440\u0438\u0454\u0442\u0435 \u0443\u0433\u043e\u0434\u0443 \u043c\u0430\u0439\u0436\u0435 \u0431\u0435\u0437 \u0437\u0430\u043f\u0430\u0441\u0443. \u0416\u043e\u0434\u0435\u043d \u043a\u0440\u0435\u0434\u0438\u0442\u043e\u0440 \u0446\u044c\u043e\u0433\u043e \u043d\u0435 \u043f\u0435\u0440\u0435\u0432\u0456\u0440\u044f\u0454. \u0412\u0438 \u2014 \u043c\u0443\u0441\u0438\u0442\u0435.', 'Cerrar\u00eda con casi nada. Ning\u00fan prestamista lo comprueba; usted s\u00ed deber\u00eda.'],
    shortNote: ['Income is not the constraint here \u2014 cash on the day is.', 'Le revenu n\u2019est pas la contrainte ici \u2014 c\u2019est le comptant du jour.', '\u0422\u0443\u0442 \u043e\u0431\u043c\u0435\u0436\u0443\u0454 \u043d\u0435 \u0434\u043e\u0445\u0456\u0434, \u0430 \u0433\u043e\u0442\u0456\u0432\u043a\u0430 \u0432 \u0434\u0435\u043d\u044c \u0437\u0430\u043a\u0440\u0438\u0442\u0442\u044f.', 'La restricci\u00f3n no es el ingreso, sino el efectivo del d\u00eda.'],
    amort: ['Amortization', 'Amortissement', '\u0410\u043c\u043e\u0440\u0442\u0438\u0437\u0430\u0446\u0456\u044f', 'Amortizaci\u00f3n'],
    amortNote: ['30 years is open to first-time buyers on insured mortgages, and adds 0.20% to the premium.', '30\u202fans sont offerts aux acheteurs d\u2019une premi\u00e8re habitation avec pr\u00eat assur\u00e9, et ajoutent 0,20\u202f% \u00e0 la prime.', '30 \u0440\u043e\u043a\u0456\u0432 \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0456 \u043f\u043e\u043a\u0443\u043f\u0446\u044f\u043c \u043f\u0435\u0440\u0448\u043e\u0433\u043e \u0436\u0438\u0442\u043b\u0430 \u0437\u0456 \u0441\u0442\u0440\u0430\u0445\u043e\u0432\u0430\u043d\u043e\u044e \u0456\u043f\u043e\u0442\u0435\u043a\u043e\u044e \u0456 \u0434\u043e\u0434\u0430\u044e\u0442\u044c 0,20\u202f% \u0434\u043e \u043f\u0440\u0435\u043c\u0456\u0457.', '30 a\u00f1os est\u00e1n disponibles para compradores de primera vivienda con hipoteca asegurada, y a\u00f1aden un 0,20\u202f% a la prima.'],

    /* credit labels */
    cr_lttRebateProv: ['Provincial first-time buyer rebate', 'Remboursement provincial pour premi\u00e8re habitation', '\u041f\u0440\u043e\u0432\u0456\u043d\u0446\u0456\u0439\u043d\u0435 \u043f\u043e\u0432\u0435\u0440\u043d\u0435\u043d\u043d\u044f \u0434\u043b\u044f \u043f\u0435\u0440\u0448\u043e\u0433\u043e \u0436\u0438\u0442\u043b\u0430', 'Reembolso provincial para primera vivienda'],
    cr_lttRebateMuni: ['Municipal first-time buyer rebate', 'Remboursement municipal pour premi\u00e8re habitation', '\u041c\u0443\u043d\u0456\u0446\u0438\u043f\u0430\u043b\u044c\u043d\u0435 \u043f\u043e\u0432\u0435\u0440\u043d\u0435\u043d\u043d\u044f \u0434\u043b\u044f \u043f\u0435\u0440\u0448\u043e\u0433\u043e \u0436\u0438\u0442\u043b\u0430', 'Reembolso municipal para primera vivienda'],
    cr_pttExempt: ['First-time buyer transfer tax exemption', 'Exon\u00e9ration de la taxe de transfert pour premi\u00e8re habitation', '\u0417\u0432\u0456\u043b\u044c\u043d\u0435\u043d\u043d\u044f \u0432\u0456\u0434 \u043f\u043e\u0434\u0430\u0442\u043a\u0443 \u0434\u043b\u044f \u043f\u0435\u0440\u0448\u043e\u0433\u043e \u0436\u0438\u0442\u043b\u0430', 'Exenci\u00f3n del impuesto de transferencia para primera vivienda'],
    cr_hba: ['Federal Home Buyers\u2019 Amount', 'Montant f\u00e9d\u00e9ral pour l\u2019achat d\u2019une habitation', '\u0424\u0435\u0434\u0435\u0440\u0430\u043b\u044c\u043d\u0430 \u043f\u0456\u043b\u044c\u0433\u0430 \u0434\u043b\u044f \u043f\u043e\u043a\u0443\u043f\u0446\u0456\u0432 \u0436\u0438\u0442\u043b\u0430', 'Cr\u00e9dito federal para compradores de vivienda'],
    cr_provCredit: ['Provincial first-time buyer tax credit', 'Cr\u00e9dit d\u2019imp\u00f4t provincial pour premi\u00e8re habitation', '\u041f\u0440\u043e\u0432\u0456\u043d\u0446\u0456\u0439\u043d\u0438\u0439 \u043f\u043e\u0434\u0430\u0442\u043a\u043e\u0432\u0438\u0439 \u043a\u0440\u0435\u0434\u0438\u0442 \u0434\u043b\u044f \u043f\u0435\u0440\u0448\u043e\u0433\u043e \u0436\u0438\u0442\u043b\u0430', 'Cr\u00e9dito fiscal provincial para primera vivienda'],
    cr_gstFthb: ['First-time home buyers\u2019 GST/HST rebate', 'Remboursement de la TPS/TVH pour premi\u00e8re habitation', '\u041f\u043e\u0432\u0435\u0440\u043d\u0435\u043d\u043d\u044f GST/HST \u0434\u043b\u044f \u043f\u043e\u043a\u0443\u043f\u0446\u0456\u0432 \u043f\u0435\u0440\u0448\u043e\u0433\u043e \u0436\u0438\u0442\u043b\u0430', 'Reembolso del GST/HST para primera vivienda'],

    /* one-sentence explanations, revealed on tap */
    ex_lttProv: ['A provincial tax on the transfer of title, charged in progressive bands on the purchase price. Driven by: price, province, first-time buyer status.', 'Une taxe provinciale sur le transfert de titre, calcul\u00e9e par tranches progressives du prix d\u2019achat. D\u00e9pend de\u202f: le prix, la province, le statut d\u2019acheteur d\u2019une premi\u00e8re habitation.', '\u041f\u0440\u043e\u0432\u0456\u043d\u0446\u0456\u0439\u043d\u0438\u0439 \u043f\u043e\u0434\u0430\u0442\u043e\u043a \u043d\u0430 \u043f\u0435\u0440\u0435\u0434\u0430\u0447\u0443 \u0442\u0438\u0442\u0443\u043b\u0443, \u0449\u043e \u0441\u0442\u044f\u0433\u0443\u0454\u0442\u044c\u0441\u044f \u0437\u0430 \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0438\u0432\u043d\u0438\u043c\u0438 \u0448\u0430\u0431\u043b\u043e\u043d\u0430\u043c\u0438. \u0417\u0430\u043b\u0435\u0436\u0438\u0442\u044c \u0432\u0456\u0434: \u0446\u0456\u043d\u0438, \u043f\u0440\u043e\u0432\u0456\u043d\u0446\u0456\u0457, \u0441\u0442\u0430\u0442\u0443\u0441\u0443 \u043f\u0435\u0440\u0448\u043e\u0433\u043e \u0436\u0438\u0442\u043b\u0430.', 'Un impuesto provincial sobre la transmisi\u00f3n del t\u00edtulo, en tramos progresivos del precio. Depende de: precio, provincia y condici\u00f3n de primera vivienda.'],
    ex_lttMuni: ['A second transfer tax charged by the city, stacked on top of the provincial one. Driven by: price, municipality.', 'Une deuxi\u00e8me taxe de mutation impos\u00e9e par la ville, qui s\u2019ajoute \u00e0 celle de la province. D\u00e9pend de\u202f: le prix, la municipalit\u00e9.', '\u0414\u0440\u0443\u0433\u0438\u0439 \u043f\u043e\u0434\u0430\u0442\u043e\u043a \u043d\u0430 \u043f\u0435\u0440\u0435\u0434\u0430\u0447\u0443, \u0449\u043e \u0441\u0442\u044f\u0433\u0443\u0454 \u043c\u0456\u0441\u0442\u043e \u043f\u043e\u043d\u0430\u0434 \u043f\u0440\u043e\u0432\u0456\u043d\u0446\u0456\u0439\u043d\u0438\u0439. \u0417\u0430\u043b\u0435\u0436\u0438\u0442\u044c \u0432\u0456\u0434: \u0446\u0456\u043d\u0438, \u043c\u0443\u043d\u0456\u0446\u0438\u043f\u0430\u043b\u0456\u0442\u0435\u0442\u0443.', 'Un segundo impuesto de transmisi\u00f3n que cobra la ciudad, sumado al provincial. Depende de: precio y municipio.'],
    ex_titleReg: ['This province charges no transfer tax. Instead the land titles office charges a registration fee that scales gently with value. Driven by: price, province.', 'Cette province n\u2019impose aucune taxe de mutation. Le bureau des titres fonciers per\u00e7oit plut\u00f4t des frais d\u2019enregistrement qui augmentent l\u00e9g\u00e8rement avec la valeur. D\u00e9pend de\u202f: le prix, la province.', '\u0426\u044f \u043f\u0440\u043e\u0432\u0456\u043d\u0446\u0456\u044f \u043d\u0435 \u0441\u0442\u044f\u0433\u0443\u0454 \u043f\u043e\u0434\u0430\u0442\u043a\u0443 \u043d\u0430 \u043f\u0435\u0440\u0435\u0434\u0430\u0447\u0443. \u0417\u0430\u043c\u0456\u0441\u0442\u044c \u043d\u044c\u043e\u0433\u043e \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u0439\u043d\u0430 \u0441\u043b\u0443\u0436\u0431\u0430 \u0431\u0435\u0440\u0435 \u043d\u0435\u0432\u0435\u043b\u0438\u043a\u0438\u0439 \u0437\u0431\u0456\u0440. \u0417\u0430\u043b\u0435\u0436\u0438\u0442\u044c \u0432\u0456\u0434: \u0446\u0456\u043d\u0438, \u043f\u0440\u043e\u0432\u0456\u043d\u0446\u0456\u0457.', 'Esta provincia no cobra impuesto de transmisi\u00f3n. En su lugar, el registro de la propiedad cobra una tasa que crece suavemente con el valor. Depende de: precio y provincia.'],
    ex_premTax: ['Your province taxes insurance premiums. The CMHC premium is financed into the mortgage, but the tax on it is not \u2014 it is cash on closing day. Driven by: down payment, price, province.', 'Votre province taxe les primes d\u2019assurance. La prime SCHL est financ\u00e9e dans le pr\u00eat, mais la taxe sur celle-ci ne l\u2019est pas \u2014 elle se paie comptant \u00e0 la cl\u00f4ture. D\u00e9pend de\u202f: la mise de fonds, le prix, la province.', '\u0412\u0430\u0448\u0430 \u043f\u0440\u043e\u0432\u0456\u043d\u0446\u0456\u044f \u043e\u043f\u043e\u0434\u0430\u0442\u043a\u043e\u0432\u0443\u0454 \u0441\u0442\u0440\u0430\u0445\u043e\u0432\u0456 \u043f\u0440\u0435\u043c\u0456\u0457. \u041f\u0440\u0435\u043c\u0456\u044f CMHC \u0432\u0445\u043e\u0434\u0438\u0442\u044c \u0443 \u043a\u0440\u0435\u0434\u0438\u0442, \u0430 \u043f\u043e\u0434\u0430\u0442\u043e\u043a \u043d\u0430 \u043d\u0435\u0457 \u2014 \u043d\u0456: \u0446\u0435 \u0433\u043e\u0442\u0456\u0432\u043a\u0430 \u0432 \u0434\u0435\u043d\u044c \u0437\u0430\u043a\u0440\u0438\u0442\u0442\u044f. \u0417\u0430\u043b\u0435\u0436\u0438\u0442\u044c \u0432\u0456\u0434: \u0432\u043d\u0435\u0441\u043a\u0443, \u0446\u0456\u043d\u0438, \u043f\u0440\u043e\u0432\u0456\u043d\u0446\u0456\u0457.', 'Su provincia grava las primas de seguro. La prima CMHC se financia en la hipoteca, pero el impuesto sobre ella no: es efectivo el d\u00eda del cierre. Depende de: pago inicial, precio y provincia.'],
    ex_taxAdj: ['If the seller prepaid the year\u2019s property tax, you reimburse the unused part. Driven by: municipal tax rate, price, closing date.', 'Si le vendeur a pay\u00e9 d\u2019avance les taxes de l\u2019ann\u00e9e, vous remboursez la portion non utilis\u00e9e. D\u00e9pend de\u202f: le taux municipal, le prix, la date de cl\u00f4ture.', '\u042f\u043a\u0449\u043e \u043f\u0440\u043e\u0434\u0430\u0432\u0435\u0446\u044c \u0441\u043f\u043b\u0430\u0442\u0438\u0432 \u043f\u043e\u0434\u0430\u0442\u043e\u043a \u043d\u0430\u043f\u0435\u0440\u0435\u0434, \u0432\u0438 \u0432\u0456\u0434\u0448\u043a\u043e\u0434\u043e\u0432\u0443\u0454\u0442\u0435 \u043d\u0435\u0432\u0438\u043a\u043e\u0440\u0438\u0441\u0442\u0430\u043d\u0443 \u0447\u0430\u0441\u0442\u0438\u043d\u0443. \u0417\u0430\u043b\u0435\u0436\u0438\u0442\u044c \u0432\u0456\u0434: \u043c\u0456\u0441\u044c\u043a\u043e\u0457 \u0441\u0442\u0430\u0432\u043a\u0438, \u0446\u0456\u043d\u0438, \u0434\u0430\u0442\u0438 \u0437\u0430\u043a\u0440\u0438\u0442\u0442\u044f.', 'Si el vendedor pag\u00f3 por adelantado el impuesto del a\u00f1o, usted reembolsa la parte no usada. Depende de: tasa municipal, precio y fecha de cierre.'],
    ex_hba: ['A non-refundable federal credit on your tax return the year after you buy. It does not help you on closing day. Driven by: first-time buyer status.', 'Un cr\u00e9dit f\u00e9d\u00e9ral non remboursable \u00e0 votre d\u00e9claration l\u2019ann\u00e9e suivant l\u2019achat. Il ne vous aide pas le jour de la cl\u00f4ture. D\u00e9pend de\u202f: le statut d\u2019acheteur d\u2019une premi\u00e8re habitation.', '\u041d\u0435\u043f\u043e\u0432\u0435\u0440\u0442\u043d\u0438\u0439 \u0444\u0435\u0434\u0435\u0440\u0430\u043b\u044c\u043d\u0438\u0439 \u043a\u0440\u0435\u0434\u0438\u0442 \u0443 \u043f\u043e\u0434\u0430\u0442\u043a\u043e\u0432\u0456\u0439 \u0434\u0435\u043a\u043b\u0430\u0440\u0430\u0446\u0456\u0457 \u043d\u0430\u0441\u0442\u0443\u043f\u043d\u043e\u0433\u043e \u0440\u043e\u043a\u0443. \u0423 \u0434\u0435\u043d\u044c \u0437\u0430\u043a\u0440\u0438\u0442\u0442\u044f \u043d\u0435 \u0434\u043e\u043f\u043e\u043c\u0430\u0433\u0430\u0454. \u0417\u0430\u043b\u0435\u0436\u0438\u0442\u044c \u0432\u0456\u0434: \u0441\u0442\u0430\u0442\u0443\u0441\u0443 \u043f\u0435\u0440\u0448\u043e\u0433\u043e \u0436\u0438\u0442\u043b\u0430.', 'Un cr\u00e9dito federal no reembolsable en su declaraci\u00f3n del a\u00f1o siguiente. No ayuda el d\u00eda del cierre. Depende de: condici\u00f3n de primera vivienda.'],
    ex_gstFthb: ['Full rebate of the federal GST on a qualifying new home up to $1M, phasing out to nil at $1.5M. A builder may credit it at closing; otherwise it arrives at tax time. Driven by: price, new build, first-time buyer status.', 'Remboursement complet de la TPS f\u00e9d\u00e9rale sur une habitation neuve admissible jusqu\u2019\u00e0 1\u202fM$, r\u00e9duit \u00e0 z\u00e9ro \u00e0 1,5\u202fM$. Le constructeur peut le cr\u00e9diter \u00e0 la cl\u00f4ture\u202f; sinon il arrive \u00e0 la p\u00e9riode des imp\u00f4ts. D\u00e9pend de\u202f: le prix, la construction neuve, le statut d\u2019acheteur d\u2019une premi\u00e8re habitation.', '\u041f\u043e\u0432\u043d\u0435 \u043f\u043e\u0432\u0435\u0440\u043d\u0435\u043d\u043d\u044f \u0444\u0435\u0434\u0435\u0440\u0430\u043b\u044c\u043d\u043e\u0433\u043e GST \u043d\u0430 \u043d\u043e\u0432\u0435 \u0436\u0438\u0442\u043b\u043e \u0434\u043e 1\u202f\u043c\u043b\u043d\u202f$, \u0437\u043d\u0438\u043a\u0430\u0454 \u043d\u0430 1,5\u202f\u043c\u043b\u043d\u202f$. \u0417\u0430\u0431\u0443\u0434\u043e\u0432\u043d\u0438\u043a \u043c\u043e\u0436\u0435 \u0437\u0430\u0440\u0430\u0445\u0443\u0432\u0430\u0442\u0438 \u0439\u043e\u0433\u043e \u043f\u0440\u0438 \u0437\u0430\u043a\u0440\u0438\u0442\u0442\u0456; \u0456\u043d\u0430\u043a\u0448\u0435 \u2014 \u043f\u0456\u0434 \u0447\u0430\u0441 \u0437\u0432\u0456\u0442\u043d\u043e\u0441\u0442\u0456. \u0417\u0430\u043b\u0435\u0436\u0438\u0442\u044c \u0432\u0456\u0434: \u0446\u0456\u043d\u0438, \u043d\u043e\u0432\u043e\u0431\u0443\u0434\u043e\u0432\u0438, \u0441\u0442\u0430\u0442\u0443\u0441\u0443 \u043f\u0435\u0440\u0448\u043e\u0433\u043e \u0436\u0438\u0442\u043b\u0430.', 'Reembolso total del GST federal en vivienda nueva elegible hasta 1\u202fM$, que se anula en 1,5\u202fM$. El constructor puede acreditarlo en el cierre; si no, llega con la declaraci\u00f3n. Depende de: precio, obra nueva y primera vivienda.']
  };

  /* ---------- province / territory names ---------- */
  var P = {
    AB: ['Alberta', 'Alberta', '\u0410\u043b\u044c\u0431\u0435\u0440\u0442\u0430', 'Alberta'],
    BC: ['British Columbia', 'Colombie-Britannique', '\u0411\u0440\u0438\u0442\u0430\u043d\u0441\u044c\u043a\u0430 \u041a\u043e\u043b\u0443\u043c\u0431\u0456\u044f', 'Columbia Brit\u00e1nica'],
    MB: ['Manitoba', 'Manitoba', '\u041c\u0430\u043d\u0456\u0442\u043e\u0431\u0430', 'Manitoba'],
    NB: ['New Brunswick', 'Nouveau-Brunswick', '\u041d\u044c\u044e-\u0411\u0440\u0430\u043d\u0441\u0432\u0456\u043a', 'Nuevo Brunswick'],
    NL: ['Newfoundland and Labrador', 'Terre-Neuve-et-Labrador', '\u041d\u044c\u044e\u0444\u0430\u0443\u043d\u0434\u043b\u0435\u043d\u0434 \u0456 \u041b\u0430\u0431\u0440\u0430\u0434\u043e\u0440', 'Terranova y Labrador'],
    NS: ['Nova Scotia', 'Nouvelle-\u00c9cosse', '\u041d\u043e\u0432\u0430 \u0428\u043a\u043e\u0442\u043b\u0430\u043d\u0434\u0456\u044f', 'Nueva Escocia'],
    NT: ['Northwest Territories', 'Territoires du Nord-Ouest', '\u041f\u0456\u0432\u043d\u0456\u0447\u043d\u043e-\u0417\u0430\u0445\u0456\u0434\u043d\u0456 \u0442\u0435\u0440\u0438\u0442\u043e\u0440\u0456\u0457', 'Territorios del Noroeste'],
    NU: ['Nunavut', 'Nunavut', '\u041d\u0443\u043d\u0430\u0432\u0443\u0442', 'Nunavut'],
    ON: ['Ontario', 'Ontario', '\u041e\u043d\u0442\u0430\u0440\u0456\u043e', 'Ontario'],
    PE: ['Prince Edward Island', '\u00cele-du-Prince-\u00c9douard', '\u041e\u0441\u0442\u0440\u0456\u0432 \u041f\u0440\u0438\u043d\u0446\u0430 \u0415\u0434\u0432\u0430\u0440\u0434\u0430', 'Isla del Pr\u00edncipe Eduardo'],
    QC: ['Quebec', 'Qu\u00e9bec', '\u041a\u0432\u0435\u0431\u0435\u043a', 'Quebec'],
    SK: ['Saskatchewan', 'Saskatchewan', '\u0421\u0430\u0441\u043a\u0430\u0447\u0435\u0432\u0430\u043d', 'Saskatchewan'],
    YT: ['Yukon', 'Yukon', '\u042e\u043a\u043e\u043d', 'Yuk\u00f3n']
  };

  var C = {
    toronto: ['Toronto', 'Toronto', '\u0422\u043e\u0440\u043e\u043d\u0442\u043e', 'Toronto'],
    ottawa: ['Ottawa', 'Ottawa', '\u041e\u0442\u0442\u0430\u0432\u0430', 'Ottawa'],
    vancouver: ['Vancouver', 'Vancouver', '\u0412\u0430\u043d\u043a\u0443\u0432\u0435\u0440', 'Vancouver'],
    halifax: ['Halifax', 'Halifax', '\u0413\u0430\u043b\u0456\u0444\u0430\u043a\u0441', 'Halifax'],
    winnipeg: ['Winnipeg', 'Winnipeg', '\u0412\u0456\u043d\u043d\u0456\u043f\u0435\u0433', 'Winnipeg'],
    montreal: ['Montr\u00e9al', 'Montr\u00e9al', '\u041c\u043e\u043d\u0440\u0435\u0430\u043b\u044c', 'Montreal'],
    calgary: ['Calgary', 'Calgary', '\u041a\u0430\u043b\u0433\u0430\u0440\u0456', 'Calgary'],
    saskatoon: ['Saskatoon', 'Saskatoon', '\u0421\u0430\u0441\u043a\u0430\u0442\u0443\u043d', 'Saskatoon']
  };

  /* ---------- jurisdiction records ----------
     transfer[]  : declarative tax/fee line items. kind: brackets | flat | perValue | table
     rebates[]   : kind cap | exemptBand | none ; timing closing | taxTime
     Absence of an entry means the line item does not render at all. */
  var VER = '2026-08-16';
  var jur = [
    { id: 'toronto', prov: 'ON', city: 'toronto', cityData: true, pro: 'lawyer',
      rent: 2850, yoy: 0.008, bench: { house: 1180000, condo: 688000, newbuild: 1090000 }, propTax: 0.00752,
      transfer: [
        { key: 'li_lttProv', ex: 'ex_lttProv', tier: 'provincial', kind: 'brackets',
          brackets: [[55000, .005], [250000, .01], [400000, .015], [2000000, .02], [null, .025]] },
        { key: 'li_lttMuni', ex: 'ex_lttMuni', tier: 'municipal', kind: 'brackets',
          brackets: [[55000, .005], [250000, .01], [400000, .015], [2000000, .02], [3000000, .025], [4000000, .035], [5000000, .045], [10000000, .055], [20000000, .065], [null, .075]] }
      ],
      premiumTax: { rate: .08, label: 'Ontario retail sales tax, 8%' },
      rebates: [
        { key: 'cr_lttRebateProv', kind: 'cap', cap: 4000, on: 0, timing: 'closing' },
        { key: 'cr_lttRebateMuni', kind: 'cap', cap: 4475, on: 1, timing: 'closing' }
      ],
      taxTime: [{ key: 'cr_hba', ex: 'ex_hba', amount: 1500 }],
      fees: { lawyer: 2200, titleIns: 400, inspect: 650, appraisal: 400, statusCert: 110, moving: 1500, setup: 650 },
      orgs: { transfer: 'Ontario Ministry of Finance', muni: 'City of Toronto, MLTT by-law', premTax: 'Ontario Ministry of Finance', rebate: 'Ontario Ministry of Finance \u00b7 City of Toronto', market: 'CREA MLS\u00ae HPI' } },

    { id: 'ottawa', prov: 'ON', city: 'ottawa', cityData: true, pro: 'lawyer',
      rent: 2150, yoy: 0.021, bench: { house: 690000, condo: 425000, newbuild: 720000 }, propTax: 0.01144,
      transfer: [
        { key: 'li_lttProv', ex: 'ex_lttProv', tier: 'provincial', kind: 'brackets',
          brackets: [[55000, .005], [250000, .01], [400000, .015], [2000000, .02], [null, .025]] }
      ],
      premiumTax: { rate: .08, label: 'Ontario retail sales tax, 8%' },
      rebates: [{ key: 'cr_lttRebateProv', kind: 'cap', cap: 4000, on: 0, timing: 'closing' }],
      taxTime: [{ key: 'cr_hba', ex: 'ex_hba', amount: 1500 }],
      fees: { lawyer: 1900, titleIns: 375, inspect: 550, appraisal: 400, statusCert: 110, moving: 1300, setup: 600 },
      orgs: { transfer: 'Ontario Ministry of Finance', premTax: 'Ontario Ministry of Finance', rebate: 'Ontario Ministry of Finance', market: 'CREA MLS\u00ae HPI' } },

    { id: 'vancouver', prov: 'BC', city: 'vancouver', cityData: true, pro: 'lawyerOrNotary',
      rent: 3150, yoy: -0.005, bench: { house: 1720000, condo: 762000, newbuild: 1090000 }, propTax: 0.00297,
      transfer: [
        { key: 'li_ptt', ex: 'ex_lttProv', tier: 'provincial', kind: 'brackets',
          brackets: [[200000, .01], [2000000, .02], [3000000, .03], [null, .05]] }
      ],
      premiumTax: null,
      rebates: [{ key: 'cr_pttExempt', kind: 'exemptBand', full: 835000, partial: 860000, capBase: 500000, on: 0, timing: 'closing' }],
      taxTime: [{ key: 'cr_hba', ex: 'ex_hba', amount: 1500 }],
      fees: { lawyer: 1600, titleIns: 350, inspect: 700, appraisal: 450, statusCert: 60, moving: 1600, setup: 650 },
      orgs: { transfer: 'BC Ministry of Finance, Property Transfer Tax Act', rebate: 'BC First Time Home Buyers\u2019 Programme', market: 'CREA MLS\u00ae HPI' } },

    { id: 'halifax', prov: 'NS', city: 'halifax', cityData: true, pro: 'lawyer',
      rent: 2050, yoy: 0.034, bench: { house: 585000, condo: 460000, newbuild: 640000 }, propTax: 0.01105,
      transfer: [
        { key: 'li_deedMuni', ex: 'ex_lttMuni', tier: 'municipal', kind: 'flat', rate: .015 }
      ],
      premiumTax: null,
      rebates: [{ key: 'cr_lttRebateProv', kind: 'none', on: 0, timing: 'closing' }],
      taxTime: [{ key: 'cr_hba', ex: 'ex_hba', amount: 1500 }],
      fees: { lawyer: 1700, titleIns: 350, inspect: 600, appraisal: 400, statusCert: 100, moving: 1400, setup: 600 },
      orgs: { transfer: 'Halifax Regional Municipality, deed transfer tax by-law', rebate: 'Nova Scotia Department of Finance', market: 'CREA MLS\u00ae HPI' } },

    { id: 'winnipeg', prov: 'MB', city: 'winnipeg', cityData: true, pro: 'lawyer',
      rent: 1600, yoy: 0.024, bench: { house: 454264, condo: 290522, newbuild: 480000 }, propTax: 0.0132,
      transfer: [
        { key: 'li_lttProv', ex: 'ex_lttProv', tier: 'provincial', kind: 'brackets',
          brackets: [[30000, 0], [90000, .005], [150000, .01], [200000, .015], [null, .02]] },
        { key: 'li_titleReg', ex: 'ex_titleReg', tier: 'provincial', kind: 'fixed', amount: 130 }
      ],
      /* Combined federal + provincial marginal rate, Manitoba 2026. Sourced from the model. */
      marginal: [[47000, .258], [57375, .2355], [100000, .3325], [114750, .379], [158519, .434], [220000, .464], [null, .504]],
      /* Manitoba removed PST on CMHC premiums in 2020 — no premium-tax line renders here. */
      premiumTax: null,
      rebates: [{ key: 'cr_lttRebateProv', kind: 'none', on: 0, timing: 'closing' }],
      taxTime: [{ key: 'cr_hba', ex: 'ex_hba', amount: 1500 }],
      fees: { lawyer: 1800, titleIns: 350, inspect: 600, appraisal: 400, statusCert: 100, moving: 1500, setup: 3000 },
      orgs: { transfer: 'Manitoba Finance, Land Transfer Tax', rebate: 'Manitoba Finance', market: 'WinnipegREALTORS via WOWA.ca' } },

    { id: 'montreal', prov: 'QC', city: 'montreal', cityData: true, pro: 'notary',
      rent: 1950, yoy: 0.041, bench: { house: 640000, condo: 442000, newbuild: 690000 }, propTax: 0.00792,
      transfer: [
        { key: 'li_dutiesMuni', ex: 'ex_lttMuni', tier: 'municipal', kind: 'brackets',
          brackets: [[62700, .005], [313900, .01], [563300, .015], [1126800, .02], [2179200, .025], [3175300, .035], [null, .04]] }
      ],
      premiumTax: { rate: .09, label: 'Quebec tax on insurance premiums, 9%' },
      rebates: [{ key: 'cr_lttRebateProv', kind: 'none', on: 0, timing: 'closing' }],
      taxTime: [{ key: 'cr_hba', ex: 'ex_hba', amount: 1500 }, { key: 'cr_provCredit', ex: 'ex_hba', amount: 1400 }],
      fees: { notary: 1800, locCert: 400, inspect: 600, appraisal: 400, statusCert: 0, moving: 1300, setup: 600 },
      orgs: { transfer: 'Ville de Montr\u00e9al, droits de mutation immobili\u00e8re', premTax: 'Revenu Qu\u00e9bec', rebate: 'Revenu Qu\u00e9bec', market: 'APCIQ \u00b7 Centris' } },

    { id: 'calgary', prov: 'AB', city: 'calgary', cityData: true, pro: 'lawyer',
      rent: 1850, yoy: 0.028, bench: { house: 622000, condo: 342000, newbuild: 660000 }, propTax: 0.00654,
      transfer: [
        { key: 'li_titleReg', ex: 'ex_titleReg', tier: 'provincial', kind: 'perValue', base: 50, per: 5, unit: 5000, on: 'price' },
        { key: 'li_mortReg', ex: 'ex_titleReg', tier: 'provincial', kind: 'perValue', base: 50, per: 5, unit: 5000, on: 'loan' }
      ],
      premiumTax: null,
      rebates: [{ key: 'cr_lttRebateProv', kind: 'none', on: 0, timing: 'closing', noTax: true }],
      taxTime: [{ key: 'cr_hba', ex: 'ex_hba', amount: 1500 }],
      fees: { lawyer: 1600, titleIns: 325, inspect: 550, appraisal: 400, statusCert: 350, moving: 1300, setup: 600 },
      orgs: { transfer: 'Alberta Land Titles, tariff of fees', rebate: 'Alberta Treasury Board and Finance', market: 'CREA MLS\u00ae HPI' } },

    { id: 'saskatoon', prov: 'SK', city: 'saskatoon', cityData: true, pro: 'lawyer',
      rent: 1450, yoy: 0.039, bench: { house: 402000, condo: 232000, newbuild: 455000 }, propTax: 0.01285,
      transfer: [
        { key: 'li_titleReg', ex: 'ex_titleReg', tier: 'provincial', kind: 'rateMin', rate: .003, min: 25, floor: 8400 },
        { key: 'li_mortReg', ex: 'ex_titleReg', tier: 'provincial', kind: 'fixed', amount: 160 }
      ],
      premiumTax: { rate: .06, label: 'Saskatchewan PST on insurance premiums, 6%' },
      rebates: [{ key: 'cr_lttRebateProv', kind: 'none', on: 0, timing: 'closing', noTax: true }],
      taxTime: [{ key: 'cr_hba', ex: 'ex_hba', amount: 1500 }, { key: 'cr_provCredit', ex: 'ex_hba', amount: 1155 }],
      fees: { lawyer: 1450, titleIns: 300, inspect: 500, appraisal: 350, statusCert: 200, moving: 1200, setup: 550 },
      orgs: { transfer: 'Information Services Corporation of Saskatchewan', premTax: 'Saskatchewan Ministry of Finance', rebate: 'Saskatchewan Ministry of Finance', market: 'CREA MLS\u00ae HPI' } },

    /* --- province-level only: rules exact, local costs are provincial averages --- */
    { id: 'nb', prov: 'NB', city: null, cityData: false, pro: 'lawyer',
      bench: { house: 365000, condo: 285000, newbuild: 420000 }, propTax: 0.01450,
      transfer: [{ key: 'li_lttProv', ex: 'ex_lttProv', tier: 'provincial', kind: 'flat', rate: .01 }],
      premiumTax: null,
      rebates: [{ key: 'cr_lttRebateProv', kind: 'none', on: 0, timing: 'closing' }],
      taxTime: [{ key: 'cr_hba', ex: 'ex_hba', amount: 1500 }],
      fees: { lawyer: 1500, titleIns: 325, inspect: 500, appraisal: 350, statusCert: 100, moving: 1200, setup: 550 },
      orgs: { transfer: 'Service New Brunswick, Real Property Transfer Tax Act', rebate: 'Department of Finance and Treasury Board', market: 'CREA MLS\u00ae HPI' } },

    { id: 'nl', prov: 'NL', city: null, cityData: false, pro: 'lawyer',
      bench: { house: 335000, condo: 290000, newbuild: 400000 }, propTax: 0.00830,
      transfer: [{ key: 'li_titleReg', ex: 'ex_titleReg', tier: 'provincial', kind: 'perValue', base: 100, per: 0.4, unit: 100, on: 'price', exempt: 500 }],
      premiumTax: null,
      rebates: [{ key: 'cr_lttRebateProv', kind: 'none', on: 0, timing: 'closing', noTax: true }],
      taxTime: [{ key: 'cr_hba', ex: 'ex_hba', amount: 1500 }],
      fees: { lawyer: 1450, titleIns: 300, inspect: 500, appraisal: 350, statusCert: 100, moving: 1250, setup: 550 },
      orgs: { transfer: 'Registry of Deeds, Service NL', rebate: 'Newfoundland and Labrador Department of Finance', market: 'CREA MLS\u00ae HPI' } },

    { id: 'pe', prov: 'PE', city: null, cityData: false, pro: 'lawyer',
      bench: { house: 388000, condo: 320000, newbuild: 440000 }, propTax: 0.01050,
      transfer: [{ key: 'li_lttProv', ex: 'ex_lttProv', tier: 'provincial', kind: 'flat', rate: .01 }],
      premiumTax: null,
      rebates: [{ key: 'cr_pttExempt', kind: 'fullExempt', on: 0, timing: 'closing' }],
      taxTime: [{ key: 'cr_hba', ex: 'ex_hba', amount: 1500 }],
      fees: { lawyer: 1400, titleIns: 300, inspect: 500, appraisal: 350, statusCert: 100, moving: 1200, setup: 550 },
      orgs: { transfer: 'PEI Department of Finance, Real Property Transfer Tax Act', rebate: 'PEI Department of Finance', market: 'CREA MLS\u00ae HPI' } },

    { id: 'yt', prov: 'YT', city: null, cityData: false, pro: 'lawyer',
      bench: { house: 620000, condo: 480000, newbuild: 690000 }, propTax: 0.00780,
      transfer: [{ key: 'li_titleReg', ex: 'ex_titleReg', tier: 'provincial', kind: 'fixed', amount: 650 },
                 { key: 'li_mortReg', ex: 'ex_titleReg', tier: 'provincial', kind: 'fixed', amount: 100 }],
      premiumTax: null,
      rebates: [{ key: 'cr_lttRebateProv', kind: 'none', on: 0, timing: 'closing', noTax: true }],
      taxTime: [{ key: 'cr_hba', ex: 'ex_hba', amount: 1500 }],
      fees: { lawyer: 1800, titleIns: 350, inspect: 700, appraisal: 500, statusCert: 150, moving: 3200, setup: 750 },
      orgs: { transfer: 'Yukon Land Titles Office, tariff of fees', rebate: 'Yukon Department of Finance', market: 'Yukon Bureau of Statistics' } },

    { id: 'nt', prov: 'NT', city: null, cityData: false, pro: 'lawyer',
      bench: { house: 470000, condo: 380000, newbuild: 560000 }, propTax: 0.01120,
      transfer: [{ key: 'li_titleReg', ex: 'ex_titleReg', tier: 'provincial', kind: 'perValue', base: 0, per: 1.5, unit: 1000, on: 'price', min: 100 },
                 { key: 'li_mortReg', ex: 'ex_titleReg', tier: 'provincial', kind: 'perValue', base: 0, per: 1.0, unit: 1000, on: 'loan', min: 80 }],
      premiumTax: null,
      rebates: [{ key: 'cr_lttRebateProv', kind: 'none', on: 0, timing: 'closing', noTax: true }],
      taxTime: [{ key: 'cr_hba', ex: 'ex_hba', amount: 1500 }],
      fees: { lawyer: 1900, titleIns: 350, inspect: 750, appraisal: 550, statusCert: 150, moving: 4200, setup: 800 },
      orgs: { transfer: 'NWT Land Titles Office, tariff of fees', rebate: 'NWT Department of Finance', market: 'NWT Bureau of Statistics' } },

    { id: 'nu', prov: 'NU', city: null, cityData: false, pro: 'lawyer',
      bench: { house: 520000, condo: 430000, newbuild: 640000 }, propTax: 0.00900,
      transfer: [{ key: 'li_titleReg', ex: 'ex_titleReg', tier: 'provincial', kind: 'perValue', base: 0, per: 1.5, unit: 1000, on: 'price', min: 100 },
                 { key: 'li_mortReg', ex: 'ex_titleReg', tier: 'provincial', kind: 'perValue', base: 0, per: 1.0, unit: 1000, on: 'loan', min: 80 }],
      premiumTax: null,
      rebates: [{ key: 'cr_lttRebateProv', kind: 'none', on: 0, timing: 'closing', noTax: true }],
      taxTime: [{ key: 'cr_hba', ex: 'ex_hba', amount: 1500 }],
      fees: { lawyer: 2100, titleIns: 350, inspect: 900, appraisal: 650, statusCert: 150, moving: 6500, setup: 900 },
      orgs: { transfer: 'Nunavut Land Titles Office, tariff of fees', rebate: 'Nunavut Department of Finance', market: 'Nunavut Bureau of Statistics' } }
  ];

  /* federal rules (jurisdiction record: country level) */
  var federal = {
    /* LTV band -> premium. From the model's Reference Data tab. */
    cmhc: { bands: [[.65, .006], [.75, .017], [.80, .024], [.85, .028], [.90, .031], [.95, .04]], longAmortSurcharge: .002, insuredCap: 1500000 },
    stressTest: { floor: 5.25, buffer: 2 },
    gds: 39, tds: 44, heatAllowance: 150,
    rates: { insured: .0394, uninsured: .0404, variable: .0335, prime: .0445 },
    maxAmortFtbInsured: 30, maxAmortOther: 25,
    fhsa: { annual: 8000, lifetime: 40000 },
    hbp: { max: 60000, repayYears: 15, graceYears: 2, ruleDays: 90 },
    rrspCap: 33810, capGainsInclusion: .5,
    /* Combined federal + provincial marginal rate by taxable income. MB is from the
       model's Reference Data tab; the others are derived the same way. Verify before ship. */
    marginal: {
      MB: [[47564, .248], [58522, .2675], [101200, .3325], [117000, .379], [181400, .434], [258500, .464], [null, .504]],
      ON: [[52886, .2005], [58522, .2415], [105775, .2965], [117000, .3389], [181400, .4341], [253414, .4841], [null, .5353]],
      BC: [[49279, .2006], [58522, .227], [98560, .287], [113158, .317], [181400, .407], [258500, .457], [null, .535]],
      QC: [[53255, .2653], [58522, .3153], [106495, .3612], [117000, .4112], [129590, .4571], [181400, .4746], [null, .5331]],
      AB: [[60000, .24], [117000, .305], [181400, .36], [241974, .42], [362961, .44], [null, .48]],
      SK: [[54000, .245], [58522, .26], [117000, .335], [181400, .43], [258500, .46], [null, .475]],
      NS: [[32074, .2379], [58522, .30], [64181, .345], [117000, .43], [181400, .47], [null, .54]],
      CA: [[55000, .245], [58522, .27], [110000, .335], [117000, .38], [181400, .435], [258500, .465], [null, .51]]
    },
    sellingCost: .05, maintenanceReserve: .01,
    appreciation: { inflation: .021, shelter: .031, flat: 0 },
    investReturn: { cash: .024, balanced: .046, growth: .058 }, savingsReturn: .035,
    gstFthb: { rate: .05, fullTo: 1000000, zeroAt: 1500000, cap: 50000 },
    hba: 1500,
    verified: VER,
    contractRate: 4.29
  };

  window.CIBTH_DATA = { L: L, t: t, P: P, C: C, jur: jur, federal: federal, verified: VER };
  window.dispatchEvent(new Event('cibth-data'));
})();
