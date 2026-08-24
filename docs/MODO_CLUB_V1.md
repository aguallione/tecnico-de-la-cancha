# Especificación del Modo Club — Versión 1

Este documento contiene las decisiones de diseño y desarrollo del
Modo Club del proyecto Director Técnico de Fútbol.

Las decisiones expresas del propietario del proyecto tienen prioridad
sobre sugerencias, interpretaciones o referencias de otros juegos.

Cuando una cuestión no esté definida, debe marcarse como pendiente
y no inventarse.

MANUAL MAESTRO DEL PROYECTO
Juego de director técnico de fútbol y desarrollo del Modo Club
Este manual está pensado para que puedas organizar, dirigir, revisar y terminar el proyecto aunque no sepas programar.
La idea es que no dependas de recordar conversaciones anteriores ni de improvisar cada vez que abras Codex. Acá están reunidos:
Qué estamos construyendo.
Qué decisiones ya quedaron tomadas.
Qué cosas son obligatorias.
Qué cosas pueden esperar.
Qué referencias visuales usar.
Cómo trabajar con Codex.
Qué archivos necesita el proyecto.
Qué mensajes enviar.
Qué verificar después de cada tarea.
Cuánto podría tardar cada bloque.
Cómo aprovechar el tiempo mientras estás en el colegio o durmiendo.
Cómo evitar errores, pérdidas de información, gastos inesperados y problemas de seguridad.
Cómo publicar una primera versión funcional.
Cómo continuar después de que termine tu suscripción.
La decisión visual más importante es esta:
Top Eleven será la referencia principal para la estética y sensación de videojuego; OSM será referencia para la gestión del club; SofaScore será referencia para estadísticas, análisis y visualización de datos.
No se trata de copiar ninguno de esos productos: se trata de combinar las partes que mejor encajan con tu juego.

PARTE 1. IDENTIDAD DEL PROYECTO
1. Qué juego estamos haciendo
El proyecto es un simulador de dirección técnica y gestión de fútbol.
El usuario no controla directamente a los futbolistas con botones durante el partido. Su influencia viene de:
Seleccionar jugadores.
Organizar la formación.
Configurar tácticas.
Elegir especialistas.
Realizar sustituciones.
Administrar el plantel.
Gestionar dinero.
Comprar y vender futbolistas.
Organizar entrenamientos.
Mejorar instalaciones.
Interpretar estadísticas.
Tomar decisiones antes y durante los encuentros.
El juego busca combinar:
La profundidad táctica de un simulador de fútbol.
La gestión accesible de OSM.
La presentación visual y organización de Top Eleven.
La riqueza estadística de SofaScore.
Los modos locales y online que ya existen en tu proyecto.
La prioridad no es agregar muchísimas pantallas vacías. La prioridad es que las decisiones realmente produzcan efectos dentro del juego.
Ejemplo:
Si un manager mejora las instalaciones de entrenamiento, los entrenamientos deben mejorar realmente.
Si compra un delantero mejor, eso debe influir en el rendimiento.
Si pone entradas demasiado caras, la asistencia debe reducirse.
Si un futbolista llega cansado, su rendimiento debe verse afectado.
Si un usuario modifica una táctica, esa modificación debe influir en el partido.

2. Qué es el Modo Club
El Modo Club es una sección separada dentro de la aplicación.
En este modo, varios usuarios participan en una temporada privada donde cada uno gestiona un club.
Una temporada puede incluir:
Liga.
Copa.
Liga y copa.
Cada manager administra su propio equipo dentro de esa partida.
El modo es independiente de otras temporadas.
Eso significa que:
El dinero de una temporada no pasa a otra.
Los fichajes de una temporada no pasan a otra.
Las instalaciones mejoradas de una temporada no pasan a otra.
Los jugadores modificados de una temporada no alteran la base global.
Sí pueden conservarse en el perfil general:
Títulos.
Historial.
Estadísticas online.
Rendimiento como manager.
Logros.
Resultados obtenidos.
Pero esos antecedentes no deben dar ventajas económicas o deportivas al iniciar otra partida.

3. Qué significa que la versión sea pública
Hay una diferencia importante:
Aplicación pública no significa torneos públicos.
La aplicación puede estar publicada y accesible para cualquier persona, mientras que las partidas del Modo Club siguen siendo privadas.
Por lo tanto:
Cualquier usuario autorizado puede entrar a la aplicación.
Las temporadas se crean como partidas privadas.
Para participar se utiliza un código.
El creador decide quién entra.
Los administradores pueden aprobar solicitudes si esa opción está habilitada.
Las competiciones públicas abiertas a desconocidos quedan para una etapa posterior.

4. Lo que no puede aparecer en el juego
Estas reglas deben permanecer visibles en la documentación del proyecto:
No habrá moneda premium.
No habrá tokens comprables.
No habrá ventajas pagas.
No habrá mejoras instantáneas compradas con dinero real.
No habrá jugadores adquiribles mediante pagos externos.
No habrá pago para ganar partidos.
No habrá recompensas materiales por logros externos.
No habrá compras que alteren el equilibrio competitivo.
No habrá chat dentro de los partidos.
No habrá chat dentro del Modo Club.
No habrá chat interno del torneo.
No habrá audio obligatorio.
No habrá pausas individuales durante encuentros online.
Puede existir chat privado general de la aplicación entre amigos, pero no integrado dentro del torneo o partido.
La regla central es:
Si una función permite comprar una ventaja deportiva con dinero real, no pertenece a este proyecto.

PARTE 2. REFERENCIAS VISUALES Y FUNCIONALES
5. Referencia visual principal: Top Eleven
Tu nueva preferencia queda definida así:
El juego debe sentirse visualmente más cercano a Top Eleven que a OSM.
Eso no significa que deba verse idéntico. Significa que debe transmitir una sensación más clara de videojuego deportivo.
Características visuales que conviene tomar como referencia:
Interfaz de gestión futbolística.
Paneles bien definidos.
Cancha protagonista en la formación.
Tarjetas de ejercicios.
Indicadores de estado.
Elementos visuales con profundidad.
Botones claros.
Distribución horizontal.
Sensación de club y gestión.
Colores asociados a categorías.
Vistas con información abundante, pero organizada.
Elementos gráficos que permitan entender rápidamente el estado del equipo.
En una pantalla de formación, por ejemplo:
La cancha debe verse claramente.
Los jugadores deben poder identificarse.
Las posiciones deben estar organizadas.
La formación debe poder modificarse.
Deben verse avisos por incompatibilidades.
Los suplentes deben estar accesibles.
Sin embargo, no hay que reproducir literalmente:
Los logos de Top Eleven.
Sus personajes.
Sus ilustraciones originales.
Sus marcas.
Sus anuncios.
Sus monedas premium.
Sus diseños exclusivos.
Sus imágenes promocionales.
La instrucción correcta para Codex es:
Inspirate en la organización y sensación visual de Top Eleven, pero construí una identidad propia.

6. Referencia funcional de gestión: OSM
OSM sirve especialmente para entender:
Cómo se organiza una plantilla.
Cómo funciona la lista de transferibles.
Cómo se muestran los clubes rivales.
Cómo se presenta el personal.
Cómo funciona un médico.
Cómo funciona un abogado.
Cómo se consulta la clasificación.
Cómo se muestran objetivos.
Cómo se organiza una temporada.
Cómo se presenta el análisis del rival.
Cómo progresa el mercado.
De OSM nos interesan principalmente las ideas de funcionamiento.
No queremos copiar:
Tokens.
Aceleraciones pagas.
Ventajas comprables.
Publicidad invasiva.
Personajes necesariamente iguales.
Restricciones que no encajen con tu juego.

7. Referencia estadística: SofaScore
Las capturas nuevas muestran con mucha precisión qué profundidad estadística te interesa.
SofaScore sirve como referencia para:
Estadísticas comparadas entre equipos.
Estadísticas por primer y segundo tiempo.
Gráfico de momento del partido.
Mapa de disparos.
Mapa de ataques.
Mapa de distribución por sectores.
Alineaciones sobre cancha.
Valoraciones individuales.
Eventos del encuentro.
Clasificaciones de jugadores.
Filtros estadísticos.
Totales.
Promedios por partido.
Valores cada 90 minutos.
Categorías de ataque, defensa, pases y arqueros.
Ordenamiento por cualquier columna.
Filtrado por posición.
Filtrado por club.
Filtrado por edad.
Comparación entre futbolistas.
Pero hay una regla técnica fundamental:
El juego solamente debe mostrar estadísticas que realmente pueda obtener de su motor o de sus eventos registrados.
No hay que inventar datos.
Si el motor registra disparos, se pueden mostrar disparos.
Si registra ubicación de disparos, se puede construir un mapa.
Si registra pases, se pueden calcular porcentajes de pases.
Si no registra una acción determinada, no corresponde mostrar un número inventado solamente para parecerse a SofaScore.

8. Jerarquía de referencias
Si las referencias parecen contradecirse, utilizar este orden:
Las reglas y decisiones específicas de tu proyecto.
Top Eleven para estética e interfaz de gestión.
SofaScore para estadísticas y visualizaciones.
OSM para organización y mecánicas de administración.
Otros juegos solamente como inspiración secundaria.
Ejemplo:
OSM muestra determinadas valoraciones de equipos rivales.
Pero vos decidiste que una temporada puede configurarse para ocultarlas.
Entonces:
Se puede utilizar la presentación tipo OSM.
Pero la privacidad definida por tu juego tiene prioridad.
Otro ejemplo:
Top Eleven permite monedas premium.
Tu proyecto no.
Entonces:
Se puede utilizar una pantalla inspirada en Top Eleven.
Pero las monedas premium no deben aparecer.

PARTE 3. FUNCIONES CONFIRMADAS DEL MODO CLUB
9. Creación de partidas
El flujo esperado es:
El usuario entra al Modo Club.
Elige crear partida.
Define configuración.
Selecciona clubes disponibles.
Se genera un código.
Los demás usuarios ingresan con ese código.
Aparecen en una sala de espera.
Eligen equipos o esperan asignación.
El creador inicia la temporada.
Se genera el calendario.
Comienzan los partidos.
Configuraciones importantes:
Formato de competición.
Cantidad de equipos.
Clubes disponibles.
Exclusividad de clubes.
Participación de bots.
Información visible.
Método de selección.
Tipo de mercado.
Ingresos posteriores al inicio.
Nivel de ayuda automática.
Reglas básicas del torneo.
La configuración debe estar disponible antes de elegir equipos.

10. Administradores
El creador es el propietario de la partida.
Puede:
Nombrar administradores.
Retirar permisos.
Expulsar participantes.
Aprobar ingresos.
Modificar horarios.
Administrar equipos.
Iniciar la temporada.
Los administradores adicionales pueden tener permisos configurables.
Recomendación inicial:
El creador conserva máxima autoridad.
Un administrador puede aprobar solicitudes ordinarias.
Los cambios quedan registrados.
Los participantes pueden consultar el historial relevante.
Un partido ya iniciado no puede reprogramarse.
Si el creador simplemente se desconecta, no pierde su rol.
Si abandona definitivamente, la propiedad debe transferirse siguiendo reglas claras.
Orden recomendado:
Coadministrador existente.
Participante activo más antiguo.
Otro mecanismo documentado si no hay candidatos.

11. Participantes y espectadores
Los usuarios pueden participar como:
Managers de clubes.
Administradores.
Espectadores, si la configuración lo permite.
Un espectador:
Puede observar información pública.
No puede modificar equipos.
No puede acceder a tácticas privadas.
No puede consultar negociaciones confidenciales.
No puede ver valoraciones ocultas.
No puede usar un chat interno inexistente.
Un administrador puede decidir si se requieren aprobaciones para nuevos ingresos.

12. Equipos actuales e históricos
La base del juego incluirá:
Equipos actuales.
Equipos históricos.
Jugadores actuales.
Versiones históricas de jugadores.
Ejemplo:
Pueden existir:
Barcelona 2009.
Barcelona 2015.
En ambos equipos puede existir Messi, pero con:
Edad diferente.
Valoración diferente.
Atributos diferentes.
Contexto histórico diferente.
Esas versiones deben tratarse como registros independientes.
No corresponde modificar una versión histórica cuando cambia otra.

