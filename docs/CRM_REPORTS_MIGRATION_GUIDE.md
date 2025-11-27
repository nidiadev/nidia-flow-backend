# Guía de Migración: Reportes y Dashboard CRM (Sprint 7)

## 📋 Resumen

Esta guía documenta los cambios realizados para implementar el módulo de Reportes y Dashboard CRM según el Sprint 7 del MVP CRM.

## 🗄️ Cambios en el Schema de Prisma

**No se requieren cambios en el schema** - Este sprint utiliza los modelos existentes (Deal, DealStage, Customer, Order, etc.)

## 📦 Archivos Creados/Modificados

### Nuevos Archivos

**Servicios:**
- `src/tenant/services/crm/crm-reports.service.ts` - Servicio completo de reportes CRM

**Controladores:**
- `src/tenant/controllers/crm/reports.controller.ts` - Endpoints de reportes CRM

### Archivos Modificados

- `src/tenant/services/dashboard.service.ts` - Extendido con métricas CRM
- `src/tenant/modules/crm.module.ts` - Integrado CrmReportsService y CrmReportsController
- `src/tenant/tenant.module.ts` - Actualizado para usar forwardRef con CrmModule

## ✅ Verificación Post-Migración

### 1. Verificar Compilación

```bash
npx tsc --noEmit
```

### 2. Probar Endpoints

#### Pipeline KPIs

```bash
GET /api/v1/crm/reports/pipeline-kpis
```

Retorna:
- Valor total del pipeline
- Valor ponderado (weighted pipeline)
- Tasa de conversión por etapa
- Estadísticas por etapa

#### Win Rate

```bash
# Win rate global y por vendedor
GET /api/v1/crm/reports/win-rate

# Win rate de un vendedor específico
GET /api/v1/crm/reports/win-rate?sellerId=...
```

#### Tiempo Promedio de Cierre

```bash
# Tiempo promedio global
GET /api/v1/crm/reports/average-time-to-close

# Tiempo promedio de un vendedor
GET /api/v1/crm/reports/average-time-to-close?sellerId=...
```

#### Forecast Mensual

```bash
# Forecast del mes actual
GET /api/v1/crm/reports/forecast

# Forecast de un mes específico
GET /api/v1/crm/reports/forecast?year=2024&month=12
```

#### Embudo de Conversión

```bash
# Embudo completo
GET /api/v1/crm/reports/conversion-funnel

# Embudo con filtro de fechas
GET /api/v1/crm/reports/conversion-funnel?dateFrom=2024-01-01&dateTo=2024-12-31
```

#### Velocidad del Pipeline

```bash
GET /api/v1/crm/reports/pipeline-velocity
```

Retorna tiempo promedio en cada etapa del pipeline.

#### Rendimiento por Vendedor

```bash
# Rendimiento de todos los vendedores
GET /api/v1/crm/reports/seller-performance

# Con filtro de fechas
GET /api/v1/crm/reports/seller-performance?dateFrom=2024-01-01&dateTo=2024-12-31
```

#### Análisis de Pérdidas

```bash
# Análisis completo
GET /api/v1/crm/reports/loss-analysis

# Con filtro de fechas
GET /api/v1/crm/reports/loss-analysis?dateFrom=2024-01-01&dateTo=2024-12-31
```

Retorna:
- Pérdidas agrupadas por razón
- Pérdidas agrupadas por etapa
- Total de pérdidas y monto

#### Fuentes de Leads

```bash
# Fuentes completas
GET /api/v1/crm/reports/lead-sources

# Con filtro de fechas
GET /api/v1/crm/reports/lead-sources?dateFrom=2024-01-01&dateTo=2024-12-31
```

Retorna:
- Total de clientes por fuente
- Tasa de conversión por fuente
- Deals creados y ganados por fuente

#### Dashboard con Métricas CRM

```bash
# Dashboard completo con métricas CRM incluidas
GET /api/v1/dashboard/metrics?days=30

# Dashboard sin métricas CRM (más rápido)
GET /api/v1/dashboard/metrics?days=30&includeCrm=false
```

## 🎯 Funcionalidades Implementadas

### Sprint 7: Reportes y Dashboard CRM ✅

- ✅ KPIs específicos del CRM integrados en Dashboard
- ✅ Valor total del pipeline y valor ponderado
- ✅ Tasa de conversión por etapa del pipeline
- ✅ Forecast mensual automático
- ✅ Win rate global y por vendedor
- ✅ Tiempo promedio de cierre
- ✅ Reporte: Embudo de conversión
- ✅ Reporte: Velocidad del pipeline
- ✅ Reporte: Rendimiento por vendedor
- ✅ Reporte: Análisis de pérdidas
- ✅ Reporte: Fuentes de leads
- ✅ CrmReportsService con todos los métodos
- ✅ CrmReportsController con todos los endpoints
- ✅ Integración con DashboardService

## 📝 Notas Importantes

1. **Permisos**: Todos los endpoints requieren permisos `crm:read` o `reports:read`.

2. **Data Scope**: Los usuarios sin permiso `view_all` solo ven datos de sus propios deals/clientes.

3. **Forecast**: El forecast se calcula usando la probabilidad de cada deal. El valor ponderado es más realista que el valor total.

4. **Win Rate**: Se calcula solo sobre deals cerrados (won + lost). Los deals abiertos no se incluyen.

5. **Tiempo de Cierre**: Se calcula desde la creación del deal hasta su cierre (won). Solo incluye deals ganados.

6. **Velocidad del Pipeline**: Usa el campo `daysInStage` que se actualiza automáticamente. Para actualizar manualmente, usar el método `updateDaysInStage()` en DealService.

7. **Análisis de Pérdidas**: Requiere que los deals perdidos tengan `lostReason` configurado.

8. **Fuentes de Leads**: Requiere que los clientes tengan `leadSource` configurado.

## 🔗 Referencias

- [Análisis Completo CRM MVP](./CRM_MVP_ANALISIS_COMPLETO.md)
- [Documentación Prisma](https://www.prisma.io/docs)
- [NestJS](https://docs.nestjs.com/)

---

**Fecha de Implementación:** Noviembre 2025  
**Versión:** 1.0.0  
**Estado:** ✅ Completado - Sprint 7

