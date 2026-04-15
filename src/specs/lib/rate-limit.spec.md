# Spec: rate-limit

**Archivo:** `src/lib/rate-limit.ts`
**Creada:** 2026-04-14
**Última revisión:** 2026-04-14
**Estado:** ACTIVE

## Propósito

Rate limiter en memoria para proteger los endpoints de la API contra abuso y ataques de Denegación de Servicio (DoS). Implementa una ventana deslizante por IP con una caché LRU para evitar el agotamiento de memoria por IPs falsificadas.

## Comportamientos del módulo

- El estado (`ipRequests` Map) es **global a nivel de módulo**. En entornos serverless (Vercel), las instancias "calientes" comparten este estado entre requests. Esto es intencional para que el rate limit persista durante la vida de la instancia.
- Este rate limiter es **process-local**: no se comparte entre múltiples instancias del servidor. Para distribución real, se requeriría Redis u otro store compartido.
- La limpieza de entradas antiguas ocurre de forma lazy cada `CLEANUP_INTERVAL` (5 minutos), eliminando IPs sin actividad en la última hora.

## Constantes exportadas

| Constante | Valor | Propósito |
|-----------|-------|-----------|
| `MAX_TRACKED_IPS` | 10000 | Límite máximo de IPs en el Map antes de evictar la más antigua |

---

## API Pública

### `getClientIp(request: Request): string`

**Descripción:** Extrae la IP del cliente de forma segura desde los headers de la request, resistente a spoofing vía `X-Forwarded-For`.

**Postcondiciones:**
- MUST retornar el valor de `x-real-ip` si el header está presente (tiene prioridad sobre `x-forwarded-for`)
- MUST retornar el **último** IP en la lista de `x-forwarded-for` si `x-real-ip` no está presente (los proxies añaden al final; el más a la derecha es el más confiable)
- MUST retornar `'unknown'` si ninguno de los dos headers está presente

**Invariantes de seguridad:**
- `[SENTINEL]` Tomar el primer IP de `x-forwarded-for` permite a atacantes falsificar su IP enviando `X-Forwarded-For: fake-ip, real-ip`. Al tomar el último IP (añadido por el proxy más cercano y confiable), se mitiga este vector de spoofing.

---

### `checkRateLimit(ip: string, limit?: number, windowMs?: number): boolean`

**Descripción:** Verifica si una IP puede realizar un request. Por defecto: límite de 5 requests en una ventana de 1 minuto.

**Parámetros:**
- `ip` — IP del cliente (normalmente obtenida de `getClientIp`)
- `limit` — Número máximo de requests en la ventana (default: 5)
- `windowMs` — Tamaño de la ventana en milisegundos (default: 60,000 ms = 1 minuto)

**Postcondiciones:**
- MUST retornar `true` si la IP ha realizado menos de `limit` requests en la ventana actual
- MUST retornar `false` (sin lanzar excepción) cuando la IP supera el límite
- MUST implementar comportamiento LRU: cuando el Map alcanza `MAX_TRACKED_IPS`, DEBE evictar la entrada más antigua (primera en el Map), NO bloquear todas las IPs nuevas
- MUST re-insertar la IP al final del Map al procesarla, para actualizar su posición LRU
- MUST disparar limpieza lazy si han pasado más de `CLEANUP_INTERVAL` ms desde la última limpieza
- SHOULD filtrar timestamps fuera de la ventana actual antes de contar requests

**Invariantes de seguridad:**
- `[SENTINEL]` Evictar la IP más antigua en lugar de retornar `false` para IPs nuevas cuando se alcanza `MAX_TRACKED_IPS`. Retornar `false` para todas las IPs nuevas crearía una vulnerabilidad de lock-out DoS: un atacante con 10,000 IPs distintas bloquearía a todos los usuarios legítimos nuevos.

---

## Test Coverage

| Regla | Archivo de test | Nombre del test | Estado |
|-------|-----------------|-----------------|--------|
| MUST retornar true dentro del límite | `src/lib/rate-limit.test.ts` | `"should allow requests within the limit"` | COVERED |
| MUST retornar false al superar límite | `src/lib/rate-limit.test.ts` | `"should block requests exceeding the limit"` | COVERED |
| MUST rastrear IPs independientemente | `src/lib/rate-limit.test.ts` | `"should track different IPs independently"` | COVERED |
| MUST evictar IP más antigua al llegar a MAX_TRACKED_IPS | `src/lib/rate-limit.test.ts` | `"should enforce MAX_TRACKED_IPS to prevent memory exhaustion"` | COVERED |
| MUST preferir x-real-ip sobre x-forwarded-for | `src/lib/rate-limit.test.ts` | `"should prefer x-real-ip over x-forwarded-for"` | COVERED |
| MUST tomar el último IP de x-forwarded-for | `src/lib/rate-limit.test.ts` | `"should take the last IP in x-forwarded-for list"` | COVERED |
| MUST retornar 'unknown' sin headers | `src/lib/rate-limit.test.ts` | `"should return 'unknown' when no IP headers are present"` | COVERED |

---

## Gaps y decisiones pendientes

<!-- GAP: El test de MAX_TRACKED_IPS itera 10,000 veces. El estado es global de módulo, por lo que tests anteriores contaminan el Map. Los tests usan IPs únicas por test suite para mitigar esto, pero no es perfecto. Una solución más robusta sería exportar una función resetForTesting() solo en entornos de test. -->