13. Equipos creados por usuarios
El creador de la partida podrá incorporar equipos propios permitidos por la configuración.
Los demás participantes no podrán cargar libremente sus propios clubes dentro de esa temporada.
Esto evita:
Equipos exageradamente fuertes.
Ediciones injustas.
Plantillas manipuladas.
Problemas de equilibrio.
Si un usuario quiere participar, debe elegir uno de los clubes habilitados por el creador.

14. Selección de equipos
Opciones iniciales:
Elección por orden de llegada.
Asignación manual por el administrador.
Opciones futuras:
Sorteo.
Draft.
Orden aleatorio.
Selección automática equilibrada.
En partidas con clubes exclusivos:
Un equipo solamente puede pertenecer a un manager.
Si dos personas intentan elegirlo al mismo tiempo, una sola debe conseguirlo.
Esa decisión debe validarse en el servidor o base de datos.
No alcanza con ocultar el botón visualmente: la exclusividad debe quedar realmente protegida.

15. Bots
Los bots sirven principalmente para completar equipos sin manager humano.
Deben:
Tener alineaciones válidas.
Jugar los partidos.
Realizar cambios básicos.
Mantener una gestión razonable.
Participar del mercado cuando corresponda.
Mejorar moderadamente.
No deben:
Tener información oculta.
Realizar fichajes imposibles.
Manejar dinero infinito.
Dominar sistemáticamente la competición.
Entrenar de manera perfecta las 24 horas.
Gestionar mejor que todos los humanos por diseño.
La competencia principal debe ocurrir entre personas.
Si un humano reemplaza a un bot:
Hereda el mismo club.
Conserva sus puntos.
Conserva resultados.
Conserva plantel.
Conserva dinero.
Conserva lesiones y sanciones.
Conserva calendario.
No empieza desde cero.

16. Liga y copa
Formatos base:
Liga solamente.
Copa solamente.
Liga y copa.
Liga:
Una vuelta.
Ida y vuelta.
Copa:
Eliminación directa.
Posibilidad futura de grupos.
Partido único o ida y vuelta, según alcance disponible.
Prórroga.
Penales.
Cuando existen liga y copa:
Los partidos deben intercalarse.
No deberían jugarse todas las jornadas de liga antes de comenzar la copa.
No debe permitirse una eliminatoria sin ningún mecanismo para definir al clasificado.

17. Horarios y velocidad de partido
Los encuentros online deben tener una velocidad compartida.
La relación definida es:
Velocidad x10.
Eso significa:
Un minuto simulado equivale aproximadamente a seis segundos reales.
Noventa minutos equivalen aproximadamente a nueve minutos reales.
Deben sumarse entretiempo, descuento, prórroga o penales cuando corresponda.
Todos los participantes deben observar el mismo momento del partido.
Si alguien entra cuando el partido está en el minuto 35, lo ve desde el minuto 35.
No puede:
Retroceder mientras el partido sigue en vivo.
Acelerarlo individualmente.
Pausarlo para modificar tácticas.
Saltarse el partido online.
Las repeticiones, si se implementan más adelante, sí podrían permitir:
Pausa.
Adelantar.
Retroceder.
Acelerar.

18. Plantillas
Cada club tendrá:
Titulares.
Suplentes.
No convocados.
Configuración recomendada:
Once titulares.
Banco configurable.
Referencia inicial de doce suplentes.
Capacidad para adaptarse a las reglas configuradas.
Los jugadores tendrán:
Nombre.
Edad.
Posición.
Valoración.
Atributos existentes.
Moral.
Condición física.
Dorsal.
Valor de mercado.
Estadísticas.
Estado de lesión.
Estado de sanción.
Los dorsales:
Deben ser enteros.
Deben tener uno o dos dígitos.
No deben mostrarse como 09; debe verse 9.
No deben repetirse dentro del mismo club.
Deben completarse automáticamente si el usuario no los asigna.

19. Formación y posiciones
El usuario debe poder:
Elegir formaciones existentes.
Crear formaciones personalizadas.
Mover jugadores de campo.
Intercambiar futbolistas.
Guardar configuraciones.
La posición del arquero permanece fija.
Importante:
Mover al arquero hacia una zona vacía no debe desplazar el puesto.
Si se intercambian ocupantes, debe quedar claro si hay incompatibilidad.
El sistema debe mostrar advertencias cuando un jugador queda fuera de su posición.
La penalización debe reutilizar las reglas que ya existen.
Tus capturas de Top Eleven muestran precisamente:
Zonas del campo.
Arrastre de jugadores.
Avisos de posición.
Intercambio entre futbolistas.
Indicadores visuales de incompatibilidad.
Eso sirve como referencia funcional.

20. Tácticas
El juego debe permitir tácticas amplias.
Categorías esperadas:
Ofensivas
Posesión.
Juego directo.
Pases cortos.
Pases largos.
Ataques por bandas.
Ataques centrales.
Ritmo.
Anchura.
Verticalidad.
Centros.
Movilidad.
Defensivas
Presión.
Altura de la línea.
Marcaje.
Intensidad.
Repliegue.
Compactación.
Agresividad.
Coberturas.
Transiciones
Contraataque.
Reacción tras pérdida.
Salida desde el fondo.
Despeje largo.
Reorganización defensiva.
Individuales
Instrucciones por posición.
Libertad ofensiva.
Incorporación al ataque.
Permanencia defensiva.
Seguimiento o referencia de marca cuando corresponda.
No hace falta que todas existan desde el primer día.
Pero las tácticas incluidas deben afectar realmente el motor.
No conviene agregar veinte controles visuales que después no modifican nada.

21. Especialistas
El equipo debe tener:
Capitán.
Pateador de penales.
Ejecutante de tiros libres.
Ejecutante de córners.
Si se puede:
Tiros libres cortos.
Tiros libres largos.
Córners por izquierda.
Córners por derecha.
Jerarquía de reemplazos.
Si el usuario no configura estos puestos, el sistema debe seleccionarlos automáticamente.
Los especialistas deben depender de atributos razonables.
No debería ser equivalente elegir:
Un excelente ejecutante de tiros libres.
Un defensor sin precisión de disparo.
El capitán puede influir moderadamente en:
Moral.
Liderazgo.
Estabilidad del equipo.

22. Moral
La moral debe existir aunque todavía no se implementen contratos o conversaciones complejas.
Puede verse afectada por:
Resultados.
Minutos jugados.
Rachas.
Lesiones.
Participación.
Rendimiento.
Situación colectiva.
Puede haber:
Moral individual.
Moral general del plantel.
Pero no debe exagerarse.
Un partido perdido no debería destruir completamente el rendimiento de todos los jugadores.

23. Fatiga
La condición física puede depender de:
Minutos jugados.
Intensidad táctica.
Entrenamientos.
Descanso.
Edad.
Recuperación.
Lesiones.
Frecuencia de partidos.
La recuperación debe avanzar con el tiempo.
Los futbolistas cansados:
Rinden peor.
Pueden tener mayor riesgo de lesión.
Deben mostrar una advertencia.
No se deben inventar recuperaciones instantáneas comprables.

24. Lesiones
Las lesiones:
Pueden ocurrir durante partidos.
Persisten entre encuentros.
Impiden entrenar cuando corresponda.
Pueden requerir tratamiento.
Deben estar reflejadas en la alineación.
El médico:
Trata jugadores lesionados.
Reduce tiempo de recuperación.
Utiliza un tiempo de tratamiento.
Puede mejorar mediante instalaciones o calidad del profesional.
No debe existir una opción de pago real para curar inmediatamente.

25. Sanciones
Las tarjetas generan consecuencias cuando corresponda.
Ejemplos:
Suspensión por expulsión.
Suspensión por acumulación.
Sanciones de varias jornadas en faltas graves.
El abogado puede:
Recurrir sanciones de más de un partido.
Presentar un recurso por caso.
Obtener una reducción.
Fracasar.
Encontrar sanciones no recurribles si son especialmente graves.
El resultado no debe depender de monedas premium.

PARTE 4. ECONOMÍA DEL MODO CLUB
26. Principio económico general
Toda la economía debe estar conectada.
El dinero debe relacionarse con:
Fichajes.
Personal.
Instalaciones.
Estadio.
Entradas.
Patrocinadores.
Premios.
Tratamientos.
Actividades de gestión.
No queremos varios sistemas aislados que no tengan sentido entre sí.
Ejemplo incorrecto:
Mejorar el estadio cuesta casi todo el presupuesto, pero después produce ingresos irrelevantes.
Ejemplo correcto:
Mejorar el estadio cuesta una cantidad importante, pero aumenta la capacidad y mejora los ingresos futuros de forma proporcional.
Las decisiones deben generar dudas razonables:
¿Compro un defensor?
¿Mejoro entrenamiento?
¿Amplío el estadio?
¿Contrato un médico?
¿Mantengo dinero disponible para una subasta?

27. Caja general
Para la primera versión recomiendo:
Una caja general para todos los gastos del club.
Inicialmente incluiría:
Fichajes.
Instalaciones.
Personal.
Gastos operativos definidos.
Ingresos deportivos.
Si más adelante se activan salarios de jugadores, puede incorporarse:
Reserva salarial.
Obligaciones futuras.
Presupuesto disponible.
Pero durante el desarrollo acelerado conviene evitar un sistema salarial complejo.
Fórmula conceptual:
Saldo disponible =
dinero actual
− dinero reservado para obligaciones confirmadas
− dinero comprometido en subastas activas
Nunca debe permitirse:
Saldo disponible < 0

28. Presupuesto inicial
El presupuesto inicial no debería depender solamente de la valoración del plantel.
Factores posibles:
Poder económico del club.
Nivel de la competición.
Valor del plantel.
Objetivos.
Instalaciones.
Equilibrio configurado.
Ingresos esperados.
Opciones:
Economía realista.
Economía equilibrada.
Economía personalizada.
Para partidas entre amigos, la recomendación inicial es:
Economía equilibrada.
Eso evita que un club fuerte además reciba una ventaja financiera desproporcionada.

29. Ingresos por entradas
Las entradas pueden depender de:
Capacidad del estadio.
Precio.
Importancia del encuentro.
Rival.
Rendimiento reciente.
Competición.
Expectativa del público.
Posición en tabla.
Clima, si se implementa.
El usuario puede fijar precios diferentes para:
Liga.
Copa.
Amistosos, solamente si existen.
Si el precio es demasiado alto:
Baja la asistencia.
Si el precio es demasiado bajo:
Puede llenarse el estadio, pero disminuir la recaudación potencial.
No tiene sentido permitir:
Asistencia superior a la capacidad.
Ingresos duplicados.
Entradas cobradas antes de un partido cancelado.
Recaudaciones negativas.

30. Patrocinadores
Tus capturas de Top Eleven muestran contratos:
Diarios.
Semanales.
Quincenales.
Hasta el final de la temporada.
Eso puede adaptarse.
Opciones iniciales:
Patrocinador de corta duración.
Patrocinador semanal.
Patrocinador de varias jornadas.
Patrocinador de temporada.
Cada oferta puede variar en:
Duración.
Pago fijo.
Bonificación por objetivos.
Estabilidad.
Exigencias.
Recomendación:
Las ofertas cortas pueden requerir más atención.
Las largas ofrecen estabilidad.
Ninguna opción debe ser siempre superior.
Para una primera versión pública, es más seguro utilizar:
Marcas ficticias.
Nombres originales.
Patrocinadores inventados.
No copiar logos de empresas reales sin autorización.

31. Personal y su pago
Profesionales básicos:
Médico.
Abogado.
Analista.
Ojeador, si llega a implementarse.
Entrenador especializado, si existe.
Para evitar problemas:
Inicialmente, un profesional por especialidad.
Costos transparentes.
Contratos simples.
Duraciones claras.
Una opción razonable:
Cobro por jornada o período definido.
Reserva automática del próximo pago.
No permitir contratar si el club no puede afrontar ese compromiso.
Otra opción todavía más simple para la primera versión:
Pagar por servicio realizado.
Ejemplos:
Tratamiento médico.
Recurso legal.
Informe de rival.
La decisión técnica debe documentarse antes de implementar, pero siempre respetando:
Ningún club puede quedar endeudado.

