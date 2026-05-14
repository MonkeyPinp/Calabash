# Calabash

<p align="center">
  <img src="app/public/calabash-logo-light.png" width="96" alt="Calabash logo" />
</p>

> Un tablero de relaciones sin spoilers para lectores de misterio.

[Demo en vivo](https://guesswhat-studio.github.io/Calabash/) · [Reportar un problema](https://github.com/Guesswhat-Studio/Calabash/issues/new/choose) · Versión `0.1.3`

Idiomas: [English](README.md) · [简体中文](README.zh-CN.md) · **Español** · [Português (Brasil)](README.pt-BR.md)

![Calabash demo screenshot](docs/assets/calabash-demo.png)

## Qué Es

Calabash es un tablero local-first para registrar personajes, alias, pistas, relaciones y teorías mientras lees. Su nombre viene de la pipa calabash asociada con Sherlock Holmes: la herramienta no resuelve el caso por ti, pero te acompaña mientras piensas.

La demo pública actual funciona completamente en el navegador. No hay cuentas, base de datos de lectores alojada ni guardado en servidor.

## Sin IA, Por Diseño

Las novelas detectivescas no son problemas para delegar. Son problemas para habitar.

Calabash es deliberadamente manual. No extrae personajes automáticamente, no resume la trama y no clasifica sospechosos por ti. Cada personaje que añades es alguien que decidiste observar; cada relación que dibujas es una hipótesis; cada cambio de sospechada a confirmada es una pequeña victoria de atención.

## Funciones Principales

- **Control de capítulos**: avanza por el libro y ve solo lo que sabías en ese capítulo.
- **Escudo anti-spoilers**: cubre capítulos con revelaciones hasta que decidas descubrirlos.
- **Mapa de personajes**: registra retratos, alias, roles, ocupaciones, apariciones y notas.
- **Certeza de relaciones**: marca conexiones como confirmadas, sospechadas o descartadas.
- **Campos abiertos**: los roles y tipos de relación son sugerencias, no límites.
- **Notas adhesivas**: guarda pistas, coartadas, teorías y recordatorios cerca del tablero.
- **Biblioteca local**: guarda libros en IndexedDB y respáldalos con Exportar/Importar.
- **Tutoriales incluidos**: prueba *The Murder of Roger Ackroyd* o *Hida Trick House Murder Case*.
- **Interfaz multilingüe**: inglés, chino simplificado, español y portugués de Brasil.

## Datos Y Privacidad

Calabash es local-first:

- Tus libros se guardan en tu navegador con IndexedDB.
- Tema, idioma y guía inicial usan localStorage.
- Otros visitantes de la demo no pueden cambiar tu tablero, y tú no puedes cambiar el suyo.
- Durante la beta, borrar los datos del sitio en el navegador puede eliminar tu biblioteca local.
- Usa **Export Library** como copia de seguridad e **Import Library** para mover tus datos.

## Inicio Rápido

1. Abre la [demo en vivo](https://guesswhat-studio.github.io/Calabash/).
2. Elige el tutorial de Ackroyd, el tutorial de Kindaichi o un libro en blanco.
3. Pulsa `N` para añadir un personaje.
4. Selecciona un personaje, pulsa `E` y haz clic en otro para crear una relación.
5. Mueve el control de capítulos mientras lees.
6. Exporta tu biblioteca cuando quieras una copia de seguridad.

## Para Quién Es

Calabash es para lectores que disfrutan hacer el trabajo detectivesco:

- Lectores de misterio clásico: Agatha Christie, Ellery Queen, John Dickson Carr, S. S. Van Dine.
- Fans de manga y series de misterio con alias, identidades ocultas y revelaciones tardías.
- Lectores de ficción con muchos personajes: fantasía, novela histórica, sagas familiares, thrillers políticos.
- Cualquiera que quiera una herramienta privada, tranquila y sin cuenta para pensar con una historia.

Calabash no es un tracker de libros, lector de ebooks, herramienta de escritura, resumidor de IA ni plataforma social.

## Desarrollo

La app vive en `app/` y usa Vite + React.

```bash
cd app
npm install
npm run dev
npm run typecheck
npm test
npm run build
```

## Roadmap

El roadmap del producto no se mantiene dentro del repositorio público. La planificación pública debe vivir en [GitHub Projects](https://github.com/orgs/Guesswhat-Studio/projects); GitHub Issues queda para bugs, feedback beta y propuestas.

## Versión

Calabash usa versionado beta `0.x`. `0.1.3` refuerza los avisos de almacenamiento beta, la cobertura con fixture de importación/exportación y la validación de release.

## License

MIT
