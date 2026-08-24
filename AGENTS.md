<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Instrucciones permanentes para Codex

## Comunicación y forma de trabajo

- El usuario no sabe programar. Explicar todo en español claro, sin exigir conocimientos técnicos previos.
- Codex tiene acceso directo al repositorio y debe editar los archivos por sí mismo. No pedirle al usuario que busque líneas ni que copie código manualmente, salvo que exista un bloqueo real.
- Nunca asumir el contenido de un archivo: leer siempre su versión real antes de modificarlo.
- Preservar los cambios existentes del usuario y no tocar archivos ajenos a la tarea.
- Mantener los cambios concentrados y evitar refactorizaciones no solicitadas.
- Dividir los cambios grandes en etapas pequeñas y verificables.
- Distinguir claramente los datos verificados de las opiniones o estimaciones.
- No borrar, descartar, sobrescribir ni restaurar cambios sin autorización.
- No exponer secretos, claves ni variables privadas.

## Verificación y cierre de tareas

- Ejecutar las comprobaciones pertinentes. Para cambios TypeScript, incluir `npx tsc --noEmit`.
- Compilar no demuestra que una función opere correctamente. No afirmar que algo funciona hasta contar con una prueba real.
- Para cambios visuales o de comportamiento, pedir al usuario una prueba real en el navegador y el resultado exacto.
- No dar una tarea por cerrada solamente porque el código parece correcto.

## Git y colaboración

- No hacer `git push`, `git merge` ni abrir un pull request sin autorización explícita.
- Antes de cualquier `git push`, verificar la rama, el destino y `git status`.
- No reescribir historial publicado: no hacer force push ni rebase, amend o squash de commits ya publicados.

## Fuentes de verdad

- Los archivos reales del repositorio y las migraciones aplicadas tienen prioridad sobre documentos históricos y sobre `repomix-output.xml`.
- `repomix-output.xml` puede servir únicamente como referencia y puede estar desactualizado.

## Contexto técnico verificado al 17 de agosto de 2026

- El producto se presenta en la interfaz como **Director Técnico de Fútbol**.
- La etapa más reciente del historial está centrada en **Torneos**.
- La reconexión actualiza el heartbeat y limpia el indicador de desconexión; el procesamiento del servidor también cancela la desconexión si detecta que el heartbeat volvió.
- Los partidos online no ofrecen avance manual durante el partido: el dispositivo controlador dispara el avance automáticamente.
- Los partidos online de torneo también avanzan automáticamente, tanto mediante el proceso programado del servidor como mientras se observa el partido en vivo.
- La administración y la modificación de horarios de torneos están protegidas en la base de datos. Los horarios se asignan mediante la función segura `asignar_hora_partido_torneo`, que valida autenticación, permisos de administrador, estado pendiente y conflictos de horario.
- El Hub del torneo muestra un calendario con todos los partidos pendientes, ordenados por ronda.
- Los administradores del torneo pueden asignar o editar horarios de partidos pendientes. Los usuarios que no son administradores ven el calendario sin los controles de edición.
- Los consejos de IA se generan por equipo humano, no para bots, y la pantalla online filtra los consejos para mostrar a cada jugador solamente los de su equipo.
- Este contexto describe el estado observado en el commit `f7ca132` (`Permitir editar horarios de todos los partidos pendientes`). Debe volver a verificarse en los archivos reales y el historial antes de usarlo en tareas futuras.


## Nueva etapa: desarrollo del Modo Club

El proyecto incorporará un Modo Club online de gestión de una temporada.

Antes de modificar código relacionado con esta etapa, leer:

- docs/MODO_CLUB_V1.md
- docs/REFERENCIAS_VISUALES.md
- docs/PROGRESO_MODO_CLUB.md

Si posteriormente existen, también leer los documentos específicos de:

- Economía.
- Estadísticas.
- Mercado.
- Subastas.
- Motor del partido.
- Tácticas.
- Instalaciones.
- Base de datos de clubes.
- Plan de trabajo.

### Prioridad de instrucciones

1. Decisiones expresas del propietario del proyecto.
2. Documentación del Modo Club.
3. Arquitectura y funcionalidades existentes.
4. Referencias visuales o funcionales de otros juegos.

No inventar decisiones que no estén definidas.
Cuando exista una duda importante, marcarla como pendiente.

### Estado del repositorio

La rama main es la referencia principal y contiene la versión más
actualizada del proyecto publicada en GitHub.

Antes de modificar una funcionalidad:

- Revisar el código existente.
- Identificar componentes reutilizables.
- Evitar duplicar sistemas.
- Preservar el funcionamiento actual.
- Mantener las funcionalidades existentes de torneos.
- Ejecutar las pruebas o verificaciones disponibles.

### Identidad del producto

- Simulador de director técnico y gestión futbolística.
- Modo Club diferenciado del resto de la aplicación.
- Estética principal inspirada en Top Eleven.
- Gestión inspirada parcialmente en OSM.
- Estadísticas inspiradas en SofaScore.
- Diseño adaptable a computadora y celular.
- Modo Club preferentemente horizontal.

### Reglas del producto

- Sin moneda prémium.
- Sin tokens.
- Sin pagos para obtener ventajas.
- Sin aceleraciones pagas.
- Sin chat dentro del Modo Club.
- Sin chat dentro de torneos.
- Sin chat dentro de partidos.
- Partidas privadas mediante código.
- Equipos actuales e históricos.
- Equipos personalizados solamente si los aporta el administrador.
- Copias independientes de clubes y jugadores por temporada.
- Moral y fatiga relevantes.
- Economía coherente y sin endeudamiento en la primera versión.
- Velocidad online de partido x10.
- Estadísticas basadas en eventos reales del motor.
- Las reglas de cada temporada deben conservarse una vez iniciada.

### Seguridad

- No exponer secretos ni credenciales.
- No modificar archivos .env para incorporarlos al repositorio.
- Validar permisos administrativos.
- Validar operaciones económicas en servidor.
- Respetar las políticas de acceso de Supabase.
- Evitar operaciones destructivas.
- No modificar repomix-output.xml salvo que la tarea lo solicite
  expresamente.

### Seguimiento

Al finalizar cada tarea:

1. Explicar qué se implementó.
2. Listar los archivos modificados.
3. Informar qué pruebas se ejecutaron.
4. Señalar pendientes.
5. Actualizar docs/PROGRESO_MODO_CLUB.md cuando corresponda.