32. Instalaciones
Instalaciones prioritarias:
Estadio.
Centro de entrenamiento.
Área médica.
Cada instalación necesita:
Nivel.
Precio.
Tiempo.
Beneficio.
Estado de construcción.
Restricción económica.
Estadio:
Aumenta capacidad.
Mejora recaudación.
Puede influir moderadamente en localía.
Entrenamiento:
Mejora sesiones.
Favorece desarrollo.
Área médica:
Reduce recuperación.
Mejora tratamiento.
No incorporar inicialmente:
Academia de juveniles.
Construcciones decorativas sin utilidad.
Decenas de edificios.
Mapas 3D costosos.
Mejoras ilimitadas desbalanceadas.

PARTE 5. MERCADO DE FICHAJES
33. Lista de transferibles
La lista pertenece exclusivamente a cada temporada.
No debe mezclarse con otros torneos.
Puede incluir:
Jugadores externos disponibles.
Jugadores publicados por clubes humanos.
Jugadores publicados por bots.
Debe mostrar:
Posición.
Nombre.
Edad.
Club.
Valoración, si está permitido.
Precio.
Estado de la operación.
Puede organizarse por:
Delanteros.
Mediocampistas.
Defensores.
Arqueros.
La renovación debe ser gradual.
No es necesario eliminar todos los futbolistas de una vez.
Lo razonable:
Algunos jugadores salen.
Aparecen otros.
Se conserva cierta continuidad.
La oferta progresa con el desarrollo de la temporada.

34. Venta al sistema
Si un manager publica un futbolista:
Puede comprarlo otro humano.
Puede comprarlo un bot.
Puede comprarlo el sistema externo.
Si el futbolista no está publicado:
El sistema externo no puede adquirirlo automáticamente.
Otros clubes internos podrían ofrecer negociaciones si esa función existe.
Esta diferencia es importante.
Publicar un jugador:
Autoriza disponibilidad comercial.
No publicarlo:
No autoriza venta automática externa.

35. Compra inmediata
La compra inmediata debe ser el primer sistema comercial implementado.
Reglas:
El comprador necesita saldo suficiente.
El vendedor debe recibir el dinero.
El jugador cambia de club.
La publicación desaparece.
Se actualiza la plantilla.
Se actualiza la alineación si corresponde.
Dos usuarios no pueden comprar simultáneamente al mismo futbolista.
La operación debe validarse realmente, no solamente en pantalla.

36. Subastas
Las subastas pueden durar:
5 minutos.
10 minutos.
15 minutos.
30 minutos.
60 minutos.
Incremento recomendado:
2,5 % aproximadamente.
Protección final:
Duración
Tiempo restaurado ante una oferta tardía
5 minutos
10 segundos
10 minutos
15 segundos
15 minutos
20 segundos
30 minutos
30 segundos
60 minutos
60 segundos

Ejemplo:
Una subasta de cinco minutos llega a dos segundos.
Un usuario puja.
El reloj vuelve a diez segundos.
No debe existir:
Compra de fichas para pujar.
Moneda premium.
Ventaja por dinero real.
Oferta superior al saldo.
Adjudicación duplicada.
Venta sin jugador disponible.
La interfaz debe mostrar:
Jugador.
Oferta actual.
Próxima oferta mínima.
Tiempo restante.
Pujadores.
Historial.
Resultado final.

37. Dinero comprometido en subastas
Caso peligroso:
Un usuario tiene 10 millones y participa en tres subastas ofreciendo 9 millones en cada una.
Si gana las tres, debería pagar 27 millones, pero solamente tiene 10.
Por eso existen dos caminos:
Reservar fondos comprometidos.
Validar nuevamente al cierre y evitar compromisos incompatibles.
La recomendación es:
Mostrar claramente el saldo disponible después de descontar ofertas vigentes comprometidas.

PARTE 6. ESTADÍSTICAS TIPO SOFASCORE
38. Qué muestran tus capturas nuevas
Las capturas muestran una estructura estadística bastante completa.
Se observan:
Resumen general del partido.
Posesión.
Grandes ocasiones.
Tiros totales.
Atajadas.
Córners.
Faltas.
Pases.
Entradas.
Tiros libres.
Tarjetas.
Valoración promedio.
Mapa de disparos.
Detalle de cada remate.
Gráfico de momento.
Mapa de ataques.
Clasificación de jugadores.
Filtros por categoría.
Comparación entre tiempos.
Alineaciones.
Notas individuales.
Eventos cronológicos.
También aparecen filtros por:
Ataque.
Defensa.
Pases.
Arqueros.
Otros.
Posición.
Equipo.
Edad.
Totales.
Por partido.
Cada 90 minutos.
Una de las imágenes aparece prácticamente vacía; no es necesario usarla.

39. Estadísticas obligatorias para la primera versión
Prioridad alta:
Resultado.
Goles.
Minutos de los goles.
Asistencias, si el motor las registra.
Posesión.
Tiros.
Tiros al arco.
Tiros desviados.
Córners.
Faltas.
Tarjetas amarillas.
Tarjetas rojas.
Sustituciones.
Atajadas.
Valoraciones individuales básicas.
Tabla de posiciones.
Goleadores.
Estadísticas de cada jugador.
Estadísticas acumuladas del torneo.
Estas métricas forman el núcleo mínimo.

40. Estadísticas deseables si el motor lo permite
Segundo nivel:
Grandes ocasiones.
Tiros bloqueados.
Pases completos.
Pases intentados.
Porcentaje de precisión.
Entradas ganadas.
Intercepciones.
Recuperaciones.
Duelos.
Duelos aéreos.
Faltas recibidas.
Pérdidas.
Regates.
Centros.
Saques de banda.
Despejes.
Ataques por banda.
Ataques por el centro.
No se deben implementar números ficticios para completar una tabla.

41. Estadísticas avanzadas
Etapa posterior:
xG.
xGOT.
Mapas de calor individuales.
Redes completas de pases.
Presión por zonas.
Probabilidad de gol por acción.
Trayectorias detalladas.
Análisis táctico automatizado.
Secuencias de posesión complejas.
Para calcularlas se necesitan datos adicionales.
Ejemplo:
No puede calcularse un mapa de calor real si el motor nunca guarda posiciones de los jugadores.
No puede estimarse razonablemente el xG si no se conoce:
Ubicación del disparo.
Distancia.
Ángulo.
Contexto.
Tipo de remate.
Por eso:
Primero se registran eventos correctamente; después se construyen visualizaciones.

42. Mapa de disparos
Si el motor registra ubicación de disparos, el mapa puede mostrar:
Lugar del remate.
Equipo.
Jugador.
Minuto.
Resultado.
Gol.
Atajada.
Desviado.
Bloqueado.
Al seleccionar un disparo:
Nombre del futbolista.
Minuto.
Zona.
Tipo de acción.
Resultado.
La visualización puede inspirarse en SofaScore.
Pero no debe copiar su identidad exacta.

43. Gráfico de momento
El gráfico de momento representa qué equipo domina distintos períodos del partido.
Puede construirse a partir de:
Ataques.
Remates.
Acciones peligrosas.
Recuperaciones avanzadas.
Posesiones ofensivas.
Debe calcularse con datos reales del partido.
No se recomienda dibujarlo aleatoriamente.

44. Estadísticas por tiempo
La pantalla puede ofrecer:
Partido completo.
Primer tiempo.
Segundo tiempo.
Si existe prórroga:
Prórroga.
Tiempo adicional.
Esto requiere guardar el minuto de cada evento.

45. Clasificación de futbolistas
La clasificación debe permitir:
Ordenar por goles.
Ordenar por asistencias.
Ordenar por nota.
Ordenar por pases.
Ordenar por entradas.
Ordenar por atajadas.
Filtrar por posición.
Filtrar por club.
Filtrar por cantidad mínima de partidos.
Ver totales.
Ver promedio por partido.
Ver estadísticas cada 90 minutos.
La fórmula de la nota puede permanecer oculta al usuario.
Pero internamente debe estar basada en acciones reales y adaptada a la posición.
No debería evaluarse igual a:
Un arquero.
Un defensor.
Un mediocampista.
Un delantero.

PARTE 7. QUÉ SE HACE EN 20 DÍAS Y QUÉ NO
46. Objetivo real de los 20 días
El objetivo razonable es:
Publicar una primera versión jugable del Modo Club, conectada al proyecto actual y capaz de completar una temporada.
No significa:
Implementar absolutamente todas las ideas imaginadas con máxima profundidad.
La versión inicial debe poder demostrar:
Crear partida.
Invitar personas.
Elegir clubes.
Programar temporada.
Configurar equipo.
Disputar partidos.
Actualizar tabla.
Comprar y vender.
Entrenar.
Gestionar dinero.
Tratar lesiones.
Mejorar instalaciones básicas.
Consultar estadísticas.

47. Funciones obligatorias
Prioridad máxima:
Proyecto actual sin romper.
Torneos actuales funcionando.
Acceso al Modo Club.
Partida privada.
Código de acceso.
Usuarios y permisos.
Equipos.
Copia de plantillas.
Liga.
Calendario.
Partidos.
Tabla.
Tácticas.
Moral.
Fatiga.
Mercado básico.
Economía.
Entrenamiento inicial.
Estadísticas principales.

48. Funciones importantes pero recortables
Si aparece falta de tiempo:
Subastas.
Copa con grupos.
Analista avanzado.
Abogado completo.
Mapa de disparos detallado.
Filtros estadísticos muy extensos.
Instalaciones visualmente elaboradas.
Contratos de patrocinio complejos.
Selección automática equilibrada.
Animaciones avanzadas.
Pueden existir versiones simplificadas.

49. Funciones que no deben bloquear la primera entrega
Dejar para después:
Contratos complejos.
Roles negociados.
Bandeja de mensajes completa.
Directiva narrativa.
Conversaciones ramificadas.
VAR avanzado.
Árbitros reales completos.
Repeticiones históricas ilimitadas.
Aplicación Android nativa.
Publicación en Play Store.
Asociaciones.
Ranking global.
Mapa 3D de instalaciones.
Modelos tridimensionales del personal.
Negociación comercial profundamente detallada.
Motor físico completamente nuevo.
Cientos de estadísticas no respaldadas por eventos.

PARTE 8. GLOSARIO PARA NO PROGRAMADORES
50. Repositorio
Es el lugar donde están guardados los archivos del proyecto.
En tu caso, el repositorio del juego está asociado a GitHub.
Pensalo como:
La carpeta principal del juego, pero con historial y control de cambios.

51. GitHub
Es la plataforma donde se guarda y organiza el código.
Permite:
Consultar archivos.
Ver historial.
Guardar cambios.
Trabajar con ramas.
Revisar modificaciones.
Recuperar versiones anteriores.

52. Rama
Una rama es una versión de trabajo del proyecto.
La rama principal de tu juego es:
main
Vos ya confirmaste que:
main es la versión más actual.
Esa decisión tiene prioridad.
No hay que asumir que otra rama es mejor solo por su nombre.

53. Commit
Un commit es un registro guardado de cambios.
Podés pensarlo como:
Una fotografía de una modificación del proyecto.
Sirve para:
Saber qué cambió.
Volver a versiones anteriores.
Evitar perder trabajo.
Revisar cuándo se agregó una función.

54. Pull request
Una pull request es una propuesta para integrar cambios de una rama a otra.
Ejemplo:
rama-de-trabajo → main
Antes de integrarla se revisa:
Qué archivos cambiaron.
Qué funciones se agregaron.
Si existen errores.
Si el proyecto sigue funcionando.

55. Merge
Hacer merge significa integrar cambios.
Ejemplo:
Cambios de la nueva función
+
main actual
=
main actualizado
Importante:
Una tarea dependiente debe partir de la versión actualizada de main, no de una copia vieja.

56. Supabase
Supabase es la infraestructura de datos del juego.
Puede encargarse de:
Usuarios.
Autenticación.
Tablas.
Datos de torneos.
Resultados.
Permisos.
Almacenamiento.
Actualizaciones en tiempo real.
No debe confundirse con los archivos visuales del proyecto.

57. Migración
Una migración es un cambio estructurado en la base de datos.
Ejemplos:
Crear una tabla.
Agregar una columna.
Crear un índice.
Definir reglas de acceso.
Una migración incorrecta puede romper datos.
Por eso:
Evitar cambios destructivos.
Revisar antes de aplicar.
No borrar tablas existentes.
No reemplazar información real sin respaldo.

