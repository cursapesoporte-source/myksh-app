export type GuideSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type GuideLink = {
  label: string;
  url: string;
};

export type Guide = {
  slug: string;
  title: string;
  summary: string;
  level: "Básico" | "Intermedio";
  readMinutes: number;
  sections: GuideSection[];
  links: GuideLink[];
};

export const GUIDES: Guide[] = [
  {
    slug: "registrar-inversiones-en-myksh",
    title: "Cómo registrar tus inversiones en MYKSH",
    summary:
      "Qué datos pide cada tipo de activo y cómo MYKSH calcula el valor y la rentabilidad.",
    level: "Básico",
    readMinutes: 4,
    sections: [
      {
        heading: "Elige el tipo de activo correcto",
        paragraphs: [
          "El formulario cambia según el tipo de activo, porque no todos se valoran igual.",
        ],
        bullets: [
          "Cripto: elige la moneda del catálogo. MYKSH obtiene el precio desde los precios públicos de Binance en pares contra USDT y lo convierte a tu moneda base.",
          "Acciones y ETFs: registra el ticker, la bolsa, la cantidad y el precio. El precio actual se ingresa manualmente.",
          "Fondos: registra la cantidad de cuotas y el valor de la cuota.",
          "Plazo fijo: registra la institución, el capital, la tasa anual y la fecha de vencimiento.",
          "Inmuebles: registra el valor, tu porcentaje de propiedad y la deuda pendiente si la hay.",
        ],
      },
      {
        heading: "Monedas y conversión",
        paragraphs: [
          "Cada activo conserva su moneda original: soles, dólares o USDT. Para mostrar totales, MYKSH convierte automáticamente a tu moneda base y muestra la ruta y la fuente de la conversión.",
          "Si una tasa no está disponible, el activo aparece como pendiente de conversión en lugar de mostrarse con valor cero.",
        ],
      },
      {
        heading: "Actualizar precios y ver la evolución",
        bullets: [
          "Pulsa Actualizar precios de mercado para refrescar las criptomonedas. Cada actualización queda guardada como un punto del historial.",
          "La rentabilidad mensual y la evolución del patrimonio necesitan datos de al menos dos fechas distintas. Si todavía no hay suficientes, verás un mensaje en lugar de datos inventados.",
          "Los activos con precio manual solo cambian cuando tú actualizas su precio actual.",
        ],
      },
    ],
    links: [],
  },
  {
    slug: "cripto-basico",
    title: "Criptomonedas: lo esencial antes de invertir",
    summary:
      "Conceptos básicos, riesgos y hábitos de seguridad para empezar con criterio.",
    level: "Básico",
    readMinutes: 5,
    sections: [
      {
        heading: "Qué es una criptomoneda",
        paragraphs: [
          "Es un activo digital que funciona sobre una red descentralizada llamada blockchain. Bitcoin (BTC) y Ethereum (ETH) son las más conocidas.",
          "Las stablecoins, como USDT, buscan mantener un valor cercano al dólar. Su precio puede desviarse, por lo que no son equivalentes a tener dólares en un banco.",
        ],
      },
      {
        heading: "Riesgos principales",
        bullets: [
          "Volatilidad: el precio puede subir o bajar con fuerza en poco tiempo, y el mercado opera todos los días, a cualquier hora.",
          "Custodia: si pierdes el acceso a tu cuenta o a tus claves, puedes perder tus fondos.",
          "Estafas: desconfía de promesas de rentabilidad garantizada, grupos que piden depósitos y enlaces que solicitan tus claves.",
          "Regulación: las reglas cambian según el país y pueden afectar su disponibilidad.",
        ],
      },
      {
        heading: "Buenas prácticas",
        bullets: [
          "Invierte solo dinero que puedas permitirte perder.",
          "Activa la verificación en dos pasos en todas tus cuentas.",
          "No compartas tus claves, frases de recuperación ni códigos de verificación.",
          "Empieza con montos pequeños y aprende antes de aumentar.",
          "Registra tus compras en MYKSH para seguir tu costo y tu rentabilidad reales.",
        ],
      },
    ],
    links: [
      {
        label: "Binance Academy (español)",
        url: "https://www.binance.com/es/academy",
      },
    ],
  },
  {
    slug: "binance",
    title: "Binance: qué es y cómo usarlo con MYKSH",
    summary:
      "Qué ofrece la plataforma, qué precauciones tomar y cómo se relaciona con los precios de MYKSH.",
    level: "Básico",
    readMinutes: 4,
    sections: [
      {
        heading: "Qué es Binance",
        paragraphs: [
          "Binance es un exchange donde se compran y venden criptomonedas. También publica Binance Academy, con contenido educativo gratuito sobre criptomonedas y blockchain.",
          "Los servicios disponibles, los requisitos de verificación y las comisiones dependen de tu país y cambian con el tiempo. Revísalos directamente en el sitio oficial.",
        ],
      },
      {
        heading: "Antes de abrir una cuenta",
        bullets: [
          "Ingresa siempre desde la dirección oficial, escribiéndola tú mismo o desde un marcador guardado.",
          "Activa la verificación en dos pasos.",
          "Revisa las comisiones y los límites antes de operar.",
          "No compartas tus claves ni códigos con nadie, ni siquiera con supuestos representantes de soporte.",
        ],
      },
      {
        heading: "Cómo se relaciona con MYKSH",
        paragraphs: [
          "MYKSH no se conecta a tu cuenta de Binance y no te pide tus credenciales. Solo consulta precios públicos de mercado para valorar las criptomonedas que registres.",
          "Para llevar tu cartera, registra manualmente cada compra en MYKSH con su cantidad y su precio de compra.",
        ],
      },
    ],
    links: [
      {
        label: "Binance Academy (español)",
        url: "https://www.binance.com/es/academy",
      },
      {
        label: "Guía para principiantes sobre trading de criptomonedas",
        url: "https://www.binance.com/es/academy/articles/a-complete-guide-to-cryptocurrency-trading-for-beginners",
      },
    ],
  },
  {
    slug: "acciones-y-etfs",
    title: "Acciones y ETFs para principiantes",
    summary:
      "Qué son, cómo se identifican y qué considerar antes de comprar.",
    level: "Intermedio",
    readMinutes: 5,
    sections: [
      {
        heading: "Conceptos básicos",
        bullets: [
          "Una acción representa una pequeña parte de una empresa.",
          "Un ETF es un fondo que cotiza en bolsa y normalmente replica un índice o un conjunto de activos.",
          "El ticker es el código con el que se identifica un activo en la bolsa, por ejemplo AAPL para Apple.",
          "El mismo ticker puede existir en distintas bolsas, por eso MYKSH te pide también la bolsa.",
        ],
      },
      {
        heading: "Qué revisar antes de comprar",
        bullets: [
          "Comisiones del intermediario y costos de mantener el activo.",
          "Moneda del activo y efecto del tipo de cambio en tu rentabilidad en soles.",
          "Diversificación: concentrar todo en una sola empresa aumenta el riesgo.",
          "Que el intermediario esté autorizado por el regulador de tu país.",
          "Tu plazo: los mercados pueden caer durante largos periodos.",
        ],
      },
      {
        heading: "Cómo registrarlos en MYKSH",
        paragraphs: [
          "En esta etapa el precio actual de acciones y ETFs se ingresa manualmente. Actualízalo cuando quieras ver la rentabilidad al día.",
          "Puedes consultar el precio de referencia en una herramienta de seguimiento, como Google Finance, y copiarlo a MYKSH.",
        ],
      },
    ],
    links: [
      { label: "Bolsa de Valores de Lima", url: "https://www.bvl.com.pe" },
      {
        label: "Superintendencia del Mercado de Valores (SMV)",
        url: "https://www.smv.gob.pe",
      },
    ],
  },
  {
    slug: "fondos-mutuos",
    title: "Fondos mutuos: cómo funcionan",
    summary:
      "Cuotas, valor cuota, rescates y qué comparar entre fondos.",
    level: "Básico",
    readMinutes: 4,
    sections: [
      {
        heading: "Cómo funcionan",
        paragraphs: [
          "En un fondo mutuo, muchas personas juntan su dinero y una administradora lo invierte según una política definida. Tu participación se expresa en cuotas.",
          "El valor de la cuota cambia con el rendimiento de las inversiones del fondo. Tu saldo es la cantidad de cuotas multiplicada por el valor cuota vigente.",
        ],
      },
      {
        heading: "Qué comparar",
        bullets: [
          "Perfil de riesgo y tipo de inversiones del fondo.",
          "Comisiones y costos.",
          "Plazo mínimo recomendado y condiciones de rescate.",
          "Moneda del fondo.",
          "Rentabilidades pasadas: sirven como referencia, no garantizan resultados futuros.",
        ],
      },
      {
        heading: "Cómo registrarlos en MYKSH",
        paragraphs: [
          "Registra el nombre del fondo, la cantidad de cuotas, el valor cuota al comprar y el valor cuota actual. Actualiza el valor cuota cuando tu administradora lo publique.",
        ],
      },
    ],
    links: [
      {
        label: "Superintendencia del Mercado de Valores (SMV)",
        url: "https://www.smv.gob.pe",
      },
    ],
  },
  {
    slug: "plazo-fijo",
    title: "Depósitos a plazo fijo",
    summary:
      "Capital, tasa, plazo, intereses y protección del Fondo de Seguro de Depósitos.",
    level: "Básico",
    readMinutes: 4,
    sections: [
      {
        heading: "Cómo funciona",
        paragraphs: [
          "Depositas un capital en una entidad financiera durante un plazo definido y recibes intereses según una tasa acordada. Normalmente el rendimiento es más predecible que en acciones o criptomonedas.",
        ],
      },
      {
        heading: "Qué comparar",
        bullets: [
          "La tasa: compara la TREA (Tasa de Rendimiento Efectiva Anual), que permite contrastar entre entidades.",
          "El plazo y qué ocurre si necesitas retirar antes del vencimiento.",
          "La moneda del depósito.",
          "La solidez de la entidad y si es miembro del Fondo de Seguro de Depósitos.",
        ],
      },
      {
        heading: "Protección del Fondo de Seguro de Depósitos",
        paragraphs: [
          "El Fondo de Seguro de Depósitos (FSD) protege los depósitos nominativos hasta un monto máximo por persona y por entidad. Para el periodo setiembre–noviembre de 2026 ese monto es de S/ 123,000, y se actualiza cada trimestre.",
          "Como la cobertura se aplica por entidad, si tu ahorro supera el monto puedes repartirlo entre más de una entidad. Consulta siempre el monto vigente en el sitio del FSD.",
        ],
      },
      {
        heading: "Cómo registrarlo en MYKSH",
        paragraphs: [
          "Registra la institución, el capital depositado, la tasa anual y la fecha de vencimiento. Así puedes seguir cuándo termina tu depósito.",
        ],
      },
    ],
    links: [
      {
        label: "Fondo de Seguro de Depósitos: cobertura",
        url: "https://fsd.org.pe/cobertura/",
      },
      {
        label: "Superintendencia de Banca, Seguros y AFP (SBS)",
        url: "https://www.sbs.gob.pe",
      },
    ],
  },
  {
    slug: "google-finance",
    title: "Google Finance: seguimiento de mercados",
    summary:
      "Cómo usarlo como herramienta de consulta complementaria a MYKSH.",
    level: "Básico",
    readMinutes: 3,
    sections: [
      {
        heading: "Para qué sirve",
        paragraphs: [
          "Google Finance permite consultar cotizaciones, gráficos y noticias de acciones, ETFs, índices y otros activos. Con una cuenta de Google también permite organizar tus activos en listas de seguimiento.",
          "Su interfaz cambia con frecuencia, por lo que conviene seguir las indicaciones que muestre la propia herramienta.",
        ],
      },
      {
        heading: "Cómo se relaciona con MYKSH",
        bullets: [
          "MYKSH no se conecta a Google Finance ni te pide credenciales de Google.",
          "Úsalo para consultar precios de referencia y copiarlos a MYKSH cuando registres acciones o ETFs.",
          "Los precios pueden mostrarse con distinta hora o retraso entre herramientas, por lo que pequeñas diferencias son normales.",
        ],
      },
      {
        heading: "Recomendación",
        paragraphs: [
          "Mantén tu registro principal en MYKSH y usa Google Finance para investigar. Si tienes activos en ambos lugares, revisa periódicamente que las cantidades coincidan.",
        ],
      },
    ],
    links: [
      { label: "Google Finance", url: "https://www.google.com/finance" },
    ],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((guide) => guide.slug === slug);
}
