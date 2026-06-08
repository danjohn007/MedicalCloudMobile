# Validacion de Paridad: Paciente Web vs Movil

Fecha: 2026-06-08

## Resultado general
Paridad funcional muy alta. Se cerraron los flujos criticos de paciente en movil con backend compatible.

## Matriz de paridad
1. Perfil paciente (editar datos): OK en movil
2. Avatar (subir/eliminar): OK en movil
3. Buscar doctor: OK en movil (pantalla doctores)
4. Agendar cita: OK en movil
5. Historial de citas (proximas/pasadas): OK en movil
6. Expediente editable: OK en movil
7. Historial clinico en expediente: OK en movil
8. Recetas en historial/expediente: OK en movil
9. Documentos (listar/subir/eliminar): OK en movil
10. Historial financiero: OK en movil
11. Check-in/checkout QR: OK en movil
12. Videoconsulta: OK en movil

## Diferencias menores (no bloqueantes)
1. Vista de impresion web de expediente (formato print) no tiene copia 1:1 en movil; en movil se visualiza contenido completo, pero no existe aun boton de exportar/print nativo.

## Cambios tecnicos clave aplicados
1. Backend API movil: endpoints de avatar, documentos y financial-history
2. Backend API movil: expediente ahora incluye history y prescriptions
3. Movil: pantallas nuevas de documentos y finanzas
4. Movil: avatar con picker real y carga al backend
5. Movil: integracion de formularios multipart para archivos

## Conclusion
El flujo operativo de paciente que usa doctor en web ya esta reflejado en movil para uso diario (agenda, expediente, recetas, documentos, pagos y video). La unica brecha residual es exportacion/print nativa desde app.