58. RLS o políticas de acceso
Son reglas que determinan quién puede leer o modificar datos.
Ejemplo:
Un manager puede ver su temporada.
Pero no debería poder:
Modificar el club de otro.
Acceder a tácticas privadas ajenas.
Alterar el saldo de un rival.
Comprar un jugador sin dinero.
Ver datos ocultos.

59. Build
El build es una comprobación de que el proyecto puede prepararse para publicarse.
Si falla:
Hay errores de código.
Hay dependencias faltantes.
Hay tipos incompatibles.
Alguna modificación rompió el proyecto.
Que una pantalla se vea bien no alcanza si el build no funciona.

60. Test
Un test es una prueba automática.
Puede verificar, por ejemplo:
Que una subasta elija un solo ganador.
Que un usuario no pueda comprar sin dinero.
Que el calendario tenga la cantidad correcta de partidos.
Que un jugador lesionado no pueda entrenar.
No hay que pedirle a Codex que invente pruebas inexistentes.
Debe:
Revisar qué herramientas existen.
Ejecutar los comandos reales.
Agregar pruebas razonables cuando sea útil.

PARTE 9. CONFIGURACIÓN DE CODEX
61. Qué herramienta usar
La herramienta principal será Codex conectado al repositorio.
Codex puede:
Leer el proyecto.
Encontrar archivos.
Modificar código.
Ejecutar verificaciones.
Trabajar por tareas.
Preparar cambios.
Ayudar a corregir errores.
La documentación oficial explica que Codex en la nube puede conectarse a GitHub, utilizar un entorno asociado al repositorio y ejecutar tareas en segundo plano. Documentación oficial de Codex en la nube

62. Qué hacer la primera vez
Entrá a ChatGPT.
Abrí Codex.
Conectá GitHub si lo solicita.
Elegí el repositorio del juego.
Confirmá que la referencia principal sea main.
Creá un entorno si la plataforma lo pide.
Verificá que el proyecto correcto está seleccionado.
Enviá el primer prompt de auditoría.
Esperá el resultado.
Revisá si detecta problemas de acceso.
No tenés que instalar necesariamente herramientas adicionales si Codex web ya puede trabajar con el repositorio.

63. Si no podés elegir modelo, esfuerzo o velocidad
No pasa nada.
Si Codex web no muestra:
Selector de modelo.
Selector de esfuerzo.
Selector de velocidad.
Entonces no hay que perder tiempo buscando controles inexistentes en tu interfaz.
Usá la configuración disponible.
Lo importante es:
Un objetivo claro.
Un repositorio correcto.
Un alcance delimitado.
Verificaciones reales.

64. Diferencia entre este chat y Codex conectado al proyecto
Este chat puede:
Ayudarte a pensar decisiones.
Revisar capturas.
Armar prompts.
Interpretar errores.
Organizar el plan.
Mejorar reglas del juego.
Pero este chat no tiene necesariamente conectado el repositorio.
Eso significa que yo no puedo afirmar que revisé main si no tengo acceso.
Codex conectado al repositorio sí puede:
Inspeccionar archivos reales.
Encontrar rutas.
Ejecutar comandos.
Implementar cambios.
Por eso la combinación recomendada es:
Acá definimos y organizamos; Codex implementa sobre el proyecto.

65. Qué archivos no hace falta copiar
Si Codex tiene acceso al repositorio, no hace falta pegarle:
Todo el código.
Todas las pantallas.
Todos los componentes.
Todas las migraciones.
El contenido completo de package.json.
El archivo repomix-output.xml.
Puede descubrirlos por su cuenta.
Lo que sí necesita es:
Repositorio correcto.
Rama correcta.
Instrucciones claras.
Capturas relevantes cuando sean útiles.
Datos de equipos cuando estén disponibles.

66. Archivos de instrucciones permanentes
Codex debería crear o actualizar:
AGENTS.md
docs/MODO_CLUB_V1.md
docs/PLAN_20_DIAS.md
docs/PROGRESO_MODO_CLUB.md
docs/REFERENCIAS_VISUALES.md
docs/DATOS_CLUBES.md
docs/ECONOMIA_MODO_CLUB.md
docs/ESTADISTICAS_MODO_CLUB.md
docs/CHECKLIST_PUBLICACION.md
Cada archivo tiene una función.
AGENTS.md
Reglas permanentes para trabajar en el repositorio.
Debe explicar:
Cómo verificar el proyecto.
Qué no debe romperse.
Qué documentos leer.
Qué prioridades existen.
Qué acciones requieren cuidado.
La documentación oficial indica que AGENTS.md permite guardar instrucciones duraderas para Codex. Instrucciones persistentes con AGENTS.md
docs/MODO_CLUB_V1.md
Describe qué incluye y qué no incluye la primera versión.
docs/PLAN_20_DIAS.md
Organiza tareas y dependencias.
docs/PROGRESO_MODO_CLUB.md
Indica:
Qué está terminado.
Qué está en desarrollo.
Qué falta.
Qué está bloqueado.
Qué errores existen.
docs/REFERENCIAS_VISUALES.md
Define:
Top Eleven: estética principal.
OSM: gestión.
SofaScore: estadísticas.
docs/DATOS_CLUBES.md
Define cómo deben entregarse:
Equipos.
Ligas.
Jugadores.
Versiones históricas.
docs/ECONOMIA_MODO_CLUB.md
Explica:
Presupuesto.
Ingresos.
Gastos.
Entradas.
Patrocinadores.
Personal.
Instalaciones.
Mercado.
docs/ESTADISTICAS_MODO_CLUB.md
Explica:
Eventos disponibles.
Estadísticas calculables.
Estadísticas pendientes.
Filtros.
Mapas.
Valoraciones.
docs/CHECKLIST_PUBLICACION.md
Lista lo necesario para lanzar sin olvidarse de controles importantes.

PARTE 10. CAPTURAS Y REFERENCIAS
67. Cómo usar las capturas correctamente
No mandes todas las imágenes en todos los prompts.
Mandá solamente las relevantes.
Ejemplos:
Para formaciones
Adjuntar:
Cancha de Top Eleven.
Jugadores arrastrables.
Zonas.
Advertencias.
Suplentes.
Para mercado
Adjuntar:
Lista de transferibles de OSM.
Subastas de Top Eleven.
Historial de ofertas.
Temporizador.
Para entrenamiento
Adjuntar:
Ejercicios.
Categorías.
Selección de jugadores.
Desgaste físico.
Para estadísticas
Adjuntar:
Barras comparativas de SofaScore.
Mapa de disparos.
Momento del partido.
Filtros.
Tablas de futbolistas.
Para finanzas
Adjuntar:
Patrocinadores.
Precios de entradas.
Paneles económicos.
No adjuntar:
Capturas vacías.
Imágenes repetidas.
Capturas irrelevantes.
Información personal innecesaria.
La documentación oficial recomienda explicar también los comportamientos que no aparecen directamente en una captura. Guía oficial para prompts con referencias visuales

68. Capturas dentro del repositorio
No es obligatorio subir imágenes de otros juegos al repositorio público.
Es preferible:
Adjuntarlas directamente en el chat correspondiente.
Mantener referencias textuales en la documentación.
Crear diseños propios.
Evitar publicar recursos ajenos.
Además, algunas capturas pueden mostrar:
Nombres de usuarios.
Fotos.
Información personal.
Marcas.
Publicidad.
No conviene incorporarlas directamente a una versión pública.

PARTE 11. TIEMPOS DE IMPLEMENTACIÓN
69. Dos escenarios de tiempo
Cada tarea puede tener:
Tiempo si sale correctamente en la primera ejecución.
Tiempo si aparecen errores, revisiones y correcciones.
Las horas son aproximadas.
No representan una promesa de que Codex trabajará sin límites ni interrupciones.
Bloque
Si sale bien
Si requiere correcciones
Conectar repositorio y entorno
15–30 min
30–60 min
Auditoría de main
30–60 min
1–2 h
Documentación permanente
45–75 min
1,5–2,5 h
Estabilización de torneos
2–3 h
4–6 h
Base de datos y permisos
3–4 h
5–8 h
Sala, código y administradores
2–3 h
4–6 h
Equipos y plantillas independientes
3–4 h
5–7 h
Liga, copa y calendario
3–4 h
5–7 h
Integración de partidos
3–5 h
6–9 h
Plantilla y dorsales
2–3 h
4–5 h
Formación y arrastre
3–4 h
5–8 h
Tácticas y especialistas
2–3 h
4–6 h
Moral, fatiga y lesiones
3–4 h
5–7 h
Registro de eventos estadísticos
2–3 h
4–6 h
Pantallas estadísticas estilo SofaScore
2–4 h
4–7 h
Economía general
3–4 h
5–7 h
Patrocinadores y entradas
2–3 h
3–5 h
Transferibles y compra inmediata
3–4 h
5–8 h
Subastas
4–6 h
8–12 h
Entrenamientos
4–5 h
6–9 h
Médico, abogado y analista
3–4 h
5–7 h
Instalaciones
3–4 h
5–8 h
Diseño visual inspirado en Top Eleven
3–5 h
5–8 h
Bots, privacidad y seguridad adicional
2–3 h
4–6 h
Pruebas generales
4–6 h
8–12 h
Preparación de publicación
1–2 h
2–4 h

Totales aproximados:
Escenario muy optimista: 64–93 horas.
Escenario con correcciones: 114–174 horas.
Con cinco horas tuyas por día durante veinte días:
5 horas × 20 días = 100 horas de dedicación personal.
Para que el plan cierre:
Codex debe avanzar mientras no estás.
Hay que evitar trabajo repetido.
No deben aparecer cambios de alcance constantes.
Las funciones menos importantes deben simplificarse si se complican.
Las estadísticas nuevas estilo SofaScore agregan tiempo. Por eso hay que incorporarlas en niveles de prioridad.

70. Distribución de prioridades
P0: indispensable
Debe quedar funcional:
Partidas.
Equipos.
Calendario.
Partidos.
Tabla.
Plantillas.
Tácticas básicas.
Moral.
Fatiga.
Economía.
Transferibles.
Entrenamiento.
Estadísticas principales.
P1: muy importante
Agregar si el núcleo está estable:
Subastas.
Médico.
Abogado.
Analista.
Patrocinadores variados.
Instalaciones más completas.
Mapa de disparos simple.
Gráfico de momento.
P2: posterior
xG avanzado.
Repeticiones completas.
Contratos.
Roles.
Bandeja de mensajes.
Directiva compleja.
VAR.
Mapas de calor detallados.
Aplicación Android nativa.

PARTE 12. PLAN AGRESIVO DE VEINTE DÍAS
71. Día 1
Objetivo:
Conectar Codex.
Auditar main.
Crear documentos.
Definir prioridades.
Identificar bloqueos.
Debe existir al final del día:
Diagnóstico real + documentación permanente.

72. Día 2
Objetivo:
Revisar torneos existentes.
Corregir problemas críticos.
Confirmar estados y permisos.
Resultado esperado:
La base actual del juego sigue funcionando.

73. Día 3
Objetivo:
Diseñar datos del Modo Club.
Crear migraciones.
Definir permisos.
Preparar separación entre temporadas.
Resultado:
Estructura persistente del Modo Club.

74. Día 4
Objetivo:
Entrada al modo.
Crear partida.
Código.
Sala.
Administradores.
Resultado:
Dos usuarios pueden entrar a la misma sala.

75. Día 5
Objetivo:
Equipos disponibles.
Selección.
Exclusividad.
Bots.
Copias de plantillas.
Resultado:
Cada participante puede obtener un club válido.

76. Día 6
Objetivo:
Liga.
Copa básica.
Fixture.
Horarios.
Resultado:
La temporada tiene calendario.

77. Día 7
Objetivo:
Integrar base de datos real si está disponible.
Corregir importación.
Validar equipos históricos.
Preparar conjuntos de prueba.
Resultado:
Los clubes y jugadores cargan correctamente.

78. Día 8
Objetivo:
Pantalla de plantilla.
Dorsales.
Suplentes.
No convocados.
Estados de jugadores.
Resultado:
El manager puede administrar su equipo.

79. Día 9
Objetivo:
Formación.
Movimiento de jugadores.
Puesto fijo del arquero.
Avisos posicionales.
Resultado:
El once inicial puede configurarse.

80. Día 10
Objetivo:
Tácticas.
Especialistas.
Capitán.
Guardado.
Resultado:
El equipo llega preparado al partido.

81. Día 11
Objetivo:
Integrar el motor.
Ejecutar jornadas.
Actualizar tabla.
Registrar goles y eventos.
Resultado:
Una jornada se disputa y produce resultados reales.

82. Día 12
Objetivo:
Moral.
Fatiga.
Lesiones.
Sanciones.
Estadísticas básicas.
Resultado:
Los partidos generan consecuencias deportivas.

83. Día 13
Objetivo:
Caja general.
Ingresos.
Gastos.
Historial.
Entradas.
Resultado:
El club administra dinero sin endeudarse.

84. Día 14
Objetivo:
Transferibles.
Publicación de jugadores.
Compra inmediata.
Venta.
Resultado:
El mercado funciona.

85. Día 15
Objetivo:
Subastas básicas.
Temporizador.
Ofertas.
Protección antisniping.
Resultado:
Se puede disputar una subasta válida.
Si no funciona con seguridad, no debe bloquear el mercado directo.

86. Día 16
Objetivo:
Ejercicios.
Selección de futbolistas.
Desgaste.
Progresión.
Resultado:
El entrenamiento mejora jugadores y consume condición.

87. Día 17
Objetivo:
Médico.
Abogado.
Analista.
Patrocinadores simples.
Resultado:
El club tiene personal y servicios básicos.

88. Día 18
Objetivo:
Instalaciones.
Paneles visuales.
Estadísticas comparadas.
Ajustes de interfaz.
Resultado:
El modo empieza a sentirse como un producto completo.

89. Día 19
Objetivo:
Simular una temporada.
Encontrar errores.
Probar usuarios simultáneos.
Corregir permisos.
Resultado:
Versión candidata para lanzamiento.

90. Día 20
Objetivo:
Últimas correcciones.
Preparación de publicación.
Prueba desde celular.
Inicio de partida real.
Resultado:
Primera versión pública y jugable del Modo Club.
Si el plan comenzó el 24 de agosto:
Día 20: 12 de septiembre.
Si tu suscripción sigue activa hasta el 15:
13, 14 y 15 de septiembre = margen adicional.

PARTE 13. PROMPTS LISTOS PARA CODEX
91. Regla general para todos los prompts
Antes de cada bloque:
Confirmá el repositorio.
Confirmá main.
Confirmá que el trabajo anterior esté incorporado.
Adjuntá solamente referencias necesarias.
Pedí implementación real.
Pedí verificación.
Pedí resumen.
Pedí que actualice el progreso.
Una tarea no está terminada si solamente dice:
“Dejé una base preparada”.
Debe estar terminada cuando la funcionalidad realmente pueda utilizarse o verificarse.

92. Prompt 1: auditoría
Trabaja sobre el repositorio de mi juego de director técnico de fútbol.

La rama más actual y correcta es main.

Primero realiza una auditoría real. No implementes cambios todavía.

Necesito que inspecciones:

1. Framework y estructura del proyecto.
2. package.json y comandos disponibles.
3. Autenticación.
4. Integración con Supabase.
5. Tablas y migraciones existentes.
6. Modo local.
7. Partidos online.
8. Torneos locales.
9. Torneos online.
10. Motor de partidos.
11. Mapa o cancha 2D.
12. Formaciones.
13. Tácticas.
14. Alineaciones.
15. Horarios.
16. Administradores.
17. Archivos de documentación.
18. Estado real de main.
19. Cambios sin guardar, si existen.
20. Funciones reutilizables para un nuevo Modo Club.

No inventes rutas ni capacidades.

No borres archivos.

No resetees cambios.

No apliques migraciones.

Entrega:

- rutas reales de archivos;
- diagnóstico de funcionalidades;
- riesgos;
- problemas críticos;
- arquitectura recomendada;
- orden sugerido para implementar el Modo Club;
- comandos de verificación que realmente existen.

93. Prompt 2: documentación permanente
Usa el diagnóstico real del repositorio para crear o actualizar documentación permanente del proyecto.

No implementes todavía nuevas funcionalidades del Modo Club.

Crea o actualiza:

- AGENTS.md
- docs/MODO_CLUB_V1.md
- docs/PLAN_20_DIAS.md
- docs/PROGRESO_MODO_CLUB.md
- docs/REFERENCIAS_VISUALES.md
- docs/DATOS_CLUBES.md
- docs/ECONOMIA_MODO_CLUB.md
- docs/ESTADISTICAS_MODO_CLUB.md
- docs/CHECKLIST_PUBLICACION.md

Reglas principales:

- main es la rama más actual.
- Reutilizar el proyecto existente.
- Preservar modos locales y online.
- Preservar torneos.
- Presupuesto de infraestructura: aproximadamente 5 USD mensuales como máximo.
- Aplicación pública.
- Partidas privadas mediante código.
- Nada de tokens, moneda premium, pay to win ni ventajas comprables.
- Sin chat interno del torneo, Modo Club o partidos.
- Velocidad online x10.
- Cada temporada conserva datos independientes.
- Equipos actuales e históricos.
- El creador puede permitir equipos propios; los participantes comunes no.
- Moral, fatiga, lesiones y sanciones deben existir.
- Contratos complejos, roles negociados y bandeja completa de mensajes quedan para después.
- No permitir deudas.
- Mantener privacidad según configuración.

Referencias:

- Top Eleven: estética principal, sensación de videojuego, paneles, cancha y entrenamientos.
- OSM: gestión, mercado, personal, clasificación y administración.
- SofaScore: estadísticas, mapas, filtros, notas y análisis.

No copiar logos, imágenes, personajes o marcas de esos productos.

Define prioridades P0, P1 y P2.

Define criterios de aceptación y verificación.

Mantén AGENTS.md breve y coloca los detalles extensos en docs.

Si un archivo ya existe, actualízalo sin borrar instrucciones importantes.

Al terminar, resume todos los archivos creados y decisiones documentadas.

94. Prompt 3: torneos existentes
Lee AGENTS.md y la documentación del proyecto.

Estabiliza los torneos existentes antes de construir el Modo Club.

Revisa:

- estados;
- horarios;
- avance de rondas;
- permisos de administradores;
- finalización;
- campeón;
- conflictos de programación;
- visualización de partidos;
- compatibilidad con modos locales y online.

Corrige solamente errores reales.

Evita refactorizaciones generales.

Ejecuta los comandos reales disponibles.

Actualiza docs/PROGRESO_MODO_CLUB.md.

Explica qué se corrigió y cómo probarlo.

95. Prompt 4: datos y permisos
Implementa la base persistente del Modo Club siguiendo la arquitectura existente.

Preparar:

- temporadas;
- configuraciones;
- participantes;
- administradores;
- clubes;
- jugadores por temporada;
- fixture;
- resultados;
- movimientos económicos;
- estados de futbolistas;
- estructura inicial del mercado.

Requisitos:

- migraciones aditivas;
- no borrar tablas;
- no romper torneos existentes;
- separar temporadas;
- proteger información privada;
- validar pertenencia;
- aplicar políticas de acceso coherentes;
- documentar cualquier migración que deba ejecutar manualmente.

Actualiza el progreso y ejecuta verificaciones.

96. Prompt 5: partida y sala
Implementa el acceso inicial al Modo Club.

Incluir:

- botón o entrada desde el menú principal;
- creación de partida;
- código privado;
- ingreso mediante código;
- sala de espera;
- participantes;
- creador;
- administradores;
- expulsión;
- configuración visible;
- inicio de temporada.

Validar que usuarios ajenos no puedan administrar la partida.

Mantener navegación funcional en computadora y celular.

Actualizar documentación de progreso.

97. Prompt 6: clubes y jugadores
Implementa selección de equipos y plantillas por temporada.

Incluir:

- clubes actuales;
- clubes históricos;
- equipos seleccionados por el creador;
- posibilidad futura de equipos propios del creador;
- selección por orden de llegada;
- asignación manual;
- exclusividad;
- bots;
- copias independientes de jugadores;
- coexistencia de versiones históricas diferentes de un mismo futbolista.

Si falta la base completa, usar datos de prueba documentados.

Preparar y explicar el formato esperado para importar equipos y jugadores.

Proteger la selección simultánea de un mismo club.

98. Prompt 7: competición y fixture
Implementa generación de competiciones del Modo Club.

Formatos:

- liga;
- copa;
- liga y copa;
- liga de una vuelta;
- liga ida y vuelta;
- copa de eliminación directa.

Agregar:

- fechas;
- horarios;
- descanso cuando hay equipos impares;
- alternancia entre liga y copa;
- edición de horarios por administradores;
- prórroga y penales configurables;
- tabla de posiciones;
- estructura preparada para grupos futuros.

Verificar matemáticamente que la cantidad de partidos sea correcta.

99. Prompt 8: motor y jornadas
Integra el calendario del Modo Club con el motor de partidos ya existente.

Objetivos:

- ejecutar partidos;
- usar la última alineación y táctica válida;
- resolver encuentros aunque falte un manager;
- guardar resultados;
- registrar goles;
- registrar tarjetas;
- registrar sustituciones;
- actualizar tabla;
- actualizar rondas;
- mostrar partidos activos y finalizados;
- mantener velocidad online x10.

No crear un motor nuevo.

Proteger la resolución de resultados contra manipulación.

Probar al menos una jornada completa.

100. Prompt 9: plantilla
Implementa la pantalla de plantilla del Modo Club.

Mostrar:

- titulares;
- suplentes;
- no convocados;
- nombre;
- posición;
- edad;
- dorsal;
- valoración;
- condición física;
- moral;
- lesiones;
- sanciones;
- estadísticas;
- valor de mercado si la privacidad lo permite.

Agregar:

- ordenamiento;
- agrupación por posición;
- dorsales automáticos del 1 al 99;
- autocompletado de suplentes;
- sustitución automática de jugadores no disponibles;
- panel general del club.

Tomar Top Eleven como referencia visual principal y OSM como referencia organizativa.

101. Prompt 10: formación
Implementa una pantalla de formación inspirada visualmente en Top Eleven.

Debe permitir:

- mostrar cancha;
- ver once inicial;
- elegir formaciones;
- arrastrar jugadores de campo;
- intercambiar jugadores;
- guardar posiciones;
- mostrar suplentes;
- marcar incompatibilidades posicionales;
- funcionar con mouse y pantalla táctil.

El puesto del arquero permanece fijo.

Mover al arquero hacia un espacio vacío no debe desplazar el puesto.

Si se intercambian jugadores incompatibles, mostrar advertencia y aplicar las reglas existentes.

Reutiliza componentes actuales del proyecto.

102. Prompt 11: tácticas
Implementa o integra tácticas del Modo Club utilizando las estructuras existentes.

Incluir:

- formación;
- estilo de juego;
- presión;
- intensidad;
- anchura;
- verticalidad;
- juego directo;
- posesión;
- salida desde el fondo;
- capitán;
- pateador de penales;
- tiros libres;
- córners;
- selección automática de especialistas;
- guardado persistente.

Las decisiones deben influir realmente en el motor.

No agregues controles decorativos sin efecto.

Mantén privadas las tácticas de cada club.

103. Prompt 12: estados físicos
Implementa:

- moral individual;
- moral colectiva básica;
- condición física;
- fatiga;
- recuperación;
- lesiones;
- sanciones;
- integración con partidos;
- integración con alineaciones;
- integración con entrenamientos.

Reglas:

- los lesionados no pueden entrenar;
- los sancionados no pueden participar cuando corresponda;
- el cansancio influye moderadamente en el rendimiento;
- los resultados influyen en la moral;
- no utilizar penalizaciones exageradas;
- documentar fórmulas iniciales.

104. Prompt 13: eventos estadísticos
Audita qué eventos registra actualmente el motor de partidos.

Prepara una estructura de eventos reales para estadísticas.

Registrar cuando sea posible:

- goles;
- asistencias;
- tiros;
- tiros al arco;
- tiros desviados;
- tiros bloqueados;
- pases;
- pases completados;
- recuperaciones;
- entradas;
- faltas;
- tarjetas;
- atajadas;
- córners;
- sustituciones;
- minuto;
- equipo;
- jugador;
- ubicación cuando el motor realmente pueda obtenerla.

No inventes eventos.

No simules estadísticas falsas solamente para llenar pantallas.

Documenta qué métricas pueden calcularse realmente y cuáles quedan para futuras mejoras.

105. Prompt 14: estadísticas tipo SofaScore
Adjuntar capturas de SofaScore.
Implementa pantallas estadísticas inspiradas funcionalmente en SofaScore, manteniendo la identidad visual general del juego.

Incluir:

- estadísticas comparativas por equipo;
- barras visuales;
- partido completo;
- primer tiempo;
- segundo tiempo;
- goleadores;
- asistencias;
- tiros;
- posesión;
- atajadas;
- faltas;
- tarjetas;
- notas individuales básicas;
- clasificación de futbolistas;
- ordenamiento;
- filtros por posición y club.

Agregar solamente si existen eventos suficientes:

- mapa de disparos;
- gráfico de momento;
- distribución de ataques.

Nunca inventar datos que el motor no registra.

La fórmula interna de valoración no necesita mostrarse al usuario.

Mantener Top Eleven como referencia estética global y SofaScore como referencia analítica.

106. Prompt 15: economía
Implementa la economía principal del Modo Club.

Crear:

- caja general;
- saldo;
- movimientos;
- ingresos;
- gastos;
- validación de fondos;
- historial económico.

Incluir:

- fichajes;
- personal;
- instalaciones;
- ingresos deportivos;
- premios básicos;
- entradas;
- patrocinadores simples.

No permitir:

- deudas;
- préstamos;
- saldo negativo;
- monedas premium;
- pagos reales;
- ventajas compradas.

Preparar reserva de dinero comprometido en subastas si corresponde.

Documentar fórmulas y criterios en docs/ECONOMIA_MODO_CLUB.md.

107. Prompt 16: entradas y patrocinadores
Implementa entradas y patrocinadores dentro de la economía existente.

ENTRADAS:

- precio para liga;
- precio para copa;
- capacidad del estadio;
- asistencia estimada;
- ingresos por partidos de local;
- relación entre precio y demanda.

PATROCINADORES:

- ofertas simples;
- duración diaria, semanal, quincenal o temporada según corresponda;
- pago fijo;
- objetivos opcionales simples;
- nombres ficticios.

No incluir marcas reales sin autorización.

Evitar ofertas desbalanceadas.

No duplicar ingresos.

Mostrar al usuario el efecto económico de cada decisión.

108. Prompt 17: transferibles
Implementa lista de transferibles independiente por temporada.

Incluir:

- jugadores externos de la base;
- jugadores publicados por participantes;
- jugadores publicados por bots;
- categorías por posición;
- nombre;
- edad;
- club;
- valoración si es visible;
- precio;
- compra inmediata;
- publicación;
- retiro;
- historial de traspasos;
- renovación gradual del mercado.

Reglas:

- impedir compras sin saldo;
- impedir compras simultáneas duplicadas;
- acreditar correctamente al vendedor;
- actualizar plantillas;
- reemplazar titulares vendidos cuando corresponda;
- el sistema solo compra jugadores publicados explícitamente.

Priorizar operaciones seguras y funcionales.

109. Prompt 18: subastas
Implementa subastas de jugadores.

Duraciones disponibles:

- 5 minutos;
- 10 minutos;
- 15 minutos;
- 30 minutos;
- 60 minutos.

Incremento mínimo:

- aproximadamente 2,5%.

Protección antisniping:

- 5 minutos: 10 segundos;
- 10 minutos: 15 segundos;
- 15 minutos: 20 segundos;
- 30 minutos: 30 segundos;
- 60 minutos: 60 segundos.

Mostrar:

- oferta actual;
- siguiente oferta;
- tiempo restante;
- participantes;
- historial;
- ganador.

Reglas:

- impedir ofertas superiores al saldo;
- reservar fondos comprometidos;
- manejar ofertas simultáneas;
- restaurar tiempo cuando hay pujas tardías;
- transferir jugador y dinero una sola vez;
- evitar ventajas pagas.

Si no puede garantizarse seguridad, mantener compra inmediata como opción operativa y explicar lo pendiente.

110. Prompt 19: entrenamientos
Implementa entrenamiento inspirado en Top Eleven.

Categorías:

- ataque;
- defensa;
- posesión;
- físico y mental.

Permitir:

- hasta seis ejercicios por sesión;
- selección individual;
- selección por posición;
- atributos trabajados;
- dificultad;
- desgaste previsto;
- duración;
- finalización;
- progreso.

Reglas:

- jóvenes progresan más rápido;
- instalaciones afectan resultados;
- lesionados no entrenan;
- entrenamientos consumen condición;
- impedir conflictos graves con partidos;
- no permitir pagos para acelerar.

Evitar progresión exagerada.

111. Prompt 20: personal
Implementa personal básico:

- médico;
- abogado;
- analista.

Usar un profesional por especialidad inicialmente.

MÉDICO:

- tratar lesionados;
- mostrar duración;
- reducir recuperación.

ABOGADO:

- recurrir sanciones de más de un partido;
- un recurso por sanción;
- posibilidad de éxito o fracaso.

ANALISTA:

- seleccionar rival;
- destacar próximo rival;
- iniciar análisis;
- entregar información autorizada.

Integrar costos con la economía.

No utilizar personajes 3D, tokens, monedas premium ni aceleraciones pagas.

112. Prompt 21: instalaciones
Implementa instalaciones básicas:

- estadio;
- centro de entrenamiento;
- área médica.

Cada instalación debe incluir:

- nivel;
- costo;
- tiempo;
- beneficio;
- progreso;
- disponibilidad de mejora.

Efectos:

- estadio: ingresos y capacidad;
- entrenamiento: rendimiento de sesiones;
- medicina: recuperación.

No permitir mejoras sin dinero.

No implementar academia juvenil.

No crear mapas 3D complejos si retrasan la entrega.

Registrar correctamente cada mejora y evitar aplicaciones duplicadas.

113. Prompt 22: diseño visual principal
Adjuntar capturas de Top Eleven.
Mejora la interfaz general del Modo Club.

La referencia estética principal debe ser Top Eleven.

Buscar:

- sensación de videojuego deportivo;
- paneles claros;
- cancha protagonista;
- botones definidos;
- jerarquía visual;
- indicadores de estado;
- tarjetas de entrenamiento;
- navegación consistente;
- interfaz horizontal funcional;
- diseño adaptable a computadora y celular.

Utilizar OSM solamente como referencia funcional de gestión.

Utilizar SofaScore solamente como referencia de análisis y estadísticas.

No copiar:

- logos;
- personajes;
- imágenes;
- marcas;
- publicidad;
- monedas premium.

Evita que la interfaz parezca solamente una tabla administrativa.

Mantén coherencia con la identidad existente del proyecto.

114. Prompt 23: bots, privacidad y seguridad
Revisa integralmente la seguridad y equilibrio del Modo Club.

Comprobar:

- permisos del creador;
- permisos de administradores;
- datos privados;
- información oculta;
- tácticas privadas;
- acceso entre temporadas;
- operaciones económicas;
- compras simultáneas;
- subastas;
- bots;
- espectadores;
- cambios de cuenta;
- sesiones;
- horarios;
- resultados.

Los bots deben ser funcionales pero no exageradamente superiores a los humanos.

No permitir que una interfaz oculta información mientras la API sigue exponiéndola.

Agregar verificaciones razonables y documentar riesgos restantes.

115. Prompt 24: pruebas generales
Realiza una prueba integral del Modo Club.

Comprueba:

1. Crear partida.
2. Ingresar con código.
3. Nombrar administrador.
4. Seleccionar equipos.
5. Agregar bots.
6. Iniciar temporada.
7. Generar calendario.
8. Configurar formación.
9. Guardar tácticas.
10. Ejecutar partido.
11. Actualizar tabla.
12. Registrar estadísticas.
13. Aplicar fatiga.
14. Aplicar moral.
15. Aplicar sanciones.
16. Comprar jugador.
17. Vender jugador.
18. Ejecutar subasta si existe.
19. Entrenar.
20. Tratar lesionado.
21. Recurrir sanción.
22. Mejorar instalación.
23. Revisar saldo.
24. Probar permisos.
25. Probar computadora.
26. Probar celular.

Clasifica problemas en:

- críticos;
- importantes;
- menores.

Corrige los críticos y los importantes que bloqueen una temporada funcional.

Ejecuta los comandos reales del proyecto.

Documenta todo en docs/CHECKLIST_PUBLICACION.md.

116. Prompt 25: preparación de publicación
Prepara la publicación web del proyecto sin modificar servicios externos sin autorización.

Necesito:

- comprobación de build;
- variables necesarias;
- instrucciones de despliegue;
- migraciones pendientes;
- configuración mínima;
- revisión de errores;
- verificación de modo local;
- verificación de modo online;
- verificación del Modo Club;
- lista de funciones activas;
- lista de funciones diferidas;
- recomendaciones posteriores.

No publiques automáticamente ni apliques cambios destructivos.

Explica los pasos de manera comprensible para alguien que no sabe programar.

PARTE 14. PROMPTS PARA SITUACIONES ESPECIALES
117. Si Codex responde con un plan, pero no implementa
No necesito solamente una propuesta.

Implementa ahora la funcionalidad solicitada dentro del repositorio, respetando AGENTS.md y los archivos existentes.

Al terminar:

- ejecuta verificaciones;
- corrige errores razonables;
- actualiza el documento de progreso;
- explica cómo comprobar que funciona.

No te quedes únicamente en recomendaciones.

118. Si Codex modifica cosas que no pediste
Detente.

La tarea debe limitarse exclusivamente a:

[DESCRIBIR EL BLOQUE]

No modifiques:

[INDICAR FUNCIONES O ARCHIVOS QUE NO DEBE TOCAR]

Revisa los cambios ya realizados y conserva únicamente los necesarios para cumplir el objetivo sin romper el resto del proyecto.

119. Si aparece un error
La funcionalidad presenta este problema:

[PEGAR MENSAJE O DESCRIPCIÓN]

Pasos para reproducir:

1. [PASO]
2. [PASO]
3. [RESULTADO INCORRECTO]

Resultado esperado:

[EXPLICAR]

Identifica la causa real.

Corrige solamente lo necesario.

Ejecuta verificaciones.

Explica cómo probar la solución.

No cambies funcionalidades que ya funcionan.

120. Si el proyecto no compila
El proyecto no compila después de los últimos cambios.

Analiza el error real de build.

Identifica:

- archivo;
- causa;
- modificación responsable;
- solución mínima.

Corrige el problema sin eliminar funcionalidades válidas.

Vuelve a ejecutar el comando de build real.

Informa resultado y archivos modificados.

121. Si una migración falla
La migración de Supabase presenta este error:

[PEGAR ERROR]

Analiza la causa antes de proponer cambios.

No borres tablas.

No elimines datos.

No reemplaces políticas existentes sin explicar consecuencias.

Propón una migración correctiva compatible con la estructura actual.

Si debo ejecutar algo manualmente, indícame exactamente dónde y en qué orden.

122. Si una tarea consume demasiado tiempo
La tarea está creciendo demasiado.

Reduce el alcance al mínimo funcional que permita continuar.

Prioridad obligatoria:

[INDICAR FUNCIÓN PRINCIPAL]

Deja preparado para después:

[INDICAR MEJORAS SECUNDARIAS]

No sacrifiques:

- seguridad;
- integridad de datos;
- permisos;
- funcionamiento del proyecto.

Termina una versión operativa y documenta lo pendiente.

123. Si la interfaz no parece Top Eleven
La funcionalidad existe, pero la presentación se ve demasiado administrativa.

Rediseña únicamente la interfaz para transmitir más sensación de videojuego deportivo inspirado en Top Eleven.

Prioriza:

- jerarquía visual;
- paneles;
- cancha;
- indicadores;
- botones;
- colores;
- navegación;
- tarjetas;
- claridad en celular.

No copies gráficos originales.

No modifiques la lógica de negocio que ya funciona.

124. Si las estadísticas son inventadas
Revisa todas las estadísticas mostradas.

Quiero que cada número provenga de eventos reales registrados por el motor.

Si una métrica no puede calcularse correctamente:

- no la inventes;
- no uses números aleatorios;
- no la muestres como dato real;
- documenta qué información faltaría para implementarla.

Mantén únicamente estadísticas verificables.

125. Si Codex quiere construir todo desde cero
No reconstruyas el proyecto completo.

Inspecciona y reutiliza:

- autenticación existente;
- motor existente;
- torneos existentes;
- componentes existentes;
- estilos existentes;
- Supabase existente;
- tácticas existentes;
- mapa 2D existente.

Solo crea módulos nuevos cuando no exista una base razonable para reutilizar.

La prioridad es terminar una versión funcional dentro del plazo.

126. Si Codex agrega tokens o funciones pagas
Elimina o evita cualquier sistema de:

- tokens;
- monedas premium;
- compras reales;
- aceleraciones pagas;
- ventajas competitivas comprables;
- pago para ganar.

El proyecto utiliza solamente dinero ficticio interno del club.

No copies sistemas de monetización de Top Eleven u OSM.

127. Si aparece información privada de otros clubes
Corrige la exposición de información privada.

Si la configuración de la temporada oculta:

- valoraciones;
- valores de mercado;
- tácticas;
- negociaciones;
- datos internos;

esa información no debe estar disponible:

- en la interfaz;
- en consultas públicas;
- para espectadores;
- para otros participantes;
- en respuestas de API no autorizadas.

Valida los permisos realmente, no solamente ocultes elementos visuales.

128. Si falta la base de datos definitiva
La base definitiva de clubes y jugadores todavía no está lista.

No bloquees el desarrollo.

Crea un conjunto pequeño y claramente identificado de datos de prueba.

Prepara un importador adaptable para archivos JSON o CSV.

Documenta exactamente qué campos necesitaré completar después.

Cuando llegue la base real, deberá poder reemplazar los datos de prueba sin rehacer el sistema.

129. Si hay que continuar mientras estás ausente
Trabaja de forma autónoma sobre el bloque actual.

Secuencia:

1. Lee AGENTS.md y la documentación.
2. Implementa el objetivo.
3. Ejecuta verificaciones.
4. Corrige errores razonables.
5. Actualiza docs/PROGRESO_MODO_CLUB.md.
6. Si el bloque está terminado y todavía puedes continuar sin una decisión mía, avanza con el siguiente bloque compatible.
7. Conserva el alcance del plan.
8. No publiques automáticamente.
9. No realices migraciones destructivas.
10. Si falta autorización, una clave o una decisión importante, detente y explica claramente el bloqueo.

Al finalizar, deja un resumen comprensible para una persona que no sabe programar.

PARTE 15. CÓMO TRABAJAR CADA DÍA
130. Rutina antes del colegio
Antes de salir:
Abrí Codex.
Revisá la tarea anterior.
Confirmá que los cambios útiles estén guardados.
Confirmá que el siguiente bloque tiene contexto.
Adjuntá capturas si corresponden.
Mandá un prompt concreto.
Pedile verificaciones.
Dejalo trabajando.
Si una tarea depende de otra que todavía no se integró, no abras una segunda tarea independiente sobre main viejo.

131. Durante el colegio
Mientras estás entre las 12 y las 19:
Una tarea en segundo plano puede seguir avanzando.
Si la plataforma permite tareas programadas, pueden configurarse.
No hace falta estar mirando constantemente.
Pero existen límites:
Puede necesitar aprobación.
Puede faltarle una variable.
Puede agotar el contexto.
Puede terminar antes.
Puede encontrar errores.
Puede requerir una decisión tuya.
La documentación de OpenAI describe tareas programadas y trabajos en segundo plano, aunque las funciones disponibles dependen del producto, la cuenta y los permisos. Tareas programadas oficiales

132. Después del colegio
Al volver:
Revisá el resumen.
Identificá si el trabajo terminó.
Revisá errores críticos.
Probá el flujo.
Pedí correcciones si algo falla.
Guardá o integrá cambios correctos.
Mandá el siguiente bloque.

133. Antes de dormir
Conviene dejar tareas que puedan avanzar sin preguntas frecuentes.
Buenas opciones:
Construcción de pantallas.
Pruebas.
Refactorización acotada.
Documentación.
Ajustes de estadísticas.
Validaciones.
Mejoras de interfaz.
Malas opciones para dejar completamente sin supervisión:
Borrar tablas.
Publicar producción.
Aplicar migraciones destructivas.
Cambiar toda la autenticación.
Reemplazar el motor.
Modificar todas las reglas económicas a la vez.

134. Trabajo paralelo
Se pueden separar tareas independientes.
Ejemplo razonable:
Una tarea mejora documentación.
Otra revisa componentes visuales.
Ejemplo riesgoso:
Una tarea cambia todas las tablas.
Otra implementa mercado sobre una versión antigua.
Una tercera altera partidos usando estructuras previas.
Eso puede generar conflictos.
Regla:
Primero resolver dependencias; después dividir trabajo que realmente sea independiente.

PARTE 16. BASE DE DATOS DE CLUBES
135. Qué tenés que preparar
Idealmente:
Ligas.
Clubes.
Plantillas.
Jugadores.
Equipos históricos.
Atributos.
Valoraciones.
Posiciones.
Edad.
Nacionalidad.
Dorsal, si está disponible.
No es necesario que la primera carga incluya absolutamente todos los clubes del mundo.
Para empezar conviene:
Un conjunto pequeño.
Comprobar importación.
Verificar partidas.
Agregar más equipos.
Repetir validaciones.

136. Formato recomendado
JSON:
{
  "clubes": [
    {
      "id": "river_2018",
      "nombre": "River Plate",
      "temporada": "2018",
      "tipo": "historico",
      "liga": "Argentina",
      "jugadores": [
        {
          "id": "jugador_001",
          "nombre": "Ejemplo",
          "edad": 25,
          "posicion": "DC",
          "valoracion": 82,
          "dorsal": 9
        }
      ]
    }
  ]
}
Esto es un ejemplo conceptual.
El formato definitivo debe surgir del análisis real de Codex sobre tu proyecto.

137. Cómo evitar errores en la base
Antes de importar, comprobar:
Que los IDs no estén repetidos indebidamente.
Que los clubes tengan nombres.
Que cada jugador tenga posición.
Que la edad sea razonable.
Que las valoraciones estén dentro del rango definido.
Que exista al menos un arquero cuando corresponda.
Que una plantilla tenga suficientes futbolistas.
Que los dorsales no se repitan.
Que las versiones históricas estén diferenciadas.
Que no se mezclen plantillas actuales con históricas por error.

138. Fuentes de información
Podés usar herramientas de IA para organizar datos, pero hay que revisar:
Errores de nombres.
Jugadores que nunca estuvieron en un equipo.
Fechas incorrectas.
Valoraciones absurdas.
Posiciones mal asignadas.
Edad histórica equivocada.
Futbolistas duplicados.
Antes de publicar una base de datos, también conviene comprobar que las fuentes utilizadas permitan el uso previsto.
La IA puede ayudarte a organizar información, pero no debe asumirse automáticamente que cualquier dato obtenido de un sitio puede reutilizarse sin revisar sus condiciones.

PARTE 17. SEGURIDAD Y PROHIBICIONES
139. Claves que nunca deben publicarse
No pegar en chats públicos ni repositorios:
Contraseñas.
Tokens privados.
Claves de administrador.
service_role de Supabase.
Credenciales de servidores.
Secretos de GitHub.
Archivos .env completos.
Si una herramienta pide una clave, debe configurarse en el lugar de secretos correspondiente.

140. Qué nunca debe hacer Codex sin autorización
No debe:
Borrar tablas reales.
Eliminar usuarios.
Destruir información.
Restablecer toda la base.
Reescribir completamente main.
Ejecutar comandos destructivos.
Publicar automáticamente.
Cambiar servicios externos.
Desactivar permisos.
Hacer públicas claves privadas.
Reemplazar configuraciones sin explicar consecuencias.

141. Operaciones que requieren especial cuidado
Migraciones.
Cambios en autenticación.
Permisos de Supabase.
Transferencias de dinero.
Resolución de partidos.
Compra simultánea de jugadores.
Cierre de subastas.
Reprogramación de encuentros.
Eliminación de temporadas.
Transferencia de administración.
Cambios de cuenta.

142. Dispositivos y cuentas múltiples
No existe una forma universal y perfecta de saber con certeza que dos cuentas provienen de la misma persona o dispositivo.
Pueden utilizarse señales limitadas:
Sesiones.
Dispositivos reconocidos.
Actividad sospechosa.
Acciones coordinadas.
Pero no conviene bloquear automáticamente a dos usuarios solo por compartir una conexión, porque podrían ser:
Hermanos.
Amigos.
Usuarios de una escuela.
Personas dentro de la misma casa.
Una opción razonable:
Mostrar indicadores administrativos cuando haya coincidencias relevantes.
Permitir revisión humana.
No prometer detección infalible.

143. Sesiones y cambio de cuenta
Al cambiar de cuenta:
Debe cerrarse la sesión anterior.
Deben recargarse permisos.
Debe limpiarse información privada.
Deben cancelarse suscripciones anteriores.
No deben aparecer datos del usuario previo.
Esto es especialmente importante si se usa el mismo celular.

PARTE 18. COMPROBACIONES POR FUNCIONALIDAD
144. Checklist de partida
Comprobar:
¿Se puede crear?
¿Existe código?
¿Puede entrar otro usuario?
¿Se distingue al creador?
¿Se puede nombrar administrador?
¿Se puede expulsar?
¿Se muestran configuraciones?
¿Se impide administrar sin permiso?
¿Se evita entrar a partidas inexistentes?

145. Checklist de equipos
Comprobar:
¿Se muestran clubes?
¿Hay históricos?
¿Hay actuales?
¿Se respetan exclusividades?
¿Dos usuarios pueden elegir el mismo equipo indebidamente?
¿El creador puede seleccionar disponibles?
¿Los participantes comunes no cargan equipos propios?
¿Los bots reciben equipos válidos?

146. Checklist de calendario
Comprobar:
¿Todos juegan la cantidad correcta?
¿Existe una jornada imposible?
¿Hay equipos duplicados en un mismo horario?
¿Se alternan liga y copa?
¿Los administradores pueden modificar horarios?
¿Un partido iniciado queda protegido?
¿La tabla coincide con los resultados?

147. Checklist de formación
Comprobar:
¿Hay once titulares?
¿Existe arquero?
¿La posición del arquero permanece fija?
¿Se pueden mover jugadores de campo?
¿Se muestran incompatibilidades?
¿Se guarda la formación?
¿Los suplentes aparecen?
¿Se corrige una alineación si un jugador fue vendido?

148. Checklist económico
Comprobar:
¿El saldo es correcto?
¿Las compras descuentan dinero?
¿Las ventas acreditan dinero?
¿No hay saldo negativo?
¿Los ingresos no se duplican?
¿Las instalaciones cobran una sola vez?
¿Las subastas reservan fondos?
¿El historial explica cada movimiento?

149. Checklist de mercado
Comprobar:
¿Se ven futbolistas?
¿Se puede publicar uno propio?
¿Se puede retirarlo?
¿Se puede comprar?
¿Se actualizan plantillas?
¿Dos usuarios pueden comprar el mismo jugador?
¿Se respeta la privacidad?
¿El sistema evita comprar jugadores no publicados?
¿Los bots no tienen dinero infinito?

150. Checklist de subastas
Comprobar:
¿El reloj avanza?
¿La oferta mínima es correcta?
¿El usuario sin dinero no puede pujar?
¿Se ven los participantes?
¿Una oferta tardía restaura tiempo?
¿El tiempo restaurado coincide con la duración?
¿Existe un único ganador?
¿Se cobra una sola vez?
¿El jugador termina en el club correcto?

151. Checklist de entrenamiento
Comprobar:
¿Se pueden elegir ejercicios?
¿Se pueden elegir jugadores?
¿Hay desgaste?
¿Existe mejora?
¿Los lesionados quedan excluidos?
¿La edad influye?
¿Las instalaciones influyen?
¿No se repite la recompensa?
¿Se evita entrenar inmediatamente antes de un partido si es incompatible?

152. Checklist de estadísticas
Comprobar:
¿El resultado coincide con el partido?
¿Los goles están correctamente atribuidos?
¿Las tarjetas son correctas?
¿Los tiros corresponden a eventos reales?
¿Las estadísticas por tiempo coinciden con los minutos?
¿La tabla de goleadores suma correctamente?
¿Las notas no aparecen inventadas?
¿El mapa de disparos utiliza ubicaciones reales?
¿Los filtros funcionan?
¿Se respetan restricciones de privacidad?

153. Checklist de publicación
Antes de publicar:
Confirmar main actualizado.
Confirmar que compila.
Confirmar variables necesarias.
Confirmar migraciones aplicadas correctamente.
Confirmar acceso desde celular.
Confirmar acceso desde computadora.
Confirmar inicio de sesión.
Confirmar torneos anteriores.
Confirmar Modo Club.
Confirmar permisos.
Confirmar ausencia de claves expuestas.
Confirmar ausencia de tokens.
Confirmar ausencia de pagos competitivos.
Confirmar respaldo de información importante.
Confirmar que una temporada puede completarse.

PARTE 19. PROBLEMAS FRECUENTES Y RESPUESTAS
154. “Codex no encuentra mi repositorio”
Verificar:
Que GitHub esté conectado.
Que hayas seleccionado la cuenta correcta.
Que el repositorio tenga permisos.
Que el entorno apunte al proyecto adecuado.
Que main exista.
Que el repositorio no esté restringido sin autorización.
No pegar manualmente todos los archivos antes de revisar la conexión.

155. “Codex trabaja sobre otra rama”
Indicar:
La rama correcta y más actual del proyecto es main.

Verifica cuál es la base de esta tarea.

No uses una rama antigua como referencia.

Explica cómo iniciar desde main actualizado sin perder cambios existentes.

156. “Se olvidó de una decisión anterior”
Indicar:
Lee nuevamente:

- AGENTS.md
- docs/MODO_CLUB_V1.md
- docs/REFERENCIAS_VISUALES.md
- docs/ECONOMIA_MODO_CLUB.md

La decisión correcta es:

[ESCRIBIR DECISIÓN]

Actualiza la documentación si faltaba y corrige la implementación correspondiente.

157. “Hizo una pantalla, pero nada funciona”
Indicar:
La interfaz existe, pero la funcionalidad no está conectada.

Completa:

- persistencia real;
- validación;
- integración con datos;
- manejo de errores;
- permisos;
- pruebas.

No consideres terminada la tarea hasta que el flujo pueda utilizarse realmente.

158. “Agregó demasiadas opciones”
Indicar:
Reduce la configuración a las opciones esenciales para la primera versión.

Mantén:

[OPCIONES IMPORTANTES]

Deja documentado para después:

[OPCIONES SECUNDARIAS]

Evita interfaces excesivamente complejas y funciones sin implementación real.

159. “El juego se ve parecido a OSM pero quiero Top Eleven”
Indicar:
Corrige la dirección visual.

Referencia estética principal: Top Eleven.

Referencia funcional de gestión: OSM.

Referencia analítica: SofaScore.

Reorganiza la interfaz para que se sienta más como un videojuego de gestión futbolística, manteniendo identidad propia y evitando copiar imágenes o marcas.

160. “Las estadísticas son demasiado básicas”
Indicar:
Amplía las estadísticas únicamente a partir de eventos reales disponibles.

Prioriza:

- comparativas;
- filtros;
- clasificación;
- primer y segundo tiempo;
- valoración;
- disparos;
- pases;
- defensa;
- arqueros.

Si falta información en el motor, explica qué eventos deben agregarse antes de construir la visualización.

161. “La pantalla horizontal no se fuerza”
Hay que distinguir:
Aplicación web.
PWA.
Aplicación Android nativa.
En una web no siempre se puede obligar al dispositivo a rotar automáticamente en cualquier navegador o situación.
Alternativas:
Diseño adaptable.
Pantalla que sugiera girar el celular.
Distribución horizontal optimizada.
Uso de pantalla completa cuando sea compatible.
Aplicación nativa más adelante.
No debe prometerse que todos los celulares y navegadores permiten exactamente el mismo comportamiento.

PARTE 20. PLAN DESPUÉS DE PLUS
162. Qué pasa si termina la suscripción
La documentación oficial indica actualmente:
ChatGPT Free incluye Codex para tareas rápidas.
ChatGPT Go incluye Codex para tareas livianas.
Plus ofrece más capacidad.
Los precios oficiales indicados son:
Free: USD 0.
Go: USD 8 mensuales.
Plus: USD 20 mensuales.
Sin embargo, la disponibilidad gratuita figura también como una condición por tiempo limitado, por lo que no conviene garantizar que se mantendrá indefinidamente ni asumir que Free tendrá la misma capacidad que Plus. Precios oficiales de Codex y ChatGPT Historial oficial de cambios

163. Qué hacer antes de que termine Plus
Priorizar:
Arquitectura.
Migraciones.
Seguridad.
Partidos.
Mercado.
Economía.
Documentación.
Pruebas.
Razón:
Esas tareas son más difíciles de resolver con agentes gratuitos limitados.
Los cambios visuales pequeños o ajustes de textos pueden continuarse después con herramientas más limitadas.

164. GitHub Copilot para estudiantes
Como cursás el secundario, conviene explorar si GitHub acepta tu verificación como estudiante mediante su programa educativo.
Posibles documentos:
Certificado de alumno regular.
Credencial.
Horario de clases.
Documentación institucional.
La aprobación no está garantizada.
Pero si obtenés acceso, puede ser una alternativa útil para continuar.

165. Programa estudiantil de OpenAI
Hay que aclarar algo importante para evitar falsas expectativas:
El programa de créditos estudiantiles de OpenAI que aparece actualmente está dirigido a:
Estudiantes universitarios.
Instituciones de Estados Unidos o Canadá.
Personas que residen allí al solicitarlo.
Por lo tanto, siendo estudiante secundario en Argentina, ese beneficio específico no es una alternativa aplicable para vos. Requisitos oficiales de Codex para estudiantes

166. Qué hacer si solamente queda ChatGPT Free
Estrategia:
Usar tareas pequeñas.
Evitar prompts gigantes.
Reutilizar documentación existente.
Pedir cambios muy concretos.
Trabajar sobre errores individuales.
Priorizar pruebas.
Aprovechar herramientas adicionales disponibles.
Ejemplo de tarea pequeña:
Corrige únicamente el error que permite comprar un jugador sin saldo suficiente.
Evitar:
Construye toda la economía, mercado, estadísticas, instalaciones y tácticas del juego.

PARTE 21. CONSEJOS PARA LLEGAR A TIEMPO
167. No cambiar el alcance todos los días
Agregar ideas nuevas puede ser útil, pero durante el período de ejecución hay que clasificarlas.
Si aparece una idea:
Registrarla.
Decidir si es P0, P1 o P2.
Evitar interrumpir tareas críticas.
Incorporarla solamente si mejora directamente la primera versión.

168. No esperar la perfección visual
La estética importa, especialmente porque preferís Top Eleven.
Pero el orden correcto es:
Funcionalidad real
→ estabilidad
→ presentación
→ refinamiento visual.
Una interfaz espectacular sin mercado funcional no sirve.
Una interfaz funcional puede mejorarse visualmente después.

169. No rehacer lo existente
Si el proyecto ya tiene:
Motor.
Torneos.
Formaciones.
Autenticación.
Mapa 2D.
Tácticas.
Conviene reutilizarlo.
Reconstruirlo puede consumir todo el plazo.

170. No llenar el proyecto de módulos futuros
Evitar pedidos como:
Dejá preparado absolutamente todo lo que quizás agreguemos durante los próximos tres años.
Preparar una arquitectura razonable es bueno.
Construir cientos de estructuras hipotéticas antes de tener una partida funcional retrasa el proyecto.

171. No confundir cantidad de código con progreso
Mucho código no siempre significa mucho avance.
Progreso real es:
Crear una partida.
Completar una jornada.
Comprar un jugador.
Registrar un gol.
Entrenar.
Publicar.

172. No repetir capturas innecesariamente
Cada imagen adicional consume atención y contexto.
Elegí las más representativas.
Si dos capturas muestran exactamente lo mismo, mandá solamente una.

173. No dejar errores críticos para el final
Ejemplos:
Usuarios pueden modificar equipos ajenos.
El saldo queda negativo.
Los partidos no se ejecutan.
La tabla no suma puntos.
Las subastas adjudican dos ganadores.
Esos problemas deben corregirse cuando aparecen.

174. Separar errores menores y mayores
Error menor:
Un color poco atractivo.
Un botón ligeramente desalineado.
Un texto mejorable.
Error importante:
Una compra duplicada.
Un partido sin resultado.
Una lesión que desaparece.
Una migración que rompe usuarios.
Un club que puede ver información privada.
No gastar cuatro horas en un color si todavía no funcionan los partidos.

175. Mantener registro diario
Cada día conviene anotar:
Fecha:

Bloques terminados:

Bloques pendientes:

Errores encontrados:

Decisiones nuevas:

Archivos importantes:

Próximo objetivo:

Tarea que queda ejecutándose:
Esto evita perder tiempo recordando qué pasó.

PARTE 22. DEFINICIÓN DE “TERMINADO”
176. Cuándo una función está terminada
Una función está terminada cuando:
Existe visualmente.
Funciona realmente.
Guarda información.
Respeta permisos.
Maneja errores.
No rompe otras funciones.
Puede verificarse.
Está documentada.
Se entiende cómo usarla.
Ejemplo:
Una pantalla de subasta no está terminada si muestra un temporizador, pero no entrega el jugador.
Un entrenamiento no está terminado si tiene ejercicios, pero no modifica atributos.
Una estadística no está terminada si inventa resultados.

177. Cuándo el Modo Club está listo para una primera publicación
La prueba definitiva sería:
Vos creás una temporada.
Tu amigo entra mediante código.
Cada uno elige un club.
El resto se completa con bots si hace falta.
Se genera un calendario.
Ambos configuran equipo y táctica.
Se juega un partido.
Se actualiza la tabla.
Un usuario compra o vende un futbolista.
Otro realiza un entrenamiento.
Aparece fatiga o moral.
Se actualiza el saldo.
Se pueden consultar estadísticas.
La temporada continúa sin romperse.
Si eso funciona, ya existe una primera versión real.

PARTE 23. ORDEN FINAL DE TRABAJO
178. Qué tenés que hacer inmediatamente
El orden exacto es:
Abrir Codex.
Conectar GitHub.
Elegir el repositorio correcto.
Confirmar main.
Mandar el Prompt 1.
Revisar la auditoría.
Mandar el Prompt 2.
Confirmar que existe documentación.
Mandar el Prompt 3.
Continuar con los prompts en orden.
Adjuntar capturas solamente cuando sean útiles.
Probar cada función.
Corregir errores antes de pasar al siguiente bloque crítico.
Mantener actualizada main.
Aprovechar horas de colegio y descanso para tareas autónomas.
Reducir alcance si una función secundaria amenaza la fecha.
Realizar pruebas completas.
Preparar publicación.
Probar con amigos.
Continuar mejorando después del lanzamiento.

179. Regla final para todas las decisiones
Cuando aparezca una duda nueva, hacerse estas preguntas:
¿Esta función ayuda a completar una temporada?
¿Es necesaria para que el usuario pueda jugar?
¿Tiene consecuencias reales dentro del sistema?
¿Respeta el presupuesto?
¿Respeta la ausencia de pagos por ventajas?
¿Protege información privada?
¿Aprovecha código existente?
¿Puede implementarse sin romper otras funciones?
¿Puede probarse?
¿Debe hacerse ahora o después?
Si la respuesta muestra que es secundaria, se documenta y se posterga.
La estrategia general queda resumida así:
Top Eleven para que el juego se vea y se sienta como un videojuego de gestión; OSM para que la administración del club sea clara; SofaScore para que las estadísticas tengan profundidad; Codex para implementar por bloques; y vos para decidir, probar y mantener el proyecto enfocado hasta publicar.

